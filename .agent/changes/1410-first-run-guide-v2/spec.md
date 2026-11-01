# Spec — First-run guide v2

Issue: #1410, #1411, #1412 · Status: in-progress · Intent: ./intent.md

## Behavior: card and collapse (PR 1, #1410)

1. The current step is a highlighted row: number in a filled circle, bold title, one solid blue button "Thêm sản phẩm →" / "Thêm khách hàng →" / "Tạo đơn →". Other open rows show their number and dim but stay tappable and run that step. Done rows show a green tick and a struck title.
2. The button bounces once when the card first appears, no loop. Off under Reduce Motion (iOS) or animator scale 0 (Android).
3. "Để sau" collapses the card to a slim row "Bắt đầu n/3 ›" at the top of the list, stored in `firstRunGuide.collapsed.<shop>`. It stays across launches, keeps counting, hides during search and reopens the card on tap. No toast.
4. The first order ends the slim row the same way as the card: the finish card once, then nothing.
5. Bỏ qua is gone from the card and the bubbles. `firstRunGuide.skipped.<shop>` means "hidden from Settings" and only Settings sets it, after the confirm "Ẩn hướng dẫn? Mở lại trong Cài đặt." It hides the card and the slim row. The Settings row stays; a row of its sheet clears both marks and runs the step, so Thoát returns to the card. The toast is gone.
6. Until PR 2 / PR 3 land, the old bubble's button reads "Để sau" and only ends the run.

## Behavior: the walk (PR 2 #1411, PR 3 #1412)

7. Plan, in order: 1 photo, 2 name, 3 price, 4 Lưu sản phẩm, 5 customer row, 6 new customer, 7 Lưu và chọn, 8 dates, 9 Tạo đơn. Then the real confirm sheet with no bubble. Quantity has no bubble.
8. Totals: rent 9; rent, shop has customers 7 (no 6, 7: picks from the list, no bubble on the picker); sale 8 (no dates); sale, shop has customers 6. The counter is the position in that plan. A product run starts at 1; opening the cart starts wherever the cart's data says.
9. Tiếp is visibly disabled until valid, and goes solid live. Photo: at least 1 (guide only). Name: the form's rule. Price: per rental or per day above 0 (guide only). New customer: `CustomersV2Logic.validate` / the Kotlin equivalent, nothing else.
10. Bubbles where the user taps a real control (4, 5, 7, 8, 9, and 6 on the picker): Tiếp never acts. It flashes the ring and scrolls to the control. A disabled Tiếp does the same. A tap on the dim only flashes the ring.
11. "Thoát hướng dẫn" on every bubble returns to the card and does not end the guide. If a form has typed content it first asks "Bỏ nội dung đang nhập?". The cart keeps its content and does not ask.
12. Leaving and returning: forms have no draft, so reopening starts them over. The cart is data-driven: returning shows the bubble its data owes. Back gesture and the back button are not blocked and go to the previous screen's bubble.
13. Duplicate phone: the form shows the existing customer as today, the bubble leaves so it does not cover it, and "Chọn khách này" returns to the cart.
14. iOS, camera denied: the existing permission line, Mở Cài đặt and Thư viện ảnh in the bubble; Tiếp stays disabled. Android's form has no camera.
15. Keyboard: the bubble sits above it. Tiếp moves the cursor to the next field and the form scrolls first. A missing anchor skips its bubble silently. iPad: card only.

## Out of scope

Normal form rules, the 3 onboarding pages, "Enjoying AnyRent?", notification prompts, web, #984.

## API and data

No API change. Same two GETs as #1393. One new local key per shop: `firstRunGuide.collapsed.<merchantId>`. Marks of the old build keep their meaning: a phone with `skipped` stays hidden and reopens from Settings.

## Acceptance

- [ ] Behaviors 1–6 unit tested on both apps; Settings hide and collapse in `FirstRunGuideUITests` and the Android script
- [ ] Behaviors 7–15 unit tested where pure (`FirstRunCoachTests`, `FirstRunCoachTest`)
- [ ] The walk fills every required field, photo included, on a shop from `POST /api/auth/register`, in VI and EN, on iPhone SE and a large iPhone, and on an AVD
- [ ] A photo-less, 0đ product still saves from the normal form
