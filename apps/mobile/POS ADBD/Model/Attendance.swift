//
//  Attendance.swift
//  POS ADBD
//
//  Chấm công (#909, API #907, mockup tab "App (nhân viên)"): models of /api/attendance/{me,punch,shifts,
//  people/<id>/month} and the pure rules of the screens. Every field is optional on the wire: a missing or
//  differently typed field never fails the whole response. Times are server instants shown in the shop zone.
//

import Foundation

/// Module key in `merchant.modules` (login / profile, #907)
enum AttendanceModule {
    static let key = "attendance"

    /// Old cached profiles have no `modules`: hidden
    static func isOn(_ merchant: Merchant?) -> Bool {
        merchant?.modules?.contains(key) ?? false
    }
}

// MARK: - Lenient decoding

/// Any string key, so a model can read the first of several names
struct AttendanceKey: CodingKey {
    let stringValue: String
    var intValue: Int? { nil }
    init(_ string: String) { stringValue = string }
    init?(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { return nil }
}

extension KeyedDecodingContainer where K == AttendanceKey {
    func string(_ keys: String...) -> String? {
        for key in keys {
            let k = AttendanceKey(key)
            if let value = ((try? decodeIfPresent(String.self, forKey: k)) ?? nil) { return value }
            if let value = ((try? decodeIfPresent(Int.self, forKey: k)) ?? nil) { return String(value) }
        }
        return nil
    }

    func double(_ keys: String...) -> Double? {
        for key in keys {
            let k = AttendanceKey(key)
            if let value = ((try? decodeIfPresent(Double.self, forKey: k)) ?? nil) { return value }
            if let value = ((try? decodeIfPresent(String.self, forKey: k)) ?? nil), let number = Double(value) { return number }
        }
        return nil
    }

    func int(_ keys: String...) -> Int? {
        for key in keys {
            let k = AttendanceKey(key)
            if let value = ((try? decodeIfPresent(Int.self, forKey: k)) ?? nil) { return value }
            if let value = ((try? decodeIfPresent(Double.self, forKey: k)) ?? nil) { return Int(value.rounded()) }
            if let value = ((try? decodeIfPresent(String.self, forKey: k)) ?? nil), let number = Int(value) { return number }
        }
        return nil
    }

    func bool(_ keys: String...) -> Bool? {
        for key in keys {
            if let value = ((try? decodeIfPresent(Bool.self, forKey: AttendanceKey(key))) ?? nil) { return value }
        }
        return nil
    }

    func object<T: Decodable>(_ type: T.Type, _ keys: String...) -> T? {
        for key in keys {
            if let value = ((try? decodeIfPresent(T.self, forKey: AttendanceKey(key))) ?? nil) { return value }
        }
        return nil
    }
}

// MARK: - Models

/// A shift: template on a day (`/shifts`, `/me`) or the snapshot on a record
struct AttendanceShift: Decodable, Equatable {
    var name: String?
    /// "HH:mm"
    var start: String?
    var end: String?
    var breakMinutes: Int?

    init(name: String?, start: String?, end: String?, breakMinutes: Int? = nil) {
        self.name = name
        self.start = start
        self.end = end
        self.breakMinutes = breakMinutes
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        name = c.string("name", "shiftName")
        start = c.string("start", "startTime", "shiftStart")
        end = c.string("end", "endTime", "shiftEnd")
        breakMinutes = c.int("breakMinutes", "shiftBreakMinutes")
    }
}

struct AttendanceRecord: Decodable, Equatable {
    var id: Int?
    var dateKey: String?
    var checkInAt: Date?
    var checkOutAt: Date?
    var status: String?
    var hours: Double?
    var shift: AttendanceShift?

    init(id: Int? = nil, dateKey: String? = nil, checkInAt: Date?, checkOutAt: Date?, status: String? = nil,
         hours: Double? = nil, shift: AttendanceShift? = nil) {
        self.id = id
        self.dateKey = dateKey
        self.checkInAt = checkInAt
        self.checkOutAt = checkOutAt
        self.status = status
        self.hours = hours
        self.shift = shift
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        id = c.int("id")
        dateKey = c.string("dateKey", "date")
        checkInAt = AttendanceLogic.instant(c.string("checkInAt"))
        checkOutAt = AttendanceLogic.instant(c.string("checkOutAt"))
        status = c.string("status")
        hours = c.double("hours")
        // Snapshot as an object, or flat `shiftName` / `shiftStart` / `shiftEnd` / `shiftBreakMinutes`
        if let nested = c.object(AttendanceShift.self, "shift") {
            shift = nested
        } else if let name = c.string("shiftName") {
            shift = AttendanceShift(name: name, start: c.string("shiftStart"), end: c.string("shiftEnd"),
                                    breakMinutes: c.int("shiftBreakMinutes", "breakMinutes"))
        }
    }
}

/// GET /api/attendance/me
struct AttendanceMe: Decodable {
    var enabled: Bool
    var openRecord: AttendanceRecord?
    var todayShifts: [AttendanceShift]
    var todayStatus: String?
    var lastAction: String?
    var lastActionAt: Date?
    var outletName: String?
    /// #927 the shop picked this person to clock in; older APIs leave it out (= true)
    var required: Bool

