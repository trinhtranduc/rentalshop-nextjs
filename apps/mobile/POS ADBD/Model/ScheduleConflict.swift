//
//  ScheduleConflict.swift
//  POS ADBD
//
//  #518 "Cho tạo đơn khi trùng lịch" (boards CD-trung-lich, GH-trung-bat, GH-trung-tat): the shop setting and the
//  cart lines that are booked out for the chosen dates. Day math is in Vietnam civil days, like the API check
//  (`apps/api/lib/schedule-conflict.ts`): a line is short on a day when stock − units other rentals hold that day
//  is less than the quantity asked for.
//

import Foundation

/// One cart line the chosen dates cannot cover
struct CartScheduleConflict: Equatable {
    let productId: Int
    let productName: String
    /// Units missing on the worst day
    let shortBy: Int
    /// Vietnam civil days (`yyyy-MM-dd`) on which the line is short, ascending
    let dayKeys: [String]
    /// Orders that hold the item on those days, as shown in the app ("482113", "0057")
    let orderNumbers: [String]
}

/// Another rental of the same product (from batch availability `conflicts`)
struct ScheduleBooking: Equatable {
    let orderNumber: String?
    let quantity: Int
    let pickup: Date
    let returnDate: Date
}

enum ScheduleConflictLogic {
    static var timeZone: TimeZone { Date.shopTimeZone }

    /// The shop setting; a merchant cached before #518 (field missing) reads ON, the old behaviour
    static func allowsOverlap(_ merchant: Merchant?) -> Bool {
        merchant?.allowOverlappingOrders ?? true
    }

    /// Only the shop owner changes the setting (the API also refuses other roles)
    static func canEditSetting(role: Role?) -> Bool {
        role == .merchant
    }

    /// What "Tạo đơn" does with the current conflicts
    enum CtaState: Equatable {
        /// No conflict (or a sale): as before
        case normal
        /// Setting ON: the confirm sheet warns and its button reads "Vẫn tạo đơn"
        case warnBeforeCreate
        /// Setting OFF: "Tạo đơn" is disabled with a notice
        case blocked
    }

    static func ctaState(isRent: Bool, conflicts: [CartScheduleConflict], allowOverlap: Bool) -> CtaState {
        guard isRent, !conflicts.isEmpty else { return .normal }
        return allowOverlap ? .warnBeforeCreate : .blocked
    }

