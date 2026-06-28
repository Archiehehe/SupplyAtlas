import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { isDatabaseConfigured } from "../lib/env";

let db: ReturnType<typeof drizzle<Record<string, unknown>>> | null = null;

if (isDatabaseConfigured()) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    db = drizzle(sql);
  } catch (error) {
    console.error("DB client initialization failed:", error instanceof Error ? error.message : "Unknown error");
  }
} else {
  console.error("DB client initialization skipped: DATABASE_URL not set");
}

export function getDb() {
  return db;
}
