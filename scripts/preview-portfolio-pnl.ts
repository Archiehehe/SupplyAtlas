/**
 * CLI script to preview portfolio subtheme P&L.
 *
 * Usage:
 *   npm run portfolio:pnl -- --portfolio <key> --start 2026-01-01 --end 2026-07-01 --mode period
 *   npm run portfolio:pnl -- --portfolio <key> --start 2026-01-01 --end 2026-07-01 --mode since-buy
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

type PnlModule = typeof import("../src/lib/portfolio/calculateSubthemePnl");
let calculatePortfolioSubthemePnl: PnlModule["calculatePortfolioSubthemePnl"];

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "true";
      parsed[key] = value;
      if (value !== "true") i++;
    }
  }
  return parsed;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(value: number | null): string {
  if (value === null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatPerDay(value: number | null): string {
  if (value === null) return "N/A";
  const sign = value >= 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}/day`;
}

async function main() {
  const mod = await import("../src/lib/portfolio/calculateSubthemePnl");
  calculatePortfolioSubthemePnl = mod.calculatePortfolioSubthemePnl;
  const args = parseArgs();

  if (args.help || !args.portfolio) {
    console.log(`
Usage: npm run portfolio:pnl -- --portfolio <key> [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--mode period|since-buy]

Options:
  --portfolio <key>   Portfolio key (required)
  --start <date>      Period start date (optional, YYYY-MM-DD)
  --end <date>        Period end date (optional, YYYY-MM-DD)
  --mode <mode>       P&L mode: "period" (default) or "since-buy"
  --help              Show this help
    `);
    process.exit(0);
  }

  const portfolioKey = args.portfolio;
  const startDate = args.start ? new Date(args.start) : null;
  const endDate = args.end ? new Date(args.end) : null;
  const mode = (args.mode === "since-buy" ? "since_buy" : "period") as "period" | "since_buy";

  console.log(`\n=== Portfolio P&L Report ===`);
  console.log(`Portfolio: ${portfolioKey}`);
  console.log(`Mode: ${mode === "period" ? "Period P&L" : "Since Buy P&L"}`);
  if (startDate) console.log(`Period: ${startDate.toISOString().split("T")[0]} to ${endDate?.toISOString().split("T")[0] ?? "now"}`);
  console.log("");

  const result = await calculatePortfolioSubthemePnl({
    portfolioKey,
    startDate,
    endDate,
    mode,
  });

  if (result.warnings.length > 0) {
    console.log("Warnings:");
    for (const w of result.warnings) console.log(`  ⚠ ${w}`);
    console.log("");
  }

  console.log(`Portfolio: ${result.portfolioName}`);
  console.log(`Mode: ${mode === "period" ? "Period P&L" : "Since Buy P&L"}`);
  console.log(`Total Period P&L: ${formatCurrency(result.totalPortfolioPeriodPnl)}`);
  console.log(`Total Since Buy P&L: ${formatCurrency(result.totalPortfolioSinceBuyPnl)}`);
  console.log(`Display P&L: ${formatCurrency(result.totalPortfolioDisplayPnl)}`);
  console.log(`Return: ${formatPct(result.totalPortfolioReturnPct)}`);
  console.log(`P&L/Day: ${formatPerDay(result.totalPortfolioPnlPerDay)}`);
  console.log("");

  console.log("Data Coverage:");
  console.log(`  Positions: ${result.dataCoverageSummary.totalPositions}`);
  console.log(`  With Cost Basis: ${result.dataCoverageSummary.positionsWithCostBasis}`);
  console.log(`  With Transactions: ${result.dataCoverageSummary.positionsWithTransactions}`);
  console.log(`  With Dividends: ${result.dataCoverageSummary.positionsWithDividends}`);
  console.log("");

  console.log("Subtheme Rankings:");
  console.log("─".repeat(100));
  console.log(
    "  Theme".padEnd(30) +
    "Display P&L".padEnd(18) +
    "Period P&L".padEnd(16) +
    "Since Buy".padEnd(16) +
    "Return".padEnd(12) +
    "Positions"
  );
  console.log("─".repeat(100));

  for (const st of result.rankedSubthemes) {
    console.log(
      `  ${st.themeName.padEnd(28)}` +
      `${formatCurrency(st.displayPnl).padEnd(16)}` +
      `${formatCurrency(st.periodPnl).padEnd(14)}` +
      `${formatCurrency(st.sinceBuyPnl).padEnd(14)}` +
      `${formatPct(st.returnPct).padEnd(10)}` +
      `${st.positionCount}`
    );
  }
  console.log("─".repeat(100));
  console.log("");

  // Show position details per subtheme
  console.log("Position Details:");
  for (const st of result.rankedSubthemes) {
    const positions = result.positionsBySubtheme[st.themeSlug] ?? [];
    console.log(`\n  ${st.themeName} (${positions.length} positions):`);
    console.log(
      "    " +
      "Ticker".padEnd(10) +
      "Display P&L".padEnd(16) +
      "Period P&L".padEnd(14) +
      "Since Buy".padEnd(14) +
      "Return".padEnd(12) +
      "MV".padEnd(14) +
      "Weight"
    );
    for (const p of positions) {
      console.log(
        "    " +
        p.ticker.padEnd(8) +
        formatCurrency(p.displayPnl).padEnd(14) +
        formatCurrency(p.periodPnl).padEnd(12) +
        formatCurrency(p.sinceBuyPnl).padEnd(12) +
        formatPct(p.returnPct).padEnd(10) +
        formatCurrency(p.marketValue).padEnd(12) +
        `${p.weight.toFixed(1)}%`
      );
    }
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});