/**
 * Audit Logs API Client
 * 
 * This module provides API client functions for audit logs operations.
 * All API requests should be made through these functions, not directly in UI components.
 */

import { API_BASE_URL } from '../config/api';

// Types
export interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  user?: {
    id: number;
    email: string;
    name: string;
    role: string;
  };
  merchant?: {
    id: number;
    name: string;
  };
  outlet?: {
    id: number;
    name: string;
  };
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'GENERAL' | 'SECURITY' | 'BUSINESS' | 'SYSTEM' | 'COMPLIANCE';
  description?: string;
  createdAt: string;
}

export interface AuditLogFilter {
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  merchantId?: string;
  outletId?: string;
  severity?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AuditLogStats {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByEntity: Record<string, number>;
  logsBySeverity: Record<string, number>;
  logsByCategory: Record<string, number>;
  recentActivity: number;
}

export interface AuditLogStatsResponse {
  success: boolean;
  data: AuditLogStats;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('authToken') || '';
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Request failed with status ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use the text as error message
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Get audit logs with filtering and pagination
 */
export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const endpoint = `/api/audit-logs${queryString ? `?${queryString}` : ''}`;
  
  return makeAuthenticatedRequest<AuditLogResponse>(endpoint);
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(filter: Partial<AuditLogFilter> = {}): Promise<AuditLogStatsResponse> {
  const params = new URLSearchParams();
  
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const endpoint = `/api/audit-logs/stats${queryString ? `?${queryString}` : ''}`;
  
  return makeAuthenticatedRequest<AuditLogStatsResponse>(endpoint);
}

/**
 * Export audit logs (if endpoint exists)
 */
export async function exportAuditLogs(filter: AuditLogFilter = {}): Promise<Blob> {
  const params = new URLSearchParams();
  
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  const endpoint = `/api/audit-logs/export${queryString ? `?${queryString}` : ''}`;
  
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token found. Please login again.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Export failed: ${errorText}`);
  }

  return response.blob();
}
