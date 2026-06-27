import { db } from "../client";
import { watchlistItems } from "../schema";
import { eq, and } from "drizzle-orm";

export async function getWatchlistItemsForUser(userId: string) {
  return await db.select().from(watchlistItems).where(eq(watchlistItems.userId, userId));
}

export async function createWatchlistItem(userId: string, companyId: string, notes?: string) {
  const [item] = await db
    .insert(watchlistItems)
    .values({ userId, companyId, notes })
    .onConflictDoNothing()
    .returning();
  return item || null;
}
