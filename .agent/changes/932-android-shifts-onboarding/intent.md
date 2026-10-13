# Intent — #932 Android: my shifts shows hours next to late minutes; onboarding Skip below the status bar

Two small Android bugs found while testing #927 (PR #931). Owner approved 2026-10-13. Refs #906.

- **Ca và công của tôi**: a late record shows "muộn 117′" instead of its hours, so staff cannot see how long they worked.
  Want: in–out times and hours on every record; "muộn N′" in amber as extra info.
- **Old onboarding** (`newAuth` off): "Bỏ qua" sits under the status bar and cannot be tapped. Want: inside the safe area.

Constraints: Android only, no API change, visible emulator check.
