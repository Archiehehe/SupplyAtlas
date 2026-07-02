export interface UploadedLot {
  rowNumber: number;
  symbol: string;
  quantity: number;
  cost: number;
  date: string;
}

export interface AggregatedHolding {
  symbol: string;
  totalQuantity: number;
  totalCostBasis: number;
  averageCost: number;
  lotCount: number;
  firstBuyDate: string | null;
  lastBuyDate: string | null;
}

export interface ParseResult {
  lots: UploadedLot[];
  holdings: AggregatedHolding[];
  warnings: string[];
  errors: string[];
  totalCostBasis: number;
}

const KNOWN_COLUMNS = ["symbol", "quantity", "cost", "date"] as const;

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

function parseCurrency(raw: string): number {
  const cleaned = raw.replace(/^[\s$€£¥]*/, "").replace(/[\s$€£¥]*$/, "").replace(/,/g, "");
  const val = parseFloat(cleaned);
  return isNaN(val) ? 0 : val;
}

function normalizeHeader(raw: string): string {
  const cleaned = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const aliasMap: Record<string, string> = {
    symbol: "symbol",
    ticker: "symbol",
    quantity: "quantity",
    qty: "quantity",
    shares: "quantity",
    cost: "cost",
    cost_basis: "cost",
    total_cost: "cost",
    price: "cost",
    avg_cost: "cost",
    average_cost: "cost",
    date: "date",
    "purchase date": "date",
    "buy date": "date",
    acquired: "date",
  };
  return aliasMap[cleaned] ?? cleaned;
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
    return { lots: [], holdings: [], warnings: [], errors: ["CSV must have a header row and at least one data row."], totalCostBasis: 0 };
  }

  const headerResult = tryParseRow(lines, 0);
  if (!headerResult) {
    return { lots: [], holdings: [], warnings: [], errors: ["Could not parse CSV header row."], totalCostBasis: 0 };
  }

  const headers = headerResult.cols.map(normalizeHeader);
  const symIdx = headers.indexOf("symbol");
  const qtyIdx = headers.indexOf("quantity");
  const costIdx = headers.indexOf("cost");
  const dateIdx = headers.indexOf("date");

  const foundCols: string[] = [];
  if (symIdx !== -1) foundCols.push("symbol");
  if (qtyIdx !== -1) foundCols.push("quantity");
  if (costIdx !== -1) foundCols.push("cost");
  if (dateIdx !== -1) foundCols.push("date");

  if (symIdx === -1 || qtyIdx === -1 || costIdx === -1 || dateIdx === -1) {
    const missing = KNOWN_COLUMNS.filter((c) => !foundCols.includes(c));
    return { lots: [], holdings: [], warnings: [], errors: [
      `CSV must include these columns: ${KNOWN_COLUMNS.join(", ")}. Missing: ${missing.join(", ")}.`,
      `Found headers: ${headers.join(", ") || "(none)"}`,
    ], totalCostBasis: 0 };
  }

  let lineNum = headerResult.rowEnd;
  const lots: UploadedLot[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  let rowIndex = 0;

  while (lineNum < lines.length) {
    const blank = lines[lineNum].trim();
    if (!blank) { lineNum++; continue; }

    const result = tryParseRow(lines, lineNum);
    if (!result) { lineNum++; continue; }

    const { cols, rowEnd } = result;
    rowIndex++;

    if (cols.length <= Math.max(symIdx, qtyIdx, costIdx, dateIdx)) {
      errors.push(`Row ${rowIndex}: too few columns, skipping.`);
      lineNum = rowEnd;
      continue;
    }

    const rawSymbol = (cols[symIdx] || "").toUpperCase().trim();
    if (!rawSymbol) {
      errors.push(`Row ${rowIndex}: empty symbol, skipping.`);
      lineNum = rowEnd;
      continue;
    }

    const rawQty = cols[qtyIdx] || "";
    const quantity = parseCurrency(rawQty);
    if (!rawQty || isNaN(quantity) || quantity <= 0) {
      warnings.push(`Row ${rowIndex}: invalid quantity "${rawQty}" for symbol ${rawSymbol}, skipping.`);
      lineNum = rowEnd;
      continue;
    }

    const rawCost = cols[costIdx] || "";
    const cost = parseCurrency(rawCost);
    if (!rawCost || isNaN(cost) || cost < 0) {
      warnings.push(`Row ${rowIndex}: invalid cost "${rawCost}" for symbol ${rawSymbol}, skipping.`);
      lineNum = rowEnd;
      continue;
    }

    const date = (cols[dateIdx] || "").trim();
    if (!date) {
      warnings.push(`Row ${rowIndex}: empty date for symbol ${rawSymbol}, skipping.`);
      lineNum = rowEnd;
      continue;
    }

    lots.push({ rowNumber: rowIndex, symbol: rawSymbol, quantity, cost, date });
    lineNum = rowEnd;
  }

  if (lots.length === 0) {
    return { lots: [], holdings: [], warnings, errors: errors.length > 0 ? errors : ["No valid lot rows found in the CSV."], totalCostBasis: 0 };
  }

  const aggMap = new Map<string, {
    totalQuantity: number;
    totalCostBasis: number;
    lotCount: number;
    dates: string[];
  }>();

  for (const lot of lots) {
    const existing = aggMap.get(lot.symbol);
    const lotCostBasis = lot.quantity * lot.cost;
    if (existing) {
      existing.totalQuantity += lot.quantity;
      existing.totalCostBasis += lotCostBasis;
      existing.lotCount++;
      existing.dates.push(lot.date);
    } else {
      aggMap.set(lot.symbol, {
        totalQuantity: lot.quantity,
        totalCostBasis: lotCostBasis,
        lotCount: 1,
        dates: [lot.date],
      });
    }
  }

  const holdings: AggregatedHolding[] = [];
  let totalCostBasis = 0;

  for (const [symbol, data] of aggMap) {
    const sortedDates = [...data.dates].sort();
    totalCostBasis += data.totalCostBasis;
    holdings.push({
      symbol,
      totalQuantity: Math.round(data.totalQuantity * 10000) / 10000,
      totalCostBasis: Math.round(data.totalCostBasis * 100) / 100,
      averageCost: Math.round((data.totalCostBasis / data.totalQuantity) * 100) / 100,
      lotCount: data.lotCount,
      firstBuyDate: sortedDates[0] ?? null,
      lastBuyDate: sortedDates[sortedDates.length - 1] ?? null,
    });
  }

  holdings.sort((a, b) => b.totalCostBasis - a.totalCostBasis);

  return { lots, holdings, warnings, errors, totalCostBasis: Math.round(totalCostBasis * 100) / 100 };
}
