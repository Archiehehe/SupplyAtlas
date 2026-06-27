import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const FRED_PROVIDER: ApiProvider = "fred";

const BASE_URL = "https://api.stlouisfed.org/fred";

export async function getFredSeries(seriesId: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/series/observations",
    queryParams: { series_id: seriesId, api_key: env.FRED_API_KEY, file_type: "json" },
  });
}
