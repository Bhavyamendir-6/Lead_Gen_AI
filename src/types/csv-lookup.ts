import { Lead } from './leads';

export interface CsvLookupRow {
  firstName: string;
  lastName: string;
  designationTitle: string;
  department?: string;
  companyName: string;
}

export interface CsvLookupResultItem {
  row: CsvLookupRow;
  status: 'found' | 'not_found' | 'multiple_matches' | 'error';
  lead: Partial<Lead> | null;
  errorMessage?: string;
  matchCount?: number;
}
