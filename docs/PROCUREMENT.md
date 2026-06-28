# Secret Procurement Checklist

| Provider               | What account/key to create                          | Env var                | Where it belongs          | Status | Rotation date | Notes                                  |
|------------------------|-----------------------------------------------------|------------------------|---------------------------|--------|---------------|----------------------------------------|
| Neon                   | Create Neon Postgres project                       | DATABASE_URL           | .env.local, Netlify, GH  |        |               | Pooled connection for runtime          |
| Neon                   | Get direct connection URL                           | DIRECT_DATABASE_URL    | .env.local, GH            |        |               | Direct connection for migrations       |
| Better Auth secret     | Generate strong random string                       | BETTER_AUTH_SECRET     | .env.local, Netlify       |        |               | Use secure random generator            |
| GitHub OAuth          | Create GitHub OAuth App                       | GITHUB_CLIENT_ID       | .env.local, Netlify       |        |               | Set callback URL to /api/auth/callback/github |
| GitHub OAuth          | Create GitHub OAuth App                       | GITHUB_CLIENT_SECRET   | .env.local, Netlify       |        |               | Set callback URL to /api/auth/callback/github |
| FMP                    | Create Financial Modeling Prep account              | FMP_API_KEY            | .env.local, Netlify, GH   |        |               |                                        |
| Finnhub                | Create Finnhub account                              | FINNHUB_API_KEY        | .env.local, Netlify, GH   |        |               |                                        |
| Alpha Vantage          | Create Alpha Vantage account                        | ALPHA_VANTAGE_API_KEY  | .env.local, GH            |        |               |                                        |
| Twelve Data            | Create Twelve Data account                          | TWELVE_DATA_API_KEY    | .env.local, Netlify, GH   |        |               |                                        |
| FRED                   | Create FRED API key                                 | FRED_API_KEY           | .env.local, GH            |        |               |                                        |
| SimFin                 | Create SimFin account                               | SIMFIN_API_KEY         | .env.local, GH            |        |               |                                        |
| SecAPI.io              | Create SecAPI.io account                            | SEC_API_KEY            | .env.local, Netlify, GH   |        |               |                                        |
| Direct SEC EDGAR       | Determine user agent string and contact email       | SEC_USER_AGENT         | .env.local, Netlify, GH   |        |               | Format: CompanyName AppName/1.0        |
| Direct SEC EDGAR       | Determine user agent string and contact email       | SEC_CONTACT_EMAIL      | .env.local, Netlify, GH   |        |               | Your valid email address               |
| Form4Api               | Create Form4Api account                             | FORM4_API_KEY          | .env.local, GH            |        |               |                                        |
| SentiSense             | Create SentiSense account                           | SENTISENSE_API_KEY     | .env.local, GH            |        |               |                                        |
| SecuritiesDB           | Create SecuritiesDB account                         | SECURITIESDB_API_KEY   | .env.local, GH            |        |               |                                        |
| API Ninjas             | Create API Ninjas account                           | API_NINJAS_API_KEY     | .env.local, GH            |        |               |                                        |
| EarningsAPI            | Create EarningsAPI account                          | EARNINGS_API_KEY       | .env.local, GH            |        |               |                                        |
| OpenFIGI               | Create OpenFIGI API key                             | OPENFIGI_API_KEY       | .env.local, Netlify, GH   |        |               |                                        |
| OpenAI                 | Create OpenAI API key                               | OPENAI_API_KEY         | .env.local, GH            |        |               | For relationship extraction            |
| ETF holdings fallback  | Create ETF holdings provider account (if needed)    | ETF_HOLDINGS_API_KEY   | optional                  |        |               |                                        |
| Sentry                 | Create Sentry project                               | SENTRY_DSN             | optional                  |        |               |                                        |
| Resend                 | Create Resend account                               | RESEND_API_KEY         | optional                  |        |               |                                        |
