import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const TEST_THEME_SLUGS = ["portfolio-test-portfolio"];
const TEST_NODE_SLUGS = ["portfolio-test-portfolio"];
const TEST_PORTFOLIO_KEYS = ["archie-test-portfolio"];

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes("--execute");
  const url = process.env.DIRECT_DATABASE_URL;
  if (!url) { console.error("DIRECT_DATABASE_URL is required"); process.exit(1); }
  const sql = neon(url);

  if (isDryRun) console.log("=== DRY RUN — no changes will be made. Pass --execute to apply. ===\n");
  else console.log("=== EXECUTE mode — deleting test records... ===\n");

  let hasWork = false;

  // 1. edge_evidence for edges touching test nodes
  for (const slug of TEST_NODE_SLUGS) {
    const rows = await sql`select ee.id, ee.edge_id from edge_evidence ee where ee.edge_id in (select id from edges where source_node_id = (select id from nodes where slug = ${slug}))`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`edge_evidence (node=${slug}): ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE edge_evidence id=${r.id} edge_id=${r.edge_id}`);
      if (!isDryRun) await sql`delete from edge_evidence where edge_id in (select id from edges where source_node_id = (select id from nodes where slug = ${slug}))`;
    }
  }

  // 2. edges touching test nodes
  for (const slug of TEST_NODE_SLUGS) {
    const rows = await sql`select id, source_node_id, target_node_id, relationship_type from edges where source_node_id = (select id from nodes where slug = ${slug}) or target_node_id = (select id from nodes where slug = ${slug})`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`edges (node=${slug}): ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE edge id=${r.id} type=${r.relationship_type}`);
      if (!isDryRun) await sql`delete from edges where source_node_id = (select id from nodes where slug = ${slug}) or target_node_id = (select id from nodes where slug = ${slug})`;
    }
  }

  // 3. portfolio_theme_mappings for test portfolio
  for (const key of TEST_PORTFOLIO_KEYS) {
    const rows = await sql`select ptm.id, ptm.ticker, ptm.theme_slug from portfolio_theme_mappings ptm join portfolios p on ptm.portfolio_id = p.id where p.portfolio_key = ${key}`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`portfolio_theme_mappings (portfolio=${key}): ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE portfolio_theme_mapping id=${r.id} ticker=${r.ticker} theme_slug=${r.theme_slug}`);
      if (!isDryRun) await sql`delete from portfolio_theme_mappings where portfolio_id = (select id from portfolios where portfolio_key = ${key})`;
    }
  }

  // 4. portfolio_dividends
  for (const key of TEST_PORTFOLIO_KEYS) {
    const rows = await sql`select pd.id, pd.ticker, pd.amount from portfolio_dividends pd join portfolios p on pd.portfolio_id = p.id where p.portfolio_key = ${key}`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`portfolio_dividends (portfolio=${key}): ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE portfolio_dividend id=${r.id} ticker=${r.ticker} amount=${r.amount}`);
      if (!isDryRun) await sql`delete from portfolio_dividends where portfolio_id = (select id from portfolios where portfolio_key = ${key})`;
    }
  }

  // 5. portfolio_transactions
  for (const key of TEST_PORTFOLIO_KEYS) {
    const rows = await sql`select pt.id, pt.ticker, pt.transaction_type, pt.shares, pt.price from portfolio_transactions pt join portfolios p on pt.portfolio_id = p.id where p.portfolio_key = ${key}`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`portfolio_transactions (portfolio=${key}): ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE portfolio_transaction id=${r.id} ticker=${r.ticker} type=${r.transaction_type} shares=${r.shares} price=${r.price}`);
      if (!isDryRun) await sql`delete from portfolio_transactions where portfolio_id = (select id from portfolios where portfolio_key = ${key})`;
    }
  }

  // 6. portfolio_positions
  for (const key of TEST_PORTFOLIO_KEYS) {
    const rows = await sql`select pp.id, pp.ticker, pp.shares from portfolio_positions pp join portfolios p on pp.portfolio_id = p.id where p.portfolio_key = ${key}`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`portfolio_positions (portfolio=${key}): ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE portfolio_position id=${r.id} ticker=${r.ticker} shares=${r.shares}`);
      if (!isDryRun) await sql`delete from portfolio_positions where portfolio_id = (select id from portfolios where portfolio_key = ${key})`;
    }
  }

  // 7. portfolios
  for (const key of TEST_PORTFOLIO_KEYS) {
    const rows = await sql`select id, portfolio_key, name from portfolios where portfolio_key = ${key}`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`portfolios: ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE portfolio id=${r.id} key=${r.portfolio_key} name=${r.name}`);
      if (!isDryRun) await sql`delete from portfolios where portfolio_key = ${key}`;
    }
  }

  // 8. nodes with test slugs
  for (const slug of TEST_NODE_SLUGS) {
    const rows = await sql`select id, slug, name, type from nodes where slug = ${slug}`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`nodes: ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE node id=${r.id} slug=${r.slug} name=${r.name} type=${r.type}`);
      if (!isDryRun) await sql`delete from nodes where slug = ${slug}`;
    }
  }

  // 9. themes with test slugs
  for (const slug of TEST_THEME_SLUGS) {
    const rows = await sql`select id, slug, name, type from themes where slug = ${slug}`;
    if (rows.length > 0) {
      hasWork = true;
      console.log(`themes: ${rows.length} row(s)`);
      for (const r of rows) console.log(`  DELETE theme id=${r.id} slug=${r.slug} name=${r.name} type=${r.type}`);
      if (!isDryRun) await sql`delete from themes where slug = ${slug}`;
    }
  }

  console.log(`\n${isDryRun ? "DRY RUN complete. No changes made." : "Cleanup complete."} ${hasWork ? "" : "No test records found."}`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
