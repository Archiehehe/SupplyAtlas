import { query } from "@solidjs/router";
import { getDb } from "../../db/client";
import {
  companies,
  companyIdentifiers,
  companyExposures,
  themes,
  nodes,
  edges,
  edgeEvidence,
  sourceDocuments,
} from "../../db/schema";
import { eq, inArray, and, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

export interface CompanyMatch {
  id: string;
  name: string;
  sector: string | null;
}

export interface ThemeExposure {
  themeSlug: string;
  themeName: string;
  exposureType: string;
  exposureScore: number | null;
}

export interface EdgeInfo {
  id: string;
  relationshipType: string;
  explanation: string | null;
  sourceNodeName: string;
  targetNodeName: string;
}

export interface EvidenceInfo {
  quote: string | null;
  docTitle: string | null;
  docSourceType: string | null;
}

export interface TickerExposure {
  ticker: string;
  company: CompanyMatch | null;
  themes: ThemeExposure[];
  edges: EdgeInfo[];
  evidence: EvidenceInfo[];
}

export interface ExposureMappingsResult {
  exposures: TickerExposure[];
}

export const fetchExposureMappings = query(async (tickers: string[]): Promise<ExposureMappingsResult> => {
  const db = getDb();
  if (!db) return { exposures: [] };
  if (tickers.length === 0) return { exposures: [] };

  const upperTickers = tickers.map((t) => t.toUpperCase().trim());

  const identifiers = await db
    .select({
      companyId: companyIdentifiers.companyId,
      value: companyIdentifiers.value,
    })
    .from(companyIdentifiers)
    .where(
      and(eq(companyIdentifiers.type, "ticker"), inArray(companyIdentifiers.value, upperTickers)),
    );

  const matchedCompanyIds = [...new Set(identifiers.map((i) => i.companyId))];
  const tickerToCompanyIds = new Map<string, string[]>();
  for (const id of identifiers) {
    const existing = tickerToCompanyIds.get(id.value) ?? [];
    existing.push(id.companyId);
    tickerToCompanyIds.set(id.value, existing);
  }

  if (matchedCompanyIds.length === 0) {
    return { exposures: tickers.map((t) => ({ ticker: t, company: null, themes: [], edges: [], evidence: [] })) };
  }

  const companyRows = await db
    .select({ id: companies.id, name: companies.name, sector: companies.sector })
    .from(companies)
    .where(inArray(companies.id, matchedCompanyIds));

  const companyMap = new Map(companyRows.map((c) => [c.id, c]));

  const exposureRows = await db
    .select({
      companyId: companyExposures.companyId,
      exposureType: companyExposures.exposureType,
      exposureScore: companyExposures.exposureScore,
      themeSlug: themes.slug,
      themeName: themes.name,
    })
    .from(companyExposures)
    .innerJoin(themes, eq(companyExposures.themeId, themes.id))
    .where(inArray(companyExposures.companyId, matchedCompanyIds));

  const nodeRows = await db
    .select()
    .from(nodes)
    .where(inArray(nodes.companyId, matchedCompanyIds));

  const nodeIds = nodeRows.map((n) => n.id);
  const nodeMap = new Map(nodeRows.map((n) => [n.id, n]));

  let edgeRows: Array<{
    id: string;
    relationshipType: string;
    explanation: string | null;
    sourceNodeId: string;
    targetNodeId: string;
    sourceNodeName: string;
    targetNodeName: string;
  }> = [];
  if (nodeIds.length > 0) {
    const sourceAlias = alias(nodes, "source");
    const targetAlias = alias(nodes, "target");
    edgeRows = await db
      .select({
        id: edges.id,
        relationshipType: edges.relationshipType,
        explanation: edges.explanation,
        sourceNodeId: edges.sourceNodeId,
        targetNodeId: edges.targetNodeId,
        sourceNodeName: sourceAlias.name,
        targetNodeName: targetAlias.name,
      })
      .from(edges)
      .innerJoin(sourceAlias, eq(edges.sourceNodeId, sourceAlias.id))
      .innerJoin(targetAlias, eq(edges.targetNodeId, targetAlias.id))
      .where(or(inArray(edges.sourceNodeId, nodeIds), inArray(edges.targetNodeId, nodeIds)));
  }

  const edgeIds = edgeRows.map((e) => e.id);

  let evidenceRows: Array<{
    edgeId: string;
    quote: string | null;
    docTitle: string | null;
    docSourceType: string | null;
  }> = [];
  if (edgeIds.length > 0) {
    evidenceRows = await db
      .select({
        edgeId: edgeEvidence.edgeId,
        quote: edgeEvidence.quote,
        docTitle: sourceDocuments.title,
        docSourceType: sourceDocuments.sourceType,
      })
      .from(edgeEvidence)
      .leftJoin(sourceDocuments, eq(edgeEvidence.sourceDocumentId, sourceDocuments.id))
      .where(inArray(edgeEvidence.edgeId, edgeIds));
  }

  const nodeToCompanyMap = new Map<string, string>();
  for (const n of nodeRows) {
    if (n.companyId) nodeToCompanyMap.set(n.id, n.companyId);
  }

  const exposures: TickerExposure[] = tickers.map((ticker) => {
    const upperTicker = ticker.toUpperCase().trim();
    const companyIds = tickerToCompanyIds.get(upperTicker) ?? [];

    if (companyIds.length === 0) {
      return { ticker, company: null, themes: [], edges: [], evidence: [] };
    }

    const company = companyMap.get(companyIds[0]) ?? null;
    const companyExposures = exposureRows.filter((e) => companyIds.includes(e.companyId));

    const companyNodeIds = nodeIds.filter((nid) => {
      const cid = nodeToCompanyMap.get(nid);
      return cid && companyIds.includes(cid);
    });

    const companyEdges = edgeRows.filter(
      (e) => companyNodeIds.includes(e.sourceNodeId) || companyNodeIds.includes(e.targetNodeId),
    );

    const companyEdgeIds = companyEdges.map((e) => e.id);
    const companyEvidence = evidenceRows.filter((e) => companyEdgeIds.includes(e.edgeId));

    return {
      ticker,
      company,
      themes: companyExposures.map((e) => ({
        themeSlug: e.themeSlug,
        themeName: e.themeName,
        exposureType: e.exposureType,
        exposureScore: e.exposureScore ? Number(e.exposureScore) : null,
      })),
      edges: companyEdges.map((e) => ({
        id: e.id,
        relationshipType: e.relationshipType,
        explanation: e.explanation,
        sourceNodeName: e.sourceNodeName,
        targetNodeName: e.targetNodeName,
      })),
      evidence: companyEvidence.map((e) => ({
        quote: e.quote,
        docTitle: e.docTitle,
        docSourceType: e.docSourceType,
      })),
    };
  });

  return { exposures };
}, "portfolio-exposure-mappings");
