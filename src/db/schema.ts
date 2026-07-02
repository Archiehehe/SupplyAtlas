import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  numeric,
  boolean,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Auth tables
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true }),
  image: varchar("image", { length: 255 }),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  tokenType: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  idToken: text("id_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueProviderAccount: uniqueIndex("unique_provider_account").on(t.provider, t.providerAccountId),
}));

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueVerification: uniqueIndex("unique_verification").on(t.identifier, t.value),
}));

// Core graph tables
export const themes = pgTable("themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull().default("other"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxSlug: index("idx_themes_slug").on(t.slug),
}));

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sector: varchar("sector", { length: 255 }),
  industry: varchar("industry", { length: 255 }),
  website: varchar("website", { length: 255 }),
  headquarters: varchar("headquarters", { length: 255 }),
  foundedYear: integer("founded_year"),
  employeeCount: integer("employee_count"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companyIdentifiers = pgTable("company_identifiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull(),
  value: varchar("value", { length: 255 }).notNull(),
  primary: boolean("primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueIdentifier: uniqueIndex("unique_company_identifier").on(t.type, t.value),
  idxCompanyId: index("idx_company_identifiers_company_id").on(t.companyId),
  idxTicker: index("idx_company_identifiers_ticker").on(t.value),
  idxCik: index("idx_company_identifiers_cik").on(t.value),
  idxFigi: index("idx_company_identifiers_figi").on(t.value),
}));

export const nodes = pgTable("nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  themeId: uuid("theme_id")
    .notNull()
    .references(() => themes.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueNodeSlugTheme: uniqueIndex("unique_node_slug_theme").on(t.slug, t.themeId),
  idxThemeId: index("idx_nodes_theme_id").on(t.themeId),
  idxNodeId: index("idx_nodes_id").on(t.id),
}));

export const edges = pgTable("edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceNodeId: uuid("source_node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  targetNodeId: uuid("target_node_id")
    .notNull()
    .references(() => nodes.id, { onDelete: "cascade" }),
  relationshipType: varchar("relationship_type", { length: 255 }).notNull(),
  strength: integer("strength").notNull().default(5),
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }),
  explanation: text("explanation"),
  reviewStatus: varchar("review_status", { length: 50 }).notNull().default("pending_review"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxSourceNodeId: index("idx_edges_source_node_id").on(t.sourceNodeId),
  idxTargetNodeId: index("idx_edges_target_node_id").on(t.targetNodeId),
}));

export const edgeEvidence = pgTable("edge_evidence", {
  id: uuid("id").primaryKey().defaultRandom(),
  edgeId: uuid("edge_id")
    .notNull()
    .references(() => edges.id, { onDelete: "cascade" }),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  quote: text("quote"),
  sourceUrl: varchar("source_url", { length: 2048 }),
  extractionMethod: varchar("extraction_method", { length: 50 }).notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxEdgeId: index("idx_edge_evidence_edge_id").on(t.edgeId),
}));

export const candidateEdges = pgTable("candidate_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceLabel: varchar("source_label", { length: 255 }).notNull(),
  targetLabel: varchar("target_label", { length: 255 }).notNull(),
  relationshipType: varchar("relationship_type", { length: 255 }).notNull(),
  confidenceScore: numeric("confidence_score", { precision: 3, scale: 2 }).notNull(),
  evidenceQuote: text("evidence_quote"),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  extractionMethod: varchar("extraction_method", { length: 50 }).notNull().default("llm"),
  reviewStatus: varchar("review_status", { length: 50 }).notNull().default("pending_review"),
  reviewNotes: text("review_notes"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxReviewStatus: index("idx_candidate_edges_review_status").on(t.reviewStatus),
}));

// Source/evidence tables
export const apiProviders = pgTable("api_providers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  baseUrl: varchar("base_url", { length: 2048 }),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiFetchRuns = pgTable("api_fetch_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => apiProviders.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 2048 }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  success: boolean("success").notNull().default(false),
  errorMessage: text("error_message"),
  responseStatus: integer("response_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxProviderId: index("idx_api_fetch_runs_provider_id").on(t.providerId),
}));

