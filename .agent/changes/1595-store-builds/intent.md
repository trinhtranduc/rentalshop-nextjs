# Store builds iOS 1.2.8 / Android 0.1.14

Issue: #1595 · Author: Trinh Tran (owner) · Status: in-progress · Created: 2026-11-15

## Problem

The owner wants both apps built for the stores ("build 2 app để lên store"). `dev` does not build on Android:
four apostrophes in `values-de`, `values-fr`, `values-ko` `strings.xml` are not escaped (059b02ce3), and aapt2
fails in `:app:mergeDebugResources`.

## Proposed outcome

- A test fails on any unescaped `'` in an Android `strings.xml`; the four strings are escaped.
- iOS 1.2.8 (1511202601), Android 0.1.14 (16), higher than the last store build (#1519).
- A signed IPA and AAB in `~/Documents/AnyRent-builds/`.

## Affected users and systems

iOS and Android store builds. No API change.

## Constraints

- The owner runs the signed Android bundle task (signing files) with `!` and uploads both builds.
- Built on top of #1594 (bill footer), which the owner asked for in the same session.

## Open questions

- None.

## Decision log

- 2026-11-15 — Apostrophe fix lives in this change: without it there is no Android build (Claude).
