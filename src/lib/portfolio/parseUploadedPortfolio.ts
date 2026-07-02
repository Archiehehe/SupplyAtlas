export interface ParsedHolding {
  ticker: string;
  shares: number;
  marketValue: number;
  costBasis: number | null;
  averageCost: number | null;
  name: string | null;
  sector: string | null;
  rowErrors: string[];
}

export interface ParseResult {
  holdings: ParsedHolding[];
  errors: string[];
  totalMarketValue: number;
}

const HEADER_ALIASES: Record<string, string> = {
  symbol: "ticker",
  quantity: "shares",
  qty: "shares",
  "market value": "market_value",
  market_value: "market_value",
  current_value: "market_value",
  value: "market_value",
  cost_basis: "cost_basis",
  cost: "cost_basis",
  total_cost: "cost_basis",
  avg_cost: "average_cost",
  average_cost: "average_cost",
};

function normalizeHeader(raw: string): string {
  const cleaned = raw.replace(/['"\s]+/g, " ").trim().toLowerCase().replace(/\s+/g, "_");
  const withoutUnderscore = raw.trim().toLowerCase().replace(/\s+/g, " ");
  return HEADER_ALIASES[cleaned] ?? HEADER_ALIASES[withoutUnderscore] ?? cleaned;
}

function parseCurrency(raw: string): number {
  const cleaned = raw.replace(/^[\s$€£¥]*/, "").replace(/[\s$€£¥]*$/, "").replace(/,/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function tryParseRow(lines: string[], rowStart: number): { cols: string[]; rowEnd: number } | null {
  let inQuotes = false;
  const cols: string[] = [];
  let current = "";
  let rowEnd = rowStart;

  for (let i = rowStart; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (inQuotes) {
      current += "\n";
      rowEnd = i + 1;
    } else {
      cols.push(current.trim());
      rowEnd = i + 1;
      break;
    }
  }

  return { cols, rowEnd };
}

export function parseUploadedPortfolioCSV(text: string): ParseResult {
  const rawLines = text.split("\n");
  const lines: string[] = [];
  for (const line of rawLines) {
    const trimmed = line.trimEnd();
    if (lines.length > 0 || trimmed.length > 0) {
      lines.push(trimmed);
    }
  }

  if (lines.length < 2) {
    return { holdings: [], errors: ["CSV must have a header row and at least one data row."], totalMarketValue: 0 };
  }

  const headerResult = tryParseRow(lines, 0);
  if (!headerResult) {
    return { holdings: [], errors: ["Could not parse CSV header row."], totalMarketValue: 0 };
  }

  const headers = headerResult.cols.map(normalizeHeader);
  const tickerIdx = headers.indexOf("ticker");
  const sharesIdx = headers.indexOf("shares");
  const marketValueIdx = headers.indexOf("market_value");
  const costBasisIdx = headers.indexOf("cost_basis");
  const averageCostIdx = headers.indexOf("average_cost");
  const nameIdx = headers.indexOf("name");
  const sectorIdx = headers.indexOf("sector");

  if (tickerIdx === -1) {
    return { holdings: [], errors: ["CSV must have a 'ticker' column (also accepts 'symbol')."], totalMarketValue: 0 };
  }

  let lineNum = headerResult.rowEnd;
  const holdings: ParsedHolding[] = [];
  const errors: string[] = [];
  let totalMarketValue = 0;
  let tickerCount = 0;

  while (lineNum < lines.length) {
    const blank = lines[lineNum].trim();
    if (!blank) { lineNum++; continue; }

    const result = tryParseRow(lines, lineNum);
    if (!result) { lineNum++; continue; }

    const { cols, rowEnd } = result;
    const rowIndex = holdings.length + 1;

    if (cols.length <= tickerIdx) {
      errors.push(`Row ${rowIndex}: missing ticker column, skipping.`);
      lineNum = rowEnd;
      continue;
    }

    const rawTicker = cols[tickerIdx] || "";
    const ticker = rawTicker.toUpperCase().trim();
    if (!ticker) {
      errors.push(`Row ${rowIndex}: empty ticker value, skipping.`);
      lineNum = rowEnd;
      continue;
    }

    const rowErrors: string[] = [];
    const shares = sharesIdx !== -1 && cols[sharesIdx]
      ? parseCurrency(cols[sharesIdx])
      : 0;
    if (sharesIdx !== -1 && cols[sharesIdx] && (isNaN(shares) || shares < 0)) {
      rowErrors.push(`Row ${rowIndex}: invalid shares "${cols[sharesIdx]}", treated as 0.`);
    }

    const marketValue = marketValueIdx !== -1 && cols[marketValueIdx]
      ? parseCurrency(cols[marketValueIdx])
      : 0;
    if (marketValueIdx !== -1 && cols[marketValueIdx] && marketValue === 0) {
      const raw = cols[marketValueIdx].replace(/^[\s$€£¥]*/, "").replace(/[\s$€£¥]*$/, "").replace(/,/g, "");
      if (raw && raw !== "0" && raw !== "0.00") {
        rowErrors.push(`Row ${rowIndex}: could not parse market_value "${cols[marketValueIdx]}", treated as 0.`);
      }
    }

    const costBasis = costBasisIdx !== -1 && cols[costBasisIdx]
      ? parseCurrency(cols[costBasisIdx])
      : null;
    const averageCost = averageCostIdx !== -1 && cols[averageCostIdx]
      ? parseCurrency(cols[averageCostIdx])
      : null;
    const name = nameIdx !== -1 ? (cols[nameIdx] || null) : null;
    const sector = sectorIdx !== -1 ? (cols[sectorIdx] || null) : null;

    totalMarketValue += marketValue;
    tickerCount++;
    holdings.push({ ticker, shares, marketValue, costBasis, averageCost, name, sector, rowErrors });

    lineNum = rowEnd;
  }

  return { holdings, errors, totalMarketValue };
}
