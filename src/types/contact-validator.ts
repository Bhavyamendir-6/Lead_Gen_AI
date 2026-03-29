export type ValidationStatus = '✅ PASS' | '⚠️ WARN' | '❌ FLAG' | '🔲 PENDING';

export interface ContactInput {
  name: string;
  linkedin?: string;
  autoGroup?: string;
  rooftop?: string;
  [key: string]: any;
}

export interface ValidatedContact {
  Name: string;
  AutoGroup: string;
  Rooftop: string;
  CleanedTitle: string;
  Address: string;
  LinkedinURL: string;
  RooftopWebsiteStatus: ValidationStatus;
  LinkedInStatus: ValidationStatus;
  ZoomInfoStatus: ValidationStatus;
  DealerRaterStatus: ValidationStatus;
  OverallValidation: ValidationStatus;
  ConcernsNotes: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}
