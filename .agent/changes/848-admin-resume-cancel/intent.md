# Intent (#848)
Admin can Suspend a subscription but has no way to turn it back on, although the dialog says "you can reactivate it later". A TRIAL subscription has no Cancel. Found in the admin billing e2e (2026-10-11).
Constraint: web admin only, no API change (installed apps untouched). Match the #802 admin design (same buttons / ConfirmationDialog as Suspend).
