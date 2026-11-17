import XCTest
@testable import POS_ADBD

/// #1612 AI weekly summary on Tổng quan: tolerant decoding of GET / POST /api/analytics/weekly-summary, the button and
/// its red dot, growth arrows and colours (late returns flipped), day labels in the shop zone, bars, hot item count.
final class WeeklySummaryTests: XCTestCase {
    private let vi = Locale(identifier: "vi-VN")
    private let en = Locale(identifier: "en")
    private let shop = TimeZone(identifier: "Asia/Ho_Chi_Minh")!

    private static let readyJSON = """
    {"success":true,"code":"AI_WEEKLY_SUMMARY_SUCCESS","data":{
      "available": true,
      "week": { "start": "2026-11-09", "end": "2026-11-15" },
      "nextWeekStart": "2026-11-23",
      "status": "READY",
      "branchName": null,
      "somethingNew": { "x": 1 },
      "summary": {
        "generatedAt": "2026-11-16T01:12:00.000Z",
        "language": "vi",
        "numbers": {
          "week": { "start": "2026-11-09", "end": "2026-11-15" },
          "revenue": {
            "orderValue": { "current": 18450000, "previous": 16470000, "growth": 12.02 },
            "collected": { "current": 15200000, "previous": 14000000, "growth": 8.57 },
            "outstanding": 3250000, "fees": 600000
          },
          "branches": [
            { "outletId": 3, "name": "Lê Lợi", "orderValue": { "current": 10200000, "previous": 8640000, "growth": 18.06 }, "collected": 8400000, "newOrders": 21 },
            { "outletId": 4, "name": "Võ Văn Tần", "orderValue": { "current": 8250000, "previous": 7830000, "growth": 5.36 }, "collected": 6800000, "newOrders": 21 }
          ],
          "orders": {
            "new": { "current": 42, "previous": 37, "growth": 13.51 },
            "rent": 38, "sale": 4, "cancelled": 2,
            "byDay": [ { "date": "2026-11-09", "count": 3 }, { "date": "2026-11-10", "count": 4 }, { "date": "2026-11-11", "count": 5 },
                       { "date": "2026-11-12", "count": 4 }, { "date": "2026-11-13", "count": 6 }, { "date": "2026-11-14", "count": 14 },
                       { "date": "2026-11-15", "count": 6 } ]
          },
          "rentals": { "pickedUp": 36, "returned": 31, "late": { "current": 4, "previous": 1, "growth": 300 }, "notPickedUp": 2 },
          "products": { "hot": [ { "productId": 7, "name": "Áo dài cưới đỏ", "rentals": 9, "sales": 0, "revenue": 3600000 } ], "notRented": 12 },
          "customers": { "total": 30, "new": 18, "returning": 12, "returningShare": 55 }
        },
        "content": { "summary": "Hai câu.", "actions": ["Một", "  ", "Hai", "Ba"], "revenueNote": "R", "ordersNote": "O", "productsNote": "" }
      }
    }}
    """

    private func decode(_ json: String) throws -> WeeklySummaryData {
        let envelope = try JSONDecoder.shared.decode(V2Envelope<WeeklySummaryData>.self, from: Data(json.utf8))
        return try XCTUnwrap(envelope.data)
    }

    // MARK: Decoding

    func testDecodesTheReadyAnswer() throws {
        let data = try decode(Self.readyJSON)
        XCTAssertEqual(data.available, true)
        XCTAssertEqual(WeeklySummaryLogic.state(data), .ready)
        XCTAssertEqual(data.week, WeeklySummaryData.Week(start: "2026-11-09", end: "2026-11-15"))
        XCTAssertNil(data.branchName)
        let numbers = try XCTUnwrap(data.summary?.numbers)
        XCTAssertEqual(numbers.revenue?.orderValue?.current, 18_450_000)
        XCTAssertEqual(numbers.revenue?.fees, 600_000)
        XCTAssertEqual(numbers.branches?.map(\.name), ["Lê Lợi", "Võ Văn Tần"])
        XCTAssertEqual(numbers.orders?.byDay?.count, 7)
        XCTAssertEqual(numbers.rentals?.late?.previous, 1)
        XCTAssertEqual(numbers.products?.hot?.first?.name, "Áo dài cưới đỏ")
        XCTAssertEqual(numbers.customers?.returning, 12)
        XCTAssertEqual(WeeklySummaryLogic.actions(data.summary?.content), ["Một", "Hai", "Ba"])
        XCTAssertNil(WeeklySummaryLogic.text(data.summary?.content?.productsNote))
    }

