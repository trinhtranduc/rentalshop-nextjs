# Android cart while editing: send excludeOrderId

Issue: #634 · Author: Trinh Tran · Status: accepted · Created: 2026-10-07

## Problem
Editing a rental on Android: the batch availability call omits `excludeOrderId`, so the order counts against
itself ("thiếu N" can be wrong), and overlap tags are switched off while editing (`CartV2Screen.kt:198`).
iOS sends `excludeOrderId: cart.orderId` (`CartV2ViewController.swift:499-500`).

## Outcome
Android matches iOS: the batch check excludes the edited order; short and overlap tags reflect other orders only.

## Constraints
Android only. No API change (`excludeOrderId` already accepted by `POST /api/products/batch-availability`).

## Decision log
- 2026-10-07 — open the issue and fix (owner)
