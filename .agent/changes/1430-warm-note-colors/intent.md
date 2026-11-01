# Warm note colours back on order detail

Issue: #1430 · Author: Claude · Status: in-review · Created: 2026-11-01

## Problem

#1289 (aabad1e69) made the item note and the Notes section grey. The owner wants the old warm colours back.

## Proposed outcome

Item note box fill FFF7E6, ink 7A4A00. Notes section fill FFFBEB, ink 78350F. These are the exact values that commit replaced.

## Constraints

- The section band stays EEF0F4, from the same commit.
- "Ảnh khi giao" and the upload warning keep their own colours.
- Separate named constants per place on each app, not one shared. No change under `apps/api`, `prisma` or API packages.
