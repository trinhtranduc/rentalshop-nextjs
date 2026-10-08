import XCTest
@testable import POS_ADBD

/// #519 "Lịch sử thay đổi" (boards LS-don, LS-san-pham, CT-thao-tac): payload decoding, labels, "old → new" values,
/// Vietnam-day groups, paging, the summary line, and which actions the order ⋯ sheet lists
final class ChangeHistoryTests: XCTestCase {

    private let vn = TimeZone(identifier: "Asia/Ho_Chi_Minh")!
    private let utc = TimeZone(identifier: "UTC")!
    private let vi = Locale(identifier: "vi_VN")

    private func at(_ iso: String) -> Date { ISOInstant.parse(iso)! }

    private func page(_ json: String) throws -> ChangeHistoryPage {
        try JSONDecoder().decode(ChangeHistoryPage.self, from: Data(json.utf8))
    }

    private let orderPayload = """
    {"entries": [
      {"id": 3, "at": "2026-10-06T08:10:00.000Z", "kind": "ORDER_EDITED",
       "actor": {"name": "Nguyễn An", "role": "OUTLET_STAFF"},
       "changes": [
         {"field": "returnPlanAt", "from": "2026-10-05T10:00:00.000Z", "to": "2026-10-06T17:30:00.000Z"},
         {"field": "depositAmount", "from": 500000, "to": 1000000},
         {"field": "isReadyToDeliver", "from": false, "to": true},
         {"field": "mysteryField", "from": null, "to": "x"}
       ]},
      {"id": 2, "at": "2026-10-05T09:00:00Z", "kind": "SOMETHING_NEW", "actor": null, "unknownKey": 1},
      {"id": 1, "at": "not a date", "kind": "ORDER_CREATED"}
    ], "total": 3, "latestAt": "2026-10-06T08:10:00.000Z"}
    """

    // MARK: Decoding

    func testDecodesOrderHistoryPayload() throws {
        let result = try page(orderPayload)
        XCTAssertEqual(result.total, 3)
        XCTAssertEqual(result.latestAt, "2026-10-06T08:10:00.000Z")
        XCTAssertEqual(result.entries.map(\.id), [3, 2, 1])

        let edited = result.entries[0]
        XCTAssertEqual(edited.actor, ChangeActor(name: "Nguyễn An", role: "OUTLET_STAFF"))
        XCTAssertEqual(edited.changes.map(\.to), [.text("2026-10-06T17:30:00.000Z"), .number(1_000_000), .bool(true), .text("x")])
        XCTAssertEqual(edited.changes[2].from, .bool(false))
        XCTAssertEqual(edited.changes[3].from, .null)
        XCTAssertEqual(edited.date, at("2026-10-06T08:10:00Z"))

        XCTAssertNil(result.entries[1].actor)
        XCTAssertEqual(result.entries[1].changes, [])
        XCTAssertEqual(result.entries[1].items, [])
        XCTAssertNil(result.entries[1].note)
        XCTAssertNil(result.entries[2].date)
    }

    func testNumbersZeroAndOneStayNumbersNotBooleans() throws {
        let result = try page("""
        {"entries": [{"id": 1, "at": "2026-10-06T08:10:00Z", "kind": "PRODUCT_STOCK",
          "changes": [{"field": "stock.Chi nhánh chính", "from": 1, "to": 0}]}], "total": 1}
        """)
        XCTAssertEqual(result.entries[0].changes[0].from, .number(1))
        XCTAssertEqual(result.entries[0].changes[0].to, .number(0))
        XCTAssertEqual(ChangeHistoryLogic.lines(result.entries[0], timeZone: vn),
                       [ChangeLine(label: "Chi nhánh chính", from: "1", to: "0")])
    }

