/**
 * Platform Detection Types
 * Used to identify if API requests come from web or mobile clients
 */

export type ClientPlatform = 'web' | 'mobile' | 'unknown';

export type DeviceType = 'ios' | 'android' | 'browser' | 'unknown';

export interface PlatformInfo {
  platform: ClientPlatform;
  version?: string;
  deviceType?: DeviceType;
  userAgent?: string;
}

export interface PlatformHeaders {
  'X-Client-Platform'?: string;
  'X-App-Version'?: string;
  'X-Device-Type'?: string;
}

export interface RequestWithPlatform extends Request {
  platformInfo?: PlatformInfo;
}

