# Thế chân: tách 2 phần (Đang giữ / Phát sinh hôm nay)

Issue: #1273 · Author: Trinh Tran · Status: approved (chủ chốt mockup) · Created: 2026-10-27

## Problem

Màn Tổng quan → Thế chân trộn trong một danh sách hai loại dòng: "Đang giữ thế chân" (trạng thái, shop đang cầm bao nhiêu) và "Nhận / Trả thế chân" (dòng tiền phát sinh trong ngày). Đơn 490268 · Chị Diệu (500.000) hiện cả hai dòng, là cùng một khoản nhìn từ hai góc nên chủ hiểu nhầm. Tổng cuối "Tổng các dòng · 10: 2.400.000" chỉ cộng các dòng +/−, không cộng các dòng "Đang giữ".

## Proposed outcome

Hai phần có tiêu đề, chú thích và tổng riêng, theo mockup đã chốt (tab 2 "Thế chân: tách 2 phần", T1…T31). Số liệu và API không đổi; chỉ đổi cách trình bày. iOS là chuẩn, Android và web theo.

## Affected users and systems

Chủ shop và vai trò xem được tiền (`analytics.view.revenue`). Nhân viên không xem tiền: không có danh sách "đang giữ" (API trả null) nên không có số tổng mới. Apps: iOS, Android, web client. Không đổi api, prisma, admin.

## Constraints

- Không đổi API, không đổi trường; tổng tính trên client từ danh sách đã có.
- Danh sách "đang giữ" bị API cắt ở 500 dòng (`packages/database/src/outlet-operations.ts`, HELD_LIMIT): khi `count` lớn hơn số dòng nhận được thì KHÔNG hiện tổng tiền (không hiện tổng sai), vẫn hiện số đơn từ `count`.
- Màu, dấu +/−, id thử nghiệm hiện có giữ nguyên. Ngày theo ngày dân dụng Việt Nam.
- Chữ đúng như mockup. Thứ tự: Phần 1 "Đang giữ" trước, Phần 2 sau (chủ chưa quyết đảo; đảo chỉ là đổi vài dòng).

## Out of scope

Đổi thứ tự, thêm dự báo, thêm màn mới, đổi API.
