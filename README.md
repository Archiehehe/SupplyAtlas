# SupplyAtlas

A public read-only research database for mapping investment exposure across supply chains, companies, technologies, and markets.

## Stack

- SolidStart
- Netlify
- Neon Postgres
- Drizzle ORM
- TypeScript
- Zod

## Setup

```bash
npm install
cp .env.local.example .env.local
npm run check:env database
npm run dev
npm run build
```

Netlify deployment only needs `DATABASE_URL` in environment variables.

Data enters through ingestion scripts, imports, or direct database migration workflows.

## Important

Never commit `.env.local` or real secrets.
