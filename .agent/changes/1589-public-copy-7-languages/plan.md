# Plan — Public pages keep their production copy in 7 languages

Issue: #1589 · Status: in-progress · Spec: ./spec.md

## Steps

1. `git show origin/main-real:locales/<lang>/<file>.json` for the four public files; set the trial period from `dev`.
2. `plans.json`: `dev` file with every production key set to the production value.
3. Update the outdated ja/ko/zh assertion in `tests/phu-phi-wording.test.ts`.

## Verify

- `yarn --cwd tests test landing-i18n public-pages-i18n public-pages-price-copy phu-phi-wording locales-valid-json locales-complete shop-12-locales`
- Full suite `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`: same failing suites as `main-real`

## Rollback

Revert the PR (text only).
