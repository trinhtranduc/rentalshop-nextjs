/**
 * #1100: landing images play their entry animation once, when their block scrolls into view.
 * Server HTML has no `data-anim`, so every image is visible without JS. After mount a block below the fold
 * becomes `ready` (hidden by CSS) and turns `in` when it intersects; a block already on screen is `in` at once.
 */
export type RevealState = 'in' | 'ready' | 'off';

const THRESHOLD = 0.25;

type RevealWindow = Window & { IntersectionObserver?: typeof IntersectionObserver };

/** `off` keeps the block as rendered: no IntersectionObserver or the user asked for reduced motion */
export function revealStart(win: Window, el: Element): RevealState {
  if (typeof (win as RevealWindow).IntersectionObserver !== 'function') return 'off';
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 'off';
  const { top, bottom } = el.getBoundingClientRect();
  return top < win.innerHeight && bottom > 0 ? 'in' : 'ready';
}

/** Calls `onIn` once when the block intersects; returns a cleanup */
export function observeReveal(win: Window, el: Element, onIn: () => void): () => void {
  const IO = (win as RevealWindow).IntersectionObserver as typeof IntersectionObserver;
  const observer = new IO(
    (entries) => {
      if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= THRESHOLD)) {
        observer.disconnect();
        onIn();
      }
    },
    { threshold: THRESHOLD }
  );
  observer.observe(el);
  return () => observer.disconnect();
}
