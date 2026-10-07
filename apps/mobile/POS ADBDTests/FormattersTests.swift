import XCTest
@testable import POS_ADBD

/// #370 — day labels in the device time zone; #399 — money without a currency symbol
final class FormattersTests: XCTestCase {
    private let vietnam = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let tokyo = TimeZone(identifier: "Asia/Tokyo")!
    private let vi = Locale(identifier: "vi")
    private let iso = ISO8601DateFormatter()

    func testShortDayFollowsTheZone() {
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-02T16:59:59Z")!, timeZone: vietnam, locale: vi), "T6 02/10")
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-02T17:00:00Z")!, timeZone: vietnam, locale: vi), "T7 03/10")
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-03T16:00:00Z")!, timeZone: tokyo, locale: vi), "CN 04/10")
        XCTAssertEqual(DayFormatter.short(iso.date(from: "2026-10-03T05:00:00Z")!, timeZone: vietnam, locale: Locale(identifier: "en_US")), "Sat 03/10")
        XCTAssertEqual(DayFormatter.key(iso.date(from: "2026-10-03T16:00:00Z")!, timeZone: tokyo), "2026-10-04")
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
