import { getDb } from "../client";
import { themes, nodes, edges, edgeEvidence, sourceDocuments } from "../schema";
import { eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export async function getAllThemes() {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(themes).orderBy(themes.name);
}

export async function getThemeBySlug(slug: string) {
  const db = getDb();
  if (!db) return null;
  const [theme] = await db.select().from(themes).where(eq(themes.slug, slug)).limit(1);
  return theme || null;
}

export async function getThemeDetail(slug: string) {
  const db = getDb();
  if (!db) return null;

  const [theme] = await db.select().from(themes).where(eq(themes.slug, slug)).limit(1);
  if (!theme) return null;

  const themeNodes = await db.select().from(nodes).where(eq(nodes.themeId, theme.id));
  const nodeIds = themeNodes.map((n) => n.id);

  let themeEdges: any[] = [];
  if (nodeIds.length > 0) {
    const sourceNodes = alias(nodes, "source");
    const targetNodes = alias(nodes, "target");
    themeEdges = await db
      .select({
        id: edges.id,
        sourceNodeId: edges.sourceNodeId,
        targetNodeId: edges.targetNodeId,
        relationshipType: edges.relationshipType,
        strength: edges.strength,
        confidenceScore: edges.confidenceScore,
        explanation: edges.explanation,
        reviewStatus: edges.reviewStatus,
        published: edges.published,
        createdAt: edges.createdAt,
        sourceNodeName: sourceNodes.name,
        sourceNodeSlug: sourceNodes.slug,
        targetNodeName: targetNodes.name,
        targetNodeSlug: targetNodes.slug,
      })
      .from(edges)
      .innerJoin(sourceNodes, eq(edges.sourceNodeId, sourceNodes.id))
      .innerJoin(targetNodes, eq(edges.targetNodeId, targetNodes.id))
      .where(inArray(edges.sourceNodeId, nodeIds));
  }

  const edgeIds = themeEdges.map((e) => e.id);
  const evidence = edgeIds.length > 0
    ? await db
        .select({
          edgeId: edgeEvidence.edgeId,
          quote: edgeEvidence.quote,
          sourceUrl: edgeEvidence.sourceUrl,
          extractionMethod: edgeEvidence.extractionMethod,
          docTitle: sourceDocuments.title,
          docUrl: sourceDocuments.url,
          docSourceType: sourceDocuments.sourceType,
        })
        .from(edgeEvidence)
        .leftJoin(sourceDocuments, eq(edgeEvidence.sourceDocumentId, sourceDocuments.id))
        .where(inArray(edgeEvidence.edgeId, edgeIds))
    : [];

  return { theme, nodes: themeNodes, edges: themeEdges, evidence };
}
