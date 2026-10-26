# Web Tổng quan hiện cọc theo giai đoạn sắp thu

Issue: #1221 · Status: in-progress · Created: 2026-10-26

## Problem
iOS/Android hiện dòng "Cọc theo giai đoạn sắp thu" từ `futureInstallments` (#1199). Web chưa.

## Proposed outcome
Web Tổng quan hiện cùng dòng, cùng chữ en/vi, cùng quy tắc ẩn/hiện như iOS (`OverviewV2ViewController.swift` chartCard). Số khớp `curl analytics/period`.

## Affected users and systems
Chủ shop / quản lý có quyền xem doanh thu, app `client`. Không đổi API.

## Constraints
Chỉ thêm đúng dòng iOS có. Không thêm biểu đồ. Ngày theo ngày dân sự Việt Nam (khoảng của biểu đồ).

## Decision log
- 2026-10-26 — Tổng = cộng mọi `futureInstallments` của chuỗi biểu đồ (như `futureInstallmentsTotal` của iOS), không lọc lại theo ngày; API đã giới hạn theo khoảng.
