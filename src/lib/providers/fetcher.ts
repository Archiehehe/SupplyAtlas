interface FetchOptions {
  baseUrl: string;
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  queryParams?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
}

interface FetchResult<T> {
  success: true;
  data: T;
  status: number;
}

interface FetchError {
  success: false;
  error: string;
  status?: number;
}

type FetchResponse<T> = FetchResult<T> | FetchError;

function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ["apiKey", "api_key", "key", "token", "secret", "access_token"];
    sensitiveParams.forEach(param => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, "[REDACTED]");
      }
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

export async function fetchWithRetry<T>(
  options: FetchOptions
): Promise<FetchResponse<T>> {
  const {
    baseUrl,
    endpoint,
    method = "GET",
    queryParams = {},
    headers = {},
    body,
    timeout = 30000,
    retries = 3,
  } = options;

  let lastError: FetchError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = new URL(endpoint, baseUrl);
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      console.log(`Fetching ${redactUrl(url.toString())} (attempt ${attempt + 1}/${retries + 1})`);

      const response = await fetch(url.toString(), {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      let data: T;
      try {
        data = JSON.parse(responseText) as T;
      } catch {
        data = responseText as unknown as T;
      }

      if (!response.ok) {
        lastError = {
          success: false,
          error: `HTTP error: ${response.status}`,
          status: response.status,
        };
        if (attempt < retries && response.status >= 500) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        return lastError;
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      lastError = {
        success: false,
        error: errorMessage,
      };
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }

  return lastError || { success: false, error: "Unknown error" };
}
