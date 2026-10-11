# #859 — Mobile apps translate the multi-branch error codes

**Want:** the iOS and Android apps show the web's sentence for the branch error codes from #823:
`OUTLET_DEACTIVATED`, `PRODUCT_SHARED_FIELDS_MERCHANT_ONLY`, `PRODUCT_DELETE_MERCHANT_ONLY`,
`PRODUCT_HELD_BY_OTHER_OUTLETS` (with the branch names), `OUTLET_HAS_OPEN_ORDERS`.
**Why:** today the apps show the API's English text or a generic sentence; a staff user of a turned-off branch is
signed out with "session expired" instead of being told the branch is off.
**Constraint:** no API change. Texts exactly as `locales/{vi,en}/errors.json`. iOS first (this PR, `Refs #859`);
Android after PR #828 lands in dev.
