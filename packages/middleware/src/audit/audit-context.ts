/**
 * Audit Context Middleware
 * 
 * This middleware captures request context (user, IP, session, etc.) 
 * and makes it available for audit logging throughout the request lifecycle.
 */

import { NextRequest } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  merchantId?: string;
  outletId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

// Global context store (in production, use Redis or similar)
const requestContexts = new Map<string, AuditContext>();
let currentContext: AuditContext | undefined;

export function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function captureAuditContext(request: NextRequest): Promise<AuditContext> {
  const requestId = generateRequestId();
  
  // Extract basic request info
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';
  const sessionId = request.headers.get('x-session-id') || 'unknown';
  
  let context: AuditContext = {
    ipAddress,
    userAgent,
    sessionId,
    requestId,
    metadata: {
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString()
    }
  };

  // Try to extract user information from token
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (token) {
      const user = await verifyTokenSimple(token);
      if (user) {
        context.userId = user.id;
        context.userEmail = user.email || undefined;
        context.userRole = user.role || undefined;
        context.merchantId = user.merchantId;
        context.outletId = user.outletId;
      }
    }
  } catch (error) {
    console.error('Error extracting user context for audit:', error);
  }

  // Store context for this request and set as current
  requestContexts.set(requestId, context);
  currentContext = context;
  
  return context;
}

export function getAuditContext(): AuditContext | undefined {
  return currentContext;
}

export function getAuditContextById(requestId: string): AuditContext | undefined {
  return requestContexts.get(requestId);
}

export function clearAuditContext(requestId: string): void {
  requestContexts.delete(requestId);
  if (currentContext?.requestId === requestId) {
    currentContext = undefined;
  }
}

// Clean up old contexts periodically (in production, use a proper cleanup mechanism)
setInterval(() => {
  const now = Date.now();
  for (const [requestId, context] of requestContexts.entries()) {
    const contextAge = now - parseInt(requestId.split('-')[1]);
    if (contextAge > 300000) { // 5 minutes
      requestContexts.delete(requestId);
    }
  }
}, 60000); // Clean up every minute
