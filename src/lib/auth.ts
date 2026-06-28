import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client";
import { isAuthConfigured } from "./env";
import { users, sessions, accounts, verifications } from "../db/schema";

let auth: ReturnType<typeof betterAuth> | null = null;

if (isAuthConfigured()) {
  const db = getDb();
  if (db) {
    try {
      auth = betterAuth({
        database: drizzleAdapter(db, {
          provider: "pg",
          usePlural: true,
          schema: {
            users,
            sessions,
            accounts,
            verifications,
          },
        }),
        emailAndPassword: {
          enabled: true,
        },
        socialProviders: {
          github: {
            clientId: process.env.GITHUB_CLIENT_ID!,
            clientSecret: process.env.GITHUB_CLIENT_SECRET!,
          },
        },
        secret: process.env.BETTER_AUTH_SECRET!,
        baseURL: process.env.BETTER_AUTH_URL!,
        user: {
          additionalFields: {
            role: {
              type: "string",
              required: false,
              defaultValue: "user",
              input: false,
            },
          },
        },
      });
    } catch (error) {
      console.error("Auth initialization failed:", error instanceof Error ? error.message : "Unknown error");
    }
  } else {
    console.error("Auth initialization skipped: database not available");
  }
}

export { auth };

export async function getCurrentUser(request: Request) {
  if (!auth) return null;
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    return session;
  } catch {
    return null;
  }
}

export async function requireUser(request: Request) {
  const session = await getCurrentUser(request);
  if (!session) {
    throw new Response(null, {
      status: 401,
      statusText: "Unauthorized",
    });
  }
  return session;
}

export async function requireAdmin(request: Request) {
  const session = await requireUser(request);
  const user = session.user as { id: string; email: string; role?: string };
  if (user.role !== "admin") {
    throw new Response(null, {
      status: 403,
      statusText: "Forbidden",
    });
  }
  return session;
}
