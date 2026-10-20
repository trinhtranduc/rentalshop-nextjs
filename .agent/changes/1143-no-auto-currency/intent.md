# Opening Settings must not change the shop currency

Issue: #1143 · Author: Trinh Tran · Status: approved · Created: 2026-10-20

## Problem

Opening Settings → Thông tin cửa hàng in the web client sends `PUT /api/settings/currency` from the UI
language (vi → VND, other → USD) and shows "Cập nhật tiền tệ thành công!". An owner using English gets the shop
silently switched to USD. The sync (commit 7d14d2958, 2025-11-18, kept by #528/#539) is also the only thing that
makes a shop VND: `Merchant.currency` defaults to `USD` and sign-up never sets it.

## Proposed outcome

- Sign-up sets the shop currency once from the sign-up language: vi → VND, any other language → USD.
- Opening Settings or changing the UI language never sends a currency update.

## Affected users and systems

New `MERCHANT` sign-ups (web, Google, iOS, Android) and web Settings. API `POST /api/auth/register`,
`POST /api/auth/register/merchant-google`, `apps/client`, `packages/ui` RegisterForm.

## Constraints

No migration, no change to existing shops' stored currency, no new currency control. Old apps keep working
(no new required field). Admin-created merchants unchanged.

## Decision log

- 2026-10-20 — set the currency at sign-up, remove the client sync (owner, "đồng ý").
