import { getRuntimeProviderEnv } from "../env";
import { fetchWithRetry } from "./fetcher";
import type { ApiProvider } from "../types";

export const SEC_EDGAR_PROVIDER: ApiProvider = "secEdgar";

const BASE_URL = "https://www.sec.gov";

export async function getEdgarFilings(cik: string) {
  const env = getRuntimeProviderEnv();
  return await fetchWithRetry({
    baseUrl: BASE_URL,
    endpoint: `/cgi-bin/browse-edgar`,
    queryParams: { CI: cik, owner: "exclude", action: "getcompany" },
    headers: {
      "User-Agent": env.SEC_USER_AGENT,
      "From": env.SEC_CONTACT_EMAIL,
    },
  });
}
