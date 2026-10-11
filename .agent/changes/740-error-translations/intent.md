# Intent — #740 the web never shows an error code

Owner (2026-10-10): "trên web có nhiều lỗi vẫn hiện mã lỗi chưa được dịch".
Cause 1: 118 codes the API can return had no sentence in `locales/{en,vi}/errors.json`. Cause 2: `translateError` took next-intl's `errors.<CODE>` for a translation.
