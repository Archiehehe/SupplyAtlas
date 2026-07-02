export interface CompanyMatch {
  id: string;
  name: string;
  sector: string | null;
}

export interface ThemeExposure {
  themeSlug: string;
  themeName: string;
  exposureType: string;
  exposureScore: number | null;
}

export interface EdgeInfo {
  id: string;
  relationshipType: string;
  explanation: string | null;
  sourceNodeName: string;
  targetNodeName: string;
}

export interface EvidenceInfo {
  quote: string | null;
  docTitle: string | null;
  docSourceType: string | null;
}

export interface TickerExposure {
  ticker: string;
  company: CompanyMatch | null;
  themes: ThemeExposure[];
  edges: EdgeInfo[];
  evidence: EvidenceInfo[];
}

export interface ExposureMappingsResult {
  exposures: TickerExposure[];
}
