CREATE TABLE "daily_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticker" varchar(50) NOT NULL,
	"price_date" timestamp with time zone NOT NULL,
	"close_price" numeric(20, 10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_dividends" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"ticker" varchar(50) NOT NULL,
	"amount" numeric(30, 2) NOT NULL,
	"ex_date" timestamp with time zone NOT NULL,
	"pay_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_theme_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"ticker" varchar(50) NOT NULL,
	"theme_slug" varchar(255) NOT NULL,
	"weight" numeric(10, 5) DEFAULT '1.0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"portfolio_id" uuid NOT NULL,
	"ticker" varchar(50) NOT NULL,
	"transaction_type" varchar(20) NOT NULL,
	"shares" numeric(30, 10) NOT NULL,
	"price" numeric(20, 10) NOT NULL,
	"total_value" numeric(30, 2) NOT NULL,
	"transaction_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "portfolios" ADD COLUMN "portfolio_key" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_dividends" ADD CONSTRAINT "portfolio_dividends_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_theme_mappings" ADD CONSTRAINT "portfolio_theme_mappings_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_transactions" ADD CONSTRAINT "portfolio_transactions_portfolio_id_portfolios_id_fk" FOREIGN KEY ("portfolio_id") REFERENCES "public"."portfolios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_daily_prices_ticker_date" ON "daily_prices" USING btree ("ticker","price_date");--> statement-breakpoint
CREATE INDEX "idx_daily_prices_ticker" ON "daily_prices" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_daily_prices_date" ON "daily_prices" USING btree ("price_date");--> statement-breakpoint
CREATE INDEX "idx_portfolio_dividends_portfolio_id" ON "portfolio_dividends" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_dividends_ex_date" ON "portfolio_dividends" USING btree ("ex_date");--> statement-breakpoint
CREATE INDEX "idx_portfolio_theme_mappings_portfolio_id" ON "portfolio_theme_mappings" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_theme_mappings_ticker" ON "portfolio_theme_mappings" USING btree ("ticker");--> statement-breakpoint
CREATE INDEX "idx_portfolio_transactions_portfolio_id" ON "portfolio_transactions" USING btree ("portfolio_id");--> statement-breakpoint
CREATE INDEX "idx_portfolio_transactions_date" ON "portfolio_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_portfolios_portfolio_key" ON "portfolios" USING btree ("portfolio_key");--> statement-breakpoint
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_portfolio_key_unique" UNIQUE("portfolio_key");