//
//  WeeklySummary.swift
//  POS ADBD
//
//  #1612 AI summary of last week on Tổng quan: `data` of GET / POST /api/analytics/weekly-summary and the pure
//  rules of the floating button and the sheet (dot, growth arrows and their colours, day labels, bars).
//  Every field is optional and a field of the wrong type reads as missing, so a newer API never breaks the decode.
//

import Foundation

private extension KeyedDecodingContainer {
    /// The value, or nil when the key is missing, null or of another type
    func lenient<T: Decodable>(_ key: Key) -> T? {
        (try? decodeIfPresent(T.self, forKey: key)) ?? nil
    }

    /// The elements that decode; the others are dropped
    func lenientArray<T: Decodable>(_ key: Key) -> [T]? {
        guard let items = (try? decodeIfPresent([WeeklySummaryLossy<T>].self, forKey: key)) ?? nil else { return nil }
        return items.compactMap(\.value)
    }
}

/// One element of an array that may not decode
private struct WeeklySummaryLossy<T: Decodable>: Decodable {
    let value: T?

    init(from decoder: Decoder) throws {
        value = try? T(from: decoder)
    }
}

/// `data` of GET / POST /api/analytics/weekly-summary
struct WeeklySummaryData: Decodable, Equatable {
    /// `false` (or missing) hides the button: the API has no AI key
    let available: Bool?
    let week: Week?
    let nextWeekStart: String?
    /// `NONE` (not opened this week: red dot), `READY`, `NO_ORDERS`
    let status: String?
    /// Branch manager: the branch; nil for the whole shop
    let branchName: String?
    let summary: Summary?

    init(available: Bool?, week: Week?, nextWeekStart: String?, status: String?, branchName: String?, summary: Summary?) {
        self.available = available
        self.week = week
        self.nextWeekStart = nextWeekStart
        self.status = status
        self.branchName = branchName
        self.summary = summary
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        available = c.lenient(.available)
        week = c.lenient(.week)
        nextWeekStart = c.lenient(.nextWeekStart)
        status = c.lenient(.status)
        branchName = c.lenient(.branchName)
        summary = c.lenient(.summary)
    }

    private enum CodingKeys: String, CodingKey {
        case available, week, nextWeekStart, status, branchName, summary
    }

    /// Inclusive `yyyy-MM-dd` keys, Monday to Sunday
    struct Week: Decodable, Equatable {
        let start: String?
        let end: String?

        init(start: String?, end: String?) {
            self.start = start
            self.end = end
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            start = c.lenient(.start)
            end = c.lenient(.end)
        }

        private enum CodingKeys: String, CodingKey { case start, end }
    }

    /// A figure of the week with the week before; `growth` is a percent
    struct Change: Decodable, Equatable {
        let current: Double?
        let previous: Double?
        let growth: Double?

        init(current: Double?, previous: Double?, growth: Double?) {
            self.current = current
            self.previous = previous
            self.growth = growth
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            current = c.lenient(.current)
            previous = c.lenient(.previous)
            growth = c.lenient(.growth)
        }

        private enum CodingKeys: String, CodingKey { case current, previous, growth }
    }

    struct Summary: Decodable, Equatable {
        /// ISO time the summary was written
        let generatedAt: String?
        let language: String?
        let numbers: Numbers?
        /// nil for NO_ORDERS
        let content: Content?

        init(generatedAt: String?, language: String?, numbers: Numbers?, content: Content?) {
            self.generatedAt = generatedAt
            self.language = language
            self.numbers = numbers
            self.content = content
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            generatedAt = c.lenient(.generatedAt)
            language = c.lenient(.language)
            numbers = c.lenient(.numbers)
            content = c.lenient(.content)
        }

        private enum CodingKeys: String, CodingKey { case generatedAt, language, numbers, content }
    }

    /// What the AI wrote (lines marked ✦)
    struct Content: Decodable, Equatable {
        let summary: String?
        let actions: [String]?
        let revenueNote: String?
        let ordersNote: String?
        let productsNote: String?

        init(summary: String?, actions: [String]?, revenueNote: String?, ordersNote: String?, productsNote: String?) {
            self.summary = summary
            self.actions = actions
            self.revenueNote = revenueNote
            self.ordersNote = ordersNote
            self.productsNote = productsNote
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            summary = c.lenient(.summary)
            actions = c.lenientArray(.actions)
            revenueNote = c.lenient(.revenueNote)
            ordersNote = c.lenient(.ordersNote)
            productsNote = c.lenient(.productsNote)
        }

