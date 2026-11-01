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

    /// #967 Khách thân thiết: on through the plan features or `merchant.modules` (loyalty add-on)
    func testLoyaltyFromModulesOrPlan() throws {
        let user = User()
        XCTAssertFalse(user.hasLoyaltyFeature)
        user.merchant = try decode(Merchant.self, #"{"id":1,"name":"Shop","modules":["attendance"]}"#)
        XCTAssertFalse(user.hasLoyaltyFeature)
        user.merchant = try decode(Merchant.self, #"{"id":1,"name":"Shop","modules":["loyalty"]}"#)
        XCTAssertTrue(user.hasLoyaltyFeature)
        user.merchant = try decode(Merchant.self, #"{"id":1,"name":"Shop"}"#)
        XCTAssertFalse(user.hasLoyaltyFeature)
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

    // #1014 outlet without a location: its own setup error naming the outlet, apart from distance and "not set up"
    func testLocationNotSetIsItsOwnError() throws {
        let data = try decode(AttendanceFailureData.self, #"{"outlet":{"id":1,"name":"CN Một"}}"#)
        XCTAssertEqual(data.outletName, "CN Một")
        let named = AttendanceLogic.errorCopy(AttendanceFailure(code: "ATTENDANCE_LOCATION_NOT_SET", outletName: "CN Một"), outletName: nil)
        XCTAssertEqual(named.title, String(format: "attendance.error.locationNotSet.titleNamed".localized(), "CN Một"))
        XCTAssertEqual(named.message, "attendance.error.locationNotSet.message".localized())
        let plain = AttendanceLogic.errorCopy(AttendanceFailure(code: "ATTENDANCE_LOCATION_NOT_SET"), outletName: nil)
        XCTAssertEqual(plain.title, "attendance.error.locationNotSet.title".localized())
        XCTAssertFalse(plain.title.hasPrefix("attendance."))
        let notConfigured = AttendanceLogic.errorCopy(AttendanceFailure(code: "ATTENDANCE_NOT_CONFIGURED"), outletName: nil)
        let far = AttendanceLogic.errorCopy(AttendanceFailure(code: "OUT_OF_RANGE", distanceM: 900, radiusM: 100), outletName: nil)
        XCTAssertNotEqual(plain.title, notConfigured.title)
        XCTAssertNotEqual(plain.title, far.title)
        XCTAssertNotEqual(far.title, notConfigured.title)
    }

    // #949 wrong outlet: the API names the code's outlet and the person's outlets in `data`
    func testWrongOutletDataIsDecoded() throws {
        let full = try decode(AttendanceFailureData.self,
                              #"{"qrOutlet":{"id":3,"name":"CN Hai"},"allowedOutlets":[{"id":1,"name":"CN Một"},{"id":2,"name":"CN Ba"}]}"#)
        XCTAssertEqual(full.qrOutletName, "CN Hai")
        XCTAssertEqual(full.allowedOutletNames, ["CN Một", "CN Ba"])
        let other = try decode(AttendanceFailureData.self, #"{"qrOutlet":null,"allowedOutlets":[{"id":1,"name":"CN Một"}]}"#)
        XCTAssertNil(other.qrOutletName)
        let numbers = try decode(AttendanceFailureData.self, #"{"distanceM":350,"radiusM":100}"#)
        XCTAssertEqual(numbers.distanceM, 350)
        XCTAssertEqual(numbers.allowedOutletNames, [])
    }

    func testWrongOutletMessageNamesBothOutlets() {
        let failure = AttendanceFailure(code: "QR_WRONG_OUTLET", qrOutletName: "CN Hai", allowedOutletNames: ["CN Một"])
        let copy = AttendanceLogic.errorCopy(failure, outletName: "CN Một")
        XCTAssertEqual(copy.message, String(format: "attendance.error.wrongOutlet.messageDetail".localized(), "CN Hai", "CN Một"))
        XCTAssertTrue(copy.message.contains("CN Hai"))
        XCTAssertFalse(copy.message.hasPrefix("attendance."))
        // no outlet name in data (older API or another shop's code) → the current text
        let old = AttendanceLogic.errorCopy(AttendanceFailure(code: "QR_WRONG_OUTLET", allowedOutletNames: ["CN Một"]), outletName: "CN Một")
        XCTAssertEqual(old.message, String(format: "attendance.error.wrongOutlet.message".localized(), "CN Một"))
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

    /// #916 A record the manager added on the web ("+ Thêm lượt") has only an EDIT row, and an edited record keeps
    /// its scans: the week shows the times of the last EDIT
    func testWeekRowsShowManualAndEditedRecords() throws {
        let month = try decode(AttendanceMonth.self, """
        {"summary":{"hours":12,"days":3},"rows":[
          {"at":"2026-10-12T00:58:00Z","kind":"IN","result":"ACCEPTED","recordId":1,"lateMinutes":0},
          {"at":"2026-10-12T05:01:00Z","kind":"OUT","result":"ACCEPTED","recordId":1},
          {"at":"2026-10-13T09:00:00Z","kind":"EDIT","result":"EDITED","recordId":1,"note":"Quên quẹt",
           "before":{"checkInAt":"2026-10-12T00:58:00.000Z","checkOutAt":"2026-10-12T05:01:00.000Z","status":"DONE"},
           "after":{"checkInAt":"2026-10-12T01:00:00.000Z","checkOutAt":"2026-10-12T06:00:00.000Z","status":"DONE"}},
          {"at":"2026-10-14T10:00:00Z","kind":"EDIT","result":"EDITED","recordId":5,"note":"Quên điện thoại","before":null,
           "after":{"checkInAt":"2026-10-14T01:00:00.000Z","checkOutAt":"2026-10-14T05:00:00.000Z","status":"DONE",
                    "dateKey":"2026-10-14","id":5}},
          {"at":"2026-10-15T17:30:00Z","kind":"IN","result":"ACCEPTED","recordId":7,"dateKey":"2026-10-15"},
          {"at":"2026-10-15T21:30:00Z","kind":"OUT","result":"ACCEPTED","recordId":7,"dateKey":"2026-10-15"}
        ]}
        """)
        let pairs = AttendanceLogic.pairs(month.rows)
        XCTAssertEqual(pairs.count, 3)
        let week = AttendanceLogic.weekDayKeys(containing: at("2026-10-14T03:00:00Z"), timeZone: vn)
        let result = AttendanceLogic.weekRows(dayKeys: week, schedule: [:], pairs: pairs)
        // The row's own `dateKey` (#918) wins: a night shift that starts after midnight stays on its shift day
        XCTAssertEqual(result.map { $0.dayKey }, ["2026-10-12", "2026-10-14", "2026-10-15"])
        guard result.count == 3 else { return }
        XCTAssertTrue(result[0].worked.hasPrefix("08:00–13:00 · "), result[0].worked)
        XCTAssertTrue(result[1].worked.hasPrefix("08:00–12:00 · "), result[1].worked)
        XCTAssertTrue(result[1].worked.contains("4"), result[1].worked)
        XCTAssertTrue(result[2].worked.hasPrefix("00:30–04:30 · "), result[2].worked)
    }

    /// #923 A record added by hand has no shift in the month rows; the server counts the break of the shift it linked
    /// (the day's shift whose window [start − 3 h, end] holds the check-in). A record's own snapshot wins, and the
    /// API's `hours` wins over both.
    func testWeekRowHoursMatchTheServer() throws {
        let month = try decode(AttendanceMonth.self, """
        {"summary":{"hours":21.33,"days":2},"rows":[
          {"at":"2026-10-12T10:05:00Z","kind":"IN","result":"ACCEPTED","recordId":2,"dateKey":"2026-10-12",
           "shift":{"name":"Tối","start":"17:00","end":"23:30","breakMinutes":30}},
          {"at":"2026-10-12T12:00:00Z","kind":"EDIT","result":"EDITED","recordId":5,"dateKey":"2026-10-12","before":null,
           "after":{"checkInAt":"2026-10-12T01:03:00.000Z","checkOutAt":"2026-10-12T09:58:00.000Z","status":"DONE",
                    "dateKey":"2026-10-12","id":5}},
          {"at":"2026-10-12T16:30:00Z","kind":"OUT","result":"ACCEPTED","recordId":2,"dateKey":"2026-10-12"},
          {"at":"2026-10-13T12:00:00Z","kind":"EDIT","result":"EDITED","recordId":6,"dateKey":"2026-10-13","before":null,
           "after":{"checkInAt":"2026-10-13T01:00:00.000Z","checkOutAt":"2026-10-13T09:00:00.000Z","status":"DONE",
                    "hours":7.5,"id":6}}
        ]}
        """)
        let pairs = AttendanceLogic.pairs(month.rows)
        let schedule = ["2026-10-12": [AttendanceShift(name: "Sáng", start: "08:00", end: "17:00", breakMinutes: 60),
                                       AttendanceShift(name: "Tối", start: "17:00", end: "23:30", breakMinutes: 0)]]
        let week = AttendanceLogic.weekDayKeys(containing: at("2026-10-14T03:00:00Z"), timeZone: vn)
        let result = AttendanceLogic.weekRows(dayKeys: week, schedule: schedule, pairs: pairs)
        guard result.count == 2 else { return XCTFail("\(result)") }
        func short(_ value: Double) -> String {
            String(format: "attendance.mine.hoursShort".localized(), AttendanceLogic.hours(value))
        }
        // 8 h 55′ − 60′ of "Sáng" (manual) = 7,9; 6 h 25′ − its own 30′ snapshot (scans) = 5,9
        XCTAssertEqual(result[0].worked, "08:03–16:58 · \(short(7 + 55.0 / 60))\n17:05–23:30 · \(short(5 + 55.0 / 60))")
        XCTAssertEqual(result[1].worked, "08:00–16:00 · \(short(7.5))")
    }

    /// #935 A late record keeps its hours: "09:57–16:03 · 6,1 g · muộn 117′"; an open late record "08:10–… · muộn 10′"
    func testLateRecordShowsHoursThenLateMinutes() {
        let rows = [
            AttendanceMonthRow(at: at("2026-10-13T02:57:00Z"), kind: "IN", result: "ACCEPTED", recordId: 1, lateMinutes: 117),
            AttendanceMonthRow(at: at("2026-10-13T09:03:00Z"), kind: "OUT", result: "ACCEPTED", recordId: 1),
            AttendanceMonthRow(at: at("2026-10-14T01:10:00Z"), kind: "IN", result: "ACCEPTED", recordId: 2, lateMinutes: 10),
        ]
        let pairs = AttendanceLogic.pairs(rows)
        let week = AttendanceLogic.weekDayKeys(containing: at("2026-10-14T03:00:00Z"), timeZone: vn)
        let result = AttendanceLogic.weekRows(dayKeys: week, schedule: [:], pairs: pairs)
        guard result.count == 2 else { return XCTFail("\(result)") }
        let short = String(format: "attendance.mine.hoursShort".localized(), AttendanceLogic.hours(6.1))
        func late(_ minutes: Int) -> String { String(format: "attendance.mine.late".localized(), minutes) }
        XCTAssertEqual(result[0].worked, "09:57–16:03 · \(short) · \(late(117))")
        XCTAssertTrue(result[0].isLate)
        XCTAssertEqual(result[1].worked, "08:10–… · \(late(10))")
        XCTAssertTrue(result[1].isLate)
    }

    // MARK: #927 Card L in Settings

    func testRequiredDefaultsToTrue() throws {
        XCTAssertTrue(try decode(AttendanceMe.self, "{}").required)
        XCTAssertTrue(try decode(AttendanceMe.self, #"{"required":"no"}"#).required)
        XCTAssertTrue(try decode(AttendanceMe.self, #"{"required":true}"#).required)
        XCTAssertFalse(try decode(AttendanceMe.self, #"{"required":false}"#).required)
    }

    func testCardShowsOnlyWithModuleAndRequired() throws {
        let on = try decode(Merchant.self, #"{"id":1,"name":"Shop","modules":["attendance"]}"#)
        let off = try decode(Merchant.self, #"{"id":1,"name":"Shop"}"#)
        XCTAssertTrue(AttendanceCardLogic.shows(merchant: on, me: AttendanceMe()))
        XCTAssertFalse(AttendanceCardLogic.shows(merchant: on, me: AttendanceMe(required: false)))
        XCTAssertFalse(AttendanceCardLogic.shows(merchant: on, me: nil), "nothing until /me answered")
        XCTAssertFalse(AttendanceCardLogic.shows(merchant: off, me: AttendanceMe()))
    }

    func testElapsedIsHoursAndMinutes() {
        XCTAssertEqual(AttendanceCardLogic.elapsed(2 * 3600 + 44 * 60 + 59), "2:44")
        XCTAssertEqual(AttendanceCardLogic.elapsed(5 * 60), "0:05")
        XCTAssertEqual(AttendanceCardLogic.elapsed(-30), "0:00")
        XCTAssertEqual(AttendanceCardLogic.elapsed(11 * 3600), "11:00")
    }

    func testCardNotInShowsClockAllShiftsAndBranch() {
        let now = at("2026-10-13T00:57:00Z") // 07:57 VN, Tuesday
        let me = AttendanceMe(todayShifts: [AttendanceShift(name: "Ca sáng", start: "08:00", end: "12:00"),
                                            AttendanceShift(name: "Ca tối", start: "18:00", end: "22:00")],
                              todayStatus: "NOT_STARTED")
        let card = AttendanceCardLogic.model(me: me, todayPairs: [], outletName: "Chi nhánh chính", now: now)
        XCTAssertEqual(card.state, .notIn)
        XCTAssertEqual(card.big, "07:57")
        XCTAssertEqual(card.line, AttendanceLogic.dayLabel("2026-10-13") + " · Ca sáng 08:00–12:00, Ca tối 18:00–22:00 · Chi nhánh chính · "
                       + "attendance.status.notIn".localized())
        XCTAssertEqual(card.button, "attendance.clockIn".localized())
        XCTAssertFalse(card.isGreen)
        // No shift, no branch: day and status only
        let bare = AttendanceCardLogic.model(me: AttendanceMe(), todayPairs: [], outletName: nil, now: now)
        XCTAssertEqual(bare.line, AttendanceLogic.dayLabel("2026-10-13") + " · " + "attendance.status.notIn".localized())
    }

    func testCardOnShiftCountsFromCheckIn() {
        let now = at("2026-10-13T03:42:30Z") // 10:42 VN
        let open = AttendanceRecord(id: 9, checkInAt: at("2026-10-13T00:58:00Z"), checkOutAt: nil, status: "OPEN",
                                    shift: AttendanceShift(name: "Ca sáng", start: "08:00", end: "17:00"))
        let card = AttendanceCardLogic.model(me: AttendanceMe(openRecord: open, todayStatus: "IN_SHIFT"), todayPairs: [],
                                             outletName: "Chi nhánh chính", now: now)
        XCTAssertEqual(card.state, .inShift)
        XCTAssertEqual(card.big, "2:44")
        XCTAssertEqual(card.line, String(format: "attendance.card.inShift".localized(), "07:58") + " · "
                       + String(format: "attendance.card.shiftUntil".localized(), "Ca sáng", "17:00"))
        XCTAssertEqual(card.button, "attendance.clockOut".localized())
        XCTAssertTrue(card.isGreen)
        // No snapshot on the record: the day's shift the check-in falls in
        let bare = AttendanceRecord(checkInAt: at("2026-10-13T00:58:00Z"), checkOutAt: nil, status: "OPEN")
        let linked = AttendanceCardLogic.model(me: AttendanceMe(openRecord: bare, todayShifts: [AttendanceShift(name: "Ca sáng", start: "08:00", end: "17:00")]),
                                               todayPairs: [], outletName: nil, now: now)
        XCTAssertTrue(linked.line.hasSuffix(String(format: "attendance.card.shiftUntil".localized(), "Ca sáng", "17:00")), linked.line)
        let noShift = AttendanceCardLogic.model(me: AttendanceMe(openRecord: bare), todayPairs: [], outletName: nil, now: now)
        XCTAssertEqual(noShift.line, String(format: "attendance.card.inShift".localized(), "07:58"))
    }

    func testCardDoneShowsDayTotalAndPairs() {
        let now = at("2026-10-13T10:30:00Z") // 17:30 VN
        let rows = [
            // yesterday: not today's
            AttendanceMonthRow(at: at("2026-10-12T01:00:00Z"), kind: "IN", result: "ACCEPTED", recordId: 1, dateKey: "2026-10-12"),
            AttendanceMonthRow(at: at("2026-10-12T05:00:00Z"), kind: "OUT", result: "ACCEPTED", recordId: 1, dateKey: "2026-10-12"),
            AttendanceMonthRow(at: at("2026-10-13T00:58:00Z"), kind: "IN", result: "ACCEPTED", recordId: 2, dateKey: "2026-10-13"),
            AttendanceMonthRow(at: at("2026-10-13T05:01:00Z"), kind: "OUT", result: "ACCEPTED", recordId: 2, dateKey: "2026-10-13"),
            AttendanceMonthRow(at: at("2026-10-13T06:00:00Z"), kind: "IN", result: "ACCEPTED", recordId: 3, dateKey: "2026-10-13"),
            AttendanceMonthRow(at: at("2026-10-13T10:05:00Z"), kind: "OUT", result: "ACCEPTED", recordId: 3, dateKey: "2026-10-13"),
        ]
        let today = AttendanceCardLogic.todayPairs(rows, now: now)
        XCTAssertEqual(today.count, 2)
        let me = AttendanceMe(todayStatus: "DONE", lastAction: "OUT", lastActionAt: at("2026-10-13T10:05:00Z"))
        let card = AttendanceCardLogic.model(me: me, todayPairs: today, outletName: nil, now: now)
        XCTAssertEqual(card.state, .done)
        // 4 h 03′ + 4 h 05′ = 8,1
        XCTAssertEqual(card.big, String(format: "attendance.mine.hoursValue".localized(), AttendanceLogic.hours(8 + 8.0 / 60)))
        XCTAssertEqual(card.line, String(format: "attendance.today".localized(), "07:58–12:01, 13:00–17:05"))
        XCTAssertEqual(card.button, "attendance.clockIn".localized())
        XCTAssertFalse(card.isGreen)
        // Pairs not loaded yet: the last punch's day hours, no times
        let early = AttendanceCardLogic.model(me: me, todayPairs: [], outletName: nil, now: now, fallbackHours: 8.1)
        XCTAssertEqual(early.big, String(format: "attendance.mine.hoursValue".localized(), AttendanceLogic.hours(8.1)))
        XCTAssertEqual(early.line, String(format: "attendance.today".localized(), AttendanceLogic.dayLabel("2026-10-13")))
        // Nothing at all: the status word
        let none = AttendanceCardLogic.model(me: me, todayPairs: [], outletName: nil, now: now)
        XCTAssertFalse(none.big.isEmpty)
    }

    func testPunchSuccessLine() {
        let inResult = AttendancePunchResult(action: "IN", record: AttendanceRecord(checkInAt: at("2026-10-13T00:58:00Z"), checkOutAt: nil),
                                             distanceM: 11.4)
        XCTAssertEqual(AttendanceCardLogic.successLine(inResult),
                       "✓ " + String(format: "attendance.done.in".localized(), "07:58") + " · " + String(format: "attendance.card.distance".localized(), "11"))
        let outResult = AttendancePunchResult(action: "OUT", record: AttendanceRecord(checkInAt: at("2026-10-13T06:00:00Z"),
                                                                                      checkOutAt: at("2026-10-13T10:05:00Z")),
                                              todayHours: 8.1)
        XCTAssertEqual(AttendanceCardLogic.successLine(outResult),
                       "✓ " + String(format: "attendance.done.out".localized(), "17:05") + " · "
                       + String(format: "attendance.mine.hoursValue".localized(), AttendanceLogic.hours(8.1)))
    }

    func testNotRequiredHasItsOwnCopy() {
        let copy = AttendanceLogic.errorCopy(AttendanceFailure(code: "ATTENDANCE_NOT_REQUIRED"), outletName: nil)
        XCTAssertEqual(copy.title, "attendance.error.notRequired.title".localized())
        XCTAssertFalse(copy.title.hasPrefix("attendance."))
        XCTAssertFalse(copy.message.hasPrefix("attendance."))
    }
}

/// #1408 A server message goes into an alert only when it reads like a sentence, never SQL, a path or a stack
final class ServerMessageGuardTests: XCTestCase {

    private let raw = """

    Invalid `t.attendanceScan.findFirst()` invocation in
    /app/apps/api/.next/server/chunks/1677.js:54:55586

      51 SELECT u."merchantId" AS id FROM "User" u
    """

    func testTechnicalTextIsDetected() {
        for text in [raw,
                     "PrismaClientKnownRequestError: timed out",
                     "at /srv/node_modules/x/index.js:12:3",
                     "connect ECONNREFUSED 10.0.0.1:5432",
                     "SELECT id FROM \"User\"",
                     String(repeating: "a", count: 401)] {
            XCTAssertTrue(ServerMessageGuard.looksTechnical(text), text)
        }
    }

    func testSentencesStay() {
        for text in ["Không tìm thấy đơn hàng",
                     "Please select a product from the list",
                     "Order 123456 has already been picked up",
                     "Vui lòng thử lại sau 5 phút."] {
            XCTAssertFalse(ServerMessageGuard.looksTechnical(text), text)
            XCTAssertEqual(ServerMessageGuard.safe(text, fallback: "x"), text)
        }
    }

    func testSafeUsesTheFallback() {
        XCTAssertEqual(ServerMessageGuard.safe(raw, fallback: "generic"), "generic")
    }

    /// The path of the incident: OrderService builds the error from `message`, the alert shows localizedDescription
    func testAnErrorBuiltFromServerTextNeverCarriesIt() {
        let plain = NSError.errorWithOwnMessage(message: raw, domain: "RC")
        XCTAssertFalse(plain.localizedDescription.contains("invocation"))
        let coded = NSError.errorWithOwnMessage(message: raw, domain: "RC", code: 403)
        XCTAssertFalse(coded.localizedDescription.contains("SELECT"))
        XCTAssertEqual(coded.code, 403)
        let kept = NSError.errorWithOwnMessage(message: "Không tìm thấy đơn hàng", domain: "RC")
        XCTAssertEqual(kept.localizedDescription, "Không tìm thấy đơn hàng")
    }

    func testResponseWithoutAKnownCodeNeverCarriesIt() {
        let response = APIErrorResponse(success: false, code: nil, message: raw, error: nil)
        XCTAssertFalse(response.localizedMessage.contains("invocation"))
        XCTAssertFalse(response.toNSError().localizedDescription.contains("chunks"))
    }

    func testAttendanceShowsItsOwnTryAgainText() {
        let copy = AttendanceLogic.errorCopy(AttendanceFailure(code: nil, message: raw), outletName: nil)
        XCTAssertEqual(copy.title, "attendance.error.other.title".localized())
        XCTAssertEqual(copy.message, "attendance.error.other.message".localized())
        for code in ["SERVICE_UNAVAILABLE", "DATABASE_ERROR", "INTERNAL_SERVER_ERROR"] {
            let copy = AttendanceLogic.errorCopy(AttendanceFailure(code: code, message: "Service temporarily unavailable"), outletName: nil)
            XCTAssertEqual(copy.message, "attendance.error.other.message".localized(), code)
        }
    }
}
