import ActivityKit
import Foundation

/// Starts/stops the lock-screen Live Activity from the UIKit app.
/// Lives in a Swift 5 module so the main app can stay on Swift 4.
public enum DraftOrderLiveActivityBridge {
    public static func start(
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
    ) -> Bool {
        guard #available(iOS 16.1, *) else { return false }
        let state = DraftOrderAttributes.ContentState(
            title: title,
            productName: productName,
            customerName: customerName,
            missingCustomerLabel: missingCustomerLabel,
            itemCountLabel: itemCountLabel,
            totalText: totalText,
            badgeText: badgeText,
            pickupLabel: pickupLabel,
            returnLabel: returnLabel,
            pickupDateText: pickupDateText,
            returnDateText: returnDateText,
            pickupEpoch: pickupEpoch,
            returnEpoch: returnEpoch,
            isRent: isRent
        )
        let attributes = DraftOrderAttributes()

        do {
            if let existing = Activity<DraftOrderAttributes>.activities.first {
                if #available(iOS 16.2, *) {
                    Task {
                        await existing.update(ActivityContent(state: state, staleDate: Self.staleDate))
                    }
                } else {
                    Task {
                        await existing.update(using: state)
                    }
                }
                return true
            }

            if #available(iOS 16.2, *) {
                _ = try Activity.request(
                    attributes: attributes,
                    content: ActivityContent(state: state, staleDate: Self.staleDate),
                    pushType: nil
                )
            } else {
                _ = try Activity.request(
                    attributes: attributes,
                    contentState: state,
                    pushType: nil
                )
            }
            return true
        } catch {
            NSLog("DraftOrder Live Activity failed: \(error.localizedDescription)")
            return false
        }
    }

    public static func stop() {
        guard #available(iOS 16.1, *) else { return }
        let activities = Activity<DraftOrderAttributes>.activities
        Task {
            for activity in activities {
                if #available(iOS 16.2, *) {
                    await activity.end(nil, dismissalPolicy: .immediate)
                } else {
                    await activity.end(dismissalPolicy: .immediate)
                }
            }
        }
    }

    @available(iOS 16.2, *)
    private static var staleDate: Date {
        Date().addingTimeInterval(12 * 60 * 60)
    }
}
