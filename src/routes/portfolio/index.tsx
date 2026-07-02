import { isDatabaseConfigured } from "../../lib/env";
import { PageHeader } from "../../components/PageHeader";
import { EmptyState } from "../../components/EmptyState";
import PortfolioUploadAnalyzer from "../../components/portfolio/PortfolioUploadAnalyzer";

export default function PortfolioPage() {
  if (!isDatabaseConfigured()) {
    return (
      <div>
        <PageHeader title="Portfolio Exposure Analysis" description="Upload a Seeking Alpha portfolio CSV to map your holdings." />
        <EmptyState title="Database is not configured" description="Set DATABASE_URL in your environment to connect SupplyAtlas." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Portfolio Exposure Analysis" description="Upload a Seeking Alpha portfolio CSV to map your holdings." />
      <PortfolioUploadAnalyzer />
    </div>
  );
}
