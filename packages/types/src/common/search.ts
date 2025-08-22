// ============================================================================
// SEARCH TYPES
// ============================================================================

export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  query: string;
  filters: Record<string, any>;
}

export interface SearchFilters {
  [key: string]: string | number | boolean | string[];
}
