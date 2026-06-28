CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(255) NOT NULL,
	"provider" varchar(255) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" timestamp with time zone,
	"token_type" varchar(255),
	"scope" varchar(255),
	"id_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_fetch_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"endpoint" varchar(2048) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"success" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"response_status" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"base_url" varchar(2048),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(255) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_label" varchar(255) NOT NULL,
	"target_label" varchar(255) NOT NULL,
	"relationship_type" varchar(255) NOT NULL,
	"confidence_score" numeric(3, 2) NOT NULL,
	"evidence_quote" text,
	"source_document_id" uuid,
	"extraction_method" varchar(50) DEFAULT 'llm' NOT NULL,
	"review_status" varchar(50) DEFAULT 'pending_review' NOT NULL,
	"review_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sector" varchar(255),
	"industry" varchar(255),
	"website" varchar(255),
	"headquarters" varchar(255),
	"founded_year" integer,
	"employee_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_exposures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"theme_id" uuid NOT NULL,
	"exposure_type" varchar(255) NOT NULL,
	"exposure_score" numeric(5, 2),
	"description" text,
	"source" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_financials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"fiscal_year" integer NOT NULL,
	"fiscal_quarter" integer,
	"statement_type" varchar(50) NOT NULL,
	"data" jsonb NOT NULL,
	"source" varchar(255) NOT NULL,
	"source_document_id" uuid,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_identifiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"value" varchar(255) NOT NULL,
	"primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"metric_type" varchar(255) NOT NULL,
	"value" numeric(20, 10),
	"value_string" varchar(255),
	"currency" varchar(10),
	"period" varchar(50),
	"period_end_date" timestamp with time zone,
	"source" varchar(255) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "earnings_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"fiscal_quarter" integer,
	"fiscal_year" integer,
	"eps_actual" numeric(20, 10),
	"eps_estimate" numeric(20, 10),
	"revenue_actual" numeric(20, 2),
	"revenue_estimate" numeric(20, 2),
	"transcript_id" uuid,
	"source" varchar(255) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edge_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"edge_id" uuid NOT NULL,
	"source_document_id" uuid,
	"quote" text,
	"source_url" varchar(2048),
	"extraction_method" varchar(50) DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_node_id" uuid NOT NULL,
	"target_node_id" uuid NOT NULL,
	"relationship_type" varchar(255) NOT NULL,
	"strength" integer DEFAULT 5 NOT NULL,
	"confidence_score" numeric(3, 2),
	"explanation" text,
	"review_status" varchar(50) DEFAULT 'pending_review' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "etf_holdings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"etf_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"ticker" varchar(50) NOT NULL,
	"name" varchar(255),
	"shares" numeric(30, 10),
	"weight" numeric(10, 5),
	"market_value" numeric(30, 2),
	"as_of_date" timestamp with time zone NOT NULL,
	"source" varchar(255) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insider_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"insider_name" varchar(255) NOT NULL,
	"insider_title" varchar(255),
	"transaction_type" varchar(50) NOT NULL,
	"shares" integer NOT NULL,
	"price_per_share" numeric(20, 10),
	"total_value" numeric(20, 2),
	"transaction_date" timestamp with time zone NOT NULL,
	"filed_date" timestamp with time zone,
	"source" varchar(255) NOT NULL,
	"external_id" varchar(255),
	"source_document_id" uuid,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" uuid NOT NULL,
	"company_id" uuid,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"company_id" uuid,
	"ticker" varchar(50) NOT NULL,
	"shares" numeric(30, 10) NOT NULL,
	"average_cost" numeric(20, 10),
	"current_price" numeric(20, 10),
	"market_value" numeric(30, 2),
	"as_of_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raw_api_payloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"fetch_run_id" uuid,
	"endpoint" varchar(2048) NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "research_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"theme_id" uuid,
	"title" varchar(2048) NOT NULL,
	"content" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" varchar(50) NOT NULL,
	"provider_id" uuid,
	"external_id" varchar(255),
	"title" varchar(2048),
	"content" text,
	"url" varchar(2048),
	"published_at" timestamp with time zone,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_payload_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(50) DEFAULT 'other' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "themes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "transcripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"title" varchar(2048),
	"content" text,
	"sections" jsonb,
	"source" varchar(255) NOT NULL,
	"external_id" varchar(255),
	"source_document_id" uuid,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp with time zone,
	"image" varchar(255),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_fetch_runs" ADD CONSTRAINT "api_fetch_runs_provider_id_api_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."api_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_edges" ADD CONSTRAINT "candidate_edges_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidate_edges" ADD CONSTRAINT "candidate_edges_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_exposures" ADD CONSTRAINT "company_exposures_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_exposures" ADD CONSTRAINT "company_exposures_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_financials" ADD CONSTRAINT "company_financials_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_financials" ADD CONSTRAINT "company_financials_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_identifiers" ADD CONSTRAINT "company_identifiers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_metrics" ADD CONSTRAINT "company_metrics_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_events" ADD CONSTRAINT "earnings_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "earnings_events" ADD CONSTRAINT "earnings_events_transcript_id_transcripts_id_fk" FOREIGN KEY ("transcript_id") REFERENCES "public"."transcripts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edge_evidence" ADD CONSTRAINT "edge_evidence_edge_id_edges_id_fk" FOREIGN KEY ("edge_id") REFERENCES "public"."edges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edge_evidence" ADD CONSTRAINT "edge_evidence_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_source_node_id_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "edges" ADD CONSTRAINT "edges_target_node_id_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "public"."nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etf_holdings" ADD CONSTRAINT "etf_holdings_etf_id_companies_id_fk" FOREIGN KEY ("etf_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "etf_holdings" ADD CONSTRAINT "etf_holdings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insider_transactions" ADD CONSTRAINT "insider_transactions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insider_transactions" ADD CONSTRAINT "insider_transactions_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_positions" ADD CONSTRAINT "portfolio_positions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_api_payloads" ADD CONSTRAINT "raw_api_payloads_provider_id_api_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."api_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raw_api_payloads" ADD CONSTRAINT "raw_api_payloads_fetch_run_id_api_fetch_runs_id_fk" FOREIGN KEY ("fetch_run_id") REFERENCES "public"."api_fetch_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_notes" ADD CONSTRAINT "research_notes_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_provider_id_api_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."api_providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_documents" ADD CONSTRAINT "source_documents_raw_payload_id_raw_api_payloads_id_fk" FOREIGN KEY ("raw_payload_id") REFERENCES "public"."raw_api_payloads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcripts" ADD CONSTRAINT "transcripts_source_document_id_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_provider_account" ON "accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "idx_api_fetch_runs_provider_id" ON "api_fetch_runs" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_candidate_edges_review_status" ON "candidate_edges" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "idx_company_exposures_company_theme" ON "company_exposures" USING btree ("company_id","theme_id");--> statement-breakpoint
