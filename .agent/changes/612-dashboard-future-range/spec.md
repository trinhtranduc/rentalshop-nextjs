# Spec — #612
1. Picker max = today + 365; no clamping of from/to to today.
2. Quick picks: 7 ngày tới (today..+6), 30 ngày tới (today..+29), Tháng sau (next calendar month).
3. forecastBar sums expectedCollected of series days >= today; returns `until` = last such day; text "… hôm nay" when until = today, else "… đến DD/MM".
4. Past days never count.
