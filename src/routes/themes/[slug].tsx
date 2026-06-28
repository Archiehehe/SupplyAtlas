import { createAsync, query, useParams } from "@solidjs/router";
import { Suspense, For } from "solid-js";
import { isDatabaseConfigured } from "../../lib/env";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import { SectionCard } from "../../components/SectionCard";
import { SkeletonBlock } from "../../components/SkeletonBlock";
import { StatusBadge } from "../../components/StatusBadge";

const loadThemeDetail = query(async (slug: string) => {
  const { getThemeDetail } = await import("../../db/queries/themes");
  return getThemeDetail(slug);
}, "theme-detail");

function NodeCard(props: { node: any }) {
  return (
    <div class="card" style="padding: 12px 16px;">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-sm font-semibold" style="color: var(--text-primary);">{props.node.name}</div>
          <div class="text-xs text-tertiary">{props.node.slug}</div>
        </div>
        <StatusBadge status={props.node.type} />
      </div>
    </div>
  );
}

function EdgeRow(props: { edge: any }) {
  return (
    <div class="card" style="padding: 12px 16px;">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm">
          <span class="font-medium" style="color: var(--text-primary);">{props.edge.sourceNodeName}</span>
          <span class="text-tertiary">&rarr;</span>
          <span class="font-medium" style="color: var(--text-primary);">{props.edge.targetNodeName}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-tertiary">{props.edge.relationshipType}</span>
          <StatusBadge status={props.edge.reviewStatus} />
        </div>
      </div>
      {props.edge.explanation && <p class="text-xs text-secondary mt-1">{props.edge.explanation}</p>}
    </div>
  );
}

export default function ThemeDetail() {
  const params = useParams();
  const slug = () => params.slug as string | undefined;
  const detail = createAsync(async () => {
    const s = slug();
    if (!s) return null;
    return loadThemeDetail(s);
  });

  return (
    <div>
      <Suspense fallback={
        <div class="space-y-4">
          <SkeletonBlock type="heading" />
          <SkeletonBlock type="card" />
          <SkeletonBlock type="heading" />
          <SkeletonBlock lines={4} />
        </div>
      }>
        {!isDatabaseConfigured() ? (
          <EmptyState title="Database is not configured" description="Set DATABASE_URL in your environment." />
        ) : !detail() ? (
          <EmptyState title="Theme not found" description="No theme matches this slug." action={<a href="/themes" class="btn btn-sm">All themes</a>} />
        ) : (() => {
          const d = detail()!;
          return (
            <div>
              <PageHeader
                title={d.theme.name}
                description={d.theme.description || undefined}
                actions={<a href="/themes" class="btn btn-sm">&larr; All themes</a>}
              />

              <div class="meta-grid">
                <div class="card meta-card">
                  <div class="meta-label">Slug</div>
                  <div class="meta-value text-sm">{d.theme.slug}</div>
                </div>
                <div class="card meta-card">
                  <div class="meta-label">Type</div>
                  <div><StatusBadge status={d.theme.type} /></div>
                </div>
                <div class="card meta-card">
                  <div class="meta-label">Nodes</div>
                  <div class="meta-value">{d.nodes.length}</div>
                </div>
                <div class="card meta-card">
                  <div class="meta-label">Relationships</div>
                  <div class="meta-value">{d.edges.length}</div>
                </div>
              </div>

              <SectionCard title="Nodes">
                {d.nodes.length > 0 ? (
                  <div class="space-y-2">
                    <For each={d.nodes}>{(node) => <NodeCard node={node} />}</For>
                  </div>
                ) : (
                  <p class="text-sm text-secondary">No nodes found for this theme.</p>
                )}
              </SectionCard>

              <div class="mt-6">
                <SectionCard title="Relationships">
                  {d.edges.length > 0 ? (
                    <div class="space-y-2">
                      <For each={d.edges}>{(edge) => <EdgeRow edge={edge} />}</For>
                    </div>
                  ) : (
                    <p class="text-sm text-secondary">No relationships found for this theme.</p>
                  )}
                </SectionCard>
              </div>

              <div class="mt-6">
                <SectionCard title="Evidence">
                  {d.evidence.length > 0 ? (
                    <div class="space-y-3">
                      <For each={d.evidence}>{(ev) => (
                        <div class="card" style="padding: 12px 16px; background: var(--bg-secondary);">
                          {ev.quote && <p class="text-sm" style="color: var(--text-primary); font-style: italic; margin-bottom: 6px;">&ldquo;{ev.quote}&rdquo;</p>}
                          <div class="flex items-center gap-2 text-xs text-tertiary">
                            {ev.docTitle && <span>{ev.docTitle}</span>}
                            {ev.docSourceType && <StatusBadge status={ev.docSourceType} />}
                            {ev.extractionMethod && <span>via {ev.extractionMethod}</span>}
                          </div>
                        </div>
                      )}</For>
                    </div>
                  ) : (
                    <p class="text-sm text-secondary">No evidence attached yet.</p>
                  )}
                </SectionCard>
              </div>
            </div>
          );
        })()}
      </Suspense>
    </div>
  );
}
