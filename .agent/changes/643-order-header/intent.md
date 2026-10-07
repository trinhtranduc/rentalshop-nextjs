# Calmer order detail header

Issue: #643 · Status: accepted · Created: 2026-10-07 · Mockup: ./mockups/header-truoc-sau.png (right = target)

## Problem
The order detail header (new UI) feels cluttered (owner, iOS screenshot 2026-10-07): status pill and customer name compete on one line; the phone is a full-width grey button; the first step label "Đã đặt 14:33 14/09" wraps and mixes time and date; the "Lịch thuê 01/10 → 07/10 · 7 ngày" row repeats the dates of the steps; days have no weekday.

## Outcome (approved, owner "chốt" 2026-10-07)
- Title "Đơn thuê #<number>" / "Đơn bán #<number>"; ⋯ unchanged.
- Customer name large, phone small under it; a round green call button on the right (tel:), replacing the grey phone bar.
- One light box: status pill + "N ngày · trả sau K ngày" (or "trả hôm nay" / "trễ K ngày"); three steps with a two-line label each: "Đặt / T2 14/09", "Đã giao / T4 01/10" (accent when done; "Giao" while pending), "Trả / T3 07/10" ("Đã trả" when done). No time on the steps.
- The "Lịch thuê" row is removed. Sale orders: no steps, just the pill and the date.
- iOS reference, Android matches. Mockup: before/after attached in the change folder when work starts.

## API impact review
None.

