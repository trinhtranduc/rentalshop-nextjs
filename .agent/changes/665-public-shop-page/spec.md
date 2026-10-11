# Spec — #665

1. Card price: main = FIXED price (or `rentPrice`) `/ lần`; if a DAILY option exists and a fixed price exists, a second line `hoặc X / ngày`; a product whose only rent price is daily shows `X / ngày` as the main line.
2. `Bán X` line only when `salePrice > 0`.
3. VND formats as `500.000đ`.
4. Zalo link: `https://zalo.me/<digits>` from the outlet phone, else merchant phone; buttons hidden without a phone.
5. No stock overlay on cards.
6. Category chips update `categoryId` in the URL; search updates `search` after typing stops; pagination kept.
7. Detail sheet lists per-rental, per-day, deposit (when > 0), sale price rows that exist.
8. Phone width 360–430px: no horizontal page scroll.

Out of scope: API changes, booking flow, SEO metadata changes.
