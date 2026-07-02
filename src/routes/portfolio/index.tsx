import { createSignal, For, Show } from "solid-js";
import { isDatabaseConfigured } from "../../lib/env";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { SectionCard } from "../../components/SectionCard";
import { StatusBadge } from "../../components/StatusBadge";
import { parseUploadedPortfolioCSV, type ParsedHolding } from "../../lib/portfolio/parseUploadedPortfolio";
import { fetchExposureMappings, type TickerExposure } from "../../lib/portfolio/analyzeUploadedPortfolio";

export default function PortfolioPage() {
  const [holdings, setHoldings] = createSignal<ParsedHolding[] | null>(null);
  const [csvErrors, setCsvErrors] = createSignal<string[]>([]);
  const [totalMarketValue, setTotalMarketValue] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [results, setResults] = createSignal<TickerExposure[] | null>(null);

  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setLoading(true);

    const text = await file.text();
    const parsed = parseUploadedPortfolioCSV(text);
    setCsvErrors(parsed.errors);

    if (parsed.holdings.length === 0) {
      setLoading(false);
      return;
    }

    setHoldings(parsed.holdings);
    setTotalMarketValue(parsed.totalMarketValue);

    try {
      const tickers = parsed.holdings.map((h) => h.ticker);
      const result = await fetchExposureMappings(tickers);
      setResults(result.exposures);
    } catch (err) {
      setCsvErrors([...parsed.errors, `Analysis error: ${err instanceof Error ? err.message : "Unknown error"}`]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setHoldings(null);
    setCsvErrors([]);
    setTotalMarketValue(0);
    setResults(null);
    setLoading(false);
  };

  const themeSummary = () => {
    const exps = results();
    if (!exps) return [];
    const summary = new Map<string, { name: string; marketValue: number; score: number | null }>();
    const hMap = new Map(holdings()?.map((h) => [h.ticker, h]) ?? []);

    for (const exp of exps) {
      if (!exp.company) continue;
      const mv = hMap.get(exp.ticker)?.marketValue ?? 0;
      for (const theme of exp.themes) {
        const existing = summary.get(theme.themeSlug);
        if (existing) {
          existing.marketValue += mv;
        } else {
          summary.set(theme.themeSlug, { name: theme.themeName, marketValue: mv, score: theme.exposureScore });
        }
      }
    }

    const totalMv = totalMarketValue();
    return Array.from(summary.entries())
      .map(([slug, data]) => ({
        themeSlug: slug,
        themeName: data.name,
        marketValue: data.marketValue,
        weight: totalMv > 0 ? (data.marketValue / totalMv) * 100 : 0,
        exposureScore: data.score,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);
  };

  const unmappedTickers = () => {
    const exps = results();
    if (!exps) return [];
    return exps.filter((r) => !r.company).map((r) => r.ticker);
  };

  const mappedWithEdges = () => {
    const exps = results();
    if (!exps) return [];
    return exps.filter((r) => r.edges.length > 0);
  };

  const mappedWithEvidence = () => {
    const exps = results();
    if (!exps) return [];
    return exps.filter((r) => r.evidence.length > 0);
  };

  if (!isDatabaseConfigured()) {
    return (
      <div>
        <PageHeader title="Portfolio Exposure Analysis" description="Upload a holdings CSV to map your portfolio to SupplyAtlas themes and subthemes." />
        <EmptyState title="Database is not configured" description="Set DATABASE_URL in your environment to connect SupplyAtlas." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Portfolio Exposure Analysis" description="Upload a holdings CSV to map your portfolio to SupplyAtlas themes and subthemes." />

      <Show when={!holdings()}>
        <div class="upload-section">
          <div class="card upload-card">
            <div class="upload-icon">&#128196;</div>
            <h3>Upload Holdings CSV</h3>
            <p class="text-secondary">Accepted columns: ticker, shares, market_value, cost_basis, average_cost, name, sector</p>
            <input type="file" accept=".csv" onChange={handleFileUpload} class="upload-input" />
          </div>
          <p class="privacy-note">Your file is parsed for this session only. SupplyAtlas does not store uploaded portfolio files or holdings.</p>
        </div>
      </Show>

      <Show when={csvErrors().length > 0 && !loading()}>
        <div class="warnings-panel">
          <h3>Parse Warnings</h3>
          <ul>
            <For each={csvErrors()}>{(err) => <li>{err}</li>}</For>
          </ul>
        </div>
      </Show>

      <Show when={holdings()}>
        <div class="upload-section">
          <div class="flex items-center justify-between" style="margin-bottom: 16px;">
            <div>
              <h3 class="text-lg font-semibold">Uploaded Holdings</h3>
              <p class="text-sm text-tertiary">{holdings()!.length} rows &middot; Total market value: ${totalMarketValue().toLocaleString()}</p>
            </div>
            <button onClick={reset} class="btn btn-sm">Upload different file</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Shares</th>
                  <th>Market Value</th>
                  <th>Cost Basis</th>
                  <th>Avg Cost</th>
                </tr>
              </thead>
              <tbody>
                <For each={holdings()}>{(h) => (
                  <tr>
                    <td><span class="font-semibold" style="color: var(--text-primary);">{h.ticker}</span></td>
                    <td>{h.shares}</td>
                    <td>${h.marketValue.toLocaleString()}</td>
                    <td>{h.costBasis !== null ? `$${h.costBasis.toLocaleString()}` : "\u2014"}</td>
                    <td>{h.averageCost !== null ? `$${h.averageCost.toFixed(2)}` : "\u2014"}</td>
                  </tr>
                )}</For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Show when={loading()}>
        <div style="text-align: center; padding: 48px 24px;">
          <div class="skeleton skeleton-card" style="height: 60px; max-width: 400px; margin: 0 auto;"></div>
          <p class="text-secondary mt-2">Analyzing portfolio against SupplyAtlas graph...</p>
        </div>
      </Show>

      <Show when={results() && !loading()}>
        <Show when={unmappedTickers().length > 0}>
          <div class="warnings-panel" style="margin-top: 24px;">
            <h3>Unmapped Tickers ({unmappedTickers().length})</h3>
            <p class="text-xs text-secondary" style="margin-bottom: 8px;">
              These tickers were not found in the SupplyAtlas company database:
            </p>
            <ul>
              <For each={unmappedTickers()}>{(t) => <li>{t}</li>}</For>
            </ul>
          </div>
        </Show>

        <Show when={themeSummary().length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title="Theme Exposure">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Theme</th>
                      <th>Market Value</th>
                      <th>Weight</th>
                      <th>Exposure Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={themeSummary()}>{(t) => (
                      <tr>
                        <td><a href={`/themes/${t.themeSlug}`} class="font-semibold" style="color: var(--text-primary);">{t.themeName}</a></td>
                        <td>${t.marketValue.toLocaleString()}</td>
                        <td>{t.weight.toFixed(1)}%</td>
                        <td>{t.exposureScore !== null ? t.exposureScore : "\u2014"}</td>
                      </tr>
                    )}</For>
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </Show>

        <Show when={mappedWithEdges().length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title="Related Relationships">
              <div class="space-y-3">
                <For each={mappedWithEdges()}>{(exp) => (
                  <div>
                    <div class="text-sm font-semibold" style="color: var(--text-primary); margin-bottom: 8px;">
                      {exp.ticker}{exp.company ? ` \u2014 ${exp.company.name}` : ""}
                    </div>
                    <For each={exp.edges}>{(edge) => (
                      <div class="info-row">
                        <span class="info-label">{edge.relationshipType}</span>
                        <span class="info-value">{edge.sourceNodeName} &rarr; {edge.targetNodeName}</span>
                      </div>
                    )}</For>
                  </div>
                )}</For>
              </div>
            </SectionCard>
          </div>
        </Show>

        <Show when={mappedWithEvidence().length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title="Related Evidence">
              <div class="space-y-3">
                <For each={mappedWithEvidence()}>{(exp) => (
                  <div>
                    <div class="text-sm font-semibold" style="color: var(--text-primary); margin-bottom: 8px;">
                      {exp.ticker}{exp.company ? ` \u2014 ${exp.company.name}` : ""}
                    </div>
                    <For each={exp.evidence}>{(ev) => (
                      <div class="card" style="padding: 12px 16px; background: var(--bg-secondary); margin-bottom: 8px;">
                        {ev.quote && <p class="text-sm" style="color: var(--text-primary); font-style: italic; margin-bottom: 6px;">&ldquo;{ev.quote}&rdquo;</p>}
                        <div class="flex items-center gap-2 text-xs text-tertiary">
                          {ev.docTitle && <span>{ev.docTitle}</span>}
                          {ev.docSourceType && <StatusBadge status={ev.docSourceType} />}
                        </div>
                      </div>
                    )}</For>
                  </div>
                )}</For>
              </div>
            </SectionCard>
          </div>
        </Show>

        <Show when={themeSummary().length === 0 && unmappedTickers().length > 0 && mappedWithEdges().length === 0 && mappedWithEvidence().length === 0}>
          <div style="margin-top: 24px;">
            <EmptyState
              title="No exposures found"
              description="None of the tickers in your portfolio were found in the SupplyAtlas company database."
            />
          </div>
        </Show>
      </Show>
    </div>
  );
}
