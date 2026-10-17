# Spec — Product search finds words after punctuation

Issue: #1009 · Status: in-progress · Intent: ./intent.md

## Behavior

1. The query is split into words on whitespace and on punctuation (`SEARCH_SEPARATOR_CHARS`). Empty pieces are dropped. A query with no words matches no name/description (barcode is still checked).
2. A word matches a value when the value, lower-cased, with every run of separators turned into one space and a space put in front, contains `" " + word`.
3. "xanh", "Xanh ngọc", "(xanh", "ngọc)", "(Xanh Ngọc)" find "Mẫu (Xanh Ngọc)". "anh" does not (mid-word).
4. Word without diacritics: accent-insensitive (`unaccent`). Word with diacritics: exact accent (NFC).
5. All words must match (AND), each in name OR description, inside the merchant.
6. `%` and `_` typed by the user are not wildcards (they are separators, and patterns are escaped).
7. The legacy Prisma `contains` fallback uses the same words.
8. Response shape unchanged.
