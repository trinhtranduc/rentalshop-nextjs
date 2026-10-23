# Crisp chat on public pages

Issue: #1165 · Author: Trinh · Status: accepted · Created: 2026-10-23

## Problem

Visitors on the public site have no in-page chat. Support is email and social links. The owner wants an international bottom-right dialog plus a mobile inbox. Crisp is already registered.

## Proposed outcome

Public pages that render `PublicSiteFooter` load the Crisp chatbox. The landing floating Zalo/WhatsApp/Telegram cluster is hidden so it does not cover the bubble. Contact-card social links stay.

## Affected users and systems

Public visitors on `apps/client` landing, blog, download, image-search, affiliate. Support team uses the Crisp inbox / mobile apps. Not the logged-in shop shell.

## Constraints

No API change. Do not mix with #1164 or the dirty 984 tree. Do not connect Hostinger mail or WhatsApp in this issue. Operator display name stays in the Crisp dashboard.

## Open questions

None.

## Decision log

- 2026-10-23 — Owner pasted the Crisp snippet (Website ID `dcc97356-d416-4ce0-a683-f00f2ac5289e`) and asked for a separate PR from the mailbox hotfix (owner).
