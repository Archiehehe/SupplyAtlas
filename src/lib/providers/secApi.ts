import { getRuntimeProviderEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const SEC_API_PROVIDER: ApiProvider = "secApi";

const BASE_URL = "https://api.sec-api.io";

export async function getSecApiFilings(cik: string) {
  const env = getRuntimeProviderEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: "",
    queryParams: { token: env.SEC_API_KEY },
    method: "POST",
    body: {
      query: {
        term: { cik },
      },
    },
  });
}
