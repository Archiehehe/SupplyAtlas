export interface ParsedHolding {
  ticker: string;
  shares: number;
  marketValue: number;
  costBasis: number | null;
  averageCost: number | null;
  name: string | null;
  sector: string | null;
}

export interface ParseResult {
  holdings: ParsedHolding[];
  errors: string[];
  totalMarketValue: number;
}

export function parseUploadedPortfolioCSV(text: string): ParseResult {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return { holdings: [], errors: ["CSV must have a header row and at least one data row."], totalMarketValue: 0 };
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const tickerIdx = headers.indexOf("ticker");
  const sharesIdx = headers.indexOf("shares");
  const marketValueIdx = headers.indexOf("market_value");
  const costBasisIdx = headers.indexOf("cost_basis");
  const averageCostIdx = headers.indexOf("average_cost");
  const nameIdx = headers.indexOf("name");
  const sectorIdx = headers.indexOf("sector");

  if (tickerIdx === -1) {
    return { holdings: [], errors: ["CSV must have a 'ticker' column."], totalMarketValue: 0 };
  }
  if (sharesIdx === -1) {
    return { holdings: [], errors: ["CSV must have a 'shares' column."], totalMarketValue: 0 };
  }

  const holdings: ParsedHolding[] = [];
  const errors: string[] = [];
  let totalMarketValue = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < Math.max(tickerIdx, sharesIdx) + 1) {
      errors.push(`Row ${i + 1}: too few columns, skipping.`);
      continue;
    }

    const ticker = cols[tickerIdx].toUpperCase();
    if (!ticker) {
      errors.push(`Row ${i + 1}: empty ticker, skipping.`);
      continue;
    }

    const shares = parseFloat(cols[sharesIdx]);
    if (isNaN(shares) || shares <= 0) {
      errors.push(`Row ${i + 1}: invalid shares value "${cols[sharesIdx]}", skipping.`);
      continue;
    }

    const marketValue = marketValueIdx !== -1 ? parseFloat(cols[marketValueIdx]) || 0 : 0;
    const costBasis = costBasisIdx !== -1 ? parseFloat(cols[costBasisIdx]) || null : null;
    const averageCost = averageCostIdx !== -1 ? parseFloat(cols[averageCostIdx]) || null : null;
    const name = nameIdx !== -1 ? cols[nameIdx] || null : null;
    const sector = sectorIdx !== -1 ? cols[sectorIdx] || null : null;

    totalMarketValue += marketValue;
    holdings.push({ ticker, shares, marketValue, costBasis, averageCost, name, sector });
  }

  return { holdings, errors, totalMarketValue };
}
