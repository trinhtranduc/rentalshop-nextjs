# Intent: seo-agent module as package `@rentalshop/seo-agent` (#1637)

## What is wanted
The AI Content Agent built for another site should be usable in AnyRent. Its site-independent part lives in the
repository `trinhtranduc/seo-agent`. This change brings that part in; it does not turn anything on.

## Why
AnyRent has a blog (`Post` models, `write-article` and `translate-post` skills) and no agent team around it. The module
already holds the agents, the run engine, the schedule maths, the reviewer's checks, the page audit, the competitor and
rank reports and the UI pieces, tested on the other site.

## Constraints
- No app, API route, schema or deployed behaviour changes.
- `packages/seo-agent/src` is a git subtree and must import nothing from this repository.
- Agent names, summaries and log lines are Vietnamese in the module today.

## Out of scope (next issue)
Tables for runs and configuration, the `TeamRunHost` and the twelve steps for AnyRent's blog, API routes and
permissions, the admin pages, the scheduler, keys and spending caps.

## Decision log
- 2026-11-23: review found two bugs in the shared module; owner said fix them in `seo-agent`. Claude cost now has one
  price per model, counts cache tokens and Haiku 5.5 long prompts, and an unknown model costs the dearest price.
  `lintArticle(post, rules)` makes the affiliate and `/risk` checks site rules (default unchanged). Sent upstream as
  trinhtranduc/seo-agent#1; the same commit is on this branch. dailyrebatefx-web needs two expected values updated in
  `scripts/check-seo-settings.ts` when it pulls.
