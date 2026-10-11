# Intent — Gia hạn uses the rental date calendar (#696)

Status: accepted (owner 2026-10-09: "lịch gia hạn thuê có thể dùng chung calendar chỗ chọn ngày thuê cho đồng bộ"; chose "Lịch nằm ngay trong sheet")

- Problem: Gia hạn used the system single-day picker; the cart's rental dates use the app's range calendar. Two different calendars for the same idea.
- Outcome: the Gia hạn sheet shows the cart's calendar inline, with pickup → current return shaded and the pickup fixed; a tap on a later day sets the new return day.
- Constraints: same PUT /api/orders/{id}, same availability check, extra rent and new total (#390, #425); shop-zone days (#596).