    /// Civil day keys from the start day to the end day, inclusive (a same-day rental is one day)
    static func dayKeys(from start: Date, to end: Date, timeZone: TimeZone = ScheduleConflictLogic.timeZone) -> [String] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        var day = calendar.startOfDay(for: start)
        let last = calendar.startOfDay(for: max(start, end))
        var keys: [String] = []
        // 400 days is far beyond any rental; it only guards against a broken date
        while day <= last && keys.count < 400 {
            keys.append(DayFormatter.key(day, timeZone: timeZone))
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }
        return keys
    }

    /// Days of the window that other bookings hold and on which `stock` minus those bookings is below `requested`.
    /// A day no other order holds is never a conflict (same rule as the API: shops that keep stock at 0 are not blocked).
    /// Without a stock figure, `available` (units free for the whole window) decides for every day, but only when
    /// other orders hold the product (`heldByOthers`, defaulting to "some booking was read").
    static func conflict(productId: Int, productName: String, requested: Int, stock: Int?, available: Int?,
                         bookings: [ScheduleBooking], pickup: Date, returnDate: Date,
                         heldByOthers: Bool? = nil,
                         timeZone: TimeZone = ScheduleConflictLogic.timeZone) -> CartScheduleConflict? {
        guard requested > 0 else { return nil }
        guard heldByOthers ?? !bookings.isEmpty else { return nil }
        let window = dayKeys(from: pickup, to: returnDate, timeZone: timeZone)
        guard !window.isEmpty else { return nil }
        let held = bookings.map { (booking: $0, days: Set(dayKeys(from: $0.pickup, to: $0.returnDate, timeZone: timeZone))) }

        var shortDays: [String] = []
        var worst = 0
        if let stock {
            for key in window {
                let booked = held.filter { $0.days.contains(key) }.reduce(0) { $0 + max(0, $1.booking.quantity) }
                let free = max(0, stock - booked)
                if booked > 0 && free < requested {
                    shortDays.append(key)
                    worst = max(worst, requested - free)
                }
            }
        } else if let available, available < requested {
            shortDays = window
            worst = requested - max(0, available)
        }
        guard !shortDays.isEmpty else { return nil }

        let short = Set(shortDays)
        var numbers: [String] = []
        for entry in held where !entry.days.isDisjoint(with: short) {
            guard let raw = entry.booking.orderNumber?.trimmingCharacters(in: .whitespaces), !raw.isEmpty else { continue }
            let number = OrdersHomeLogic.shortNumber(raw)
            if !numbers.contains(number) { numbers.append(number) }
        }
        return CartScheduleConflict(productId: productId, productName: productName, shortBy: worst,
                                    dayKeys: shortDays, orderNumbers: numbers)
    }

    /// The conflict of one batch availability result (the call the cart already makes); nil when it fits
    static func conflict(from result: BatchProductAvailabilityResult, productName: String?, pickup: Date, returnDate: Date,
                         timeZone: TimeZone = ScheduleConflictLogic.timeZone) -> CartScheduleConflict? {
        let outlet = result.availabilityByOutlet?.first
        let available = outlet?.effectivelyAvailable ?? result.totalAvailableStock
        // Same "fits" rule as the cart's availability tag: nothing to explain
        if result.isAvailable, let available, available >= result.requestedQuantity { return nil }
        let bookings: [ScheduleBooking] = (outlet?.conflicts ?? []).compactMap { conflict in
            guard let pickup = conflict.pickupDate.flatMap(ISOInstant.parse),
                  let back = conflict.returnDate.flatMap(ISOInstant.parse) else { return nil }
            return ScheduleBooking(orderNumber: conflict.orderNumber, quantity: conflict.quantity ?? 0, pickup: pickup, returnDate: back)
        }
        let name = (productName?.isEmpty == false ? productName : result.productName) ?? ""
        return conflict(productId: result.productId, productName: name, requested: result.requestedQuantity,
                        stock: outlet?.stock ?? result.totalStock, available: available, bookings: bookings,
                        pickup: pickup, returnDate: returnDate,
                        heldByOthers: !(outlet?.conflicts ?? []).isEmpty, timeZone: timeZone)
    }

    // MARK: Texts

    /// "03–05/10", "03/10", "30/09–02/10" (first and last short day)
    static func dayRange(_ keys: [String]) -> String {
        func parts(_ key: String) -> (day: String, month: String)? {
            let bits = key.split(separator: "-")
            guard bits.count == 3 else { return nil }
            return (String(bits[2]), String(bits[1]))
        }
        guard let firstKey = keys.first, let first = parts(firstKey) else { return "" }
        guard let lastKey = keys.last, lastKey != firstKey, let last = parts(lastKey) else {
            return "\(first.day)/\(first.month)"
        }
        if first.month == last.month {
            return "\(first.day)–\(last.day)/\(last.month)"
        }
        return "\(first.day)/\(first.month)–\(last.day)/\(last.month)"
    }

    /// "#482113, #0057"
    static func orderList(_ numbers: [String]) -> String {
        numbers.map { "#" + $0 }.joined(separator: ", ")
    }

    /// Red tag on the cart line (#684): "Hết hàng ngày 03/10" or "Hết hàng từ 03/10 → 05/10"; a tap opens Lịch trống
    /// on [focusDay]. The orders are on that screen, not on the tag
    static func tagText(_ conflict: CartScheduleConflict) -> String {
        guard let first = conflict.dayKeys.first, let last = conflict.dayKeys.last else { return "" }
        if first == last { return String(format: "cart.overlap.tagOneDay".localized(), dayRange([first])) }
        return String(format: "cart.overlap.tagRange".localized(), dayRange([first]), dayRange([last]))
    }

    /// The day Lịch trống opens on from the tag: the first clashing day
    static func focusDay(_ conflict: CartScheduleConflict) -> String? {
        conflict.dayKeys.first
    }

    /// Line of the orange "Trùng lịch" block: "Vest đen slim fit thiếu 1 bộ ngày 03–05/10 (đã thuê ở #482113)."
    static func warningLine(_ conflict: CartScheduleConflict) -> String {
        let range = dayRange(conflict.dayKeys)
        if conflict.orderNumbers.isEmpty {
            return String(format: "cart.overlap.line.noOrders".localized(), conflict.productName, conflict.shortBy, range)
        }
        return String(format: "cart.overlap.line".localized(), conflict.productName, conflict.shortBy, range,
                      orderList(conflict.orderNumbers))
    }
}

/// The #518 setting cached on the signed-in user (login / profile payload), changed by the shop owner in Cài đặt
enum OverlapSetting {
    /// ON unless the cached merchant says OFF
    static var isAllowed: Bool { ScheduleConflictLogic.allowsOverlap(User.account()?.merchant) }

    /// A toggle save is on its way: a profile refresh must not overwrite the optimistic value
    static var saving = false
    private static var lastRefresh: Date?

    /// Writes the value into the cached user
    static func store(_ allowed: Bool) {
        guard let user = User.account(), user.merchant != nil else { return }
        guard user.merchant?.allowOverlappingOrders != allowed else { return }
        user.merchant?.allowOverlappingOrders = allowed
        User.save(user: user)
    }

    /// Reads the shop's current value (GET /api/users/profile), at most once a minute unless forced, so staff see
    /// a change the owner made after they signed in. Completion runs on the main queue with the value in effect.
    static func refresh(force: Bool = false, completion: ((Bool) -> Void)? = nil) {
        if !force, let lastRefresh, Date().timeIntervalSince(lastRefresh) < 60 {
            completion?(isAllowed)
            return
        }
        lastRefresh = Date()
        TabsV2APIService.shared.allowOverlappingOrders { allowed, _ in
            DispatchQueue.main.async {
                if let allowed, !saving { store(allowed) }
                completion?(isAllowed)
            }
        }
    }
}
