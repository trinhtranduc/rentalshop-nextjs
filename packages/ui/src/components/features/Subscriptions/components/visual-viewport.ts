import { useEffect } from 'react';

/**
 * #1050: the visible part of the screen as CSS variables, for the full-screen phone dialogs.
 * Safari iOS and Chrome Android do not shrink 100dvh when the on-screen keyboard opens; only
 * window.visualViewport shrinks. A dialog sized with `var(--ar-vvh,100dvh)` and placed at `var(--ar-vvt,0px)`
 * keeps its footer (the confirm button) right above the keyboard.
 */
export const VV_HEIGHT_VAR = '--ar-vvh';
export const VV_TOP_VAR = '--ar-vvt';

export interface ViewportLike {
  height: number;
  offsetTop: number;
}

export interface StyleLike {
  setProperty(name: string, value: string): void;
  removeProperty(name: string): void;
}

/** Writes the visible viewport height and top offset (whole px) to `style`; `null` removes both. */
export function applyVisualViewportVars(style: StyleLike, viewport: ViewportLike | null): void {
  if (!viewport) {
    style.removeProperty(VV_HEIGHT_VAR);
    style.removeProperty(VV_TOP_VAR);
    return;
  }
  style.setProperty(VV_HEIGHT_VAR, `${Math.round(viewport.height)}px`);
  style.setProperty(VV_TOP_VAR, `${Math.round(viewport.offsetTop)}px`);
}

// Open dialogs that use the variables; the last one to close removes them.
let users = 0;

/**
 * While mounted, keeps `--ar-vvh` / `--ar-vvt` on <html> in step with window.visualViewport, and scrolls the
 * focused field back into view when the keyboard takes space. No-op where visualViewport is missing.
 */
export function useVisualViewportVars(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const root = document.documentElement.style;
    let lastHeight = viewport.height;
    const update = () => {
      applyVisualViewportVars(root, viewport);
      const shrank = viewport.height < lastHeight;
      lastHeight = viewport.height;
      const active = document.activeElement as HTMLElement | null;
      if (shrank && active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) && active.closest('[role="dialog"]')) {
        // after the dialog has taken the new height
        requestAnimationFrame(() => active.scrollIntoView({ block: 'nearest' }));
      }
    };
    users += 1;
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      users -= 1;
      if (users === 0) applyVisualViewportVars(root, null);
    };
  }, []);
}
