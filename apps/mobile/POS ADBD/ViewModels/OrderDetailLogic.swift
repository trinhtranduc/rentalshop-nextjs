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
    case print, notes, edit, extend, history
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

    /// Only what has no button on the screen: Print (unless the bottom bar has it), Notes, Edit / Extend when allowed
    /// and not on screen, History; then Cancel / Delete when allowed and not on screen
    static func sheetActions(_ actions: OrderDetailActions, orderType: OrderType, canExtend: Bool) -> OrderSheetActions {
        let onScreen = bottomButtons(actions, orderType: orderType, canExtend: canExtend)
        var candidates: [OrderSheetAction] = [.print, .notes]
        if actions.canEdit { candidates.append(.edit) }
        if canExtend { candidates.append(.extend) }
        candidates.append(.history)
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
}
