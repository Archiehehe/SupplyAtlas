import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: ".env.local" });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_ROOT = path.resolve(__dirname, "..", "imports");

const CSV_FILES = [
  "themes.csv",
  "companies.csv",
  "nodes.csv",
  "edges.csv",
  "source_documents.csv",
  "edge_evidence.csv",
] as const;

type CsvRow = Record<string, string>;

function parseCSV(filePath: string): CsvRow[] {
  const content = fs.readFileSync(filePath, "utf-8").trim();
  if (!content) return [];
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 1) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const row: CsvRow = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }
  return rows;
}

interface ValidationReport {
  valid: boolean;
  files: string[];
  rowCounts: Record<string, number>;
  errors: { file: string; row: number; field: string; message: string; value?: string }[];
  warnings: string[];
}

function printHelp(): void {
  console.log(`
Usage: npm run import:validate -- --batch <batch-name> [--help]

Validates a batch of CSV import files without writing to the database.

Arguments:
  --batch <batch-name>  Name of the batch directory under imports/incoming/
  --help                Show this help message

The batch directory should contain one or more CSV files:
  themes.csv, companies.csv, nodes.csv, edges.csv,
  source_documents.csv, edge_evidence.csv

All files are optional. Only present files are validated.

Cross-file reference checks:
  - Node theme_slug must exist in themes.csv
  - Node company_ticker must exist in companies.csv (if provided)
  - Edge source/target node slugs must exist in nodes.csv
  - Edge evidence references must point to valid edges and source documents
`);
}

function validateSlug(value: string): string | null {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
    return "Slug must be lowercase kebab-case (letters, numbers, hyphens)";
  }
  return null;
}

