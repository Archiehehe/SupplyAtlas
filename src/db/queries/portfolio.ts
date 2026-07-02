import { and, eq, gte, lte, inArray } from "drizzle-orm";
import { getDb } from "../client";
import {
  portfolios,
  portfolioPositions,
  portfolioTransactions,
  portfolioDividends,
  dailyPrices,
  portfolioThemeMappings,
  themes,
} from "../schema";

export interface PortfolioRecord {
  id: string;
  portfolioKey: string;
  name: string;
  description: string | null;
}

export interface PositionRecord {
  id: string;
  portfolioId: string;
  ticker: string;
  shares: number;
  averageCost: number | null;
  currentPrice: number | null;
  marketValue: number | null;
  asOfDate: Date;
}

export interface TransactionRecord {
  id: string;
  portfolioId: string;
  ticker: string;
  transactionType: "buy" | "sell";
  shares: number;
  price: number;
  totalValue: number;
  transactionDate: Date;
}

export interface DividendRecord {
  id: string;
  portfolioId: string;
  ticker: string;
  amount: number;
  exDate: Date;
  payDate: Date | null;
}

export interface PriceRecord {
  ticker: string;
  priceDate: Date;
  closePrice: number;
}

export interface ThemeMappingRecord {
  ticker: string;
  themeSlug: string;
  weight: number;
}

export interface ThemeRecord {
  slug: string;
  name: string;
}

/**
 * Look up a portfolio by its key.
 */
export async function getPortfolioByKey(portfolioKey: string): Promise<PortfolioRecord | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({
      id: portfolios.id,
      portfolioKey: portfolios.portfolioKey,
      name: portfolios.name,
      description: portfolios.description,
    })
    .from(portfolios)
    .where(eq(portfolios.portfolioKey, portfolioKey))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Get all positions for a portfolio.
 */
export async function getPositions(portfolioId: string): Promise<PositionRecord[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(portfolioPositions)
    .where(eq(portfolioPositions.portfolioId, portfolioId));

  return rows.map((r) => ({
    id: r.id,
    portfolioId: r.portfolioId,
    ticker: r.ticker,
    shares: Number(r.shares),
    averageCost: r.averageCost ? Number(r.averageCost) : null,
    currentPrice: r.currentPrice ? Number(r.currentPrice) : null,
    marketValue: r.marketValue ? Number(r.marketValue) : null,
    asOfDate: r.asOfDate,
  }));
}

/**
 * Get transactions for a portfolio within a date range.
 * If startDate or endDate is null, returns all transactions.
 */
export async function getTransactions(
  portfolioId: string,
  startDate?: Date | null,
  endDate?: Date | null,
): Promise<TransactionRecord[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(portfolioTransactions.portfolioId, portfolioId)];
  if (startDate) conditions.push(gte(portfolioTransactions.transactionDate, startDate));
  if (endDate) conditions.push(lte(portfolioTransactions.transactionDate, endDate));

  const rows = await db
    .select()
    .from(portfolioTransactions)
    .where(and(...conditions))
    .orderBy(portfolioTransactions.transactionDate);

  return rows.map((r) => ({
    id: r.id,
    portfolioId: r.portfolioId,
    ticker: r.ticker,
    transactionType: r.transactionType as "buy" | "sell",
    shares: Number(r.shares),
    price: Number(r.price),
    totalValue: Number(r.totalValue),
    transactionDate: r.transactionDate,
  }));
}

/**
 * Get dividends for a portfolio within a date range.
 */
export async function getDividends(
  portfolioId: string,
  startDate?: Date | null,
  endDate?: Date | null,
): Promise<DividendRecord[]> {
  const db = getDb();
  if (!db) return [];

  const conditions = [eq(portfolioDividends.portfolioId, portfolioId)];
  if (startDate) conditions.push(gte(portfolioDividends.exDate, startDate));
  if (endDate) conditions.push(lte(portfolioDividends.exDate, endDate));

  const rows = await db
    .select()
    .from(portfolioDividends)
    .where(and(...conditions))
    .orderBy(portfolioDividends.exDate);

  return rows.map((r) => ({
    id: r.id,
    portfolioId: r.portfolioId,
    ticker: r.ticker,
    amount: Number(r.amount),
    exDate: r.exDate,
    payDate: r.payDate,
  }));
}

/**
 * Get all dividends for a portfolio (no date filter).
 */
export async function getAllDividends(portfolioId: string): Promise<DividendRecord[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(portfolioDividends)
    .where(eq(portfolioDividends.portfolioId, portfolioId))
    .orderBy(portfolioDividends.exDate);

  return rows.map((r) => ({
    id: r.id,
    portfolioId: r.portfolioId,
    ticker: r.ticker,
    amount: Number(r.amount),
    exDate: r.exDate,
    payDate: r.payDate,
  }));
}

/**
 * Get daily prices for a list of tickers on a specific date.
 */
export async function getPricesOnDate(tickers: string[], date: Date): Promise<PriceRecord[]> {
  const db = getDb();
  if (!db) return [];

  if (tickers.length === 0) return [];

  const rows = await db
    .select()
    .from(dailyPrices)
    .where(
      and(
        inArray(dailyPrices.ticker, tickers),
        eq(dailyPrices.priceDate, date),
      ),
    );

  return rows.map((r) => ({
    ticker: r.ticker,
    priceDate: r.priceDate,
    closePrice: Number(r.closePrice),
  }));
}

/**
 * Get the closest price before or on a given date for each ticker.
 */
export async function getClosestPrices(tickers: string[], date: Date): Promise<PriceRecord[]> {
  const db = getDb();
  if (!db) return [];

  if (tickers.length === 0) return [];

  const rows = await db
    .select()
    .from(dailyPrices)
    .where(
      and(
        inArray(dailyPrices.ticker, tickers),
        lte(dailyPrices.priceDate, date),
      ),
    )
    .orderBy(dailyPrices.priceDate);

  const latestByTicker = new Map<string, PriceRecord>();
  for (const r of rows) {
    const existing = latestByTicker.get(r.ticker);
    if (!existing || r.priceDate > existing.priceDate) {
      latestByTicker.set(r.ticker, {
        ticker: r.ticker,
        priceDate: r.priceDate,
        closePrice: Number(r.closePrice),
      });
    }
  }

  return Array.from(latestByTicker.values());
}

/**
 * Get theme mappings for a portfolio.
 */
export async function getThemeMappings(portfolioId: string): Promise<ThemeMappingRecord[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select()
    .from(portfolioThemeMappings)
    .where(eq(portfolioThemeMappings.portfolioId, portfolioId));

  return rows.map((r) => ({
    ticker: r.ticker,
    themeSlug: r.themeSlug,
    weight: Number(r.weight),
  }));
}

/**
 * Get all themes.
 */
export async function getAllThemes(): Promise<ThemeRecord[]> {
  const db = getDb();
  if (!db) return [];

  const rows = await db
    .select({
      slug: themes.slug,
      name: themes.name,
    })
    .from(themes);

  return rows;
}