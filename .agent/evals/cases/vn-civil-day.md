# Dates: UTC day used as the Vietnam business day

Status: active · Added: 2026-09-23 · Source: hotfix history (five repeats)

## Failure

"Today", calendar taps, availability, and income-by-day used the UTC date. Between 00:00 and 07:00
in Vietnam that is still the previous civil day. A same-day pickup and return was treated as a
zero-day gap and dropped the rental day.

## Detect

Date tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`. Search the diff for `toISOString().split`,
`setHours(0,0,0,0)`, `getDate()`, and `toLocaleDateString()` used as day boundaries.

## Pass

Day keys are `YYYY-MM-DD` Vietnam civil days. Ranges go through `getUtcRangeForDateKeys` /
`getLocalDateKey` from `@rentalshop/utils`. A same-day pickup and return still occupies that day.

## Notes

Skill: `.claude/skills/timezone-dates/SKILL.md`. Listed in `AGENTS.md` → "Things agents get wrong".
