//
//  RentalExtension.swift
//  POS ADBD
//
//  "Gia hạn" of a rental (#390): a later return day, checked over the added days only with the batch availability
//  call, then saved as `returnPlanAt`. Days are device-zone days, like the cart: the new return day ends at its last
//  second (`endOfDay`), so a one-day extension still occupies that day.
//

import Foundation

enum RentalExtension {
    static func canExtend(orderType: OrderType, status: OrderStatus, canUpdateOrders: Bool) -> Bool {
        guard canUpdateOrders, orderType == .rent else { return false }
        return status == .reserved || status == .pickuped
    }

    private static func calendar(_ timeZone: TimeZone) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    /// Start of the day after the current return day: the first day the picker allows
    static func firstSelectableDay(after currentReturn: Date, timeZone: TimeZone = .current) -> Date {
        let calendar = calendar(timeZone)
        let day = calendar.startOfDay(for: currentReturn)
        return calendar.date(byAdding: .day, value: 1, to: day) ?? day
    }

    /// Last second of `day`'s civil day, as the cart sends a return day
    static func returnPlanAt(_ day: Date, timeZone: TimeZone = .current) -> Date {
        let calendar = calendar(timeZone)
        let start = calendar.startOfDay(for: day)
        return calendar.date(byAdding: DateComponents(day: 1, second: -1), to: start) ?? day
    }

    static func extraDays(currentReturn: Date, newDay: Date, timeZone: TimeZone = .current) -> Int {
        let calendar = calendar(timeZone)
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: currentReturn),
                                           to: calendar.startOfDay(for: newDay)).day ?? 0
        return max(0, days)
    }

    /// The added days to check: start of the day after the current return day → end of the new day; nil when no day
    /// is added
    static func window(currentReturn: Date, newDay: Date, timeZone: TimeZone = .current) -> (start: Date, end: Date)? {
        guard extraDays(currentReturn: currentReturn, newDay: newDay, timeZone: timeZone) > 0 else { return nil }
        return (firstSelectableDay(after: currentReturn, timeZone: timeZone), returnPlanAt(newDay, timeZone: timeZone))
    }

    /// One request per product, quantities summed, by product id
    static func requests(_ items: [OrderItem]) -> [BatchProductRequest] {
        var quantities: [Int: Int] = [:]
        for item in items {
            guard let productId = item.productId else { continue }
            quantities[productId, default: 0] += item.quantity
        }
        return quantities.keys.sorted().map { BatchProductRequest(productId: $0, quantity: quantities[$0] ?? 0) }
    }

    /// Names of the products that are short on the added days (same rule as the cart)
    static func unavailableNames(_ results: [BatchProductAvailabilityResult], items: [OrderItem]) -> [String] {
        results.compactMap { result -> String? in
            let available = result.availabilityByOutlet?.first?.effectivelyAvailable ?? result.totalAvailableStock ?? 0
            guard !(result.isAvailable && available >= result.requestedQuantity) else { return nil }
            let name = items.first { $0.productId == result.productId }?.productName
            return [name, result.productName].compactMap { $0 }.first { !$0.isEmpty } ?? "#\(result.productId)"
        }
    }
}