    init(enabled: Bool = true, openRecord: AttendanceRecord? = nil, todayShifts: [AttendanceShift] = [],
         todayStatus: String? = nil, lastAction: String? = nil, lastActionAt: Date? = nil, outletName: String? = nil,
         required: Bool = true) {
        self.enabled = enabled
        self.required = required
        self.openRecord = openRecord
        self.todayShifts = todayShifts
        self.todayStatus = todayStatus
        self.lastAction = lastAction
        self.lastActionAt = lastActionAt
        self.outletName = outletName
    }

    private struct Today: Decodable {
        var shifts: [AttendanceShift] = []
        var status: String?
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: AttendanceKey.self)
            shifts = c.object([AttendanceShift].self, "shifts") ?? []
            status = c.string("status")
        }
    }

    private struct Named: Decodable {
        var name: String?
        init(from decoder: Decoder) throws {
            name = (try decoder.container(keyedBy: AttendanceKey.self)).string("name")
        }
    }

    private struct Action: Decodable {
        var action: String?
        var at: String?
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: AttendanceKey.self)
            action = c.string("action", "kind", "type")
            at = c.string("at", "createdAt")
        }
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        enabled = c.bool("enabled") ?? true
        openRecord = c.object(AttendanceRecord.self, "openRecord")
        let today = c.object(Today.self, "today")
        todayShifts = today?.shifts ?? c.object([AttendanceShift].self, "shifts") ?? []
        todayStatus = today?.status ?? c.string("status")
        if let action = c.object(Action.self, "lastAction") {
            lastAction = action.action
            lastActionAt = AttendanceLogic.instant(action.at)
        } else {
            lastAction = c.string("lastAction")
        }
        outletName = c.object(Named.self, "outlet")?.name ?? c.string("outletName")
        required = c.bool("required") ?? true
    }
}

/// 200 of POST /api/attendance/punch
struct AttendancePunchResult: Decodable {
    var action: String?
    var record: AttendanceRecord?
    var distanceM: Double?
    var accuracyM: Double?
    var lateMinutes: Int?
    var todayHours: Double?

    init(action: String?, record: AttendanceRecord?, distanceM: Double? = nil, accuracyM: Double? = nil,
         lateMinutes: Int? = nil, todayHours: Double? = nil) {
        self.action = action
        self.record = record
        self.distanceM = distanceM
        self.accuracyM = accuracyM
        self.lateMinutes = lateMinutes
        self.todayHours = todayHours
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        action = c.string("action")
        record = c.object(AttendanceRecord.self, "record")
        distanceM = c.double("distanceM", "distance")
        accuracyM = c.double("accuracyM", "accuracy")
        lateMinutes = c.int("lateMinutes")
        todayHours = c.double("todayHours", "hoursToday")
    }

    var isOut: Bool { (action ?? "").uppercased() == "OUT" }
}

/// A punch the API refused: the code, its message and the numbers of `data` (`distanceM`, `radiusM`, `accuracyM`)
struct AttendanceFailure: Error, Equatable {
    var code: String?
    var message: String?
    var distanceM: Double?
    var radiusM: Double?
    var accuracyM: Double?
    /// #949 QR_WRONG_OUTLET: outlet of the scanned code (nil for another shop's code or an older API)
    var qrOutletName: String? = nil
    /// #949 QR_WRONG_OUTLET: the outlets the person may clock in at
    var allowedOutletNames: [String] = []
    /// #1014 ATTENDANCE_LOCATION_NOT_SET: the outlet that has no location (nil on an older API)
    var outletName: String? = nil
}

/// `data` of a refused call: the numbers, and for QR_WRONG_OUTLET (#949) `qrOutlet` / `allowedOutlets` `{ id, name }`
struct AttendanceFailureData: Decodable {
    var distanceM: Double?
    var radiusM: Double?
    var accuracyM: Double?
    var qrOutletName: String?
    var allowedOutletNames: [String]
    /// #1014 ATTENDANCE_LOCATION_NOT_SET `data.outlet`
    var outletName: String?

