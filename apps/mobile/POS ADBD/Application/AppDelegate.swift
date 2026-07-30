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
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplicationLaunchOptionsKey: Any]?) -> Bool {
        // Initialize window
        window = UIWindow(frame: UIScreen.main.bounds)
        
        // Setup notification observers first
        setupNotificationObservers()
        
        // Configure Firebase
        FirebaseManager.shared.configure()
        
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
        Messaging.messaging().apnsToken = deviceToken
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
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
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
