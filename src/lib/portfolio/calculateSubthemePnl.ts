/**
 * Portfolio subtheme P&L calculation service.
 * Orchestrates DB queries, input building, and P&L calculation.
 */
import type { PortfolioPnlMode } from "./pnl";
import { calculatePositionPnl, calculatePeriodPnl, calculateSinceBuyPnl, calculateReturnPct, calculatePnlPerDay } from "./pnl";
import { buildPositionPnlInputs, buildPortfolioAggregatePnlInputs } from "./buildPnlInputs";
import type { PositionPnlInputs } from "./buildPnlInputs";
import {
  getPortfolioByKey,
  getPositions,
  getTransactions,
  getDividends,
  getAllDividends,
  getClosestPrices,
  getThemeMappings,
  getAllThemes,
} from "../../db/queries/portfolio";
import type { ThemeMappingRecord, ThemeRecord } from "../../db/queries/portfolio";

export interface SubthemePnlResult {
  themeSlug: string;
  themeName: string;
  displayPnl: number | null;
  periodPnl: number;
  sinceBuyPnl: number | null;
  returnPct: number | null;
  pnlPerDay: number | null;
  positionCount: number;
  warnings: string[];
}

export interface PositionContribution {
  ticker: string;
  displayPnl: number | null;
  periodPnl: number;
  sinceBuyPnl: number | null;
  returnPct: number | null;
  pnlPerDay: number | null;
  marketValue: number;
  weight: number;
  warnings: string[];
}

export interface PortfolioSubthemePnlOutput {
  pnlMode: PortfolioPnlMode;
  portfolioName: string;
  portfolioKey: string;
  totalPortfolioPeriodPnl: number;
  totalPortfolioSinceBuyPnl: number | null;
  totalPortfolioDisplayPnl: number | null;
  totalPortfolioReturnPct: number | null;
  totalPortfolioPnlPerDay: number | null;
  rankedSubthemes: SubthemePnlResult[];
  positionsBySubtheme: Record<string, PositionContribution[]>;
  warnings: string[];
  dataCoverageSummary: {
    totalPositions: number;
    positionsWithCostBasis: number;
    positionsWithTransactions: number;
    positionsWithDividends: number;
  };
}

export interface CalculateSubthemePnlParams {
  portfolioKey: string;
  startDate: Date | null;
  endDate: Date | null;
  mode?: PortfolioPnlMode;
}

/**
 * Calculate portfolio subtheme P&L.
 */
