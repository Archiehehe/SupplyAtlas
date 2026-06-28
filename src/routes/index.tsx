export default function Home() {
  return (
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-4">SupplyAtlas</h1>
      <p class="text-gray-600 mb-6">
        Map supply chains, companies, sources, ETFs, and portfolio exposure.
      </p>
      <div class="flex flex-wrap gap-4">
        <a href="/themes" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Browse Themes
        </a>
        <a href="/watchlist" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Watchlist
        </a>
        <a href="/admin" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Admin
        </a>
      </div>
    </div>
  );
}
