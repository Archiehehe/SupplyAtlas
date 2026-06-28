import { createAsync, query } from "@solidjs/router";
import { Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { isDatabaseConfigured, isAuthConfigured } from "../lib/env";

const loadAdmin = query(async () => {
  const { getCurrentUser } = await import("../lib/auth");
  const event = getRequestEvent();
  if (!event) return { unauthenticated: true };

  const session = await getCurrentUser(event.request);
  if (!session) return { unauthenticated: true };

  const user = session.user as { id: string; email: string; role?: string };
  if (user.role !== "admin") return { notAdmin: true };

  const { getAllThemes } = await import("../db/queries/themes");
  const themes = await getAllThemes();
  return { themes };
}, "admin");

export default function Admin() {
  const data = createAsync(() => loadAdmin());

  return (
    <div class="p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-4">Admin</h1>
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
          <p class="text-gray-600">Please sign in with an authorized admin account.</p>
        ) : data()?.notAdmin ? (
          <p class="text-gray-600">You do not have admin access.</p>
        ) : (
          <div>
            <p class="text-gray-600">Admin records will appear after real data is created or ingested.</p>
          </div>
        )}
      </Suspense>
    </div>
  );
}
