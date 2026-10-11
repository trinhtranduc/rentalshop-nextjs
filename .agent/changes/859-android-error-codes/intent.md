# Intent: Android branch error codes (#859) + staff has no "new product" on Home (#863)

- What: the Android app shows the user's-language sentence for the branch error codes of #823
  (`OUTLET_DEACTIVATED`, `PRODUCT_SHARED_FIELDS_MERCHANT_ONLY`, `PRODUCT_DELETE_MERCHANT_ONLY`,
  `PRODUCT_HELD_BY_OTHER_OUTLETS` with branch names, `OUTLET_HAS_OPEN_ORDERS`), and OUTLET_STAFF no longer
  sees the "+" new-product button on Home.
- Why: today Android shows the API's English text or "session expired"; staff see a button whose create
  the API refuses (#825). iOS (PR #862, `ProductAccess.canCreate`) is the reference.
- Constraints: Android only, no API change. Texts exactly as iOS / `locales/{vi,en}/errors.json`.
  Refs #823.
