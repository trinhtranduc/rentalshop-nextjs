# #927 Android: big clock card in Settings — Intent

Status: in-progress · Issue: #927 · Owner approved 13/10/26 · Mockup: artifact MikH31P6eVqyzbnj6BoWzf, tab
"App: Vào ca / Ra ca mới (chọn)", "Chốt: thẻ giờ lớn ở Cài đặt (phương án L)".

## Why
Vào ca / Ra ca sits behind a separate "Chấm công" screen (two taps); the Settings row shows only the first shift and no
branch. The shop now picks who must clock in (`GET /api/attendance/me` → `required`); people not picked must see nothing.

## Outcome (Android)
- Settings (new and old screen), top: card L only when the shop has the `attendance` module AND `required` (missing = true).
- Not in: current time big; "T2 13/10 · <all today's shifts> · <branch> · chưa vào ca"; centred Vào ca; "Ca và công của tôi ›".
- In shift: elapsed time big and ticking, green card, "Đang trong ca · vào 07:58 · Ca sáng đến 17:00", Ra ca.
- Done: day total big ("8,1 giờ"), "Hôm nay · 07:58–12:01, 13:00–17:05", Vào ca (another round allowed).
- Button → camera scanner at once; ✓ result inside the card, refusals in the existing red box under it.
- The intermediate "Chấm công" screen is gone; "Ca và công của tôi" stays.

## Constraints
Additive only; old API without `required` keeps the card. VN days (`ShopTime`). iOS (`feat/927-attendance-card-ios`) is the reference.
