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
