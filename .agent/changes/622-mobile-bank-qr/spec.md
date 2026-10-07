# Spec — #622

1. Settings (new v2 Store group, and the old settings list) shows "Tài khoản ngân hàng" for MERCHANT and OUTLET_ADMIN; not for OUTLET_STAFF.
2. The screen lists the outlet's active accounts, default first; add, edit, delete (soft), set default; bank picker. Errors from the API show its message. Uses `GET/POST /api/merchants/{merchantId}/outlets/{outletId}/bank-accounts`, `PUT/DELETE …/{id}`.
3. Printer settings (where "Ghi chú máy in" is) has a switch "In QR chuyển khoản trên bill", default off, stored on the device.
4. Switch on and a default active account exists → the printed bill (RENT and SALE) ends with bank name, account number, holder name and a VietQR QR code (ESC/POS QR, error correction M, size readable on 58 and 80 mm paper).
5. Switch on and no account (or the load fails) → bill prints as before, no error dialog.
6. Switch off → printed bytes identical to before (test).
7. VietQR string: EMV TLV with `000201`, `010211` (static), merchant info `38` (GUID `A000000727`, BIN, account, service `QRIBFTTA`), `5303704`, `5802VN`, `6304` CRC16-CCITT (0xFFFF). Equal to web `generateVietQRString({accountNumber, accountHolderName, bankName, bankCode})` for the test vectors in the plan.
8. A bank with no BIN → no QR printed (text lines only).

Out of scope: amount in the QR, web receipt QR, server-side switch, syncing the mobile printer note with `Outlet.printNote`.