        private enum CodingKeys: String, CodingKey { case summary, actions, revenueNote, ordersNote, productsNote }
    }

    /// Figures calculated by the API (cancelled orders left out)
    struct Numbers: Decodable, Equatable {
        let revenue: Revenue?
        let branches: [Branch]?
        let orders: Orders?
        let rentals: Rentals?
        let products: Products?
        let customers: Customers?

        init(revenue: Revenue?, branches: [Branch]?, orders: Orders?, rentals: Rentals?, products: Products?, customers: Customers?) {
            self.revenue = revenue
            self.branches = branches
            self.orders = orders
            self.rentals = rentals
            self.products = products
            self.customers = customers
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            revenue = c.lenient(.revenue)
            branches = c.lenientArray(.branches)
            orders = c.lenient(.orders)
            rentals = c.lenient(.rentals)
            products = c.lenient(.products)
            customers = c.lenient(.customers)
        }

        private enum CodingKeys: String, CodingKey { case revenue, branches, orders, rentals, products, customers }
    }

    struct Revenue: Decodable, Equatable {
        let orderValue: Change?
        let collected: Change?
        let outstanding: Double?
        let fees: Double?

        init(orderValue: Change?, collected: Change?, outstanding: Double?, fees: Double?) {
            self.orderValue = orderValue
            self.collected = collected
            self.outstanding = outstanding
            self.fees = fees
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            orderValue = c.lenient(.orderValue)
            collected = c.lenient(.collected)
            outstanding = c.lenient(.outstanding)
            fees = c.lenient(.fees)
        }

        private enum CodingKeys: String, CodingKey { case orderValue, collected, outstanding, fees }
    }

    /// One open branch of the owner's shop (only with two or more)
    struct Branch: Decodable, Equatable {
        let outletId: Int?
        let name: String?
        let orderValue: Change?
        let collected: Double?
        let newOrders: Double?

        init(outletId: Int?, name: String?, orderValue: Change?, collected: Double?, newOrders: Double?) {
            self.outletId = outletId
            self.name = name
            self.orderValue = orderValue
            self.collected = collected
            self.newOrders = newOrders
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            outletId = c.lenient(.outletId)
            name = c.lenient(.name)
            orderValue = c.lenient(.orderValue)
            collected = c.lenient(.collected)
            newOrders = c.lenient(.newOrders)
        }

        private enum CodingKeys: String, CodingKey { case outletId, name, orderValue, collected, newOrders }
    }

    struct Orders: Decodable, Equatable {
        let new: Change?
        let rent: Double?
        let sale: Double?
        let cancelled: Double?
        let byDay: [DayCount]?

        init(new: Change?, rent: Double?, sale: Double?, cancelled: Double?, byDay: [DayCount]?) {
            self.new = new
            self.rent = rent
            self.sale = sale
            self.cancelled = cancelled
            self.byDay = byDay
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            new = c.lenient(.new)
            rent = c.lenient(.rent)
            sale = c.lenient(.sale)
            cancelled = c.lenient(.cancelled)
            byDay = c.lenientArray(.byDay)
        }

        private enum CodingKeys: String, CodingKey { case new, rent, sale, cancelled, byDay }
    }

    struct DayCount: Decodable, Equatable {
        let date: String?
        let count: Double?

        init(date: String?, count: Double?) {
            self.date = date
            self.count = count
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            date = c.lenient(.date)
            count = c.lenient(.count)
        }

        private enum CodingKeys: String, CodingKey { case date, count }
    }

    struct Rentals: Decodable, Equatable {
        let pickedUp: Double?
        let returned: Double?
        let late: Change?
        let notPickedUp: Double?

        init(pickedUp: Double?, returned: Double?, late: Change?, notPickedUp: Double?) {
            self.pickedUp = pickedUp
            self.returned = returned
            self.late = late
            self.notPickedUp = notPickedUp
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            pickedUp = c.lenient(.pickedUp)
            returned = c.lenient(.returned)
            late = c.lenient(.late)
            notPickedUp = c.lenient(.notPickedUp)
        }

        private enum CodingKeys: String, CodingKey { case pickedUp, returned, late, notPickedUp }
    }

    struct Products: Decodable, Equatable {
        let hot: [HotProduct]?
        let notRented: Double?

