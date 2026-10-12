# Plan

1. `Library/Managers/CurrentOutlet.swift`: logic enum (tested) + singleton with per-account UserDefaults choice and
   cached active outlets; refresh at tab bar load and Home pull-to-refresh.
2. `Views/Common/OutletHeaderButton.swift` (+ `OutletSwitcher`), `Viewcontrollers/Products/v2/OutletPickerSheet.swift`.
3. Home header uses the button; Home, Orders, Calendar, Overview reload on `.currentOutletDidChange`.
4. Replace every `User.current()?.outlet?.id ?? outletId` read with `CurrentOutlet`; add outlet params in
   `TabsV2APIService`, `OrderService`, `AnalyticsAPIService`; `CreateOrderRequest.outletId`.
5. Unit tests (`CurrentOutletLogicTests`), UI test `test9zOutletPicker` (merchant + staff), screenshots on a local stack.
