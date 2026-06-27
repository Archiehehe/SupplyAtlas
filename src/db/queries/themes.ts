import { db } from "../client";
import { themes } from "../schema";
import { eq } from "drizzle-orm";

export async function getAllThemes() {
  return await db.select().from(themes).orderBy(themes.name);
}

export async function getThemeBySlug(slug: string) {
  const [theme] = await db.select().from(themes).where(eq(themes.slug, slug)).limit(1);
  return theme || null;
}
