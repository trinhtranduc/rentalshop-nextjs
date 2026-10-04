---
name: api-compat-review
description: Use before merging any change to an API route, a package the API uses (packages/database, utils, constants, auth, validation), an order/status/pricing rule, a Prisma schema or migration, or an API env var. Checks that iOS/Android apps already installed by customers and stale web tabs keep working, and records the verdict in the PR.
---

# API backward-compatibility review

Customers run iOS and Android builds made from `main-real` or older. Those builds cannot be updated
on our schedule. The API must keep serving them. Do this review for every API-affecting change. Put the
table from step 6 in the PR body.

## 1. Find what changed

```bash
git fetch origin
git diff origin/main-real...HEAD --stat -- apps/api packages/database/src packages/utils/src \
  packages/constants/src packages/auth/src packages/validation prisma
```

List each route and each shared function whose behavior changed. Shared helpers count too: a change in
`packages/utils` can change many routes.

## 2. Find the old callers

For each changed route, read how production code calls it:

```bash
git grep -n "<route path or endpoint constant>" origin/main-real -- apps/mobile apps/mobile-android apps/client apps/admin
```

- **iOS:** `Library/Services/APIEndpoint.swift`, the per-domain `*Service.swift`, and the `Codable` models.
  A non-optional property fails the whole decode when the field is missing or `null`.
- **Android:** `data/ApiClient.kt`, `data/ApiParity.kt`, and `data/model/`.
- **Web:** `packages/utils` API clients (`*Api`).

## 3. Check each change against this list

| Check | Breaks old apps when… | Safe pattern |
|---|---|---|
| Response fields | a field is removed, renamed, changes type, or becomes `null` where an old app decodes a non-optional value | add new fields only; keep old ones and their types |
| Request params | a new param is required, or an old param is rejected or means something else | new params optional, with the old behavior as default |
| Validation (zod) | a payload old apps send is now rejected | accept the old payload; tighten only for new fields |
| Error codes / HTTP status | a new 4xx appears on a flow old apps use, and they show nothing or crash | reuse codes old apps handle, or make sure the message text is readable |
| Business rules | status transitions, pricing, availability or day boundaries block or change a flow the old UI offers | allow what the old UI can send, or degrade gracefully |
| Auth / sessions | token lifetime, refresh, single-session or headers change | old login path keeps working; new behavior only when the client opts in (header, new endpoint) |
| Pagination / sorting | default `limit`, order or page meaning changes | keep defaults |
| Data meaning | the same numbers land on different days or totals | allowed only as an intended fix; write who will notice in the PR |
| Migrations | a column is dropped or renamed, a type is narrowed, a NOT NULL has no default, or a big table is locked | additive and nullable or defaulted; follow `db-migration` |
| Env / config | a new env var is required, or unset is unsafe | unset = old behavior |

## 4. Web stale tabs

The web deploys with the API, but an open tab keeps old JS until it reloads. Apply the same checks, with
lower severity.

## 5. Fix before merge

A breaking risk gets a shim or an additive alternative in the same PR, e.g. keep the old field, accept the
old param, or put the new behavior behind a header or a new endpoint. "Users will update" is not a fix.

## 6. Record it in the PR

```markdown
## API compatibility (installed apps)

| Route / area | Change | Old iOS | Old Android | Web | Risk |
|---|---|---|---|---|---|
| GET /api/… | added `foo` (optional) | ignores unknown keys | ignores | n/a | none |
```

- Name the old-app code you read, as `file:line` on `origin/main-real`.
- "Not verified" is allowed. Guessing is not.
- High risk, auth, or migrations → human review (`review-pr`).
