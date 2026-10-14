# iPad: landscape only and a landscape layout pass

Issue: #973 · Author: agent · Status: in-progress · Created: 2026-10-14

## Problem
Owner (14/10/26): "trên iPad UI chưa ổn lắm". iPad is used in landscape. Phone screens stretch edge to edge
on a 1376 pt wide screen; some action sheets can crash on iPad without a popover anchor; the camera preview
assumes portrait.

## Proposed outcome
iPad runs landscape only (full screen); no action / share sheet can crash for a missing anchor; main screens sit in
a centered column (≤ 900 pt); the product form is a form sheet; camera preview follows the screen. iPhone unchanged.

## Constraints
Next store build: low risk only. No API change. No master-detail rebuilds (follow-ups).

## Decision log
- 2026-10-14 — Keep `UIRequiresFullScreen = YES`: a landscape-only iPad app must opt out of Split View / Slide Over
  to pass App Store validation (multitasking requires all four orientations). Already in Info.plist since the first
  commit; verified by a unit test. iPadOS 26 deprecates the key but still honours it; revisit when resizing is required.
