import dotenv from "dotenv";
import { db } from "../../src/db/client";
import { themes, companies, companyIdentifiers, nodes, edges } from "../../src/db/schema";
import { eq, and } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const themeData = {
  slug: "ai-datacenter-supply-chain",
  name: "AI Datacenter Supply Chain",
  description: "A map of the AI datacenter supply chain from chips to REITs",
  type: "sector",
};

const companiesData = [
  { ticker: "NVDA", name: "NVIDIA Corporation", type: "company", group: "compute" },
  { ticker: "AMD", name: "Advanced Micro Devices, Inc.", type: "company", group: "compute" },
  { ticker: "AVGO", name: "Broadcom Inc.", type: "company", group: "compute" },
  { ticker: "MU", name: "Micron Technology, Inc.", type: "company", group: "memory" },
  { ticker: "TSM", name: "Taiwan Semiconductor Manufacturing Company Limited", type: "company", group: "foundry" },
  { ticker: "ASML", name: "ASML Holding N.V.", type: "company", group: "semiconductor-equipment" },
  { ticker: "AMAT", name: "Applied Materials, Inc.", type: "company", group: "semiconductor-equipment" },
  { ticker: "LRCX", name: "Lam Research Corporation", type: "company", group: "semiconductor-equipment" },
  { ticker: "KLAC", name: "KLA Corporation", type: "company", group: "semiconductor-equipment" },
  { ticker: "ANET", name: "Arista Networks, Inc.", type: "company", group: "networking" },
  { ticker: "COHR", name: "Coherent Corp.", type: "company", group: "networking" },
  { ticker: "LITE", name: "Lumentum Holdings Inc.", type: "company", group: "networking" },
  { ticker: "AAOI", name: "Applied Optoelectronics, Inc.", type: "company", group: "networking" },
  { ticker: "VRT", name: "Vertiv Holdings Co", type: "company", group: "power-cooling" },
  { ticker: "ETN", name: "Eaton Corporation plc", type: "company", group: "power-cooling" },
  { ticker: "CEG", name: "Constellation Energy Corporation", type: "company", group: "energy" },
  { ticker: "VST", name: "Vistra Corp.", type: "company", group: "energy" },
  { ticker: "EQIX", name: "Equinix, Inc.", type: "company", group: "datacenter-reits" },
  { ticker: "DLR", name: "Digital Realty Trust, Inc.", type: "company", group: "datacenter-reits" },
  { ticker: "SOXX", name: "iShares Semiconductor ETF", type: "etf", group: "etfs" },
  { ticker: "QQQ", name: "Invesco QQQ Trust, Series 1", type: "etf", group: "etfs" },
];

const edgesData = [
  { source: "NVDA", target: "TSM", type: "manufactured-by", strength: 10, explanation: "NVIDIA's GPUs are primarily manufactured by TSMC" },
  { source: "AMD", target: "TSM", type: "manufactured-by", strength: 9, explanation: "AMD's CPUs and GPUs are largely manufactured by TSMC" },
  { source: "TSM", target: "ASML", type: "uses", strength: 10, explanation: "TSMC relies heavily on ASML's lithography machines" },
  { source: "TSM", target: "AMAT", type: "uses", strength: 8, explanation: "TSMC uses Applied Materials equipment" },
  { source: "TSM", target: "LRCX", type: "uses", strength: 8, explanation: "TSMC uses Lam Research equipment" },
  { source: "TSM", target: "KLAC", type: "uses", strength: 7, explanation: "TSMC uses KLA's process control equipment" },
  { source: "NVDA", target: "MU", type: "supplies-memory-to", strength: 8, explanation: "NVIDIA GPUs use Micron memory chips" },
  { source: "NVDA", target: "ANET", type: "partners-with", strength: 7, explanation: "NVIDIA and Arista partner on networking solutions" },
  { source: "ANET", target: "COHR", type: "uses", strength: 6, explanation: "Arista uses Coherent's optical components" },
  { source: "ANET", target: "LITE", type: "uses", strength: 6, explanation: "Arista uses Lumentum's optical components" },
  { source: "ANET", target: "AAOI", type: "uses", strength: 5, explanation: "Arista uses Applied Optoelectronics' components" },
  { source: "EQIX", target: "VRT", type: "uses", strength: 8, explanation: "Equinix uses Vertiv for power and cooling solutions" },
  { source: "EQIX", target: "ETN", type: "uses", strength: 7, explanation: "Equinix uses Eaton's electrical equipment" },
  { source: "EQIX", target: "CEG", type: "purchases-power-from", strength: 6, explanation: "Equinix purchases power from Constellation Energy in some regions" },
  { source: "EQIX", target: "VST", type: "purchases-power-from", strength: 5, explanation: "Equinix purchases power from Vistra in some regions" },
  { source: "DLR", target: "VRT", type: "uses", strength: 7, explanation: "Digital Realty uses Vertiv's solutions" },
  { source: "SOXX", target: "NVDA", type: "holds", strength: 10, explanation: "NVIDIA is a top holding in SOXX" },
  { source: "SOXX", target: "AMD", type: "holds", strength: 9, explanation: "AMD is a major holding in SOXX" },
  { source: "SOXX", target: "AVGO", type: "holds", strength: 9, explanation: "Broadcom is a major holding in SOXX" },
  { source: "SOXX", target: "MU", type: "holds", strength: 8, explanation: "Micron is a major holding in SOXX" },
  { source: "SOXX", target: "TSM", type: "holds", strength: 9, explanation: "TSMC is a major holding in SOXX" },
  { source: "SOXX", target: "ASML", type: "holds", strength: 7, explanation: "ASML is a holding in SOXX" },
  { source: "SOXX", target: "AMAT", type: "holds", strength: 8, explanation: "Applied Materials is a holding in SOXX" },
  { source: "QQQ", target: "NVDA", type: "holds", strength: 10, explanation: "NVIDIA is a top holding in QQQ" },
  { source: "QQQ", target: "AMD", type: "holds", strength: 8, explanation: "AMD is a holding in QQQ" },
];

