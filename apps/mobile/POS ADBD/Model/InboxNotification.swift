//
//  InboxNotification.swift
//  POS ADBD
//
//  In-app notification inbox models (GET /api/notifications).
//  Named InboxNotification to avoid clashing with Foundation.Notification.
//

import Foundation

struct InboxNotificationPayload: Codable {
    let type: String?
    let orderId: String?
    let orderNumber: String?
    let status: String?
    let outletId: String?
    let orderType: String?
    let previousStatus: String?
}

struct InboxNotification: Codable {
    let id: Int
    let type: String
    let title: String
    let message: String?
    let body: String
    let isRead: Bool
    let readAt: String?
    let createdAt: String
    let data: InboxNotificationPayload?

    var displayBody: String {
        if let message, !message.isEmpty { return message }
        return body
    }

    var orderIdValue: Int? {
        guard let raw = data?.orderId, let value = Int(raw) else { return nil }
        return value
    }

    var createdAtDate: Date? {
        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: createdAt) {
            return date
        }
        return ISO8601DateFormatter().date(from: createdAt)
    }
}

struct InboxNotificationsData: Codable {
    let notifications: [InboxNotification]
    let total: Int
    let page: Int
    let limit: Int
    let totalPages: Int
    let unreadCount: Int
    /// Preferred when API sends it; otherwise derived from page/totalPages.
    let hasMore: Bool?

    var canLoadMore: Bool {
        if let hasMore { return hasMore }
        return page < totalPages
    }
}

struct InboxUnreadCountData: Codable {
    let count: Int
}

struct InboxNotificationIdData: Codable {
    let id: Int
}

struct InboxNotificationCountData: Codable {
    let count: Int
}
