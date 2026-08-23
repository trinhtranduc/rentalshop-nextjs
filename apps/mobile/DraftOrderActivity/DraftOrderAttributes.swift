import ActivityKit
import Foundation

/// Shared between the app and the widget. Lock-screen card is a boarding-pass
/// layout: customer + total, then Pickup | Return. Missing customer is a chip.
@available(iOS 16.1, *)
public struct DraftOrderAttributes: ActivityAttributes {
    public init() {}
    public struct ContentState: Codable, Hashable {
        public var title: String
        public var productName: String
        public var customerName: String
        public var missingCustomerLabel: String
        public var itemCountLabel: String
        public var totalText: String
        public var badgeText: String
        public var pickupLabel: String
        public var returnLabel: String
        public var pickupDateText: String
        public var returnDateText: String
        public var pickupEpoch: Double
        public var returnEpoch: Double
        public var isRent: Bool

        public init(
            title: String,
            productName: String,
            customerName: String,
            missingCustomerLabel: String,
            itemCountLabel: String,
            totalText: String,
            badgeText: String,
            pickupLabel: String,
            returnLabel: String,
            pickupDateText: String,
            returnDateText: String,
            pickupEpoch: Double,
            returnEpoch: Double,
            isRent: Bool
        ) {
            self.title = title
            self.productName = productName
            self.customerName = customerName
            self.missingCustomerLabel = missingCustomerLabel
            self.itemCountLabel = itemCountLabel
            self.totalText = totalText
            self.badgeText = badgeText
            self.pickupLabel = pickupLabel
            self.returnLabel = returnLabel
            self.pickupDateText = pickupDateText
            self.returnDateText = returnDateText
            self.pickupEpoch = pickupEpoch
            self.returnEpoch = returnEpoch
            self.isRent = isRent
        }
    }
}
