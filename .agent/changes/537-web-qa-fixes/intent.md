# Intent — #537 Fixes from the first browser QA of the shop web redesign

Issue: #537

The redesigned shop web had only been verified by lint, types, unit tests and a build. A run in a real browser
against a seeded local API (19 pages, 1440/390, light/dark, MERCHANT and OUTLET_STAFF) found three UI bugs.
Fix them without touching the API or shared packages.
