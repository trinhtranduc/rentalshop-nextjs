# Intent: 728 + 729 subscription routes and plan-limit counts

- Routes that declare `requireActiveSubscription: false` must answer an expired / paused / past-due / ended merchant (and its staff and kho), so the shop can see why and renew. Today `authenticateRequest` checks the subscription anyway (#728).
- A deleted customer, outlet or order must free its plan-limit slot, like a deleted product (#729).
- Constraints: no new policy; login, every route without the flag and the ADMIN bypass stay as they are; users' `isActive` rule is unchanged (owner question Q3).
