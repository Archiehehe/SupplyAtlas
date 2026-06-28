import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_ROOT = path.resolve(__dirname, "..", "imports");
const CSV_FILES = ["themes.csv", "companies.csv", "nodes.csv", "edges.csv", "source_documents.csv", "edge_evidence.csv"] as const;

interface ImportStats {
  inserted: number;
  updated: number;
  skipped: number;
}

interface ImportReport {
  batchName: string;
  timestamp: string;
  status: "success" | "failed";
  stats: Record<string, ImportStats>;
  errors: string[];
}

function parseCSV(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  if (!content) return [];
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 1) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

async function getDbClient() {
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_DATABASE_URL or DATABASE_URL must be set");
  const sql = neon(url);
  return drizzle(sql);
}

async function importThemes(
  db: any,
  rows: Record<string, string>[],
  stats: ImportStats,
  schema: any,
  dryRun: boolean,
  warnings: string[],
): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();

  for (const row of rows) {
    if (!row.slug) continue;
    const existing = await db.select({ id: schema.themes.id }).from(schema.themes).where(
      (await import("drizzle-orm")).eq(schema.themes.slug, row.slug)
    ).limit(1);

    if (existing.length > 0) {
      slugToId.set(row.slug, existing[0].id);
      const needsUpdate = (row.name && row.name !== existing[0]?.name) || false;
      if (needsUpdate) {
        if (!dryRun) {
          await db.update(schema.themes).set({ name: row.name, description: row.description || null, updatedAt: new Date() }).where(
            (await import("drizzle-orm")).eq(schema.themes.id, existing[0].id)
          );
        }
        stats.updated++;
      } else {
        stats.skipped++;
      }
    } else {
      if (!dryRun) {
        const [inserted] = await db.insert(schema.themes).values({
          slug: row.slug,
          name: row.name,
          description: row.description || null,
          type: row.type || "other",
        }).returning({ id: schema.themes.id });
        slugToId.set(row.slug, inserted.id);
      }
      stats.inserted++;
    }
  }

  // If dry-run, fetch existing from DB for reference mapping
  if (dryRun) {
    const all = await db.select({ id: schema.themes.id, slug: schema.themes.slug }).from(schema.themes);
    for (const t of all) {
      slugToId.set(t.slug, t.id);
    }
  }

  return slugToId;
}

async function importCompanies(
  db: any,
  rows: Record<string, string>[],
  stats: ImportStats,
  schema: any,
  dryRun: boolean,
  warnings: string[],
): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>(); // "TICKER:EXCHANGE" -> companyId

  for (const row of rows) {
    if (!row.ticker || !row.exchange) continue;
    const ticker = row.ticker.toUpperCase();
    const exchange = row.exchange.toUpperCase();
    const key = `${ticker}:${exchange}`;

    // Check if company exists via ticker identifier
    const existing = await db
      .select({ companyId: schema.companyIdentifiers.companyId })
      .from(schema.companyIdentifiers)
      .where(
        (await import("drizzle-orm")).and(
          (await import("drizzle-orm")).eq(schema.companyIdentifiers.type, "ticker"),
          (await import("drizzle-orm")).eq(schema.companyIdentifiers.value, ticker)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      keyToId.set(key, existing[0].companyId);
      stats.skipped++;
    } else {
      if (!dryRun) {
        const [company] = await db.insert(schema.companies).values({
          name: row.name,
          description: row.description || null,
          sector: row.sector || null,
          industry: row.industry || null,
          website: row.website || null,
          headquarters: row.headquarters || null,
        }).returning({ id: schema.companies.id });

        await db.insert(schema.companyIdentifiers).values({
          companyId: company.id,
          type: "ticker",
          value: ticker,
          primary: true,
        }).onConflictDoNothing();

        keyToId.set(key, company.id);
      }
      stats.inserted++;
    }
  }

  return keyToId;
}

