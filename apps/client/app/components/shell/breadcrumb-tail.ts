'use client';

/**
 * Last breadcrumb label set by the page itself (#960), for names the URL cannot carry
 * (Chi tiết theo người shows the person's name). One value; the page clears it when it unmounts.
 */
import { useEffect, useSyncExternalStore } from 'react';

let tail: string | null = null;
const listeners = new Set<() => void>();

function setTail(value: string | null) {
  if (tail === value) return;
  tail = value;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Page side: show `label` as the current page in the breadcrumb while mounted. */
export function useBreadcrumbTail(label: string | null | undefined) {
  useEffect(() => {
    setTail(label || null);
    return () => setTail(null);
  }, [label]);
}

/** Top bar side. */
export function useBreadcrumbTailValue(): string | null {
  return useSyncExternalStore(subscribe, () => tail, () => null);
}
