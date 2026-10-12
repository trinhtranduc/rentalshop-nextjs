# #828 iOS: merchant picks the branch on Home

- **What:** a MERCHANT with two or more active outlets picks the branch it works in from Home; the whole app then uses it.
- **Why:** shops with several branches (#823) could only work in the default outlet on mobile.
- **Constraints:** owner-approved mockup https://claude.ai/artifact/5XGw2cA7YrJYJrAVMuG1ft; owner change 2026-10-11: the
  button is on Home only (Orders, Calendar, Overview follow the choice, no button there). No API change. iOS first,
  Android follows (`mobile-parity`, iOS is the reference).