async function main() {
  console.log("Starting seed...");

  // 1. Create theme
  const existingThemes = await db.select().from(themes).where(eq(themes.slug, themeData.slug)).limit(1);
  let themeId: string;
  if (existingThemes.length > 0) {
    console.log("Theme already exists, updating...");
    const [updatedTheme] = await db
      .update(themes)
      .set({ name: themeData.name, description: themeData.description, type: themeData.type })
      .where(eq(themes.id, existingThemes[0].id))
      .returning();
    themeId = updatedTheme.id;
  } else {
    console.log("Creating theme...");
    const [newTheme] = await db.insert(themes).values(themeData).returning();
    themeId = newTheme.id;
  }

  // 2. Create companies and identifiers
  const companyMap = new Map<string, { id: string; nodeId: string }>();
  for (const companyData of companiesData) {
    const identifiers = await db
      .select()
      .from(companyIdentifiers)
      .where(and(eq(companyIdentifiers.type, "ticker"), eq(companyIdentifiers.value, companyData.ticker)))
      .limit(1);

    let companyId: string;
    if (identifiers.length > 0) {
      companyId = identifiers[0].companyId;
    } else {
      const [newCompany] = await db.insert(companies).values({ name: companyData.name }).returning();
      companyId = newCompany.id;
      await db.insert(companyIdentifiers).values({
        companyId,
        type: "ticker",
        value: companyData.ticker,
        primary: true,
      });
    }

    // Create node
    const existingNodes = await db
      .select()
      .from(nodes)
      .where(and(eq(nodes.slug, companyData.ticker.toLowerCase()), eq(nodes.themeId, themeId)))
      .limit(1);

    let nodeId: string;
    if (existingNodes.length > 0) {
      nodeId = existingNodes[0].id;
    } else {
      const [newNode] = await db
        .insert(nodes)
        .values({
          themeId,
          companyId,
          type: companyData.type,
          name: companyData.name,
          slug: companyData.ticker.toLowerCase(),
          metadata: { group: companyData.group },
        })
        .returning();
      nodeId = newNode.id;
    }

    companyMap.set(companyData.ticker, { id: companyId, nodeId });
  }

  // 3. Create edges
  for (const edgeData of edgesData) {
    const source = companyMap.get(edgeData.source);
    const target = companyMap.get(edgeData.target);
    if (!source || !target) continue;

    const existingEdges = await db
      .select()
      .from(edges)
      .where(and(
        eq(edges.sourceNodeId, source.nodeId),
        eq(edges.targetNodeId, target.nodeId),
        eq(edges.relationshipType, edgeData.type)
      ))
      .limit(1);

    if (existingEdges.length > 0) {
      await db
        .update(edges)
        .set({
          strength: edgeData.strength,
          explanation: edgeData.explanation,
          reviewStatus: "manual_seed",
          published: true,
        })
        .where(eq(edges.id, existingEdges[0].id));
    } else {
      await db.insert(edges).values({
        sourceNodeId: source.nodeId,
        targetNodeId: target.nodeId,
        relationshipType: edgeData.type,
        strength: edgeData.strength,
        explanation: edgeData.explanation,
        reviewStatus: "manual_seed",
        published: true,
      });
    }
  }

  console.log("Seed complete!");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
