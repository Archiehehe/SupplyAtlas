import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const SECURITIES_DB_PROVIDER: ApiProvider = "securitiesDb";

const BASE_URL = "https://api.securitiesdb.com";

export async function getSecuritiesDbInsiderTrades(ticker: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/insider-trades",
    queryParams: { ticker, apiKey: env.SECURITIESDB_API_KEY },
  });
}
