// Professional Lead Gen Platform - Enterprise Module
// Definitive types for Leads and Extraction Metadata

export type UrlStatus = 'Canonical' | 'Search_Result' | 'Redirect' | 'Malformed';

export interface Lead {
  id: string;
  proxyId: string;
  name: string;
  title: string;
  linkedinUrl: string;
  urlStatus: UrlStatus;
  confidenceScore: number;
  isVerified: boolean;
  verificationSource?: string;
  matchedSkills: string[];
  aiReasoning: string;
  generatedHook?: string;
  influenceScore: number;
  signalTrustBridge: boolean;   // e.g., Worked at Source Account previously
  signalFunctionalWedge: boolean; // e.g., Direct departmental match
  signalAuthority: boolean;     // e.g., Decision maker status

  // ZoomInfo enriched contact fields
  firstName?: string;
  lastName?: string;
  mobilePhone?: string;
  email?: string;
  email2?: string;
  emailPersonal?: string;
  directPhone?: string;
  managementLevel?: string;
  contactStreet?: string;
  contactCity?: string;
  contactState?: string;
  contactCountry?: string;
  contactZip?: string;
  timeZone?: string;
  yearsOfExperience?: number;
  linkedinSummary?: string;

  // ZoomInfo enriched company fields
  companyName?: string;
  companyStreet?: string;
  companyCity?: string;
  companyState?: string;
  companyZip?: string;
  companyCountry?: string;
  employeeCount?: number;
  companyWebsite?: string;
  companyPhone?: string;
  companyDescription?: string;
  companyLinkedinUrl?: string;
  industry?: string;
  subIndustry?: string;
  parentCompany?: string;
  parentCompanyCountry?: string;
  foundedYear?: number;
  revenueRange?: string;
  employeeSizeRange?: string;
  annualRevenue?: string;

  // App-managed CRM fields
  leadSourceGlobal?: string;
  segmentName?: string;
  sdrName?: string;
  researcherName?: string;
  dataRequesterDetails?: string;
}

export interface ExtractionFilters {
  jobTitles: string;
  departments: string;
  minExperience: number;
  location: string;
  enableHumanMimicry: boolean;
}

export interface CookieSession {
  li_at: string;
  JSESSIONID: string;
  status: 'Active' | 'Expired' | 'Rate_Limited';
  lastValidated: Date;
}

export interface ExtractionStats {
  totalScanned: number;
  verifiedGold: number;
  extractionRate: number; // Percent of success
}

export type ExtractionMode = 'search' | 'sniper' | 'zoominfo';