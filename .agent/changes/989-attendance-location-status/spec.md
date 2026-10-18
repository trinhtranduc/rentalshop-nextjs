# Spec — Attendance location setup status

Issue: #989 · Status: implemented · Intent: ./intent.md

## Behavior
1. Loaded settings with either coordinate null or undefined display the translated “Chưa đặt vị trí” warning badge.
2. Loaded settings with both coordinates, including zero, display the translated “Đã đặt vị trí” positive badge.
3. Unknown or failed settings display a dash. QR status and radius remain independent.
4. The existing Mở link opens that outlet's settings for configuration.

## API and data
No API change. Use existing latitude and longitude fields; retain role and outlet scope.

## Out of scope
Saving coordinates, new network calls, app changes, migrations, permission changes.

## Acceptance
Location model checks cover missing/partial/zero coordinates and unknown settings; all five locales share keys. Exercise visible badges and the existing configuration link.
