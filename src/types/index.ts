// Professional Lead Gen Platform - Enterprise Module
// Central Type Index

export * from './accounts';
export * from './leads';

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';