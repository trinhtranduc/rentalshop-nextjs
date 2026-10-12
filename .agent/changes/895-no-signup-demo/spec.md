# Spec

Status: done

- `POST /api/auth/register` (merchant): creates merchant, default outlet, default category, MERCHANT user, trial subscription. No product, outlet stock, customer or order. Response unchanged.
- `registerUser` / `registerMerchantWithTrial` (`packages/database/src/registration.ts`): same, no onboarding sample rows.
- Google sign-up (`register/merchant-google`) and admin `POST /api/merchants`: already create no samples; unchanged.
- Existing shops keep their demo rows (no migration, no cleanup).
- Dead code removed: `seedDemoData`, `createMerchantOnboardingSampleData`, `shouldCreateOnboardingSampleData`, `getSampleCopy` + sample copy, `scripts/test-onboarding-sample.ts`. Kept: `ONBOARDING_SAMPLE_MARKER` (marks rows existing shops have), outlet/category localization.
