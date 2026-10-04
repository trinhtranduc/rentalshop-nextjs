# Spec — Mobile UI round 2

Issue: #385 · Status: accepted · Intent: ./intent.md

Each phase issue holds its own numbered behaviors: #386, #387, #388, #389, #390, #391. Shared rules:

1. Each group sits behind its flag; with the flag off, the screen is unchanged.
2. API changes are additive; response shapes stay compatible with installed apps.
3. iOS and Android ship the same behavior in the same PR.
4. Day logic uses device-zone day keys; money uses `1.150.000đ`.
5. Role limits hold in the UI and the API, e.g. OUTLET_STAFF sees no product prices and cannot delete customers.
