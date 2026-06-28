import { createAsync, query, useParams } from "@solidjs/router";
import { Suspense, For } from "solid-js";
import { isDatabaseConfigured } from "../../lib/env";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { SectionCard } from "../../components/SectionCard";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { StatusBadge } from "../../components/StatusBadge";

const loadCompany = query(async (ticker: string) => {
  const { getCompanyByTicker, getCompanyExposures } = await import("../../db/queries/companies");
  const company = await getCompanyByTicker(ticker.toUpperCase());
  if (!company) return null;
  const exposures = await getCompanyExposures(company.id);
  return { company, exposures };
}, "company-ticker");

export default function CompanyDetail() {
  const params = useParams();
  const ticker = () => params.ticker as string | undefined;
  const data = createAsync(async () => {
    const t = ticker();
    if (!t) return null;
    return loadCompany(t);
  });

  return (
    <div>
      <Suspense fallback={
        <div class="space-y-4">
          <SkeletonBlock type="heading" />
          <SkeletonBlock type="card" />
          <SkeletonBlock type="heading" />
          <SkeletonBlock lines={3} />
        </div>
      }>
        {!isDatabaseConfigured() ? (
          <EmptyState title="Database is not configured" description="Set DATABASE_URL in your environment." />
        ) : !data() ? (
          <EmptyState title="No company found for this ticker" description={`No company data matches ${ticker()?.toUpperCase()}.`} action={<a href="/" class="btn btn-sm">Back to home</a>} />
        ) : (() => {
          const d = data()!;
          const c = d.company;
          return (
            <div>
              <PageHeader
                title={c.name}
                eyebrow={ticker()?.toUpperCase()}
                description={c.description || undefined}
              />

              <div class="meta-grid">
                <div class="card meta-card">
                  <div class="meta-label">Sector</div>
                  <div class="meta-value text-sm">{c.sector || "\u2014"}</div>
                </div>
                <div class="card meta-card">
                  <div class="meta-label">Industry</div>
                  <div class="meta-value text-sm">{c.industry || "\u2014"}</div>
                </div>
                <div class="card meta-card">
                  <div class="meta-label">Headquarters</div>
                  <div class="meta-value text-sm">{c.headquarters || "\u2014"}</div>
                </div>
                <div class="card meta-card">
                  <div class="meta-label">Website</div>
                  <div class="meta-value text-sm">
                    {c.website ? <a href={c.website} target="_blank" rel="noopener noreferrer">{c.website}</a> : "\u2014"}
                  </div>
                </div>
              </div>

              <SectionCard title="Theme Exposure">
                {d.exposures.length > 0 ? (
                  <div class="space-y-2">
                    <For each={d.exposures}>{(exp) => (
                      <div class="card" style="padding: 12px 16px;">
                        <div class="flex items-center justify-between">
                          <div>
                            <a href={`/themes/${exp.themeSlug}`} class="text-sm font-medium">{exp.themeName}</a>
                            <span class="text-xs text-tertiary ml-2">{exp.exposureType}</span>
                          </div>
                          {exp.exposureScore && <StatusBadge status={String(parseFloat(exp.exposureScore) > 0.5 ? "high" : "moderate")} />}
                        </div>
                        {exp.description && <p class="text-xs text-secondary mt-1">{exp.description}</p>}
                      </div>
                    )}</For>
                  </div>
                ) : (
                  <p class="text-sm text-secondary">No theme exposures recorded for this company.</p>
                )}
              </SectionCard>
            </div>
          );
        })()}
      </Suspense>
    </div>
  );
}
