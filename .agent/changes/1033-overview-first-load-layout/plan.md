# Plan
1. Failing tests in `POS ADBDTests/PadLayoutTests.swift`: a column with a label + spinner stays full width / 900pt;
   `OverviewV2ViewController` in a 393pt window lays out at 393pt on its first pass (loading state).
2. `Utils/PadLayout.swift`: full-width rule at `.required - 1`.
3. `POS ADBDTests` on a simulator; first-load recording before / after on a fresh simulator; Android emulator check.
