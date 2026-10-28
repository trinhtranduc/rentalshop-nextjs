import XCTest
@testable import POS_ADBD

/// #370 — day labels in the device time zone; #399 — money without a currency symbol
final class FormattersTests: XCTestCase {
    private let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let tokyo = TimeZone(identifier: "Asia/Tokyo")!
    private let vi = Locale(identifier: "vi")
    private let iso = ISO8601DateFormatter()

    /// #888 (owner): every single day in the app reads dd/mm/yy, no weekday, in any language
    func testShortDayFollowsTheZone() {
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-02T16:59:59Z")!, timeZone: vietnam, locale: vi), "02/10/26")
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-02T17:00:00Z")!, timeZone: vietnam, locale: vi), "03/10/26")
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-03T16:00:00Z")!, timeZone: tokyo, locale: vi), "04/10/26")
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-03T05:00:00Z")!, timeZone: vietnam, locale: Locale(identifier: "en_US")), "03/10/26")
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-12-31T17:00:00Z")!), "01/01/27", "default zone is the shop's")
        XCTAssertEqual(DayFormatter.key(iso.date(from: "2026-10-03T16:00:00Z")!, timeZone: tokyo), "2026-10-04")
    }

    /// #888 (owner): a day with a time reads "05/10/26 14:30" (Vietnam day and clock)
    func testDayAndTime() {
        XCTAssertEqual(DayFormatter.dmyTime(iso.date(from: "2026-10-05T07:30:00Z")!, timeZone: vietnam), "05/10/26 14:30")
        XCTAssertEqual(DayFormatter.dmyTime(iso.date(from: "2026-10-05T16:59:00Z")!, timeZone: vietnam), "05/10/26 23:59")
        XCTAssertEqual(DayFormatter.dmyTime(iso.date(from: "2026-10-05T17:00:00Z")!, timeZone: vietnam), "06/10/26 00:00")
        XCTAssertEqual(DayFormatter.dmyTime(iso.date(from: "2026-10-05T17:00:00Z")!), "06/10/26 00:00", "default zone is the shop's")
        XCTAssertEqual(OrderDetailLogic.createdStamp(iso.date(from: "2026-09-28T07:32:00Z")!, timeZone: vietnam), "28/09/26 14:32")
    }

    func testMoney() {
        XCTAssertEqual(MoneyFormatter.format(1_150_000), "1.150.000")
        XCTAssertEqual(MoneyFormatter.format(0), "0")
        XCTAssertEqual(MoneyFormatter.format(-50_000), "−50.000")
        XCTAssertEqual(MoneyFormatter.format(-1_150_000), "−1.150.000")
        XCTAssertEqual(MoneyFormatter.format(1_234_567_890), "1.234.567.890")
        XCTAssertEqual(MoneyFormatter.format(999), "999")
        XCTAssertEqual(MoneyFormatter.format(1_000.4), "1.000")
        XCTAssertEqual(MoneyFormatter.format(-0.4), "0")
    }
}

/// #1145 — the shop currency: VND as before, USD "$220,000" (cents only when there are some)
final class ShopCurrencyTests: XCTestCase {
    func testNormalise() {
        XCTAssertEqual(ShopCurrency.normalise("USD"), .usd)
        XCTAssertEqual(ShopCurrency.normalise(" usd "), .usd)
        XCTAssertEqual(ShopCurrency.normalise("VND"), .vnd)
        XCTAssertEqual(ShopCurrency.normalise(""), .vnd)
        XCTAssertEqual(ShopCurrency.normalise(nil), .vnd)
        XCTAssertEqual(ShopCurrency.normalise("EUR"), .vnd)
    }

    func testVndIsUnchanged() {
        XCTAssertEqual(MoneyFormatter.format(220_000, currency: .vnd), "220.000")
        XCTAssertEqual(MoneyFormatter.format(-50_000, currency: .vnd), "−50.000")
        XCTAssertEqual(MoneyFormatter.format(0, currency: .vnd), "0")
        XCTAssertEqual(MoneyFormatter.format(1_000.4, currency: .vnd), "1.000")
        XCTAssertEqual(MoneyFormatter.suffixed(150_000, currency: .vnd), "150.000đ")
        XCTAssertEqual(CartV2Logic.money(150_000, currency: .vnd), "150.000đ")
        XCTAssertEqual(OrderShareModel.money(1_150_000, currency: .vnd), "1.150.000đ")
    }

    func testUsd() {
        XCTAssertEqual(MoneyFormatter.format(220_000, currency: .usd), "$220,000")
        XCTAssertEqual(MoneyFormatter.format(1_234.5, currency: .usd), "$1,234.50")
        XCTAssertEqual(MoneyFormatter.format(0, currency: .usd), "$0")
        XCTAssertEqual(MoneyFormatter.format(-50, currency: .usd), "−$50")
        XCTAssertEqual(MoneyFormatter.format(-50_000, currency: .usd), "−$50,000")
        XCTAssertEqual(MoneyFormatter.format(1_234_567.891, currency: .usd), "$1,234,567.89")
        XCTAssertEqual(MoneyFormatter.format(0.004, currency: .usd), "$0")
        XCTAssertEqual(MoneyFormatter.suffixed(150_000, currency: .usd), "$150,000")
        XCTAssertEqual(CartV2Logic.money(150_000, currency: .usd), "$150,000")
        XCTAssertEqual(OrderShareModel.money(1_150_000, currency: .usd), "$1,150,000")
    }

