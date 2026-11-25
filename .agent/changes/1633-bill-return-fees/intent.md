# Bill: phí trễ, phụ thu và số trả khách / thu thêm khi nhận trả

Issue: #1633 · Author: agent (owner asked) · Status: accepted · Created: 2026-11-23

## Problem

Owner, 2026-11-23: "phần phụ thu tại sao không có trên bill online và bill giấy?"

`Order.damageFee` (Phụ thu) and `Order.lateFee` (Phí trễ), entered at Nhận trả, and `cancelKeptAmount` (Phụ thu kept
when an order is cancelled, #1491) are on the order detail but on no bill:

- Bill online = the share image (iOS `Model/OrderShareImage.swift`, Android `domain/orders/OrderShareModel.kt`): the
  booking view; #1345 item 5 fixed its numbers so they do not change with the status.
- Bill giấy: iOS `Order.toPrintData`, Android `print/ThermalPrinter.kt` print no fee. The web slip
  (`apps/client/app/orders/receipt/receipt-model.ts`) prints `damageFee` as "Phụ phí", in the top rows, and no late fee.

Production (`main-real`) is the same.

## Proposed outcome

A rental with a late fee or a surcharge has a "KHI NHẬN TRẢ" block under the total on the share image and on the paper
bills (iOS, Android, web), ending with "Trả khách X" or "Thu thêm X". A cancelled rental that kept a surcharge has a
"ĐÃ HUỶ" block ending with "Hoàn cho khách X". Every other order prints and shares exactly as today.

## Affected users and systems

MERCHANT and staff who share or print a bill, and their customers. iOS, Android, web (`apps/client`). No API, no data.

## Constraints

- Money display rule: VND cases A–H in the approved mockup (tab "★ Bill: phụ thu khi nhận trả" of
  https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4), confirmed by the owner before the spec.
- Same rule and words on every bill and on both apps; iOS is the reference.
- Only fields the apps already receive. No API change.
- The apps reach customers with the next store builds.

## Decision log

- 2026-11-23 — Owner confirmed the mockup ("đồng ý"): cases A–F as drawn; G (collateral, no fee) gets no block; H
  (cancelled, surcharge kept) gets the block. This reverses the #1345 row "Phí trễ, phí hư, Khi nhận trả: Không thêm".
- 2026-11-23 — The block's amount is the whole return, `fees − collateral money − excess deposit`, without the
  RETURN_ADJUSTMENT payments: after the return those payments are the settlement itself (#1345: a bill does not change
  with what was paid).
