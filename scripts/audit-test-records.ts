import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

const SUSPICIOUS_NAMES = ["portfolio-test-portfolio", "Portfolio Test Portfolio", "archie-test-portfolio"];
const SQL_LIKE_PATTERNS = ["%test%", "%demo%", "%mock%", "%sandbox%"];

async function main() {
  const url = process.env.DIRECT_DATABASE_URL;
  if (!url) { console.error("DIRECT_DATABASE_URL is required"); process.exit(1); }
  const sql = neon(url);
  const results: string[] = [];

  // themes
  for (const name of SUSPICIOUS_NAMES) {
    const rows = await sql`select id, slug, name, type from themes where slug = ${name} or name = ${name}`;
    for (const r of rows) results.push(`themes | id=${r.id} | slug=${r.slug} | name=${r.name} | type=${r.type} | exact match`);
  }
  for (const pat of SQL_LIKE_PATTERNS) {
    const rows = await sql(`select id, slug, name, type from themes where slug like $1 or name like $1`, [pat]);
    for (const r of rows) {
      if (!results.some(l => l.includes(r.id))) results.push(`themes | id=${r.id} | slug=${r.slug} | name=${r.name} | type=${r.type} | pattern ${pat}`);
    }
  }

  // nodes
  for (const name of SUSPICIOUS_NAMES) {
    const rows = await sql`select id, slug, name, type from nodes where slug = ${name} or name = ${name}`;
    for (const r of rows) results.push(`nodes | id=${r.id} | slug=${r.slug} | name=${r.name} | type=${r.type} | exact match`);
  }
  for (const pat of SQL_LIKE_PATTERNS) {
    const rows = await sql(`select id, slug, name, type from nodes where slug like $1 or name like $1`, [pat]);
    for (const r of rows) {
      if (!results.some(l => l.includes(r.id))) results.push(`nodes | id=${r.id} | slug=${r.slug} | name=${r.name} | type=${r.type} | pattern ${pat}`);
    }
  }

  // edges referencing suspicious nodes
  for (const name of SUSPICIOUS_NAMES) {
    const rows = await sql`select e.id, e.source_node_id, e.target_node_id, e.relationship_type from edges e where e.source_node_id = (select id from nodes where slug = ${name}) or e.target_node_id = (select id from nodes where slug = ${name})`;
    for (const r of rows) results.push(`edges | id=${r.id} | source=${r.source_node_id} | target=${r.target_node_id} | type=${r.relationship_type} | node=${name}`);
  }

  // edge_evidence for suspicious edges
  for (const name of SUSPICIOUS_NAMES) {
    const rows = await sql`select ee.id, ee.edge_id from edge_evidence ee where ee.edge_id in (select id from edges where source_node_id = (select id from nodes where slug = ${name}))`;
    for (const r of rows) results.push(`edge_evidence | id=${r.id} | edge_id=${r.edge_id} | node=${name}`);
  }

  // portfolios
  for (const name of SUSPICIOUS_NAMES) {
    const rows = await sql`select id, portfolio_key, name from portfolios where portfolio_key = ${name} or name = ${name}`;
    for (const r of rows) results.push(`portfolios | id=${r.id} | key=${r.portfolio_key} | name=${r.name} | exact match`);
  }

  // portfolio positions
  for (const name of ["archie-test-portfolio"]) {
    const rows = await sql`select pp.id, pp.ticker, pp.shares from portfolio_positions pp join portfolios p on pp.portfolio_id = p.id where p.portfolio_key = ${name}`;
    for (const r of rows) results.push(`portfolio_positions | id=${r.id} | ticker=${r.ticker} | shares=${r.shares} | portfolio=${name}`);
  }

  // portfolio dividends
  for (const name of ["archie-test-portfolio"]) {
    const rows = await sql`select pd.id, pd.ticker, pd.amount from portfolio_dividends pd join portfolios p on pd.portfolio_id = p.id where p.portfolio_key = ${name}`;
    for (const r of rows) results.push(`portfolio_dividends | id=${r.id} | ticker=${r.ticker} | amount=${r.amount} | portfolio=${name}`);
  }

  // portfolio transactions
  for (const name of ["archie-test-portfolio"]) {
    const rows = await sql`select pt.id, pt.ticker, pt.transaction_type, pt.shares, pt.price from portfolio_transactions pt join portfolios p on pt.portfolio_id = p.id where p.portfolio_key = ${name}`;
    for (const r of rows) results.push(`portfolio_transactions | id=${r.id} | ticker=${r.ticker} | type=${r.transaction_type} | shares=${r.shares} | price=${r.price} | portfolio=${name}`);
  }

  // portfolio theme mappings
  for (const name of ["archie-test-portfolio"]) {
    const rows = await sql`select ptm.id, ptm.ticker, ptm.theme_slug from portfolio_theme_mappings ptm join portfolios p on ptm.portfolio_id = p.id where p.portfolio_key = ${name}`;
    for (const r of rows) results.push(`portfolio_theme_mappings | id=${r.id} | ticker=${r.ticker} | theme_slug=${r.theme_slug} | portfolio=${name}`);
  }

  // daily_prices — only report those tied to a test portfolio or test theme via related data
  // Check if any daily_prices have a clear test origin marker (source column doesn't exist, so skip generic ticker-based checks)

  console.log("=== Suspicious Records Audit ===\n");
  if (results.length === 0) {
    console.log("No suspicious records found.");
  } else {
    console.log(`Found ${results.length} suspicious record(s):\n`);
    const grouped: Record<string, string[]> = {};
    for (const line of results) {
      const table = line.split(" | ")[0];
      if (!grouped[table]) grouped[table] = [];
      grouped[table].push(line);
    }
    for (const [table, lines] of Object.entries(grouped)) {
      console.log(`  ${table} (${lines.length}):`);
      for (const l of lines) console.log(`    ${l}`);
      console.log();
    }
  }

  console.log("Note: daily_prices skipped — no reliable test/source marker to distinguish test prices from real ones.");
}

main().catch(e => { console.error(e.message); process.exit(1); });