CREATE INDEX "idx_company_financials_company_year" ON "company_financials" USING btree ("company_id","fiscal_year");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_company_identifier" ON "company_identifiers" USING btree ("type","value");--> statement-breakpoint
CREATE INDEX "idx_company_identifiers_company_id" ON "company_identifiers" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_identifiers_ticker" ON "company_identifiers" USING btree ("value");--> statement-breakpoint
CREATE INDEX "idx_company_identifiers_cik" ON "company_identifiers" USING btree ("value");--> statement-breakpoint
CREATE INDEX "idx_company_identifiers_figi" ON "company_identifiers" USING btree ("value");--> statement-breakpoint
CREATE INDEX "idx_company_metrics_company_id" ON "company_metrics" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_company_metrics_metric_type" ON "company_metrics" USING btree ("metric_type");--> statement-breakpoint
CREATE INDEX "idx_earnings_events_company_id" ON "earnings_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_edge_evidence_edge_id" ON "edge_evidence" USING btree ("edge_id");--> statement-breakpoint
CREATE INDEX "idx_edges_source_node_id" ON "edges" USING btree ("source_node_id");--> statement-breakpoint
CREATE INDEX "idx_edges_target_node_id" ON "edges" USING btree ("target_node_id");--> statement-breakpoint
CREATE INDEX "idx_etf_holdings_etf_id" ON "etf_holdings" USING btree ("etf_id");--> statement-breakpoint
CREATE INDEX "idx_etf_holdings_company_id" ON "etf_holdings" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_insider_transactions_company_id" ON "insider_transactions" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_insider_transactions_transaction_date" ON "insider_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_node_slug_theme" ON "nodes" USING btree ("slug","theme_id");--> statement-breakpoint
CREATE INDEX "idx_nodes_theme_id" ON "nodes" USING btree ("theme_id");--> statement-breakpoint
CREATE INDEX "idx_nodes_id" ON "nodes" USING btree ("id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_positions_portfolio_id" ON "portfolio_positions" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_portfolios_user_id" ON "portfolios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_raw_api_payloads_fetch_run_id" ON "raw_api_payloads" USING btree ("fetch_run_id");--> statement-breakpoint
CREATE INDEX "idx_research_notes_user_id" ON "research_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_research_notes_company_id" ON "research_notes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_source_documents_source_type" ON "source_documents" USING btree ("source_type");--> statement-breakpoint
CREATE INDEX "idx_themes_slug" ON "themes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_transcripts_company_id" ON "transcripts" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_verification" ON "verifications" USING btree ("identifier","value");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_watchlist_user_company" ON "watchlist_items" USING btree ("user_id","company_id");--> statement-breakpoint
CREATE INDEX "idx_watchlist_items_user_id" ON "watchlist_items" USING btree ("user_id");