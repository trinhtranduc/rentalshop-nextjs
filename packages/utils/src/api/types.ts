// ============================================================================
// API TYPES
// ============================================================================
// Type definitions for API route helpers

import type { NextRequest as NextRequestType, NextResponse as NextResponseType } from 'next/server';
import type { AuthUser } from '@rentalshop/types';
import type { UserScope } from '@rentalshop/auth/server';

export type ApiRequest = NextRequestType;
export type ApiResponse<T = unknown> = NextResponseType;

export type ValidationResult<T> = 
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      response: ApiResponse;
    };

export type MerchantIdResolution =
  | {
      success: true;
      merchantId: number;
    }
  | {
      success: false;
      response: ApiResponse;
    };

// Re-export types for convenience
export type { AuthUser, UserScope };