async function importNodes(
  db: any,
  rows: Record<string, string>[],
  stats: ImportStats,
  schema: any,
  slugToThemeId: Map<string, string>,
  companyKeyToId: Map<string, string>,
  dryRun: boolean,
  warnings: string[],
): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>(); // "theme_slug:node_slug" -> nodeId

  for (const row of rows) {
    if (!row.theme_slug || !row.node_slug) continue;
    const themeId = slugToThemeId.get(row.theme_slug);
    if (!themeId) {
      warnings.push(`Node "${row.node_slug}": Theme "${row.theme_slug}" not resolved. Skipping.`);
      continue;
    }

    const nodeKey = `${row.theme_slug}:${row.node_slug}`;

    // Check if node exists
    const existing = await db
      .select({ id: schema.nodes.id })
      .from(schema.nodes)
      .where(
        (await import("drizzle-orm")).and(
          (await import("drizzle-orm")).eq(schema.nodes.slug, row.node_slug),
          (await import("drizzle-orm")).eq(schema.nodes.themeId, themeId)
        )
      )
      .limit(1);

    let companyId: string | null = null;
    if (row.company_ticker && row.company_exchange) {
      const ck = `${row.company_ticker.toUpperCase()}:${row.company_exchange.toUpperCase()}`;
      companyId = companyKeyToId.get(ck) || null;
      if (!companyId) {
        warnings.push(`Node "${row.node_slug}": Company "${ck}" not resolved. Will link without company.`);
      }
    }

    const metadata: Record<string, unknown> = {};
    if (row.description) metadata.description = row.description;
    if (row.importance_score) {
      const score = parseInt(row.importance_score);
      if (!isNaN(score)) metadata.importance_score = score;
    }

    if (existing.length > 0) {
      keyToId.set(nodeKey, existing[0].id);
      if (!dryRun) {
        await db.update(schema.nodes).set({
          name: row.label,
          companyId: companyId,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          updatedAt: new Date(),
        }).where(
          (await import("drizzle-orm")).eq(schema.nodes.id, existing[0].id)
        );
      }
      stats.updated++;
    } else {
      if (!dryRun) {
        const [inserted] = await db.insert(schema.nodes).values({
          themeId,
          slug: row.node_slug,
          name: row.label,
          type: row.node_type,
          companyId,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }).returning({ id: schema.nodes.id });
        keyToId.set(nodeKey, inserted.id);
      }
      stats.inserted++;
    }
  }

  return keyToId;
}

async function importEdges(
  db: any,
  rows: Record<string, string>[],
  stats: ImportStats,
  schema: any,
  nodeKeyToId: Map<string, string>,
  dryRun: boolean,
  warnings: string[],
): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>();

  for (const row of rows) {
    if (!row.theme_slug || !row.source_node_slug || !row.target_node_slug || !row.relationship_type) continue;

    const sourceKey = `${row.theme_slug}:${row.source_node_slug}`;
    const targetKey = `${row.theme_slug}:${row.target_node_slug}`;
    const sourceNodeId = nodeKeyToId.get(sourceKey);
    const targetNodeId = nodeKeyToId.get(targetKey);

    if (!sourceNodeId || !targetNodeId) {
      warnings.push(`Edge: source/target nodes not resolved for ${sourceKey} -> ${targetKey}. Skipping.`);
      continue;
    }

    const edgeKey = `${row.theme_slug}:${row.source_node_slug}:${row.target_node_slug}:${row.relationship_type}`;

    // Check if edge exists
    const existing = await db
      .select({ id: schema.edges.id })
      .from(schema.edges)
      .where(
        (await import("drizzle-orm")).and(
          (await import("drizzle-orm")).eq(schema.edges.sourceNodeId, sourceNodeId),
          (await import("drizzle-orm")).eq(schema.edges.targetNodeId, targetNodeId),
          (await import("drizzle-orm")).eq(schema.edges.relationshipType, row.relationship_type)
        )
      )
      .limit(1);

    const strength = parseInt(row.strength) || 5;
    const confidenceScore = row.confidence_score ? row.confidence_score : undefined;

    if (existing.length > 0) {
      keyToId.set(edgeKey, existing[0].id);
      if (!dryRun) {
        await db.update(schema.edges).set({
          strength,
          confidenceScore: confidenceScore || null,
          explanation: row.explanation || null,
          reviewStatus: row.review_status || "pending_review",
          published: row.published === "true",
          updatedAt: new Date(),
        }).where(
          (await import("drizzle-orm")).eq(schema.edges.id, existing[0].id)
        );
      }
      stats.updated++;
    } else {
      if (!dryRun) {
        const [inserted] = await db.insert(schema.edges).values({
          sourceNodeId,
          targetNodeId,
          relationshipType: row.relationship_type,
          strength,
          confidenceScore: confidenceScore || null,
          explanation: row.explanation || null,
          reviewStatus: row.review_status || "pending_review",
          published: row.published === "true",
        }).returning({ id: schema.edges.id });
        keyToId.set(edgeKey, inserted.id);
      }
      stats.inserted++;
    }
  }

  return keyToId;
}