    private struct OutletRef: Decodable {
        let name: String?
        init(from decoder: Decoder) throws {
            name = try decoder.container(keyedBy: AttendanceKey.self).string("name")
        }
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        distanceM = c.double("distanceM", "distance")
        radiusM = c.double("radiusM", "radius")
        accuracyM = c.double("accuracyM", "accuracy")
        qrOutletName = c.object(OutletRef.self, "qrOutlet")?.name.flatMap { $0.isEmpty ? nil : $0 }
        allowedOutletNames = (c.object([OutletRef].self, "allowedOutlets") ?? []).compactMap(\.name).filter { !$0.isEmpty }
        outletName = c.object(OutletRef.self, "outlet")?.name.flatMap { $0.isEmpty ? nil : $0 }
    }
}

/// One day of GET /api/attendance/shifts for one user
struct AttendanceScheduleDay: Decodable {
    var userId: Int?
    var date: String?
    var shifts: [AttendanceShift]

    init(userId: Int?, date: String?, shifts: [AttendanceShift]) {
        self.userId = userId
        self.date = date
        self.shifts = shifts
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        userId = c.int("userId")
        date = c.string("date", "dateKey")
        shifts = c.object([AttendanceShift].self, "shifts") ?? []
    }
}

/// GET /api/attendance/shifts: a list of days, or an object holding it (`days`, `items`, `rows`, `schedule`),
/// or users with their days
struct AttendanceSchedule: Decodable {
    var days: [AttendanceScheduleDay]

    init(days: [AttendanceScheduleDay]) { self.days = days }

    private struct UserDays: Decodable {
        var userId: Int?
        var days: [AttendanceScheduleDay]
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: AttendanceKey.self)
            userId = c.int("userId", "id")
            days = c.object([AttendanceScheduleDay].self, "days", "schedule") ?? []
        }
    }

    init(from decoder: Decoder) throws {
        if let list = try? decoder.singleValueContainer().decode([AttendanceScheduleDay].self) {
            days = list
            return
        }
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        if let list = c.object([AttendanceScheduleDay].self, "days", "items", "rows", "schedule", "shifts"),
           list.contains(where: { $0.date != nil }) {
            days = list
            return
        }
        let users = c.object([UserDays].self, "users", "people") ?? []
        days = users.flatMap { user in
            user.days.map { AttendanceScheduleDay(userId: $0.userId ?? user.userId, date: $0.date, shifts: $0.shifts) }
        }
    }
}

/// One row of GET /api/attendance/people/<id>/month
struct AttendanceMonthRow: Decodable, Equatable {
    var at: Date?
    var kind: String?
    var result: String?
    var recordId: Int?
    var lateMinutes: Int?
    var shift: AttendanceShift?
    /// Shop day of the record the row belongs to (#918); older APIs leave it out
    var dateKey: String?
    /// EDIT rows: the record after the edit (`checkInAt`, `checkOutAt`, `status`, `dateKey` on a manual add)
    var after: AttendanceRecord?

    init(at: Date?, kind: String?, result: String?, recordId: Int?, lateMinutes: Int? = nil, shift: AttendanceShift? = nil,
         dateKey: String? = nil, after: AttendanceRecord? = nil) {
        self.at = at
        self.kind = kind
        self.result = result
        self.recordId = recordId
        self.lateMinutes = lateMinutes
        self.shift = shift
        self.dateKey = dateKey
        self.after = after
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        at = AttendanceLogic.instant(c.string("at"))
        kind = c.string("kind", "action")
        result = c.string("result")
        recordId = c.int("recordId")
        lateMinutes = c.int("lateMinutes")
        if let nested = c.object(AttendanceShift.self, "shift") {
            shift = nested
        } else if let name = c.string("shift") {
            shift = AttendanceShift(name: name, start: nil, end: nil)
        }
        dateKey = c.string("dateKey")
        after = c.object(AttendanceRecord.self, "after")
    }
}

struct AttendanceMonth: Decodable {
    var hours: Double?
    var days: Int?
    var rows: [AttendanceMonthRow]

    init(hours: Double?, days: Int?, rows: [AttendanceMonthRow]) {
        self.hours = hours
        self.days = days
        self.rows = rows
    }

    private struct Summary: Decodable {
        var hours: Double?
        var days: Int?
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: AttendanceKey.self)
            hours = c.double("hours", "totalHours")
            days = c.int("days", "dayCredits", "workDays")
        }
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: AttendanceKey.self)
        let summary = c.object(Summary.self, "summary")
        hours = summary?.hours ?? c.double("hours", "totalHours")
        days = summary?.days ?? c.int("days", "dayCredits")
        rows = c.object([AttendanceMonthRow].self, "rows", "items") ?? []
    }
}

/// `data` of an `SHIFT_CHANGED` inbox row or push
enum AttendanceNotification {
    static let shiftChanged = "SHIFT_CHANGED"