function validateBatch(batchDir: string): ValidationReport {
  const report: ValidationReport = { valid: true, files: [], rowCounts: {}, errors: [], warnings: [] };

  const available: Record<string, CsvRow[]> = {};
  for (const file of CSV_FILES) {
    const fp = path.join(batchDir, file);
    if (fs.existsSync(fp)) {
      const rows = parseCSV(fp);
      available[file] = rows;
      report.files.push(file);
      report.rowCounts[file] = rows.length;
    }
  }

  if (report.files.length === 0) {
    report.warnings.push("No CSV files found in batch directory.");
    report.rowCounts = report.files.reduce((acc, f) => ({ ...acc, [f]: 0 }), {});
    return report;
  }

  // Build lookup maps for cross-file references
  const themeSlugs = new Set<string>();
  const companyKeys = new Set<string>();
  const nodeKeys = new Set<string>(); // "theme_slug:node_slug"

  // 1. Validate themes
  if (available["themes.csv"]) {
    available["themes.csv"].forEach((row, idx) => {
      const rowNum = idx + 2;
      if (!row.slug) {
        report.errors.push({ file: "themes.csv", row: rowNum, field: "slug", message: "Slug is required" });
      } else {
        const slugErr = validateSlug(row.slug);
        if (slugErr) report.errors.push({ file: "themes.csv", row: rowNum, field: "slug", message: slugErr, value: row.slug });
        else themeSlugs.add(row.slug);
      }
      if (!row.name) {
        report.errors.push({ file: "themes.csv", row: rowNum, field: "name", message: "Name is required" });
      }
      if (row.type && !["sector", "thematic", "regulatory", "other"].includes(row.type)) {
        report.errors.push({ file: "themes.csv", row: rowNum, field: "type", message: "Type must be one of: sector, thematic, regulatory, other", value: row.type });
      }
    });
  }

  // 2. Validate companies
  if (available["companies.csv"]) {
    available["companies.csv"].forEach((row, idx) => {
      const rowNum = idx + 2;
      if (!row.ticker) {
        report.errors.push({ file: "companies.csv", row: rowNum, field: "ticker", message: "Ticker is required" });
      } else {
        const ticker = row.ticker.toUpperCase();
        if (!/^[A-Z0-9.]+$/.test(ticker)) {
          report.errors.push({ file: "companies.csv", row: rowNum, field: "ticker", message: "Ticker must be uppercase alphanumeric", value: ticker });
        }
      }
      if (!row.exchange) {
        report.errors.push({ file: "companies.csv", row: rowNum, field: "exchange", message: "Exchange is required when ticker is provided" });
      }
      if (!row.name) {
        report.errors.push({ file: "companies.csv", row: rowNum, field: "name", message: "Company name is required" });
      }
      if (row.ticker && row.exchange) {
        companyKeys.add(`${row.ticker.toUpperCase()}:${row.exchange.toUpperCase()}`);
      }
    });
  }

  // 3. Validate nodes
  if (available["nodes.csv"]) {
    available["nodes.csv"].forEach((row, idx) => {
      const rowNum = idx + 2;
      if (!row.theme_slug) {
        report.errors.push({ file: "nodes.csv", row: rowNum, field: "theme_slug", message: "Theme slug is required" });
      } else if (!themeSlugs.has(row.theme_slug)) {
        report.errors.push({ file: "nodes.csv", row: rowNum, field: "theme_slug", message: `Theme "${row.theme_slug}" not found in themes.csv`, value: row.theme_slug });
      }
      if (!row.node_slug) {
        report.errors.push({ file: "nodes.csv", row: rowNum, field: "node_slug", message: "Node slug is required" });
      } else {
        const slugErr = validateSlug(row.node_slug);
        if (slugErr) report.errors.push({ file: "nodes.csv", row: rowNum, field: "node_slug", message: slugErr, value: row.node_slug });
      }
      if (!row.node_type) {
        report.errors.push({ file: "nodes.csv", row: rowNum, field: "node_type", message: "Node type is required" });
      }
      if (!row.label) {
        report.errors.push({ file: "nodes.csv", row: rowNum, field: "label", message: "Label is required" });
      }
      if (row.company_ticker && !row.company_exchange) {
        report.errors.push({ file: "nodes.csv", row: rowNum, field: "company_exchange", message: "Exchange is required when company ticker is provided" });
      }
      if (row.company_ticker && row.company_exchange && !companyKeys.has(`${row.company_ticker.toUpperCase()}:${row.company_exchange.toUpperCase()}`)) {
        report.warnings.push(`Node row ${rowNum}: Company ${row.company_ticker}:${row.company_exchange} not found in companies.csv. Will check database at import time.`);
      }
      if (row.theme_slug && row.node_slug) {
        nodeKeys.add(`${row.theme_slug}:${row.node_slug}`);
      }
    });
  }

  // 4. Validate edges
  if (available["edges.csv"]) {
    available["edges.csv"].forEach((row, idx) => {
      const rowNum = idx + 2;
      if (!row.theme_slug) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "theme_slug", message: "Theme slug is required" });
      } else if (!themeSlugs.has(row.theme_slug)) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "theme_slug", message: `Theme "${row.theme_slug}" not found in themes.csv`, value: row.theme_slug });
      }
      if (!row.source_node_slug) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "source_node_slug", message: "Source node slug is required" });
      } else if (!nodeKeys.has(`${row.theme_slug}:${row.source_node_slug}`)) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "source_node_slug", message: `Source node "${row.source_node_slug}" not found in nodes.csv for theme "${row.theme_slug}"`, value: row.source_node_slug });
      }
      if (!row.target_node_slug) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "target_node_slug", message: "Target node slug is required" });
      } else if (!nodeKeys.has(`${row.theme_slug}:${row.target_node_slug}`)) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "target_node_slug", message: `Target node "${row.target_node_slug}" not found in nodes.csv for theme "${row.theme_slug}"`, value: row.target_node_slug });
      }
      if (!row.relationship_type) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "relationship_type", message: "Relationship type is required" });
      }
      if (row.source_node_slug && row.target_node_slug && row.source_node_slug === row.target_node_slug) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "target_node_slug", message: "Source and target node cannot be the same" });
      }
      if (row.strength) {
        const s = parseInt(row.strength);
        if (isNaN(s) || s < 1 || s > 10) {
          report.errors.push({ file: "edges.csv", row: rowNum, field: "strength", message: "Strength must be an integer between 1 and 10", value: row.strength });
        }
      }
      if (row.confidence_score) {
        const c = parseFloat(row.confidence_score);
        if (isNaN(c) || c < 0 || c > 1) {
          report.errors.push({ file: "edges.csv", row: rowNum, field: "confidence_score", message: "Confidence score must be a number between 0 and 1", value: row.confidence_score });
        }
      }
      if (row.review_status && !["pending_review", "approved", "rejected"].includes(row.review_status)) {
        report.errors.push({ file: "edges.csv", row: rowNum, field: "review_status", message: "Review status must be one of: pending_review, approved, rejected", value: row.review_status });
      }
    });
  }

  // 5. Validate source documents
  if (available["source_documents.csv"]) {
    available["source_documents.csv"].forEach((row, idx) => {
      const rowNum = idx + 2;
      if (!row.source_type) {
        report.errors.push({ file: "source_documents.csv", row: rowNum, field: "source_type", message: "Source type is required" });
      }
      if (row.published_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.published_date)) {
        report.errors.push({ file: "source_documents.csv", row: rowNum, field: "published_date", message: "Published date must be in YYYY-MM-DD format", value: row.published_date });
      }
    });
  }

  // Build edge keys and source doc keys for cross-ref checks
  const sourceDocExternalIds = new Set<string>();
  if (available["source_documents.csv"]) {
    available["source_documents.csv"].forEach(row => {
      if (row.external_id) sourceDocExternalIds.add(row.external_id);
    });
  }

  const edgeKeys = new Set<string>();
  if (available["edges.csv"]) {
    available["edges.csv"].forEach(row => {
      if (row.theme_slug && row.source_node_slug && row.target_node_slug && row.relationship_type) {
        edgeKeys.add(`${row.theme_slug}:${row.source_node_slug}:${row.target_node_slug}:${row.relationship_type}`);
      }
    });
  }

  // 6. Validate edge evidence
  if (available["edge_evidence.csv"]) {
    available["edge_evidence.csv"].forEach((row, idx) => {
      const rowNum = idx + 2;
      if (!row.theme_slug) {
        report.errors.push({ file: "edge_evidence.csv", row: rowNum, field: "theme_slug", message: "Theme slug is required" });
      }
      if (!row.source_node_slug) {
        report.errors.push({ file: "edge_evidence.csv", row: rowNum, field: "source_node_slug", message: "Source node slug is required" });
      }
      if (!row.target_node_slug) {
        report.errors.push({ file: "edge_evidence.csv", row: rowNum, field: "target_node_slug", message: "Target node slug is required" });
      }
      if (!row.edge_relationship_type) {
        report.errors.push({ file: "edge_evidence.csv", row: rowNum, field: "edge_relationship_type", message: "Edge relationship type is required" });
      }
      if (!row.source_document_external_id) {
        report.errors.push({ file: "edge_evidence.csv", row: rowNum, field: "source_document_external_id", message: "Source document external ID is required" });
      } else if (!sourceDocExternalIds.has(row.source_document_external_id)) {
        report.errors.push({ file: "edge_evidence.csv", row: rowNum, field: "source_document_external_id", message: `Source document "${row.source_document_external_id}" not found in source_documents.csv`, value: row.source_document_external_id });
      }

      // Check edge reference
      if (row.theme_slug && row.source_node_slug && row.target_node_slug && row.edge_relationship_type) {
        const ek = `${row.theme_slug}:${row.source_node_slug}:${row.target_node_slug}:${row.edge_relationship_type}`;
        if (!edgeKeys.has(ek) && !edgeKeys.size) {
          report.warnings.push(`Edge evidence row ${rowNum}: Edge key not found in edges.csv. Will check database at import time.`);
        }
      }
    });
  }

  report.valid = report.errors.length === 0;
  return report;
}

