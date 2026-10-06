# Spec — #570

| Field | Before | After |
|---|---|---|
| `notes` | `RENT order for Amber Ramirez - RESERVED` | `Đơn thuê của Amber Ramirez` (`Đơn bán` for SALE; the status is left out, it goes stale) |
| `pickupNotes` | `Scheduled pickup on 10/5/2026` | `Hẹn giao ngày 05/10/2026` |
| `returnNotes` | `Expected return on 10/13/2026` | `Hẹn trả ngày 13/10/2026` |

Dates: `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', day/month: '2-digit', year: 'numeric' })`.
No other note in the script carries a date.
