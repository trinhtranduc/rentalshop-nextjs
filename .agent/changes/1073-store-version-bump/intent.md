# Intent — #1073 store version numbers

The store builds made after release 2026-10-18 (`d0e90aec6`, #1049) used command-line overrides:
iOS 1.2.3 (1810202601), Android 0.1.9 (10). The repo still says iOS 1.2.2 (1410202601) and Android 0.1.8 (9),
so the next build would reuse or go below numbers the stores already have.

Owner decision (2026-10-19): record these numbers in code. No code, API or data change.
