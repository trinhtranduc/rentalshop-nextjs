# Admin merchant detail and plan detail in the new admin style

Issue: #882 · Author: Trinh Tran · Status: draft · Created: 2026-10-12

## Problem

The admin merchant detail page (`apps/admin/app/merchants/[id]/page.tsx`, its Quick Actions, plan card and the
dialogs it opens) and the plan detail (the view dialog on the Plans page) still look like the old admin. The other
detail pages use the portal style from #802 (tokens), #804 (shell), #806 (`DetailHeader`, `details.css`) and #807
(`ar-dialog`, `ar-dialog-footer`).

## Proposed outcome

Both screens use the same header, cards, pills and dialogs as the subscription detail page, at 1280px and 390px.
Every control, field and action stays; nothing behaves differently.

## Affected users and systems

`ADMIN` / `OPS` in `apps/admin`. Shared components in `packages/ui` that only admin uses
(`MerchantDetail`, `MerchantPlanManagement`, `MerchantLoyaltySection`, `PlanDialog`). No API, no mobile.

## Constraints

Presentation only. `apps/client` does not render these components, and the `ar-*` dialog classes only have CSS in
admin (`forms.css`), so the client app cannot change.

## Decision log

- 2026-10-12 — Quick Actions and Add-on move into the `DetailHeader` actions (same place as the subscription page); `MerchantDetail` keeps them by default for any other caller.
