import { getRuntimeProviderEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const FMP_PROVIDER: ApiProvider = "fmp";

const BASE_URL = "https://financialmodelingprep.com/api/v3";

export async function getFmpCompanyProfile(ticker: string) {
  const env = getRuntimeProviderEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/profile/" + ticker,
    queryParams: { apikey: env.FMP_API_KEY },
  });
}

export async function getFmpQuote(ticker: string) {
  const env = getRuntimeProviderEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/quote/" + ticker,
    queryParams: { apikey: env.FMP_API_KEY },
  });
}
