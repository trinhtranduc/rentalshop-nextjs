# Intent — #721 Thế chân rows, series and same-day cancel agree with the tile

Owner (2026-10-09): "cần đảm bảo các chỉ số đúng chuẩn, chi tiết cũng đúng, có thể e2e lại".

The re-run of the business e2e on `dev` found three disagreements. All of them come from a hand-over that is returned or cancelled on the same day:

- The Thế chân related list (pickup/return rows) adds collateral the tile does not.
- `series[].cashCollected` adds collateral of orders cancelled after hand-over.
- #503: a hand-over then cancel on the same day refunds the whole total + collateral although no pickup event was recorded, so collected and Thế chân go negative.

The web e2e also found that the web drawer showed "+-0" for no refunds.
