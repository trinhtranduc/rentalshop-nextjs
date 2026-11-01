//
//  FirstRunCoach.swift
//  POS ADBD
//
//  #1394, #1411: the walk of the first-run guide: 9 bubbles on 4 screens, run only after a row of the card is tapped. What comes
//  next and how far along it is are pure rules here; the screens only say which one they are. Android: `domain/guide/FirstRunCoach.kt`.
//

import Foundation

enum CoachScreen: Equatable {
    case productForm, cart, customerPicker, newCustomer
}

enum CoachBubble: String, CaseIterable, Equatable {
    case productPhoto, productName, productPrice, productSave, cartCustomer, newCustomer, newCustomerSave, cartDates, cartCreate

    /// `accessibilityIdentifier` of the control the bubble lights; a missing one skips the bubble.
    /// Bubble 6 has two places: Khách mới on the picker, then the phone and name on the form.
    func anchor(on screen: CoachScreen) -> String {
        switch self {
        case .productPhoto: return "product.form.photos"
        case .productName: return "product.form.nameRow"
        case .productPrice: return "product.form.prices"
        case .productSave: return "product.form.save"
        case .cartCustomer: return "cart.customerRow"
        case .newCustomer: return screen == .customerPicker ? "customers.picker.new" : "customers.new.fields"
        case .newCustomerSave: return "customers.new.save"
        case .cartDates: return "cart.datesRow"
        case .cartCreate: return "cart.cta"
        }
    }

    var textKey: String { "firstRunGuide.bubble.\(rawValue)" }

    /// A button at the bottom of the screen, so its bubble goes above; the others below when there is room
    var prefersAbove: Bool { self == .cartCreate || self == .productSave || self == .newCustomerSave }

    /// Tiếp goes on from here. On every other bubble the user taps the real control and Tiếp never acts for them.
    func nextAdvances(on screen: CoachScreen) -> Bool {
        switch self {
        case .productPhoto, .productName, .productPrice: return true
        case .newCustomer: return screen == .newCustomer
        default: return false
        }
    }
}

/// The bubbles this shop and order will see. Read from the state, nothing is stored.
struct CoachPlan: Equatable {
    /// Read when the run starts: the customer just created in this run must not change the counter
    var customersExist = false
    var isSale = false

    var bubbles: [CoachBubble] {
        CoachBubble.allCases.filter { bubble in
            switch bubble {
            case .newCustomer, .newCustomerSave: return !customersExist // picks from the list
            case .cartDates: return !isSale // a sale has no dates
            default: return true
            }
        }
    }

    /// "n/9"
    func counter(_ bubble: CoachBubble) -> String? {
        bubbles.firstIndex(of: bubble).map { "\($0 + 1)/\(bubbles.count)" }
    }
}

/// What a row of the card started: the product form only, or the one run in the cart
enum CoachRun: Equatable {
    case product, order

    init(action: FirstRunGuideAction) {
        self = action == .openProductForm ? .product : .order
    }
}

struct CoachCart: Equatable {
    let isEmpty: Bool
    let hasCustomer: Bool
    let isSale: Bool
    let hasDates: Bool
    let isEditing: Bool
}

/// Tapping "Máy ảnh" while the guide waits for a photo
enum CoachCameraRoute: Equatable {
    case open, ask, denied
}

enum FirstRunCoachRules {
    /// The bubble this screen owes, or nil.
    /// - passed: moved on with Tiếp, or skipped because its control is gone. The cart asks its data, so going back and forth resumes.
    static func next(run: CoachRun?, screen: CoachScreen, passed: Set<CoachBubble>, cart: CoachCart? = nil,
                     customersExist: Bool = false, isPad: Bool = false) -> CoachBubble? {
        guard let run, !isPad else { return nil }
        let wanted: [CoachBubble]
        switch (run, screen) {
        case (.product, .productForm):
            wanted = [.productPhoto, .productName, .productPrice, .productSave]
        case (.order, .cart):
            wanted = cartBubbles(cart)
        case (.order, .customerPicker):
            wanted = customersExist ? [] : [.newCustomer]
        case (.order, .newCustomer):
            wanted = customersExist ? [] : [.newCustomer, .newCustomerSave]
        default:
            wanted = []
        }
        return wanted.first { !passed.contains($0) }
    }

    private static func cartBubbles(_ cart: CoachCart?) -> [CoachBubble] {
        guard let cart, !cart.isEditing, !cart.isEmpty else { return [] } // empty: the order was just created
        var wanted: [CoachBubble] = []
        if !cart.hasCustomer { wanted.append(.cartCustomer) }
        if !cart.isSale && !cart.hasDates { wanted.append(.cartDates) }
        wanted.append(.cartCreate)
        return wanted
    }

    // MARK: - Tiếp

    /// Inside the guide only; the normal form keeps saving without a photo
    static func photoIsValid(count: Int) -> Bool { count >= 1 }

    /// Inside the guide only; the normal form keeps saving 0đ
    static func priceIsValid(perRental: Double?, perDay: Double?) -> Bool {
        (perRental ?? 0) > 0 || (perDay ?? 0) > 0
    }

    // MARK: - Camera

    static func cameraRoute(authorized: Bool, undetermined: Bool) -> CoachCameraRoute {
        if authorized { return .open }
        return undetermined ? .ask : .denied
    }
}
