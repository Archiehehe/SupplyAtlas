import { createSignal, Show, For, createMemo } from "solid-js";
import { isDatabaseConfigured } from "../../lib/env";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { SectionCard } from "../../components/SectionCard";
import { StatusBadge } from "../../components/StatusBadge";
import { parseUploadedPortfolioCSV, type ParsedHolding } from "../../lib/portfolio/parseUploadedPortfolio";
import type { TickerExposure, ExposureMappingsResult } from "../../lib/portfolio/analyzeUploadedPortfolio";

interface ThemeSummary {
  themeSlug: string;
  themeName: string;
  marketValue: number;
  weight: number;
  tickerCount: number;
  relationshipCount: number;
  evidenceCount: number;
  tickers: string[];
}

interface SubthemeSummary {
  subtheme: string;
  themeSlug: string;
  themeName: string;
  marketValue: number;
  weight: number;
  tickerCount: number;
  evidenceCount: number;
  tickers: string[];
}

export default function PortfolioPage() {
  const [holdings, setHoldings] = createSignal<ParsedHolding[] | null>(null);
  const [csvErrors, setCsvErrors] = createSignal<string[]>([]);
  const [totalMarketValue, setTotalMarketValue] = createSignal(0);
  const [loading, setLoading] = createSignal(false);
  const [results, setResults] = createSignal<TickerExposure[] | null>(null);
  const [fetchError, setFetchError] = createSignal<string | null>(null);
  const [weightMode, setWeightMode] = createSignal<string>("");
  const [weightWarnings, setWeightWarnings] = createSignal<string[]>([]);
  let fileInputRef: HTMLInputElement | undefined;
  let fileName = "";

  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    fileName = file.name;
    setLoading(true);
    setFetchError(null);
    setResults(null);
    setWeightWarnings([]);

    const text = await file.text();
    const parsed = parseUploadedPortfolioCSV(text);
    setCsvErrors(parsed.errors);

    if (parsed.holdings.length === 0) {
      setLoading(false);
      return;
    }

    setHoldings(parsed.holdings);
    setTotalMarketValue(parsed.totalMarketValue);

    const mvValues = parsed.holdings.map((h) => h.marketValue);
    const allHaveMV = mvValues.every((v) => v > 0);
    const anyHaveMV = mvValues.some((v) => v > 0);
    const ww: string[] = [];

    if (allHaveMV) {
      setWeightMode("market-value");
    } else if (anyHaveMV) {
      setWeightMode("partial-market-value");
      const missing = parsed.holdings.filter((h) => h.marketValue <= 0).map((h) => h.ticker);
      ww.push(`${missing.length} holding(s) have no market_value (${missing.join(", ")}). Excluded from weighted allocation — treated as 0 weight.`);
    } else {
      setWeightMode("equal-weight");
      ww.push("No market_value column found in CSV — using equal-weight allocation across all tickers.");
    }
    setWeightWarnings(ww);

    try {
      const tickers = parsed.holdings.map((h) => h.ticker);
      const res = await fetch("/api/exposure-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tickers }),
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const data: ExposureMappingsResult = await res.json();
      setResults(data.exposures);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setFetchError(msg);
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
    setFetchError(null);
    setWeightMode("");
    setWeightWarnings([]);
    fileName = "";
    if (fileInputRef) fileInputRef.value = "";
  };

  const mappedCount = createMemo(() => results()?.filter((r) => r.company).length ?? 0);
  const unmappedCount = createMemo(() => results()?.filter((r) => !r.company).length ?? 0);

  const unmappedTickers = createMemo(() => {
    const exps = results();
    if (!exps) return [];
    return exps.filter((r) => !r.company).map((r) => r.ticker);
  });

  const themeSummary = createMemo((): ThemeSummary[] => {
    const exps = results();
    if (!exps || !holdings()) return [];
    const hMap = new Map(holdings()!.map((h) => [h.ticker, h]));
    const themeMap = new Map<string, ThemeSummary>();

    for (const exp of exps) {
      if (!exp.company) continue;
      const mv = weightMode() !== "equal-weight"
        ? (hMap.get(exp.ticker)?.marketValue ?? 0)
        : 1;

      for (const theme of exp.themes) {
        const existing = themeMap.get(theme.themeSlug);
        if (existing) {
          existing.marketValue += mv;
          existing.tickerCount++;
          if (!existing.tickers.includes(exp.ticker)) existing.tickers.push(exp.ticker);
          existing.relationshipCount += exp.edges.length;
          existing.evidenceCount += exp.evidence.length;
        } else {
          themeMap.set(theme.themeSlug, {
            themeSlug: theme.themeSlug,
            themeName: theme.themeName,
            marketValue: mv,
            weight: 0,
            tickerCount: 1,
            relationshipCount: exp.edges.length,
            evidenceCount: exp.evidence.length,
            tickers: [exp.ticker],
          });
        }
      }
    }

    const totalMv = totalMarketValue() > 0 ? totalMarketValue() : themeMap.size;
    return Array.from(themeMap.values())
      .map((t) => ({
        ...t,
        weight: totalMv > 0 ? (t.marketValue / totalMv) * 100 : 0,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);
  });

  const subthemeSummary = createMemo((): SubthemeSummary[] => {
    const exps = results();
    if (!exps || !holdings()) return [];
    const hMap = new Map(holdings()!.map((h) => [h.ticker, h]));
    const subMap = new Map<string, SubthemeSummary>();

    for (const exp of exps) {
      if (!exp.company) continue;
      const mv = weightMode() !== "equal-weight"
        ? (hMap.get(exp.ticker)?.marketValue ?? 0)
        : 1;

      for (const theme of exp.themes) {
        const subKey = `${theme.themeSlug}::${theme.exposureType}`;
        const existing = subMap.get(subKey);
        if (existing) {
          existing.marketValue += mv;
          existing.tickerCount++;
          if (!existing.tickers.includes(exp.ticker)) existing.tickers.push(exp.ticker);
          existing.evidenceCount += exp.evidence.length;
        } else {
          subMap.set(subKey, {
            subtheme: theme.exposureType,
            themeSlug: theme.themeSlug,
            themeName: theme.themeName,
            marketValue: mv,
            weight: 0,
            tickerCount: 1,
            evidenceCount: exp.evidence.length,
            tickers: [exp.ticker],
          });
        }
      }
    }

    const totalMv = totalMarketValue() > 0 ? totalMarketValue() : subMap.size;
    return Array.from(subMap.values())
      .map((s) => ({
        ...s,
        weight: totalMv > 0 ? (s.marketValue / totalMv) * 100 : 0,
      }))
      .sort((a, b) => b.marketValue - a.marketValue);
  });

  const mappedCompanies = createMemo(() => {
    const exps = results();
    if (!exps) return [];
    return exps.filter((r) => r.company);
  });

  const mappedWithEdges = createMemo(() => {
    const exps = results();
    if (!exps) return [];
    return exps.filter((r) => r.edges.length > 0);
  });

  const mappedWithEvidence = createMemo(() => {
    const exps = results();
    if (!exps) return [];
    return exps.filter((r) => r.evidence.length > 0);
  });

  if (!isDatabaseConfigured()) {
    return (
      <div>
        <PageHeader title="Portfolio Exposure Analysis" description="Upload a holdings CSV to map your portfolio to SupplyAtlas themes, subthemes, companies, relationships, and evidence." />
        <EmptyState title="Database is not configured" description="Set DATABASE_URL in your environment to connect SupplyAtlas." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Portfolio Exposure Analysis" description="Upload a holdings CSV to map your portfolio to SupplyAtlas themes, subthemes, companies, relationships, and evidence." />

      <Show when={!holdings()}>
        <div class="upload-section">
          <div class="card upload-card">
            <div class="upload-icon">&#128196;</div>
            <h3>Upload Holdings CSV</h3>
            <p class="text-secondary">Required column: <code>ticker</code>. Optional: <code>shares</code>, <code>market_value</code>, <code>cost_basis</code>, <code>average_cost</code>, <code>name</code>, <code>sector</code>.</p>
            <p class="text-secondary" style="margin-top: 4px;">Accepts <code>symbol</code>, <code>quantity</code>/<code>qty</code>, <code>value</code>/<code>current_value</code> as column aliases. Currency formats like <code>$1,234.56</code> supported.</p>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} class="upload-input" ref={fileInputRef} />
          </div>
          <p class="privacy-note">Your file is parsed for this session only. SupplyAtlas does not store uploaded portfolio files or holdings.</p>
        </div>
      </Show>

      <Show when={csvErrors().length > 0 && !loading()}>
        <div class="warnings-panel" style="margin-top: 16px;">
          <h3>Parse Warnings</h3>
          <ul><For each={csvErrors()}>{(err) => <li>{err}</li>}</For></ul>
        </div>
      </Show>

      <Show when={weightWarnings().length > 0 && !loading()}>
        <div class="warnings-panel" style="margin-top: 16px;">
          <h3>Weighting Mode: {weightMode()}</h3>
          <ul><For each={weightWarnings()}>{(w) => <li>{w}</li>}</For></ul>
        </div>
      </Show>

      <Show when={fetchError()}>
        <div class="warnings-panel" style="margin-top: 16px;">
          <h3>Analysis Error</h3>
          <ul><li>{fetchError()}</li></ul>
        </div>
      </Show>

      <Show when={loading()}>
        <div style="text-align: center; padding: 48px 24px;">
          <div class="skeleton skeleton-card" style="height: 60px; max-width: 400px; margin: 0 auto;"></div>
          <p class="text-secondary mt-2">Analyzing portfolio against SupplyAtlas graph...</p>
        </div>
      </Show>

      <Show when={holdings() && !loading() && results() && !fetchError()}>
        <div class="results-section">
          <div class="flex items-center justify-between" style="margin-bottom: 24px;">
            <div>
              <h3 class="text-lg font-semibold">Portfolio Analysis</h3>
              <p class="text-sm text-tertiary">
                {fileName} &middot; {holdings()!.length} holdings &middot;
                {mappedCount()} mapped &middot;
                {unmappedCount()} unmapped &middot;
                weighting: {weightMode()}
              </p>
            </div>
            <button onClick={reset} class="btn btn-sm">Upload different file</button>
          </div>

          <div class="portfolio-summary-cards">
            <div class="card summary-card">
              <div class="summary-value">{holdings()!.length}</div>
              <div class="summary-label">Holdings</div>
            </div>
            <div class="card summary-card">
              <div class="summary-value" style="color: var(--accent-green);">{mappedCount()}</div>
              <div class="summary-label">Mapped</div>
            </div>
            <div class="card summary-card">
              <div class="summary-value" style="color: var(--accent-yellow);">{unmappedCount()}</div>
              <div class="summary-label">Unmapped</div>
            </div>
            <div class="card summary-card">
              <div class="summary-value" style="font-size: 1.1rem;">{weightMode()}</div>
              <div class="summary-label">Weighting</div>
            </div>
            <div class="card summary-card">
              <div class="summary-value">${totalMarketValue().toLocaleString()}</div>
              <div class="summary-label">Total Market Value</div>
            </div>
            <div class="card summary-card">
              <div class="summary-value">{themeSummary().length}</div>
              <div class="summary-label">Themes</div>
            </div>
          </div>

          <Show when={holdings()!.length > 0}>
            <div style="margin-top: 24px;">
              <SectionCard title="Parsed Holdings Preview ({holdings()!.length} rows)">
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
                          <td>{h.shares > 0 ? h.shares : "\u2014"}</td>
                          <td>{h.marketValue > 0 ? `$${h.marketValue.toLocaleString()}` : "\u2014"}</td>
                          <td>{h.costBasis !== null ? `$${h.costBasis.toLocaleString()}` : "\u2014"}</td>
                          <td>{h.averageCost !== null ? `$${h.averageCost.toFixed(2)}` : "\u2014"}</td>
                        </tr>
                      )}</For>
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          </Show>

          <Show when={mappedCompanies().length > 0}>
            <div style="margin-top: 24px;">
              <SectionCard title="Company Mappings ({mappedCompanies().length})">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Ticker</th>
                        <th>Company</th>
                        <th>Sector</th>
                        <th>Themes</th>
                        <th>Subthemes</th>
                        <th>Relationships</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={mappedCompanies()}>{(exp) => (
                        <tr>
                          <td><span class="ticker-badge">{exp.ticker}</span></td>
                          <td><a href={`/companies/${exp.ticker}`} class="font-semibold">{exp.company!.name}</a></td>
                          <td class="text-tertiary">{exp.company!.sector ?? "\u2014"}</td>
                          <td>{exp.themes.length}</td>
                          <td>{new Set(exp.themes.map((t) => t.exposureType)).size}</td>
                          <td>{exp.edges.length}</td>
                        </tr>
                      )}</For>
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          </Show>

          <Show when={themeSummary().length > 0}>
            <div style="margin-top: 24px;">
              <SectionCard title="Theme Exposure Summary">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Theme</th>
                        <th>Weight</th>
                        <th>Market Value</th>
                        <th>Tickers</th>
                        <th>Relationships</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={themeSummary()}>{(t) => (
                        <tr>
                          <td><a href={`/themes/${t.themeSlug}`} class="font-semibold">{t.themeName}</a></td>
                          <td class="tabular-nums">{t.weight.toFixed(1)}%</td>
                          <td class="tabular-nums">{t.marketValue > 0 ? `$${t.marketValue.toLocaleString()}` : "\u2014"}</td>
                          <td>{t.tickerCount}</td>
                          <td>{t.relationshipCount}</td>
                          <td>{t.evidenceCount}</td>
                        </tr>
                      )}</For>
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            </div>
          </Show>

          <Show when={subthemeSummary().length > 0}>
            <div style="margin-top: 24px;">
              <SectionCard title="Subtheme Exposure Table">
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Subtheme</th>
                        <th>Parent Theme</th>
                        <th>Weight</th>
                        <th>Market Value</th>
                        <th>Tickers</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={subthemeSummary()}>{(s) => (
                        <tr>
                          <td><span class="font-semibold">{s.subtheme}</span></td>
                          <td><a href={`/themes/${s.themeSlug}`} class="text-accent">{s.themeName}</a></td>
                          <td class="tabular-nums">{s.weight.toFixed(1)}%</td>
                          <td class="tabular-nums">{s.marketValue > 0 ? `$${s.marketValue.toLocaleString()}` : "\u2014"}</td>
                          <td>{s.tickers.join(", ")}</td>
                          <td>{s.evidenceCount}</td>
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
              <SectionCard title="Relationship Context">
                <div class="space-y-3">
                  <For each={mappedWithEdges()}>{(exp) => (
                    <div>
                      <div class="text-sm font-semibold" style="color: var(--text-primary); margin-bottom: 8px;">
                        {exp.ticker} &mdash; {exp.company!.name} ({exp.edges.length} relationships)
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
              <SectionCard title="Evidence Context">
                <div class="space-y-3">
                  <For each={mappedWithEvidence()}>{(exp) => (
                    <div>
                      <div class="text-sm font-semibold" style="color: var(--text-primary); margin-bottom: 8px;">
                        {exp.ticker} &mdash; {exp.company!.name} ({exp.evidence.length} items)
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

          <Show when={unmappedTickers().length > 0}>
            <div class="warnings-panel" style="margin-top: 24px;">
              <h3>Unmapped Tickers ({unmappedTickers().length})</h3>
              <p class="text-xs text-secondary" style="margin-bottom: 8px;">
                These tickers were not found in the SupplyAtlas company database. Import company/theme coverage to map these tickers.
              </p>
              <div class="flex flex-wrap gap-2" style="margin-top: 8px;">
                <For each={unmappedTickers()}>{(t) => <span class="badge badge-yellow">{t}</span>}</For>
              </div>
            </div>
          </Show>

          <Show when={themeSummary().length === 0 && unmappedTickers().length === holdings()!.length}>
            <div style="margin-top: 24px;">
              <EmptyState
                title="No exposures found"
                description="None of the tickers in your portfolio were found in the SupplyAtlas company database. Import company/theme coverage to map these tickers."
              />
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
