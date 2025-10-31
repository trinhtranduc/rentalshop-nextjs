/**
 * Platform Detection Utility
 * Detects if API requests come from web or mobile clients
 */

import { PlatformInfo, ClientPlatform, DeviceType } from '@rentalshop/types';

/**
 * Detect platform from request headers
 * Priority:
 * 1. Custom headers (X-Client-Platform, X-App-Version, X-Device-Type)
 * 2. User-Agent fallback
 */
export function detectPlatform(request: Request): PlatformInfo {
  // Method 1: Custom headers (recommended)
  const platformHeader = request.headers.get('X-Client-Platform')?.toLowerCase();
  const versionHeader = request.headers.get('X-App-Version');
  const deviceHeader = request.headers.get('X-Device-Type')?.toLowerCase();
  const userAgent = request.headers.get('User-Agent') || '';

  // If custom platform header exists, use it
  if (platformHeader) {
    let platform: ClientPlatform = 'unknown';
    if (platformHeader === 'mobile') platform = 'mobile';
    else if (platformHeader === 'web') platform = 'web';

    let deviceType: DeviceType = 'unknown';
    if (deviceHeader === 'ios') deviceType = 'ios';
    else if (deviceHeader === 'android') deviceType = 'android';
    else if (deviceHeader === 'browser') deviceType = 'browser';

    return {
      platform,
      version: versionHeader || undefined,
      deviceType,
      userAgent,
    };
  }

  // Method 2: User-Agent fallback
  return detectPlatformFromUserAgent(userAgent);
}

/**
 * Detect platform from User-Agent string
 * Fallback method when custom headers are not provided
 */
function detectPlatformFromUserAgent(userAgent: string): PlatformInfo {
  const ua = userAgent.toLowerCase();

  // Check for mobile patterns
  if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
    let deviceType: DeviceType = 'unknown';
    
    if (/android/i.test(ua)) {
      deviceType = 'android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      deviceType = 'ios';
    }

    return {
      platform: 'mobile',
      deviceType,
      userAgent,
    };
  }

  // Default to web
  return {
    platform: 'web',
    deviceType: 'browser',
    userAgent,
  };
}

/**
 * Check if request is from mobile
 */
export function isMobileRequest(request: Request): boolean {
  const platformInfo = detectPlatform(request);
  return platformInfo.platform === 'mobile';
}

/**
 * Check if request is from web
 */
export function isWebRequest(request: Request): boolean {
  const platformInfo = detectPlatform(request);
  return platformInfo.platform === 'web';
}

/**
 * Check if request is from specific device type
 */
export function isDeviceType(request: Request, deviceType: DeviceType): boolean {
  const platformInfo = detectPlatform(request);
  return platformInfo.deviceType === deviceType;
}

/**
 * Get platform-specific response limits
 * Mobile gets fewer items for better performance
 */
export function getPlatformLimits(request: Request): { limit: number; maxLimit: number } {
  if (isMobileRequest(request)) {
    return { limit: 20, maxLimit: 50 }; // Mobile: smaller batches
  }
  return { limit: 50, maxLimit: 100 }; // Web: larger batches
}

/**
 * Format log message with platform info
 */
export function formatPlatformLog(request: Request, message: string): string {
  const platformInfo = detectPlatform(request);
  const platform = platformInfo.platform.toUpperCase();
  const device = platformInfo.deviceType ? `[${platformInfo.deviceType.toUpperCase()}]` : '';
  const version = platformInfo.version ? `v${platformInfo.version}` : '';
  
  return `[${platform}${device}${version ? ' ' + version : ''}] ${message}`;
}

