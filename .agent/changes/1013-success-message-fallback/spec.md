# Spec — Success responses must not carry the error sentence

Issue: #1013 · Status: approved · Intent: ./intent.md

## Behavior

1. `getApiSuccessMessage(code, values, locale, legacy)` returns the catalog sentence for `code`, else the legacy
   sentence, else `Thành công` (vi) / `Success` (en). It never returns the generic error sentence.
2. `ResponseBuilder.success()` and `ResponseBuilder.paginated()` use it. `error()` and validation keep
   `getApiMessage` (error fallback).
3. `DAILY_INCOME_SUCCESS` and `INCOME_ORDERS_SUCCESS` have sentences in `locales/{en,vi,ja,ko,zh}/errors.json`.
4. Every literal success code passed to `ResponseBuilder.success` / `paginated` / `attendanceOk` in `apps/api`
   and `packages/*/src` resolves to a non-error message in `en` and `vi` (test `api-success-message`).
5. Golden tests `order-create-api-compat`, `income-daily-api-compat`, `income-orders-api-compat` pass: every
   field equal to main-real except `message` / `error` text in the listed scenarios, which equal the catalog
   sentence of the response `code`.