    /// Missing keys, null, a wrong type or a broken array element read as missing: the rest still shows
    func testDecodesTolerantly() throws {
        let data = try decode("""
        {"success":true,"data":{"available":"yes","status":"NO_ORDERS","week":{"start":"2026-11-09"},
          "summary":{"generatedAt":null,"numbers":{"revenue":{"orderValue":{"current":"x","growth":5}},
            "orders":{"byDay":[{"date":"2026-11-09","count":1},"oops",{"date":"2026-11-10","count":"2"}]},
            "branches":"none"},"content":null}}}
        """)
        XCTAssertNil(data.available)
        XCTAssertFalse(WeeklySummaryLogic.showsButton(data))
        XCTAssertEqual(WeeklySummaryLogic.state(data), .noOrders)
        XCTAssertNil(data.week?.end)
        XCTAssertNil(data.summary?.content)
        XCTAssertNil(data.summary?.numbers?.revenue?.orderValue?.current)
        XCTAssertEqual(data.summary?.numbers?.revenue?.orderValue?.growth, 5)
        XCTAssertNil(data.summary?.numbers?.branches)
        XCTAssertEqual(data.summary?.numbers?.orders?.byDay?.map(\.date), ["2026-11-09", "2026-11-10"])
        XCTAssertNil(data.summary?.numbers?.orders?.byDay?.last?.count)
        XCTAssertEqual(WeeklySummaryLogic.weekRange(data.week, locale: vi, timeZone: shop), "")
    }

    // MARK: Button

    func testButtonAndDot() {
        func data(_ available: Bool?, _ status: String?) -> WeeklySummaryData {
            WeeklySummaryData(available: available, week: nil, nextWeekStart: nil, status: status, branchName: nil, summary: nil)
        }
        XCTAssertFalse(WeeklySummaryLogic.showsButton(nil), "GET failed: no button")
        XCTAssertFalse(WeeklySummaryLogic.showsButton(data(false, "NONE")), "no AI key on the server")
        XCTAssertFalse(WeeklySummaryLogic.showsDot(data(false, "NONE")))
        XCTAssertTrue(WeeklySummaryLogic.showsButton(data(true, "NONE")))
        XCTAssertTrue(WeeklySummaryLogic.showsDot(data(true, "NONE")), "not opened this week")
        XCTAssertFalse(WeeklySummaryLogic.showsDot(data(true, "READY")))
        XCTAssertFalse(WeeklySummaryLogic.showsDot(data(true, "NO_ORDERS")))
        XCTAssertEqual(WeeklySummaryLogic.state(data(true, "ready")), .ready)
        XCTAssertEqual(WeeklySummaryLogic.state(data(true, nil)), .none)
    }

    // MARK: Changes

    func testPercentChange() {
        XCTAssertEqual(WeeklySummaryLogic.percentChange(12.02), WeeklySummaryChange(text: "▲12%", good: true))
        XCTAssertEqual(WeeklySummaryLogic.percentChange(8.57), WeeklySummaryChange(text: "▲9%", good: true))
        XCTAssertEqual(WeeklySummaryLogic.percentChange(-2.01), WeeklySummaryChange(text: "▼2%", good: false))
        XCTAssertEqual(WeeklySummaryLogic.percentChange(-120.42), WeeklySummaryChange(text: "▼120%", good: false))
        XCTAssertNil(WeeklySummaryLogic.percentChange(0), "no arrow when nothing changed")
        XCTAssertNil(WeeklySummaryLogic.percentChange(0.4), "rounds to 0")
        XCTAssertNil(WeeklySummaryLogic.percentChange(nil))
        XCTAssertNil(WeeklySummaryLogic.percentChange(.nan))
        XCTAssertEqual(WeeklySummaryLogic.percentChange(300, upIsGood: false), WeeklySummaryChange(text: "▲300%", good: false))
    }

    func testCountChangeAndLateReturnsFlipColours() {
        typealias Change = WeeklySummaryData.Change
        XCTAssertEqual(WeeklySummaryLogic.countChange(Change(current: 42, previous: 37, growth: 13.51)),
                       WeeklySummaryChange(text: "▲5", good: true))
        XCTAssertEqual(WeeklySummaryLogic.countChange(Change(current: 30, previous: 37, growth: nil)),
                       WeeklySummaryChange(text: "▼7", good: false))
        // Trả trễ: more is bad (red), fewer is good (green)
        XCTAssertEqual(WeeklySummaryLogic.countChange(Change(current: 4, previous: 1, growth: 300), upIsGood: false),
                       WeeklySummaryChange(text: "▲3", good: false))
        XCTAssertEqual(WeeklySummaryLogic.countChange(Change(current: 1, previous: 4, growth: -75), upIsGood: false),
                       WeeklySummaryChange(text: "▼3", good: true))
        XCTAssertNil(WeeklySummaryLogic.countChange(Change(current: 0, previous: 0, growth: 0), upIsGood: false))
        XCTAssertNil(WeeklySummaryLogic.countChange(Change(current: 4, previous: nil, growth: nil)))
        XCTAssertNil(WeeklySummaryLogic.countChange(nil))
    }

