import { describe, expect, it, jest } from '@jest/globals';
import { scheduleLandingStoreNavigation } from '../apps/client/lib/landing-store-navigation';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '../apps/client/lib/store-redirect';

function browser(ua = 'iPhone', readyState = 'loading', search = '', cookie = '', touch = 0) {
  const listeners = new Map<string, () => void>();
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  const replace = jest.fn();
  const value = {
    navigator: { userAgent: ua, maxTouchPoints: touch },
    document: { readyState, cookie },
    location: { search, replace },
    addEventListener: (event: string, fn: () => void) => listeners.set(event, fn),
    removeEventListener: (event: string) => listeners.delete(event),
    requestAnimationFrame: (fn: FrameRequestCallback) => { frames.set(++frameId, fn); return frameId; },
    cancelAnimationFrame: (id: number) => frames.delete(id),
  } as unknown as Window;
  const paint = () => { const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(0)); };
  return { value, replace, paint, listeners, frames };
}

describe('landing loads and paints before store navigation', () => {
  it('waits for load and a paint opportunity on iPhone', () => {
    const b = browser();
    scheduleLandingStoreNavigation(b.value);
    b.paint(); expect(b.replace).not.toHaveBeenCalled();
    b.listeners.get('load')!();
    expect(b.replace).not.toHaveBeenCalled();
    b.paint(); expect(b.replace).not.toHaveBeenCalled();
    b.paint(); expect(b.replace).toHaveBeenCalledWith(APP_STORE_URL);
  });
  it.each([['Android', 0, GOOGLE_PLAY_URL], ['Macintosh', 5, APP_STORE_URL]])(
    'already loaded %s still gets a painted frame', (ua, touch, target) => {
      const b = browser(ua as string, 'complete', '', '', touch as number);
      scheduleLandingStoreNavigation(b.value);
      expect(b.replace).not.toHaveBeenCalled(); b.paint(); expect(b.replace).not.toHaveBeenCalled();
      b.paint(); expect(b.replace).toHaveBeenCalledWith(target);
    },
  );
  it.each([
    ['Macintosh', '', '', 0], ['Android Googlebot', '', '', 0], ['Android Zalo', '', '', 0],
    ['iPhone', '?web=1', '', 0], ['Android', '', 'anyrent_web=1', 0],
  ])('keeps excluded visitor %s %s %s on web', (ua, search, cookie, touch) => {
    const b = browser(ua as string, 'complete', search as string, cookie as string, touch as number);
    scheduleLandingStoreNavigation(b.value); b.paint(); b.paint();
    expect(b.replace).not.toHaveBeenCalled(); expect(b.frames.size).toBe(0);
  });
  it('cancels the listener on cleanup before load', () => {
    const b = browser(); const cleanup = scheduleLandingStoreNavigation(b.value);
    cleanup(); expect(b.listeners.size).toBe(0); b.paint(); b.paint(); expect(b.replace).not.toHaveBeenCalled();
  });
  it.each([0, 1])('cancels pending animation frames after %i frames', count => {
    const b = browser('iPhone', 'complete'); const cleanup = scheduleLandingStoreNavigation(b.value);
    if (count) b.paint(); cleanup(); b.paint(); b.paint(); expect(b.replace).not.toHaveBeenCalled();
  });
  it('Strict Mode cleanup and remount navigates once', () => {
    const b = browser('Android', 'complete'); scheduleLandingStoreNavigation(b.value)();
    scheduleLandingStoreNavigation(b.value); b.paint(); b.paint(); expect(b.replace).toHaveBeenCalledTimes(1);
  });
});
