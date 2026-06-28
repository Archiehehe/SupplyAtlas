import { isDatabaseConfigured } from "../lib/env";

export default function Home() {
  return (
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-4">SupplyAtlas</h1>
      <p class="text-gray-600 mb-6">
        A public research database for mapping investment exposure across supply chains, companies, technologies, and markets.
      </p>
      {!isDatabaseConfigured() ? (
        <p class="text-sm text-gray-500">Database is not configured.</p>
      ) : (
        <div class="flex flex-wrap gap-4">
          <a href="/themes" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Browse Themes
          </a>
        </div>
      )}
    </div>
  );
}