    static func isShiftChanged(_ type: String?) -> Bool {
        (type ?? "").uppercased() == shiftChanged
    }
}

// MARK: - Rules of the screens

enum AttendanceState: Equatable {
    /// No open record and nothing today → "chưa vào ca", button Vào ca
    case notIn
    /// Open record → "đang trong ca", button Ra ca
    case inShift
    /// Clocked out today → "đã xong", button Vào ca (several pairs a day)
    case done
}

/// Red box of a refused punch
struct AttendanceErrorCopy: Equatable {
    let title: String
    let message: String
}

/// One row of "TUẦN NÀY"
struct AttendanceWeekRow: Equatable {
    let dayKey: String
    /// "T2 12/10"
    let day: String
    /// "Sáng 08–12"
    let shift: String
    /// "07:58–12:01 · 4,0 g", "08:07–12:00 · 3,9 g · muộn 7′", "—" (lines joined by "\n")
    let worked: String
    let isLate: Bool
    /// #935 One per record; the view draws `late` in amber
    var lines: [AttendanceWeekLine] = []
}

/// #935 One record of a week row: "08:07–12:00 · 3,9 g" and its late part "muộn 7′" (nil when on time)
struct AttendanceWeekLine: Equatable {
    let main: String
    let late: String?

    var text: String { [main, late].compactMap { $0 }.joined(separator: " · ") }
}

/// An IN / OUT pair read from the month rows
struct AttendancePair: Equatable {
    let dayKey: String
    let checkInAt: Date
    let checkOutAt: Date?
    let lateMinutes: Int
    /// Break of the record's own shift snapshot (any scan / auto-close row); nil = none in the rows (manual add)
    let breakMinutes: Int?
    /// The API's hours of the record when a row carries them (#923)
    var hours: Double? = nil
}

enum AttendanceLogic {
    static let timeZone = Date.shopTimeZone

    // MARK: Time

