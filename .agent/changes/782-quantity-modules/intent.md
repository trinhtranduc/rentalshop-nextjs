# Intent: admin adds extra capacity and paid modules to a shop

Issue: #782 (closed, see spec section 1). Docs issue: #1382. Requirements: #780. Status: waiting for the owner's "chốt" on the mockup tab "★ Admin: add-on theo shop". No code before that.

## What the owner wants
Admin adds to one shop: (a) extra branches, (b) product-limit blocks, (c) order-limit blocks, (d) the loyalty module (khách thân thiết) as a paid module.

## Owner decisions
- Admin types the amount each time (+100 products, +500 orders). There is no fixed system-wide block size.
- Merchants never add these in the app or on the web. Admin picks from a list and adds.
- Each add-on has one limit kind, its own price, quantity and period. Admin configures the module price.
- "Đơn giản và chuẩn, đừng phức tạp": no forecasts, no extra screens, no payment provider.

## Why it is small
Almost all of this already runs in production (#850, #870, #943, #967, #1187). This change closes four gaps. It needs no new table and no migration.
