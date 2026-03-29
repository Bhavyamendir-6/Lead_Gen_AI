// Professional Lead Gen Platform - Enterprise Module
// Definitive types for Source Accounts and Competitive Proxies

export enum StrategicTrack {
  MARKET_PENETRATION = 'Market Penetration',
  PRODUCT_EXPANSION = 'Product Expansion',
  COMPETITIVE_MIRRORING = 'Competitive Mirroring',
}

export interface SourceAccount {
  id: string;
  name: string;
  domain: string;
  subDomain: string;
  techStack: string[];
  track: StrategicTrack;
  createdAt: Date;
}

export interface CompetitiveProxy {
  id: string;
  sourceAccountId: string;
  name: string;
  similarityScore: number;
  proxyWedge: string; // The strategic reason why this company mirrors the source
  techStackOverlap: string[];
  websiteUrl?: string;
  employeeCount?: string;
  industry?: string;
}

export interface ProcessingStatus {
  analyzingSource: boolean;
  findingProxies: boolean;
  extractingLeads: boolean;
  extractingHarvestTarget: boolean;
  extractingAutoHarvest: boolean;
  generatingHookFor: string | null; // Lead ID
}