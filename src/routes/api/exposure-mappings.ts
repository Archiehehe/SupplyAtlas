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

export const POST = async (event: { request: Request }) => {
  const body = await event.request.json();
  const tickers: string[] = body?.tickers ?? [];
  if (tickers.length === 0) {
    return { exposures: [] };
  }

  const db = getDb();
  if (!db) {
    return { exposures: [] };
  }

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
    .select({ id: nodes.id, companyId: nodes.companyId })
    .from(nodes)
    .where(inArray(nodes.companyId, matchedCompanyIds));
  const nodeIds = nodeRows.map((n) => n.id);
  const nodeToCompanyMap = new Map<string, string | null>(
    nodeRows.map((n) => [n.id, n.companyId]),
  );

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

  const exposures = tickers.map((ticker) => {
    const upperTicker = ticker.toUpperCase().trim();
    const companyIds = tickerToCompanyIds.get(upperTicker) ?? [];

    if (companyIds.length === 0) {
      return { ticker, company: null, themes: [], edges: [], evidence: [] };
    }

    const company = companyMap.get(companyIds[0]) ?? null;

    return {
      ticker,
      company,
      themes: exposureRows
        .filter((e) => companyIds.includes(e.companyId))
        .map((e) => ({
          themeSlug: e.themeSlug,
          themeName: e.themeName,
          exposureType: e.exposureType,
          exposureScore: e.exposureScore ? Number(e.exposureScore) : null,
        })),
      edges: edgeRows
        .filter((e) => {
          const srcCompany = nodeToCompanyMap.get(e.sourceNodeId);
          const tgtCompany = nodeToCompanyMap.get(e.targetNodeId);
          return (srcCompany && companyIds.includes(srcCompany)) ||
                 (tgtCompany && companyIds.includes(tgtCompany));
        })
        .map((e) => ({
          id: e.id,
          relationshipType: e.relationshipType,
          explanation: e.explanation,
          sourceNodeName: e.sourceNodeName,
          targetNodeName: e.targetNodeName,
        })),
      evidence: evidenceRows
        .filter((ev) => edgeIds.includes(ev.edgeId))
        .map((ev) => ({
          quote: ev.quote,
          docTitle: ev.docTitle,
          docSourceType: ev.docSourceType,
        })),
    };
  });

  return { exposures };
};
