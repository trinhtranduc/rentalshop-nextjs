# Search: accent rule depends on how the query was typed

Status: active · Added: 2026-10-27 · Source: #1250

## Failure

Product search treated a query word WITH diacritics as exact-accent. "Họa" (tone on o) did not find
"Hoạ tiết" (tone on a), and a name stored decomposed (NFD) was missed by the bare word "hoa".

## Detect

`cd tests && npx jest product-search-accent` (add `TEST_PG_DB=<db with unaccent>` to run the SQL twin).

## Pass

Query and stored name are folded the same way (NFC, strip marks, đ to d, lower case): `foldSearchText`
in `@rentalshop/utils`, `lower(unaccent(normalize(col, NFC)))` in SQL. Word-prefix and merchant scope stay.

## Notes

Order and customer search (`order.ts`, `customer.ts`) still use the conditional-accent rule; AGENTS.md
asks for accent-insensitive search there too.
