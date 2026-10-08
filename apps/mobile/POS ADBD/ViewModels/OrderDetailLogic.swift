//
//  OrderDetailLogic.swift
//  POS ADBD
//
//  Pure rules of the redesigned order detail (#372): which actions a status allows, the money shown
//  at hand-over and return (same rule as the API, `apps/api/lib/order-balance.ts`), the note photo
//  payload, and what a failed status change does.
//

import Foundation

/// The one primary button of a rental detail
enum OrderPrimaryAction: Equatable {
    case handOver
    case takeReturn
    case none
}

struct OrderDetailActions: Equatable {
    let primary: OrderPrimaryAction
    /// Load the order into the cart (current edit flow)
    let canEdit: Bool
    let canCancel: Bool
    let canDelete: Bool
}

/// A row of the ⋯ sheet (#519, board CT-thao-tac)
enum OrderSheetAction: Equatable {
    case print, share, notes, edit, extend, history
    case cancel, delete

    var isDestructive: Bool { self == .cancel || self == .delete }
}

/// The ⋯ sheet: everyday actions, then the red group apart
struct OrderSheetActions: Equatable {
    let main: [OrderSheetAction]
    let destructive: [OrderSheetAction]
}

/// A payment of the order as the money rule needs it
struct OrderPaymentLine: Equatable {
    let amount: Double
    let status: String?
    let notes: String?
}

/// Hand-over: total − deposit + collateral money − completed PICKUP payments
struct HandOverMoney: Equatable {
    let total: Double
    let deposit: Double
    let collateralMoney: Double
    let paidBefore: Double

    var due: Double { max(0, total - deposit + collateralMoney - paidBefore) }
}

/// Return: late + damage − collateral money − completed RETURN_ADJUSTMENT payments (negative = give back)
struct ReturnMoney: Equatable {
    let lateFee: Double
    let damageFee: Double
    let collateralMoney: Double
    let settledBefore: Double

    var fees: Double { lateFee + damageFee }
    var net: Double { fees - collateralMoney - settledBefore }
    var collect: Double { max(0, net) }
    var refund: Double { max(0, -net) }
}

/// How to save notes: `keptURLs` (JSON set-list) only when photos were removed, then the new files (multipart)
struct NotesSavePlan: Equatable {
    let keptURLs: [String]?
    let newCount: Int
}

/// What the screen does after a status change fails
struct StatusErrorOutcome: Equatable {
    let message: String
    /// The order changed elsewhere or the step is not allowed: reload the detail
    let reload: Bool
}

/// #643 header box: what the right side of the status line says (Vietnam civil days)
enum OrderHeaderRemainder: Equatable {
    /// Reserved: "giao sau K ngày" / "giao hôm nay" / "quá ngày lấy K ngày"
    case handOverIn(Int)
    case handOverToday
    case pickupOverdue(Int)
    /// Picked up: "trả sau K ngày" / "trả hôm nay"; a late return says nothing here (the red banner says it)
    case returnIn(Int)
    case returnToday
    case returned
    case none
}

/// #643 header box: one of the three rental steps ("Đặt / T2 14/09", "Đã giao / T4 01/10", "Trả / T3 07/10")
struct OrderHeaderStep: Equatable {
    enum Kind: Equatable { case booked, handOver, returnBack }
    let kind: Kind
    let done: Bool
    let date: Date?

    /// Localizable key of the step label: "Giao" turns "Đã giao" and "Trả" turns "Đã trả" once done
    var labelKey: String {
        switch kind {
        case .booked: return "order.header.step.booked"
        case .handOver: return done ? "order.header.step.handedOver" : "order.header.step.handOver"
        case .returnBack: return done ? "order.header.step.returned" : "order.header.step.return"
        }
    }
}

/// #643 the customer line: nil name means "Khách lẻ"; nil phone hides the phone and the call button
struct OrderHeaderCustomer: Equatable {
    let name: String?
    let phone: String?
}

enum OrderDetailLogic {
    static let maxNotePhotos = 5

    /// "Sẵn sàng giao" (#470): a rental not handed over yet, for users who may update orders
    static func showsReadyToDeliver(orderType: OrderType, status: OrderStatus, canUpdateOrders: Bool) -> Bool {
        canUpdateOrders && orderType == .rent && status == .reserved
    }

    static func actions(orderType: OrderType, status: OrderStatus, canManageOrders: Bool,
                        canDeleteCancelled: Bool) -> OrderDetailActions {
        let primary: OrderPrimaryAction
        switch (orderType, status) {
        case (.rent, .reserved): primary = .handOver
        case (.rent, .pickuped): primary = .takeReturn
        default: primary = .none
        }
        // Same rule as the current swipe "Update Order" (SaleViewController)
        let editable = (orderType == .rent && status == .reserved) || (orderType == .sale && status == .completed)
        // ORDER_STATUS_TRANSITIONS: RENT RESERVED/PICKUPED → CANCELLED, SALE RESERVED/COMPLETED → CANCELLED
        let cancellable: Bool
        switch (orderType, status) {
        case (.rent, .reserved), (.rent, .pickuped), (.sale, .reserved), (.sale, .completed): cancellable = true
        default: cancellable = false
        }
        return OrderDetailActions(
            primary: primary,
            canEdit: editable && canManageOrders,
            canCancel: cancellable && canManageOrders,
            canDelete: status == .cancelled && canDeleteCancelled
        )
    }