async function importSourceDocuments(
  db: any,
  rows: Record<string, string>[],
  stats: ImportStats,
  schema: any,
  dryRun: boolean,
  warnings: string[],
): Promise<Map<string, string>> {
  const extIdToDocId = new Map<string, string>();

  for (const row of rows) {
    if (!row.source_type) continue;

    // Try to find by external_id, then by url
    let existing: any[] = [];
    if (row.external_id) {
      existing = await db
        .select({ id: schema.sourceDocuments.id })
        .from(schema.sourceDocuments)
        .where(
          (await import("drizzle-orm")).eq(schema.sourceDocuments.externalId, row.external_id)
        )
        .limit(1);
    }
    if (existing.length === 0 && row.url) {
      existing = await db
        .select({ id: schema.sourceDocuments.id })
        .from(schema.sourceDocuments)
        .where(
          (await import("drizzle-orm")).eq(schema.sourceDocuments.url, row.url)
        )
        .limit(1);
    }

    if (existing.length > 0) {
      if (row.external_id) extIdToDocId.set(row.external_id, existing[0].id);
      stats.skipped++;
    } else {
      if (!dryRun) {
        const publishedAt = row.published_date ? new Date(row.published_date) : undefined;
        const [inserted] = await db.insert(schema.sourceDocuments).values({
          sourceType: row.source_type,
          externalId: row.external_id || null,
          title: row.title || null,
          url: row.url || null,
          publishedAt,
        }).returning({ id: schema.sourceDocuments.id });
        if (row.external_id) extIdToDocId.set(row.external_id, inserted.id);
      }
      stats.inserted++;
    }
  }

  return extIdToDocId;
}

async function importEdgeEvidence(
  db: any,
  rows: Record<string, string>[],
  stats: ImportStats,
  schema: any,
  edgeKeyToId: Map<string, string>,
  extIdToDocId: Map<string, string>,
  dryRun: boolean,
  warnings: string[],
): Promise<void> {
  for (const row of rows) {
    if (!row.theme_slug || !row.source_node_slug || !row.target_node_slug || !row.edge_relationship_type || !row.source_document_external_id) continue;

    const edgeKey = `${row.theme_slug}:${row.source_node_slug}:${row.target_node_slug}:${row.edge_relationship_type}`;
    const edgeId = edgeKeyToId.get(edgeKey);
    const docId = extIdToDocId.get(row.source_document_external_id);

    if (!edgeId) {
      warnings.push(`Edge evidence: Edge not resolved for key "${edgeKey}". Skipping.`);
      continue;
    }
    if (!docId) {
      warnings.push(`Edge evidence: Source document not resolved for external ID "${row.source_document_external_id}". Skipping.`);
      continue;
    }

    if (!dryRun) {
      await db.insert(schema.edgeEvidence).values({
        edgeId,
        sourceDocumentId: docId,
        quote: row.evidence_quote || null,
        sourceUrl: row.source_url || null,
        extractionMethod: row.extraction_method || "manual",
      }).onConflictDoNothing();
    }
    stats.inserted++;
  }
}