export const rawApiPayloads = pgTable("raw_api_payloads", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: uuid("provider_id")
    .notNull()
    .references(() => apiProviders.id, { onDelete: "cascade" }),
  fetchRunId: uuid("fetch_run_id").references(() => apiFetchRuns.id, { onDelete: "set null" }),
  endpoint: varchar("endpoint", { length: 2048 }).notNull(),
  payload: jsonb("payload").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxFetchRunId: index("idx_raw_api_payloads_fetch_run_id").on(t.fetchRunId),
}));

export const sourceDocuments = pgTable("source_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  providerId: uuid("provider_id").references(() => apiProviders.id, { onDelete: "set null" }),
  externalId: varchar("external_id", { length: 255 }),
  title: varchar("title", { length: 2048 }),
  content: text("content"),
  url: varchar("url", { length: 2048 }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  rawPayloadId: uuid("raw_payload_id").references(() => rawApiPayloads.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxSourceType: index("idx_source_documents_source_type").on(t.sourceType),
}));

// Company intelligence tables
export const companyMetrics = pgTable("company_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  metricType: varchar("metric_type", { length: 255 }).notNull(),
  value: numeric("value", { precision: 20, scale: 10 }),
  valueString: varchar("value_string", { length: 255 }),
  currency: varchar("currency", { length: 10 }),
  period: varchar("period", { length: 50 }),
  periodEndDate: timestamp("period_end_date", { withTimezone: true }),
  source: varchar("source", { length: 255 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxCompanyId: index("idx_company_metrics_company_id").on(t.companyId),
  idxMetricType: index("idx_company_metrics_metric_type").on(t.metricType),
}));

export const companyFinancials = pgTable("company_financials", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  fiscalYear: integer("fiscal_year").notNull(),
  fiscalQuarter: integer("fiscal_quarter"),
  statementType: varchar("statement_type", { length: 50 }).notNull(),
  data: jsonb("data").notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxCompanyIdYear: index("idx_company_financials_company_year").on(t.companyId, t.fiscalYear),
}));

export const companyExposures = pgTable("company_exposures", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  themeId: uuid("theme_id")
    .notNull()
    .references(() => themes.id, { onDelete: "cascade" }),
  exposureType: varchar("exposure_type", { length: 255 }).notNull(),
  exposureScore: numeric("exposure_score", { precision: 5, scale: 2 }),
  description: text("description"),
  source: varchar("source", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxCompanyIdThemeId: index("idx_company_exposures_company_theme").on(t.companyId, t.themeId),
}));

export const insiderTransactions = pgTable("insider_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  insiderName: varchar("insider_name", { length: 255 }).notNull(),
  insiderTitle: varchar("insider_title", { length: 255 }),
  transactionType: varchar("transaction_type", { length: 50 }).notNull(),
  shares: integer("shares").notNull(),
  pricePerShare: numeric("price_per_share", { precision: 20, scale: 10 }),
  totalValue: numeric("total_value", { precision: 20, scale: 2 }),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  filedDate: timestamp("filed_date", { withTimezone: true }),
  source: varchar("source", { length: 255 }).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxCompanyId: index("idx_insider_transactions_company_id").on(t.companyId),
  idxTransactionDate: index("idx_insider_transactions_transaction_date").on(t.transactionDate),
}));

export const earningsEvents = pgTable("earnings_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  fiscalQuarter: integer("fiscal_quarter"),
  fiscalYear: integer("fiscal_year"),
  epsActual: numeric("eps_actual", { precision: 20, scale: 10 }),
  epsEstimate: numeric("eps_estimate", { precision: 20, scale: 10 }),
  revenueActual: numeric("revenue_actual", { precision: 20, scale: 2 }),
  revenueEstimate: numeric("revenue_estimate", { precision: 20, scale: 2 }),
  transcriptId: uuid("transcript_id").references(() => transcripts.id, { onDelete: "set null" }),
  source: varchar("source", { length: 255 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxCompanyId: index("idx_earnings_events_company_id").on(t.companyId),
}));