    func testMissingFieldsAndBadTypesNeverFailTheList() throws {
        let result = try page("""
        {"entries": [
          {"id": "x", "kind": 5, "actor": "oops", "changes": "nope", "items": [{"name": "Vest", "field": "quantity", "from": "1", "to": 2}],
           "note": {"text": null, "imagesAdded": "2"}},
          {}
        ]}
        """)
        XCTAssertEqual(result.total, 2)
        XCTAssertNil(result.latestAt)
        XCTAssertEqual(result.entries[0].id, 0)
        XCTAssertEqual(result.entries[0].kind, "OTHER")
        XCTAssertNil(result.entries[0].actor)
        XCTAssertEqual(result.entries[0].changes, [])
        XCTAssertEqual(result.entries[0].items, [ChangeItemChange(productId: nil, name: "Vest", field: "quantity", from: nil, to: 2)])
        XCTAssertEqual(result.entries[0].note, ChangeNoteChange(text: nil, imagesAdded: 0, imagesRemoved: 0))
        XCTAssertEqual(result.entries[1].kind, "OTHER")
    }

    func testEmptyPayload() throws {
        let result = try page("{\"entries\": [], \"total\": 0, \"latestAt\": null}")
        XCTAssertEqual(result, ChangeHistoryPage(entries: [], total: 0, latestAt: nil))
    }

    // MARK: Titles and labels

    func testKindTitles() {
        func entry(_ kind: String, _ changes: [ChangeFieldChange] = []) -> ChangeHistoryEntry {
            ChangeHistoryEntry(id: 1, at: "", kind: kind, actor: nil, changes: changes)
        }
        XCTAssertEqual(ChangeHistoryLogic.title(entry("ORDER_ITEM_PRICE")), "history.kind.ORDER_ITEM_PRICE".localized())
        XCTAssertEqual(ChangeHistoryLogic.title(entry("product_price")), "history.kind.PRODUCT_PRICE".localized())
        XCTAssertEqual(ChangeHistoryLogic.title(entry("BRAND_NEW_KIND")), "history.kind.OTHER".localized())
        XCTAssertEqual(ChangeHistoryLogic.title(entry("ORDER_PAYMENT", [ChangeFieldChange(field: "paymentCollected", from: .null, to: .number(1))])),
                       "history.kind.ORDER_PAYMENT".localized())
        XCTAssertEqual(ChangeHistoryLogic.title(entry("ORDER_PAYMENT", [ChangeFieldChange(field: "paymentRefunded", from: .null, to: .number(1))])),
                       "history.kind.ORDER_REFUND".localized())
    }

    func testEveryKnownKindAndFieldHasAString() {
        for kind in ChangeHistoryLogic.knownKinds.union(["ORDER_REFUND"]) {
            let key = "history.kind." + kind
            XCTAssertNotEqual(key.localized(), key, kind)
        }
        for field in ChangeHistoryLogic.knownFields {
            let key = "history.field." + field
            XCTAssertNotEqual(key.localized(), key, field)
        }
    }

    func testFieldLabels() {
        XCTAssertEqual(ChangeHistoryLogic.label("pricing.DAILY"), "history.field.pricing.DAILY".localized())
        XCTAssertEqual(ChangeHistoryLogic.label("pricing.fixed"), "history.field.pricing.FIXED".localized())
        XCTAssertEqual(ChangeHistoryLogic.label("pricing.BLOCK"),
                       String(format: "history.field.pricing.other".localized(), CartV2Logic.pricingLabel("BLOCK")))
        XCTAssertEqual(ChangeHistoryLogic.label("stock.Chi nhánh chính"), "Chi nhánh chính")
        XCTAssertEqual(ChangeHistoryLogic.label("stock."), "history.field.stock".localized())
        XCTAssertEqual(ChangeHistoryLogic.label("returnPlanAt"), "history.field.returnPlanAt".localized())
        XCTAssertEqual(ChangeHistoryLogic.label("someNewField"), "someNewField")
    }

    // MARK: Values

