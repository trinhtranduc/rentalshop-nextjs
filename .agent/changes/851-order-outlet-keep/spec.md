# Spec
- PUT fills `outletId` from the user only for outlet roles (`isOutletRole`); for them it is their own outlet, as before.
- MERCHANT / ADMIN without `outletId` in the body: the order keeps its outlet. Sending `outletId` explicitly still moves it (checks unchanged).
- POST unchanged (a new order without `outletId` still goes to the merchant's default outlet, #398).
