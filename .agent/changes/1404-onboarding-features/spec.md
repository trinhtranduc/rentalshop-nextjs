# Spec — 3-page onboarding

Issue: #1404 · Status: in-progress · Intent: ./intent.md

## Behavior

1. With `newAuth` on, first login shows the 3 new pages; with it off, the old screen shows, unchanged.
2. Finishing or skipping marks onboarding done (same storage) and opens Home. The pages show once.
3. Page 3 hides Bỏ qua and shows Bắt đầu. Pages 1 and 2 show Bỏ qua and Tiếp.
4. The copy is exactly:
   - 1. VI "Quên tên đồ? Chụp là ra." / "Đồ đã có ảnh trong kho là AI tìm được." EN "Forgot the name? Just snap it." / "AI finds any item with a photo in your stock."
   - 2. VI "Trùng lịch, app báo trước." / "Món nào hết ngày nào, nhìn là biết." EN "Double-booked? You'll know first." / "See which item is out on which day."
   - 3. VI "Giao ai, trả ai? Mở Lịch là thấy." / "Còn thu bao nhiêu cũng hiện ngay trên đơn." EN "Who's due today? Open Calendar." / "What's left to collect shows on each order."
5. Vietnamese devices get Vietnamese, all others English. Every word on screen is a string in both languages.
6. Sample data is fixed per language: dress, suit, camera; VND-style numbers in vi, USD in en, regardless of the shop.
7. A page's own effect runs ~1.5s, holds ~4s, and repeats while the page shows.
8. The photo travels only on arrival from another page. A repeat, the first page on open, and return from background replay only the page's own effect.
9. Tiếp and swipe both play the target page; going back plays it again. A swipe past either end does nothing.
10. Swiping mid-run ends the page being left and cancels its cycle at once. A stale timer never acts.
11. Leaving the screen or going to background stops all cycles. Returning replays the current page's effect.
12. Reduce Motion (iOS), animator scale 0 / reduce-animation setting (Android): finished state, no loop, no travel.
13. Page 1: scan line, then 3 dresses with a green tick, one by one.
14. Page 2: two suit chips slide into the same day, the cell shakes lightly and turns red, the warning appears with "Vẫn tạo đơn".
15. Page 3: rows for dress, suit, camera appear one by one, "còn thu" counts from 0.
16. No clipped text on 320×568 or a large iPhone, in either language. The stage shrinks before the text does.

## Out of scope

Mockup-only controls (replay, Tự chạy, safe-zone). Real photos. The first-run guide. Dark mode on iOS (the app is locked Light).

## API and data

No API change. No path under `apps/api`, `packages/`, `prisma/`, and no API env var.

## Acceptance

- [ ] Behaviors 4, 5, 6 have string tests on both apps, including Android = iOS for the same words
- [ ] Behaviors 7 to 12 have cycle tests on both apps
- [ ] Behaviors 13 to 15 have timeline tests (start state, finished state, order)
- [ ] Behavior 16 has a metrics test and is watched on devices
- [ ] Both apps build; recordings saved to `~/Documents/AnyRent-shots/onboarding-v2/`
- [ ] New user-facing strings: en and vi only, the apps have no other languages