    func testMoneyValues() {
        XCTAssertEqual(ChangeHistoryLogic.value("depositAmount", .number(1_000_000)), "1.000.000đ")
        XCTAssertEqual(ChangeHistoryLogic.value("rentPrice", .number(150_000)), "150.000đ")
        XCTAssertEqual(ChangeHistoryLogic.value("pricing.DAILY", .number(200_000)), "200.000đ")
        XCTAssertEqual(ChangeHistoryLogic.value("salePrice", .text("250000")), "250.000đ")
        XCTAssertEqual(ChangeHistoryLogic.value("discountValue", .number(10)), MoneyFormatter.format(10))
    }

    func testDateValuesUseTheVietnamDay() {
        // 17:30Z on 06/10 is 00:30 on 07/10 in Vietnam
        XCTAssertEqual(ChangeHistoryLogic.value("returnPlanAt", .text("2026-10-06T17:30:00.000Z"), timeZone: vn), "07/10")
        XCTAssertEqual(ChangeHistoryLogic.value("returnPlanAt", .text("2026-10-06T17:30:00.000Z"), timeZone: utc), "06/10")
        XCTAssertEqual(ChangeHistoryLogic.value("pickupPlanAt", .text("garbage"), timeZone: vn), "garbage")
    }

    func testNamedValues() {
        XCTAssertEqual(ChangeHistoryLogic.value("status", .text("PICKUPED")), OrdersHomeLogic.statusTag(.pickuped).text)
        XCTAssertEqual(ChangeHistoryLogic.value("status", .text("ON_THE_MOON")), "ON_THE_MOON")
        XCTAssertEqual(ChangeHistoryLogic.value("orderType", .text("RENT")), "history.value.rent".localized())
        XCTAssertEqual(ChangeHistoryLogic.value("orderType", .text("sale")), "history.value.sale".localized())
        XCTAssertEqual(ChangeHistoryLogic.value("pricingType", .text("DAILY")), CartV2Logic.pricingLabel("DAILY"))
        XCTAssertEqual(ChangeHistoryLogic.value("discountType", .text("PERCENTAGE")), "%")
        XCTAssertEqual(ChangeHistoryLogic.value("discountType", .text("AMOUNT")), "history.value.discountAmount".localized())
        XCTAssertEqual(ChangeHistoryLogic.value("paymentMethod", .text("CASH")), "history.value.cash".localized())
        XCTAssertEqual(ChangeHistoryLogic.value("paymentMethod", .text("BANK_TRANSFER")), "history.value.transfer".localized())
        XCTAssertEqual(ChangeHistoryLogic.value("isActive", .bool(true)), "history.value.yes".localized())
        XCTAssertEqual(ChangeHistoryLogic.value("isActive", .bool(false)), "history.value.no".localized())
        XCTAssertEqual(ChangeHistoryLogic.value("name", .null), "—")
        XCTAssertEqual(ChangeHistoryLogic.value("name", .text("  ")), "—")
        XCTAssertEqual(ChangeHistoryLogic.value("images", .number(3)), "3")
        XCTAssertEqual(ChangeHistoryLogic.value("images", .number(2.5)), "2.5")
    }

    // MARK: Lines

    func testFieldLines() throws {
        let entry = try page(orderPayload).entries[0]
        XCTAssertEqual(ChangeHistoryLogic.lines(entry, timeZone: vn), [
            ChangeLine(label: "history.field.returnPlanAt".localized(), from: "05/10", to: "07/10"),
            ChangeLine(label: "history.field.depositAmount".localized(), from: "500.000đ", to: "1.000.000đ"),
            ChangeLine(label: "history.field.isReadyToDeliver".localized(), from: "history.value.no".localized(),
                       to: "history.value.yes".localized()),
            ChangeLine(label: "mysteryField", from: "—", to: "x"),
        ])
    }

