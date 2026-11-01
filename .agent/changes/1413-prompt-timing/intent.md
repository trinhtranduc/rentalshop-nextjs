# System prompts should not cover onboarding or the first order

Issue: #1413 · Author: Claude · Status: in-progress · Created: 2026-11-01

## Problem

A new shop gets the notification permission prompt right after login, on top of onboarding page 1 (iOS; on Android 13+ at every launch, even before login). iOS asks for an App Store rating once, on the very first order, on top of the "Xong đơn đầu tiên" moment.

## Proposed outcome

- Notification prompt: only after onboarding is finished or was already done, with Home showing. Someone who already answered sees nothing new.
- Rating: from the shop's 5th order on, never during the first-run guide or while its finish card is pending. Once asked, never again.

## Affected users and systems

iOS and Android apps. No API path changes, no web, no migration.

## Constraints

- Push token registration for users who already granted runs exactly as today, on login and at launch.
- `hasRequestedAppRating` keeps its meaning.
- Not in scope: prompt wording, the guide, web, API.

## Decision log

- 2026-11-01 — Threshold 5 orders, owner decision. Total comes from `GET /api/orders?limit=1`, the read the guide already uses. Cancelled orders count, same as the guide.
- 2026-11-01 — Android has no in-app review (no Play review dependency, no `ReviewManager`): rating change is iOS only.
