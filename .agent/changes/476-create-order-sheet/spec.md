# Spec — Create the order from a confirm sheet on the new cart

Issue: #476 · Status: accepted · Intent: ./intent.md

## Behavior

1. CTA route: iOS `CartV2Logic.ctaRoute(isEditMode:)`, Android `CreateOrderSheet.ctaRoute(editing)`. A new order →
   confirm sheet; an edited order → the existing review screen (unchanged).
2. Validation first, as today: iOS `cart.validate()` → "Error" alert; Android `CartV2Logic.problems` → error alert.
3. Confirm content: iOS `CreateOrderSheetLogic.confirm(cart)`, Android `CreateOrderSheet.confirm(...)`:
   customer display name; rental range `dd/MM → dd/MM` and inclusive civil days (rent only); items
   `name` or `name ×qty`, comma separated; total = cart total; collect = prepaid deposit (rent) or amount due (sale).
4. Sheet UI (boards Gio-hang-xac-nhan): grabber, 24pt top radius, title 20 bold, rows 15pt (label muted, value right),
   "Tổng đơn" value semibold, block `#EFF6FF` radius 14 with label 15 and amount 22 bold `#1E3A8A`; buttons Hủy
   (outline `#CBD5E1`) and Tạo đơn (primary), 1 : 1.6, height 50, radius 14.
5. Submit: iOS `CreateOrderSubmission`, Android `CreateOrderSubmission`: one key per checkout, `begin()` refuses a
   second create while one is in flight, `failed()` keeps the key for a retry, `succeeded()` makes a new key.
   iOS sends `OrderService.createOrder(from: cart, idempotencyKey:)` (what `CartViewModel.saveOrder` sends). Android
   sends `CartOrderSubmit.create(...)`, the same `ApiClient.createOrder` call and availability check the review
   screen runs (the review screen now calls the same function).
6. Success: order lists refresh, cart cleared, availability cache cleared (iOS), then the created sheet
   (boards Gio-hang-da-tao): `CreateOrderSheetLogic.created(orderNumber:confirm:)` → short number (`ORD-17-0063` →
   `0063`), subtitle `customer · range` (sale: customer), paid amount. "Tạo đơn mới" → product list (same route as
   "+ Thêm"); "Xem đơn" → the order detail.
7. Failure: the confirm sheet closes, the error alert shows, the cart is kept, the next confirm reuses the key.

## Out of scope

- API; old cart and its preview; the review screen for edited orders.

## API and data

None. Same `POST /api/orders` body and `Idempotency-Key` header.

## Acceptance

- iOS `ProductsV2Tests` (#476 cases) and Android `CreateOrderSheetTest`: confirm content rent/sale, created
  summary, CTA route, submission guard and key.
- iOS build + `POS ADBDTests`; Android `:app:testDebugUnitTest :app:assembleDebug`.
