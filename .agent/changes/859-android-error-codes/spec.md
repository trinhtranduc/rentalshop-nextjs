# Spec

1. `ApiErrorMessages.stringId` maps the 5 codes to new strings (`values` en, `values-vi` vi), texts equal to
   iOS `Localizable.strings`.
2. `{name}` placeholders are filled from `data.messageParams` (`{outlets}` → "Main (3), Kho (0)"). A sentence
   still holding a placeholder uses the code's `_NO_PARAMS` string
   (`PRODUCT_HELD_BY_OTHER_OUTLETS` → "Chi nhánh khác còn sản phẩm này; …").
3. Login: `AuthErrorMapping.messageRes("OUTLET_DEACTIVATED")` gives the sentence (general placement).
4. A 401 that ends the session with `OUTLET_DEACTIVATED` toasts that sentence, not "session expired"
   (`SESSION_REPLACED` keeps its own, everything else "session expired").
5. `ProductAccess.canCreate`: MERCHANT, OUTLET_ADMIN, OUTLET_INVENTORY, ADMIN yes; OUTLET_STAFF and UNKNOWN no
   (iOS: `products.manage` or `products.create`, which staff lost in #825).
