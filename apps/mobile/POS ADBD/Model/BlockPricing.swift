//
//  BlockPricing.swift
//  POS ADBD
//
//  Day-block rental pricing (#1189): a price table by number of days (1 day 80.000, 2 days 100.000, 3 days 120.000,
//  then "+20.000 per extra day"). Port of `calculateBlockRent` in packages/utils/src/core/block-pricing.ts; the unit
//  tests run it against the shared golden file tests/fixtures/block-pricing-golden.json. No UIKit here.
//

import Foundation

/// A price table as the API stores it on a BLOCK option and on an order line (`pricingSnapshot`)
struct BlockTable: Equatable, Codable {
    static let extraPerDay = "EXTRA_PER_DAY"
    static let holdLast = "HOLD_LAST"

    /// `tiers[i]` = the all-in price of renting exactly `startDay + i` days (not per day, not cumulative)
    var tiers: [Double]
    var startDay: Int = 1
    var extraMode: String = BlockTable.extraPerDay
    var extraPrice: Double?

    var lastTierDay: Int { startDay + tiers.count - 1 }
}

/// Price of one unit and how it was reached
struct BlockRentDetail: Equatable {
    let total: Double
    let days: Int
    let lastTierDay: Int
    /// The day number of the tier that applies (the last one when past the table, the first one before it)
    let tierDay: Int
    let extraDays: Int
    let basePrice: Double
    let extraAmount: Double
    let extraPrice: Double
}

enum BlockPricing {
    static let maxTiers = 31
    static let maxStartDay = 31

    /// VND, JPY, KRW have no cents; every other code has (as the API's `currencyMinorUnit`)
    static func minorUnit(currency: String?) -> Double {
        ["VND", "JPY", "KRW", "CLP", "ISK"].contains((currency ?? "").uppercased()) ? 1 : 0.01
    }

    /// Rounds half up to the minor unit; `%.12g` removes float noise such as 1.005 * 100 = 100.49999999999999
    static func round(_ value: Double, minorUnit: Double = 1) -> Double {
        let per = (1 / minorUnit).rounded()
        let scaled = Double(String(format: "%.12g", value * per)) ?? value * per
        return (scaled + 0.5).rounded(.down) / per
    }

    private static func isMoney(_ value: Double) -> Bool { value.isFinite && value >= 0 }

    /// 1..31 tiers of 0 or more, start day 1..31, a known mode, an extra of 0 or more
    static func isValid(_ table: BlockTable) -> Bool {
        guard !table.tiers.isEmpty, table.tiers.count <= maxTiers, table.tiers.allSatisfy(isMoney) else { return false }
        guard table.startDay >= 1, table.startDay <= maxStartDay else { return false }
        guard [BlockTable.extraPerDay, BlockTable.holdLast].contains(table.extraMode) else { return false }
        if let extra = table.extraPrice, !isMoney(extra) { return false }
        return true
    }

    /// Price of one unit rented for `days` days; nil for a table that is not valid
    static func detail(_ table: BlockTable, days: Int, minorUnit: Double = 1) -> BlockRentDetail? {
        guard isValid(table) else { return nil }
        let d = max(1, days)
        let start = table.startDay
        let lastTierDay = table.lastTierDay
        var base: Double
        var tierDay: Int
        var extraDays = 0
        var extraAmount = 0.0
        if d <= start {
            base = table.tiers[0]
            tierDay = start
        } else if d <= lastTierDay {
            base = table.tiers[d - start]
            tierDay = d
        } else {
            base = table.tiers[table.tiers.count - 1]
            tierDay = lastTierDay
            if table.extraMode == BlockTable.extraPerDay {
                extraDays = d - lastTierDay
                extraAmount = Double(extraDays) * (table.extraPrice ?? 0)
            }
        }
        // Exact sum first, one rounding at the end (never per day)
        return BlockRentDetail(total: round(base + extraAmount, minorUnit: minorUnit), days: d, lastTierDay: lastTierDay,
                               tierDay: tierDay, extraDays: extraDays, basePrice: base,
                               extraAmount: round(extraAmount, minorUnit: minorUnit), extraPrice: table.extraPrice ?? 0)
    }

    static func rent(_ table: BlockTable, days: Int, minorUnit: Double = 1) -> Double? {
        detail(table, days: days, minorUnit: minorUnit)?.total
    }

