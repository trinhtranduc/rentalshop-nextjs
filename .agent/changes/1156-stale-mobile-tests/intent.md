# Stale mobile e2e tests

Issue: #1156 · Author: Trinh Tran (agent) · Status: done · Created: 2026-10-20

## Problem

`docs/TODO.md` lists mobile e2e tests that no longer match the shipped screens: the Android calendar and
"Việc cần làm" checkers read order numbers the rows stopped showing (#893), the iOS soft check still looks for
"gần nhất trước" (#1025 relabelled it "mới nhất trước"), and `test1dStockFlow` / `android-flow-stock.sh` were updated
for #1068 but never run. A red run that is only stale hides real regressions.

## Proposed outcome

Every listed test runs green, visibly, on a local seeded stack, with its expectations taken from the current UI
(iOS is the reference). No app code changes.

## Affected users and systems

iOS UI test target, Android adb flows and their Node checkers. No API, no data model.

## Constraints

Tests only. A real app bug stops the work and is reported. Vietnam civil days.