    func testCountsAndHotItemTimes() {
        XCTAssertEqual(WeeklySummaryLogic.joined([38, 4, 2]), "38 · 4 · 2")
        XCTAssertEqual(WeeklySummaryLogic.joined([36, nil]), "36 · 0")
        // A sold-only item is not "0 lượt": rentals + sales
        let item = WeeklySummaryData.HotProduct(productId: 21, name: "Product 21", rentals: 1, sales: 2, revenue: 619)
        XCTAssertEqual(WeeklySummaryLogic.times(item), 3)
        XCTAssertEqual(WeeklySummaryLogic.times(WeeklySummaryData.HotProduct(productId: 1, name: nil, rentals: nil, sales: nil, revenue: nil)), 0)
    }

    // MARK: Days

    func testWeekSubtitleAndFooterDays() throws {
        let data = try decode(Self.readyJSON)
        XCTAssertEqual(WeeklySummaryLogic.weekRange(data.week, locale: vi, timeZone: shop), "T2 09/11 – CN 15/11")
        XCTAssertEqual(WeeklySummaryLogic.weekRange(data.week, locale: en, timeZone: shop), "Mon 09/11 – Sun 15/11")
        XCTAssertEqual(WeeklySummaryLogic.subtitle(data, wholeShop: "Cả shop", locale: vi, timeZone: shop), "Cả shop · T2 09/11 – CN 15/11")
        let branch = WeeklySummaryData(available: true, week: data.week, nextWeekStart: nil, status: "READY", branchName: "Lê Lợi", summary: nil)
        XCTAssertEqual(WeeklySummaryLogic.subtitle(branch, wholeShop: "Cả shop", locale: vi, timeZone: shop), "Lê Lợi · T2 09/11 – CN 15/11")
        // 01:12 UTC is 08:12 in Vietnam
        let parts = try XCTUnwrap(WeeklySummaryLogic.writtenParts(data, locale: vi, timeZone: shop))
        XCTAssertEqual(parts.written, "T2 16/11 08:12")
        XCTAssertEqual(parts.next, "T2 23/11")
        XCTAssertNotNil(WeeklySummaryLogic.parseTime("2026-11-16T01:12:00Z"), "without fractional seconds")
    }

    /// The labels are shop days whatever the phone zone
    func testDaysDoNotMoveWithThePhoneZone() throws {
        let data = try decode(Self.readyJSON)
        let saved = NSTimeZone.default
        defer { NSTimeZone.default = saved }
        for id in ["UTC", "America/Los_Angeles", "Pacific/Kiritimati"] {
            NSTimeZone.default = TimeZone(identifier: id)!
            XCTAssertEqual(WeeklySummaryLogic.weekRange(data.week, locale: vi), "T2 09/11 – CN 15/11", id)
            XCTAssertEqual(WeeklySummaryLogic.writtenParts(data, locale: vi)?.written, "T2 16/11 08:12", id)
            XCTAssertEqual(WeeklySummaryLogic.bars(data.summary?.numbers?.orders?.byDay, locale: vi).map(\.label),
                           ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], id)
        }
    }

    func testBars() throws {
        let data = try decode(Self.readyJSON)
        let bars = WeeklySummaryLogic.bars(data.summary?.numbers?.orders?.byDay, locale: vi, timeZone: shop)
        XCTAssertEqual(bars.map(\.count), [3, 4, 5, 4, 6, 14, 6])
        XCTAssertEqual(bars.map(\.isTop), [false, false, false, false, false, true, false], "Saturday is the busiest")
        XCTAssertEqual(bars[5].ratio, 1)
        XCTAssertEqual(bars[0].ratio, 3.0 / 14.0, accuracy: 0.0001)
        let quiet = WeeklySummaryLogic.bars([WeeklySummaryData.DayCount(date: "2026-11-09", count: 0)], locale: vi, timeZone: shop)
        XCTAssertEqual(quiet.map(\.isTop), [false], "no solid bar when every day is 0")
        XCTAssertTrue(WeeklySummaryLogic.bars(nil, locale: vi).isEmpty)
    }

    // MARK: Request

    func testPathCarriesTheShopZone() {
        XCTAssertEqual(TabsV2APIService.weeklySummaryPath(timeZone: "Asia/Ho_Chi_Minh"),
                       "/api/analytics/weekly-summary?timeZone=Asia/Ho_Chi_Minh")
        XCTAssertEqual(TabsV2APIService.weeklySummaryPath(timeZone: "Etc/GMT+7"),
                       "/api/analytics/weekly-summary?timeZone=Etc/GMT%2B7")
    }
}