    func testPlainStaysVndStyle() {
        XCTAssertEqual(MoneyFormatter.plain(1_250_000), "1.250.000")
        XCTAssertEqual(MoneyInput.display(1_250_000), "1.250.000")
    }

    func testUnitLabels() {
        XCTAssertEqual(MoneyFormatter.unitLabel(daily: false, currency: .usd), "$")
        XCTAssertTrue(MoneyFormatter.unitLabel(daily: true, currency: .usd).hasPrefix("$/"))
        XCTAssertEqual(MoneyFormatter.unitLabel(daily: false, currency: .vnd), "đ")
        XCTAssertTrue(MoneyFormatter.unitLabel(daily: true, currency: .vnd).hasPrefix("đ/"))
    }

    func testCompact() {
        XCTAssertEqual(OverviewDashLogic.compact(18_650_000, vietnamese: true, currency: .vnd), "18,65 tr")
        XCTAssertEqual(OverviewDashLogic.compact(450_000, vietnamese: true, currency: .vnd), "450.000")
        XCTAssertEqual(OverviewDashLogic.compact(18_650_000, vietnamese: true, currency: .usd), "$18.65M")
        XCTAssertEqual(OverviewDashLogic.compact(1_200_000_000, vietnamese: false, currency: .usd), "$1.2B")
        XCTAssertEqual(OverviewDashLogic.compact(-2_000_000, vietnamese: true, currency: .usd), "−$2M")
        XCTAssertEqual(OverviewDashLogic.compact(450_000, vietnamese: true, currency: .usd), "$450,000")
        XCTAssertEqual(EntityOrdersLogic.compactMoney(2_100_000, currency: .usd), "$2.1M")
        XCTAssertEqual(EntityOrdersLogic.compactMoney(2_000_000, currency: .usd), "$2M")
        XCTAssertEqual(EntityOrdersLogic.compactMoney(450_000, currency: .usd), "$450,000")
        XCTAssertEqual(EntityOrdersLogic.compactMoney(450_000, currency: .vnd), "450.000")
    }

    func testOnlyTheShopOwnerSeesTheRow() {
        XCTAssertTrue(ShopCurrencyLogic.canChange(role: .merchant))
        for role: Role? in [.admin, .outletAdmin, .outletStaff, .outletInventory, nil] {
            XCTAssertFalse(ShopCurrencyLogic.canChange(role: role))
            let items = SettingsV2Logic.sections(role: role, permissions: [], hasPlan: false).flatMap(\.items)
            XCTAssertFalse(items.contains(.currency))
        }
        // #1270: "Tiền tệ" is its own row again, right after Thông tin cửa hàng (owner only)
        let merchant = SettingsV2Logic.sections(role: .merchant, permissions: [], hasPlan: false)
        XCTAssertEqual(Array(merchant[0].items.prefix(2)), [.storeInfo, .currency])
    }

    func testLabelsAndConfirmText() {
        XCTAssertEqual(ShopCurrency.vnd.label, "VND (đ)")
        XCTAssertEqual(ShopCurrency.usd.label, "USD ($)")
        XCTAssertEqual(ShopCurrencyLogic.example(from: .vnd, to: .usd), "220.000 → $220,000")
        XCTAssertEqual(ShopCurrencyLogic.example(from: .usd, to: .vnd), "$220,000 → 220.000")
        XCTAssertTrue(ShopCurrencyLogic.confirmMessage(from: .vnd, to: .usd).hasSuffix("(220.000 → $220,000)."))
        XCTAssertTrue(ShopCurrencyLogic.confirmTitle(to: .usd).contains("USD"))
        XCTAssertTrue(ShopCurrencyLogic.confirmButton(to: .vnd).contains("VND"))
    }

    func testExactTextsInBothLanguages() throws {
        let expected: [String: [String: String]] = [
            "vi-VN": ["settings.v2.currency": "Tiền tệ", "settings.v2.currency.cancel": "Huỷ"],
            "en": ["settings.v2.currency": "Currency", "settings.v2.currency.cancel": "Cancel"],
        ]
        let formats: [String: (title: String, message: String, button: String)] = [
            "vi-VN": ("Đổi tiền tệ sang USD?",
                      "Mọi giá trong app sẽ hiện bằng USD. Số tiền giữ nguyên, không quy đổi (220.000 → $220,000).",
                      "Đổi sang USD"),
            "en": ("Change currency to USD?",
                   "All prices in the app will show in USD. Amounts stay the same, nothing is converted (220.000 → $220,000).",
                   "Change to USD"),
        ]
        for language in ["en", "vi-VN"] {
            let bundle = try XCTUnwrap(Bundle(path: try XCTUnwrap(Bundle.main.path(forResource: language, ofType: "lproj"))))
            let text = { (key: String) in bundle.localizedString(forKey: key, value: "∅", table: nil) }
            for (key, value) in expected[language]! { XCTAssertEqual(text(key), value, "\(language): \(key)") }
            let want = formats[language]!
            XCTAssertEqual(String(format: text("settings.v2.currency.confirm.title"), "USD"), want.title)
            XCTAssertEqual(String(format: text("settings.v2.currency.confirm.message"), "USD",
                                  ShopCurrencyLogic.example(from: .vnd, to: .usd)), want.message)
            XCTAssertEqual(String(format: text("settings.v2.currency.confirm.button"), "USD"), want.button)
            XCTAssertEqual(text("currency.usd.unit"), "$")
            XCTAssertNotEqual(text("currency.usd.unitDaily"), "∅")
        }
    }
}
