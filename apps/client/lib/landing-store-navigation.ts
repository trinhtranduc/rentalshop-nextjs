import { APP_STORE_URL, WEB_OPT_OUT_COOKIE, isIpadDesktop, isWebOptOut, landingStoreRedirect } from './store-redirect';

/** Let the landing document finish loading and paint before leaving for the mobile store. */
export function scheduleLandingStoreNavigation(browser: Window): () => void {
  let frame: number | undefined;
  let cancelled = false;

  const target = () => {
    const web = new URLSearchParams(browser.location.search).get('web');
    const cookie = browser.document.cookie.match(new RegExp(`(?:^|;\\s*)${WEB_OPT_OUT_COOKIE}=([^;]*)`))?.[1];
    const userAgent = browser.navigator.userAgent;
    if (isWebOptOut(web, cookie)) return null;
    return landingStoreRedirect({ userAgent, web, webCookie: cookie }) ??
      (isIpadDesktop(userAgent, browser.navigator.maxTouchPoints) ? APP_STORE_URL : null);
  };

  const afterLoad = () => {
    if (cancelled || !target()) return;
    // rAF callbacks run before paint. A second frame leaves a paint opportunity between them.
    frame = browser.requestAnimationFrame(() => {
      frame = browser.requestAnimationFrame(() => {
        if (cancelled) return;
        const url = target();
        if (url) browser.location.replace(url);
      });
    });
  };

  try {
    if (target()) {
      if (browser.document.readyState === 'complete') afterLoad();
      else browser.addEventListener('load', afterLoad, { once: true });
    }
  } catch {
    // Restricted browser storage must not prevent access to the landing page.
  }

  return () => {
    cancelled = true;
    browser.removeEventListener('load', afterLoad);
    if (frame !== undefined) browser.cancelAnimationFrame(frame);
  };
}
