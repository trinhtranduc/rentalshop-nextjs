# Spec — #545 Chi nhánh

Issue: #545 · Status: accepted · Intent: ./intent.md

## /outlets

1. Title "Chi nhánh · {total}" (count without a search), "Thêm chi nhánh" (primary).
2. Card: search (debounced 300 ms → `?q=`, the API searches name / city / phone), then a table from 1024px
   (Chi nhánh + Mặc định tag + "n nhân viên", Địa chỉ = address, city, state, zip, country; SĐT; Trạng thái
   Đang mở / Tạm ngưng; Ngày tạo `dd/MM/yyyy` Vietnam day; actions) and a list below 1024px.
3. URL: `q`, `sortBy` (`name` | `createdAt`, default `createdAt`), `sortOrder` (default `desc`), `page`, `limit` (10/20/50/100, default 20).
4. Row actions: "Sửa"; ⋯ Xem chi tiết, Tài khoản ngân hàng (→ `/outlets/{id}/bank-accounts`), Tạm ngưng (confirm) or
   Mở lại (no confirm, as before). The default outlet has neither.
5. Thêm: tên (required), SĐT, địa chỉ (số nhà đường, thành phố, tỉnh, mã bưu chính, quốc gia), mô tả → `createOutlet`
   with `merchantId`. Sửa: same + ghi chú in trên phiếu thuê (≤ 500, counter) → `updateOutlet(id, {id, …, printNote})`.
6. Xem chi tiết: name, tags, phone, address, description, print note, created; links to bank accounts and Sửa.
7. A signed-in user without a merchant id sees the session note (as before).

## /outlets/[id]/bank-accounts

8. Back link "← Chi nhánh", title "Tài khoản ngân hàng", subtitle "Chi nhánh {name}" (`#{id}` until the name loads).
9. Table (list under 768px): chủ tài khoản + Mặc định, số tài khoản (grouped in fours, copy button with the old toast),
   ngân hàng, chi nhánh ngân hàng, Đang dùng / Tạm ngưng, Sửa / Xoá (manage only).
10. Add / edit: shared BankAccountForm in the shared dialog; delete: themed confirm with the old texts. Same toasts.
11. No `bankAccounts.view` → no-access note; a non-numeric id → error state without a fetch.

## Model (`outlets-model.ts`, pure)

`parseOutletParams`, `nextSort`, `outletAddress`, `outletFormFrom`, `validateOutlet`, `outletCreatePayload`,
`outletUpdatePayload`, `outletActions`, `formatOutletDate`, `parseOutletId`, `groupAccountNumber`.

## Out of scope

Nav labels, deleting outlets (no UI today), the shared bank form.