function printHelp(): void {
  console.log(`
Usage: npm run import:data -- --batch <batch-name> [--dry-run] [--help]

Imports validated CSV data from imports/incoming/<batch-name>/ into the database.

Arguments:
  --batch <batch-name>  Name of the batch directory under imports/incoming/
  --dry-run             Validate and show planned operations without writing to DB
  --help                Show this help message

Environment:
  DIRECT_DATABASE_URL   Required for import (Neon direct connection)
  DATABASE_URL          Fallback if DIRECT_DATABASE_URL is not set

Processing order:
  1. Themes (upsert by slug)
  2. Companies (upsert by ticker + exchange via company_identifiers)
  3. Nodes (upsert by theme_slug + node_slug)
  4. Edges (upsert by theme + source + target + relationship_type)
  5. Source documents (upsert by external_id or url)
  6. Edge evidence (link by edge key + source document external_id)

On success: batch moved to imports/processed/<timestamp>-<batch-name>/
On failure: batch moved to imports/rejected/<timestamp>-<batch-name>/
`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.length === 0) {
    printHelp();
    process.exit(0);
  }

  const batchIndex = args.indexOf("--batch");
  if (batchIndex === -1 || !args[batchIndex + 1]) {
    console.error("Error: --batch <batch-name> is required");
    printHelp();
    process.exit(1);
  }

  const batchName = args[batchIndex + 1];
  const dryRun = args.includes("--dry-run");
  const batchDir = path.join(IMPORT_ROOT, "incoming", batchName);

  if (!fs.existsSync(batchDir)) {
    console.error(`Error: Batch directory not found: ${batchDir}`);
    process.exit(1);
  }

  console.log(`\n${dryRun ? "DRY RUN: " : ""}Import batch: ${batchName}`);
  console.log(`Directory: ${batchDir}\n`);

  // Parse CSV files
  const available: Record<string, Record<string, string>[]> = {};
  for (const file of CSV_FILES) {
    const fp = path.join(batchDir, file);
    if (fs.existsSync(fp)) {
      available[file] = parseCSV(fp);
      console.log(`  ${file}: ${available[file].length} rows`);
    }
  }

  if (Object.keys(available).length === 0) {
    console.error("Error: No CSV files found in batch directory.");
    process.exit(1);
  }

  // Connect to database
  console.log("\nConnecting to database...");
  const db = await getDbClient();
  const schema = await import("../src/db/schema");
  const warnings: string[] = [];
  const report: ImportReport = {
    batchName,
    timestamp: new Date().toISOString(),
    status: "success",
    stats: {},
    errors: [],
  };

  try {
    // Step 1: Themes
    if (available["themes.csv"]) {
      console.log("\n--- Importing Themes ---");
      const themeStats: ImportStats = { inserted: 0, updated: 0, skipped: 0 };
      const slugToId = await importThemes(db, available["themes.csv"], themeStats, schema, dryRun, warnings);
      report.stats["themes"] = themeStats;
      console.log(`  Inserted: ${themeStats.inserted}, Updated: ${themeStats.updated}, Skipped: ${themeStats.skipped}`);

      // Step 2: Companies
      if (available["companies.csv"]) {
        console.log("\n--- Importing Companies ---");
        const companyStats: ImportStats = { inserted: 0, updated: 0, skipped: 0 };
        const companyKeyToId = await importCompanies(db, available["companies.csv"], companyStats, schema, dryRun, warnings);
        report.stats["companies"] = companyStats;
        console.log(`  Inserted: ${companyStats.inserted}, Updated: ${companyStats.updated}, Skipped: ${companyStats.skipped}`);

        // Step 3: Nodes
        if (available["nodes.csv"]) {
          console.log("\n--- Importing Nodes ---");
          const nodeStats: ImportStats = { inserted: 0, updated: 0, skipped: 0 };
          // If dry-run, ensure we have theme IDs from existing DB
          const nodeKeyToId = await importNodes(db, available["nodes.csv"], nodeStats, schema, slugToId, companyKeyToId, dryRun, warnings);
          report.stats["nodes"] = nodeStats;
          console.log(`  Inserted: ${nodeStats.inserted}, Updated: ${nodeStats.updated}, Skipped: ${nodeStats.skipped}`);

          // Step 4: Edges
          if (available["edges.csv"]) {
            console.log("\n--- Importing Edges ---");
            const edgeStats: ImportStats = { inserted: 0, updated: 0, skipped: 0 };
            const edgeKeyToId = await importEdges(db, available["edges.csv"], edgeStats, schema, nodeKeyToId, dryRun, warnings);
            report.stats["edges"] = edgeStats;
            console.log(`  Inserted: ${edgeStats.inserted}, Updated: ${edgeStats.updated}, Skipped: ${edgeStats.skipped}`);

            // Step 5: Source documents
            if (available["source_documents.csv"]) {
              console.log("\n--- Importing Source Documents ---");
              const docStats: ImportStats = { inserted: 0, updated: 0, skipped: 0 };
              const extIdToDocId = await importSourceDocuments(db, available["source_documents.csv"], docStats, schema, dryRun, warnings);
              report.stats["source_documents"] = docStats;
              console.log(`  Inserted: ${docStats.inserted}, Updated: ${docStats.updated}, Skipped: ${docStats.skipped}`);

              // Step 6: Edge evidence
              if (available["edge_evidence.csv"]) {
                console.log("\n--- Importing Edge Evidence ---");
                const evStats: ImportStats = { inserted: 0, updated: 0, skipped: 0 };
                await importEdgeEvidence(db, available["edge_evidence.csv"], evStats, schema, edgeKeyToId, extIdToDocId, dryRun, warnings);
                report.stats["edge_evidence"] = evStats;
                console.log(`  Inserted: ${evStats.inserted}, Updated: ${evStats.updated}, Skipped: ${evStats.skipped}`);
              }
            }
          }
        }
      }
    }

    // Print warnings
    if (warnings.length > 0) {
      console.log(`\nWarnings (${warnings.length}):`);
      warnings.forEach(w => console.log(`  ⚠ ${w}`));
    }

    // Move batch on success
    if (!dryRun) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const processedDir = path.join(IMPORT_ROOT, "processed", `${timestamp}-${batchName}`);
      fs.renameSync(batchDir, processedDir);
      console.log(`\nBatch moved to: imports/processed/${timestamp}-${batchName}`);

      // Write report
      const reportPath = path.join(processedDir, "import-report.json");
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`Report written: ${reportPath}`);
    } else {
      console.log("\nDRY RUN completed. No data was written to the database.");
    }

    console.log("\nImport completed successfully.");
    process.exit(0);

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`\nImport failed: ${errMsg}`);

    // Move batch to rejected on failure
    if (!dryRun) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const rejectedDir = path.join(IMPORT_ROOT, "rejected", `${timestamp}-${batchName}`);
        fs.renameSync(batchDir, rejectedDir);
        console.log(`Batch moved to: imports/rejected/${timestamp}-${batchName}`);

        report.status = "failed";
        report.errors.push(errMsg);
        const reportPath = path.join(rejectedDir, "import-report.json");
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      } catch (moveError) {
        console.error("Failed to move batch to rejected directory:", moveError);
      }
    }

    process.exit(1);
  }
}

main();
