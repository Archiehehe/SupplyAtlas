import type { AggregatedHolding } from "./parseUploadedPortfolio";

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

export interface ExposureThemeSummary {
  themeSlug: string;
  themeName: string;
  weightedAllocation: number;
  weight: number;
  tickerCount: number;
  tickers: string[];
  relationshipCount: number;
  evidenceCount: number;
}

export interface ExposureSubthemeSummary {
  subtheme: string;
  themeSlug: string;
  themeName: string;
  weightedAllocation: number;
  weight: number;
  tickerCount: number;
  tickers: string[];
  evidenceCount: number;
}

export interface MatchedHolding {
  symbol: string;
  totalCostBasis: number;
  weight: number;
  company: CompanyMatch;
  themes: ThemeExposure[];
  edges: EdgeInfo[];
  evidence: EvidenceInfo[];
}

export interface UnmappedHolding {
  symbol: string;
  totalCostBasis: number;
  weight: number;
}

export interface PortfolioExposureAnalysis {
  totalCostBasis: number;
  weightingMethod: "cost_basis";
  matchedHoldings: MatchedHolding[];
  unmappedHoldings: UnmappedHolding[];
  themeExposures: ExposureThemeSummary[];
  subthemeExposures: ExposureSubthemeSummary[];
  companyMappings: TickerExposure[];
  relationshipContext: TickerExposure[];
  evidenceContext: TickerExposure[];
  warnings: string[];
}

export function analyzeUploadedPortfolio(
  holdings: AggregatedHolding[],
  totalCostBasis: number,
  mapping: ExposureMappingsResult,
): PortfolioExposureAnalysis {
  const weightMap = new Map<string, number>();
  for (const h of holdings) {
    weightMap.set(h.symbol, totalCostBasis > 0 ? h.totalCostBasis / totalCostBasis : 0);
  }

  const matched: MatchedHolding[] = [];
  const unmatched: UnmappedHolding[] = [];
  const tickerExposureMap = new Map<string, TickerExposure>();

  for (const exp of mapping.exposures) {
    const weight = weightMap.get(exp.ticker) ?? 0;
    const h = holdings.find((h) => h.symbol === exp.ticker);
    const costBasis = h?.totalCostBasis ?? 0;

    tickerExposureMap.set(exp.ticker, exp);

    if (exp.company) {
      matched.push({
        symbol: exp.ticker,
        totalCostBasis: costBasis,
        weight,
        company: exp.company,
        themes: exp.themes,
        edges: exp.edges,
        evidence: exp.evidence,
      });
    } else {
      unmatched.push({
        symbol: exp.ticker,
        totalCostBasis: costBasis,
        weight,
      });
    }
  }

  const themeMap = new Map<string, ExposureThemeSummary>();
  for (const exp of mapping.exposures) {
    if (!exp.company) continue;
    const weight = weightMap.get(exp.ticker) ?? 0;
    const wAlloc = weight * 100;
    for (const theme of exp.themes) {
      const existing = themeMap.get(theme.themeSlug);
      if (existing) {
        existing.weightedAllocation += wAlloc;
        existing.tickerCount++;
        if (!existing.tickers.includes(exp.ticker)) existing.tickers.push(exp.ticker);
        existing.relationshipCount += exp.edges.length;
        existing.evidenceCount += exp.evidence.length;
      } else {
        themeMap.set(theme.themeSlug, {
          themeSlug: theme.themeSlug,
          themeName: theme.themeName,
          weightedAllocation: wAlloc,
          weight: 0,
          tickerCount: 1,
          tickers: [exp.ticker],
          relationshipCount: exp.edges.length,
          evidenceCount: exp.evidence.length,
        });
      }
    }
  }

  const totalThemeWeight = Array.from(themeMap.values()).reduce((s, t) => s + t.weightedAllocation, 0);
  const themeExposures = Array.from(themeMap.values())
    .map((t) => ({
      ...t,
      weight: totalThemeWeight > 0 ? (t.weightedAllocation / totalThemeWeight) * 100 : 0,
    }))
    .sort((a, b) => b.weightedAllocation - a.weightedAllocation);

  const subMap = new Map<string, ExposureSubthemeSummary>();
  for (const exp of mapping.exposures) {
    if (!exp.company) continue;
    const weight = weightMap.get(exp.ticker) ?? 0;
    const wAlloc = weight * 100;
    for (const theme of exp.themes) {
      const subKey = `${theme.themeSlug}::${theme.exposureType}`;
      const existing = subMap.get(subKey);
      if (existing) {
        existing.weightedAllocation += wAlloc;
        existing.tickerCount++;
        if (!existing.tickers.includes(exp.ticker)) existing.tickers.push(exp.ticker);
        existing.evidenceCount += exp.evidence.length;
      } else {
        subMap.set(subKey, {
          subtheme: theme.exposureType,
          themeSlug: theme.themeSlug,
          themeName: theme.themeName,
          weightedAllocation: wAlloc,
          weight: 0,
          tickerCount: 1,
          tickers: [exp.ticker],
          evidenceCount: exp.evidence.length,
        });
      }
    }
  }

  const totalSubWeight = Array.from(subMap.values()).reduce((s, t) => s + t.weightedAllocation, 0);
  const subthemeExposures = Array.from(subMap.values())
    .map((s) => ({
      ...s,
      weight: totalSubWeight > 0 ? (s.weightedAllocation / totalSubWeight) * 100 : 0,
    }))
    .sort((a, b) => b.weightedAllocation - a.weightedAllocation);

  const companyMappings = mapping.exposures.filter((e) => e.company);
  const relationshipContext = mapping.exposures.filter((e) => e.edges.length > 0);
  const evidenceContext = mapping.exposures.filter((e) => e.evidence.length > 0);

  const warnings: string[] = [];
  if (matched.length === 0 && mapping.exposures.length > 0) {
    warnings.push("No tickers were matched to companies in the SupplyAtlas graph.");
  }

  return {
    totalCostBasis,
    weightingMethod: "cost_basis",
    matchedHoldings: matched,
    unmappedHoldings: unmatched,
    themeExposures,
    subthemeExposures,
    companyMappings,
    relationshipContext,
    evidenceContext,
    warnings,
  };
}