    // MARK: ⋯ sheet (#519, board CT-thao-tac)

    /// Buttons the bottom bar shows for these actions (the same rule as the screen)
    static func bottomButtons(_ actions: OrderDetailActions, orderType: OrderType, canExtend: Bool) -> [OrderSheetAction] {
        switch actions.primary {
        case .handOver:
            return actions.canEdit ? [.edit] : []
        case .takeReturn:
            return canExtend ? [.extend] : []
        case .none:
            return (orderType == .sale && actions.canCancel) ? [.cancel, .print] : [.print]
        }
    }

    /// Only what has no button on the screen: Print (unless the bottom bar has it), Share (#639, always), Notes,
    /// Edit / Extend when allowed and not on screen, History; then Cancel / Delete when allowed and not on screen
    /// #670: History only when [canViewHistory] (not OUTLET_STAFF)
    static func sheetActions(_ actions: OrderDetailActions, orderType: OrderType, canExtend: Bool,
                             canViewHistory: Bool = true) -> OrderSheetActions {
        let onScreen = bottomButtons(actions, orderType: orderType, canExtend: canExtend)
        var candidates: [OrderSheetAction] = [.print, .share, .notes]
        if actions.canEdit { candidates.append(.edit) }
        if canExtend { candidates.append(.extend) }
        if canViewHistory { candidates.append(.history) }
        var danger: [OrderSheetAction] = []
        if actions.canCancel { danger.append(.cancel) }
        if actions.canDelete { danger.append(.delete) }
        return OrderSheetActions(main: candidates.filter { !onScreen.contains($0) },
                                 destructive: danger.filter { !onScreen.contains($0) })
    }

