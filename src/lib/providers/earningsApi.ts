import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const EARNINGS_API_PROVIDER: ApiProvider = "earningsApi";

const BASE_URL = "https://api.earningsapi.com";

export async function getEarningsApiTranscripts(ticker: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/transcripts",
    queryParams: { ticker, apiKey: env.EARNINGS_API_KEY },
  });
}
