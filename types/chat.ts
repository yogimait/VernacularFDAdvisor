export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Structured response data (Phase 8) — if present, renders as rich card */
  structured?: StructuredResponse;
}

export interface StructuredResponse {
  type: "explanation" | "recommendation" | "greeting";
  explanation?: string;
  example?: string;
  points?: string[];
  nextStep?: string;
  recommendations?: FDRecommendation[];
}

export interface FDRecommendation {
  bank: string;
  rate: number;
  tenure: number;
  maturity?: number;
  category: string;
  reason?: string;
}

export interface FDOption {
  bank: string;
  rate: number;
  tenure: number; // in months
  minAmount: number;
  category: "public" | "private" | "small-finance" | "government";
}
