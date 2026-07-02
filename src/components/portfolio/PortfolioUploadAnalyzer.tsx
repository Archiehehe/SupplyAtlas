import { createSignal, Show, For, createMemo, onMount } from "solid-js";
import { SectionCard } from "../SectionCard";
import { StatusBadge } from "../StatusBadge";
import { EmptyState } from "../EmptyState";
import { parseUploadedPortfolioCSV, type ParseResult } from "../../lib/portfolio/parseUploadedPortfolio";
import {
  analyzeUploadedPortfolio,
  type PortfolioExposureAnalysis,
  type ExposureMappingsResult,
} from "../../lib/portfolio/analyzeUploadedPortfolio";

const STAGE_LABELS: Record<string, string> = {
  idle: "idle",
  reading: "reading",
  read: "read",
  parsing: "parsing",
  parsed: "parsed",
  matching: "matching",
  matched: "matched",
  "file-selected": "file-selected",
  error: "error",
};

interface Props {
  compact?: boolean;
}

export default function PortfolioUploadAnalyzer(props: Props) {
  const [changeCount, setChangeCount] = createSignal(0);
  const [selectedFileName, setSelectedFileName] = createSignal<string | null>(null);
  const [stage, setStage] = createSignal<string>("idle");
  const [parseResult, setParseResult] = createSignal<ParseResult | null>(null);
  const [analysisResult, setAnalysisResult] = createSignal<PortfolioExposureAnalysis | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  let fileInputRef: HTMLInputElement | undefined;

  onMount(() => {
    if (fileInputRef) {
      fileInputRef.addEventListener("change", handleFileEvent);
    }
  });

  const handleFileEvent = (event: Event) => {
    setChangeCount((n) => n + 1);
    handleFileChange(event);
  };

  async function handleFileChange(event: Event) {
    try {
      setError(null);
      setAnalysisResult(null);
      setParseResult(null);
      setStage("file-selected");

      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];

      if (!file) {
        setError("No file found from input event.");
        setStage("error");
        return;
      }

      setSelectedFileName(file.name);
      setStage("reading");

      const text = await file.text();

      setStage("read");

      const parsed = parseUploadedPortfolioCSV(text);
      setParseResult(parsed);
      setStage("parsed");

      if (parsed.errors.length > 0 && parsed.holdings.length === 0) {
        setError(parsed.errors.join("; "));
        setStage("error");
        return;
      }

      if (parsed.errors.length > 0) {
        setError(parsed.errors.join("; "));
      }

      const symbols = parsed.holdings.map((h) => h.symbol);

      if (symbols.length === 0) {
        setError("No valid holdings found.");
        setStage("error");
        return;
      }

      setStage("matching");

      const response = await fetch("/api/exposure-mappings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tickers: symbols }),
      });

      const contentType = response.headers.get("content-type") || "";

      if (!response.ok) {
        throw new Error(`Exposure matching failed with HTTP ${response.status}`);
      }

      if (!contentType.includes("application/json")) {
        throw new Error(`Exposure matching returned non-JSON: ${contentType}`);
      }

      const mapping: ExposureMappingsResult = await response.json();
      const analysis = analyzeUploadedPortfolio(parsed.holdings, parsed.totalCostBasis, mapping);
      setAnalysisResult(analysis);
      setStage("matched");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown upload error";
      setError(message);
      setStage("error");
    }
  }

  const reset = () => {
    setSelectedFileName(null);
    setStage("idle");
    setParseResult(null);
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef) fileInputRef.value = "";
  };

  const totalCostBasis = createMemo(() => parseResult()?.totalCostBasis ?? 0);
  const holdings = createMemo(() => parseResult()?.holdings ?? []);
  const lotCount = createMemo(() => parseResult()?.lots.length ?? 0);
  const warnings = createMemo(() => parseResult()?.warnings ?? []);

  const mappedCount = createMemo(() => analysisResult()?.matchedHoldings.length ?? 0);
  const unmappedCountParsed = createMemo(() => analysisResult()?.unmappedHoldings.length ?? 0);

  return (
    <div>
      <div class="diagnostic-panel">
        <div class="diagnostic-panel-header">Upload status</div>
        <div class="diagnostic-panel-body">
          <div class="diagnostic-row">
            <span class="diag-label">change count</span>
            <span class="diag-value">{changeCount()}</span>
          </div>
          <div class="diagnostic-row">
            <span class="diag-label">selected file</span>
            <span class="diag-value">{selectedFileName() ?? "none"}</span>
          </div>
          <div class="diagnostic-row">
            <span class="diag-label">stage</span>
            <span class="diag-value">{STAGE_LABELS[stage()] ?? stage()}</span>
          </div>
          <div class="diagnostic-row">
            <span class="diag-label">lots parsed</span>
            <span class="diag-value">{lotCount()}</span>
          </div>
          <div class="diagnostic-row">
            <span class="diag-label">holdings parsed</span>
            <span class="diag-value">{holdings().length}</span>
          </div>
          <div class="diagnostic-row">
            <span class="diag-label">analysis present</span>
            <span class="diag-value">{analysisResult() !== null ? "yes" : "no"}</span>
          </div>
          <div class="diagnostic-row">
            <span class="diag-label">error</span>
            <span class="diag-value diag-error">{error() ?? "none"}</span>
          </div>
        </div>
        <div class="diagnostic-actions">
          <button type="button" class="btn btn-sm" onClick={() => { setStage("clicked"); setChangeCount((n) => n + 1); }}>
            Test interactivity
          </button>
        </div>
      </div>

      <div class={`upload-section ${props.compact ? "upload-section-compact" : ""}`}>
        <div class="card upload-card">
          <div class="upload-icon">&#128196;</div>
          <h3>Upload Holdings CSV</h3>
          <p class="text-secondary">Required column headers: <code>symbol</code>, <code>quantity</code>, <code>cost</code>, <code>date</code> &mdash; the standard Seeking Alpha portfolio export format.</p>
          <p class="text-secondary" style="margin-top: 4px;">Legacy column names (<code>ticker</code>, <code>shares</code>, <code>market_value</code>) are also accepted.</p>
          <input type="file" accept=".csv,text/csv" class="upload-input" ref={fileInputRef} />
        </div>
        <p class="privacy-note">Your file is parsed in-browser for this session only. SupplyAtlas does not store uploaded portfolio files or holdings.</p>
      </div>

      <Show when={warnings().length > 0 && stage() !== "idle" && stage() !== "reading" && stage() !== "file-selected"}>
        <div class="warnings-panel" style="margin-top: 16px;">
          <h3>Parse Warnings</h3>
          <ul><For each={warnings()}>{(w) => <li>{w}</li>}</For></ul>
        </div>
      </Show>

      <Show when={error() !== null}>
        <div class="error-panel" style="margin-top: 16px;">
          <h3>Error</h3>
          <p>{error()}</p>
          <button onClick={reset} class="btn btn-sm" style="margin-top: 12px;">Try again</button>
        </div>
      </Show>

      <Show when={parseResult() !== null && stage() !== "error"}>
        <div class="portfolio-summary-cards" style="margin-top: 20px;">
          <div class="card summary-card">
            <div class="summary-value">{lotCount()}</div>
            <div class="summary-label">Lots</div>
          </div>
          <div class="card summary-card">
            <div class="summary-value">{holdings().length}</div>
            <div class="summary-label">Holdings</div>
          </div>
          <div class="card summary-card">
            <div class="summary-value">${totalCostBasis().toLocaleString()}</div>
            <div class="summary-label">Total Cost Basis</div>
          </div>
          <Show when={analysisResult() !== null}>
            <div class="card summary-card">
              <div class="summary-value" style="color: var(--accent-green);">{mappedCount()}</div>
              <div class="summary-label">Matched</div>
            </div>
            <div class="card summary-card">
              <div class="summary-value" style="color: var(--accent-yellow);">{unmappedCountParsed()}</div>
              <div class="summary-label">Unmapped</div>
            </div>
          </Show>
        </div>

        <Show when={holdings().length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title={`Parsed Holdings (${holdings().length} unique)`}>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Quantity</th>
                      <th>Total Cost Basis</th>
                      <th>Avg Cost</th>
                      <th>Lots</th>
                      <th>Date Range</th>
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={holdings()}>{(h) => (
                      <tr>
                        <td><span class="font-semibold" style="color: var(--text-primary);">{h.symbol}</span></td>
                        <td>{h.totalQuantity}</td>
                        <td>${h.totalCostBasis.toLocaleString()}</td>
                        <td>${h.averageCost.toFixed(2)}</td>
                        <td>{h.lotCount}</td>
                        <td class="text-tertiary">{h.firstBuyDate && h.lastBuyDate ? `${h.firstBuyDate} \u2013 ${h.lastBuyDate}` : "\u2014"}</td>
                        <td>{totalCostBasis() > 0 ? `${(h.totalCostBasis / totalCostBasis() * 100).toFixed(1)}%` : "\u2014"}</td>
                      </tr>
                    )}</For>
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </Show>
      </Show>

      <Show when={analysisResult() !== null && stage() !== "error"}>
        <div class="flex items-center justify-between" style="margin-top: 24px; margin-bottom: 8px;">
          <h3 class="text-lg font-semibold">Exposure Analysis</h3>
          <button onClick={reset} class="btn btn-sm">Upload different file</button>
        </div>

        <Show when={analysisResult()!.warnings.length > 0}>
          <div class="warnings-panel" style="margin-top: 8px; margin-bottom: 16px;">
            <ul><For each={analysisResult()!.warnings}>{(w) => <li>{w}</li>}</For></ul>
          </div>
        </Show>

        <Show when={analysisResult()!.companyMappings.length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title={`Company Mappings (${analysisResult()!.companyMappings.length})`}>
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
                      <th>Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={analysisResult()!.companyMappings}>{(exp) => (
                      <tr>
                        <td><span class="ticker-badge">{exp.ticker}</span></td>
                        <td><a href={`/companies/${exp.ticker}`} class="font-semibold">{exp.company!.name}</a></td>
                        <td class="text-tertiary">{exp.company!.sector ?? "\u2014"}</td>
                        <td>{exp.themes.length}</td>
                        <td>{new Set(exp.themes.map((t) => t.exposureType)).size}</td>
                        <td>{exp.edges.length}</td>
                        <td>{(() => { const w = analysisResult()!.matchedHoldings.find(m => m.symbol === exp.ticker)?.weight ?? 0; return w > 0 ? `${(w * 100).toFixed(1)}%` : "\u2014"; })()}</td>
                      </tr>
                    )}</For>
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </Show>

        <Show when={analysisResult()!.themeExposures.length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title="Theme Exposure Summary">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Theme</th>
                      <th>Weight</th>
                      <th>Allocation</th>
                      <th>Tickers</th>
                      <th>Relationships</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={analysisResult()!.themeExposures}>{(t) => (
                      <tr>
                        <td><a href={`/themes/${t.themeSlug}`} class="font-semibold">{t.themeName}</a></td>
                        <td class="tabular-nums">{t.weight.toFixed(1)}%</td>
                        <td class="tabular-nums">{t.weightedAllocation.toFixed(1)}%</td>
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

        <Show when={analysisResult()!.subthemeExposures.length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title="Subtheme Exposure Table">
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Subtheme</th>
                      <th>Parent Theme</th>
                      <th>Weight</th>
                      <th>Allocation</th>
                      <th>Tickers</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={analysisResult()!.subthemeExposures}>{(s) => (
                      <tr>
                        <td><span class="font-semibold">{s.subtheme}</span></td>
                        <td><a href={`/themes/${s.themeSlug}`} class="text-accent">{s.themeName}</a></td>
                        <td class="tabular-nums">{s.weight.toFixed(1)}%</td>
                        <td class="tabular-nums">{s.weightedAllocation.toFixed(1)}%</td>
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

        <Show when={analysisResult()!.relationshipContext.length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title="Relationship Context">
              <div class="space-y-3">
                <For each={analysisResult()!.relationshipContext}>{(exp) => (
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

        <Show when={analysisResult()!.evidenceContext.length > 0}>
          <div style="margin-top: 24px;">
            <SectionCard title="Evidence Context">
              <div class="space-y-3">
                <For each={analysisResult()!.evidenceContext}>{(exp) => (
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

        <Show when={analysisResult()!.unmappedHoldings.length > 0}>
          <div class="warnings-panel" style="margin-top: 24px;">
            <h3>Unmapped Tickers ({analysisResult()!.unmappedHoldings.length})</h3>
            <p class="text-xs text-secondary" style="margin-bottom: 8px;">
              These tickers were not found in the SupplyAtlas company database.
            </p>
            <div class="flex flex-wrap gap-2" style="margin-top: 8px;">
              <For each={analysisResult()!.unmappedHoldings}>{(u) => <span class="badge badge-yellow">{u.symbol}</span>}</For>
            </div>
          </div>
        </Show>

        <Show when={analysisResult()!.companyMappings.length === 0 && analysisResult()!.unmappedHoldings.length > 0}>
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
