import { z } from "zod";
import { getDb } from "../client";
import {
  themes,
  companies,
  companyIdentifiers,
  nodes,
  edges,
  edgeEvidence,
  sourceDocuments,
  candidateEdges,
  auditLogs,
} from "../schema";
import { eq, desc } from "drizzle-orm";
import { logAudit } from "../../lib/admin/audit";

export const createThemeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  description: z.string().optional(),
  type: z.enum(["sector", "thematic", "regulatory", "other"]).default("other"),
});

export const updateThemeSchema = createThemeSchema.partial();

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  description: z.string().optional(),
  ticker: z.string().min(1, "Ticker is required").transform((v) => v.toUpperCase()),
  exchange: z.string().min(1, "Exchange is required"),
  sector: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  headquarters: z.string().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  headquarters: z.string().optional(),
});

export const createNodeSchema = z.object({
  themeId: z.string().min(1, "Theme is required"),
  companyId: z.string().optional(),
  type: z.string().min(1, "Node type is required"),
  name: z.string().min(1, "Label is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  importanceScore: z.number().min(0).max(100).optional(),
});

export const updateNodeSchema = z.object({
  companyId: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  importanceScore: z.number().min(0).max(100).optional(),
});

export const createEdgeSchema = z.object({
  sourceNodeId: z.string().min(1, "Source node is required"),
  targetNodeId: z.string().min(1, "Target node is required"),
  relationshipType: z.string().min(1, "Relationship type is required"),
  strength: z.number().int().min(1).max(10).default(5),
  confidenceScore: z.number().min(0).max(1).optional(),
  explanation: z.string().optional(),
  reviewStatus: z.enum(["pending_review", "approved", "rejected"]).default("pending_review"),
  published: z.boolean().default(false),
}).refine((d) => d.sourceNodeId !== d.targetNodeId, {
  message: "Source and target cannot be the same",
  path: ["targetNodeId"],
});

export const updateEdgeSchema = z.object({
  relationshipType: z.string().optional(),
  strength: z.number().int().min(1).max(10).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  explanation: z.string().optional(),
  reviewStatus: z.enum(["pending_review", "approved", "rejected"]).optional(),
  published: z.boolean().optional(),
});

export const createSourceDocumentSchema = z.object({
  sourceType: z.string().min(1, "Source type is required"),
  title: z.string().optional(),
  url: z.string().optional(),
  content: z.string().optional(),
  publishedAt: z.string().optional(),
});

export const attachEvidenceSchema = z.object({
  edgeId: z.string().min(1, "Edge is required"),
  sourceDocumentId: z.string().min(1, "Source document is required"),
  quote: z.string().optional(),
  sourceUrl: z.string().optional(),
  extractionMethod: z.string().default("manual"),
});

export async function getAdminThemes() {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(themes).orderBy(themes.createdAt);
}

export async function createTheme(data: z.infer<typeof createThemeSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = createThemeSchema.parse(data);
  const [theme] = await db.insert(themes).values(parsed).returning();
  if (theme) {
    await logAudit({ userId, action: "create", entityType: "theme", entityId: theme.id, metadata: { name: theme.name } });
  }
  return theme;
}

export async function updateTheme(id: string, data: z.infer<typeof updateThemeSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = updateThemeSchema.parse(data);
  const [theme] = await db.update(themes).set(parsed).where(eq(themes.id, id)).returning();
  if (theme) {
    await logAudit({ userId, action: "update", entityType: "theme", entityId: id, metadata: { name: theme.name } });
  }
  return theme;
}

export async function getAdminCompanies() {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(companies).orderBy(companies.createdAt);
}

export async function getCompanyIdentifiers(companyId: string) {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(companyIdentifiers).where(eq(companyIdentifiers.companyId, companyId));
}

export async function createCompany(data: z.infer<typeof createCompanySchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = createCompanySchema.parse(data);
  const { ticker, exchange, ...companyData } = parsed;
  const [company] = await db.insert(companies).values(companyData).returning();
  if (!company) return null;
  await db.insert(companyIdentifiers).values({
    companyId: company.id,
    type: "ticker",
    value: ticker,
    primary: true,
  }).onConflictDoNothing();
  await logAudit({ userId, action: "create", entityType: "company", entityId: company.id, metadata: { name: company.name, ticker } });
  return company;
}

export async function updateCompany(id: string, data: z.infer<typeof updateCompanySchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = updateCompanySchema.parse(data);
  const [company] = await db.update(companies).set(parsed).where(eq(companies.id, id)).returning();
  if (company) {
    await logAudit({ userId, action: "update", entityType: "company", entityId: id, metadata: { name: company.name } });
  }
  return company;
}

export async function getAdminNodes(themeId?: string) {
  const db = getDb();
  if (!db) return [];
  const query = db.select().from(nodes).orderBy(nodes.createdAt);
  if (themeId) {
    return await query.where(eq(nodes.themeId, themeId));
  }
  return await query;
}

export async function createNode(data: z.infer<typeof createNodeSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = createNodeSchema.parse(data);
  const { description, importanceScore, ...nodeData } = parsed;
  const metadata: Record<string, unknown> = {};
  if (description) metadata.description = description;
  if (importanceScore !== undefined) metadata.importance_score = importanceScore;
  const [node] = await db.insert(nodes).values({ ...nodeData, metadata: Object.keys(metadata).length ? metadata : undefined }).returning();
  if (node) {
    await logAudit({ userId, action: "create", entityType: "node", entityId: node.id, metadata: { name: node.name } });
  }
  return node;
}

export async function updateNode(id: string, data: z.infer<typeof updateNodeSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = updateNodeSchema.parse(data);
  const { description, importanceScore, ...nodeData } = parsed;
  const metadata: Record<string, unknown> = {};
  if (description) metadata.description = description;
  if (importanceScore !== undefined) metadata.importance_score = importanceScore;
  const updateData: Record<string, unknown> = { ...nodeData };
  if (Object.keys(metadata).length) {
    updateData.metadata = metadata;
  }
  const [node] = await db.update(nodes).set(updateData).where(eq(nodes.id, id)).returning();
  if (node) {
    await logAudit({ userId, action: "update", entityType: "node", entityId: id, metadata: { name: node.name } });
  }
  return node;
}

export async function getAdminEdges(themeId?: string) {
  const db = getDb();
  if (!db) return [];
  const allEdges = await db.select().from(edges).orderBy(edges.createdAt);
  if (!themeId) return allEdges;
  const sourceNodeIds = (await db.select({ id: nodes.id }).from(nodes).where(eq(nodes.themeId, themeId))).map((n) => n.id);
  if (sourceNodeIds.length === 0) return [];
  const { inArray } = await import("drizzle-orm");
  return await db.select().from(edges).where(
    inArray(edges.sourceNodeId, sourceNodeIds)
  ).orderBy(edges.createdAt);
}

export async function createEdge(data: z.infer<typeof createEdgeSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = createEdgeSchema.parse(data);
  const confidenceScore = parsed.confidenceScore !== undefined ? String(parsed.confidenceScore) : undefined;
  const [edge] = await db.insert(edges).values({ ...parsed, confidenceScore }).returning();
  if (edge) {
    await logAudit({ userId, action: "create", entityType: "edge", entityId: edge.id, metadata: { relationshipType: edge.relationshipType } });
  }
  return edge;
}

export async function updateEdge(id: string, data: z.infer<typeof updateEdgeSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = updateEdgeSchema.parse(data);
  const confidenceScore = parsed.confidenceScore !== undefined ? String(parsed.confidenceScore) : undefined;
  const updateData: Record<string, unknown> = { ...parsed };
  if (confidenceScore !== undefined) updateData.confidenceScore = confidenceScore;
  const [edge] = await db.update(edges).set(updateData).where(eq(edges.id, id)).returning();
  if (edge) {
    await logAudit({ userId, action: "update", entityType: "edge", entityId: id });
  }
  return edge;
}

export async function getEvidenceForEdge(edgeId: string) {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(edgeEvidence).where(eq(edgeEvidence.edgeId, edgeId));
}

export async function getAdminSourceDocuments() {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(sourceDocuments).orderBy(sourceDocuments.createdAt);
}

export async function createSourceDocument(data: z.infer<typeof createSourceDocumentSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = createSourceDocumentSchema.parse(data);
  const publishedAt = parsed.publishedAt ? new Date(parsed.publishedAt) : undefined;
  const [doc] = await db.insert(sourceDocuments).values({ ...parsed, publishedAt }).returning();
  if (doc) {
    await logAudit({ userId, action: "create", entityType: "source_document", entityId: doc.id, metadata: { title: doc.title } });
  }
  return doc;
}

export async function attachEvidenceToEdge(data: z.infer<typeof attachEvidenceSchema>, userId: string) {
  const db = getDb();
  if (!db) return null;
  const parsed = attachEvidenceSchema.parse(data);
  const [evidence] = await db.insert(edgeEvidence).values(parsed).returning();
  await logAudit({ userId, action: "create", entityType: "edge_evidence", entityId: evidence.id, metadata: { edgeId: parsed.edgeId } });
  return evidence;
}

export async function getAdminCandidateEdges() {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(candidateEdges).orderBy(candidateEdges.createdAt);
}

export async function getAdminAuditLogs() {
  const db = getDb();
  if (!db) return [];
  return await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
}
