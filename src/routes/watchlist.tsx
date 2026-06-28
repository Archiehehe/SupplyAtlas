import { createAsync, query } from "@solidjs/router";
import { Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { isDatabaseConfigured, isAuthConfigured } from "../lib/env";

const loadWatchlist = query(async () => {
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return { unauthenticated: true };

  const session = await getCurrentUser(event.request);
  if (!session) return { unauthenticated: true };

  const { getWatchlistItemsForUser } = await import("../db/queries/watchlist");
  const items = await getWatchlistItemsForUser(session.user.id);
  return { items };
}, "watchlist");

export default function Watchlist() {
  const data = createAsync(() => loadWatchlist());

  return (
    <div class="p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Watchlist</h1>
      <Suspense fallback={<p>Loading...</p>}>
        {!isAuthConfigured() ? (
          <p class="text-gray-600">
            Auth is not configured. Set BETTER_AUTH_SECRET, BETTER_AUTH_URL, GITHUB_CLIENT_ID, and
            GITHUB_CLIENT_SECRET in .env.local to enable authentication.
          </p>
        ) : !isDatabaseConfigured() ? (
          <p class="text-gray-600">
            Database is not configured. Add DATABASE_URL to continue.
          </p>
        ) : data()?.unauthenticated ? (
          <p class="text-gray-600">Please sign in to view your watchlist.</p>
        ) : data()?.items && data()!.items!.length > 0 ? (
          <ul class="space-y-2">
            {data()!.items!.map((item) => (
              <li class="text-gray-700">{item.companyId}</li>
            ))}
          </ul>
        ) : (
          <p class="text-gray-600">No watchlist items yet.</p>
        )}
      </Suspense>
    </div>
  );
}
