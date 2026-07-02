/**
 * Pure formula verification for portfolio P&L calculations.
 * No DB calls. Tests the math directly.
 */
import {
  calculatePeriodPnl,
  calculateSinceBuyPnl,
  calculatePositionPnl,
  calculateReturnPct,
  calculatePnlPerDay,
} from "../src/lib/portfolio/pnl";

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

const results: CheckResult[] = [];

function check(name: string, passed: boolean, detail: string) {
  results.push({ name, passed, detail });
  const icon = passed ? "✓" : "✗";
  console.log(`  ${icon} ${name}: ${detail}`);
}

function approx(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

console.log("\n=== Portfolio P&L Formula Checks ===\n");

// Check 1: Period P&L excludes buys before period
console.log("1. Period P&L excludes buys before period");
{
  const inputs = {
    endingMarketValue: 10000,
    startingMarketValue: 8000,
    sellProceedsDuringPeriod: 0,
    buyCostDuringPeriod: 0, // No buys during period
    dividendsDuringPeriod: 0,
  };
  const result = calculatePeriodPnl(inputs);
  check(
    "Buys before period not subtracted",
    approx(result.periodPnl, 2000),
    `Expected 2000, got ${result.periodPnl}`,
  );
}

// Check 2: Period P&L includes only buys during period
console.log("\n2. Period P&L includes only buys during period");
{
  const inputs = {
    endingMarketValue: 12000,
    startingMarketValue: 8000,
    sellProceedsDuringPeriod: 0,
    buyCostDuringPeriod: 2000, // $2000 buy during period
    dividendsDuringPeriod: 0,
  };
  const result = calculatePeriodPnl(inputs);
  check(
    "Buys during period subtracted correctly",
    approx(result.periodPnl, 2000),
    `Expected 2000 (12000 - 8000 - 2000), got ${result.periodPnl}`,
  );
}

// Check 3: Since-buy P&L uses cost basis
console.log("\n3. Since-buy P&L uses cost basis");
{
  const inputs = {
    endingMarketValue: 10000,
    totalCostBasis: 8000,
    allRealizedSellProceeds: 0,
    allDividends: 0,
    costBasisAvailable: true,
  };
  const result = calculateSinceBuyPnl(inputs);
  check(
    "Since-buy P&L = ending MV - cost basis",
    approx(result.sinceBuyPnl!, 2000),
    `Expected 2000, got ${result.sinceBuyPnl}`,
  );
}

// Check 4: Since-buy P&L includes realized proceeds
console.log("\n4. Since-buy P&L includes realized proceeds");
{
  const inputs = {
    endingMarketValue: 5000,
    totalCostBasis: 10000,
    allRealizedSellProceeds: 6000,
    allDividends: 0,
    costBasisAvailable: true,
  };
  const result = calculateSinceBuyPnl(inputs);
  check(
    "Since-buy P&L includes realized sell proceeds",
    approx(result.sinceBuyPnl!, 1000),
    `Expected 1000 (5000 + 6000 - 10000), got ${result.sinceBuyPnl}`,
  );
}

// Check 5: Since-buy P&L includes dividends
console.log("\n5. Since-buy P&L includes dividends");
{
  const inputs = {
    endingMarketValue: 10000,
    totalCostBasis: 8000,
    allRealizedSellProceeds: 0,
    allDividends: 500,
    costBasisAvailable: true,
  };
  const result = calculateSinceBuyPnl(inputs);
  check(
    "Since-buy P&L includes dividends",
    approx(result.sinceBuyPnl!, 2500),
    `Expected 2500 (10000 + 500 - 8000), got ${result.sinceBuyPnl}`,
  );
}

// Check 6: Period and since-buy return different values
console.log("\n6. Period and since-buy return different values");
{
  const periodInputs = {
    endingMarketValue: 10000,
    startingMarketValue: 7000,
    sellProceedsDuringPeriod: 0,
    buyCostDuringPeriod: 0,
    dividendsDuringPeriod: 0,
  };
  const sinceBuyInputs = {
    endingMarketValue: 10000,
    totalCostBasis: 5000,
    allRealizedSellProceeds: 0,
    allDividends: 0,
    costBasisAvailable: true,
  };
  const result = calculatePositionPnl(periodInputs, sinceBuyInputs, "period");
  check(
    "Period P&L (3000) differs from since-buy P&L (5000)",
    approx(result.periodPnl, 3000) && approx(result.sinceBuyPnl!, 5000),
    `Period: ${result.periodPnl}, Since Buy: ${result.sinceBuyPnl}`,
  );
}

// Check 7: Since-buy returns null when cost basis unavailable
console.log("\n7. Since-buy returns null when cost basis unavailable");
{
  const inputs = {
    endingMarketValue: 10000,
    totalCostBasis: 0,
    allRealizedSellProceeds: 0,
    allDividends: 0,
    costBasisAvailable: false,
  };
  const result = calculateSinceBuyPnl(inputs);
  check(
    "Since-buy P&L is null when cost basis unavailable",
    result.sinceBuyPnl === null,
    `Expected null, got ${result.sinceBuyPnl}`,
  );
  check(
    "Warning emitted for missing cost basis",
    result.warnings.length > 0,
    `Expected warnings, got ${result.warnings.length}`,
  );
}

// Check 8: Return percentage calculation
console.log("\n8. Return percentage calculation");
{
  const pct = calculateReturnPct(2000, 10000);
  check(
    "Return pct = 20% for 2000/10000",
    approx(pct!, 20),
    `Expected 20%, got ${pct}`,
  );
}

// Check 9: P&L per day calculation
console.log("\n9. P&L per day calculation");
{
  const perDay = calculatePnlPerDay(1000, 10);
  check(
    "P&L/day = $100 for 1000/10 days",
    approx(perDay!, 100),
    `Expected 100, got ${perDay}`,
  );
}

// Check 10: Display P&L follows selected mode
console.log("\n10. Display P&L follows selected mode");
{
  const periodInputs = {
    endingMarketValue: 10000,
    startingMarketValue: 8000,
    sellProceedsDuringPeriod: 0,
    buyCostDuringPeriod: 0,
    dividendsDuringPeriod: 0,
  };
  const sinceBuyInputs = {
    endingMarketValue: 10000,
    totalCostBasis: 6000,
    allRealizedSellProceeds: 0,
    allDividends: 0,
    costBasisAvailable: true,
  };

  const periodMode = calculatePositionPnl(periodInputs, sinceBuyInputs, "period");
  const sinceBuyMode = calculatePositionPnl(periodInputs, sinceBuyInputs, "since_buy");

  check(
    "Display P&L = period P&L when mode=period",
    approx(periodMode.displayPnl!, 2000),
    `Expected 2000, got ${periodMode.displayPnl}`,
  );
  check(
    "Display P&L = since-buy P&L when mode=since_buy",
    approx(sinceBuyMode.displayPnl!, 4000),
    `Expected 4000, got ${sinceBuyMode.displayPnl}`,
  );
}

// Summary
console.log("\n" + "=".repeat(50));
const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
console.log(`\nResults: ${passed} passed, ${failed} failed out of ${results.length} checks`);

if (failed > 0) {
  console.log("\nFailed checks:");
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`  ✗ ${r.name}: ${r.detail}`);
  }
  process.exit(1);
} else {
  console.log("All checks passed!");
}