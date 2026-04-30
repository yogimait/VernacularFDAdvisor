export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  /** Structured response data (Phase 8) — if present, renders as rich card */
  structured?: StructuredResponse;
}

export type StructuredResponseType =
  | "explanation"
  | "recommendation"
  | "greeting"
  | "booking_flow";

export type BookingStep =
  | "SELECT_BANK"
  | "CONFIRM_DETAILS"
  | "ACCOUNT_CHECK"
  | "METHOD_SELECTION"
  | "EXECUTION_GUIDE"
  | "FINAL_CONFIRMATION";

export type BookingInterestType = "cumulative" | "non-cumulative";
export type BookingAccountStatus = "has-account" | "no-account";
export type BookingMethod = "net-banking" | "mobile-app" | "branch-visit";

export interface BookingProgress {
  current: number;
  total: number;
  label: string;
}

export interface FDBookingState {
  step: BookingStep;
  bank?: string;
  amount: number;
  tenureMonths: number;
  interestType: BookingInterestType;
  accountStatus?: BookingAccountStatus;
  bookingMethod?: BookingMethod;
}

export interface FDBookingFlow {
  title: string;
  subtitle?: string;
  bookingState: FDBookingState;
  progress: BookingProgress;
  bankOptions?: string[];
  steps?: string[];
  cta?: string;
  suggestions?: string[];
  estimatedRate?: number;
  estimatedMaturity?: number;
  estimatedYearlyPayout?: number;
}

export interface SourceCitation {
  source?: string;
  authority?: string;
  title?: string;
  url?: string;
  topic?: string;
  snippet?: string;
  confidence?: "high" | "medium" | "low";
}

export interface StructuredResponse {
  type: StructuredResponseType;
  explanation?: string;
  example?: string;
  points?: string[];
  nextStep?: string;
  recommendations?: FDRecommendation[];
  bookingFlow?: FDBookingFlow;
  sources?: SourceCitation[];
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
