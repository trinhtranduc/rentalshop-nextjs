# Public post layout matches the landing page

Status: active · Added: 2026-10-16 · Source: issue #1000

## Failure

Localized post listing and detail pages used a separate legacy logo and header instead of AnyRent's current landing-page brand and visual system.

## Detect

`cd tests && yarn test public-post-landing-shell.test.ts`

## Pass

The public post shell renders the shared landing brandmark and public locale selector. Listing and article pages use the landing palette, header treatment, and responsive spacing; locale-specific article filtering remains exact.

## Notes

Related lines in `AGENTS.md` → "Things agents get wrong". Follow `incident-to-eval` and `verify-change`.
