//
//  BookingRequest.swift
//  POS ADBD
//
//  #1124 "Đặt online": a customer's booking request from the shop's public page. The shop confirms it into an
//  order (prepare → a new cart → create order with `bookingRequestId`) or rejects it with a reason.
//

import Foundation

enum BookingStatus: String {
    case pending = "PENDING"
    case confirmed = "CONFIRMED"
    case rejected = "REJECTED"
    case expired = "EXPIRED"
    case cancelled = "CANCELLED"
    case unknown

    /// Localizable key of the status pill
    var titleKey: String {
        switch self {
        case .pending: return "booking.status.pending"
        case .confirmed: return "booking.status.confirmed"
        case .rejected: return "booking.status.rejected"
        case .expired: return "booking.status.expired"
        case .cancelled: return "booking.status.cancelled"
        case .unknown: return "booking.status.unknown"
        }
    }
}

enum BookingRejectReason: String, CaseIterable {
    case outOfStock = "OUT_OF_STOCK"
    case cannotContact = "CANNOT_CONTACT"
    case other = "OTHER"

    var titleKey: String {
        switch self {
        case .outOfStock: return "booking.reject.outOfStock"
        case .cannotContact: return "booking.reject.cannotContact"
        case .other: return "booking.reject.other"
        }
    }
}

struct BookingRequestItem: Decodable, Equatable {
    let productId: Int
    let productName: String?
    let quantity: Int
    let unitPrice: Double?
    /// Detail only: the first day the asked quantity is short (`YYYY-MM-DD`, shop day); nil = free every day
    let shortDay: String?
}

struct BookingCustomerRef: Decodable, Equatable {
    let id: Int
    let firstName: String?
    let lastName: String?
    let phone: String?

    var fullName: String {
        [firstName, lastName].compactMap { $0?.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
    }
}

struct BookingOutletRef: Decodable, Equatable {
    let id: Int
    let name: String?
}

/// One request (GET /api/booking-requests rows and GET /api/booking-requests/[id])
struct BookingRequest: Decodable {
    let id: Int
    let code: String
    let status: String
    let customerName: String
    let customerPhone: String
    let note: String?
    let outlet: BookingOutletRef
    /// Shop days `YYYY-MM-DD`
    let pickupDate: String
    let returnDate: String
    let pickupPlanAt: String
    let returnPlanAt: String
    let itemCount: Int
    let items: [BookingRequestItem]
    let orderId: Int?
    let rejectReason: String?
    let rejectNote: String?
    let expiresAt: String
    let createdAt: String
    /// Detail only: the shop's customer with this phone (returning customer)
    let customer: BookingCustomerRef?

    var bookingStatus: BookingStatus { BookingStatus(rawValue: status) ?? .unknown }
    var expiresAtDate: Date? { BookingLogic.isoDate(expiresAt) }
}

struct BookingRequestList: Decodable {
    let requests: [BookingRequest]
    let counts: [String: Int]
    let total: Int
    let page: Int
    let limit: Int
    let hasMore: Bool

    var pendingCount: Int { counts[BookingStatus.pending.rawValue] ?? 0 }
}

/// POST /api/booking-requests/[id]/prepare: what the cart needs to create the order
struct BookingPrepare: Decodable {
    struct Item: Decodable {
        let productId: Int
        let quantity: Int
        let productName: String?
    }

    let bookingRequestId: Int
    let orderType: String
    let outletId: Int
    let customer: BookingCustomerRef?
    let customerCreated: Bool?
    let pickupPlanAt: String
    let returnPlanAt: String
    let notes: String?
    let items: [Item]
}

enum BookingLogic {
    static let viewPermission = "bookings.view"
    static let managePermission = "bookings.manage"

    /// The "Đặt online" chip shows when the server turns the screen on, the shop takes online bookings and the user
    /// may see them (Nhân viên kho may not, #1124)
    static func isAvailable(featureOn: Bool, merchantEnabled: Bool, permissions: [String]) -> Bool {
        featureOn && merchantEnabled && permissions.contains(viewPermission)
    }

    static func canManage(permissions: [String]) -> Bool {
        permissions.contains(managePermission)
    }

    static func hasShortItem(_ items: [BookingRequestItem]) -> Bool {
        items.contains { $0.shortDay != nil }
    }

    /// "21/10 → 24/10" (one day: "21/10") from shop day keys
    static func dateRange(pickup: String, return returnDay: String) -> String {
        let a = dayMonth(pickup), b = dayMonth(returnDay)
        return a == b ? a : "\(a) → \(b)"
    }

    static func dayMonth(_ ymd: String) -> String {
        let parts = ymd.split(separator: "-")
        guard parts.count == 3 else { return ymd }
        return "\(parts[2])/\(parts[1])"
    }

    /// Whole hours left before the request expires (rounded up, never below 0)
    static func hoursLeft(expiresAt: Date, now: Date = Date()) -> Int {
        max(0, Int((expiresAt.timeIntervalSince(now) / 3600).rounded(.up)))
    }

    static func isoDate(_ value: String) -> Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return withFraction.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }

    /// The request a `BOOKING_REQUEST` push opens; nil for any other push
    static func requestId(fromPush userInfo: [AnyHashable: Any]) -> Int? {
        guard (userInfo["type"] as? String) == "BOOKING_REQUEST" else { return nil }
        if let text = userInfo["bookingRequestId"] as? String { return Int(text) }
        return userInfo["bookingRequestId"] as? Int
    }
}

/// Builds the cart "Xác nhận" opens: rent, the customer, the shop days, the note and the items at the product's rent
/// price. A product the app could not load keeps its line (name, quantity, the price the customer saw or 0).
enum BookingCartBuilder {
    static func cart(from prepare: BookingPrepare, products: [Int: Product]) -> Cart {
        let cart = Cart()
        cart.orderType = .rent
        if let ref = prepare.customer {
            var customer = Customer()
            customer.id = ref.id
            customer.customer_id = ref.id
            customer.firstName = ref.firstName
            customer.lastName = ref.lastName
            customer.full_name = ref.fullName
            customer.phone = ref.phone
            cart.customer = customer
        }
        cart.pickupPlanAt = BookingLogic.isoDate(prepare.pickupPlanAt)
        cart.returnPlanAt = BookingLogic.isoDate(prepare.returnPlanAt)
        cart.notes = prepare.notes
        cart.bookingRequestId = prepare.bookingRequestId
        cart.bookingOutletId = prepare.outletId
        for item in prepare.items {
            if let product = products[item.productId] {
                let price = product.rentPrice ?? product.rent
                cart.addItem(CartItem(from: product, quantity: item.quantity, price: price))
            } else {
                cart.addItem(CartItem(productId: item.productId, productName: item.productName, barcode: nil,
                                      quantity: item.quantity, price: 0, deposit: 0,
                                      originalRentPrice: 0, originalSalePrice: 0))
            }
        }
        cart.syncRentalDaysFromDates()
        return cart
    }
}