    func testPaymentShowsOnlyTheNewValue() {
        let entry = ChangeHistoryEntry(id: 1, at: "", kind: "ORDER_PAYMENT", actor: nil, changes: [
            ChangeFieldChange(field: "paymentCollected", from: .null, to: .number(500_000)),
            ChangeFieldChange(field: "paymentMethod", from: .null, to: .text("CASH")),
        ])
        XCTAssertEqual(ChangeHistoryLogic.lines(entry), [
            ChangeLine(label: "history.field.paymentCollected".localized(), from: nil, to: "500.000đ"),
            ChangeLine(label: "history.field.paymentMethod".localized(), from: nil, to: "history.value.cash".localized()),
        ])
    }

    private func capitalized(_ text: String) -> String { text.prefix(1).uppercased() + text.dropFirst() }

    func testPhotoDeltaReplacesTheImageCount() {
        let withDelta = ChangeHistoryEntry(id: 1, at: "", kind: "PRODUCT_IMAGES", actor: nil, changes: [
            ChangeFieldChange(field: "images", from: .number(3), to: .number(4)),
            ChangeFieldChange(field: "imagesAdded", from: .null, to: .number(2)),
            ChangeFieldChange(field: "imagesRemoved", from: .null, to: .number(1)),
        ])
        let expected = capitalized(PluralText.format("history.photos.added", count: 2, 2) + ", "
                                   + PluralText.format("history.photos.removed", count: 1, 1))
        XCTAssertEqual(ChangeHistoryLogic.lines(withDelta), [ChangeLine(label: nil, from: nil, to: expected)])

        let countOnly = ChangeHistoryEntry(id: 1, at: "", kind: "PRODUCT_IMAGES", actor: nil, changes: [
            ChangeFieldChange(field: "images", from: .number(3), to: .number(4)),
        ])
        XCTAssertEqual(ChangeHistoryLogic.lines(countOnly), [ChangeLine(label: "history.field.images".localized(), from: "3", to: "4")])
    }

    func testItemLines() {
        let entry = ChangeHistoryEntry(id: 1, at: "", kind: "ORDER_ITEMS", actor: nil, items: [
            ChangeItemChange(productId: 4, name: "Vest đen slim fit", field: "quantity", from: 1, to: 2),
            ChangeItemChange(productId: 4, name: "Vest đen slim fit", field: "price", from: 150_000, to: 200_000, unit: "DAILY"),
            ChangeItemChange(productId: 5, name: "Cà vạt", field: "added", from: nil, to: 2),
            ChangeItemChange(productId: 6, name: "Giày", field: "removed", from: 1, to: nil),
            ChangeItemChange(productId: 9, name: "", field: "quantity", from: nil, to: 1),
        ])
        let perDay = "history.unit.daily".localized()
        XCTAssertEqual(ChangeHistoryLogic.lines(entry), [
            ChangeLine(label: "Vest đen slim fit", from: "× 1", to: "× 2"),
            ChangeLine(label: "Vest đen slim fit", from: "150.000đ" + perDay, to: "200.000đ" + perDay),
            ChangeLine(label: nil, from: nil, to: String(format: "history.item.added".localized(), "Cà vạt", 2)),
            ChangeLine(label: nil, from: nil, to: String(format: "history.item.removed".localized(), "Giày", 1)),
            ChangeLine(label: "#9", from: "—", to: "× 1"),
        ])
    }

    func testUnitSuffix() {
        XCTAssertEqual(ChangeHistoryLogic.unitSuffix("DAILY"), "history.unit.daily".localized())
        XCTAssertEqual(ChangeHistoryLogic.unitSuffix("fixed"), "history.unit.fixed".localized())
        XCTAssertEqual(ChangeHistoryLogic.unitSuffix(nil), "")
        XCTAssertEqual(ChangeHistoryLogic.unitSuffix("BLOCK"), "")
    }

