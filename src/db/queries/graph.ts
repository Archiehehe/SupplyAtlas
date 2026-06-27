import { db } from "../client";
import { nodes, edges, themes } from "../schema";
import { eq } from "drizzle-orm";

export async function getThemeGraphBySlug(slug: string) {
  const theme = await db.select().from(themes).where(eq(themes.slug, slug)).limit(1);
  if (!theme.length) return null;
  const themeNodes = await db.select().from(nodes).where(eq(nodes.themeId, theme[0].id));
  const nodeIds = themeNodes.map((n) => n.id);
  const themeEdges = await db.select().from(edges).where(eq(edges.published, true));
  return {
    theme: theme[0],
    nodes: themeNodes,
    edges: themeEdges.filter((e) => nodeIds.includes(e.sourceNodeId) && nodeIds.includes(e.targetNodeId)),
  };
}
