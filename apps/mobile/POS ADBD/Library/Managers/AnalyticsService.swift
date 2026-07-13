import Foundation
import FirebaseAnalytics

class AnalyticsService {
    static let shared = AnalyticsService()
    
    private init() {}
    
    // MARK: - User Actions
    func trackUserLogin(userId: String, email: String) {
        Analytics.logEvent("user_login", parameters: [
            "user_id": userId as NSObject,
            "email": email as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackUserLogout(userId: String) {
        Analytics.logEvent("user_logout", parameters: [
            "user_id": userId as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    // MARK: - Product Actions
    func trackProductCreate(productId: Int, userId: String, name: String, price: Double) {
        Analytics.logEvent("product_create", parameters: [
            "product_id": productId as NSObject,
            "user_id": userId as NSObject,
            "product_name": name as NSObject,
            "price": price as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackProductEdit(productId: Int, userId: String, name: String, price: Double, action: String) {
        Analytics.logEvent("product_edit", parameters: [
            "product_id": productId as NSObject,
            "user_id": userId as NSObject,
            "product_name": name as NSObject,
            "price": price as NSObject,
            "action": action as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackProductDelete(productId: Int, userId: String, name: String) {
        Analytics.logEvent("product_delete", parameters: [
            "product_id": productId as NSObject,
            "user_id": userId as NSObject,
            "product_name": name as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    // MARK: - Order Actions
    func trackOrderCreate(orderId: String, userId: String) {
        Analytics.logEvent("order_create", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackOrderEdit(orderId: Int, userId: String, action: String, totalAmount: Double, itemsCount: Int) {
        Analytics.logEvent("order_edit", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "action": action as NSObject,
            "total_amount": totalAmount as NSObject,
            "items_count": itemsCount as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackOrderDelete(orderId: String, userId: String) {
        Analytics.logEvent("order_delete", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackOrderCancel(orderId: Int, userId: String, reason: String?, totalAmount: Double) {
        Analytics.logEvent("order_cancel", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "reason": reason as NSObject? ?? "No reason provided" as NSObject,
            "total_amount": totalAmount as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackOrderStatusChange(orderId: Int, userId: String, oldStatus: String, newStatus: String) {
        Analytics.logEvent("order_status_change", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "old_status": oldStatus as NSObject,
            "new_status": newStatus as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackOrderUpdate(orderId: Int, userId: String, values: [String: Any]) {
        Analytics.logEvent("order_update", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "values": values as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    // MARK: - Order Items
    func trackOrderItemAdd(orderId: Int, userId: String, productId: Int, quantity: Int, price: Double) {
        Analytics.logEvent("order_item_add", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "product_id": productId as NSObject,
            "quantity": quantity as NSObject,
            "price": price as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackOrderItemUpdate(orderId: Int, userId: String, productId: Int, oldQuantity: Int, newQuantity: Int, price: Double) {
        Analytics.logEvent("order_item_update", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "product_id": productId as NSObject,
            "old_quantity": oldQuantity as NSObject,
            "new_quantity": newQuantity as NSObject,
            "price": price as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackOrderItemRemove(orderId: Int, userId: String, productId: Int, quantity: Int, price: Double) {
        Analytics.logEvent("order_item_remove", parameters: [
            "order_id": orderId as NSObject,
            "user_id": userId as NSObject,
            "product_id": productId as NSObject,
            "quantity": quantity as NSObject,
            "price": price as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    // MARK: - Sync Time Tracking
    func trackSyncTime(userId: String, syncTime: Date, ordersCount: Int) {
        Analytics.logEvent("sync_time", parameters: [
            "user_id": userId as NSObject,
            "sync_time": ISO8601DateFormatter().string(from: syncTime) as NSObject,
            "orders_count": ordersCount as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    // MARK: - App Events
    func trackAppOpen() {
        Analytics.logEvent(AnalyticsEventAppOpen, parameters: [
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
    
    func trackError(error: Error, userId: String, context: String) {
        Analytics.logEvent("app_error", parameters: [
            "error_message": error.localizedDescription as NSObject,
            "user_id": userId as NSObject,
            "context": context as NSObject,
            "timestamp": ISO8601DateFormatter().string(from: Date()) as NSObject
        ])
    }
}
