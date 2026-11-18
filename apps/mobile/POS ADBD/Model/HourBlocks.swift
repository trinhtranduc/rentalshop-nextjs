//
//  HourBlocks.swift
//  POS ADBD
//
//  #1621 "Theo khối giờ": a product may have up to 10 hour blocks ("2 giờ 150.000 · 4 giờ 250.000"). Each block is one
//  pricing option (`type HOURLY`, `unit HOUR`, `blockSize` = hours, `price` = the whole block) and is never the default
//  price. A cart line on a block is priced flat like "Theo lần": price × quantity, never × days. The API stores
//  `pricingSnapshot {type: 'HOURLY', hours, price}` on the order line, so "Khối 4 giờ" stays after the product changes.
//  Port of packages/utils/src/core/hour-blocks.ts. No UIKit here.
//

import Foundation

struct HourBlock: Equatable, Codable {
    var hours: Int
    var price: Double
}

enum HourBlocks {
    static let type = "HOURLY"
    static let unit = "HOUR"
    static let minHours = 1
    static let maxHours = 24
    static let maxCount = 10

    static func isHours(_ hours: Int?) -> Bool {
        guard let hours else { return false }
        return hours >= minHours && hours <= maxHours
    }

    /// The block of an option: an HOURLY option with 1–24 hours and a price of 0 or more; nil for any other option
    /// (an HOURLY option without hours is an old "per hour" price, not a block)
    static func block(_ option: PricingOption) -> HourBlock? {
        guard option.type.uppercased() == type, isHours(option.blockSize), option.price.isFinite, option.price >= 0,
              let hours = option.blockSize else { return nil }
        return HourBlock(hours: hours, price: option.price)
    }

    /// The active block options of a product, shortest first (the cart's choices keep their option ids)
    static func options(_ options: [PricingOption]?) -> [PricingOption] {
        (options ?? []).filter { $0.isActive != false && block($0) != nil }
            .sorted { ($0.blockSize ?? 0) < ($1.blockSize ?? 0) }
    }

    /// The active blocks of a product, shortest first
    static func of(_ options: [PricingOption]?) -> [HourBlock] {
        self.options(options).compactMap(block)
    }

    // MARK: Text

    /// "Khối 4 giờ"
    static func label(hours: Int) -> String {
        String(format: "hourBlock.label".localized(), hours)
    }

    /// Form row: "3 khối: 2 · 4 · 8 giờ"
    static func rowSummary(_ blocks: [HourBlock]) -> String {
        let hours = blocks.map { String($0.hours) }.joined(separator: " · ")
        return PluralText.format("hourBlock.summary", count: blocks.count, blocks.count, hours)
    }

    /// Form row, second line: "150.000 – 400.000" (one block: its price)
    static func rangeSummary(_ blocks: [HourBlock], currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        let prices = blocks.map(\.price)
        guard let low = prices.min(), let high = prices.max() else { return "" }
        let money: (Double) -> String = { MoneyFormatter.format($0, currency: currency) }
        return low == high ? money(low) : money(low) + " – " + money(high)
    }

    /// Product detail: "2 giờ 150.000đ · 4 giờ 250.000đ · 8 giờ 400.000đ"
    static func detailSummary(_ blocks: [HourBlock], currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        blocks.map { String(format: "hourBlock.detail".localized(), $0.hours, MoneyFormatter.suffixed($0.price, currency: currency)) }
            .joined(separator: " · ")
    }
}

// MARK: - Form input

enum HourBlocksIssue: Equatable {
    /// hours not a whole number from 1 to 24
    case hours
    /// the same number of hours twice
    case repeated
    /// a block without a price
    case price
    case tooMany

    var message: String {
        switch self {
        case .hours: return "hourBlock.error.hours".localized()
        case .repeated: return "hourBlock.error.repeated".localized()
        case .price: return "hourBlock.error.price".localized()
        case .tooMany: return String(format: "hourBlock.max".localized(), HourBlocks.maxCount)
        }
    }
}

enum HourBlocksInput: Equatable {
    /// every row empty: no blocks ("Chưa cài")
    case empty
    case invalid(HourBlocksIssue)
    /// shortest first
    case blocks([HourBlock])
}

extension HourBlocks {
    /// The rows of the setup screen as typed ("4", "250.000"). A row with both boxes empty is skipped.
    static func parse(rows: [(hours: String, price: String)]) -> HourBlocksInput {
        let filled = rows.filter { !$0.hours.trimmingCharacters(in: .whitespaces).isEmpty || MoneyInput.parse($0.price) != nil }
        if filled.isEmpty { return .empty }
        if filled.count > maxCount { return .invalid(.tooMany) }
        var blocks: [HourBlock] = []
        for row in filled {
            let text = row.hours.trimmingCharacters(in: .whitespaces)
            guard text.allSatisfy(\.isNumber), let hours = Int(text), isHours(hours) else { return .invalid(.hours) }
            guard let price = MoneyInput.parse(row.price) else { return .invalid(.price) }
            if blocks.contains(where: { $0.hours == hours }) { return .invalid(.repeated) }
            blocks.append(HourBlock(hours: hours, price: price))
        }
        return .blocks(blocks.sorted { $0.hours < $1.hours })
    }
}

// MARK: - Order lines

/// `orderItems[].pricingSnapshot` of an hour-block line: the block as it was when the order was made
struct HourBlockSnapshot: Codable, Equatable {
    var hours: Int
    var price: Double

    private enum CodingKeys: String, CodingKey { case type, hours, price }

    init(hours: Int, price: Double) {
        self.hours = hours
        self.price = price
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let type = (try? c.decodeIfPresent(String.self, forKey: .type)) ?? nil
        let hours = ((try? c.decodeIfPresent(Int.self, forKey: .hours)) ?? nil) ?? BlockJSON.double(c, .hours).map { Int($0) }
        guard type?.uppercased() == HourBlocks.type, HourBlocks.isHours(hours), let hours,
              let price = BlockJSON.double(c, .price), price >= 0 else {
            throw DecodingError.dataCorruptedError(forKey: .type, in: c, debugDescription: "not an hour block")
        }
        self.hours = hours
        self.price = price
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(HourBlocks.type, forKey: .type)
        try c.encode(hours, forKey: .hours)
        try c.encode(price, forKey: .price)
    }
}

extension OrderItem {
    /// "Khối 4 giờ" on an hour-block line; nil on any other line
    var hourBlockLabel: String? {
        guard pricingType?.uppercased() == HourBlocks.type, let snapshot = hourBlockSnapshot else { return nil }
        return HourBlocks.label(hours: snapshot.hours)
    }

    /// Print and share image: the day-block summary and formula (#1189), or "Khối 4 giờ" (#1621)
    var pricingLines: (summary: String, formula: String?)? {
        if let block = blockLines { return block }
        return hourBlockLabel.map { ($0, nil) }
    }
}
