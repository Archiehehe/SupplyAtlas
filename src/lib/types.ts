export type ApiProvider =
  | "fmp"
  | "finnhub"
  | "alphaVantage"
  | "twelveData"
  | "fred"
  | "simfin"
  | "secApi"
  | "secEdgar"
  | "form4api"
  | "sentisense"
  | "securitiesDb"
  | "apiNinjas"
  | "earningsApi"
  | "openfigi"
  | "openaiExtraction";

export interface FetchRun {
  id?: string;
  provider: ApiProvider;
  endpoint: string;
  startedAt: Date;
  completedAt?: Date;
  success: boolean;
  errorMessage?: string;
  responseStatus?: number;
}

export interface RawApiPayload {
  id?: string;
  provider: ApiProvider;
  endpoint: string;
  fetchedAt: Date;
  payload: unknown;
  fetchRunId?: string;
}

export interface SourceDocument {
  id?: string;
  sourceType: "filing" | "transcript" | "webpage" | "pdf" | "other";
  provider?: ApiProvider;
  externalId?: string;
  title?: string;
  content?: string;
  url?: string;
  publishedAt?: Date;
  fetchedAt: Date;
  rawPayloadId?: string;
}

export interface CompanyIdentifier {
  type: "ticker" | "isin" | "cusip" | "cik" | "lei" | "figi" | "openfigi" | "other";
  value: string;
  primary?: boolean;
}

export interface CompanyMetric {
  metricType: string;
  value: number | string | null;
  currency?: string;
  period?: string;
  periodEndDate?: Date;
  source: ApiProvider;
  fetchedAt: Date;
}

export interface Company {
  id?: string;
  name: string;
  identifiers: CompanyIdentifier[];
  description?: string;
  sector?: string;
  industry?: string;
  website?: string;
  headquarters?: string;
  foundedYear?: number;
  employeeCount?: number;
  metrics: CompanyMetric[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Theme {
  id?: string;
  name: string;
  description?: string;
  type: "sector" | "technology" | "risk" | "catalyst" | "other";
  createdAt: Date;
  updatedAt: Date;
}

export interface Node {
  id?: string;
  type: "company" | "theme" | "country" | "etf" | "technology" | "other";
  label: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface EdgeEvidence {
  quote?: string;
  sourceDocumentId?: string;
  sourceUrl?: string;
  extractedAt: Date;
  extractionMethod: "llm" | "rule_based" | "manual" | "other";
}

export interface Edge {
  id?: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  confidenceScore?: number;
  evidence: EdgeEvidence[];
  createdAt: Date;
  updatedAt: Date;
}

export type ReviewStatus = "pending_review" | "approved" | "rejected" | "needs_more_context";

export interface CandidateEdge {
  id?: string;
  sourceLabel: string;
  targetLabel: string;
  relationshipType: string;
  confidenceScore: number;
  evidenceQuote?: string;
  sourceDocumentId?: string;
  extractionMethod: "llm" | "rule_based" | "other";
  reviewStatus: ReviewStatus;
  reviewNotes?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

export interface InsiderTransaction {
  id?: string;
  companyId?: string;
  insiderName: string;
  insiderTitle?: string;
  transactionType: "buy" | "sell" | "option_exercise" | "other";
  shares: number;
  pricePerShare?: number;
  totalValue?: number;
  transactionDate: Date;
  filedDate?: Date;
  source: ApiProvider;
  externalId?: string;
  fetchedAt: Date;
}

export interface EarningsEvent {
  id?: string;
  companyId?: string;
  eventType: "earnings" | "earnings_call" | "dividend" | "split" | "other";
  eventDate: Date;
  fiscalQuarter?: number;
  fiscalYear?: number;
  epsActual?: number;
  epsEstimate?: number;
  revenueActual?: number;
  revenueEstimate?: number;
  transcriptId?: string;
  source: ApiProvider;
  fetchedAt: Date;
}

export interface Transcript {
  id?: string;
  companyId?: string;
  eventType: "earnings_call" | "investor_presentation" | "other";
  eventDate: Date;
  title?: string;
  content?: string;
  sections?: TranscriptSection[];
  source: ApiProvider;
  externalId?: string;
  fetchedAt: Date;
}

export interface TranscriptSection {
  title?: string;
  speaker?: string;
  content: string;
  startTime?: string;
  endTime?: string;
}

export interface EtfHolding {
  id?: string;
  etfId?: string;
  companyId?: string;
  ticker: string;
  name?: string;
  shares?: number;
  weight?: number;
  marketValue?: number;
  asOfDate: Date;
  source: ApiProvider;
  fetchedAt: Date;
}

export interface PortfolioPosition {
  id?: string;
  portfolioId: string;
  companyId?: string;
  ticker: string;
  shares: number;
  averageCost?: number;
  currentPrice?: number;
  marketValue?: number;
  asOfDate: Date;
}
