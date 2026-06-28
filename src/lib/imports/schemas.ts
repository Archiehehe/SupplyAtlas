import { z } from "zod";

const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const tickerPattern = /^[A-Z0-9.]+$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const themeImportRow = z.object({
  slug: z.string().min(1, "Slug is required").regex(slugPattern, "Slug must be lowercase kebab-case"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  type: z.enum(["sector", "thematic", "regulatory", "other"]).optional().default("other"),
});

export const companyImportRow = z.object({
  ticker: z.string().min(1, "Ticker is required").transform(v => v.toUpperCase()),
  exchange: z.string().min(1, "Exchange is required"),
  name: z.string().min(1, "Company name is required"),
  country: z.string().optional().default(""),
  sector: z.string().optional().default(""),
  industry: z.string().optional().default(""),
  website: z.string().optional().default(""),
  description: z.string().optional().default(""),
  headquarters: z.string().optional().default(""),
});

export const nodeImportRow = z.object({
  theme_slug: z.string().min(1, "Theme slug is required"),
  node_slug: z.string().min(1, "Node slug is required").regex(slugPattern, "Node slug must be lowercase kebab-case"),
  node_type: z.string().min(1, "Node type is required"),
  label: z.string().min(1, "Label is required"),
  company_ticker: z.string().optional().default(""),
  company_exchange: z.string().optional().default(""),
  description: z.string().optional().default(""),
  importance_score: z.string().optional().default(""),
});

export const edgeImportRow = z.object({
  theme_slug: z.string().min(1, "Theme slug is required"),
  source_node_slug: z.string().min(1, "Source node slug is required"),
  target_node_slug: z.string().min(1, "Target node slug is required"),
  relationship_type: z.string().min(1, "Relationship type is required"),
  strength: z.string().optional().default("5"),
  confidence_score: z.string().optional().default(""),
  explanation: z.string().optional().default(""),
  review_status: z.enum(["pending_review", "approved", "rejected"]).optional().default("pending_review"),
  published: z.enum(["true", "false"]).optional().default("false"),
}).refine((d) => d.source_node_slug !== d.target_node_slug, {
  message: "Source and target node cannot be the same",
  path: ["target_node_slug"],
});

export const sourceDocumentImportRow = z.object({
  external_id: z.string().optional().default(""),
  source_type: z.string().min(1, "Source type is required"),
  title: z.string().optional().default(""),
  url: z.string().optional().default(""),
  published_date: z.string().optional().default(""),
});

export const edgeEvidenceImportRow = z.object({
  theme_slug: z.string().min(1, "Theme slug is required"),
  source_node_slug: z.string().min(1, "Source node slug is required"),
  target_node_slug: z.string().min(1, "Target node slug is required"),
  edge_relationship_type: z.string().min(1, "Edge relationship type is required"),
  source_document_external_id: z.string().min(1, "Source document external ID is required"),
  evidence_quote: z.string().optional().default(""),
  source_url: z.string().optional().default(""),
  extraction_method: z.string().optional().default("manual"),
});

export type ThemeImportRow = z.infer<typeof themeImportRow>;
export type CompanyImportRow = z.infer<typeof companyImportRow>;
export type NodeImportRow = z.infer<typeof nodeImportRow>;
export type EdgeImportRow = z.infer<typeof edgeImportRow>;
export type SourceDocumentImportRow = z.infer<typeof sourceDocumentImportRow>;
export type EdgeEvidenceImportRow = z.infer<typeof edgeEvidenceImportRow>;

export interface ValidationError {
  file: string;
  row: number;
  field: string;
  message: string;
  value?: string;
}

export interface ImportValidationResult {
  batchName: string;
  valid: boolean;
  errors: ValidationError[];
  rowCounts: Record<string, number>;
}
