# Dòng Cài đặt ghi số chi nhánh cũ sau khi tắt chi nhánh

Issue: #1331 · Status: accepted · Created: 2026-10-31

## Problem

Chủ shop có 2 chi nhánh, tắt 1: dòng "Thông tin cửa hàng" vẫn ghi "2 chi nhánh", màn bên trong ghi "CHI NHÁNH · 1".

Issue đoán `GET /api/outlets?limit=1` tính cả chi nhánh đã tắt. Đo trên API cục bộ thì không phải: bỏ `isActive` thì API chỉ đếm chi nhánh đang hoạt động (2 rồi 1 sau khi tắt; `isActive=all` mới ra 2), `main-real` cũng vậy.
Nguyên nhân thật có ở cả iOS và Android: số trên dòng chỉ được đọc lại mỗi 10 phút (#674), nên trong 10 phút đó dòng giữ số cũ dù màn bên trong đã có số mới.

## Proposed outcome

Mở màn "Thông tin cửa hàng" xong quay lại, dòng Cài đặt ghi đúng số chi nhánh màn đó vừa hiện.

## Affected users and systems

Chủ shop (MERCHANT). iOS, Android. Không đổi API.

## Constraints

Giữ nhịp đọc 10 phút của #674, không thêm request. iOS là chuẩn.

## Decision log

- 2026-10-31 — Màn trong báo số cho dòng thay vì đọc lại mỗi lần hiện (giữ #674). Chưa mở màn trong thì dòng có thể lệch tối đa 10 phút, như các số tóm tắt khác.
