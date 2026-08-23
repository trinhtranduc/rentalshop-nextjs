//
//  AppDelegate.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/24/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import UIKit
import Firebase
import FirebaseMessaging
import IQKeyboardManagerSwift
import AppTrackingTransparency

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?
    
    func application(_ app: UIApplication, open url: URL, options: [UIApplicationOpenURLOptionsKey: Any] = [:]) -> Bool {
        if url.scheme == "anyrent" {
            DraftOrderReminder.shared.openDraftCart()
            return true
        }
        return false
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
        // Initialize window
        window = UIWindow(frame: UIScreen.main.bounds)
        
        // Setup notification observers first
        setupNotificationObservers()
        
        // Configure Firebase
        FirebaseManager.shared.configure()

        // RevenueCat (MERCHANT IAP) — no-op if REVENUECAT_API_KEY empty
        PurchasesManager.configure()
        
        // Push notifications (FCM) — request permission + register token when logged in
        if User.account() != nil {
            PushNotificationManager.shared.start()
        }
        
        // Configure UI appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = .white//APP_TONE_NAV_COLOR
        appearance.titleTextAttributes = [NSAttributedString.Key.foregroundColor: UIColor.white, NSAttributedString.Key.font: Utils.boldFont(size: 18)]
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().tintColor = UIColor.white
        UINavigationBar.appearance().isTranslucent = false
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
        
        // Configure keyboard manager
        IQKeyboardManager.shared.enableAutoToolbar = false
        IQKeyboardManager.shared.keyboardDistanceFromTextField = 100
        IQKeyboardManager.shared.toolbarConfiguration.placeholderConfiguration.showPlaceholder = false
        IQKeyboardManager.shared.enable = true
        
        UIBarButtonItem.appearance(whenContainedInInstancesOf: [UISearchBar.self]).title = "Done".localized()
        
//        UserDefaults.standard.register(defaults: [
//            "UseFloatingTabBar": false,
//          ])
        
        // Load appropriate view based on user status
        if let user = User.account() {
            // Log user login event
            FirebaseManager.shared.logUserLogin(
                userId: String(user.id),
                role: user.role.rawValue
            )
            self.loadMainUserView()
        } else {
            self.loadLogin()
        }

        // Cold start from notification tap
        if let remote = launchOptions?[.remoteNotification] as? [AnyHashable: Any] {
            PushNotificationManager.shared.handleNotificationData(remote)
        }
        
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Must set APNs token before any FCM token fetch, otherwise Firebase errors
        // with "No APNS token specified before fetching FCM Token".
        PushNotificationManager.shared.didReceiveAPNsToken(deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Use Swift.print — AppDelegate defines print(data:) for the receipt printer.
        Swift.print("⚠️ Failed to register for remote notifications: \(error.localizedDescription)")
    }

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // Data-only / background delivery — deep link only on user tap (UNUserNotificationCenter)
        completionHandler(.newData)
    }
    
    func applicationWillResignActive(_ application: UIApplication) {
        DraftOrderReminder.shared.scheduleIfNeeded()
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {
        // Remind the merchant if they left mid-checkout. Cart is still in memory
        // while the app is suspended; tapping the notification returns to Home.
        DraftOrderReminder.shared.scheduleIfNeeded()
        CartStore.shared.persistToDiskNow()
    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
        DraftOrderReminder.shared.cancel()
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        DraftOrderReminder.shared.cancel()
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        CartStore.shared.persistToDiskNow()
    }
    
    func connectToIp(ip: String, completion: @escaping (() -> Void)){
        //        MWIFIManager.share().delegate = self
        //        MWIFIManager.share().mDisConnect()
        //        MWIFIManager.share().mConnect(withHost: ip, port: 9100) { connected in
        //            completion()
        //        }
    }
    
    func print(data: NSMutableData){
        //Connect again
        //        self.connectToIp(ip: Utils.loadBillPrinter(), completion: {
        //            MWIFIManager.share().mWriteCommand(with: data as Data?, withResponse: { data in
        //                //Discounnect
        //                MWIFIManager.share().mDisConnect()
        //            })
        //        })
    }
    
    func printLabel(data: NSMutableData){
        //Connect again
        //        self.connectToIp(ip: Utils.loadLabePrinter(), completion: {
        //            MWIFIManager.share().mWriteCommand(with: data as Data?, withResponse: { data in
        //                //Discounnect
        //                MWIFIManager.share().mDisConnect()
        //            })
        //        })
    }
}

extension AppDelegate {
    private func setupNotificationObservers() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleUnauthorizedAccess),
            name: .userSessionExpired,  // Using correct notification name
            object: nil
        )
    }
    
    @objc private func handleUnauthorizedAccess() {
        self.logout()
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            let errorCode = APIErrorCode.forbidden
            let error = NSError.errorWithOwnMessage(
                message: errorCode.defaultMessage,
                domain: "RC",
                code: errorCode.httpStatusCode
            )
            UIAlertController.errorAlert(parent: nil, error: error)
        }
    }
    
    func loadLogin() {
        let loginViewController = LoginViewController()
        let navigationController = UINavigationController.init(rootViewController: loginViewController)
        navigationController.isNavigationBarHidden = true
        window?.rootViewController = navigationController
        window?.makeKeyAndVisible()
    }
    
    func logout() {
        let finishLogout = { [weak self] in
            guard let self = self else { return }
            if let user = User.account() {
                FirebaseManager.shared.logUserLogout(userId: String(user.id))
            }
            PurchasesManager.logOut()
            DraftOrderReminder.shared.cancel()
            User.reset()
            Utils.removePreference()
            AppShare.shared.reset()
            self.loadLogin()
        }

        // Deactivate push while auth may still be valid (e.g. forced session expiry)
        if User.account() != nil {
            PushNotificationManager.shared.unregister {
                DispatchQueue.main.async {
                    finishLogout()
                }
            }
        } else {
            finishLogout()
        }
    }
    
    func loadMainUserView(forceMain: Bool = false) {
        if !forceMain && !Utils.hasCompletedOnboarding() {
            window?.rootViewController = OnboardingViewController()
            window?.makeKeyAndVisible()
            return
        }
        
        // Restore draft cart before the tab bar loads. InfoMain writes rent/sale
        // on appear; doing that against an empty in-memory cart used to wipe disk.
        CartStore.shared.restoreFromDisk()

        let tabBar = TabbarViewController()
        guard let window else { return }
        
        // Cross-dissolve when leaving onboarding so the heavy first tab load
        // doesn't feel like a freeze on the tab bar buttons.
        if forceMain, window.rootViewController is OnboardingViewController {
            UIView.transition(
                with: window,
                duration: 0.25,
                options: [.transitionCrossDissolve, .allowAnimatedContent]
            ) {
                window.rootViewController = tabBar
            }
        } else {
            window.rootViewController = tabBar
        }
        window.makeKeyAndVisible()
        PushNotificationManager.shared.consumePendingOrderIfNeeded()
    }
    
    
}
