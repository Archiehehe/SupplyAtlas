import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const ALPHA_VANTAGE_PROVIDER: ApiProvider = "alphaVantage";

const BASE_URL = "https://www.alphavantage.co/query";

export async function getAlphaVantageTimeSeries(ticker: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "",
    queryParams: {
      function: "TIME_SERIES_DAILY",
      symbol: ticker,
      apikey: env.ALPHA_VANTAGE_API_KEY,
    },
  });
}
