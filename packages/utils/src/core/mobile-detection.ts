/**
 * Mobile Device Detection Utilities
 * 
 * Used for email verification links to detect mobile devices
 * and redirect to mobile app deep links when appropriate
 */

/**
 * Check if the current device is a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Check for mobile device patterns
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent.toLowerCase()
  );
}

/**
 * Check if the current device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
}

/**
 * Check if the current device is Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  return /android/i.test(userAgent.toLowerCase());
}

/**
 * Generate mobile app deep link for email verification
 * 
 * Format: anyrent://verify-email?token=xxx
 * 
 * This works for both iOS and Android as a fallback.
 * For production, consider using Universal Links (iOS) and App Links (Android).
 */
export function getMobileDeepLink(token: string): string {
  return `anyrent://verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Generate Universal Link for iOS (if configured)
 * 
 * Format: https://anyrent.shop/verify-email?token=xxx
 * 
 * This requires:
 * 1. Associated Domains configured in Xcode
 * 2. apple-app-site-association file hosted at domain
 */
export function getIOSUniversalLink(token: string, baseUrl?: string): string {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://anyrent.shop');
  return `${url}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Generate App Link for Android (if configured)
 * 
 * Format: https://anyrent.shop/verify-email?token=xxx
 * 
 * This requires:
 * 1. Intent filter configured in AndroidManifest.xml
 * 2. assetlinks.json file hosted at domain
 */
export function getAndroidAppLink(token: string, baseUrl?: string): string {
  const url = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://anyrent.shop');
  return `${url}/verify-email?token=${encodeURIComponent(token)}`;
}

/**
 * Try to redirect to mobile app, with fallback to web
 * 
 * @param token - Email verification token
 * @param onFallback - Callback if app doesn't open (fallback to web)
 * @param timeout - Timeout in milliseconds before fallback (default: 2000ms)
 */
export function tryOpenMobileApp(
  token: string,
  onFallback: () => void,
  timeout: number = 2000
): void {
  if (typeof window === 'undefined') {
    onFallback();
    return;
  }

  if (!isMobileDevice()) {
    onFallback();
    return;
  }

  // Try Universal Link / App Link first (if configured)
  const universalLink = isIOS() 
    ? getIOSUniversalLink(token)
    : getAndroidAppLink(token);

  // Try custom URL scheme as fallback
  const deepLink = getMobileDeepLink(token);

  // Try to open app via deep link
  // On iOS, this will try Universal Link first, then fallback to custom scheme
  // On Android, this will try App Link first, then fallback to custom scheme
  window.location.href = deepLink;

  // Set timeout for fallback
  const fallbackTimer = setTimeout(() => {
    onFallback();
  }, timeout);

  // Clear timeout if page unloads (app opened successfully)
  window.addEventListener('pagehide', () => {
    clearTimeout(fallbackTimer);
  });

  // Also try Universal Link / App Link
  // This is a backup in case custom scheme doesn't work
  const link = document.createElement('a');
  link.href = universalLink;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

