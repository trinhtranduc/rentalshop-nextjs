import Foundation
import UIKit
import UserNotifications
import FirebaseMessaging
import Alamofire

/// Registers for remote notifications, syncs FCM token to API, and handles order deep-links.
final class PushNotificationManager: NSObject {
    static let shared = PushNotificationManager()

    private let deviceIdKey = "anyrent.deviceId"
    private var pendingOrderId: Int?

    private override init() {
        super.init()
    }

    var deviceId: String {
        if let existing = UserDefaults.standard.string(forKey: deviceIdKey), !existing.isEmpty {
            return existing
        }
        let id = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        UserDefaults.standard.set(id, forKey: deviceIdKey)
        return id
    }

    /// Call after FirebaseApp.configure() and when user is logged in.
    /// Do NOT fetch FCM token here — wait until APNs device token is set
    /// (`AppDelegate.didRegisterForRemoteNotifications` → `didReceiveAPNsToken`).
    func start() {
        UNUserNotificationCenter.current().delegate = self
        Messaging.messaging().delegate = self

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("⚠️ Push permission error: \(error.localizedDescription)")
            }
            print("📲 Push permission granted: \(granted)")
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    /// Wire Apple's device token into Firebase. Do **not** call `Messaging.messaging().token`
    /// here — the SDK refreshes and delivers the FCM token via `MessagingDelegate`.
    /// Calling `.token()` before APNs is ready causes I-FCM002022 / "No APNS token specified".
    func didReceiveAPNsToken(_ deviceToken: Data) {
        let hex = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("📲 APNs device token received (\(deviceToken.count) bytes): \(hex.prefix(16))…")
        Messaging.messaging().apnsToken = deviceToken
    }

    func registerTokenWithAPI(_ pushToken: String) {
        guard User.account() != nil else {
            print("📲 Skip FCM register — user not logged in")
            return
        }

        let path = APIEndpoint.Path.registerDevice
        let fullURL = APIEndpoint.currentBaseURL + path
        let params: [String: Any] = [
            "deviceId": deviceId,
            "pushToken": pushToken,
            "platform": "ios"
        ]

        print("📲 Registering device for push: \(fullURL)")
        AF.request(
            fullURL,
            method: .post,
            parameters: params,
            encoding: JSONEncoding.default,
            headers: BaseService.jsonHeader
        )
        .responseData { response in
            let status = response.response?.statusCode ?? 0
            if let data = response.data, let body = String(data: data, encoding: .utf8) {
                print("📲 Register device response (\(status)): \(body)")
            } else {
                print("📲 Register device response status: \(status)")
            }
        }
    }

    /// Deactivate this device's push token on the server (call before clearing auth).
    func unregister(completion: (() -> Void)? = nil) {
        guard User.account() != nil else {
            completion?()
            return
        }

        let path = APIEndpoint.Path.registerDevice
        let fullURL = APIEndpoint.currentBaseURL + path
        let params: [String: Any] = [
            "deviceId": deviceId
        ]

        print("📲 Unregistering device push: \(fullURL)")
        AF.request(
            fullURL,
            method: .delete,
            parameters: params,
            encoding: JSONEncoding.default,
            headers: BaseService.jsonHeader
        )
        .responseData { response in
            let status = response.response?.statusCode ?? 0
            print("📲 Unregister device response status: \(status)")
            completion?()
        }
    }

    func handleNotificationData(_ userInfo: [AnyHashable: Any]) {
        let orderIdString =
            (userInfo["orderId"] as? String)
            ?? (userInfo["order_id"] as? String)
        guard let orderIdString = orderIdString, let orderId = Int(orderIdString) else {
            print("📲 Push tapped but no orderId in payload: \(userInfo)")
            return
        }
        openOrderDetail(orderId: orderId)
    }

    func openOrderDetail(orderId: Int) {
        DispatchQueue.main.async {
            guard User.account() != nil else {
                self.pendingOrderId = orderId
                return
            }

            guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

            // Ensure main UI is showing
            if !(appDelegate.window?.rootViewController is TabbarViewController) {
                self.pendingOrderId = orderId
                appDelegate.loadMainUserView(forceMain: true)
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    self.consumePendingOrderIfNeeded()
                }
                return
            }

            self.pushPreview(orderId: orderId)
        }
    }

    func consumePendingOrderIfNeeded() {
        guard let orderId = pendingOrderId else { return }
        pendingOrderId = nil
        pushPreview(orderId: orderId)
    }

    private func pushPreview(orderId: Int) {
        guard
            let tabBar = UIApplication.shared.delegate
                .flatMap({ $0 as? AppDelegate })?
                .window?
                .rootViewController as? TabbarViewController
        else {
            pendingOrderId = orderId
            return
        }

        // Prefer currently selected nav; fallback to first
        let nav =
            (tabBar.selectedViewController as? UINavigationController)
            ?? (tabBar.viewControllers?.first as? UINavigationController)

        guard let navigationController = nav else {
            pendingOrderId = orderId
            return
        }

        // Avoid stacking duplicate previews for same order
        if navigationController.topViewController is PreviewViewController {
            // Still allow re-push if user wants latest; pop first for clean stack
            navigationController.popViewController(animated: false)
        }

        let presenter = navigationController.topViewController ?? navigationController
        if let base = presenter as? BaseViewControler {
            base.showProgressText(text: "Loading...".localized())
        }

        OrderService.shared.loadOrderDetail(orderId: orderId) { orderDetail, error in
            DispatchQueue.main.async {
                if let base = presenter as? BaseViewControler {
                    base.hideProgress()
                }
                if let error = error {
                    UIAlertController.errorAlert(parent: presenter, error: error)
                    return
                }
                guard let detail = orderDetail else { return }
                let fullOrder = Order.from(detail: detail)
                let preview = PreviewViewController(order: fullOrder)
                preview.hidesBottomBarWhenPushed = true
                navigationController.pushViewController(preview, animated: true)
            }
        }
    }
}

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show banner even when app is foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
        // Refresh inbox badge (server already persisted the row)
        NotificationCenter.default.post(name: .inboxUnreadCountDidChange, object: nil)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        handleNotificationData(response.notification.request.content.userInfo)
        completionHandler()
    }
}

extension PushNotificationManager: MessagingDelegate {
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken, !fcmToken.isEmpty else { return }

        // Firebase may invoke this before APNs is set (auto-init). Skip until APNs exists;
        // after `apnsToken` is assigned, Messaging will call this again with a usable token.
        guard messaging.apnsToken != nil else {
            print("📲 FCM token received but APNs not ready yet — will register after APNs")
            return
        }

        print("📲 FCM token ready (APNs linked)")
        registerTokenWithAPI(fcmToken)
    }
}
