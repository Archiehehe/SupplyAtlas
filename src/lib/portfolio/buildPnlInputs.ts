/**
 * Builds Period and Since-Buy P&L inputs from raw DB records.
 * Pure data transformation - no DB calls.
 */
import type {
  PositionRecord,
  TransactionRecord,
  DividendRecord,
} from "../../db/queries/portfolio";
import type { PeriodPnlInputs, SinceBuyPnlInputs } from "./pnl";

export interface PositionPnlInputs {
  position: PositionRecord;
  periodInputs: PeriodPnlInputs;
  sinceBuyInputs: SinceBuyPnlInputs;
  /** Number of days held (for velocity calculations) */
  daysHeld: number | null;
  /** Warnings specific to this position's data quality */
  warnings: string[];
}

export interface PortfolioPnlInputsResult {
  positions: PositionPnlInputs[];
  totalPeriodInputs: PeriodPnlInputs;
  totalSinceBuyInputs: SinceBuyPnlInputs;
  warnings: string[];
}

function aggregateTickerTransactions(
  transactions: TransactionRecord[],
  ticker: string,
): { buys: number; sells: number } {
  let buys = 0;
  let sells = 0;
  for (const t of transactions) {
    if (t.ticker !== ticker) continue;
    if (t.transactionType === "sell") sells += t.totalValue;
    else buys += t.totalValue;
  }
  return { buys, sells };
}

/**
 * Build P&L inputs for a single position.
 */
export function buildPositionPnlInputs(
  position: PositionRecord,
  tickerTransactions: TransactionRecord[],
  tickerDividends: DividendRecord[],
  allTransactions: TransactionRecord[],
  allDividends: DividendRecord[],
  startDate: Date | null,
  endDate: Date | null,
  startPrice: number | null,
  endPrice: number | null,
): PositionPnlInputs {
  const warnings: string[] = [];

  // Ending market value
  const endingMarketValue = endPrice
    ? position.shares * endPrice
    : position.marketValue ?? 0;

  // Starting market value
  const startingMarketValue = startPrice ? position.shares * startPrice : 0;

  // Transactions during period
  const periodTxs = aggregateTickerTransactions(tickerTransactions, position.ticker);

  // Dividends during period
  const dividendsDuringPeriod = tickerDividends.reduce((sum, d) => sum + d.amount, 0);

  const periodInputs: PeriodPnlInputs = {
    endingMarketValue,
    startingMarketValue,
    sellProceedsDuringPeriod: periodTxs.sells,
    buyCostDuringPeriod: periodTxs.buys,
    dividendsDuringPeriod,
  };

  // Cost basis
  let totalCostBasis = 0;
  let costBasisAvailable = false;

  if (position.averageCost && position.averageCost > 0) {
    totalCostBasis = position.averageCost * position.shares;
    costBasisAvailable = true;
  } else {
    const allBuys = allTransactions.filter(
      (t) => t.ticker === position.ticker && t.transactionType === "buy",
    );
    if (allBuys.length > 0) {
      totalCostBasis = allBuys.reduce((sum, t) => sum + t.totalValue, 0);
      costBasisAvailable = true;
    } else {
      warnings.push(`Cost basis not available for ${position.ticker}. Since Buy P&L may be inaccurate.`);
    }
  }

  // All realized sell proceeds
  const allRealizedSellProceeds = allTransactions
    .filter((t) => t.ticker === position.ticker && t.transactionType === "sell")
    .reduce((sum, t) => sum + t.totalValue, 0);

  // All dividends
  const allDividendsForTicker = allDividends
    .filter((d) => d.ticker === position.ticker)
    .reduce((sum, d) => sum + d.amount, 0);

  const sinceBuyInputs: SinceBuyPnlInputs = {
    endingMarketValue,
    totalCostBasis,
    allRealizedSellProceeds,
    allDividends: allDividendsForTicker,
    costBasisAvailable,
  };

  // Days held estimate
  let daysHeld: number | null = null;
  if (endDate && startDate) {
    const buyDates = tickerTransactions
      .filter((t) => t.transactionType === "buy")
      .map((t) => t.transactionDate.getTime());
    if (buyDates.length > 0) {
      const earliestBuy = new Date(Math.min(...buyDates));
      daysHeld = Math.max(1, Math.floor((endDate.getTime() - earliestBuy.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  return { position, periodInputs, sinceBuyInputs, daysHeld, warnings };
}

/**
 * Build aggregate portfolio-level P&L inputs from all positions.
 */
export function buildPortfolioAggregatePnlInputs(
  positionInputs: PositionPnlInputs[],
): PortfolioPnlInputsResult {
  const warnings: string[] = [];

  const totalPeriodInputs: PeriodPnlInputs = {
    endingMarketValue: 0,
    startingMarketValue: 0,
    sellProceedsDuringPeriod: 0,
    buyCostDuringPeriod: 0,
    dividendsDuringPeriod: 0,
  };

  const totalSinceBuyInputs: SinceBuyPnlInputs = {
    endingMarketValue: 0,
    totalCostBasis: 0,
    allRealizedSellProceeds: 0,
    allDividends: 0,
    costBasisAvailable: true,
  };

  for (const pi of positionInputs) {
    totalPeriodInputs.endingMarketValue += pi.periodInputs.endingMarketValue;
    totalPeriodInputs.startingMarketValue += pi.periodInputs.startingMarketValue;
    totalPeriodInputs.sellProceedsDuringPeriod += pi.periodInputs.sellProceedsDuringPeriod;
    totalPeriodInputs.buyCostDuringPeriod += pi.periodInputs.buyCostDuringPeriod;
    totalPeriodInputs.dividendsDuringPeriod += pi.periodInputs.dividendsDuringPeriod;

    totalSinceBuyInputs.endingMarketValue += pi.sinceBuyInputs.endingMarketValue;
    totalSinceBuyInputs.totalCostBasis += pi.sinceBuyInputs.totalCostBasis;
    totalSinceBuyInputs.allRealizedSellProceeds += pi.sinceBuyInputs.allRealizedSellProceeds;
    totalSinceBuyInputs.allDividends += pi.sinceBuyInputs.allDividends;
    if (!pi.sinceBuyInputs.costBasisAvailable) {
      totalSinceBuyInputs.costBasisAvailable = false;
    }
    warnings.push(...pi.warnings);
  }

  return { positions: positionInputs, totalPeriodInputs, totalSinceBuyInputs, warnings };
}