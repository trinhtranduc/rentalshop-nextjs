# Intent — #570 seed notes in Vietnamese

`scripts/regenerate-entire-system-2025.js` wrote order notes in English with `toLocaleDateString()`
("Scheduled pickup on 10/8/2026"): US format, in the process time zone. The owner saw them on the web
order page (#560) and asked for Vietnamese ("Script seed -> thử việt nam").

Outcome: notes read "Đơn thuê của <khách>", "Hẹn giao ngày 08/10/2026", "Hẹn trả ngày 16/10/2026",
with dd/MM/yyyy of the Vietnam civil day (Asia/Ho_Chi_Minh), whatever TZ the seed runs in.

Constraints: seed only a fresh local database of our own; no app/API change.
