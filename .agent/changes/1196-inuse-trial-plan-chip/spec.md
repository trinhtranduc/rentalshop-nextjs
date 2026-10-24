# Spec — In use Trial chip

Issue: #1196 · Status: in-progress · Intent: ./intent.md

## Behavior

1. In use chips are Trial, Basic, Pro, Enterprise among còn hạn.
2. Trial chip opens `/merchants?status=current&plan=Trial`.
3. `plan=Basic` → plan name contains `basic` (case-insensitive). Pro/Enterprise unchanged (contains `pro` / equals-or-contains enterprise).
4. Trial tile stays `/merchants?status=trial` (enum, including hết hạn).

## Out of scope

- Changing Trial tile to only còn hạn.
- Other/unknown plan chip (add later if chips still miss shops).

## API and data

`plan=Basic` meaning widens from equals `Basic` to contains `basic`. Response shape unchanged.

## Acceptance

- [ ] Tests: In use Trial row counted on Trial chip; `Basic — 6 months` counted as Basic; href `status=current&plan=Trial`
- [ ] No new i18n keys
- [ ] LOG row