export const transcripts = pgTable("transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  title: varchar("title", { length: 2048 }),
  content: text("content"),
  sections: jsonb("sections"),
  source: varchar("source", { length: 255 }).notNull(),
  externalId: varchar("external_id", { length: 255 }),
  sourceDocumentId: uuid("source_document_id").references(() => sourceDocuments.id, { onDelete: "set null" }),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxCompanyId: index("idx_transcripts_company_id").on(t.companyId),
}));

export const etfHoldings = pgTable("etf_holdings", {
  id: uuid("id").primaryKey().defaultRandom(),
  etfId: uuid("etf_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }),
  shares: numeric("shares", { precision: 30, scale: 10 }),
  weight: numeric("weight", { precision: 10, scale: 5 }),
  marketValue: numeric("market_value", { precision: 30, scale: 2 }),
  asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull(),
  source: varchar("source", { length: 255 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxEtfId: index("idx_etf_holdings_etf_id").on(t.etfId),
  idxCompanyId: index("idx_etf_holdings_company_id").on(t.companyId),
}));

// Personal research/portfolio tables
export const portfolios = pgTable("portfolios", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  portfolioKey: varchar("portfolio_key", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxUserId: index("idx_portfolios_user_id").on(t.userId),
  idxPortfolioKey: uniqueIndex("idx_portfolios_portfolio_key").on(t.portfolioKey),
}));

export const portfolioPositions = pgTable("portfolio_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  shares: numeric("shares", { precision: 30, scale: 10 }).notNull(),
  averageCost: numeric("average_cost", { precision: 20, scale: 10 }),
  currentPrice: numeric("current_price", { precision: 20, scale: 10 }),
  marketValue: numeric("market_value", { precision: 30, scale: 2 }),
  asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxPortfolioId: index("idx_portfolio_positions_portfolio_id").on(t.portfolioId),
}));

export const portfolioTransactions = pgTable("portfolio_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  transactionType: varchar("transaction_type", { length: 20 }).notNull(), // buy, sell
  shares: numeric("shares", { precision: 30, scale: 10 }).notNull(),
  price: numeric("price", { precision: 20, scale: 10 }).notNull(),
  totalValue: numeric("total_value", { precision: 30, scale: 2 }).notNull(),
  transactionDate: timestamp("transaction_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxPortfolioId: index("idx_portfolio_transactions_portfolio_id").on(t.portfolioId),
  idxTransactionDate: index("idx_portfolio_transactions_date").on(t.transactionDate),
}));

export const portfolioDividends = pgTable("portfolio_dividends", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  amount: numeric("amount", { precision: 30, scale: 2 }).notNull(),
  exDate: timestamp("ex_date", { withTimezone: true }).notNull(),
  payDate: timestamp("pay_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxPortfolioId: index("idx_portfolio_dividends_portfolio_id").on(t.portfolioId),
  idxExDate: index("idx_portfolio_dividends_ex_date").on(t.exDate),
}));

export const dailyPrices = pgTable("daily_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  priceDate: timestamp("price_date", { withTimezone: true }).notNull(),
  closePrice: numeric("close_price", { precision: 20, scale: 10 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueTickerDate: uniqueIndex("idx_daily_prices_ticker_date").on(t.ticker, t.priceDate),
  idxTicker: index("idx_daily_prices_ticker").on(t.ticker),
  idxPriceDate: index("idx_daily_prices_date").on(t.priceDate),
}));

export const portfolioThemeMappings = pgTable("portfolio_theme_mappings", {
  id: uuid("id").primaryKey().defaultRandom(),
  portfolioId: uuid("portfolio_id")
    .notNull()
    .references(() => portfolios.id, { onDelete: "cascade" }),
  ticker: varchar("ticker", { length: 50 }).notNull(),
  themeSlug: varchar("theme_slug", { length: 255 }).notNull(),
  weight: numeric("weight", { precision: 10, scale: 5 }).notNull().default("1.0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxPortfolioId: index("idx_portfolio_theme_mappings_portfolio_id").on(t.portfolioId),
  idxTicker: index("idx_portfolio_theme_mappings_ticker").on(t.ticker),
}));

