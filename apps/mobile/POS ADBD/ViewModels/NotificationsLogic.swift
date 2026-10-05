//
//  NotificationsLogic.swift
//  POS ADBD
//
//  Rules of the redesigned inbox and note editor (#477, boards TB-thong-bao and GC-ghi-chu). Pure, so the
//  same table is tested here and on Android (`NotificationsLogic.kt`, `NoteEditorLogic.kt`).
//

import UIKit

/// What a notification is about; picks the icon tile
enum NotificationKind: Equatable {
    case order, handOver, late, returned, payment, neutral
}

enum NotificationsLogic {
    /// Days of the inbox are Vietnam civil days (timezone-dates rule 8)
    static let timeZone = Date.shopTimeZone

    /// The API sends `ORDER_CREATED` and `ORDER_STATUS_CHANGED` (+ `data.status`). Future types are matched by name.
    static func kind(type: String, status: String?) -> NotificationKind {
        let type = type.uppercased()
        if type.contains("PAYMENT") { return .payment }
        if type.contains("OVERDUE") || type.contains("LATE") { return .late }
        if type.contains("HANDOVER") || type.contains("PICKUP_DUE") { return .handOver }
        if type == "ORDER_CREATED" { return .order }
        if type == "ORDER_STATUS_CHANGED" {
            switch status?.uppercased() {
            case "PICKUPED": return .handOver
            case "RETURNED": return .returned
            case "COMPLETED": return .payment
            case "CANCELLED": return .neutral
            default: return .order
            }
        }
        return .neutral
    }

    static func symbol(for kind: NotificationKind) -> String {
        switch kind {
        case .order: return "doc.text"
        case .handOver: return "box.truck"
        case .late: return "clock"
        case .returned: return "arrow.uturn.backward"
        case .payment: return "dollarsign"
        case .neutral: return "bell"
        }
    }

    static func colors(for kind: NotificationKind) -> DS.Pill {
        switch kind {
        case .order, .handOver: return DS.Status.handOver
        case .late: return DS.Status.late
        case .returned: return DS.Status.returning
        case .payment: return DS.Status.done
        case .neutral: return DS.Status.cancelled
        }
    }

    /// Unread: bold dark title, blue dot, very light blue row. Read: medium slate title, white row.
    struct RowStyle: Equatable {
        let titleBold: Bool
        let titleHex: String
        let backgroundHex: String
        let showsDot: Bool
    }

    static func rowStyle(isRead: Bool) -> RowStyle {
        isRead
            ? RowStyle(titleBold: false, titleHex: "334155", backgroundHex: "FFFFFF", showsDot: false)
            : RowStyle(titleBold: true, titleHex: "0F172A", backgroundHex: "F8FBFF", showsDot: true)
    }

    struct DayGroup {
        let key: String
        let title: String
        let items: [InboxNotification]
    }

    /// Consecutive notifications of one Vietnam day, in the order received (the API sends newest first).
    /// A notification without a readable date joins the group before it (or a "" group at the top).
    static func groups(_ items: [InboxNotification], now: Date = Date(), locale: Locale = .current) -> [DayGroup] {
        var keys: [String] = []
        var buckets: [String: [InboxNotification]] = [:]
        var lastKey = ""
        for item in items {
            let key = item.createdAtDate.map { DayFormatter.key($0, timeZone: timeZone) } ?? lastKey
            if buckets[key] == nil {
                keys.append(key)
                buckets[key] = []
            }
            buckets[key]?.append(item)
            lastKey = key
        }
        return keys.map { key in
            DayGroup(key: key, title: dayTitle(key: key, now: now, locale: locale), items: buckets[key] ?? [])
        }
    }

    /// "HÔM NAY · T2 05/10", "HÔM QUA · CN 04/10", then "T6 02/10" (upper case)
    static func dayTitle(key: String, now: Date, locale: Locale = .current) -> String {
        guard let date = date(fromKey: key) else { return "" }
        let label = DayFormatter.short(date, timeZone: timeZone, locale: locale)
        let today = DayFormatter.key(now, timeZone: timeZone)
        let yesterday = DayFormatter.key(now.addingTimeInterval(-86_400), timeZone: timeZone)
        let title: String
        switch key {
        case today: title = "notifications.v2.today".localized() + " · " + label
        case yesterday: title = "notifications.v2.yesterday".localized() + " · " + label
        default: title = label
        }
        return title.uppercased(with: locale)
    }

    /// "09:12" in Vietnam time, matching the day group
    static func time(_ date: Date?) -> String {
        guard let date else { return "" }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    /// Noon of a `yyyy-MM-dd` day in Vietnam (safe for weekday/day labels)
    private static func date(fromKey key: String) -> Date? {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12))
    }
}

/// Photo rules of the note editor (#477): at most `OrderDetailLogic.maxNotePhotos`
enum NoteEditorLogic {
    static func canAdd(count: Int, max: Int = OrderDetailLogic.maxNotePhotos) -> Bool {
        max > 0 && count < max
    }

    /// How many photos a pick may still add
    static func remaining(count: Int, max: Int = OrderDetailLogic.maxNotePhotos) -> Int {
        Swift.max(0, max - count)
    }

    /// "2/5 ảnh"
    static func countLabel(count: Int, max: Int = OrderDetailLogic.maxNotePhotos) -> String {
        String(format: "%d/%d photos".localized(), count, max)
    }

    /// ~180KB JPEG of a note photo, as the old create/detail screens send (#435); the API compresses again
    static func compressedJPEG(_ image: UIImage) -> Data? {
        image.compressToTargetSize(targetSizeKB: 180, maxDimension: 1920) ?? UIImageJPEGRepresentation(image, 0.6)
    }

    /// " #0057" after "Ghi chú"; nil without an order number (cart)
    static func titleSuffix(orderNumber: String?) -> String? {
        guard let orderNumber, !orderNumber.isEmpty else { return nil }
        return "#" + OrdersHomeLogic.shortNumber(orderNumber)
    }
}
