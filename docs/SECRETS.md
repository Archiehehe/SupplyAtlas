# Secrets Management for SupplyAtlas

## Critical Rules

1. **Never paste real API keys into AI chat**
2. **Rotate any exposed keys immediately**
3. `.env.local` is local only - never commit it
4. Vercel environment variables are for app runtime
5. GitHub Actions secrets are for ingestion, migrations, and cron jobs

## Connection Types

- **Neon pooled connection** should be used for runtime `DATABASE_URL`
- **Neon direct connection** should be used for migrations `DIRECT_DATABASE_URL`

## Provider-Specific Notes

### SEC EDGAR
- Does not require a key for direct EDGAR access
- Requires a real `SEC_USER_AGENT` and `SEC_CONTACT_EMAIL`

## Secret Placement Table

| Secret                | Local .env.local | Vercel  | GitHub Actions | Purpose                     |
|-----------------------|-------------------|---------|----------------|-----------------------------|
| DATABASE_URL          | yes               | yes     | yes            | Runtime DB connection       |
| DIRECT_DATABASE_URL   | yes               | no      | yes            | Drizzle migrations          |
| FMP_API_KEY           | yes               | yes     | yes            | Market/fundamental data     |
| FINNHUB_API_KEY       | yes               | yes     | yes            | Backup market/fundamental data |
| ALPHA_VANTAGE_API_KEY | yes               | optional| yes            | Historical prices/news backup |
| TWELVE_DATA_API_KEY   | yes               | yes     | yes            | Price/time-series backup    |
| FRED_API_KEY          | yes               | optional| yes            | Macro data                  |
| SIMFIN_API_KEY        | yes               | optional| yes            | Fundamentals backup         |
| SEC_API_KEY           | yes               | yes     | yes            | SecAPI filing extraction    |
| SEC_USER_AGENT        | yes               | yes     | yes            | Direct SEC request identity |
| SEC_CONTACT_EMAIL     | yes               | yes     | yes            | SEC contact identity        |
| FORM4_API_KEY         | yes               | optional| yes            | Insider transactions        |
| SENTISENSE_API_KEY    | yes               | optional| yes            | Sentiment/alternative data  |
| SECURITIESDB_API_KEY  | yes               | optional| yes            | Insider activity backup     |
| API_NINJAS_API_KEY    | yes               | optional| yes            | Earnings calendar backup    |
| EARNINGS_API_KEY      | yes               | optional| yes            | Earnings/transcript data    |
| OPENFIGI_API_KEY      | yes               | yes     | yes            | Identifier resolution       |
| OPENAI_API_KEY        | yes               | no      | yes            | Relationship extraction     |
| ETF_HOLDINGS_API_KEY  | optional          | optional| optional       | ETF holdings fallback       |
| SENTRY_DSN            | optional          | optional| optional       | Error monitoring            |
| RESEND_API_KEY        | optional          | optional| optional       | Transactional email         |
