# Plan: #1308

## Verified before coding

a) `PUT /api/outlets` accepts and writes `printNote` and `printBankQr`: zod `outletUpdateSchema`
   (`packages/utils/src/core/validation-schemas.ts:574-576`), `db.outlets.update(id, data)` passes data through
   (`packages/database/src/outlet.ts:585`). Allowed for MERCHANT (own merchant) and OUTLET_ADMIN (own outlet); staff 403
   (`apps/api/app/api/outlets/route.ts:~262-290`). Existing tests: `tests/packages/utils/outlet-print-*-schema.test.ts`.
   -> No API change, no `LOG.md` row needed.
b) Order detail `GET /api/orders/:id` and the PUT response (`findByIdDetail`, `order.ts:2188-2189`) return
   `outlet.printNote` / `printBankQr`. `GET /api/orders` list (`findManyLightweight`, outlet `{id,name}` only) and the
   `searchOrders` path do not; the mobile print paths all use a detail (`Order.from(detail:)`, Android `getOrder`).
   iOS `OutletDetail` / Android `parseOrderDetail` did not read them -> add as optional. For an iOS Order that came from
   the list or the cart, load the detail before printing.
   `GET /api/outlets` returns every outlet column (include), so it has the two fields too.
c) Mobile today: iOS note `PrinterConfigurationViewController` (`noteTextView`, `Utils.saveNotePrinter`), QR switch
   `bankQrSwitch` (`Utils.savePrintBankQr`); Android `PrinterNetworkScreen` (`SettingsParity.kt`, prefs `printerNote`,
   `printBankQr`). Web: `ReceiptSection.tsx` (per outlet, `outletsApi.updateOutlet`).

## Steps

1. Failing tests (iOS XCTest, Android JVM) for the pure rules. Commit `test(mobile): reproduce ...`.
2. Pure logic: iOS `Utils/OutletPrintSettings.swift`, Android `domain/print/OutletPrintSettings.kt`.
3. Models: iOS `OutletDetail`, `Outlet`, `Order`; Android `OrderDetail`, parse.
4. Print/share paths read the order's outlet. Printer screen reads/writes the server.
   Role rule and branch picker for MERCHANT added after the owner's update (see spec rule 5): `canEdit` = MERCHANT or
   OUTLET_ADMIN; picker only when more than one active branch.
5. Strings en/vi. Build + tests. PR into `dev`.