    /// The same function with the arguments of the TypeScript one
    static func calculateBlockRent(tiers: [Double], startDay: Int?, extraMode: String?, extraPrice: Double?,
                                   days: Int, minorUnit: Double = 1) -> Double? {
        rent(BlockTable(tiers: tiers, startDay: startDay ?? 1, extraMode: extraMode ?? BlockTable.extraPerDay, extraPrice: extraPrice),
             days: days, minorUnit: minorUnit)
    }

    // MARK: Text

    /// "Khối 3 ngày + 2 ngày thêm" (cart line) / "Khối 3 ngày" inside the table
    static func summary(_ detail: BlockRentDetail) -> String {
        let block = String(format: "block.summary.block".localized(), detail.tierDay)
        guard detail.extraDays > 0 else { return block }
        return block + " " + String(format: "block.summary.extra".localized(), detail.extraDays)
    }

    /// "120.000 (3 ngày) + 2 × 20.000 = 160.000" past the table, "120.000 (3 ngày)" inside it (one unit)
    static func formula(_ detail: BlockRentDetail, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        let money: (Double) -> String = { MoneyFormatter.format($0, currency: currency) }
        let base = money(detail.basePrice) + " (" + PluralText.format("products.cart.days", count: detail.tierDay, detail.tierDay) + ")"
        guard detail.extraDays > 0 else { return base }
        return base + " + \(detail.extraDays) × " + money(detail.extraPrice) + " = " + money(detail.total)
    }

    /// Form row: "3 mốc · +20.000đ mỗi ngày" / "3 mốc · giữ giá khối cuối"
    static func rowSummary(_ table: BlockTable, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        let count = String(format: "block.row.tiers".localized(), table.tiers.count)
        if table.extraMode == BlockTable.extraPerDay, let extra = table.extraPrice, extra > 0 {
            return count + " · " + String(format: "block.row.extra".localized(), MoneyFormatter.suffixed(extra, currency: currency))
        }
        return count + " · " + "block.row.hold".localized()
    }

    /// "1 ngày 80.000 · 3 ngày 120.000": first and last tier
    static func rangeSummary(_ table: BlockTable, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        guard let first = table.tiers.first, let last = table.tiers.last else { return "" }
        func part(_ day: Int, _ price: Double) -> String {
            PluralText.format("products.cart.days", count: day, day) + " " + MoneyFormatter.format(price, currency: currency)
        }
        if table.tiers.count == 1 { return part(table.startDay, first) }
        return part(table.startDay, first) + " · " + part(table.lastTierDay, last)
    }
}

// MARK: - Decoding the API's block fields

/// Numbers from the API are JSON numbers; a Decimal column may arrive as a string
enum BlockJSON {
    static func double<K: CodingKey>(_ container: KeyedDecodingContainer<K>, _ key: K) -> Double? {
        if let value = (try? container.decodeIfPresent(Double.self, forKey: key)) ?? nil { return value }
        if let text = (try? container.decodeIfPresent(String.self, forKey: key)) ?? nil { return Double(text) }
        return nil
    }

    static func doubles<K: CodingKey>(_ container: KeyedDecodingContainer<K>, _ key: K) -> [Double]? {
        if let values = (try? container.decodeIfPresent([Double].self, forKey: key)) ?? nil { return values }
        if let texts = (try? container.decodeIfPresent([String].self, forKey: key)) ?? nil {
            let parsed = texts.compactMap { Double($0) }
            return parsed.count == texts.count ? parsed : nil
        }
        return nil
    }
}

/// `orderItems[].pricingSnapshot` of a BLOCK line: the table as it was when the order was made, and how the unit
/// price was reached (the API never changes it after the shop edits the product)
struct BlockSnapshot: Codable, Equatable {
    var type: String?
    var tiers: [Double]
    var startDay: Int
    var extraMode: String
    var extraPrice: Double?
    var currency: String?
    var days: Int?
    var quantity: Int?
    var unitPrice: Double?
    var totalPrice: Double?
    var basePrice: Double?
    var extraDays: Int?
    var extraAmount: Double?
    var overridden: Bool?

