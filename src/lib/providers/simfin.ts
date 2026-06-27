import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const SIMFIN_PROVIDER: ApiProvider = "simfin";

const BASE_URL = "https://simfin.com/api/v2";

export async function getSimFinFinancials(ticker: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/companies/statements",
    queryParams: { "api-key": env.SIMFIN_API_KEY, ticker },
  });
}
