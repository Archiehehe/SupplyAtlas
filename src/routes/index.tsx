import { createAsync, query } from "@solidjs/router";
import { Suspense } from "solid-js";
import { isDatabaseConfigured } from "../lib/env";
import { EmptyState } from "../components/EmptyState";

const loadStats = query(async () => {
  const { getDb } = await import("../db/client");
  const db = getDb();
  if (!db) return null;
  const { themes, companies, nodes, edges, sourceDocuments, edgeEvidence, portfolios } = await import("../db/schema");
  const { count, eq } = await import("drizzle-orm");
  const [themeCount] = await db.select({ count: count() }).from(themes).where(eq(themes.type, "thematic"));
  const [companyCount] = await db.select({ count: count() }).from(companies);
  const [nodeCount] = await db.select({ count: count() }).from(nodes);
  const [edgeCount] = await db.select({ count: count() }).from(edges);
  const [docCount] = await db.select({ count: count() }).from(sourceDocuments);
  const [evCount] = await db.select({ count: count() }).from(edgeEvidence);
  const [portfolioCount] = await db.select({ count: count() }).from(portfolios);
  return {
    themes: Number(themeCount.count),
    companies: Number(companyCount.count),
    nodes: Number(nodeCount.count),
    edges: Number(edgeCount.count),
    documents: Number(docCount.count),
    evidence: Number(evCount.count),
    portfolios: Number(portfolioCount.count),
  };
}, "home-stats");

export default function Home() {
  const stats = createAsync(() => loadStats());

  return (
    <div>
      <section class="hero">
        <h1>Map investment exposure across supply chains.</h1>
        <p>SupplyAtlas connects companies, themes, sources, and evidence into a database-backed research graph.</p>
        <div class="hero-actions">
          <a href="/themes" class="btn btn-primary btn-lg">Browse themes</a>
        </div>
      </section>

      {!isDatabaseConfigured() ? (
        <EmptyState
          title="Database is not configured"
          description="Set DATABASE_URL in your environment to connect SupplyAtlas to a Postgres database."
        />
      ) : (
        <Suspense fallback={<div class="p-8 skeleton skeleton-card" />}>
          {stats() ? (
            <div class="stats-grid">
              <div class="card stat-card">
                <div class="stat-value">{stats()!.themes}</div>
                <div class="stat-label">Themes</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value">{stats()!.companies}</div>
                <div class="stat-label">Companies</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value">{stats()!.nodes}</div>
                <div class="stat-label">Nodes</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value">{stats()!.edges}</div>
                <div class="stat-label">Relationships</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value">{stats()!.documents}</div>
                <div class="stat-label">Source Documents</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value">{stats()!.evidence}</div>
                <div class="stat-label">Evidence Items</div>
              </div>
              <div class="card stat-card">
                <div class="stat-value">{stats()!.portfolios}</div>
                <div class="stat-label">Portfolios</div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Could not load database stats"
              description="The database query returned no results."
            />
          )}
        </Suspense>
      )}

      <div class="workflow-grid">
        <div class="card workflow-card">
          <div class="workflow-card-icon">&#9733;</div>
          <div class="workflow-card-title">Themes</div>
          <div class="workflow-card-desc">Investment exposure themes connect companies, technologies, and markets through a shared research graph.</div>
        </div>
        <div class="card workflow-card">
          <div class="workflow-card-icon">&#9632;</div>
          <div class="workflow-card-title">Companies</div>
          <div class="workflow-card-desc">Company profiles store identifiers, sector data, and exposure relationships across themes.</div>
        </div>
        <div class="card workflow-card">
          <div class="workflow-card-icon">&#8596;</div>
          <div class="workflow-card-title">Relationships</div>
          <div class="workflow-card-desc">Directed edges map supply chain links, ownership, dependencies, and thematic exposure between nodes.</div>
        </div>
        <div class="card workflow-card">
          <div class="workflow-card-icon">&#10003;</div>
          <div class="workflow-card-title">Evidence</div>
          <div class="workflow-card-desc">Source documents and evidence quotes anchor every relationship to verifiable data.</div>
        </div>
      </div>
    </div>
  );
}