    static func instant(_ raw: String?) -> Date? {
        guard let raw, !raw.isEmpty else { return nil }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: raw) ?? ISO8601DateFormatter().date(from: raw)
    }

    static func iso(_ date: Date) -> String {
        ISO8601DateFormatter().string(from: date)
    }

    /// Shop-zone "HH:mm" of a server instant
    static func clock(_ date: Date, timeZone: TimeZone = timeZone) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = timeZone
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }

    static func calendar(_ timeZone: TimeZone = timeZone) -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        calendar.firstWeekday = 2
        return calendar
    }

    /// `YYYY-MM-DD` of the shop day
    static func dayKey(_ date: Date, timeZone: TimeZone = timeZone) -> String {
        let parts = calendar(timeZone).dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// `YYYY-MM`
    static func monthKey(_ date: Date, timeZone: TimeZone = timeZone) -> String {
        String(dayKey(date, timeZone: timeZone).prefix(7))
    }

    /// Monday … Sunday of the shop week holding `date`
    static func weekDayKeys(containing date: Date, timeZone: TimeZone = timeZone) -> [String] {
        let cal = calendar(timeZone)
        let start = cal.startOfDay(for: date)
        let weekday = cal.component(.weekday, from: start) // 1 = Sunday
        let fromMonday = (weekday + 5) % 7
        guard let monday = cal.date(byAdding: .day, value: -fromMonday, to: start) else { return [] }
        return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: monday) }.map { dayKey($0, timeZone: timeZone) }
    }

    /// 1 = Monday … 7 = Sunday of a day key
    static func weekday(of dayKey: String) -> Int {
        guard let date = date(of: dayKey) else { return 1 }
        let weekday = calendar().component(.weekday, from: date)
        return weekday == 1 ? 7 : weekday - 1
    }

    static func date(of dayKey: String) -> Date? {
        let parts = dayKey.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar().date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12))
    }

    /// "T2", "CN" (vi) / "Mon" (en)
    static func weekdayLabel(_ weekday: Int) -> String {
        "attendance.weekday.\(weekday)".localized()
    }

    /// "T2 12/10"
    static func dayLabel(_ dayKey: String) -> String {
        let parts = dayKey.split(separator: "-")
        guard parts.count == 3 else { return dayKey }
        return "\(weekdayLabel(weekday(of: dayKey))) \(parts[2])/\(parts[1])"
    }

    /// "Hôm nay · T2 12/10/26"
    static func todayLabel(_ now: Date) -> String {
        let key = dayKey(now)
        let parts = key.split(separator: "-")
        guard parts.count == 3 else { return key }
        let date = "\(weekdayLabel(weekday(of: key))) \(parts[2])/\(parts[1])/\(parts[0].suffix(2))"
        return String(format: "attendance.today".localized(), date)
    }

    /// "THÁNG 10/2026"
    static func monthTitle(_ now: Date) -> String {
        let key = monthKey(now).split(separator: "-")
        guard key.count == 2 else { return "" }
        return String(format: "attendance.mine.month".localized(), "\(key[1])/\(key[0])")
    }

    // MARK: Numbers

    /// One decimal with the app language's separator: "4,0" (vi), "4.0" (en)
    static func hours(_ value: Double, language: String = Bundle.main.preferredLocalizations.first ?? "vi") -> String {
        let text = String(format: "%.1f", (value * 10).rounded() / 10)
        return language.hasPrefix("vi") ? text.replacingOccurrences(of: ".", with: ",") : text
    }

    static func meters(_ value: Double?) -> String {
        guard let value else { return "—" }
        return String(Int(value.rounded()))
    }

    /// "08:00" → "08", "17:30" → "17:30"
    static func shortTime(_ time: String?) -> String {
        guard let time, !time.isEmpty else { return "" }
        return time.hasSuffix(":00") ? String(time.dropLast(3)) : time
    }

    /// "Ca sáng" → "Sáng"
    static func shortName(_ name: String?) -> String {
        var text = (name ?? "").trimmingCharacters(in: .whitespaces)
        for prefix in ["Ca ", "ca "] where text.hasPrefix(prefix) && text.count > prefix.count {
            text = String(text.dropFirst(prefix.count))
        }
        guard let first = text.first else { return "" }
        return first.uppercased() + text.dropFirst()
    }

    /// "Ca sáng 08:00 – 12:00"
    static func shiftLine(_ shift: AttendanceShift) -> String {
        let times = [shift.start, shift.end].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " – ")
        return [shift.name ?? "", times].filter { !$0.isEmpty }.joined(separator: " ")
    }

    /// "Sáng 08–12"
    static func shiftShort(_ shift: AttendanceShift) -> String {
        let times = [shortTime(shift.start), shortTime(shift.end)].filter { !$0.isEmpty }.joined(separator: "–")
        return [shortName(shift.name), times].filter { !$0.isEmpty }.joined(separator: " ")
    }

    // MARK: State

    static func state(_ me: AttendanceMe?, now: Date = Date()) -> AttendanceState {
        guard let me else { return .notIn }
        if let open = me.openRecord, (open.status ?? "OPEN").uppercased() == "OPEN" { return .inShift }
        let status = (me.todayStatus ?? "").uppercased()
        if ["OPEN", "IN", "IN_SHIFT", "WORKING"].contains(status) { return .inShift }
        if ["DONE", "OUT", "FINISHED", "CLOSED"].contains(status) { return .done }
        if (me.lastAction ?? "").uppercased() == "OUT" {
            if let at = me.lastActionAt { return dayKey(at) == dayKey(now) ? .done : .notIn }
            return .done
        }
        return .notIn
    }

    static func statusText(_ state: AttendanceState) -> String {
        switch state {
        case .notIn: return "attendance.status.notIn".localized()
        case .inShift: return "attendance.status.inShift".localized()
        case .done: return "attendance.status.done".localized()
        }
    }

    /// "Ca sáng 08:00–12:00"
    static func shiftCompact(_ shift: AttendanceShift) -> String {
        let times = [shift.start, shift.end].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: "–")
        return [shift.name ?? "", times].filter { !$0.isEmpty }.joined(separator: " ")
    }

    /// Hours of a record: OUT − IN − break of the snapshot, floor 0, or the API's own value
    static func recordHours(_ record: AttendanceRecord) -> Double? {
        if let hours = record.hours { return hours }
        guard let checkIn = record.checkInAt, let checkOut = record.checkOutAt else { return nil }
        let minutes = checkOut.timeIntervalSince(checkIn) / 60 - Double(record.shift?.breakMinutes ?? 0)
        return max(0, minutes) / 60
    }

    // MARK: Errors

    static func errorCopy(_ failure: AttendanceFailure, outletName: String?) -> AttendanceErrorCopy {
        let code = (failure.code ?? "").uppercased()
        switch code {
        case "OUT_OF_RANGE":
            return AttendanceErrorCopy(title: "attendance.error.outOfRange.title".localized(),
                                       message: String(format: "attendance.error.outOfRange.message".localized(),
                                                       meters(failure.distanceM), meters(failure.radiusM ?? 100)))
        case "MOCK_LOCATION":
            return AttendanceErrorCopy(title: "attendance.error.mock.title".localized(),
                                       message: "attendance.error.mock.message".localized())
        case "QR_EXPIRED":
            return AttendanceErrorCopy(title: "attendance.error.qrExpired.title".localized(),
                                       message: "attendance.error.qrExpired.message".localized())
        case "QR_WRONG_OUTLET":
            // #949 the API names the code's outlet and the person's outlets; else the text by the session outlet
            let message: String
            if let qrOutlet = failure.qrOutletName, !failure.allowedOutletNames.isEmpty {
                message = String(format: "attendance.error.wrongOutlet.messageDetail".localized(),
                                 qrOutlet, failure.allowedOutletNames.joined(separator: ", "))
            } else {
                message = (outletName ?? "").isEmpty ? "attendance.error.wrongOutlet.messageNoName".localized()
                    : String(format: "attendance.error.wrongOutlet.message".localized(), outletName ?? "")
            }
            return AttendanceErrorCopy(title: "attendance.error.wrongOutlet.title".localized(), message: message)
        case "GPS_INACCURATE":
            return AttendanceErrorCopy(title: "attendance.error.gps.title".localized(),
                                       message: String(format: "attendance.error.gps.message".localized(), meters(failure.accuracyM)))
        case "NO_LOCATION":
            return AttendanceErrorCopy(title: "attendance.error.gps.title".localized(),
                                       message: "attendance.error.noLocation.message".localized())
        case "ATTENDANCE_LOCATION_NOT_SET":
            // #1014 setup error of the outlet (no location, so no distance), not "too far" and not "not set up"
            let title = (failure.outletName ?? "").isEmpty ? "attendance.error.locationNotSet.title".localized()
                : String(format: "attendance.error.locationNotSet.titleNamed".localized(), failure.outletName ?? "")
            return AttendanceErrorCopy(title: title, message: "attendance.error.locationNotSet.message".localized())
        case "ATTENDANCE_NOT_CONFIGURED":
            return AttendanceErrorCopy(title: "attendance.error.notConfigured.title".localized(),
                                       message: "attendance.error.notConfigured.message".localized())
        case "ATTENDANCE_NOT_REQUIRED":
            return AttendanceErrorCopy(title: "attendance.error.notRequired.title".localized(),
                                       message: "attendance.error.notRequired.message".localized())
        case "MODULE_NOT_ENABLED":
            return AttendanceErrorCopy(title: "attendance.error.module.title".localized(),
                                       message: "attendance.error.module.message".localized())
        case "SERVICE_UNAVAILABLE", "DATABASE_ERROR", "INTERNAL_SERVER_ERROR":
            // #1408 the server's trouble, not the scan: the shop tries again
            return AttendanceErrorCopy(title: "attendance.error.other.title".localized(),
                                       message: "attendance.error.other.message".localized())
        default:
            let tryAgain = "attendance.error.other.message".localized()
            let message = (failure.message ?? "").isEmpty ? tryAgain : ServerMessageGuard.safe(failure.message ?? "", fallback: tryAgain)
            return AttendanceErrorCopy(title: "attendance.error.other.title".localized(), message: message)
        }
    }

    // MARK: Ca và công của tôi

    /// IN / OUT pairs by record: accepted scans, then the last EDIT of a record (a manager's change, or a record
    /// added by hand on the web with no scans, #916) sets its times. Day: the rows' `dateKey` (#918), else the
    /// EDIT's `after.dateKey`, else the shop day of the check-in. An IN without OUT stays open.
    static func pairs(_ rows: [AttendanceMonthRow]) -> [AttendancePair] {
        var ins: [Int: AttendanceMonthRow] = [:]
        var outs: [Int: AttendanceMonthRow] = [:]
        var edits: [Int: AttendanceRecord] = [:]
        var dayKeys: [Int: String] = [:]
        var snapshots: [Int: Int] = [:]
        var order: [Int] = []
        for row in rows {
            guard let id = row.recordId, row.at != nil else { continue }
            let result = (row.result ?? "").uppercased()
            let kind = (row.kind ?? "").uppercased()
            if let minutes = row.shift?.breakMinutes, kind != "EDIT" { snapshots[id] = minutes }
            if kind == "EDIT" {
                guard let after = row.after, after.checkInAt != nil else { continue }
                if ins[id] == nil && edits[id] == nil { order.append(id) }
                edits[id] = after
                if let key = row.dateKey ?? after.dateKey, !key.isEmpty { dayKeys[id] = key }
                continue
            }
            guard result == "ACCEPTED" || result == "EDITED" || result.isEmpty else { continue }
            switch kind {
            case "IN":
                if ins[id] == nil && edits[id] == nil { order.append(id) }
                ins[id] = row
            case "OUT":
                outs[id] = row
            default:
                continue
            }
            if let key = row.dateKey, !key.isEmpty { dayKeys[id] = key }
        }
        return order.compactMap { id in
            let inRow = ins[id]
            let edit = edits[id]
            guard let checkIn = edit?.checkInAt ?? inRow?.at else { return nil }
            let checkOut = edit != nil ? edit?.checkOutAt : outs[id]?.at
            return AttendancePair(dayKey: dayKeys[id] ?? dayKey(checkIn), checkInAt: checkIn, checkOutAt: checkOut,
                                  lateMinutes: inRow?.lateMinutes ?? 0, breakMinutes: snapshots[id], hours: edit?.hours)
        }.sorted { $0.checkInAt < $1.checkInAt }
    }

    /// Hours of one closed pair as the server counts them (#923): the API's `hours`, else (OUT − IN) − break, floor 0.
    /// Break: the record's own snapshot, else (a record added by hand) the break of the day's shift the server linked
    /// it to, else 0.
    static func pairHours(_ pair: AttendancePair, shifts: [AttendanceShift]) -> Double? {
        if let hours = pair.hours { return hours }
        guard let out = pair.checkOutAt else { return nil }
        let breakMinutes = pair.breakMinutes ?? linkedShift(pair.checkInAt, dayKey: pair.dayKey, shifts: shifts)?.breakMinutes ?? 0
        return max(0, out.timeIntervalSince(pair.checkInAt) / 60 - Double(breakMinutes)) / 60
    }

    /// The server's `matchShiftForInstant` on one day: a shift whose window [start − 3 h, end] holds the check-in
    /// (an end at or before the start is the next day); the closest start wins
    static func linkedShift(_ checkIn: Date, dayKey: String, shifts: [AttendanceShift]) -> AttendanceShift? {
        var best: (shift: AttendanceShift, gap: TimeInterval)?
        for shift in shifts {
            guard let start = instant(dayKey: dayKey, clock: shift.start),
                  var end = instant(dayKey: dayKey, clock: shift.end) else { continue }
            if end <= start { end = end.addingTimeInterval(24 * 3600) }
            guard checkIn >= start.addingTimeInterval(-3 * 3600), checkIn <= end else { continue }
            let gap = abs(checkIn.timeIntervalSince(start))
            if best == nil || gap < best!.gap { best = (shift, gap) }
        }
        return best?.shift
    }

    /// Shop-zone instant of "HH:mm" on a day key
    static func instant(dayKey: String, clock: String?) -> Date? {
        let day = dayKey.split(separator: "-").compactMap { Int($0) }
        let time = (clock ?? "").split(separator: ":").compactMap { Int($0) }
        guard day.count == 3, time.count >= 2 else { return nil }
        return calendar().date(from: DateComponents(year: day[0], month: day[1], day: day[2], hour: time[0], minute: time[1]))
    }

    /// Mon–Sun days that have a shift or a pair
    static func weekRows(dayKeys: [String], schedule: [String: [AttendanceShift]], pairs: [AttendancePair]) -> [AttendanceWeekRow] {
        dayKeys.compactMap { key in
            let shifts = schedule[key] ?? []
            let dayPairs = pairs.filter { $0.dayKey == key }
            guard !shifts.isEmpty || !dayPairs.isEmpty else { return nil }
            let shiftText = shifts.map(shiftShort).joined(separator: ", ")
            let late = dayPairs.first?.lateMinutes ?? 0
            // #935 late never replaces the hours: "09:57–16:00 · 6,1 g · muộn 117′"
            let lines = dayPairs.map { pair -> AttendanceWeekLine in
                let span = "\(clock(pair.checkInAt))–\(pair.checkOutAt.map { clock($0) } ?? "…")"
                let main = pairHours(pair, shifts: shifts)
                    .map { "\(span) · \(String(format: "attendance.mine.hoursShort".localized(), hours($0)))" } ?? span
                let lateText = pair.lateMinutes > 0
                    ? String(format: "attendance.mine.late".localized(), pair.lateMinutes) : nil
                return AttendanceWeekLine(main: main, late: lateText)
            }
            let worked = lines.isEmpty ? "—" : lines.map(\.text).joined(separator: "\n")
            return AttendanceWeekRow(dayKey: key, day: dayLabel(key), shift: shiftText, worked: worked, isLate: late > 0,
                                     lines: lines)
        }
    }
}

