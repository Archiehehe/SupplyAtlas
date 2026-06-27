import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const FORM4API_PROVIDER: ApiProvider = "form4api";

const BASE_URL = "https://api.form4api.com";

export async function getForm4InsiderTrades(cik: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/insider-trades",
    queryParams: { cik, apiKey: env.FORM4_API_KEY },
  });
}
