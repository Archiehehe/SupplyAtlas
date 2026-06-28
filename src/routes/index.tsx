import { isDatabaseConfigured } from "../lib/env";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";

const WORKFLOW_CARDS = [
  {
    icon: "\u2606",
    title: "Themes",
    desc: "Investment exposure themes connect companies, technologies, and markets through a shared research graph.",
  },
  {
    icon: "\u25A0",
    title: "Companies",
    desc: "Company profiles store identifiers, sector data, and exposure relationships across themes.",
  },
  {
    icon: "\u2194",
    title: "Relationships",
    desc: "Directed edges map supply chain links, ownership, dependencies, and thematic exposure between nodes.",
  },
  {
    icon: "\u2713",
    title: "Evidence",
    desc: "Source documents and evidence quotes anchor every relationship to verifiable data.",
  },
];

export default function Home() {
  return (
    <div>
      <section class="hero">
        <h1>Map investment exposure across supply chains.</h1>
        <p>SupplyAtlas connects companies, themes, sources, and evidence into a database-backed research graph.</p>
        <div class="hero-actions">
          <a href="/themes" class="btn btn-primary btn-lg">Browse themes</a>
        </div>
      </section>

      <div class="workflow-grid">
        {WORKFLOW_CARDS.map((card) => (
          <div class="card workflow-card">
            <div class="workflow-card-icon">{card.icon}</div>
            <div class="workflow-card-title">{card.title}</div>
            <div class="workflow-card-desc">{card.desc}</div>
          </div>
        ))}
      </div>

      {isDatabaseConfigured() ? null : (
        <EmptyState
          title="Database is not configured"
          description="Set DATABASE_URL in your environment to connect SupplyAtlas to a Postgres database."
        />
      )}
    </div>
  );
}
