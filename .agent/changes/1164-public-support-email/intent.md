# Public support mailbox

Issue: #1164 · Author: Trinh · Status: accepted · Created: 2026-10-23

## Problem

Public contact used a personal Gmail. The Hostinger mailbox `support@anyrent.shop` is live. The footer only showed a mail icon, so visitors could not copy the company address.

## Proposed outcome

Landing, public footer, Terms, Privacy, JSON-LD, iOS App Information, and Android Settings show and mailto `support@anyrent.shop`. Footer shows the address as text.

## Affected users and systems

Public visitors and shop owners on client landing / legal pages; iOS and Android Settings. Transactional SES sender stays `noreply@anyrent.shop`.

## Constraints

No API route or payload change. Do not mix with other dirty-tree work. Fastlane `apple_id` stays the Apple Developer login.

## Open questions

None.

## Decision log

- 2026-10-23 — Owner set Hostinger mailbox `support@anyrent.shop` and asked to update the landing (owner).
