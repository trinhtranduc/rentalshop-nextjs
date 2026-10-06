# Intent — #559 Shop web: one shared date-range calendar with duration

Issue: #559 · Depends on #558

## What the owner wants

"dùng UI chung có duration". On Tổng quan, "Tuỳ chọn…" shows two native date inputs and a "Xem" button.
Every place the shop web picks a date range should use the same range calendar Tạo đơn got in #558,
with the duration in plain words: "T4 01/10 → T6 31/10 · 31 ngày".

## Why

Native date pairs look different per browser, do not show how many days were picked, and let the end
come before the start. One calendar reads the same everywhere.

## Constraints

- Shop web only (`apps/client`), plus `locales/{en,vi}` and `tests/`. No API, package or mobile change.
- Same URL state and API params as today.
- Vietnam civil days (day keys); a same-day range is 1 ngày.
- Shell tokens, dark mode, 390px. Keep it lean.
