# Spec — Cart shortage warning in amber

Issue: #1054 · Status: approved · Intent: ./intent.md

## Behavior

1. `CartV2Logic.shortageTone(left:)` returns `.low` when `left >= 1` and `.none` when `left <= 0`
   (iOS `CartV2Logic.ShortageTone`, Android `CartV2Logic.ShortageTone` LOW / NONE).
2. `.low` → text #9A3412 on #FFEDD5 (`DS.Status.waiting` / `DS.Status.Waiting`), medium weight.
3. `.none` → text #991B1B on #FEE2E2, current weight (iOS bold, Android SemiBold).
4. Rent (`shortRent`) and sale (`shortStock`) lines use the same rule.
5. The overlap tag "Hết dd/MM → dd/MM ›" keeps #991B1B on #FEE2E2.
6. Text, size, corner radius, padding and accessibility labels do not change.

## Out of scope

Any other warning colour; the product detail free strip; the shortage threshold itself.

## API and data

No API change.

## Acceptance

- [x] Behaviour 1–3 have unit tests on iOS (`ProductsV2Tests`) and Android (`ProductRulesTest`)
- [x] iOS and Android both changed
- [x] No new strings
