# Plan — Admin merchant detail and plan detail in the new admin style

Issue: #882 · Status: draft · Spec: ./spec.md

## Steps

1. Before screenshots (headed Chrome) against a local API and own seeded DB.
2. Static test `tests/admin-merchant-plan-detail-style.test.ts` (fails first).
3. `packages/ui/.../Merchants/components/MerchantDetail.tsx`: export `MerchantQuickActions`, add `showActions` (default true), portal card classes.
4. `MerchantPlanManagement.tsx`, `MerchantLoyaltySection.tsx`: `ar-pill`, token boxes, `ar-dialog` on the four dialogs.
5. `apps/admin/app/merchants/[id]/page.tsx`: `DetailHeader` with the actions.
6. `apps/admin/app/plans/page.tsx`: plan detail and Stripe Prices dialogs; `PlanDialog.tsx`: `ar-dialog` surface.
7. `apps/admin/app/forms.css`: a danger variant for `ar-dialog-footer`; `details.css` if needed.
8. After screenshots; verify (tests both TZ, tsc admin, lint, admin build).

## Files

- `apps/admin/app/merchants/[id]/page.tsx`, `apps/admin/app/plans/page.tsx`, `apps/admin/app/forms.css`
- `packages/ui/src/components/features/Merchants/components/{MerchantDetail,MerchantPlanManagement,MerchantLoyaltySection,index}.tsx`
- `packages/ui/src/components/features/Plans/components/PlanDialog.tsx`
- `tests/admin-merchant-plan-detail-style.test.ts`

## Risks

Visual only. The client app does not use these components.

## Rollback

Revert the PR.
