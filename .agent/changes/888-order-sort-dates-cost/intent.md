# #888 — clearer order sort, dd/mm/yy dates, cost price in the cart

Status: done

**What:** customers (via the owner, 2026-10-12) cannot tell whether "Tất cả đơn" is sorted by created, pickup or
return date; the "Lọc & sắp xếp" sheet has a sort choice and a separate date choice for the range. Dates read
"T2 05/10" and should read 05/10/26. When creating an order the shop wants to see the cost price (giá vốn).
**Why:** wrong-date confusion leads to missed pickups; cost in the cart lets the counter judge a price on the spot.
**Constraints:** approved mockup https://claude.ai/artifact/9b56KwErJWiGpiyFEfyEY4 and the owner's comment on #888.
iOS first, Android matches. No API change (the list already takes `sortBy`, `sortOrder`, `dateField`; product
lists already return `costPrice` to `products.manage` roles only). Builds on PR #889 (cost price plumbing).
