# Note photos limited to 3 on the apps and the web

Issue: #1425 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

The owner wants note photos capped at 3 to save storage ("ghi chú cũng 3 hình thôi"). Today it is 5 on web, iOS and Android.

## Proposed outcome

Every place that adds note photos stops at 3. Orders that already hold 4 or 5 keep them, show them all, and stay editable.

## Constraints

- `packages/constants/src/validation.ts:30` stays 5: installed apps can still send 5. No change under `apps/api`, `prisma` or API packages.
- Deleting note photos stays allowed, unlike hand-over photos.

## Decision log

- The save rule was "kept + new must fit the limit". With 3 that would refuse a text edit on an old order holding 5 photos, so it now applies only when new photos are added.
- Above the limit the count shows "5 ảnh", not "5/3".
- `packages/ui` `OrderSettingsCard` has its own constant at 5. No app renders it, so it is left alone.