    /// "Có 1 ghi chú · 2 ảnh", "Có 2 ảnh"; "Thêm ghi chú" when there is none
    static func notesSubtitle(text: String?, photoCount: Int) -> String {
        let hasText = !(text ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        switch (hasText, photoCount > 0) {
        case (false, false):
            return "order.sheet.notes.add".localized()
        case (true, false):
            return "order.sheet.notes.text".localized()
        case (false, true):
            return PluralText.format("order.sheet.notes.photos", count: photoCount, photoCount)
        case (true, true):
            return PluralText.format("order.sheet.notes.textPhotos", count: photoCount, photoCount)
        }
    }

    static func paid(_ payments: [OrderPaymentLine], purpose: String) -> Double {
        payments
            .filter { $0.status == "COMPLETED" && $0.notes == purpose }
            .reduce(0) { $0 + $1.amount }
    }

    static func handOver(total: Double, deposit: Double, securityDeposit: Double,
                         payments: [OrderPaymentLine]) -> HandOverMoney {
        HandOverMoney(total: total, deposit: deposit, collateralMoney: securityDeposit,
                      paidBefore: paid(payments, purpose: "PICKUP"))
    }

    static func returnMoney(lateFee: Double, damageFee: Double, securityDeposit: Double,
                            payments: [OrderPaymentLine]) -> ReturnMoney {
        ReturnMoney(lateFee: lateFee, damageFee: damageFee, collateralMoney: securityDeposit,
                    settledBefore: paid(payments, purpose: "RETURN_ADJUSTMENT"))
    }

    /// `amountDue` / `refundDue` of `computeOrderBalance`
    static func balance(orderType: OrderType, status: OrderStatus, total: Double, deposit: Double,
                        securityDeposit: Double, lateFee: Double, damageFee: Double,
                        payments: [OrderPaymentLine]) -> (amountDue: Double, refundDue: Double) {
        switch (orderType, status) {
        case (.sale, _):
            return (max(0, total - paid(payments, purpose: "SALE")), 0)
        case (.rent, .reserved):
            return (handOver(total: total, deposit: deposit, securityDeposit: securityDeposit, payments: payments).due, 0)
        case (.rent, .pickuped):
            let money = returnMoney(lateFee: lateFee, damageFee: damageFee, securityDeposit: securityDeposit,
                                    payments: payments)
            return (money.collect, money.refund)
        default:
            return (0, 0)
        }
    }

    /// nil when more than `maxNotePhotos` photos would be kept
    static func notesPlan(original: [String], kept: [String], newCount: Int) -> NotesSavePlan? {
        guard kept.count + newCount <= maxNotePhotos else { return nil }
        return NotesSavePlan(keptURLs: kept == original ? nil : kept, newCount: newCount)
    }

    static func statusErrorOutcome(_ error: NSError) -> StatusErrorOutcome {
        let message = error.localizedDescription.localized()
        let isClientError = error.domain != NSURLErrorDomain && (400..<500).contains(error.code)
        return StatusErrorOutcome(message: message, reload: isClientError)
    }

    /// `dd/MM` civil day
    static func dayMonth(_ date: Date, timeZone: TimeZone = Date.shopTimeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.day, .month], from: date)
        return String(format: "%02d/%02d", parts.day ?? 0, parts.month ?? 0)
    }

    /// #482 step "Đã đặt": "14:32 28/09" in the shop zone; "14:32 28/12/25" when not the current year
    static func createdStamp(_ date: Date, now: Date = Date(), timeZone: TimeZone = Date.shopTimeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        var text = String(format: "%02d:%02d %02d/%02d", parts.hour ?? 0, parts.minute ?? 0, parts.day ?? 0, parts.month ?? 0)
        if let year = parts.year, year != calendar.component(.year, from: now) {
            text += String(format: "/%02d", year % 100)
        }
        return text
    }

    /// Whole civil days from pickup to return (a same-day rental is 1 day)
    static func rentalDays(pickup: Date?, return returnDate: Date?, timeZone: TimeZone = Date.shopTimeZone) -> Int? {
        guard let pickup, let returnDate else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: pickup),
                                           to: calendar.startOfDay(for: returnDate)).day ?? 0
        return max(1, days + 1)
    }

    // MARK: Header (#643)

    /// "Đơn thuê #100234" / "Đơn bán #100234"
    static func titleKey(orderType: OrderType) -> String {
        orderType == .sale ? "order.header.title.sale" : "order.header.title.rent"
    }

    static func headerCustomer(name: String?, phone: String?) -> OrderHeaderCustomer {
        let trimmedName = (name ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPhone = (phone ?? "").replacingOccurrences(of: " ", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let hasName = !trimmedName.isEmpty && trimmedName != "N/A"
        return OrderHeaderCustomer(name: hasName ? trimmedName : nil,
                                   phone: trimmedPhone.isEmpty ? nil : trimmedPhone)
    }

    /// Rentals that are not cancelled show the three steps (and then the "Lịch thuê" row is not needed)
    static func showsSteps(orderType: OrderType, status: OrderStatus) -> Bool {
        orderType == .rent && [.reserved, .pickuped, .returned].contains(status)
    }

    /// Đặt (created) · Giao (handed over, else planned) · Trả (returned, else planned)
    static func headerSteps(status: OrderStatus, createdAt: Date, pickupPlanAt: Date?, pickedUpAt: Date?,
                            returnPlanAt: Date?, returnedAt: Date?) -> [OrderHeaderStep] {
        let reached: Int
        switch status {
        case .reserved: reached = 1
        case .pickuped: reached = 2
        case .returned: reached = 3
        default: reached = 0
        }
        return [
            OrderHeaderStep(kind: .booked, done: reached >= 1, date: createdAt),
            OrderHeaderStep(kind: .handOver, done: reached >= 2, date: pickedUpAt ?? pickupPlanAt),
            OrderHeaderStep(kind: .returnBack, done: reached >= 3, date: returnedAt ?? returnPlanAt),
        ]
    }

    /// Planned day against today, both Vietnam civil days (#643): reserved counts to the hand-over day,
    /// picked up to the return day; a late return leaves the box with the day count only
    static func headerRemainder(status: OrderStatus, pickupPlanAt: Date?, returnPlanAt: Date?, now: Date = Date(),
                                timeZone: TimeZone = Date.shopTimeZone) -> OrderHeaderRemainder {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        func daysUntil(_ date: Date) -> Int {
            calendar.dateComponents([.day], from: calendar.startOfDay(for: now),
                                    to: calendar.startOfDay(for: date)).day ?? 0
        }
        switch status {
        case .returned:
            return .returned
        case .reserved:
            guard let pickupPlanAt else { return .none }
            let days = daysUntil(pickupPlanAt)
            if days > 0 { return .handOverIn(days) }
            return days == 0 ? .handOverToday : .pickupOverdue(-days)
        case .pickuped:
            guard let returnPlanAt else { return .none }
            let days = daysUntil(returnPlanAt)
            if days > 0 { return .returnIn(days) }
            return days == 0 ? .returnToday : .none
        default:
            return .none
        }
    }

    /// "7 ngày · trả sau 2 ngày"; "7 ngày" alone when nothing remains to say
    static func headerSummary(days: Int?, remainder: OrderHeaderRemainder) -> String? {
        var parts: [String] = []
        if let days { parts.append(PluralText.format("%d days", count: days, days)) }
        switch remainder {
        case .returnIn(let k): parts.append(PluralText.format("order.header.returnIn", count: k, k))
        case .returnToday: parts.append("order.header.returnToday".localized())
        case .handOverIn(let k): parts.append(PluralText.format("order.header.handOverIn", count: k, k))
        case .handOverToday: parts.append("order.header.handOverToday".localized())
        case .pickupOverdue(let k): parts.append(PluralText.format("order.header.pickupOverdue", count: k, k))
        case .returned: parts.append("order.header.returned".localized())
        case .none: break
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}
