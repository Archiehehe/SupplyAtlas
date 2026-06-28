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

Data enters through controlled CSV import scripts — not browser forms.

## Import Pipeline

Create a batch directory with CSV files under `imports/incoming/<batch-name>/`:

```bash
# Validate the batch
npm run import:validate -- --batch <batch-name>

# Dry-run to see planned operations
npm run import:data -- --batch <batch-name> --dry-run

# Run the import
npm run import:data -- --batch <batch-name>
```

CSV templates are available in `imports/templates/`.

Import requires `DIRECT_DATABASE_URL` in `.env.local`.

## Important

- No user accounts. No authentication. No admin dashboard.
- The app is fully public and read-only.
- Never commit `.env.local` or real secrets.
- Never commit real import data — batch directories are gitignored.
