import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const API_NINJAS_PROVIDER: ApiProvider = "apiNinjas";

const BASE_URL = "https://api.api-ninjas.com/v1";

export async function getApiNinjasEarningsCalendar(ticker: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/earningscalendar",
    queryParams: { ticker },
    headers: { "X-Api-Key": env.API_NINJAS_API_KEY },
  });
}
