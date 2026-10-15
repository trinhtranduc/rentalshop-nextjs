# Landing loads before store navigation
Issue: #992 · Status: implemented (verification limits in verification.md) · Created: 2026-10-15

## Problem
#946 redirects mobile visitors at the server before they can see the landing page.

## Outcome
Render landing first, wait for window load and a painted frame, then automatically open the device's existing store URL.

## Scope and constraints
Client web only. Preserve bots, desktop, chat browsers and ?web=1 / cookie exclusions. No API, native app, metadata, locale or payment change. Do not deploy.

## Decisions
2026-10-15: owner explicitly clarified that users must enter landing, wait for it to finish loading, then go to store. No new confirmation dialog. No open questions.
