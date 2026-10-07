# Mobile UI round 2

Issue: #385 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

Phases 0–4 of the mobile redesign (#363) are on `dev`, but two approved groups of boards have no code yet:
- auth: login, create store, forgot password;
- onboarding and customers.

An audit also found gaps against boards that are already implemented.

## Proposed outcome

Every approved board on the canvas ships on iOS and Android behind its flag. The phase 0–4 gaps are filled, and the redesign is tested on dev, then released in stages.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`, and new shop owners signing up. Systems: iOS, Android, API (additive only).

## Constraints

- Installed apps keep working.
- Flags off keep the old screens.
- Auth is enabled last in production.

## Decision log

- 2026-10-04 — Plan approved (Trinh Tran)
