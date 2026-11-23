# Plan (#1637)

1. Branch `feat/1637-seo-agent-package` from `dev`.
2. `git subtree add --prefix=packages/seo-agent/src seo-agent main --squash`.
3. Add the wrapper files and two entries.
4. Test: engine with an in-memory host (order, pause, failure, single agent), schedule and reviewer checks, the
   no-host-imports rule.
5. Verify: install with frozen lockfile, package type-check, build, jest.
6. PR to `dev` with `Fixes #1637`.

Follow-up issue: the AnyRent host (storage, steps, routes, admin pages, scheduler).
