# Intent: shop web UI bugs found by the web e2e (#733 #734 #735 #736 #741 #744)

Why: the web e2e (#727) marks six known bugs. Shop owners see a raw i18n key on the landing page, an English-only
/pricing with a hydration error, an edit button the API rejects for staff, a form that refuses rent-only products,
and (reported) a stale name after saving the profile.

Constraint: web and locale files only. No API change. Stacked on test/full-e2e-cases; must merge cleanly with #746
(hide "Thêm chi nhánh") in apps/client/app/outlets/page.tsx.
