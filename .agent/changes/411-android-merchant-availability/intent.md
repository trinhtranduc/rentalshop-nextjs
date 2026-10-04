# Android: availability refused on the device for a merchant without an outlet

Issue: #411 · Author: Trinh Tran · Status: approved · Created: 2026-10-04

## Problem

`DefaultAvailabilityRepository` throws "An outlet is required to check availability" before any
request when the session has no `outletId`. A MERCHANT login never has one, so the merchant cannot
check availability in the availability screen, the old cart checkout (`ValidateRentalCartAvailability`)
or the new cart (`CartV2Screen`). Since #402 (issue #398) the API resolves a MERCHANT's default
outlet (or its only active outlet) when `outletId` is missing.

## Proposed outcome

For a MERCHANT without an outlet, the three calls (single check, batch check, occupancy calendar) go
to the API without `outletId` and the API picks the outlet. The device refuses only where the API
would refuse anyway because an outlet is truly required.

## Affected users and systems

MERCHANT on Android. Outlet roles and ADMIN unchanged. iOS already omits `outletId` when it has none
(`OrderService.loadProductAvailabilityV2`, `loadBatchProductAvailability`, availability-calendar).

## Constraints

- No API change. Requests that carry an `outletId` today are unchanged.
- Follow `bug-fix-tdd`.

## Open questions

- None.

## Decision log

- 2026-10-04 — Rule (issue #411): send the session outlet when there is one; MERCHANT without one omits `outletId`; any other role without an outlet is refused on the device.
