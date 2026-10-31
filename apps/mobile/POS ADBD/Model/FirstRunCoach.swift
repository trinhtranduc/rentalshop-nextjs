//
//  FirstRunCoach.swift
//  POS ADBD
//
//  #1394: the bubbles of the first-run guide: 6 bubbles on 4 screens, run only after a row of the card is tapped. The order
//  is a pure rule here; the screens only say which one they are. Android: `domain/guide/FirstRunCoach.kt`.
//

import Foundation

enum CoachScreen: Equatable {
    case productForm, cart, customerPicker, newCustomer
}

enum CoachBubble: String, CaseIterable, Equatable {
    case productName, cartCustomer, pickerNew, newCustomerFields, cartDates, cartCreate

    /// `accessibilityIdentifier` of the control the bubble lights; a missing one skips the bubble
    var anchor: String {
        switch self {
        case .productName: return "product.form.nameRow"
        case .cartCustomer: return "cart.customerRow"
        case .pickerNew: return "customers.picker.new"
        case .newCustomerFields: return "customers.new.fields"
        case .cartDates: return "cart.datesRow"
        case .cartCreate: return "cart.cta"
        }
    }

    /// "Bước n/3": the row of the card it belongs to
    var step: Int {
        switch self {
        case .productName: return 1
        case .cartCustomer, .pickerNew, .newCustomerFields: return 2
        case .cartDates, .cartCreate: return 3
        }
    }

    var textKey: String { "firstRunGuide.bubble.\(rawValue)" }

    /// The Tạo đơn button sits at the bottom, so its bubble goes above; the others below when there is room
    var prefersAbove: Bool { self == .cartCreate }
}

/// What a row of the card started: the product row only has its form, the customer and order rows are one run in the cart
enum CoachRun: Equatable {
    case product, order

    init(step: FirstRunGuideStep) {
        self = step == .product ? .product : .order
    }
}

struct CoachCart: Equatable {
    let hasCustomer: Bool
    let isSale: Bool
    let hasDates: Bool
    let isEditing: Bool
}

enum FirstRunCoachRules {
    /// The bubble this screen owes, or nil. Each bubble shows once in a run: closing it by the dim area does not bring it back.
    /// - customersExist: "Khách đầu tiên của shop" would be wrong then, the owner picks from the list
    static func next(run: CoachRun?, screen: CoachScreen, shown: Set<CoachBubble>, cart: CoachCart? = nil,
                     customersExist: Bool = false, isPad: Bool = false) -> CoachBubble? {
        guard let run, !isPad else { return nil }
        let wanted: CoachBubble?
        switch (run, screen) {
        case (.product, .productForm):
            wanted = .productName
        case (.order, .cart):
            wanted = cartBubble(cart)
        case (.order, .customerPicker):
            wanted = customersExist ? nil : .pickerNew
        case (.order, .newCustomer):
            wanted = .newCustomerFields
        default:
            wanted = nil
        }
        guard let wanted, !shown.contains(wanted) else { return nil }
        return wanted
    }

    private static func cartBubble(_ cart: CoachCart?) -> CoachBubble? {
        guard let cart, !cart.isEditing else { return nil }
        if !cart.hasCustomer { return .cartCustomer }
        if !cart.isSale && !cart.hasDates { return .cartDates } // a sale has no dates
        return .cartCreate
    }
}
