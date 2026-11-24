# seo-agent

The parts of an SEO agent team that do not depend on any one site: who the agents are and how a run goes, the rules the
reviewer applies, the reading of a page, the competitor report, ranking maths, and the UI pieces that draw them.

The folder imports nothing from the host project (a check in the host fails if it ever does). It needs React and Tailwind
CSS classes for `ui/`; `core/` is plain TypeScript.

## What is in here

| Path | What it gives you |
|---|---|
| `core/teamRun.ts` | The agents, phases and analysis tracks; schedule maths (due, next run, Vietnam time); run limits; the weekly article quota; `lintArticle`, the reviewer's form and on-page SEO checks |
| `core/engine.ts` | `runAgents(host, …)`: order, pauses, what a failure stops, single-agent runs, a log per agent. Storage and steps come from the host through `TeamRunHost` |
| `core/pageAudit.ts` | `readPage`, `pageIssues`, `auditUrl`: what a page's HTML says to a search engine, by fixed rules |
| `core/competitors.ts` | `parseOrganic`, `buildCompetitorReport`: who holds the top results, from a SERP result list |
| `core/rankings.ts`, `core/rankReport.ts` | Grouping Search Console rows by query or page; week and month movement report |
| `core/serp.ts`, `core/spend.ts`, `core/claudeSpend.ts`, `core/keywords.ts` | SERP helpers, freshness and budget rules, Claude cost maths (price per model, cache tokens, Haiku 5.5 long prompts; add a model before using it), keyword normalising |
| `core/socialPosts.ts` | Proposed posts for YouTube, TikTok, Instagram, Facebook, X and Reddit: the post shape, each platform's limits, `checkSocialPost` (limits, numbers the source never states, promises), `socialPostCopy` (the text a person pastes), and the prompt, schema and parser for the host's model call |
| `core/report.ts`, `core/window.ts` | The read-only seven-stage report over 1, 3 or 6 months |
| `ui/TeamFlow.tsx` | The vertical flow diagram with live status per agent (`FlowState`) |
| `ui/charts.tsx` | `SegmentBar`, `BarList`, `MiniBar`, `MiniColumns`, `Sparkline`, `Donut`, `More` |
| `ui/TeamDashboard.tsx` | The seven-stage report view and `PeriodToggle` |

## What the host still writes

The module decides nothing about storage, sign-in, AI provider or content. A host project supplies:

1. **Storage**: tables for agent runs, team configuration, usage ledgers, stored SERP results and page readings. In
   dailyrebatefx-web these are the `seo_*` Prisma models.
2. **A `TeamRunHost`**: `startRun`, `finishRun`, `skipRun`, `spentUsd`, the list of paused agents, and one step function
   per agent. See `src/lib/api/services/seoTeamRunService.ts` in dailyrebatefx-web for a full Prisma implementation.
3. **The steps**: what "analyse", "write" or "translate" mean on that site, including prompts, the list of pages a draft may
   link to, and the image library. These carry the site's voice and rules and stay in the host.
4. **Article rules** that only some sites have: `lintArticle(post, rules)` checks an affiliate disclosure and a link to
   `/risk` by default (`DEFAULT_ARTICLE_RULES`). A site without them passes `{ disclosure: false, riskPath: null }`.
5. **Routes, permissions and pages** around the UI components.
6. **A scheduler** that calls the host's "run if due" function every few minutes; `isDue` and `nextRunAt` do the maths.

A minimal host:

```ts
import { runAgents, type TeamRunHost } from "@/modules/seo-agent";

const host: TeamRunHost<{ notes: string[] }> = {
  shared: { notes: [] },
  paused: [],
  independent: new Set(["site", "competitor", "image", "translate"]),
  steps: { analyse: async ({ log }) => { log("…"); return { status: "done", summary: "…" }; }, /* one per agent */ },
  startRun: async (run) => db.runs.insert(run),
  finishRun: async (id, result) => db.runs.update(id, result),
  skipRun: async (run) => db.runs.insert({ ...run, status: "skipped" }),
  spentUsd: async () => 0,
};
await runAgents(host, { batchId: crypto.randomUUID(), trigger: "manual" });
```

Agent names, summaries and log lines are in Vietnamese today; another language means editing `TEAM_AGENTS` and the
messages in `core/`.

## Social posts

`core/socialPosts.ts` proposes; it never posts. The host makes one model call and keeps what passes:

```ts
import { SOCIAL_POST_RULES, SOCIAL_POSTS_SCHEMA, parseSocialPosts, socialPostBrief, socialPostCopy } from "@/modules/seo-agent";

const brief = { kind: "article", title, language: "English", source: articleText };
let answer = await askModel({ system: SOCIAL_POST_RULES, user: socialPostBrief(brief), schema: SOCIAL_POSTS_SCHEMA });
let result = parseSocialPosts(answer, { source: articleText });
if (result.problems.length) {
  // One retry for the posts that broke a limit or stated a number the article does not.
  answer = await askModel({ system: SOCIAL_POST_RULES, user: socialPostBrief({ ...brief, platforms: result.missing, fix: result.problems }), schema: SOCIAL_POSTS_SCHEMA });
  result = { ...result, posts: [...result.posts, ...parseSocialPosts(answer, { source: articleText, wanted: result.missing }).posts] };
}
for (const post of result.posts) show(post.platform, socialPostCopy(post, { link: publishedUrl }));
```

`askModel` is the host's own call to its AI provider. Posts carry `{link}` where the published link belongs;
`socialPostCopy` puts it in once the host knows it. The limits are conservative and written from the platforms'
published rules as of late 2026; check them when a platform changes.

## The seven-stage report

`buildTeamReport(source, months)` counts what each stage produced from a `TeamDataSource` the host implements, and
`TeamDashboard` draws it. It never fetches, estimates or calls an AI; a stage nobody does yet is returned with
`mode: "missing"` and shown as a gap.

## Sync (git subtree)

This folder is the root of its own repository, `seo-agent`. A host project keeps a full copy of it, so the host builds and
deploys without access to that repository.

In dailyrebatefx-web the remote is named `seo-agent` and two scripts wrap the commands:

```bash
yarn seo-agent:push   # send commits that touched src/modules/seo-agent to the seo-agent repository
yarn seo-agent:pull   # bring changes made in the seo-agent repository into this project
```

Adding the module to another project:

```bash
git remote add seo-agent git@github.com:trinhtranduc/seo-agent.git
git subtree add --prefix=src/modules/seo-agent seo-agent main --squash
```

Edit the module in either place, commit as usual, then push or pull. Keep host-specific code (database queries, routes,
keys) out of this folder: it must not import from the host.