        init(hot: [HotProduct]?, notRented: Double?) {
            self.hot = hot
            self.notRented = notRented
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            hot = c.lenientArray(.hot)
            notRented = c.lenient(.notRented)
        }

        private enum CodingKeys: String, CodingKey { case hot, notRented }
    }

    struct HotProduct: Decodable, Equatable {
        let productId: Int?
        let name: String?
        let rentals: Double?
        let sales: Double?
        let revenue: Double?

        init(productId: Int?, name: String?, rentals: Double?, sales: Double?, revenue: Double?) {
            self.productId = productId
            self.name = name
            self.rentals = rentals
            self.sales = sales
            self.revenue = revenue
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            productId = c.lenient(.productId)
            name = c.lenient(.name)
            rentals = c.lenient(.rentals)
            sales = c.lenient(.sales)
            revenue = c.lenient(.revenue)
        }

        private enum CodingKeys: String, CodingKey { case productId, name, rentals, sales, revenue }
    }

    struct Customers: Decodable, Equatable {
        let total: Double?
        let new: Double?
        let returning: Double?
        let returningShare: Double?

        init(total: Double?, new: Double?, returning: Double?, returningShare: Double?) {
            self.total = total
            self.new = new
            self.returning = returning
            self.returningShare = returningShare
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            total = c.lenient(.total)
            new = c.lenient(.new)
            returning = c.lenient(.returning)
            returningShare = c.lenient(.returningShare)
        }

        private enum CodingKeys: String, CodingKey { case total, new, returning, returningShare }
    }
}

/// What the sheet shows
enum WeeklySummaryState: Equatable {
    case ready
    case noOrders
    /// Not written yet (status NONE): the sheet asks the API to write it
    case none
}

/// "▲12%" / "▼3", and whether the change is good news (green) or bad (red)
struct WeeklySummaryChange: Equatable {
    let text: String
    let good: Bool
}

/// One bar of "new orders per day"
struct WeeklySummaryBar: Equatable {
    let label: String
    let count: Int
    /// 0…1 of the highest day
    let ratio: Double
    /// The highest day(s): solid blue
    let isTop: Bool
}

enum WeeklySummaryLogic {
    /// The button: the API said the AI is on
    static func showsButton(_ data: WeeklySummaryData?) -> Bool {
        data?.available == true
    }

    static func state(_ data: WeeklySummaryData?) -> WeeklySummaryState {
        switch data?.status?.uppercased() {
        case "READY": return .ready
        case "NO_ORDERS": return .noOrders
        default: return .none
        }
    }

    /// Red dot: last week's summary has not been opened yet (by anyone of the scope, app or web)
    static func showsDot(_ data: WeeklySummaryData?) -> Bool {
        showsButton(data) && state(data) == .none
    }

    /// Percent change rounded to a whole number; nil (no arrow) when it rounds to 0 or is unknown.
    /// `upIsGood` false flips the colours (late returns).
    static func percentChange(_ growth: Double?, upIsGood: Bool = true) -> WeeklySummaryChange? {
        guard let growth, growth.isFinite else { return nil }
        let pct = Int(abs(growth).rounded())
        guard pct != 0 else { return nil }
        let up = growth > 0
        return WeeklySummaryChange(text: (up ? "▲" : "▼") + "\(pct)%", good: up == upIsGood)
    }

    /// Change of a count against the week before ("▲5" = 42 − 37); nil when equal or unknown
    static func countChange(_ change: WeeklySummaryData.Change?, upIsGood: Bool = true) -> WeeklySummaryChange? {
        guard let current = change?.current, let previous = change?.previous else { return nil }
        let diff = Int((current - previous).rounded())
        guard diff != 0 else { return nil }
        return WeeklySummaryChange(text: (diff > 0 ? "▲" : "▼") + "\(abs(diff))", good: (diff > 0) == upIsGood)
    }

    /// A count as a whole number ("38"); "0" when missing
    static func count(_ value: Double?) -> Int {
        guard let value, value.isFinite else { return 0 }
        return Int(value.rounded())
    }

    /// A hot item's "lượt": rentals + sales (a sold-only item is not "0 lượt")
    static func times(_ product: WeeklySummaryData.HotProduct) -> Int {
        count(product.rentals) + count(product.sales)
    }

    /// "38 · 4 · 2"
    static func joined(_ values: [Double?]) -> String {
        values.map { String(count($0)) }.joined(separator: " · ")
    }

