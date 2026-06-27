import { getRuntimeProviderEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const FINNHUB_PROVIDER: ApiProvider = "finnhub";

const BASE_URL = "https://finnhub.io/api/v1";

export async function getFinnhubQuote(ticker: string) {
  const env = getRuntimeProviderEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/quote",
    queryParams: { symbol: ticker, token: env.FINNHUB_API_KEY },
  });
}
