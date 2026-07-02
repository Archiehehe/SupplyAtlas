# Portfolio P&L by Subtheme

## Purpose

SupplyAtlas portfolio analytics answer:

- Which themes and subthemes drive my portfolio returns?
- Which positions are responsible for the return?
- Is the return from price movement, dividends, realized gains, or holding-period velocity?
- Which exposures are helping or hurting?

## Routes

| Route | Description |
|-------|-------------|
| `/portfolio` | Portfolio overview and subtheme P&L selector |
| `/portfolio/[portfolioKey]/subtheme-pnl` | Subtheme-level P&L breakdown for one portfolio |

Query parameters:

| Param | Values | Description |
|-------|--------|-------------|
| `start` | `YYYY-MM-DD` | Start of analysis period (default: 90 days ago) |
| `end` | `YYYY-MM-DD` | End of analysis period (default: today) |
| `mode` | `period` or `since-buy` | P&L calculation mode |

Preferred URL format: `mode=since-buy`. Internal TypeScript normalizes to `since_buy`.

## P&L Formulas

### Period P&L (default)

```
Period P&L = Ending Market Value
           + Sell Proceeds During Period
           + Dividends During Period
           - Starting Market Value
           - Buy Cost During Period
```

- Buys before the selected period are represented by **starting market value**, not subtracted as buy cost during period.
- Period P&L measures return generated within the date range regardless of when positions were opened.

### Since Buy / Lifetime P&L

```
Since Buy P&L = Ending Market Value
              + All Realized Sell Proceeds
              + All Dividends
              - Total Cost Basis
```

- Measures total return from initial purchase to today.
- Requires complete cost basis data. Missing cost basis produces warnings, not fake values.
- Since-buy P&L is separate from period P&L. Do not mix these modes.

### Components

| Component | Period | Since Buy |
|-----------|--------|-----------|
| Price P&L | `endingMV - startingMV - buyCost + sellProceeds` | `endingMV + sellProceeds - totalCostBasis` |
| Dividend P&L | dividends received during period | all dividends ever received |
| Realized P&L | `sellProceeds - buyCost` (gross realized) | all realized sell proceeds |
| P&L/day | period P&L divided by days in range | since-buy P&L divided by days held |

## Data Requirements

The following tables must be populated via import batches:

| Table | Description |
|-------|-------------|
| `portfolios` | Portfolio definitions with a unique key |
| `portfolio_positions` | Current holdings with market value |
| `portfolio_transactions` | Buy/sell transactions with dates, prices, quantities |
| `portfolio_dividends` | Dividend payments with dates and amounts |
| `daily_prices` | Historical price data for return % and per-day calculations |
| `portfolio_theme_mappings` | Position-to-theme/subtheme mapping |
| `themes`, `nodes`, `edges`, `edge_evidence` | Theme graph data for exposure attribution |

## Import Workflow

```bash
# Validate a batch
npm run import:validate -- --batch <batch-name>

# Dry-run to see planned operations
npm run import:data -- --batch <batch-name> --dry-run

# Run the import
npm run import:data -- --batch <batch-name>
```

- Import batch files must stay gitignored.
- No personal identifiers, account numbers, or secrets in batch files.
- Import requires `DIRECT_DATABASE_URL` in `.env.local`.
- Runtime rendering only needs `DATABASE_URL`.

## CLI Tools

```bash
# Period P&L
npm run portfolio:pnl -- --portfolio <key> --start YYYY-MM-DD --end YYYY-MM-DD --mode period

# Since Buy P&L
npm run portfolio:pnl -- --portfolio <key> --start YYYY-MM-DD --end YYYY-MM-DD --mode since-buy

# Check P&L formulas (pure math, no DB)
npm run portfolio:pnl:check
```

## Safety

- SupplyAtlas is public, read-only, and accountless.
- No authentication, no admin, no watchlist.
- No provider API calls from UI components.
- No browser writes or browser forms.
- No fake fallback data for missing cost basis.
- No Vercel Cron Jobs or scheduled background jobs.
