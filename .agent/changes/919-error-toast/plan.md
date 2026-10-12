# Plan — #919

1. Test first: `tests/web-error-toast.test.ts` (pure policy + the handler's title/type). Commit alone.
2. `packages/ui/src/components/ui/toast-policy.ts`: `ERROR_TOAST_DURATION_MS`, `toastDurationFor(type, requested)`.
3. `toast.tsx`: Toast uses `toastDurationFor`; fading toast `pointer-events-none`; stable `removeToast`
   (useCallback) so the timer is not restarted on every provider render; `toastError` drops the `0`.
4. `packages/hooks`: `apiErrorToast(code)` → `{ type, titleKey }`; handler uses `useCommonTranslations`.
   `useToastHandler().showError` drops the `0`.
5. Verify: tests, tsc client/admin vs origin/dev, lint on changed files, builds, headed Chrome screenshots.