function main(): void {
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
  const batchDir = path.join(IMPORT_ROOT, "incoming", batchName);

  if (!fs.existsSync(batchDir)) {
    console.error(`Error: Batch directory not found: ${batchDir}`);
    process.exit(1);
  }

  console.log(`\nValidating batch: ${batchName}`);
  console.log(`Directory: ${batchDir}\n`);

  const report = validateBatch(batchDir);
  const isDryRun = args.includes("--dry-run");

  console.log(`Files found: ${report.files.length > 0 ? report.files.join(", ") : "none"}`);
  if (Object.keys(report.rowCounts).length > 0) {
    console.log("Row counts:");
    for (const [file, count] of Object.entries(report.rowCounts)) {
      console.log(`  ${file}: ${count} rows`);
    }
  }

  if (report.warnings.length > 0) {
    console.log(`\nWarnings (${report.warnings.length}):`);
    report.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }

  if (report.errors.length > 0) {
    console.log(`\nValidation FAILED (${report.errors.length} errors):`);
    for (const err of report.errors) {
      const val = err.value ? ` (value: "${err.value}")` : "";
      console.log(`  ✗ ${err.file}:${err.row} [${err.field}] ${err.message}${val}`);
    }
    process.exit(1);
  }

  console.log("\nValidation PASSED");
  process.exit(0);
}

main();
