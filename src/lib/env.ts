import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1),
});

const authEnvSchema = z.object({
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
});

const runtimeProviderEnvSchema = z.object({
  FMP_API_KEY: z.string().min(1),
  FINNHUB_API_KEY: z.string().min(1),
  TWELVE_DATA_API_KEY: z.string().min(1),
  OPENFIGI_API_KEY: z.string().min(1),
  SEC_API_KEY: z.string().min(1),
  SEC_USER_AGENT: z.string().min(1),
  SEC_CONTACT_EMAIL: z.string().email(),
});

const ingestionEnvSchema = z.object({
  FMP_API_KEY: z.string().min(1),
  FINNHUB_API_KEY: z.string().min(1),
  ALPHA_VANTAGE_API_KEY: z.string().min(1),
  TWELVE_DATA_API_KEY: z.string().min(1),
  FRED_API_KEY: z.string().min(1),
  SIMFIN_API_KEY: z.string().min(1),
  SEC_API_KEY: z.string().min(1),
  FORM4_API_KEY: z.string().min(1),
  SENTISENSE_API_KEY: z.string().min(1),
  SECURITIESDB_API_KEY: z.string().min(1),
  API_NINJAS_API_KEY: z.string().min(1),
  EARNINGS_API_KEY: z.string().min(1),
  OPENFIGI_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  SEC_USER_AGENT: z.string().min(1),
  SEC_CONTACT_EMAIL: z.string().email(),
});

const optionalEnvSchema = z.object({
  ETF_HOLDINGS_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export type AuthEnv = z.infer<typeof authEnvSchema>;
export type RuntimeProviderEnv = z.infer<typeof runtimeProviderEnvSchema>;
export type IngestionEnv = z.infer<typeof ingestionEnvSchema>;
export type OptionalEnv = z.infer<typeof optionalEnvSchema>;

function validateEnv<T extends z.ZodTypeAny>(schema: T, env: Record<string, string | undefined>) {
  const result = schema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map(issue => issue.path.join("."));
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  return result.data;
}

export function getDatabaseEnv(): DatabaseEnv {
  return validateEnv(databaseEnvSchema, process.env);
}

export function getAuthEnv(): AuthEnv {
  return validateEnv(authEnvSchema, process.env);
}

export function getRuntimeProviderEnv(): RuntimeProviderEnv {
  return validateEnv(runtimeProviderEnvSchema, process.env);
}

export function getIngestionEnv(): IngestionEnv {
  return validateEnv(ingestionEnvSchema, process.env);
}

export function getOptionalEnv(): OptionalEnv {
  return validateEnv(optionalEnvSchema, process.env);
}

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function isAuthConfigured(): boolean {
  return !!(
    process.env.BETTER_AUTH_SECRET &&
    process.env.BETTER_AUTH_URL &&
    process.env.GITHUB_CLIENT_ID &&
    process.env.GITHUB_CLIENT_SECRET
  );
}
