# Spec — #919

1. `useGlobalErrorHandler` titles the toast with `common.labels.error` (vi "Lỗi"), or `common.labels.warning`
   (vi "Cảnh báo") for the validation-type warning it already shows. No English literal.
2. An error toast hides after `ERROR_TOAST_DURATION_MS = 6000`, also when a caller passes `0` or nothing
   (`useGlobalErrorHandler`, `useToast().toastError`, `useToastHandler().showError`). The close button stays.
3. Success / warning / info keep their durations (default 5000; an explicit `0` still means "stay").
4. The toast stack (`ToastContainer`) does not take clicks; only a visible toast card does. A toast that is
   fading out takes no clicks.
5. Shared code only: `packages/ui/src/components/ui/toast.tsx` (+ pure `toast-policy.ts`) and
   `packages/hooks`. Client and admin both get it through `@rentalshop/ui`.

Acceptance: `tests/web-error-toast.test.ts` green; in a headed Chrome, a Vietnamese error toast reads "Lỗi",
disappears after ~6 s, and a click beside it reaches the page.
