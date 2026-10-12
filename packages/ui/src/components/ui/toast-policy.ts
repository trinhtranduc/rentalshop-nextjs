/**
 * Toast timing rules (#919). Pure so the tests can load it without React.
 */
export type ToastKind = 'success' | 'error' | 'warning' | 'info';

export const DEFAULT_TOAST_DURATION_MS = 5000;
/** Error toasts always hide by themselves; the close button stays. */
export const ERROR_TOAST_DURATION_MS = 6000;

/**
 * How long a toast stays, in ms. `0` means "stay until closed", except for errors: a sticky error toast
 * covered the top-right corner of the page and its buttons (#919).
 */
export function toastDurationFor(type: ToastKind, requested?: number): number {
  if (type === 'error') {
    return requested && requested > 0 ? requested : ERROR_TOAST_DURATION_MS;
  }
  return requested ?? DEFAULT_TOAST_DURATION_MS;
}
