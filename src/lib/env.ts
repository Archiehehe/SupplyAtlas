import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1),
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
export type RuntimeProviderEnv = z.infer<typeof runtimeProviderEnvSchema>;
export type IngestionEnv = z.infer<typeof ingestionEnvSchema>;
export type OptionalEnv = z.infer<typeof optionalEnvSchema>;

function validateEnvOrNull<T extends z.ZodTypeAny>(schema: T, env: Record<string, string | undefined>) {
  const result = schema.safeParse(env);
  if (!result.success) return null;
  return result.data;
}

function validateEnvOrThrow<T extends z.ZodTypeAny>(schema: T, env: Record<string, string | undefined>): T["_output"] {
  const result = schema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map(issue => issue.path.join("."));
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  return result.data;
}

export function getDatabaseEnv(): DatabaseEnv | null {
  return validateEnvOrNull(databaseEnvSchema, process.env);
}

export function getRuntimeProviderEnv(): RuntimeProviderEnv {
  return validateEnvOrThrow(runtimeProviderEnvSchema, process.env);
}

export function getIngestionEnv(): IngestionEnv {
  return validateEnvOrThrow(ingestionEnvSchema, process.env);
}

export function getOptionalEnv(): OptionalEnv | null {
  return validateEnvOrNull(optionalEnvSchema, process.env);
}

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}
