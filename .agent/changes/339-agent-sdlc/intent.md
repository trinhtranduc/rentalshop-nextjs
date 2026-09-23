# Shared agent SDLC workflow

Issue: #339 · Author: agent · Status: in-progress · Created: 2026-09-23

## Problem

Coding agents only had CLAUDE.md. Planning, issue tracking, and review were not files another agent could follow. Pull requests could open with no issue.

## Proposed outcome

AGENTS.md is the shared instruction file. CLAUDE.md only points at it. A PR into dev or main fails unless the body links an issue with Fixes, Closes, or Resolves. Each change can store intent, spec, and plan under .agent/changes/.

## Affected users and systems

Agents and reviewers. No product apps, APIs, or mobile clients.

## Constraints

Do not change product behavior. Do not commit unrelated local work.

## Open questions

None.

## Decision log

- 2026-09-23 — PR targets dev, not main (human).
