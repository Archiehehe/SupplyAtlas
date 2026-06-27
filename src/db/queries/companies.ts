import { db } from "../client";
import { companies, companyIdentifiers } from "../schema";
import { eq, and } from "drizzle-orm";

export async function getCompanyByTicker(ticker: string) {
  const [identifier] = await db
    .select()
    .from(companyIdentifiers)
    .where(and(eq(companyIdentifiers.type, "ticker"), eq(companyIdentifiers.value, ticker)))
    .limit(1);
  if (!identifier) return null;
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, identifier.companyId))
    .limit(1);
  return company || null;
}

export async function getCompanyExposures(companyId: string) {
  // TODO: Implement after creating companyExposures query
  return [];
}
