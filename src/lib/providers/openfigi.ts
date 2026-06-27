import { getRuntimeProviderEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const OPENFIGI_PROVIDER: ApiProvider = "openfigi";

const BASE_URL = "https://api.openfigi.com/v3";

export async function getOpenFigiMapping(query: { ticker?: string; exchCode?: string }) {
  const env = getRuntimeProviderEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "/mapping",
    method: "POST",
    body: [query],
    headers: { "X-OPENFIGI-APIKEY": env.OPENFIGI_API_KEY },
  });
}