    /// "T2 09/11" (Vietnamese) / "Mon 09/11": the app's short weekday and dd/MM of a `yyyy-MM-dd` key
    static func dayLabel(_ key: String, locale: Locale, timeZone: TimeZone = Date.shopTimeZone) -> String {
        guard let date = OverviewLogic.date(of: key, timeZone: timeZone) else { return key }
        return DayFormatter.weekday(date, timeZone: timeZone, locale: locale) + " " + OverviewLogic.dayMonth(key)
    }

    /// "T2 09/11 – CN 15/11"; empty without a week
    static func weekRange(_ week: WeeklySummaryData.Week?, locale: Locale, timeZone: TimeZone = Date.shopTimeZone) -> String {
        guard let start = week?.start, let end = week?.end else { return "" }
        return "\(dayLabel(start, locale: locale, timeZone: timeZone)) – \(dayLabel(end, locale: locale, timeZone: timeZone))"
    }

    /// "Cả shop · T2 09/11 – CN 15/11" / "Lê Lợi · T2 09/11 – CN 15/11"
    static func subtitle(_ data: WeeklySummaryData?, wholeShop: String, locale: Locale,
                         timeZone: TimeZone = Date.shopTimeZone) -> String {
        let scope = data?.branchName.flatMap { $0.isEmpty ? nil : $0 } ?? wholeShop
        let range = weekRange(data?.week, locale: locale, timeZone: timeZone)
        return range.isEmpty ? scope : "\(scope) · \(range)"
    }

    /// The ISO time of `generatedAt`
    static func parseTime(_ iso: String?) -> Date? {
        guard let iso else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    }

    /// "T2 16/11 08:12" in the shop zone
    static func timeLabel(_ date: Date, locale: Locale, timeZone: TimeZone = Date.shopTimeZone) -> String {
        let key = DayFormatter.key(date, timeZone: timeZone)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return dayLabel(key, locale: locale, timeZone: timeZone) + String(format: " %02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    /// The two days of "Viết lúc %1$@ · bản mới vào %2$@"; nil when either is unknown
    static func writtenParts(_ data: WeeklySummaryData?, locale: Locale,
                             timeZone: TimeZone = Date.shopTimeZone) -> (written: String, next: String)? {
        guard let date = parseTime(data?.summary?.generatedAt), let next = data?.nextWeekStart else { return nil }
        return (timeLabel(date, locale: locale, timeZone: timeZone), dayLabel(next, locale: locale, timeZone: timeZone))
    }

    /// Seven bars, Monday first, labelled with the weekday; the highest day(s) solid
    static func bars(_ days: [WeeklySummaryData.DayCount]?, locale: Locale,
                     timeZone: TimeZone = Date.shopTimeZone) -> [WeeklySummaryBar] {
        let items = (days ?? []).compactMap { day -> (key: String, count: Int)? in
            guard let key = day.date else { return nil }
            return (key, max(0, count(day.count)))
        }
        let top = items.map(\.count).max() ?? 0
        return items.map { item in
            let label: String
            if let date = OverviewLogic.date(of: item.key, timeZone: timeZone) {
                label = DayFormatter.weekday(date, timeZone: timeZone, locale: locale)
            } else {
                label = item.key
            }
            return WeeklySummaryBar(label: label, count: item.count, ratio: top > 0 ? Double(item.count) / Double(top) : 0,
                                    isTop: top > 0 && item.count == top)
        }
    }

    /// Text without surrounding spaces; nil when empty
    static func text(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? nil : trimmed
    }

    /// The AI's to-do lines, empty ones dropped
    static func actions(_ content: WeeklySummaryData.Content?) -> [String] {
        (content?.actions ?? []).compactMap(text)
    }
}

/// #1618 (owner): the ✦ on the weekly summary button twinkles: a pop with a quarter turn, then a rest. ✦ looks the
/// same after a quarter turn, so the loop has no jump. Off with Reduce Motion. Android: `WeeklySummaryTwinkle`.
enum WeeklySummaryTwinkle {
    static let duration: Double = 2.4
    static let keyTimes: [Double] = [0, 0.15, 0.35, 1]
    static let scales: [Double] = [1, 1.3, 1, 1]
    static let turns: [Double] = [0, Double.pi / 4, Double.pi / 2, Double.pi / 2]

    static func runs(reduceMotion: Bool) -> Bool { !reduceMotion }
}
