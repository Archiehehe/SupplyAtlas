import { A } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";

export default function App() {
  return (
    <div class="min-h-screen bg-gray-50">
      <nav class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <A href="/" class="text-xl font-bold text-blue-600">
                SupplyAtlas
              </A>
            </div>
            <div class="flex items-center space-x-4">
              <A href="/themes" class="text-gray-700 hover:text-blue-600">
                Themes
              </A>
              <A href="/watchlist" class="text-gray-700 hover:text-blue-600">
                Watchlist
              </A>
              <A href="/admin" class="text-gray-700 hover:text-blue-600">
                Admin
              </A>
            </div>
          </div>
        </div>
      </nav>
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div class="p-8">Loading...</div>}>
          <FileRoutes />
        </Suspense>
      </main>
    </div>
  );
}
