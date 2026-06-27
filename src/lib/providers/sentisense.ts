import { getIngestionEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const SENTISENSE_PROVIDER: ApiProvider = "sentisense";

const BASE_URL = "https://api.sentisense.com";

export async function getSentiSenseSentiment(text: string) {
  const env = getIngestionEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/sentiment",
    method: "POST",
    body: { text },
    headers: { "x-api-key": env.SENTISENSE_API_KEY },
  });
}
