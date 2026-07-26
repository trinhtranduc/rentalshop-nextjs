import Foundation
import FirebaseCore
import FirebaseAnalytics
import FirebaseCrashlytics
//import FirebasePerformance

class FirebaseManager {
    static let shared = FirebaseManager()
    
    private init() {}
    
    // MARK: - Setup
    func configure() {
        FirebaseApp.configure()
        setupCrashlytics()
    }
    
    private func setupCrashlytics() {
//        #if DEBUG
//        Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(false)
//        #else
        Crashlytics.crashlytics().setCrashlyticsCollectionEnabled(true)

    }
    
    // MARK: - Analytics
    func logEvent(name: String, parameters: [String: Any]? = nil) {
        Analytics.logEvent(name, parameters: parameters)
    }
    
    func setUserProperty(name: String, value: String) {
        Analytics.setUserProperty(value, forName: name)
    }
    
    // MARK: - Crashlytics
    func logError(_ error: Error, userInfo: [String: Any]? = nil) {
        Crashlytics.crashlytics().record(error: error, userInfo: userInfo)
    }
    
    func setUserIdentifier(_ identifier: String) {
        Crashlytics.crashlytics().setUserID(identifier)
    }
    
    func setCustomValue(_ value: Any, forKey key: String) {
        Crashlytics.crashlytics().setCustomValue(value, forKey: key)
    }
    
    // MARK: - Performance Monitoring
//    func startTrace(name: String) -> Trace {
//        let trace = Performance.startTrace(name: name)
//        return trace
//    }
    
//    func stopTrace(_ trace: Trace) {
//        trace.stop()
//    }
    
    // MARK: - Common Events
    func logOrderCreated(orderId: String, totalAmount: Double) {
        logEvent(name: "order_created", parameters: [
            "order_id": orderId,
            "total_amount": totalAmount
        ])
    }
    
    func logOrderUpdated(orderId: String, totalAmount: Double) {
        logEvent(name: "order_updated", parameters: [
            "order_id": orderId,
            "total_amount": totalAmount
        ])
    }
    
    func logProductAdded(productId: String, quantity: Int) {
        logEvent(name: "product_added", parameters: [
            "product_id": productId,
            "quantity": quantity
        ])
    }
    
    func logUserLogin(userId: String, role: String) {
        logEvent(name: "user_login", parameters: [
            "user_id": userId,
            "role": role
        ])
        setUserIdentifier(userId)
        setUserProperty(name: "user_role", value: role)
    }
    
    func logUserLogout(userId: String) {
        logEvent(name: "user_logout", parameters: [
            "user_id": userId
        ])
        setUserIdentifier("")
    }
} 
