# SupplyAtlas

## Product
A production investment exposure graph platform for mapping companies, supply chains, customers, suppliers, technologies, ETFs, countries, risks, catalysts, filings, transcripts, insider activity, and portfolio exposure.

## Locked Stack
- SolidStart
- Netlify
- Neon Postgres
- Drizzle ORM
- Better Auth
- Sigma.js / Cytoscape.js later
- GitHub Actions cron
- TypeScript
- Zod

## Setup
```bash
npm install
cp .env.local.example .env.local
npm run check:env
npm run dev
npm run build
```

## Important
Never commit `.env.local` or real secrets.