export async function calculatePortfolioSubthemePnl(
  params: CalculateSubthemePnlParams,
): Promise<PortfolioSubthemePnlOutput> {
  const { portfolioKey, startDate, endDate, mode = "period" } = params;
  const warnings: string[] = [];

  // Look up portfolio
  const portfolio = await getPortfolioByKey(portfolioKey);
  if (!portfolio) {
    return {
      pnlMode: mode,
      portfolioName: portfolioKey,
      portfolioKey,
      totalPortfolioPeriodPnl: 0,
      totalPortfolioSinceBuyPnl: null,
      totalPortfolioDisplayPnl: null,
      totalPortfolioReturnPct: null,
      totalPortfolioPnlPerDay: null,
      rankedSubthemes: [],
      positionsBySubtheme: {},
      warnings: [`Portfolio not found: ${portfolioKey}`],
      dataCoverageSummary: {
        totalPositions: 0,
        positionsWithCostBasis: 0,
        positionsWithTransactions: 0,
        positionsWithDividends: 0,
      },
    };
  }

  // Get positions
  const positions = await getPositions(portfolio.id);
  if (positions.length === 0) {
    return {
      pnlMode: mode,
      portfolioName: portfolio.name,
      portfolioKey,
      totalPortfolioPeriodPnl: 0,
      totalPortfolioSinceBuyPnl: null,
      totalPortfolioDisplayPnl: null,
      totalPortfolioReturnPct: null,
      totalPortfolioPnlPerDay: null,
      rankedSubthemes: [],
      positionsBySubtheme: {},
      warnings: ["No positions found for this portfolio."],
      dataCoverageSummary: {
        totalPositions: 0,
        positionsWithCostBasis: 0,
        positionsWithTransactions: 0,
        positionsWithDividends: 0,
      },
    };
  }

  // Get transactions and dividends
  const allTransactions = await getTransactions(portfolio.id, null, null);
  const periodTransactions = startDate
    ? await getTransactions(portfolio.id, startDate, endDate ?? undefined)
    : allTransactions;
  const periodDividends = startDate
    ? await getDividends(portfolio.id, startDate, endDate ?? undefined)
    : [];
  const allDividends = await getAllDividends(portfolio.id);

  // Get prices for start/end dates
  const tickers = [...new Set(positions.map((p) => p.ticker))];
  const startPrices = startDate ? await getClosestPrices(tickers, startDate) : [];
  const endPrices = endDate ? await getClosestPrices(tickers, endDate) : [];

  const startPriceMap = new Map(startPrices.map((p) => [p.ticker, p.closePrice]));
  const endPriceMap = new Map(endPrices.map((p) => [p.ticker, p.closePrice]));

  // Get theme mappings
  const themeMappings = await getThemeMappings(portfolio.id);
  const allThemes = await getAllThemes();
  const themeNameMap = new Map(allThemes.map((t) => [t.slug, t.name]));

  // Build position P&L inputs
  const positionInputs: PositionPnlInputs[] = positions.map((pos) =>
    buildPositionPnlInputs(
      pos,
      periodTransactions.filter((t) => t.ticker === pos.ticker),
      periodDividends.filter((d) => d.ticker === pos.ticker),
      allTransactions,
      allDividends,
      startDate,
      endDate,
      startPriceMap.get(pos.ticker) ?? null,
      endPriceMap.get(pos.ticker) ?? null,
    ),
  );

  // Calculate P&L for each position
  const positionPnlResults = positionInputs.map((pi) => {
    const result = calculatePositionPnl(pi.periodInputs, pi.sinceBuyInputs, mode);
    return { ...result, position: pi.position, daysHeld: pi.daysHeld, warnings: [...pi.warnings, ...result.warnings] };
  });

  // Aggregate by subtheme
  const subthemeMap = new Map<string, { inputs: PositionPnlInputs[]; tickers: Set<string> }>();

  // Group positions by theme
  for (const pos of positions) {
    const mappings = themeMappings.filter((m) => m.ticker === pos.ticker);
    if (mappings.length === 0) {
      // Unmapped positions go to "Unassigned"
      const key = "__unassigned__";
      if (!subthemeMap.has(key)) {
        subthemeMap.set(key, { inputs: [], tickers: new Set() });
      }
      const entry = subthemeMap.get(key)!;
      const pi = positionInputs.find((p) => p.position.id === pos.id);
      if (pi) entry.inputs.push(pi);
      entry.tickers.add(pos.ticker);
    } else {
      for (const m of mappings) {
        if (!subthemeMap.has(m.themeSlug)) {
          subthemeMap.set(m.themeSlug, { inputs: [], tickers: new Set() });
        }
        const entry = subthemeMap.get(m.themeSlug)!;
        const pi = positionInputs.find((p) => p.position.id === pos.id);
        if (pi) entry.inputs.push(pi);
        entry.tickers.add(pos.ticker);
      }
    }
  }

  // Calculate subtheme P&L
  const rankedSubthemes: SubthemePnlResult[] = [];
  const positionsBySubtheme: Record<string, PositionContribution[]> = {};

  for (const [themeSlug, group] of subthemeMap) {
    const themeName = themeSlug === "__unassigned__" ? "Unassigned" : themeNameMap.get(themeSlug) ?? themeSlug;
    const aggregate = buildPortfolioAggregatePnlInputs(group.inputs);

    const periodResult = calculatePeriodPnl(aggregate.totalPeriodInputs);
    const sinceBuyResult = calculateSinceBuyPnl(aggregate.totalSinceBuyInputs);

    const displayPnl = mode === "period" ? periodResult.periodPnl : sinceBuyResult.sinceBuyPnl;
    const baseValue = mode === "period" ? aggregate.totalPeriodInputs.startingMarketValue : aggregate.totalSinceBuyInputs.totalCostBasis;
    const returnPct = calculateReturnPct(displayPnl, baseValue);

    const days = startDate && endDate ? Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) : 1;
    const pnlPerDay = calculatePnlPerDay(displayPnl, days);

    rankedSubthemes.push({
      themeSlug,
      themeName,
      displayPnl,
      periodPnl: periodResult.periodPnl,
      sinceBuyPnl: sinceBuyResult.sinceBuyPnl,
      returnPct,
      pnlPerDay,
      positionCount: group.tickers.size,
      warnings: aggregate.warnings,
    });

    // Position contributions
    const contributions: PositionContribution[] = group.inputs.map((pi) => {
      const posResult = calculatePositionPnl(pi.periodInputs, pi.sinceBuyInputs, mode);
      const posBase = mode === "period" ? pi.periodInputs.startingMarketValue : pi.sinceBuyInputs.totalCostBasis;
      const posReturn = calculateReturnPct(posResult.displayPnl, posBase);
      const posPnlPerDay = calculatePnlPerDay(posResult.displayPnl, days);
      const totalMv = positions.reduce((s, p) => s + (p.marketValue ?? 0), 0);

      return {
        ticker: pi.position.ticker,
        displayPnl: posResult.displayPnl,
        periodPnl: posResult.periodPnl,
        sinceBuyPnl: posResult.sinceBuyPnl,
        returnPct: posReturn,
        pnlPerDay: posPnlPerDay,
        marketValue: pi.position.marketValue ?? 0,
        weight: totalMv > 0 ? ((pi.position.marketValue ?? 0) / totalMv) * 100 : 0,
        warnings: [...pi.warnings, ...posResult.warnings],
      };
    });

    positionsBySubtheme[themeSlug] = contributions;
  }

  // Sort subthemes by display P&L (descending)
  rankedSubthemes.sort((a, b) => (b.displayPnl ?? 0) - (a.displayPnl ?? 0));

  // Total portfolio P&L
  const totalAggregate = buildPortfolioAggregatePnlInputs(positionInputs);
  const totalPeriod = calculatePeriodPnl(totalAggregate.totalPeriodInputs);
  const totalSinceBuy = calculateSinceBuyPnl(totalAggregate.totalSinceBuyInputs);
  const totalDisplayPnl = mode === "period" ? totalPeriod.periodPnl : totalSinceBuy.sinceBuyPnl;
  const totalBase = mode === "period" ? totalAggregate.totalPeriodInputs.startingMarketValue : totalAggregate.totalSinceBuyInputs.totalCostBasis;
  const totalReturn = calculateReturnPct(totalDisplayPnl, totalBase);
  const totalDays = startDate && endDate ? Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) : 1;
  const totalPnlPerDay = calculatePnlPerDay(totalDisplayPnl, totalDays);

  // Data coverage
  const dataCoverageSummary = {
    totalPositions: positions.length,
    positionsWithCostBasis: positionInputs.filter((p) => p.sinceBuyInputs.costBasisAvailable).length,
    positionsWithTransactions: new Set(allTransactions.map((t) => t.ticker)).size,
    positionsWithDividends: new Set(allDividends.map((d) => d.ticker)).size,
  };

  return {
    pnlMode: mode,
    portfolioName: portfolio.name,
    portfolioKey,
    totalPortfolioPeriodPnl: totalPeriod.periodPnl,
    totalPortfolioSinceBuyPnl: totalSinceBuy.sinceBuyPnl,
    totalPortfolioDisplayPnl: totalDisplayPnl,
    totalPortfolioReturnPct: totalReturn,
    totalPortfolioPnlPerDay: totalPnlPerDay,
    rankedSubthemes,
    positionsBySubtheme,
    warnings,
    dataCoverageSummary,
  };
}