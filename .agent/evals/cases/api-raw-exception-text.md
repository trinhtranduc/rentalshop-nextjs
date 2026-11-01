# api: raw exception text reaches a user

Status: active · Added: 2026-10-31 · Source: #1408

## Failure

An iPhone on the My Order tab showed an "Error" alert with "Invalid `t.attendanceScan.findFirst()` invocation in
/app/apps/api/.next/server/chunks/1677.js:54:55586", SQL and bundled source. `authenticateRequest`
(`packages/auth/src/core.ts`) sent `error.message` whenever it contained "subscription", and Prisma's message holds the
source around the call, which has that word. The name in the message is the first query on the minified line, not the
query that failed (`db.users.findById`).

## Detect

```bash
yarn --cwd tests test no-raw-server-errors
```

The AST scan in that file fails when a catch variable's `.message`, `.stack` or `String(error)` is used outside a log, a
comparison or the named allow list, across `apps/api/app/api`, `apps/api/lib`, `apps/api/middleware.ts` and
`packages/auth/src`.

Live check on a local build: start with `NODE_ENV=development`, log in, rename a column the auth query reads
(`ALTER TABLE "User" RENAME COLUMN "isActive" TO "isActive_broken"`, your own local database only), call `GET /api/orders`,
and rename it back.

## Pass

- The body has none of: invocation, prisma, SELECT, /app/, .next, chunks.
- A database failure during auth answers 503 `SERVICE_UNAVAILABLE`, not 403 `SUBSCRIPTION_ERROR` and not a 401 that signs
  the user out.
- `packages/database/src/client.ts` keeps `errorFormat: 'minimal'`.
- iOS `ServerMessageGuardTests` and Android `ServerMessageGuardTest` pass.

## Notes

`AGENTS.md` → "Things agents get wrong": exception text in a response. Skill: `api-route-standard` step 7.
Do not trust the query named in a raw Prisma message from a bundled build: use the column after `:54:` against the chunk.
