# Spec (#1637)

## Package
- `packages/seo-agent`, name `@rentalshop/seo-agent`, private workspace package, built with tsup like the others.
- `src/` = git subtree of `git@github.com:trinhtranduc/seo-agent.git` (`main`, squashed). Remote name `seo-agent`.
- Wrappers outside the subtree: `entries/index.ts`, `entries/ui.ts`, `package.json`, `tsup.config.ts`, `tsconfig.json`,
  `jest.config.js`, `__tests__/`.

## Entries
| Import | Contents | Runs in |
|---|---|---|
| `@rentalshop/seo-agent` | `runAgents`, `TeamRunHost`, `TEAM_AGENTS`, schedule maths, `lintArticle`, `formatIssues`, page audit, competitor and rank reports, guide-video script rules | API, server code |
| `@rentalshop/seo-agent/ui` | `TeamFlow`, `TeamDashboard`, charts, canvas video renderer | client components (`'use client'` banner kept) |

`ui` needs React 18 and Tailwind classes; an app that renders it adds `../../packages/seo-agent/src/**/*.{ts,tsx}` to its
Tailwind `content`.

## Acceptance
1. `yarn install --frozen-lockfile` changes no lockfile.
2. In `packages/seo-agent`: `tsc --noEmit` 0 errors, `tsup` builds both entries, `jest` green.
3. A test fails if a file under `src/` imports anything but relative paths or `react`.
4. No file outside `packages/seo-agent` and `.agent/changes/1637-seo-agent-package` changes.

## Sync
`yarn workspace @rentalshop/seo-agent subtree:pull` / `subtree:push` (needs a clean tree and the `seo-agent` remote).
