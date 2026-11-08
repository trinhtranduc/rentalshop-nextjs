# Spec — Hủy đơn chưa giao với phụ thu

Issue: #1491 · Status: accepted · Intent: ./intent.md

## Behavior

Ký hiệu: C = `depositAmount` (đã thu), K = phụ thu (`cancelKeptAmount`). Chỉ đơn RENT đang `RESERVED`, không có kế hoạch cọc.

1. Hủy với `cancelKeptAmount` K, 0 ≤ K ≤ C: đơn thành `CANCELLED`, lưu `cancelKeptAmount = K` và `cancelledAt`; hoàn khách = C − K.
2. K > C hoặc K âm hoặc không phải số: 400 `CANCEL_AMOUNTS_MISMATCH`, đơn không đổi.
3. Role ngoài `CANCEL_KEEP_ROLES` gửi K > 0: 403 `INSTALLMENT_FORBIDDEN_ROLE`. Hủy với K = 0 hoặc không gửi K: như hiện tại.
4. Không gửi K (app cũ) hoặc K = 0: hoàn hết, doanh thu đơn hủy 0, `depositAmount` không đổi.
5. Doanh thu: ngày tạo đơn có sự kiện +C; ngày hủy có sự kiện `RENT_CANCELLED` = −(C − K). Doanh thu của đơn hủy = K.
6. Case A: đơn 300.000, cọc 300.000, K 100.000 (tạo 05/01, hủy 08/01): thu cọc 05/01 là 300.000; ngày 08/01 hoàn 200.000; doanh thu đơn 100.000.
7. Case B: cọc 100.000, K 100.000: hoàn 0; doanh thu đơn 100.000.
8. Case C: cọc 100.000, K 300.000: bị chặn (spec 2), đơn vẫn `RESERVED`.
9. Case D: cọc 300.000, K 0: hoàn 300.000; doanh thu đơn 0 (như hiện tại).
10. Đơn đã hủy có K > 0 không xóa được (`CANCELLED_ORDER_KEEPS_AMOUNT`, đã có sẵn).
11. Hủy đơn `PICKUPED`, đơn SALE, đơn có kế hoạch cọc: không đổi (không gửi sheet mới; đơn có kế hoạch giữ cách của #1199).
12. Hủy trùng (hai request cùng lúc): chỉ một lần ghi `cancelKeptAmount` (như #1253).
13. iOS, Android, API cho cùng số ở spec 1, 5-9. Sheet: mặc định K = 0, nhập quá cọc không cho lưu; hiện "Hoàn cho khách" = C − K.
14. Chi tiết đơn hủy hiện "Tiệm giữ lại" và "Hoàn cho khách" khi K > 0 (đã có cho đơn cọc theo đợt).
15. Web (`apps/client`): hủy đơn RENT `RESERVED` không có kế hoạch cọc và C > 0 thì hiện `CancelWithKeptDialog` (không còn hộp xác nhận thường); mặc định K = 0; nhập quá C không cho lưu; hiện "Hoàn cho khách" = C − K. Role ngoài MERCHANT/OUTLET_ADMIN/ADMIN không thấy ô nhập (hủy như hiện tại).
16. Web: đơn thường đã hủy có K > 0 hiện "Tiệm giữ lại" K và "Hoàn cho khách" C − K (hiện chỉ có cho đơn có kế hoạch cọc).
17. Web, iOS, Android và API cho cùng số ở các ca A-D (spec 6-9).
18. Đơn thường có C = 0: hủy như hiện tại (không hiện ô phụ thu, vì không có gì để giữ).

## Out of scope

- Trang admin (`apps/admin`).
- Thu thêm khách lúc hủy (phụ thu luôn ≤ cọc).
- Hủy đơn đã giao có thế chân.
- Gộp "cọc" và "thế chân" (#1490).
- Ghi payment mới cho đơn thường.

## API and data

- Không thêm field mới: dùng lại body `cancelKeptAmount`, `cancelNote` và cột `Order.cancelKeptAmount`, `cancelledAt` của #1199. Không migration mới.
- `planCancellation`: với đơn RENT `RESERVED` không có kế hoạch cọc, số đã thu = `depositAmount`; kiểm K ≤ số đó. Ghi `cancelKeptAmount` và `cancelledAt` sau khi đổi trạng thái; không ghi payment, không gọi `recomputeDepositFromPayments`.
- Doanh thu (`revenue-calculator.ts`): `totalCollected` của nhánh hủy chỉ đã cọc trừ `cancelKeptAmount`. Merchant/outlet scope và auth giữ nguyên.
- Phản hồi đơn trả `cancelKeptAmount` cho client có capability `installments`, như #1199 (kiểm tra app gửi header này trước khi làm sheet).

## Acceptance

- [ ] Mỗi dòng Behavior có test (xem `plan.md`)
- [ ] iOS, Android và web (`apps/client`) làm cùng thay đổi, cùng số
- [ ] Chuỗi mới (nếu có) có đủ `locales/{en,vi,ja,ko,zh}`; mã lỗi mới: không có
- [ ] Đơn đã hủy trước đó, đơn SALE, đơn PICKUPED, đơn cọc theo đợt không đổi
- [ ] Doanh thu hủy theo ngày giờ Việt Nam (`timezone-dates`)
- [ ] Dòng `planned` trong `.agent/api-changes/LOG.md`; bảng `## API compatibility` trong PR