// MARK: - #927 Card L in Settings

/// What the card shows: the big number, the line under it, the button, green while on shift
struct AttendanceCardModel: Equatable {
    let state: AttendanceState
    let big: String
    let line: String
    let button: String
    let isGreen: Bool
}

enum AttendanceCardLogic {
    /// Module on and `/me` answered `required` (missing = true)
    static func shows(merchant: Merchant?, me: AttendanceMe?) -> Bool {
        guard AttendanceModule.isOn(merchant), let me else { return false }
        return me.required
    }

    /// "2:44" (hours:minutes, floor)
    static func elapsed(_ seconds: TimeInterval) -> String {
        let minutes = max(0, Int(seconds / 60))
        return String(format: "%d:%02d", minutes / 60, minutes % 60)
    }

    /// Pairs of the shop day of `now`
    static func todayPairs(_ rows: [AttendanceMonthRow], now: Date) -> [AttendancePair] {
        let today = AttendanceLogic.dayKey(now)
        return AttendanceLogic.pairs(rows).filter { $0.dayKey == today }
    }

    /// Sum of the closed pairs (server rule, #923); nil when none is closed
    static func dayHours(_ pairs: [AttendancePair], shifts: [AttendanceShift]) -> Double? {
        let hours = pairs.compactMap { AttendanceLogic.pairHours($0, shifts: shifts) }
        return hours.isEmpty ? nil : hours.reduce(0, +)
    }