    func testNoteLines() {
        func lines(_ note: ChangeNoteChange) -> [ChangeLine] {
            ChangeHistoryLogic.lines(ChangeHistoryEntry(id: 1, at: "", kind: "ORDER_NOTE", actor: nil, note: note))
        }
        let both = capitalized(PluralText.format("history.photos.added", count: 2, 2) + ", “khách lấy thêm cà vạt”")
        XCTAssertEqual(lines(ChangeNoteChange(text: " khách lấy thêm cà vạt ", imagesAdded: 2, imagesRemoved: 0)),
                       [ChangeLine(label: nil, from: nil, to: both)])
        XCTAssertEqual(lines(ChangeNoteChange(text: "abc", imagesAdded: 0, imagesRemoved: 0)),
                       [ChangeLine(label: nil, from: nil, to: "“abc”")])
        XCTAssertEqual(lines(ChangeNoteChange(text: nil, imagesAdded: 0, imagesRemoved: 0)),
                       [ChangeLine(label: nil, from: nil, to: "history.note.cleared".localized())])
    }

    // MARK: Rows

    func testRowFooterInitialsAndTone() throws {
        let entries = try page(orderPayload).entries
        let staff = ChangeHistoryLogic.row(entries[0], timeZone: vn)
        XCTAssertEqual(staff.id, 3)
        XCTAssertEqual(staff.title, "history.kind.ORDER_EDITED".localized())
        let staffName = String(format: "history.actor.staff".localized(), "Nguyễn An")
        XCTAssertEqual(staff.footer, String(format: "history.actor.by".localized(), staffName) + " · 15:10")
        XCTAssertEqual(staff.footerParts.filter(\.bold).map(\.text), ["Nguyễn An"])
        XCTAssertEqual(staff.initials, "NA")
        XCTAssertEqual(staff.tone, .staff)

        let unknown = ChangeHistoryLogic.row(entries[1], timeZone: vn)
        XCTAssertEqual(unknown.title, "history.kind.OTHER".localized())
        XCTAssertEqual(unknown.footer, "16:00")
        XCTAssertEqual(unknown.footerParts, [ChangeFooterPart(text: "16:00", bold: false)])
        XCTAssertEqual(unknown.initials, "?")
        XCTAssertEqual(unknown.tone, .owner)

        let created = ChangeHistoryLogic.row(entries[2], timeZone: vn)
        XCTAssertEqual(created.footer, "")
        XCTAssertEqual(created.tone, .created)
        XCTAssertEqual(created.lines, [])
    }

    func testActorNameAndTone() {
        XCTAssertEqual(ChangeHistoryLogic.actorName(ChangeActor(name: "Trần Chủ", role: "MERCHANT")), "Trần Chủ")
        XCTAssertEqual(ChangeHistoryLogic.actorName(ChangeActor(name: "Lan", role: "outlet_admin")),
                       String(format: "history.actor.staff".localized(), "Lan"))
        XCTAssertNil(ChangeHistoryLogic.actorName(ChangeActor(name: "  ", role: "MERCHANT")))
        XCTAssertNil(ChangeHistoryLogic.actorName(nil))
        XCTAssertNil(ChangeHistoryLogic.actorParts(ChangeActor(name: "", role: "OUTLET_STAFF")))

        func tone(_ kind: String, _ role: String?) -> ChangeTone {
            ChangeHistoryLogic.tone(ChangeHistoryEntry(id: 1, at: "", kind: kind, actor: ChangeActor(name: "A", role: role)))
        }
        XCTAssertEqual(tone("ORDER_CREATED", "OUTLET_STAFF"), .created)
        XCTAssertEqual(tone("ORDER_NOTE", "MERCHANT"), .note)
        XCTAssertEqual(tone("ORDER_CANCELLED", "MERCHANT"), .danger)
        XCTAssertEqual(tone("PRODUCT_DELETED", "MERCHANT"), .danger)
        XCTAssertEqual(tone("ORDER_EDITED", "OUTLET_STAFF"), .staff)
        XCTAssertEqual(tone("ORDER_EDITED", "MERCHANT"), .owner)
    }

