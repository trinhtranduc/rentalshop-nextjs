# Plan

1. Failing tests: iOS `ProductsV2Tests` (`ProductRowPrice.sale`), Android `ProductRulesTest`. Commit.
2. `ProductRowPrice` gets `sale` (iOS + Android); `ProductRowLogic.price` fills it when a rent price exists.
3. Home cells append `" · " + saleShort(sale)` muted.
4. Verify: unit tests, builds, simulator + emulator against a local seeded API (rent+sale product on Home; edit → save → sale unchanged).