    private enum CodingKeys: String, CodingKey {
        case type, tiers, startDay, extraMode, extraPrice, currency, days, quantity, unitPrice, totalPrice, basePrice
        case extraDays, extraAmount, overridden
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        type = (try? c.decodeIfPresent(String.self, forKey: .type)) ?? nil
        guard let tiers = BlockJSON.doubles(c, .tiers), !tiers.isEmpty else {
            throw DecodingError.dataCorruptedError(forKey: .tiers, in: c, debugDescription: "no tiers")
        }
        self.tiers = tiers
        startDay = ((try? c.decodeIfPresent(Int.self, forKey: .startDay)) ?? nil) ?? 1
        extraMode = ((try? c.decodeIfPresent(String.self, forKey: .extraMode)) ?? nil) ?? BlockTable.extraPerDay
        extraPrice = BlockJSON.double(c, .extraPrice)
        currency = (try? c.decodeIfPresent(String.self, forKey: .currency)) ?? nil
        days = (try? c.decodeIfPresent(Int.self, forKey: .days)) ?? nil
        quantity = (try? c.decodeIfPresent(Int.self, forKey: .quantity)) ?? nil
        unitPrice = BlockJSON.double(c, .unitPrice)
        totalPrice = BlockJSON.double(c, .totalPrice)
        basePrice = BlockJSON.double(c, .basePrice)
        extraDays = (try? c.decodeIfPresent(Int.self, forKey: .extraDays)) ?? nil
        extraAmount = BlockJSON.double(c, .extraAmount)
        overridden = (try? c.decodeIfPresent(Bool.self, forKey: .overridden)) ?? nil
    }

    var table: BlockTable {
        BlockTable(tiers: tiers, startDay: startDay, extraMode: extraMode, extraPrice: extraPrice)
    }

    /// The saved breakdown for the days stored on the line; nil when the stored table is not usable
    func detail(days overrideDays: Int? = nil) -> BlockRentDetail? {
        BlockPricing.detail(table, days: overrideDays ?? days ?? 1, minorUnit: BlockPricing.minorUnit(currency: currency))
    }
}

/// 400 codes of the order and product routes a BLOCK change can meet
enum BlockPricingError {
    static let priceMismatch = "BLOCK_PRICE_MISMATCH"
    static let tableInvalid = "BLOCK_TABLE_INVALID"
    static let requiresUpdate = "PRICING_TYPE_REQUIRES_UPDATE"

    /// The cart's table is older than the product's: reload the product and price the lines again
    static func isPriceMismatch(_ error: Error) -> Bool {
        (error as NSError).userInfo[NSError.apiCodeKey] as? String == priceMismatch
    }
}

extension NSError {
    /// `userInfo` key of the API's `code` on an error built from an API response
    static let apiCodeKey = "apiCode"
}

// MARK: - Order lines

extension OrderItem {
    /// #1189: "Khối 3 ngày + 2 ngày thêm" and, past the table, "120.000 (3 ngày) + 2 × 20.000 = 160.000" (one unit),
    /// from the table the order was made with; nil on a line that is not a BLOCK line
    var blockLines: (summary: String, formula: String?)? {
        guard pricingType?.uppercased() == "BLOCK", let detail = pricingSnapshot?.detail() else { return nil }
        return (BlockPricing.summary(detail), detail.extraDays > 0 ? BlockPricing.formula(detail) : nil)
    }
}

// MARK: - Form input

extension BlockPricing {
    /// "Tạo nhanh": `days` rows, the first costs `firstDay`, each next day costs `extraPerDay` more, and every day past
    /// the table costs `extraPerDay` more too. Nil for a count outside 1...31 or a negative price.
    static func quickTable(firstDay: Double, extraPerDay: Double, days: Int) -> BlockTable? {
        guard days >= 1, days <= maxTiers, firstDay >= 0, extraPerDay >= 0 else { return nil }
        let tiers = (0..<days).map { firstDay + Double($0) * extraPerDay }
        return BlockTable(tiers: tiers, startDay: 1, extraMode: BlockTable.extraPerDay, extraPrice: extraPerDay)
    }
}

enum BlockTableInput: Equatable {
    /// every box empty: no table
    case empty
    /// some box empty or not a number
    case invalid
    case table(BlockTable)
}

extension BlockPricing {
    /// The boxes of the price screen → a table. `tierTexts[i]` is the price of day `startDay + i` as typed ("120.000").
    static func parse(tierTexts: [String], startDay: Int = 1, extraMode: String, extraText: String) -> BlockTableInput {
        let tiers = tierTexts.map { MoneyInput.parse($0) }
        let extra = MoneyInput.parse(extraText)
        if tiers.allSatisfy({ $0 == nil }) && extra == nil { return .empty }
        guard tiers.allSatisfy({ $0 != nil }) else { return .invalid }
        if extraMode == BlockTable.extraPerDay && extra == nil { return .invalid }
        let table = BlockTable(tiers: tiers.compactMap { $0 }, startDay: startDay, extraMode: extraMode,
                               extraPrice: extraMode == BlockTable.extraPerDay ? extra : nil)
        return isValid(table) ? .table(table) : .invalid
    }
}