    func testFooterOwnerStaffAndUnknown() {
        func row(_ actor: ChangeActor?) -> ChangeRow {
            ChangeHistoryLogic.row(ChangeHistoryEntry(id: 1, at: "2026-10-06T08:10:00Z", kind: "ORDER_EDITED", actor: actor),
                                   timeZone: vn)
        }
        let (byHead, byTail) = ChangeHistoryLogic.splitFormat("history.actor.by".localized())
        let (staffHead, staffTail) = ChangeHistoryLogic.splitFormat("history.actor.staff".localized())

        let owner = row(ChangeActor(name: "Trinh Trần", role: "MERCHANT"))
        XCTAssertEqual(owner.footer, byHead + "Trinh Trần" + byTail + " · 15:10")
        XCTAssertEqual(owner.footerParts.filter(\.bold).map(\.text), ["Trinh Trần"])

        let staff = row(ChangeActor(name: " Lan Anh ", role: "OUTLET_STAFF"))
        XCTAssertEqual(staff.footer, byHead + staffHead + "Lan Anh" + staffTail + byTail + " · 15:10")
        XCTAssertEqual(staff.footerParts.filter(\.bold).map(\.text), ["Lan Anh"])

        let unknown = row(nil)
        XCTAssertEqual(unknown.footer, "15:10")
        XCTAssertTrue(unknown.footerParts.allSatisfy { !$0.bold })
        XCTAssertEqual(row(ChangeActor(name: "", role: "MERCHANT")).footer, "15:10")

        let split = ChangeHistoryLogic.splitFormat("%@ (nhân viên)")
        XCTAssertEqual(split.0, "")
        XCTAssertEqual(split.1, " (nhân viên)")
    }

    func testClockUsesTheShopZone() {
        XCTAssertEqual(ChangeHistoryLogic.clock(at("2026-10-06T08:10:00Z"), timeZone: vn), "15:10")
        XCTAssertEqual(ChangeHistoryLogic.clock(at("2026-10-06T17:05:00Z"), timeZone: vn), "00:05")
    }

    // MARK: Days

    func testGroupsByVietnamDayNewestFirstWithTodayTitle() throws {
        var entries = try page(orderPayload).entries
        // 23:30 on 05/10 in Vietnam, still the 05/10 group although it is 16:30Z
        entries.insert(ChangeHistoryEntry(id: 4, at: "2026-10-05T16:30:00Z", kind: "ORDER_PAYMENT", actor: nil), at: 1)
        let days = ChangeHistoryLogic.days(entries, now: at("2026-10-06T10:00:00Z"), timeZone: vn, locale: vi)

        XCTAssertEqual(days.map(\.key), ["2026-10-06", "2026-10-05", "—"])
        XCTAssertEqual(days[0].title, "\("Today section".localized()) · T3 06/10".uppercased(with: vi))
        XCTAssertEqual(days[1].title, "T2 05/10")
        XCTAssertEqual(days[1].rows.map(\.id), [4, 2])
        XCTAssertEqual(days[2].title, "—")
        XCTAssertEqual(days[2].rows.map(\.id), [1])
    }

    func testUndatedEntryMovesToTheEnd() {
        let entries = [
            ChangeHistoryEntry(id: 9, at: "", kind: "ORDER_EDITED", actor: nil),
            ChangeHistoryEntry(id: 8, at: "2026-10-01T03:00:00Z", kind: "ORDER_EDITED", actor: nil),
        ]
        let days = ChangeHistoryLogic.days(entries, now: at("2026-10-06T10:00:00Z"), timeZone: vn, locale: vi)
        XCTAssertEqual(days.map(\.key), ["2026-10-01", "—"])
        XCTAssertEqual(days[0].title, "T5 01/10")
    }

    // MARK: Paging