export const watchlistItems = pgTable("watchlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueUserCompany: uniqueIndex("unique_watchlist_user_company").on(t.userId, t.companyId),
  idxUserId: index("idx_watchlist_items_user_id").on(t.userId),
}));

export const researchNotes = pgTable("research_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
  themeId: uuid("theme_id").references(() => themes.id, { onDelete: "set null" }),
  title: varchar("title", { length: 2048 }).notNull(),
  content: text("content"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxUserId: index("idx_research_notes_user_id").on(t.userId),
  idxCompanyId: index("idx_research_notes_company_id").on(t.companyId),
}));

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: varchar("action", { length: 255 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  idxUserId: index("idx_audit_logs_user_id").on(t.userId),
  idxAction: index("idx_audit_logs_action").on(t.action),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  portfolios: many(portfolios),
  watchlistItems: many(watchlistItems),
  researchNotes: many(researchNotes),
  auditLogs: many(auditLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const themesRelations = relations(themes, ({ many }) => ({
  nodes: many(nodes),
  companyExposures: many(companyExposures),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  identifiers: many(companyIdentifiers),
  metrics: many(companyMetrics),
  financials: many(companyFinancials),
  exposures: many(companyExposures),
  insiderTransactions: many(insiderTransactions),
  earningsEvents: many(earningsEvents),
  transcripts: many(transcripts),
  nodes: many(nodes),
  etfHoldingsAsCompany: many(etfHoldings, { relationName: "etf_holdings_company" }),
  etfHoldingsAsEtf: many(etfHoldings, { relationName: "etf_holdings_etf" }),
  watchlistItems: many(watchlistItems),
  researchNotes: many(researchNotes),
}));

export const companyIdentifiersRelations = relations(companyIdentifiers, ({ one }) => ({
  company: one(companies, { fields: [companyIdentifiers.companyId], references: [companies.id] }),
}));

export const nodesRelations = relations(nodes, ({ one, many }) => ({
  theme: one(themes, { fields: [nodes.themeId], references: [themes.id] }),
  company: one(companies, { fields: [nodes.companyId], references: [companies.id] }),
  sourceEdges: many(edges, { relationName: "source_edge" }),
  targetEdges: many(edges, { relationName: "target_edge" }),
}));

export const edgesRelations = relations(edges, ({ one, many }) => ({
  sourceNode: one(nodes, { fields: [edges.sourceNodeId], references: [nodes.id], relationName: "source_edge" }),
  targetNode: one(nodes, { fields: [edges.targetNodeId], references: [nodes.id], relationName: "target_edge" }),
  evidence: many(edgeEvidence),
}));

export const edgeEvidenceRelations = relations(edgeEvidence, ({ one }) => ({
  edge: one(edges, { fields: [edgeEvidence.edgeId], references: [edges.id] }),
  sourceDocument: one(sourceDocuments, { fields: [edgeEvidence.sourceDocumentId], references: [sourceDocuments.id] }),
}));

export const candidateEdgesRelations = relations(candidateEdges, ({ one }) => ({
  sourceDocument: one(sourceDocuments, { fields: [candidateEdges.sourceDocumentId], references: [sourceDocuments.id] }),
  reviewedBy: one(users, { fields: [candidateEdges.reviewedBy], references: [users.id] }),
}));

export const apiProvidersRelations = relations(apiProviders, ({ many }) => ({
  fetchRuns: many(apiFetchRuns),
  rawPayloads: many(rawApiPayloads),
  sourceDocuments: many(sourceDocuments),
}));

export const apiFetchRunsRelations = relations(apiFetchRuns, ({ one, many }) => ({
  provider: one(apiProviders, { fields: [apiFetchRuns.providerId], references: [apiProviders.id] }),
  rawPayloads: many(rawApiPayloads),
}));

export const rawApiPayloadsRelations = relations(rawApiPayloads, ({ one, many }) => ({
  provider: one(apiProviders, { fields: [rawApiPayloads.providerId], references: [apiProviders.id] }),
  fetchRun: one(apiFetchRuns, { fields: [rawApiPayloads.fetchRunId], references: [apiFetchRuns.id] }),
  sourceDocuments: many(sourceDocuments),
}));

export const sourceDocumentsRelations = relations(sourceDocuments, ({ one, many }) => ({
  provider: one(apiProviders, { fields: [sourceDocuments.providerId], references: [apiProviders.id] }),
  rawPayload: one(rawApiPayloads, { fields: [sourceDocuments.rawPayloadId], references: [rawApiPayloads.id] }),
  edgeEvidence: many(edgeEvidence),
  candidateEdges: many(candidateEdges),
  financials: many(companyFinancials),
  insiderTransactions: many(insiderTransactions),
  transcripts: many(transcripts),
}));

export const companyMetricsRelations = relations(companyMetrics, ({ one }) => ({
  company: one(companies, { fields: [companyMetrics.companyId], references: [companies.id] }),
}));

export const companyFinancialsRelations = relations(companyFinancials, ({ one }) => ({
  company: one(companies, { fields: [companyFinancials.companyId], references: [companies.id] }),
  sourceDocument: one(sourceDocuments, { fields: [companyFinancials.sourceDocumentId], references: [sourceDocuments.id] }),
}));

export const companyExposuresRelations = relations(companyExposures, ({ one }) => ({
  company: one(companies, { fields: [companyExposures.companyId], references: [companies.id] }),
  theme: one(themes, { fields: [companyExposures.themeId], references: [themes.id] }),
}));

export const insiderTransactionsRelations = relations(insiderTransactions, ({ one }) => ({
  company: one(companies, { fields: [insiderTransactions.companyId], references: [companies.id] }),
  sourceDocument: one(sourceDocuments, { fields: [insiderTransactions.sourceDocumentId], references: [sourceDocuments.id] }),
}));

export const earningsEventsRelations = relations(earningsEvents, ({ one }) => ({
  company: one(companies, { fields: [earningsEvents.companyId], references: [companies.id] }),
  transcript: one(transcripts, { fields: [earningsEvents.transcriptId], references: [transcripts.id] }),
}));

export const transcriptsRelations = relations(transcripts, ({ one, many }) => ({
  company: one(companies, { fields: [transcripts.companyId], references: [companies.id] }),
  sourceDocument: one(sourceDocuments, { fields: [transcripts.sourceDocumentId], references: [sourceDocuments.id] }),
  earningsEvents: many(earningsEvents),
}));

export const etfHoldingsRelations = relations(etfHoldings, ({ one }) => ({
  etf: one(companies, { fields: [etfHoldings.etfId], references: [companies.id], relationName: "etf_holdings_etf" }),
  company: one(companies, { fields: [etfHoldings.companyId], references: [companies.id], relationName: "etf_holdings_company" }),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, { fields: [portfolios.userId], references: [users.id] }),
  positions: many(portfolioPositions),
}));

export const portfolioPositionsRelations = relations(portfolioPositions, ({ one }) => ({
  portfolio: one(portfolios, { fields: [portfolioPositions.portfolioId], references: [portfolios.id] }),
  company: one(companies, { fields: [portfolioPositions.companyId], references: [companies.id] }),
}));

export const watchlistItemsRelations = relations(watchlistItems, ({ one }) => ({
  user: one(users, { fields: [watchlistItems.userId], references: [users.id] }),
  company: one(companies, { fields: [watchlistItems.companyId], references: [companies.id] }),
}));

export const researchNotesRelations = relations(researchNotes, ({ one }) => ({
  user: one(users, { fields: [researchNotes.userId], references: [users.id] }),
  company: one(companies, { fields: [researchNotes.companyId], references: [companies.id] }),
  theme: one(themes, { fields: [researchNotes.themeId], references: [themes.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
