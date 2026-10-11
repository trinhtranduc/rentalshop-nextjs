# Plan

1. One commit per issue, locale files first.
2. Pure helpers with jest tests: pricing-format, outletActions(canManage), validateForm.
3. Remove the KNOWN mappings; run the web e2e areas public, products, settings and roles 10/11.
4. PR into test/full-e2e-cases; no API compatibility impact (web only).
