import { describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { observeReveal, revealStart } from '../apps/client/lib/landing-reveal';

/** #1100: landing images reveal once when they scroll into view */
type Entry = { isIntersecting: boolean; intersectionRatio: number };

function browser({ io = true, reduced = false, top = 2000, height = 800 } = {}) {
  const observers: { cb: (e: Entry[]) => void; disconnect: jest.Mock; observe: jest.Mock }[] = [];
  class FakeIO {
    cb: (e: Entry[]) => void;
    observe = jest.fn();
    disconnect = jest.fn();
    constructor(cb: (e: Entry[]) => void) {
      this.cb = cb;
      observers.push(this);
    }
  }
  const win = {
    innerHeight: height,
    matchMedia: (q: string) => ({ matches: reduced && q.includes('prefers-reduced-motion') }),
    ...(io ? { IntersectionObserver: FakeIO } : {}),
  } as unknown as Window;
  const el = { getBoundingClientRect: () => ({ top, bottom: top + 400 }) } as unknown as Element;
  return { win, el, observers };
}

describe('landing reveal', () => {
  it('hides a block below the fold until it scrolls into view', () => {
    const b = browser();
    expect(revealStart(b.win, b.el)).toBe('ready');
  });

  it('plays at once for a block already on screen', () => {
    const b = browser({ top: 200 });
    expect(revealStart(b.win, b.el)).toBe('in');
  });

  it('never hides anything without IntersectionObserver or with reduced motion', () => {
    expect(revealStart(browser({ io: false }).win, browser().el)).toBe('off');
    expect(revealStart(browser({ reduced: true }).win, browser().el)).toBe('off');
  });

  it('calls back once when the block intersects, then stops observing', () => {
    const b = browser();
    const onIn = jest.fn();
    const stop = observeReveal(b.win, b.el, onIn);
    expect(b.observers).toHaveLength(1);
    b.observers[0].cb([{ isIntersecting: false, intersectionRatio: 0 }]);
    expect(onIn).not.toHaveBeenCalled();
    b.observers[0].cb([{ isIntersecting: true, intersectionRatio: 0.3 }]);
    expect(onIn).toHaveBeenCalledTimes(1);
    expect(b.observers[0].disconnect).toHaveBeenCalled();
    stop();
  });

  it('turns every animation off for prefers-reduced-motion in the CSS', () => {
    const css = readFileSync(join(__dirname, '../apps/client/app/globals.css'), 'utf8');
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(css).toContain('@keyframes la-rise');
    expect(reduced).toMatch(/\[data-anim\][^{]*\{[^}]*animation:\s*none/);
    expect(reduced).toMatch(/\.la-hero[^{]*\{[^}]*animation:\s*none/);
  });
});
