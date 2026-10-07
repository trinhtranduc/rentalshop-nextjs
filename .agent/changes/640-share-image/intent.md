# New order share image (rent, sale, draft)

Issue: #640 · Author: Trinh Tran · Status: accepted · Created: 2026-10-07

## Problem
The share image is a plain bilingual paper receipt with unformatted money; a cart cannot be shared before it is an order.

## Outcome
The three approved mockups (`mockups/don-thue.png`, `don-ban.png`, `don-nhap.png`; canvas
https://claude.ai/artifact/AqEoxTwzS8Ps1J8QXJQj4H) rendered by both apps from real order / cart data.

## Constraints
- iOS is the reference; Android draws the same image. Client only, no API change.
- Printing (thermal bill) is untouched: only the share JPG changes.
- Keep it lean: no new settings (fixed AnyRent blue, language = app language).

## Decision log
- 2026-10-07 — mockups approved, "chốt tạo pr" (owner)
- 2026-10-07 — one language per image = app language; bilingual on one image rejected (agent proposal, owner accepted)
- 2026-10-07 — colour fixed `#1D4ED8`; per-shop colour not chosen (owner did not pick; lean default)
- 2026-10-07 — draft shared from the cart; no QR on a draft
