# Intent — #665 public shop page redesign

Status: accepted (owner approved the mockups 2026-10-08: "chốt thiết kế", then asked for the per-day price line)

## Problem
The shared shop page overflows on phones, shows misleading stock overlays and noise, formats money as `500,000`,
and gives customers no way to contact the shop or see a product.

## Outcome
Lean catalog: header with Gọi / Zalo, search + category chips, 2-col phone / 4-col desktop cards with
rent price, optional per-day and sale lines, and a detail sheet with a Zalo CTA.

## Constraints
- Web only, no API change (fields already in the public response).
- 5 locales. Money: VND `500.000đ`, other currencies via the shared formatter.
- Keep `[[keep-design-proposals-lean]]`: no extras beyond the approved mockup.
