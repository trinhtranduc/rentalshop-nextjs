# Intent — Shop web per branch: orders filter, bank accounts and receipt per branch

Issue: #852 · Parent: #823

## What
A shop owner (MERCHANT) with two or more branches works per branch on the web without a global
branch switch: the orders list filters by branch and shows the branch of each order, and Cài đặt
lets the owner set bank accounts and the receipt (printed note, bank QR) for each branch.

## Why
Owner decision 2026-10-11 (#823): on the web each screen picks its branch. Today the orders list
mixes all branches with no way to narrow, bank accounts are an OUTLET_ADMIN-only tab, and the
receipt tab stacks every branch on one page.

## Constraints
- Additive API only (installed apps; no published mobile build with users yet, #823).
- Outlet roles stay locked to their outlet; shop-wide settings stay shop-wide.
- Same picker look and model as Tổng quan (#840).
