## Issue

Fixes #

Change folder: `.agent/changes/<issue>-<slug>/`

## Summary

What changed and why. One to three sentences.

## Test plan

- [ ] `yarn lint`
- [ ] `yarn type-check`
- [ ] `cd tests && yarn test` (or the specific file)
- [ ] Eval cases read: `<path or none>`
- [ ] UI flow exercised, if a screen changed
- [ ] iOS and Android updated, if the API contract changed

## Risk

Auth, payments, migrations, production data, mobile clients already installed.

## Review

- [ ] Diff matches the issue and `plan.md`
- [ ] Human review requested if auth, payments, schema, or workflows changed
