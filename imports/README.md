# SupplyAtlas Import Pipeline

SupplyAtlas is a public read-only research application. All data enters through
controlled import scripts — never through browser forms.

## How it works

1. Prepare CSV files in a batch directory under `imports/incoming/<batch-name>/`
2. Validate the batch: `npm run import:validate -- --batch <batch-name>`
3. Dry-run the import: `npm run import:data -- --batch <batch-name> --dry-run`
4. Run the import: `npm run import:data -- --batch <batch-name>`

## Batch directory structure

```
imports/incoming/<batch-name>/
  themes.csv
  companies.csv
  nodes.csv
  edges.csv
  source_documents.csv
  edge_evidence.csv
```

All files are optional. Only files present in the batch directory are processed.

## CSV template reference

| File | Required fields | Natural key |
|------|----------------|-------------|
| themes.csv | slug, name | slug |
| companies.csv | ticker, exchange, name | ticker + exchange |
| nodes.csv | theme_slug, node_slug, node_type, label | theme_slug + node_slug |
| edges.csv | theme_slug, source_node_slug, target_node_slug, relationship_type | theme + source + target + relationship |
| source_documents.csv | source_type | external_id (or url) |
| edge_evidence.csv | theme_slug, source_node_slug, target_node_slug, edge_relationship_type, source_document_external_id | edge + source document |

## Validation rules

- Slugs must be lowercase kebab-case
- Tickers are uppercased automatically
- Cross-file references are checked (e.g., node theme_slug must exist in themes or DB)
- Source and target nodes cannot be the same
- Confidence scores must be valid numeric ranges

## Environment

Runtime requires only `DATABASE_URL`.

Import scripts require `DIRECT_DATABASE_URL` (Neon direct connection for migrations).

## Warning

Never commit real import data to git. Batch data belongs in `imports/incoming/`,
which is gitignored. Only template files in `imports/templates/` are tracked.
