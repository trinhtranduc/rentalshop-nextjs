# Spec — Crisp chat on public pages

Issue: #1165 · Status: accepted · Intent: ./intent.md

## Behavior

1. `PublicSiteFooter` mounts `CrispChat`, which injects `https://client.crisp.chat/l.js` once with Website ID `dcc97356-d416-4ce0-a683-f00f2ac5289e`.
2. The landing floating Zalo/WhatsApp/Telegram cluster does not render, so the Crisp bubble owns the bottom-right corner.
3. Contact-card Zalo/WhatsApp/Telegram on the landing stay visible.
4. Logged-in shop routes that do not use `PublicSiteFooter` do not load Crisp.
5. Footer locale links (`usePublicHref`) are unchanged.

## Out of scope

Mailbox copy (`support@anyrent.shop`, #1164). Crisp dashboard identity. Connecting email/WhatsApp to Crisp. In-app shop-customer chat. iOS/Android POS.

## API and data

No API fields, routes, or env vars.

## Acceptance

- [ ] `CrispChat.tsx` exists and is mounted from `PublicSiteFooter`
- [ ] Landing `FloatingButtons` cluster is not shown
- [ ] Grep of shop-shell layouts has no `CrispChat`
- [ ] `git grep client.crisp.chat` is only the public widget files
