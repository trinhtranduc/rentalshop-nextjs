# Spec

- #733 `plans.features.loyalty` exists in locales/{en,vi,ja,ko,zh}/plans.json.
- #734 /pricing texts come from `plans.pricingPage.*` (five locales) through useTranslations / useLocale.
- #735 every number and price on /pricing is formatted with the page language (`apps/client/lib/pricing-format.ts`),
  so server and client render the same text.
- #736 the outlet edit button, disable and enable need `outlet.manage` (the permission PUT /api/outlets checks).
  The add button stays with #746.
- #741 the product form no longer requires a sale price (apps and API accept 0).
- #744 after a profile save the stored user, the form and the sidebar show the new name at once. The app already does
  this (`updateStoredUser` + `refreshUser`); the e2e re-seeded the login-time user on every reload.
