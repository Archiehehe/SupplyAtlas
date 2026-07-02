import { createAsync, useParams, useSearchParams } from "@solidjs/router";
import { PageHeader } from "../../../components/PageHeader";
import { EmptyState } from "../../../components/EmptyState";
import { calculatePortfolioSubthemePnl } from "../../../lib/portfolio/calculateSubthemePnl";
import type { PortfolioPnlMode } from "../../../lib/portfolio/pnl";

function getValidMode(raw: string | string[] | undefined): PortfolioPnlMode {
  if (typeof raw !== "string") return "period";
  if (raw === "since_buy" || raw === "since-buy") return "since_buy";
  return "period";
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

export default function SubthemePnlPage() {
  const params = useParams<{ portfolioKey: string }>();
  const [searchParams] = useSearchParams();
  const portfolioKey = params.portfolioKey;
  const mode = getValidMode(searchParams.mode);
  const startParam = searchParams.start;
  const endParam = searchParams.end;
  const startDate = typeof startParam === "string" ? new Date(startParam) : null;
  const endDate = typeof endParam === "string" ? new Date(endParam) : null;

  const pnlData = createAsync(async () => {
    return calculatePortfolioSubthemePnl({
      portfolioKey,
      startDate,
      endDate,
      mode,
    });
  });

  return (
    <div>
      <PageHeader
        title={`Portfolio: ${portfolioKey}`}
        description={`Mode: ${mode === "period" ? "Period P&L" : "Since Buy P&L"}`}
      />

      <div class="portfolio-mode-selector">
        <a
          href={`/portfolio/${portfolioKey}/subtheme-pnl?mode=period${startDate ? `&start=${searchParams.start}` : ""}${endDate ? `&end=${searchParams.end}` : ""}`}
          class={`mode-btn ${mode === "period" ? "mode-btn-active" : ""}`}
        >
          Period P&L
        </a>
        <a
          href={`/portfolio/${portfolioKey}/subtheme-pnl?mode=since_buy${startDate ? `&start=${searchParams.start}` : ""}${endDate ? `&end=${searchParams.end}` : ""}`}
          class={`mode-btn ${mode === "since_buy" ? "mode-btn-active" : ""}`}
        >
          Since Buy P&L
        </a>
      </div>

      <div class="mode-info">
        {mode === "period"
          ? "Period P&L: Uses start/end market values and in-period flows. Default mode."
          : "Since Buy P&L: Uses cost basis, realized proceeds, and dividends since acquisition."}
      </div>

      {pnlData() ? (
        <div>
          {pnlData()!.warnings.length > 0 && (
            <div class="warnings-panel">
              <h3>Warnings</h3>
              <ul>
                {pnlData()!.warnings.map((w) => (
                  <li>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div class="pnl-summary-cards">
            <div class="card pnl-card">
              <div class="pnl-card-label">Period P&L</div>
              <div class={`pnl-card-value ${(pnlData()!.totalPortfolioPeriodPnl ?? 0) >= 0 ? "positive" : "negative"}`}>
                {formatCurrency(pnlData()!.totalPortfolioPeriodPnl)}
              </div>
            </div>
            <div class="card pnl-card">
              <div class="pnl-card-label">Since Buy P&L</div>
              <div class={`pnl-card-value ${(pnlData()!.totalPortfolioSinceBuyPnl ?? 0) >= 0 ? "positive" : "negative"}`}>
                {formatCurrency(pnlData()!.totalPortfolioSinceBuyPnl)}
              </div>
            </div>
            <div class="card pnl-card pnl-card-primary">
              <div class="pnl-card-label">Display P&L ({mode === "period" ? "Period" : "Since Buy"})</div>
              <div class={`pnl-card-value ${(pnlData()!.totalPortfolioDisplayPnl ?? 0) >= 0 ? "positive" : "negative"}`}>
                {formatCurrency(pnlData()!.totalPortfolioDisplayPnl)}
              </div>
            </div>
            <div class="card pnl-card">
              <div class="pnl-card-label">Return</div>
              <div class={`pnl-card-value ${(pnlData()!.totalPortfolioReturnPct ?? 0) >= 0 ? "positive" : "negative"}`}>
                {formatPct(pnlData()!.totalPortfolioReturnPct)}
              </div>
            </div>
            <div class="card pnl-card">
              <div class="pnl-card-label">P&L / Day</div>
              <div class={`pnl-card-value ${(pnlData()!.totalPortfolioPnlPerDay ?? 0) >= 0 ? "positive" : "negative"}`}>
                {formatCurrency(pnlData()!.totalPortfolioPnlPerDay)}
              </div>
            </div>
          </div>

          <div class="data-coverage-panel">
            <h3>Data Coverage</h3>
            <div class="coverage-grid">
              <div class="coverage-item">
                <span class="coverage-label">Positions</span>
                <span class="coverage-value">{pnlData()!.dataCoverageSummary.totalPositions}</span>
              </div>
              <div class="coverage-item">
                <span class="coverage-label">With Cost Basis</span>
                <span class="coverage-value">{pnlData()!.dataCoverageSummary.positionsWithCostBasis}</span>
              </div>
              <div class="coverage-item">
                <span class="coverage-label">With Transactions</span>
                <span class="coverage-value">{pnlData()!.dataCoverageSummary.positionsWithTransactions}</span>
              </div>
              <div class="coverage-item">
                <span class="coverage-label">With Dividends</span>
                <span class="coverage-value">{pnlData()!.dataCoverageSummary.positionsWithDividends}</span>
              </div>
            </div>
          </div>

          <h3>Subtheme Rankings</h3>
          <table class="subtheme-ranking-table">
            <thead>
              <tr>
                <th>Theme</th>
                <th>Display P&L</th>
                <th>Period P&L</th>
                <th>Since Buy P&L</th>
                <th>Return</th>
                <th>P&L/Day</th>
                <th>Positions</th>
              </tr>
            </thead>
            <tbody>
              {pnlData()!.rankedSubthemes.map((st) => (
                <tr>
                  <td>{st.themeName}</td>
                  <td class={st.displayPnl !== null && st.displayPnl >= 0 ? "positive" : "negative"}>
                    {formatCurrency(st.displayPnl)}
                  </td>
                  <td class={st.periodPnl >= 0 ? "positive" : "negative"}>
                    {formatCurrency(st.periodPnl)}
                  </td>
                  <td class={st.sinceBuyPnl !== null && st.sinceBuyPnl >= 0 ? "positive" : "negative"}>
                    {formatCurrency(st.sinceBuyPnl)}
                  </td>
                  <td class={st.returnPct !== null && st.returnPct >= 0 ? "positive" : "negative"}>
                    {formatPct(st.returnPct)}
                  </td>
                  <td>{formatCurrency(st.pnlPerDay)}</td>
                  <td>{st.positionCount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Position Contributions</h3>
          {pnlData()!.rankedSubthemes.map((st) => {
            const positions = pnlData()!.positionsBySubtheme[st.themeSlug] ?? [];
            return (
              <div class="position-group">
                <h4>{st.themeName}</h4>
                <table class="position-contribution-table">
                  <thead>
                    <tr>
                      <th>Ticker</th>
                      <th>Display P&L</th>
                      <th>Period P&L</th>
                      <th>Since Buy P&L</th>
                      <th>Return</th>
                      <th>MV</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => (
                      <tr>
                        <td><a href={`/companies/${p.ticker}`}>{p.ticker}</a></td>
                        <td class={p.displayPnl !== null && p.displayPnl >= 0 ? "positive" : "negative"}>
                          {formatCurrency(p.displayPnl)}
                        </td>
                        <td class={p.periodPnl >= 0 ? "positive" : "negative"}>
                          {formatCurrency(p.periodPnl)}
                        </td>
                        <td class={p.sinceBuyPnl !== null && p.sinceBuyPnl >= 0 ? "positive" : "negative"}>
                          {formatCurrency(p.sinceBuyPnl)}
                        </td>
                        <td class={p.returnPct !== null && p.returnPct >= 0 ? "positive" : "negative"}>
                          {formatPct(p.returnPct)}
                        </td>
                        <td>{formatCurrency(p.marketValue)}</td>
                        <td>{p.weight.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Loading..."
          description="Calculating portfolio P&L..."
        />
      )}
    </div>
  );
}