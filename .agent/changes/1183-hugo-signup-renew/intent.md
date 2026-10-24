# Hugo sign-up and renewal answers

Issue: #1183 · Author: owner · Status: accepted · Created: 2026-10-24

## Problem

Hugo answers “đăng ký” from `/terms` (Apple ID > Subscriptions). New shops should register on the web or in the app. Renewal is Zalo/WhatsApp 0764774647, not iPhone Settings.

## Proposed outcome

`docs/crisp-hugo-anyrent.md` states: register on web `/register` or App Store / Google Play; renew via Zalo/WhatsApp 0764774647; never Apple ID Settings.

## Affected users and systems

Crisp Hugo (Files / Q&A). Public visitors on anyrent.shop. No app or API code.

## Constraints

PR to `main-real` as requested. No API. Do not mix #984.

## Decision log

- 2026-10-24 — Register on web and mobile. Renew = Zalo/WhatsApp 0764774647. Drop Apple ID path.
