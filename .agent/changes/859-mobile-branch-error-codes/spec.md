# Spec (iOS)
- `APIErrorCode` gets the five codes, an English default and their HTTP status (403 / 409 as `packages/utils/src/core/errors.ts`,
  `OUTLET_DEACTIVATED` 403).
- `vi-VN.lproj` and `en.lproj` `Localizable.strings` get the five keys with the web texts.
- `APIErrorResponse` also reads `data.messageParams` (string values; any other `data` shape is ignored, never a decode error).
  `{name}` placeholders in the sentence are filled from it. A sentence left with a placeholder uses `<CODE>_NO_PARAMS`:
  "Chi nhánh khác còn sản phẩm này; …" / "Another branch still has this product; …".
- `DELETE /api/products/:id` keeps `data` of the error body so the names reach the alert.
- Login (403 `OUTLET_DEACTIVATED`) shows the sentence through the existing code path. A signed-in 401 `OUTLET_DEACTIVATED`
  signs out and the alert says the branch is off (`SessionEndReason`), not "session expired".
