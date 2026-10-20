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
    /// #1124 `BOOKING_REQUEST`
    var bookingRequestId: String? = nil
}

extension InboxNotificationPayload {
    enum CodingKeys: String, CodingKey { case type, orderId, orderNumber, status, outletId, orderType, previousStatus, bookingRequestId }

    /// #909: every field may be a string or a number (a `SHIFT_CHANGED` row carries `{ outletId, dates }`); one odd
    /// field never fails the whole inbox
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        func text(_ key: CodingKeys) -> String? {
            if let value = ((try? c.decodeIfPresent(String.self, forKey: key)) ?? nil) { return value }
            if let value = ((try? c.decodeIfPresent(Int.self, forKey: key)) ?? nil) { return String(value) }
            return nil
        }
        type = text(.type)
        orderId = text(.orderId)
        orderNumber = text(.orderNumber)
        status = text(.status)
        outletId = text(.outletId)
        orderType = text(.orderType)
        previousStatus = text(.previousStatus)
        bookingRequestId = text(.bookingRequestId)
    }
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

    /// #909 "Lịch ca thay đổi": opens Ca và công của tôi
    var isShiftChanged: Bool { AttendanceNotification.isShiftChanged(type) || AttendanceNotification.isShiftChanged(data?.type) }

    var displayBody: String {
        if let message, !message.isEmpty { return message }
        return body
    }

    var orderIdValue: Int? {
        guard let raw = data?.orderId, let value = Int(raw) else { return nil }
        return value
    }

    /// #1124 "Có đơn đặt online mới": the request it opens
    var bookingRequestIdValue: Int? {
        guard type == "BOOKING_REQUEST" || data?.type == "BOOKING_REQUEST" else { return nil }
        return data?.bookingRequestId.flatMap { Int($0) }
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

    var hasMore: Bool {
        page < totalPages
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