    func testMergeDropsRowsAlreadyShown() {
        func entry(_ id: Int) -> ChangeHistoryEntry { ChangeHistoryEntry(id: id, at: "", kind: "OTHER", actor: nil) }
        XCTAssertEqual(ChangeHistoryLogic.merge([entry(5), entry(4)], [entry(4), entry(3)]).map(\.id), [5, 4, 3])
        XCTAssertEqual(ChangeHistoryLogic.merge([], [entry(1)]).map(\.id), [1])
    }

    func testHasMore() {
        XCTAssertEqual(ChangeHistoryLogic.pageSize, 50)
        XCTAssertTrue(ChangeHistoryLogic.hasMore(loaded: 50, total: 120, lastPageCount: 50))
        XCTAssertFalse(ChangeHistoryLogic.hasMore(loaded: 120, total: 120, lastPageCount: 20))
        XCTAssertFalse(ChangeHistoryLogic.hasMore(loaded: 10, total: 120, lastPageCount: 0))
    }

    // MARK: Summary

    func testSummary() {
        let now = at("2026-10-06T10:00:00Z")
        XCTAssertEqual(ChangeHistoryLogic.summary(total: 0, latestAt: nil, now: now, timeZone: vn), "history.summary.none".localized())
        XCTAssertEqual(ChangeHistoryLogic.summary(total: 6, latestAt: "2026-10-06T08:10:00.000Z", now: now, timeZone: vn),
                       PluralText.format("history.summary", count: 6, 6, String(format: "history.summary.today".localized(), "15:10")))
        XCTAssertEqual(ChangeHistoryLogic.summary(total: 1, latestAt: "2026-10-05T09:00:00Z", now: now, timeZone: vn),
                       PluralText.format("history.summary", count: 1, 1, "16:00 05/10"))
        XCTAssertEqual(ChangeHistoryLogic.summary(total: 4, latestAt: nil, now: now, timeZone: vn),
                       PluralText.format("history.summary.count", count: 4, 4))
    }

    func testSubjectSubtitle() {
        XCTAssertEqual(ChangeHistorySubject.order(id: 1, number: "787771", customer: "Trần Văn Minh").subtitle,
                       String(format: "history.subtitle.order".localized(), "787771") + " · Trần Văn Minh")
        XCTAssertEqual(ChangeHistorySubject.order(id: 1, number: "787771", customer: nil).subtitle,
                       String(format: "history.subtitle.order".localized(), "787771"))
        XCTAssertEqual(ChangeHistorySubject.product(id: 2, name: "Vest đen slim fit", barcode: "VS-004").subtitle,
                       "Vest đen slim fit · VS-004")
        XCTAssertEqual(ChangeHistorySubject.product(id: 2, name: "Vest", barcode: " ").subtitle, "Vest")
    }

    // MARK: Order ⋯ sheet (board CT-thao-tac)

    private func sheet(_ type: OrderType, _ status: OrderStatus, manage: Bool = true,
                       canExtend: Bool = false) -> OrderSheetActions {
        let actions = OrderDetailLogic.actions(orderType: type, status: status, canManageOrders: manage, canDeleteCancelled: true)
        return OrderDetailLogic.sheetActions(actions, orderType: type, canExtend: canExtend)
    }

    func testReservedRentalSheetLeavesEditToTheBottomBar() {
        XCTAssertEqual(sheet(.rent, .reserved), OrderSheetActions(main: [.print, .share, .notes, .history], destructive: [.cancel]))
    }

    func testRentingSheetLeavesExtendToTheBottomBar() {
        XCTAssertEqual(sheet(.rent, .pickuped, canExtend: true), OrderSheetActions(main: [.print, .share, .notes, .history], destructive: [.cancel]))
        XCTAssertEqual(sheet(.rent, .pickuped, canExtend: false), OrderSheetActions(main: [.print, .share, .notes, .history], destructive: [.cancel]))
    }

    func testCompletedSaleKeepsPrintAndCancelOnScreen() {
        XCTAssertEqual(sheet(.sale, .completed), OrderSheetActions(main: [.share, .notes, .edit, .history], destructive: []))
    }

