# Ảnh chia sẻ đơn: thứ tự phần tiền

Issue: #1345 · Author: Trinh Tran · Status: done · Created: 2026-10-30

## Problem

Ảnh chia sẻ đơn xếp phần tiền ngược chi tiết đơn (Tổng tiền thuê ở cuối), không có "Thu khi giao", và đơn có đợt cọc hiện "Đã thu / Còn phải thu" đổi theo trạng thái đơn và nhãn "Trễ N ngày" đổi theo ngày xem (lỗi #930). Chủ shop cần "thu gì cọc gì" đủ và đúng thứ tự chi tiết đơn.

## Proposed outcome

Phần tiền của ảnh đơn thuê, theo thứ tự: Tạm tính (có giảm giá) → Giảm giá → Tổng tiền thuê → Cọc (từng đợt Đã thu / Chưa thu, hoặc "Đã cọc", hoặc "Cọc: Chưa cọc") → Thu khi giao (cố định theo kế hoạch) → Thế chân. Đơn bán và đơn nháp theo mockup. Cùng một đơn ở RESERVED và PICKUPED cho cùng số.

## Affected users and systems

Chủ shop và nhân viên chia sẻ ảnh cho khách (mọi vai trò có nút Chia sẻ). iOS (`OrderShareImage.swift`, `OrderShareRenderer.swift`) và Android (`OrderShareModel.kt`, `OrderShareRenderer.kt`). Không API.

## Constraints

Không đổi API. Không đụng phiếu in nhiệt, phiếu web. Ghi chú đơn là bước sau. App cũ trên store giữ ảnh cũ.

## Open questions

- (đã chốt bởi chủ shop) mặc định của bảy câu trong mockup, artifact 9b56KwErJWiGpiyFEfyEY4, tab "Ảnh chia sẻ đơn: thứ tự tiền".

## Decision log

- 2026-10-30 — Công thức Thu khi giao = Tổng − Σ số tiền các đợt cọc theo kế hoạch (không VOID, không "rest"); không phải số "chưa thu" của chi tiết đơn. Xem plan.md "Phát hiện".
