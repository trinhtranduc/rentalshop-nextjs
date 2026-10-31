# Intent: #1402

`VietQrTest.onlyOwnersAndOutletAdminsManage` fails on `dev`: it still expects OUTLET_ADMIN to manage bank accounts, but `BankAccountRules.canManage` became MERCHANT only in 27f984ff6 (#1319). Owner's rule: only MERCHANT edits; OUTLET_ADMIN and staff view only.

Constraint: test change only, no production code, no API path.