    static func model(me: AttendanceMe?, todayPairs: [AttendancePair], outletName: String?, now: Date = Date(),
                      fallbackHours: Double? = nil) -> AttendanceCardModel {
        let state = AttendanceLogic.state(me, now: now)
        let shifts = me?.todayShifts ?? []
        switch state {
        case .notIn:
            let shiftText = shifts.map(AttendanceLogic.shiftCompact).filter { !$0.isEmpty }.joined(separator: ", ")
            let line = [AttendanceLogic.dayLabel(AttendanceLogic.dayKey(now)), shiftText, outletName ?? "",
                        AttendanceLogic.statusText(.notIn)].filter { !$0.isEmpty }.joined(separator: " · ")
            return AttendanceCardModel(state: state, big: AttendanceLogic.clock(now), line: line,
                                       button: "attendance.clockIn".localized(), isGreen: false)
        case .inShift:
            let checkIn = me?.openRecord?.checkInAt
                ?? ((me?.lastAction ?? "").uppercased() == "IN" ? me?.lastActionAt : nil)
            var parts: [String] = []
            if let checkIn {
                parts.append(String(format: "attendance.card.inShift".localized(), AttendanceLogic.clock(checkIn)))
                let shift = me?.openRecord?.shift
                    ?? AttendanceLogic.linkedShift(checkIn, dayKey: AttendanceLogic.dayKey(checkIn), shifts: shifts)
                if let shift, let name = shift.name, !name.isEmpty, let end = shift.end, !end.isEmpty {
                    parts.append(String(format: "attendance.card.shiftUntil".localized(), name, end))
                }
            } else {
                parts.append(AttendanceLogic.statusText(.inShift).capitalizedFirst)
            }
            return AttendanceCardModel(state: state, big: checkIn.map { elapsed(now.timeIntervalSince($0)) } ?? "—",
                                       line: parts.joined(separator: " · "), button: "attendance.clockOut".localized(), isGreen: true)
        case .done:
            let spans = todayPairs.map { "\(AttendanceLogic.clock($0.checkInAt))–\($0.checkOutAt.map { AttendanceLogic.clock($0) } ?? "…")" }
            let line = String(format: "attendance.today".localized(),
                              spans.isEmpty ? AttendanceLogic.dayLabel(AttendanceLogic.dayKey(now)) : spans.joined(separator: ", "))
            let big = (dayHours(todayPairs, shifts: shifts) ?? fallbackHours)
                .map { String(format: "attendance.mine.hoursValue".localized(), AttendanceLogic.hours($0)) }
                ?? AttendanceLogic.statusText(.done).capitalizedFirst
            return AttendanceCardModel(state: state, big: big, line: line, button: "attendance.clockIn".localized(), isGreen: false)
        }
    }

    /// "✓ Đã vào ca 07:58 · Cách 11 m", "✓ Đã ra ca 17:05 · 8,1 giờ"
    static func successLine(_ result: AttendancePunchResult) -> String {
        let record = result.record
        if result.isOut {
            let at = record?.checkOutAt.map { AttendanceLogic.clock($0) } ?? ""
            var text = "✓ " + String(format: "attendance.done.out".localized(), at)
            if let hours = result.todayHours ?? record.flatMap(AttendanceLogic.recordHours) {
                text += " · " + String(format: "attendance.mine.hoursValue".localized(), AttendanceLogic.hours(hours))
            }
            return text
        }
        let at = record?.checkInAt.map { AttendanceLogic.clock($0) } ?? ""
        var text = "✓ " + String(format: "attendance.done.in".localized(), at)
        if let distance = result.distanceM {
            text += " · " + String(format: "attendance.card.distance".localized(), AttendanceLogic.meters(distance))
        }
        return text
    }
}

private extension String {
    var capitalizedFirst: String {
        guard let first else { return self }
        return first.uppercased() + dropFirst()
    }
}
