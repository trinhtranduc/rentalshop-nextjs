# Plan — Hide cost price in the mobile cart

Issue: #1007 · Status: in-progress · Spec: ./spec.md

## Steps

1. iOS: remove the cost rows from `CartV2ViewController.swift`, `CartCostLogic` / `CartCostSummary` from `ProductsV2.swift`, the three `products.cart.{cost,totalCost,profit}` strings (en, vi); update `ProductsV2Tests` and the `test8fCartCost` e2e to assert absence.
2. Android: remove the rows from `CartV2Screen.kt`, `CartCostLogic` / `CartCostSummary` from `ProductRules.kt`, the three `v2_cart_{cost,total_cost,profit}` strings; update `ProductRulesTest`, `Issue888ResourcesTest`.
3. Keep `CartItem.costPrice` (iOS) and `Product.costPrice` in drafts (Android) and their tests.
4. Skills: `mobile-parity`. No API change, no LOG row.

## Risks

None for data. Intentional behaviour change: the #888 cart cost tests now assert the rows are gone.

## Rollback

Revert the commit.
