import { getRuntimeProviderEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const TWELVE_DATA_PROVIDER: ApiProvider = "twelveData";

const BASE_URL = "https://api.twelvedata.com";

export async function getTwelveDataQuote(ticker: string) {
  const env = getRuntimeProviderEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/quote",
    queryParams: { symbol: ticker, apikey: env.TWELVE_DATA_API_KEY },
  });
}
