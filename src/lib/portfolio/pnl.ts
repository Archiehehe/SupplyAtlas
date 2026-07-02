/**
 * Pure P&L calculation utilities.
 * No DB calls. No side effects.
 */

export type PortfolioPnlMode = "period" | "since_buy";

export interface PeriodPnlInputs {
  /** Market value at the end of the period */
  endingMarketValue: number;
  /** Market value at the start of the period */
  startingMarketValue: number;
  /** Total proceeds from sells during the period */
  sellProceedsDuringPeriod: number;
  /** Total cost of buys during the period */
  buyCostDuringPeriod: number;
  /** Total dividends received during the period */
  dividendsDuringPeriod: number;
}

export interface SinceBuyPnlInputs {
  /** Market value at the end of the period */
  endingMarketValue: number;
  /** Total cost basis (sum of all buys ever) */
  totalCostBasis: number;
  /** Total realized proceeds from all sells ever */
  allRealizedSellProceeds: number;
  /** Total dividends ever received */
  allDividends: number;
  /** Whether cost basis is complete/available */
  costBasisAvailable: boolean;
}

export interface PnlResult {
  mode: PortfolioPnlMode;

  // Period P&L fields
  periodPnl: number;
  periodPricePnl: number;
  periodDividendPnl: number;
  periodRealizedPnl: number;

  // Since Buy P&L fields
  sinceBuyPnl: number | null;
  sinceBuyPricePnl: number | null;
  sinceBuyDividendPnl: number | null;
  sinceBuyRealizedPnl: number | null;

  /** The P&L value for the selected mode */
  displayPnl: number | null;

  /** Warnings about data quality */
  warnings: string[];
}

/**
 * Calculate Period P&L.
 *
 * Formula:
 *   periodPnl = endingMarketValue
 *             + sellProceedsDuringPeriod
 *             + dividendsDuringPeriod
 *             - startingMarketValue
 *             - buyCostDuringPeriod
 */
export function calculatePeriodPnl(inputs: PeriodPnlInputs): {
  periodPnl: number;
  periodPricePnl: number;
  periodDividendPnl: number;
  periodRealizedPnl: number;
} {
  const { endingMarketValue, startingMarketValue, sellProceedsDuringPeriod, buyCostDuringPeriod, dividendsDuringPeriod } = inputs;

  const periodPricePnl = endingMarketValue - startingMarketValue - buyCostDuringPeriod + sellProceedsDuringPeriod;
  const periodDividendPnl = dividendsDuringPeriod;
  const periodRealizedPnl = sellProceedsDuringPeriod - buyCostDuringPeriod;
  const periodPnl = periodPricePnl + periodDividendPnl;

  return { periodPnl, periodPricePnl, periodDividendPnl, periodRealizedPnl };
}

/**
 * Calculate Since Buy / Lifetime P&L.
 *
 * Formula:
 *   sinceBuyPnl = endingMarketValue
 *               + allRealizedSellProceeds
 *               + allDividends
 *               - totalCostBasis
 *
 * Returns null for all fields if cost basis is not available.
 */
export function calculateSinceBuyPnl(inputs: SinceBuyPnlInputs): {
  sinceBuyPnl: number | null;
  sinceBuyPricePnl: number | null;
  sinceBuyDividendPnl: number | null;
  sinceBuyRealizedPnl: number | null;
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!inputs.costBasisAvailable) {
    warnings.push("Cost basis is not available. Since Buy P&L cannot be calculated.");
    return {
      sinceBuyPnl: null,
      sinceBuyPricePnl: null,
      sinceBuyDividendPnl: null,
      sinceBuyRealizedPnl: null,
      warnings,
    };
  }

  const sinceBuyPricePnl = inputs.endingMarketValue + inputs.allRealizedSellProceeds - inputs.totalCostBasis;
  const sinceBuyDividendPnl = inputs.allDividends;
  const sinceBuyRealizedPnl = inputs.allRealizedSellProceeds;
  const sinceBuyPnl = sinceBuyPricePnl + sinceBuyDividendPnl;

  return {
    sinceBuyPnl,
    sinceBuyPricePnl,
    sinceBuyDividendPnl,
    sinceBuyRealizedPnl,
    warnings,
  };
}

/**
 * Calculate P&L for a single position given both period and since-buy inputs.
 * Returns a combined result with both modes.
 */
export function calculatePositionPnl(
  periodInputs: PeriodPnlInputs,
  sinceBuyInputs: SinceBuyPnlInputs,
  mode: PortfolioPnlMode = "period",
): PnlResult {
  const period = calculatePeriodPnl(periodInputs);
  const sinceBuy = calculateSinceBuyPnl(sinceBuyInputs);

  const warnings = [...sinceBuy.warnings];

  let displayPnl: number | null;
  if (mode === "period") {
    displayPnl = period.periodPnl;
  } else {
    displayPnl = sinceBuy.sinceBuyPnl;
  }

  return {
    mode,
    ...period,
    ...sinceBuy,
    displayPnl,
    warnings,
  };
}

/**
 * Calculate return percentage for a given P&L and base value.
 */
export function calculateReturnPct(pnl: number | null, baseValue: number): number | null {
  if (pnl === null || baseValue === 0) return null;
  return (pnl / baseValue) * 100;
}

/**
 * Calculate P&L per day.
 */
export function calculatePnlPerDay(pnl: number | null, days: number): number | null {
  if (pnl === null || days <= 0) return null;
  return pnl / days;
}