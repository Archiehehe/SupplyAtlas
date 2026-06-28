import { createAsync, query, A } from "@solidjs/router";
import { Suspense, For } from "solid-js";
import { isDatabaseConfigured } from "../../lib/env";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { StatusBadge } from "../../components/StatusBadge";

const loadThemes = query(async () => {
  const { getAllThemes } = await import("../../db/queries/themes");
  return getAllThemes();
}, "themes-all");

export default function Themes() {
  const themes = createAsync(() => loadThemes());

  return (
    <div>
      <PageHeader title="Themes" description="Research themes connecting companies, nodes, and evidence across the exposure graph." />
      <Suspense fallback={<div class="space-y-4"><SkeletonBlock type="card" /><SkeletonBlock type="card" /></div>}>
        {!isDatabaseConfigured() ? (
          <EmptyState
            title="Database is not configured"
            description="Set DATABASE_URL in your environment to connect SupplyAtlas."
          />
        ) : themes() && themes()!.length > 0 ? (
          <div class="theme-grid">
            <For each={themes()}>{(theme) => (
              <A href={`/themes/${theme.slug}`} class="card card-hoverable" style="display: block;">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="text-lg font-semibold" style="color: var(--text-primary);">{theme.name}</h3>
                  <StatusBadge status={theme.type} />
                </div>
                {theme.description && <p class="text-sm text-secondary">{theme.description}</p>}
              </A>
            )}</For>
          </div>
        ) : (
          <EmptyState
            title="No themes found"
            description="Import a real data batch to populate SupplyAtlas with themes."
            action={<a href="/" class="btn btn-sm">Back to home</a>}
          />
        )}
      </Suspense>
    </div>
  );
}
