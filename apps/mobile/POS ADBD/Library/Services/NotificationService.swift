//
//  NotificationService.swift
//  POS ADBD
//
//  In-app notification inbox API client.
//

import Foundation

protocol NotificationServiceProtocol {
    func getNotifications(
        page: Int,
        limit: Int,
        isRead: Bool?,
        type: String?,
        completion: @escaping (_ data: InboxNotificationsData?, _ error: NSError?) -> Void
    )
    func getUnreadCount(completion: @escaping (_ count: Int?, _ error: NSError?) -> Void)
    func markAsRead(notificationId: Int, completion: @escaping (_ success: Bool, _ error: NSError?) -> Void)
    func markAsUnread(notificationId: Int, completion: @escaping (_ success: Bool, _ error: NSError?) -> Void)
    func markAllAsRead(completion: @escaping (_ count: Int?, _ error: NSError?) -> Void)
    func deleteNotification(notificationId: Int, completion: @escaping (_ success: Bool, _ error: NSError?) -> Void)
    func deleteAllRead(completion: @escaping (_ count: Int?, _ error: NSError?) -> Void)
}

final class NotificationService: BaseService, NotificationServiceProtocol {
    static let shared = NotificationService()

    func getNotifications(
        page: Int = 1,
        limit: Int = 20,
        isRead: Bool? = nil,
        type: String? = nil,
        completion: @escaping (InboxNotificationsData?, NSError?) -> Void
    ) {
        var params: [String: Any] = [
            "page": page,
            "limit": limit
        ]
        if let isRead {
            params["isRead"] = isRead ? "true" : "false"
        }
        if let type, !type.isEmpty {
            params["type"] = type
        }

        performGET(
            path: APIEndpoint.Path.notifications,
            parameters: params,
            responseType: APIResponse<InboxNotificationsData>.self,
            context: "NotificationService.getNotifications"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(nil, error)
                    return
                }
                guard let response, response.success, let data = response.data else {
                    let message = response?.message ?? response?.error ?? "Failed to load notifications"
                    completion(nil, NSError.errorWithOwnMessage(message: message, domain: "RC"))
                    return
                }
                completion(data, nil)
            }
        }
    }

    func getUnreadCount(completion: @escaping (Int?, NSError?) -> Void) {
        performGET(
            path: APIEndpoint.Path.notificationsUnreadCount,
            parameters: nil,
            responseType: APIResponse<InboxUnreadCountData>.self,
            context: "NotificationService.getUnreadCount"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(nil, error)
                    return
                }
                guard let response, response.success, let data = response.data else {
                    let message = response?.message ?? response?.error ?? "Failed to load unread count"
                    completion(nil, NSError.errorWithOwnMessage(message: message, domain: "RC"))
                    return
                }
                completion(data.count, nil)
            }
        }
    }

    func markAsRead(notificationId: Int, completion: @escaping (Bool, NSError?) -> Void) {
        performPATCH(
            path: APIEndpoint.Path.notificationMarkRead(id: notificationId),
            parameters: nil,
            responseType: APIResponse<InboxNotificationIdData>.self,
            context: "NotificationService.markAsRead"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(false, error)
                    return
                }
                completion(response?.success == true, response?.success == true ? nil : NSError.errorWithOwnMessage(
                    message: response?.message ?? "Failed to mark as read",
                    domain: "RC"
                ))
            }
        }
    }

    func markAsUnread(notificationId: Int, completion: @escaping (Bool, NSError?) -> Void) {
        performPATCH(
            path: APIEndpoint.Path.notificationMarkUnread(id: notificationId),
            parameters: nil,
            responseType: APIResponse<InboxNotificationIdData>.self,
            context: "NotificationService.markAsUnread"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(false, error)
                    return
                }
                completion(response?.success == true, response?.success == true ? nil : NSError.errorWithOwnMessage(
                    message: response?.message ?? "Failed to mark as unread",
                    domain: "RC"
                ))
            }
        }
    }

    func markAllAsRead(completion: @escaping (Int?, NSError?) -> Void) {
        performPATCH(
            path: APIEndpoint.Path.notificationsMarkAllRead,
            parameters: nil,
            responseType: APIResponse<InboxNotificationCountData>.self,
            context: "NotificationService.markAllAsRead"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(nil, error)
                    return
                }
                guard let response, response.success else {
                    completion(nil, NSError.errorWithOwnMessage(
                        message: response?.message ?? "Failed to mark all as read",
                        domain: "RC"
                    ))
                    return
                }
                completion(response.data?.count ?? 0, nil)
            }
        }
    }

    func deleteNotification(notificationId: Int, completion: @escaping (Bool, NSError?) -> Void) {
        performDELETE(
            path: APIEndpoint.Path.notificationDelete(id: notificationId),
            parameters: nil,
            responseType: APIResponse<InboxNotificationIdData>.self,
            context: "NotificationService.deleteNotification"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(false, error)
                    return
                }
                completion(response?.success == true, response?.success == true ? nil : NSError.errorWithOwnMessage(
                    message: response?.message ?? "Failed to delete notification",
                    domain: "RC"
                ))
            }
        }
    }

    func deleteAllRead(completion: @escaping (Int?, NSError?) -> Void) {
        performDELETE(
            path: APIEndpoint.Path.notificationsDeleteRead,
            parameters: nil,
            responseType: APIResponse<InboxNotificationCountData>.self,
            context: "NotificationService.deleteAllRead"
        ) { response, error in
            DispatchQueue.main.async {
                if let error {
                    completion(nil, error)
                    return
                }
                guard let response, response.success else {
                    completion(nil, NSError.errorWithOwnMessage(
                        message: response?.message ?? "Failed to delete read notifications",
                        domain: "RC"
                    ))
                    return
                }
                completion(response.data?.count ?? 0, nil)
            }
        }
    }
}
