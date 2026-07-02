# Portfolio Exposure Analysis

## Purpose

SupplyAtlas portfolio analysis maps uploaded holdings against the investment theme graph:

- Which themes do my holdings expose me to?
- What companies map to my tickers?
- What supply-chain relationships connect my holdings?
- What evidence supports those relationships?

Upload a CSV in-session. No data is stored.

## Route

| Route | Description |
|-------|-------------|
| `/portfolio` | Upload a holdings CSV and view mapped exposure analysis |

## Upload Format

Accepted columns:

| Column | Required | Description |
|--------|----------|-------------|
| `ticker` | Yes | Stock ticker symbol (case-insensitive) |
| `shares` | Yes | Number of shares held |
| `market_value` | No | Current market value of position |
| `cost_basis` | No | Total cost basis of position |
| `average_cost` | No | Average cost per share |
| `name` | No | Position name (ignored in analysis) |
| `sector` | No | Position sector (ignored in analysis) |

## Session-Only Processing

- CSV is parsed entirely in the browser.
- Only ticker symbols are sent to the server for DB exposure matching.
- No uploaded files or holdings are written to the database.
- No files are stored on disk or in any storage service.
- Refreshing the page clears all uploaded data.

## Architecture

```
Browser: parse CSV → extract tickers → send to server
Server:  look up companies by ticker → find theme exposures → find related edges/evidence → return mappings
Browser: compute theme weights → display results
```

## Database Tables Used (read-only)

| Table | Purpose |
|-------|---------|
| `company_identifiers` | Map uploaded ticker to company ID |
| `companies` | Company name, sector |
| `company_exposures` | Theme exposure scores per company |
| `themes` | Theme names and slugs |
| `nodes` | Graph nodes linked to companies |
| `edges` | Relationships between nodes |
| `edge_evidence` | Supporting evidence quotes for edges |
| `source_documents` | Document titles for evidence attribution |

## CLI Tools

```bash
# Check P&L formulas (pure math, no DB)
npm run portfolio:pnl:check
```

## Safety

- SupplyAtlas is public, read-only, and accountless.
- No authentication, no admin, no watchlist.
- No provider API calls from UI components.
- No browser writes or browser forms that persist to DB.
- No fake fallback data.
- No Vercel Cron Jobs or scheduled background jobs.