    func testReturnedAndCancelledOrders() {
        XCTAssertEqual(sheet(.rent, .returned), OrderSheetActions(main: [.share, .notes, .history], destructive: []))
        XCTAssertEqual(sheet(.rent, .cancelled), OrderSheetActions(main: [.share, .notes, .history], destructive: [.delete]))
    }

    func testStaffWithoutOrderRightsGetsNoEditOrCancel() {
        XCTAssertEqual(sheet(.rent, .reserved, manage: false), OrderSheetActions(main: [.print, .share, .notes, .history], destructive: []))
    }

    func testOnlyOwnersAndOutletAdminsSeeHistory() {
        for role in ["ADMIN", "OPS", "MERCHANT", "OUTLET_ADMIN", "merchant", " OUTLET_ADMIN "] {
            XCTAssertTrue(ChangeHistoryLogic.canView(role), role)
        }
        for role in ["OUTLET_STAFF", "outlet_staff", "", "ARTICLE", "SOMETHING"] {
            XCTAssertFalse(ChangeHistoryLogic.canView(role), role)
        }
        XCTAssertFalse(ChangeHistoryLogic.canView(nil))
    }

    func testStaffSheetHasNoHistory() {
        for type in OrderType.allCases {
            for status in [OrderStatus.reserved, .pickuped, .returned, .completed, .cancelled] {
                let actions = OrderDetailLogic.actions(orderType: type, status: status, canManageOrders: false,
                                                       canDeleteCancelled: false)
                let listed = OrderDetailLogic.sheetActions(actions, orderType: type, canExtend: false, canViewHistory: false)
                XCTAssertFalse(listed.main.contains(.history), "\(type) \(status)")
            }
        }
        XCTAssertEqual(OrderDetailLogic.sheetActions(
            OrderDetailLogic.actions(orderType: .rent, status: .reserved, canManageOrders: false, canDeleteCancelled: false),
            orderType: .rent, canExtend: false, canViewHistory: false), OrderSheetActions(main: [.print, .share, .notes], destructive: []))
    }

    func testSheetNeverRepeatsABottomButton() {
        for type in OrderType.allCases {
            for status in [OrderStatus.reserved, .pickuped, .returned, .completed, .cancelled] {
                for canExtend in [false, true] {
                    let actions = OrderDetailLogic.actions(orderType: type, status: status, canManageOrders: true,
                                                           canDeleteCancelled: true)
                    let onScreen = OrderDetailLogic.bottomButtons(actions, orderType: type, canExtend: canExtend)
                    let listed = OrderDetailLogic.sheetActions(actions, orderType: type, canExtend: canExtend)
                    XCTAssertTrue(Set(onScreen.map { "\($0)" }).isDisjoint(with: (listed.main + listed.destructive).map { "\($0)" }),
                                  "\(type) \(status) \(canExtend)")
                    XCTAssertTrue(listed.main.contains(.history))
                    XCTAssertTrue(listed.destructive.allSatisfy(\.isDestructive))
                    XCTAssertFalse(listed.main.contains(where: \.isDestructive))
                }
            }
        }
    }

    func testNotesSubtitle() {
        XCTAssertEqual(OrderDetailLogic.notesSubtitle(text: nil, photoCount: 0), "order.sheet.notes.add".localized())
        XCTAssertEqual(OrderDetailLogic.notesSubtitle(text: "  ", photoCount: 0), "order.sheet.notes.add".localized())
        XCTAssertEqual(OrderDetailLogic.notesSubtitle(text: "Giao sớm", photoCount: 0), "order.sheet.notes.text".localized())
        XCTAssertEqual(OrderDetailLogic.notesSubtitle(text: nil, photoCount: 2), PluralText.format("order.sheet.notes.photos", count: 2, 2))
        XCTAssertEqual(OrderDetailLogic.notesSubtitle(text: "Giao sớm", photoCount: 1),
                       PluralText.format("order.sheet.notes.textPhotos", count: 1, 1))
    }
}
