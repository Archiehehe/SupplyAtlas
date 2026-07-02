import { createAsync, useSearchParams } from "@solidjs/router";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { calculatePortfolioSubthemePnl } from "../../lib/portfolio/calculateSubthemePnl";
import type { PortfolioPnlMode } from "../../lib/portfolio/pnl";

function getValidMode(raw: string | string[] | undefined): PortfolioPnlMode {
  if (typeof raw !== "string") return "period";
  if (raw === "since_buy" || raw === "since-buy") return "since_buy";
  return "period";
}

export default function PortfolioPage() {
  const [searchParams] = useSearchParams();
  const mode = getValidMode(searchParams.mode);

  const pnlData = createAsync(async () => {
    // For now, show a placeholder. The actual portfolio key would come from user input or URL.
    return null;
  });

  return (
    <div>
      <PageHeader
        title="Portfolio"
        description="Analyze portfolio P&L by investment theme."
      />
      <div class="portfolio-mode-selector">
        <a
          href="/portfolio?mode=period"
          class={`mode-btn ${mode === "period" ? "mode-btn-active" : ""}`}
        >
          Period P&L
        </a>
        <a
          href="/portfolio?mode=since_buy"
          class={`mode-btn ${mode === "since_buy" ? "mode-btn-active" : ""}`}
        >
          Since Buy P&L
        </a>
      </div>
      <div class="mode-info">
        {mode === "period"
          ? "Period P&L measures returns over a specific date range using start/end market values and in-period flows."
          : "Since Buy P&L measures lifetime returns from cost basis, realized proceeds, and dividends."}
      </div>
      <EmptyState
        title="Select a portfolio"
        description="Navigate to a specific portfolio using the portfolio key in the URL, e.g. /portfolio/archie-test-portfolio/subtheme-pnl"
      />
    </div>
  );
}