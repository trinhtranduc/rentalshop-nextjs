import XCTest
@testable import POS_ADBD

/// #909 Chấm công: lenient decoding of the #907 responses, the one-button state, the Settings subtitle, the
/// mockup error copy, the "Ca và công của tôi" week rows and the VN week / day keys
final class AttendanceTests: XCTestCase {

    private let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let utc = TimeZone(identifier: "UTC")!

    private func at(_ iso: String) -> Date { AttendanceLogic.instant(iso)! }

    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder.shared.decode(T.self, from: Data(json.utf8))
    }

    // MARK: Module

    func testModuleHiddenWithoutModulesField() throws {
        let old = try decode(Merchant.self, #"{"id":1,"name":"Shop"}"#)
        XCTAssertNil(old.modules)
        XCTAssertFalse(AttendanceModule.isOn(old))
        let on = try decode(Merchant.self, #"{"id":1,"name":"Shop","modules":["attendance"]}"#)
        XCTAssertTrue(AttendanceModule.isOn(on))
        let other = try decode(Merchant.self, #"{"id":1,"name":"Shop","modules":["payroll"]}"#)
        XCTAssertFalse(AttendanceModule.isOn(other))
        XCTAssertFalse(AttendanceModule.isOn(nil))
    }

    // MARK: Decoding

    func testMeDecodesWithMissingAndOddFields() throws {
        let empty = try decode(AttendanceMe.self, "{}")
        XCTAssertTrue(empty.enabled)
        XCTAssertNil(empty.openRecord)
        XCTAssertEqual(AttendanceLogic.state(empty), .notIn)

        let full = try decode(AttendanceMe.self, """
        {"enabled":true,"openRecord":{"id":"5","checkInAt":"2026-10-12T00:58:00.000Z","status":"OPEN"},
         "today":{"shifts":[{"name":"Ca sáng","startTime":"08:00","endTime":"12:00","breakMinutes":0}],"status":"IN"},
         "lastAction":{"action":"IN","at":"2026-10-12T00:58:00Z"},"outlet":{"id":1,"name":"Chi nhánh chính"}}
        """)
        XCTAssertEqual(full.openRecord?.id, 5)
        XCTAssertEqual(full.todayShifts.first?.start, "08:00")
        XCTAssertEqual(full.outletName, "Chi nhánh chính")
        XCTAssertEqual(AttendanceLogic.state(full), .inShift)
    }

    func testPunchResultAndRecordSnapshot() throws {
        let result = try decode(AttendancePunchResult.self, """
        {"action":"OUT","record":{"checkInAt":"2026-10-12T00:58:00Z","checkOutAt":"2026-10-12T05:01:00Z",
         "shiftName":"Ca sáng","shiftStart":"08:00","shiftEnd":"12:00","shiftBreakMinutes":0},
         "distanceM":12.4,"accuracyM":5,"lateMinutes":0}
        """)
        XCTAssertTrue(result.isOut)
        XCTAssertEqual(result.record?.shift?.name, "Ca sáng")
        XCTAssertEqual(AttendanceLogic.recordHours(result.record!)!, 4.05, accuracy: 0.001)
        XCTAssertEqual(AttendanceLogic.meters(result.distanceM), "12")
    }

    func testScheduleDecodesListOrWrappedOrByUser() throws {
        let list = try decode(AttendanceSchedule.self, #"[{"userId":3,"date":"2026-10-12","shifts":[{"name":"Ca sáng","start":"08:00","end":"12:00"}]}]"#)
        XCTAssertEqual(list.days.first?.shifts.first?.end, "12:00")
        let wrapped = try decode(AttendanceSchedule.self, #"{"days":[{"userId":3,"date":"2026-10-13","shifts":[]}]}"#)
        XCTAssertEqual(wrapped.days.first?.date, "2026-10-13")
        let byUser = try decode(AttendanceSchedule.self, #"{"users":[{"userId":3,"days":[{"date":"2026-10-14","shifts":[{"name":"Ca chiều"}]}]}]}"#)
        XCTAssertEqual(byUser.days.first?.userId, 3)
        XCTAssertEqual(byUser.days.first?.shifts.first?.name, "Ca chiều")
    }

    func testInboxPayloadAcceptsNumbersAndShiftChanged() throws {
        let row = try decode(InboxNotification.self, """
        {"id":9,"type":"SHIFT_CHANGED","title":"Lịch ca thay đổi","body":"T5 15/10","isRead":false,
         "createdAt":"2026-10-12T01:00:00Z","data":{"outletId":4,"dates":["2026-10-15"]}}
        """)
        XCTAssertEqual(row.data?.outletId, "4")
        XCTAssertTrue(row.isShiftChanged)
        XCTAssertNil(row.orderIdValue)
    }

    // MARK: State and Settings subtitle

    func testDoneOnlyAfterAnOutToday() {
        let now = at("2026-10-12T06:00:00Z") // 13:00 VN
        let outToday = AttendanceMe(lastAction: "OUT", lastActionAt: at("2026-10-12T05:01:00Z"))
        XCTAssertEqual(AttendanceLogic.state(outToday, now: now), .done)
        // 23:30 VN yesterday is another VN day even though it is the same UTC day
        let outYesterday = AttendanceMe(lastAction: "OUT", lastActionAt: at("2026-10-11T16:30:00Z"))
        XCTAssertEqual(AttendanceLogic.state(outYesterday, now: at("2026-10-11T17:30:00Z")), .notIn)
    }

    func testSettingsSubtitle() {
        let me = AttendanceMe(todayShifts: [AttendanceShift(name: "Ca sáng", start: "08:00", end: "12:00")])
        XCTAssertEqual(AttendanceLogic.settingsSubtitle(me), "Ca sáng 08:00–12:00 · " + "attendance.status.notIn".localized())
        XCTAssertEqual(AttendanceLogic.settingsSubtitle(AttendanceMe()).lowercased(), "attendance.status.notIn".localized().lowercased())
    }

    // MARK: Errors (one at a time, mockup copy)

    func testErrorCopyCarriesNumbers() {
        let far = AttendanceLogic.errorCopy(AttendanceFailure(code: "OUT_OF_RANGE", distanceM: 350.2, radiusM: 100), outletName: nil)
        XCTAssertEqual(far.message, String(format: "attendance.error.outOfRange.message".localized(), "350", "100"))
        let gps = AttendanceLogic.errorCopy(AttendanceFailure(code: "GPS_INACCURATE", accuracyM: 180), outletName: nil)
        XCTAssertTrue(gps.message.contains("180"))
        let wrong = AttendanceLogic.errorCopy(AttendanceFailure(code: "QR_WRONG_OUTLET"), outletName: "Chi nhánh chính")
        XCTAssertTrue(wrong.message.contains("Chi nhánh chính"))
        let other = AttendanceLogic.errorCopy(AttendanceFailure(code: "SOMETHING", message: "Boom"), outletName: nil)
        XCTAssertEqual(other.message, "Boom")
        for code in ["MOCK_LOCATION", "QR_EXPIRED", "ATTENDANCE_NOT_CONFIGURED", "MODULE_NOT_ENABLED"] {
            XCTAssertFalse(AttendanceLogic.errorCopy(AttendanceFailure(code: code), outletName: nil).title.hasPrefix("attendance."), code)
        }
    }

    func testPunchParameters() {
        let params = AttendanceService.punchParameters(code: " a1.1.1.D.2026-10-12.x \n", latitude: 10.77, longitude: 106.7, accuracy: 5, isMock: false)
        XCTAssertEqual(params["code"] as? String, "a1.1.1.D.2026-10-12.x")
        XCTAssertEqual(params["accuracy"] as? Double, 5)
        XCTAssertEqual(params["isMock"] as? Bool, false)
    }

    // MARK: Days and week

    func testWeekIsMondayToSundayInVietnam() {
        // Sunday 18/10 23:30 VN = 16:30Z; Monday 19/10 00:30 VN = 17:30Z
        XCTAssertEqual(AttendanceLogic.weekDayKeys(containing: at("2026-10-18T16:30:00Z"), timeZone: vn).first, "2026-10-12")
        XCTAssertEqual(AttendanceLogic.weekDayKeys(containing: at("2026-10-18T17:30:00Z"), timeZone: vn).first, "2026-10-19")
        XCTAssertEqual(AttendanceLogic.weekDayKeys(containing: at("2026-10-18T17:30:00Z"), timeZone: utc).first, "2026-10-12")
        XCTAssertEqual(AttendanceLogic.dayKey(at("2026-10-12T16:59:59Z"), timeZone: vn), "2026-10-12")
        XCTAssertEqual(AttendanceLogic.dayKey(at("2026-10-12T17:00:00Z"), timeZone: vn), "2026-10-13")
        XCTAssertEqual(AttendanceLogic.weekday(of: "2026-10-12"), 1)
        XCTAssertEqual(AttendanceLogic.weekday(of: "2026-10-18"), 7)
    }

    func testShortShiftAndHours() {
        XCTAssertEqual(AttendanceLogic.shiftShort(AttendanceShift(name: "Ca sáng", start: "08:00", end: "12:00")), "Sáng 08–12")
        XCTAssertEqual(AttendanceLogic.shiftShort(AttendanceShift(name: "Ca chiều", start: "13:00", end: "17:30")), "Chiều 13–17:30")
        XCTAssertEqual(AttendanceLogic.hours(96.5, language: "vi"), "96,5")
        XCTAssertEqual(AttendanceLogic.hours(4, language: "en"), "4.0")
        XCTAssertEqual(AttendanceLogic.clock(at("2026-10-12T00:58:00Z"), timeZone: vn), "07:58")
    }

    func testWeekRowsFromMonthScans() {
        let rows = [
            AttendanceMonthRow(at: at("2026-10-12T00:58:00Z"), kind: "IN", result: "ACCEPTED", recordId: 1, lateMinutes: 0),
            AttendanceMonthRow(at: at("2026-10-12T05:01:00Z"), kind: "OUT", result: "ACCEPTED", recordId: 1),
            AttendanceMonthRow(at: at("2026-10-13T01:05:00Z"), kind: "IN", result: "REJECTED", recordId: nil),
            AttendanceMonthRow(at: at("2026-10-13T01:07:00Z"), kind: "IN", result: "ACCEPTED", recordId: 2, lateMinutes: 7),
            AttendanceMonthRow(at: at("2026-10-13T05:00:00Z"), kind: "OUT", result: "ACCEPTED", recordId: 2),
        ]
        let pairs = AttendanceLogic.pairs(rows)
        XCTAssertEqual(pairs.count, 2)
        let morning = AttendanceShift(name: "Ca sáng", start: "08:00", end: "12:00")
        let afternoon = AttendanceShift(name: "Ca chiều", start: "13:00", end: "17:30")
        let week = AttendanceLogic.weekDayKeys(containing: at("2026-10-14T03:00:00Z"), timeZone: vn)
        let result = AttendanceLogic.weekRows(dayKeys: week, schedule: ["2026-10-12": [morning], "2026-10-13": [morning],
                                                                       "2026-10-15": [afternoon]], pairs: pairs)
        XCTAssertEqual(result.map { $0.dayKey }, ["2026-10-12", "2026-10-13", "2026-10-15"])
        XCTAssertTrue(result[0].worked.hasPrefix("07:58–12:01 · "))
        XCTAssertFalse(result[0].isLate)
        XCTAssertTrue(result[1].isLate)
        XCTAssertTrue(result[1].worked.hasPrefix("08:07–12:00 · "))
        XCTAssertTrue(result[1].worked.contains("7"))
        XCTAssertEqual(result[2].worked, "—")
        XCTAssertEqual(result[2].shift, "Chiều 13–17:30")
    }
}
