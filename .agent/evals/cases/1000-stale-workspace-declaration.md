# Package declaration resolves a stale local file dependency

Status: active · Added: 2026-10-16 · Source: Vercel build failure on PR #1001

## Detect

Run `yarn --cwd tests test package-types-public-locale-resolution --runInBand` and inspect `packages/types/package.json`. A workspace package dependency must use a semver range matching the local workspace version so Yarn links the current package; a `file:` snapshot can leave declarations stale after the dependency's source changes.

## Pass

The regression test finds no TS2614 for `PublicLocale`, and `yarn workspace @rentalshop/types build` emits declarations successfully after the constants workspace build.
