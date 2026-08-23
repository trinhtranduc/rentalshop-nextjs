import Foundation
import UIKit
import UserNotifications
import DraftOrderActivity

/// Local notification shown when the merchant backgrounds the app with an unfinished cart.
///
/// Why local (not push): the cart lives on this device, so there is nothing to send from the server.
/// iOS cannot keep a persistent “ongoing” banner like Android; a scheduled local notification
/// appears on the Lock Screen / Notification Center, and tapping it returns to the Home cart.
final class DraftOrderReminder {
    static let shared = DraftOrderReminder()

    static let payloadType = "draftCart"
    private static let requestId = "anyrent.draft-order-reminder"
    private static let categoryId = "DRAFT_ORDER"
    private static let continueActionId = "CONTINUE_DRAFT_ORDER"

    private var scheduleGeneration = 0

    private init() {}

    func registerCategory() {
        let continueAction = UNNotificationAction(
            identifier: Self.continueActionId,
            title: "Continue Order".localized(),
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: Self.categoryId,
            actions: [continueAction],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    /// Call when the app leaves the foreground. Schedules only if the cart still has items.
    func scheduleIfNeeded() {
        let cart = CartStore.shared.cart
        guard !cart.isEmpty, User.account() != nil else {
            cancel()
            return
        }

        registerCategory()
        if startLiveActivity(for: cart) {
            cancelLocalNotification()
            return
        }

        scheduleGeneration += 1
        let generation = scheduleGeneration
        DraftOrderNotificationCard.makeAttachment(cart: cart) { [weak self] attachment in
            guard let self, generation == self.scheduleGeneration else { return }
            self.post(cart: cart, attachment: attachment)
        }
    }

    private func post(cart: Cart, attachment: UNNotificationAttachment?) {
        let content = UNMutableNotificationContent()
        content.title = cart.isEditMode
            ? "Unsaved order changes".localized()
            : "Unfinished order".localized()
        content.subtitle = subtitle(for: cart)
        content.body = body(for: cart)
        content.sound = .default()
        content.categoryIdentifier = Self.categoryId
        content.threadIdentifier = Self.requestId
        content.userInfo = ["type": Self.payloadType]
        if let attachment {
            content.attachments = [attachment]
        }

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: Self.requestId,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                Swift.print("⚠️ Draft order reminder failed: \(error.localizedDescription)")
            }
        }
    }

    private func startLiveActivity(for cart: Cart) -> Bool {
        let productName = cart.items.first?.productName?
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines) ?? ""
        let title = cart.isEditMode
            ? "Unsaved order changes".localized()
            : "Unfinished order".localized()
        let isRent = cart.orderType == .rent
        var badge = isRent ? "Rent".localized() : "Sale".localized()
        if isRent, let pickup = cart.pickupPlanAt, let returned = cart.returnPlanAt {
            let days = rentalDays(from: pickup, to: returned)
            let unit = days == 1 ? "Draft chart day unit".localized() : "Draft chart days unit".localized()
            badge = "\(days) \(unit)"
        }
        let customerName = cart.customer?.full_name?
            .trimmingCharacters(in: CharacterSet.whitespacesAndNewlines) ?? ""
        let name = productName.isEmpty ? title : productName
        var pickupEpoch: Double = 0
        var returnEpoch: Double = 0
        var pickupDateText = ""
        var returnDateText = ""
        if isRent, let pickup = cart.pickupPlanAt, let returned = cart.returnPlanAt {
            pickupEpoch = pickup.timeIntervalSince1970
            returnEpoch = returned.timeIntervalSince1970
            pickupDateText = shortDate(pickup)
            returnDateText = shortDate(returned)
        }
        return DraftOrderLiveActivityBridge.start(
            title: title,
            productName: name,
            customerName: customerName,
            missingCustomerLabel: "Draft missing customer".localized(),
            itemCountLabel: String(format: "Draft live item count".localized(), cart.itemCount),
            totalText: cart.totalAmount.formatStringInCommon(),
            badgeText: badge,
            pickupLabel: "Draft chart pickup".localized(),
            returnLabel: "Draft chart return".localized(),
            pickupDateText: pickupDateText,
            returnDateText: returnDateText,
            pickupEpoch: pickupEpoch,
            returnEpoch: returnEpoch,
            isRent: isRent
        )
    }

    /// Remove the reminder when the merchant is back in the app, logged out, or the cart is empty.
    func cancel() {
        scheduleGeneration += 1
        DraftOrderLiveActivityBridge.stop()
        cancelLocalNotification()
    }

    private func cancelLocalNotification() {
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: [Self.requestId])
        center.removeDeliveredNotifications(withIdentifiers: [Self.requestId])
    }

    func handles(_ userInfo: [AnyHashable: Any]) -> Bool {
        (userInfo["type"] as? String) == Self.payloadType
    }

    func openDraftCart() {
        DispatchQueue.main.async {
            guard User.account() != nil else { return }
            guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

            if !(appDelegate.window?.rootViewController is TabbarViewController) {
                appDelegate.loadMainUserView(forceMain: true)
            }

            guard let tabBar = appDelegate.window?.rootViewController as? TabbarViewController else {
                return
            }

            tabBar.selectedIndex = 0
            (tabBar.viewControllers?.first as? UINavigationController)?
                .popToRootViewController(animated: false)
        }
    }

    private func subtitle(for cart: Cart) -> String {
        if cart.orderType == .rent, let pickup = cart.pickupPlanAt, let returned = cart.returnPlanAt {
            let days = rentalDays(from: pickup, to: returned)
            let unit = days == 1 ? "Draft chart day unit".localized() : "Draft chart days unit".localized()
            return "\(days) \(unit) · \(shortDate(pickup))–\(shortDate(returned))"
        }
        let customerName = cart.customer?.full_name?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !customerName.isEmpty {
            return customerName
        }
        return cart.orderType == .rent ? "Rent".localized() : "Sale".localized()
    }

    private func rentalDays(from pickup: Date, to returned: Date) -> Int {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: pickup)
        let end = calendar.startOfDay(for: returned)
        return max(1, (calendar.dateComponents([.day], from: start, to: end).day ?? 0) + 1)
    }

    private func shortDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = .current
        formatter.dateFormat = Locale.current.languageCode?.hasPrefix("vi") == true ? "dd/MM" : "d MMM"
        return formatter.string(from: date)
    }

    private func body(for cart: Cart) -> String {
        let names = cart.items.prefix(2).compactMap { $0.productName }.filter { !$0.isEmpty }
        let extra = cart.items.count - names.count
        var text = names.joined(separator: " · ")
        if extra > 0 {
            text += " · " + String(format: "Draft order items more".localized(), extra)
        }
        if text.isEmpty {
            text = String(
                format: "Draft order reminder body".localized(),
                cart.itemCount,
                cart.totalAmount.formatStringInCommon()
            )
        } else {
            text += "\n" + cart.totalAmount.formatStringInCommon()
        }
        return text
    }
}
