import CoreImage
import UIKit
import XCTest
@testable import POS_ADBD

/// #640: the order share image (spec .agent/changes/640-share-image/spec.md); #930: no status, created date, item notes
final class OrderShareImageTests: XCTestCase {
    private let vi = ShareLanguage.make(code: "vi-VN")
    private let en = ShareLanguage.make(code: "en")

    /// `2026-10-07` 10:00 in Vietnam (a Wednesday)
    private static func day(_ key: String, hour: Int = 10) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = Date.shopTimeZone
        let parts = key.split(separator: "-").compactMap { Int($0) }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: hour))!
    }

    static let vcb: BankAccount = {
        var account = BankAccount(bankName: "Vietcombank", accountNumber: "0071001234567", accountHolderName: "Nguyen Lan Anh", bankCode: "VCB")
        account.isDefault = true
        account.isActive = true
        return account
    }()

    /// The mockups' sample: Lan Anh Bridal, rental #482113
    static func rent(status: OrderStatus = .reserved) -> OrderShareSource {
        OrderShareSource(
            orderType: .rent, isDraft: false, status: status, orderNumber: "482113",
            shopName: "Lan Anh Bridal", outletName: "Chi nhánh Quận 3", outletPhone: "0901234567",
            outletAddress: "45 Võ Văn Tần, Quận 3, TP.HCM", outletId: 1,
            customerName: "Nguyễn Thị Mai", customerPhone: "0912345678",
            pickup: day("2026-10-07"), returnDate: day("2026-10-16"), rentalDays: nil,
            createdAt: day("2026-10-05", hour: 14).addingTimeInterval(30 * 60),
            items: [.init(name: "Váy cưới đuôi cá trơn", quantity: 1, total: 650_000, note: "  Size M, bó eo 2 cm "),
                    .init(name: "Áo dài cưới đỏ", quantity: 1, total: 350_000, note: "  "),
                    .init(name: "Vương miện ngọc trai", quantity: 2, total: 150_000)],
            discount: 0, total: 1_150_000, deposit: 300_000, collateralPapers: "CCCD", collateralMoney: 2_000_000)
    }

    /// Sale #731904
    static func sale() -> OrderShareSource {
        OrderShareSource(
            orderType: .sale, isDraft: false, status: .completed, orderNumber: "731904",
            shopName: "Lan Anh Bridal", outletName: "Chi nhánh Quận 3", outletPhone: "0901234567",
            outletAddress: "45 Võ Văn Tần, Quận 3, TP.HCM", outletId: 1,
            customerName: "Trần Văn Minh", customerPhone: "0987654321",
            pickup: nil, returnDate: nil, rentalDays: nil, createdAt: day("2026-10-07"),
            items: [.init(name: "Khăn voan cô dâu", quantity: 1, total: 180_000),
                    .init(name: "Hoa cầm tay lụa", quantity: 2, total: 240_000)],
            discount: 20_000, total: 400_000, deposit: 0, collateralPapers: nil, collateralMoney: 0)
    }

    /// The rental as a cart (draft), made on 07/10
    static func draft() -> OrderShareSource {
        var source = rent()
        source.isDraft = true
        source.status = .draft
        source.orderNumber = ""
        source.createdAt = day("2026-10-07")
        return source
    }

    private func model(_ source: OrderShareSource, _ language: ShareLanguage? = nil, qr: Bool = false,
                       now: Date = day("2026-10-07", hour: 14)) -> OrderShareModel {
        OrderShareModel.make(source, language: language ?? vi, bankAccount: qr ? Self.vcb : nil, qrSwitchOn: qr, now: now)
    }

    // MARK: - Header

    func testOnlyTheDraftHasAPill() {
        // #930: the image never shows the order status (it goes stale once forwarded)
        for status in [OrderStatus.reserved, .pickuped, .returned, .cancelled] {
            XCTAssertNil(model(Self.rent(status: status)).pill, "\(status)")
        }
        XCTAssertNil(model(Self.sale()).pill)
        XCTAssertEqual(model(Self.draft()).pill, "Chưa chốt")
    }

    func testHeaderLines() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.shopName, "Lan Anh Bridal")
        XCTAssertEqual(rent.outletLine, "Chi nhánh Quận 3 · 0901 234 567")
        // #930: created date and time in Vietnam time next to the kind
        XCTAssertEqual(rent.kindLine, "Đơn thuê · tạo 05/10/26 14:30")
        XCTAssertEqual(rent.title, "#482113")
        XCTAssertFalse(rent.isDraft)
        XCTAssertEqual(model(Self.sale()).kindLine, "Đơn bán · tạo 07/10/26 10:00")
        let draft = model(Self.draft())
        XCTAssertEqual(draft.kindLine, "Đơn thuê · lập 07/10/26")
        XCTAssertEqual(draft.title, "Đơn nháp")
        XCTAssertTrue(draft.isDraft)
    }

    func testCreatedTimeIsVietnamTime() {
        // 2026-10-04 17:30 UTC is 05/10 00:30 in Vietnam
        var late = Self.rent()
        late.createdAt = ISO8601DateFormatter().date(from: "2026-10-04T17:30:00Z")!
        XCTAssertEqual(model(late).kindLine, "Đơn thuê · tạo 05/10/26 00:30")
        XCTAssertEqual(model(late, en).kindLine, "Rental order · created 05/10/26 00:30")
    }

    func testInitials() {
        XCTAssertEqual(OrderShareModel.initials("Lan Anh Bridal"), "LA")
        XCTAssertEqual(OrderShareModel.initials("  đức   phát "), "ĐP")
        XCTAssertEqual(OrderShareModel.initials("AnyRent"), "A")
        XCTAssertEqual(OrderShareModel.initials(""), "#")
    }

    // MARK: - Customer and days

    func testCustomerAndWalkIn() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.customerLabel, "Khách hàng")
        XCTAssertEqual(rent.customerName, "Nguyễn Thị Mai")
        XCTAssertEqual(rent.customerPhone, "0912 345 678")
        var none = Self.sale()
        none.customerName = " "
        none.customerPhone = "N/A"
        XCTAssertEqual(model(none).customerName, "Khách lẻ")
        XCTAssertNil(model(none).customerPhone)
    }

    func testDayStripInVietnamCivilDays() {
        let strip = model(Self.rent()).strip
        // #930: no day count on an order (an arrow is drawn instead)
        XCTAssertEqual(strip, OrderShareModel.Strip(pickupLabel: "Nhận đồ", pickupDay: "07/10/26", days: nil,
                                                    returnLabel: "Trả đồ", returnDay: "16/10/26"))
        // 00:30 on 07/10 in Vietnam is still 06/10 in UTC: the strip shows the Vietnam day
        var early = Self.rent()
        early.pickup = Self.day("2026-10-07", hour: 0).addingTimeInterval(30 * 60)
        early.returnDate = Self.day("2026-10-07", hour: 23)
        XCTAssertEqual(model(early).strip?.pickupDay, "07/10/26")
        // The draft keeps its day count
        var draft = early
        draft.isDraft = true
        draft.status = .draft
        XCTAssertEqual(model(draft).strip?.days, "1 ngày", "a same-day rental is one day")
        XCTAssertEqual(model(draft, en).strip?.days, "1 day")
        XCTAssertEqual(model(Self.draft()).strip?.days, "10 ngày")
        XCTAssertNil(model(Self.sale()).strip, "sales have no strip")
    }

    func testOrdersCountCivilDaysNotTheStoredBillingDuration() {
        // Store run: 10/10/26 → 12/10/26 with rentalDuration 2 printed "2 ngày" on iOS, "3 days" on Android
        let pickup = Self.day("2026-10-10", hour: 9)
        let back = Self.day("2026-10-12", hour: 18)
        XCTAssertEqual(OrderShareSource.rentalDays(pickup: pickup, return: back, stored: 2), 3)
        XCTAssertEqual(OrderShareSource.rentalDays(pickup: nil, return: back, stored: 2), 2, "no dates: the stored value")
        XCTAssertNil(OrderShareSource.rentalDays(pickup: nil, return: nil, stored: nil))
    }

    // MARK: - Items and totals

    func testItemLinesAndMoneyFormat() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.itemsHeader, "Đồ thuê · 3 món")
        XCTAssertEqual(rent.lines[2], OrderShareModel.Line(name: "Vương miện ngọc trai", detail: "2 × 75.000đ",
                                                           amount: "150.000đ", note: nil))
        XCTAssertEqual(OrderShareModel.money(1_150_000), "1.150.000đ")
        XCTAssertEqual(OrderShareModel.money(0), "0đ")
        XCTAssertEqual(OrderShareModel.minus(300_000), "− 300.000đ")
        XCTAssertEqual(model(Self.sale()).itemsHeader, "Hàng mua · 2 món")
        // Same money format in English
        XCTAssertEqual(model(Self.rent(), en).lines[0].amount, "650.000đ")
    }

    func testItemNotesShownAndOrderNoteNot() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.lines.map(\.note), ["Size M, bó eo 2 cm", nil, nil], "trimmed; blank is none")
        // The model has no place for the order's general note: OrderShareSource carries none
        XCTAssertFalse(Mirror(reflecting: Self.rent()).children.contains { $0.label == "notes" })
    }

    func testRentTotalsHighlightTheRentTotal() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.rows, [
            .init(label: "Đã cọc", value: "300.000đ"),
            .init(label: "Thế chân khi nhận đồ", value: "CCCD + 2.000.000đ"),
        ])
        XCTAssertEqual(rent.highlightLabel, "Tổng tiền thuê")
        XCTAssertEqual(rent.highlightValue, "1.150.000đ")
        XCTAssertEqual(rent.highlight, .rent)
        XCTAssertNil(rent.note)
        // Same figures whatever the status (#930)
        for status in [OrderStatus.pickuped, .returned, .cancelled] {
            let other = model(Self.rent(status: status))
            XCTAssertEqual(other.rows, rent.rows)
            XCTAssertEqual(other.highlightValue, "1.150.000đ")
        }

        var discounted = Self.rent()
        discounted.discount = 50_000
        discounted.total = 1_100_000
        XCTAssertEqual(model(discounted).rows.prefix(2), [.init(label: "Tạm tính", value: "1.150.000đ"), .init(label: "Giảm giá", value: "− 50.000đ")])
        XCTAssertEqual(model(discounted).highlightValue, "1.100.000đ")

        var bare = Self.rent()
        bare.deposit = 0
        bare.collateralPapers = nil
        bare.collateralMoney = 0
        XCTAssertEqual(model(bare).rows, [.init(label: "Cọc", value: "Chưa cọc", muted: true)])
    }

    func testSaleTotals() {
        let sale = model(Self.sale())
        XCTAssertEqual(sale.rows, [.init(label: "Tạm tính", value: "420.000đ"), .init(label: "Giảm giá", value: "− 20.000đ")])
        XCTAssertEqual(sale.highlightLabel, "Tổng cộng")
        XCTAssertEqual(sale.highlightValue, "400.000đ")
        XCTAssertEqual(sale.highlight, .total)
        var noDiscount = Self.sale()
        noDiscount.discount = 0
        XCTAssertEqual(model(noDiscount).rows.map(\.label), ["Tạm tính"])
    }

    /// #939: test data of #930 — items 792, order total 396, no discount: Tạm tính is the lines, Tổng cộng the server's
    func testSaleSubtotalIsTheItemSumNotTheTotal() {
        var source = Self.sale()
        source.items = [.init(name: "A", quantity: 2, total: 396), .init(name: "B", quantity: 1, total: 396)]
        source.discount = 0
        source.total = 396
        let sale = model(source)
        XCTAssertEqual(sale.rows, [.init(label: "Tạm tính", value: "792đ")])
        XCTAssertEqual(sale.highlightValue, "396đ")
    }

    func testDraftTotalsAndNote() {
        let draft = model(Self.draft())
        XCTAssertEqual(draft.rows, [
            .init(label: "Cọc giữ đồ", value: "300.000đ"),
            .init(label: "Thế chân khi nhận đồ", value: "CCCD + 2.000.000đ"),
        ])
        XCTAssertEqual(draft.highlightLabel, "Tạm tính")
        XCTAssertEqual(draft.highlightValue, "1.150.000đ")
        XCTAssertEqual(draft.highlight, .draft)
        XCTAssertEqual(draft.note, "Đơn chưa chốt. Shop sẽ xác nhận lịch và giá trước khi giữ đồ.")
    }

    // MARK: - VietQR

    func testQrShownOnlyWithSwitchAndAccountAndNeverOnDraft() throws {
        let qr = try XCTUnwrap(model(Self.rent(), qr: true).qr)
        XCTAssertEqual(qr.bankName, "Vietcombank")
        XCTAssertEqual(qr.accountNumber, "0071001234567")
        XCTAssertEqual(qr.holder, "NGUYEN LAN ANH")
        XCTAssertEqual(qr.content, "Nội dung: DH482113")
        // #930: no amount (tag 54); 01 = 12 (dynamic) for the content 62/08 = DH<number>, as the Android image
        XCTAssertEqual(qr.payload, VietQR.payload(for: Self.vcb, amount: 0, content: "DH482113"))
        XCTAssertTrue(qr.payload.hasPrefix("000201010212"))
        XCTAssertTrue(qr.payload.contains("5303704" + "5802VN"), "no amount tag between currency and country")
        XCTAssertTrue(qr.payload.contains("0808DH482113"))
        XCTAssertFalse(try XCTUnwrap(model(Self.sale(), qr: true).qr).payload.contains("5406400000"), "a sale: no amount either")

        XCTAssertNil(OrderShareModel.make(Self.rent(), language: vi, bankAccount: Self.vcb, qrSwitchOn: false).qr, "switch off")
        XCTAssertNil(OrderShareModel.make(Self.rent(), language: vi, bankAccount: nil, qrSwitchOn: true).qr, "no account")
        XCTAssertNil(model(Self.draft(), qr: true).qr, "never on a draft")
        var unknownBank = Self.vcb
        unknownBank.bankName = "Ngân hàng Lạ"
        unknownBank.bankCode = "XYZ"
        XCTAssertNil(OrderShareModel.make(Self.rent(), language: vi, bankAccount: unknownBank, qrSwitchOn: true).qr)
    }

    func testAmountPayloadKeepsTheStaticBillPayloadAndDecodes() throws {
        // No amount and no content: exactly the printed bill's payload (#622 vectors)
        for v in BankQRTests.vectors {
            let account = BankAccount(bankName: v.bankName, accountNumber: v.account, accountHolderName: v.holder, bankCode: v.bankCode)
            XCTAssertEqual(VietQR.payload(for: account, amount: 0, content: nil), v.expected)
        }
        let payload = try XCTUnwrap(VietQR.payload(for: Self.vcb, amount: 850_000, content: "Đơn DH482113"))
        XCTAssertTrue(payload.contains("5406850000"))
        XCTAssertTrue(payload.contains("0812Don DH482113"), "content in ASCII")
        XCTAssertEqual(VietQR.crc16(String(payload.dropLast(4))), String(payload.suffix(4)))
        let filter = try XCTUnwrap(CIFilter(name: "CIQRCodeGenerator"))
        filter.setValue(Data(payload.utf8), forKey: "inputMessage")
        let image = try XCTUnwrap(filter.outputImage).transformed(by: CGAffineTransform(scaleX: 8, y: 8))
        let detector = try XCTUnwrap(CIDetector(ofType: CIDetectorTypeQRCode, context: nil,
                                                options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]))
        XCTAssertEqual(detector.features(in: image).compactMap { ($0 as? CIQRCodeFeature)?.messageString }, [payload])
    }

    // MARK: - Footer, language, file

    func testFooter() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.thanks, "Cảm ơn quý khách đã tin chọn Lan Anh Bridal")
        XCTAssertEqual(rent.address, "45 Võ Văn Tần, Quận 3, TP.HCM")
        XCTAssertEqual(rent.madeWith, "Tạo bằng AnyRent")
        var noAddress = Self.rent()
        noAddress.outletAddress = "  "
        XCTAssertNil(model(noAddress).address)
    }

    func testEnglishLabelsHaveNoVietnamese() {
        let rent = model(Self.rent(), en, qr: true)
        XCTAssertEqual(rent.kindLine, "Rental order · created 05/10/26 14:30")
        XCTAssertNil(rent.pill)
        XCTAssertEqual(rent.strip?.pickupDay, "07/10/26")
        XCTAssertEqual(rent.strip?.returnDay, "16/10/26")
        XCTAssertEqual(model(Self.draft(), en).strip?.days, "10 days")
        XCTAssertEqual(rent.highlightLabel, "Rental total")
        XCTAssertEqual(rent.customerLabel, "Customer")
        XCTAssertEqual(rent.qr?.content, "Reference: DH482113")
        XCTAssertEqual(model(Self.draft(), en).kindLine, "Rental order · made 07/10/26")
        let labels = [rent.kindLine, rent.customerLabel, rent.itemsHeader, rent.highlightLabel,
                      rent.thanks, rent.madeWith, rent.qr?.title ?? ""] + rent.rows.map(\.label)
        let vietnameseMarks = CharacterSet(charactersIn: "ăâđêôơưĂÂĐÊÔƠƯàáảãạèéẻẽẹìíỉĩịòóỏõọùúủũụỳýỷỹỵ")
        for label in labels {
            XCTAssertNil(label.rangeOfCharacter(from: vietnameseMarks), label)
        }
    }

    func testFileNames() {
        XCTAssertEqual(model(Self.rent()).fileName, "Order_482113.jpg")
        XCTAssertEqual(model(Self.draft(), now: Self.day("2026-10-07", hour: 14)).fileName, "Draft_20261007-1400.jpg")
    }

    func testCartShareNeedsLinesAndRentalDates() {
        let d = Self.day("2026-10-07")
        XCTAssertFalse(DraftShareRule.canShare(itemCount: 0, orderType: .sale, pickup: nil, returnDate: nil))
        XCTAssertTrue(DraftShareRule.canShare(itemCount: 1, orderType: .sale, pickup: nil, returnDate: nil))
        XCTAssertFalse(DraftShareRule.canShare(itemCount: 1, orderType: .rent, pickup: d, returnDate: nil))
        XCTAssertTrue(DraftShareRule.canShare(itemCount: 1, orderType: .rent, pickup: d, returnDate: d))
    }

    // MARK: - Rendering

    /// 540 pt at 2× = 1080 px wide; more items make it taller. Writes the three fixtures to the test's temporary
    /// directory, or to `SHARE_EXPORT_DIR` when set (`TEST_RUNNER_SHARE_EXPORT_DIR=… xcodebuild test`).
    func testRendersFixturesAt1080Wide() throws {
        let export = ProcessInfo.processInfo.environment["SHARE_EXPORT_DIR"].map { URL(fileURLWithPath: $0) }
        let dir = export ?? FileManager.default.temporaryDirectory.appendingPathComponent("share-640-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { if export == nil { try? FileManager.default.removeItem(at: dir) } }

        let fixtures: [(String, OrderShareModel)] = [
            ("thue", model(Self.rent(), qr: true)),
            ("ban", model(Self.sale())),
            ("nhap", model(Self.draft())),
            ("thue-en", model(Self.rent(), en, qr: true)),
            ("coc-mot-lan-khoi", model(Self.stagedRent(plan: false))),
            ("coc-giai-doan-khoi", model(Self.stagedRent(plan: true))),
            ("coc-giai-doan-khoi-en", model(Self.stagedRent(plan: true), en)),
            ("tien-chua-coc", model(Self.noDepositRent())),
            ("tien-giam-gia-the-chan", model(Self.discountedRent())),
        ]
        for (name, fixture) in fixtures {
            let image = OrderShareRenderer.image(fixture)
            XCTAssertEqual(image.size.width * image.scale, 1080, name)
            let data = try XCTUnwrap(OrderShareRenderer.jpeg(fixture))
            try data.write(to: dir.appendingPathComponent("\(name).jpg"))
        }

        var longer = Self.sale()
        longer.items += (1...5).map { .init(name: "Món \($0)", quantity: 1, total: 10_000) }
        XCTAssertGreaterThan(OrderShareRenderer.image(model(longer)).size.height,
                             OrderShareRenderer.image(model(Self.sale())).size.height)

        let url = try XCTUnwrap(OrderShareRenderer.writeJPEG(model(Self.rent()), to: dir))
        XCTAssertEqual(url.lastPathComponent, "Order_482113.jpg")
    }

    // MARK: - #1252 staged deposit and day-block label

    /// Rental with a day-block line (3 days + 2 extra) and, when `plan`, three deposit stages (collected, today, rest)
    static func stagedRent(plan: Bool) -> OrderShareSource {
        var source = rent()
        source.items = [.init(name: "Váy cưới đuôi cá trơn", quantity: 1, total: 160_000, note: "Size M",
                              formula: "120.000 (3 ngày) + 2 × 20.000 = 160.000", blockSummary: "Khối 3 ngày + 2 ngày thêm"),
                        .init(name: "Vương miện ngọc trai", quantity: 2, total: 150_000)]
        source.total = 310_000
        source.deposit = 93_000
        guard plan else { return source }
        source.hasDepositPlan = true
        source.stages = [
            OrderInstallment(key: "i1", label: "Giữ chỗ", percent: 30, amount: 93_000, dueDateKey: "2026-10-05", status: "PAID",
                             collectedAt: "2026-10-05T07:00:00.000Z", paidAmount: 93_000),
            OrderInstallment(key: "i2", label: "Chốt mẫu", percent: 40, amount: 124_000, dueDateKey: "2026-10-07", status: "DUE_TODAY"),
            OrderInstallment(key: "rest", label: "rest", percent: 30, amount: 93_000, dueDateKey: "2026-10-16", status: "UPCOMING"),
        ]
        source.stageSummary = InstallmentSummary(planned: 310_000, collected: 93_000, remaining: 217_000, percentCollected: 30)
        return source
    }

    /// #1345 frame (c): no deposit at all
    static func noDepositRent() -> OrderShareSource {
        var source = rent()
        source.deposit = 0
        source.collateralPapers = nil
        source.collateralMoney = 0
        return source
    }

    /// #1345 frame (d)+(e): a discount, one deposit and collateral
    static func discountedRent() -> OrderShareSource {
        var source = rent()
        source.items.append(.init(name: "Khăn đóng", quantity: 1, total: 100_000))
        source.discount = 100_000
        return source
    }

    /// 30% collected 26/10 (00:30 Vietnam time), 40% due today, the rest at hand-over, one void stage
    static let stages: [OrderInstallment] = [
        OrderInstallment(key: "i1", label: "Giữ chỗ", percent: 30, amount: 300_000, dueDateKey: "2026-10-05", status: "PAID",
                         collectedAt: "2026-10-25T17:30:00.000Z", paidAmount: 300_000),
        OrderInstallment(key: "i2", label: "Chốt mẫu", percent: 40, amount: 400_000, dueDateKey: "2026-10-07", status: "DUE_TODAY"),
        OrderInstallment(key: "i3", label: "Huỷ", percent: 5, amount: 50_000, dueDateKey: "2026-10-08", status: "VOID"),
        OrderInstallment(key: "rest", label: "rest", percent: 30, amount: 300_000, dueDateKey: "2026-10-16", status: "UPCOMING"),
    ]

    func testShareShowsStagesInsteadOfTheSingleDepositRow() throws {
        var source = Self.rent()
        source.hasDepositPlan = true
        source.stages = Self.stages
        source.stageSummary = InstallmentSummary(planned: 1_000_000, collected: 300_000, remaining: 700_000, percentCollected: 30)
        let m = model(source)
        let plan = try XCTUnwrap(m.stageBlock)
        XCTAssertEqual(plan.title, "Thu cọc theo giai đoạn")
        // #1345: the explicit stages only (the rest is "Thu khi giao"), void stages not listed
        XCTAssertEqual(plan.stages.map(\.title), ["1. Giữ chỗ", "2. Chốt mẫu"])
        XCTAssertEqual(plan.stages.map(\.amount), ["300.000đ", "400.000đ"])
        XCTAssertEqual(plan.stages[0].detail, "30% đơn · 26/10 · Đã thu")
        XCTAssertEqual(plan.stages[1].detail, "40% đơn · hạn 07/10 · Chưa thu")
        XCTAssertFalse(m.rows.contains { $0.value == OrderShareModel.money(300_000) }, "the single deposit row goes")
        XCTAssertFalse(m.rows.contains { $0.label == "Còn phải thu" || $0.label == "Đã thu" })
        // English uses the same keys in the other bundle
        XCTAssertEqual(try XCTUnwrap(model(source, en).stageBlock).title, "Staged deposit")
    }

    func testShareStaysTheSameWithoutAPlan() {
        var source = Self.rent()
        let before = model(source)
        XCTAssertNil(before.stageBlock)
        XCTAssertTrue(before.rows.contains { $0.value == OrderShareModel.money(300_000) })
        source.hasDepositPlan = false
        source.stages = Self.stages
        XCTAssertNil(model(source).stageBlock, "stages without hasDepositPlan (one-time deposit) show nothing")
        var sale = Self.sale()
        sale.hasDepositPlan = true
        sale.stages = Self.stages
        XCTAssertNil(model(sale).stageBlock)
        var draft = Self.draft()
        draft.hasDepositPlan = true
        draft.stages = Self.stages
        XCTAssertNil(model(draft).stageBlock)
    }

    func testLateStageJustSaysNotCollected() throws {
        // #1345: "Trễ 3 ngày" changes with the day the image is looked at, so a stage is only Đã thu or Chưa thu
        var source = Self.rent()
        source.hasDepositPlan = true
        source.stages = [OrderInstallment(key: "i1", label: "Giữ chỗ", percent: 50, amount: 500_000, dueDateKey: "2026-10-04", status: "OVERDUE"),
                         OrderInstallment(key: "rest", label: "rest", percent: 50, amount: 650_000, dueDateKey: "2026-10-16", status: "UPCOMING")]
        let plan = try XCTUnwrap(model(source).stageBlock)
        XCTAssertEqual(plan.stages.map(\.detail), ["50% đơn · hạn 04/10 · Chưa thu"])
    }

    func testBlockLineNamesTheBlock() {
        var source = Self.rent()
        source.items = [.init(name: "Áo dài", quantity: 1, total: 160_000, formula: "120.000 (3 ngày) + 2 × 20.000 = 160.000",
                              blockSummary: "Khối 3 ngày + 2 ngày thêm")]
        let line = model(source).lines[0]
        XCTAssertEqual(line.detail, "Khối 3 ngày + 2 ngày thêm")
        XCTAssertEqual(line.formula, "120.000 (3 ngày) + 2 × 20.000 = 160.000")
        XCTAssertEqual(line.amount, OrderShareModel.money(160_000))
        source.items[0].blockSummary = nil
        XCTAssertEqual(model(source).lines[0].detail, "1 × " + OrderShareModel.money(160_000))
    }

    // MARK: - #1252 printed bill

    private func printOrder(plan: Bool?) throws -> Order {
        let json = #"{"id":7,"orderNumber":"123456","orderType":"RENT","status":"RESERVED","createdAt":"2026-10-05T03:00:00.000Z","updatedAt":"2026-10-05T03:00:00.000Z","customerName":"Lan","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":1000000,"depositAmount":300000,"amountDue":0,"refundDue":0,"orderItems":[{"id":1,"productId":7,"productName":"Ao dai","quantity":1,"unitPrice":1000000,"totalPrice":1000000}]}"#
        var order = try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
        order.hasDepositPlan = plan
        order.stages = Self.stages
        order.stageSummary = InstallmentSummary(planned: 1_000_000, collected: 300_000, remaining: 700_000, percentCollected: 30)
        return order
    }

    func testBillPrintsTheStagesOnlyForAPlan() throws {
        let with = String(decoding: try printOrder(plan: true).toPrintData(), as: UTF8.self)
        XCTAssertTrue(with.contains("1. Giu cho: 300"), with)
        XCTAssertTrue(with.contains("2. Chot mau: 400"), with)
        XCTAssertTrue(with.contains("deposit.card.title".localized().formatStringOriginalCharacter()), with)
        XCTAssertFalse(with.contains("Huy"), "a void stage is not printed")

        let none = try printOrder(plan: nil).toPrintData()
        let off = try printOrder(plan: false).toPrintData()
        XCTAssertEqual(none, off, "no plan: the bill is what it was")
        XCTAssertFalse(String(decoding: none, as: UTF8.self).contains("Giu cho"))
    }
}

// MARK: - #1345 money order of the share image

/// The money part of the image, top to bottom: Tạm tính, Giảm giá, Tổng tiền thuê, Cọc, Thu khi giao, Thế chân.
/// Mockup "Ảnh chia sẻ đơn: thứ tự tiền", frames (a)-(g). `flat` prints the model as one line per entry.
final class OrderShareMoneyOrderTests: XCTestCase {
    private let vi = ShareLanguage.make(code: "vi-VN")
    private let en = ShareLanguage.make(code: "en")
    private let now = ISO8601DateFormatter().date(from: "2026-10-07T07:00:00Z")!

    private func flat(_ model: OrderShareModel) -> [String] {
        model.money.flatMap { entry -> [String] in
            switch entry {
            case .row(let row): return ["\(row.label)|\(row.value)" + (row.muted ? "|muted" : "")]
            case .total(let label, let value, _): return ["TOTAL \(label)|\(value)"]
            case .stages(let block): return ["STAGES \(block.title)"] + block.stages.map { "\($0.title)|\($0.amount)|\($0.detail)" }
            case .collect(let label, let value): return ["COLLECT \(label)|\(value)"]
            }
        }
    }

    private func make(_ source: OrderShareSource, _ language: ShareLanguage? = nil, currency: ShopCurrency = .vnd) -> OrderShareModel {
        OrderShareModel.make(source, language: language ?? vi, now: now, currency: currency)
    }

    /// Rental #482113 of the mockups: total 1.150.000, no collateral
    private func rent(deposit: Double = 0, papers: String? = nil, collateral: Double = 0) -> OrderShareSource {
        var source = OrderShareImageTests.rent()
        source.deposit = deposit
        source.collateralPapers = papers
        source.collateralMoney = collateral
        return source
    }

    /// 20% collected on 05/10, 30% due 06/10 (not collected), the rest 575.000 at hand-over
    private func stages(second: String = "UPCOMING") -> [OrderInstallment] {
        [OrderInstallment(key: "i1", label: "Cọc giữ chỗ", percent: 20, amount: 230_000, dueDateKey: "2026-10-05", status: "PAID",
                          collectedAt: "2026-10-05T07:00:00.000Z", paidAmount: 230_000),
         OrderInstallment(key: "i2", label: "Cọc trước ngày lấy", percent: 30, amount: 345_000, dueDateKey: "2026-10-06", status: second),
         OrderInstallment(key: "rest", label: "rest", percent: 50, amount: 575_000, dueDateKey: "2026-10-16", status: "UPCOMING")]
    }

    private func staged(second: String = "UPCOMING") -> OrderShareSource {
        var source = rent(deposit: 230_000)
        source.hasDepositPlan = true
        source.stages = stages(second: second)
        return source
    }

    // MARK: Frames

    func testA_oneDepositThenCollectOnDeliveryThenCollateral() {
        XCTAssertEqual(flat(make(rent(deposit: 300_000, papers: "CCCD", collateral: 2_000_000))), [
            "TOTAL Tổng tiền thuê|1.150.000đ",
            "Đã cọc|300.000đ",
            "COLLECT Thu khi giao|850.000đ",
            "Thế chân khi nhận đồ|CCCD + 2.000.000đ",
        ], "the total comes before the deposit; collateral is its own row and is not in 'Thu khi giao'")
        XCTAssertEqual(flat(make(rent(deposit: 300_000))), [
            "TOTAL Tổng tiền thuê|1.150.000đ", "Đã cọc|300.000đ", "COLLECT Thu khi giao|850.000đ",
        ])
    }

    func testB_stagesShowPaidAndUnpaidAndCollectIsTheRest() {
        XCTAssertEqual(flat(make(staged())), [
            "TOTAL Tổng tiền thuê|1.150.000đ",
            "STAGES Thu cọc theo giai đoạn",
            "1. Cọc giữ chỗ|230.000đ|20% đơn · 05/10 · Đã thu",
            "2. Cọc trước ngày lấy|345.000đ|30% đơn · hạn 06/10 · Chưa thu",
            "COLLECT Thu khi giao|575.000đ",
        ], "no 'Đã thu / Còn phải thu' pair, no 'rest' stage line")
    }

    func testB_aStageHasOnlyPaidOrUnpaidWhateverTheDayOfTheImage() {
        // OVERDUE, DUE_TODAY and UPCOMING all read "Chưa thu": 'Trễ N ngày' / 'Hôm nay' change with the day it is looked at
        let expected = flat(make(staged()))
        for status in ["OVERDUE", "DUE_TODAY", "UPCOMING"] {
            XCTAssertEqual(flat(make(staged(second: status))), expected, status)
        }
        var partial = staged(second: "PARTIAL")
        partial.stages?[1] = OrderInstallment(key: "i2", label: "Cọc trước ngày lấy", percent: 30, amount: 200_000, dueDateKey: "2026-10-06",
                                              status: "PARTIAL", collectedAt: "2026-10-06T03:00:00.000Z", paidAmount: 200_000)
        let lines = flat(make(partial))
        XCTAssertTrue(lines.contains("2. Cọc trước ngày lấy|200.000đ|30% đơn · 06/10 · Thu một phần"), "\(lines)")
    }

    func testC_noDepositSaysSoAndCollectsTheWholeTotal() {
        XCTAssertEqual(flat(make(rent())), [
            "TOTAL Tổng tiền thuê|1.150.000đ", "Cọc|Chưa cọc|muted", "COLLECT Thu khi giao|1.150.000đ",
        ])
    }

    func testD_discountShowsSubtotalFirstAndDepositIsOnTheDiscountedTotal() {
        var source = rent(deposit: 300_000)
        source.items.append(.init(name: "Khăn đóng", quantity: 1, total: 100_000))
        source.discount = 100_000
        XCTAssertEqual(flat(make(source)), [
            "Tạm tính|1.250.000đ", "Giảm giá|− 100.000đ",
            "TOTAL Tổng tiền thuê|1.150.000đ", "Đã cọc|300.000đ", "COLLECT Thu khi giao|850.000đ",
        ])
    }

    func testF_saleKeepsSubtotalDiscountTotalAndHasNoDepositOrCollect() {
        XCTAssertEqual(flat(make(OrderShareImageTests.sale())), [
            "Tạm tính|420.000đ", "Giảm giá|− 20.000đ", "TOTAL Tổng cộng|400.000đ",
        ])
    }

    func testG_draftAddsCollectAndKeepsItsFixedSentence() {
        let draft = make(OrderShareImageTests.draft())
        XCTAssertEqual(flat(draft), [
            "TOTAL Tạm tính|1.150.000đ", "Cọc giữ đồ|300.000đ", "COLLECT Thu khi giao|850.000đ",
            "Thế chân khi nhận đồ|CCCD + 2.000.000đ",
        ])
        XCTAssertEqual(draft.note, "Đơn chưa chốt. Shop sẽ xác nhận lịch và giá trước khi giữ đồ.")
        var discounted = OrderShareImageTests.draft()
        discounted.discount = 50_000
        discounted.total = 1_100_000
        discounted.deposit = 0
        XCTAssertEqual(flat(make(discounted)), [
            "Giảm giá|− 50.000đ", "TOTAL Tạm tính|1.100.000đ", "Cọc|Chưa cọc|muted", "COLLECT Thu khi giao|1.100.000đ",
            "Thế chân khi nhận đồ|CCCD + 2.000.000đ",
        ])
        var sale = OrderShareImageTests.sale()
        sale.isDraft = true
        sale.status = .draft
        XCTAssertFalse(flat(make(sale)).contains { $0.hasPrefix("COLLECT") }, "a sale draft has nothing to collect later")
    }

    // MARK: Fixed by the plan, not by the status

    func testCollectOnDeliveryIsTheSameForEveryOrderStatus() {
        for source in [rent(deposit: 300_000, papers: "CCCD", collateral: 2_000_000), staged(), rent()] {
            let reserved = flat(make(source))
            XCTAssertTrue(reserved.contains { $0.hasPrefix("COLLECT") }, "\(reserved)")
            for status in [OrderStatus.pickuped, .returned, .cancelled] {
                var other = source
                other.status = status
                XCTAssertEqual(flat(make(other)), reserved, "\(status)")
            }
        }
    }

    func testEnglishLabels() {
        XCTAssertEqual(flat(make(staged(), en)), [
            "TOTAL Rental total|1.150.000đ",
            "STAGES Staged deposit",
            "1. Cọc giữ chỗ|230.000đ|20% of order · 05/10 · Collected",
            "2. Cọc trước ngày lấy|345.000đ|30% of order · due 06/10 · Not collected",
            "COLLECT Collect at hand-over|575.000đ",
        ])
        XCTAssertEqual(flat(make(rent(), en)), [
            "TOTAL Rental total|1.150.000đ", "Deposit|No deposit|muted", "COLLECT Collect at hand-over|1.150.000đ",
        ])
        XCTAssertEqual(flat(make(rent(deposit: 300_000), en)), [
            "TOTAL Rental total|1.150.000đ", "Deposit paid|300.000đ", "COLLECT Collect at hand-over|850.000đ",
        ])
    }

    func testDollarShopFormatsAndRoundsToCents() {
        var source = rent(deposit: 300.10)
        source.total = 1_150.30
        XCTAssertEqual(flat(make(source, currency: .usd)), [
            "TOTAL Tổng tiền thuê|" + OrderShareModel.money(1_150.30, currency: .usd),
            "Đã cọc|" + OrderShareModel.money(300.10, currency: .usd),
            "COLLECT Thu khi giao|" + OrderShareModel.money(850.2, currency: .usd),
        ])
        XCTAssertTrue(OrderShareModel.money(850.2, currency: .usd).contains("$850.20"), OrderShareModel.money(850.2, currency: .usd))
        XCTAssertEqual(ShareMoneyRule.collectOnDelivery(total: 100.10, deposit: 30.05, hasPlan: nil, stages: nil, currency: .usd), 70.05)
    }

    // MARK: The pure rule

    func testCollectOnDeliveryRule() {
        func collect(total: Double = 1_150_000, deposit: Double = 0, plan: Bool? = nil, stages: [OrderInstallment]? = nil) -> Double {
            ShareMoneyRule.collectOnDelivery(total: total, deposit: deposit, hasPlan: plan, stages: stages, currency: .vnd)
        }
        XCTAssertEqual(collect(), 1_150_000, "no deposit: the whole total")
        XCTAssertEqual(collect(deposit: 300_000), 850_000, "one deposit: total minus it")
        XCTAssertEqual(collect(deposit: 2_000_000), 0, "never below zero")
        // With a plan: total minus every stage of the plan, collected or not (here 230.000 + 345.000)
        XCTAssertEqual(collect(deposit: 230_000, plan: true, stages: stages()), 575_000)
        // A void stage is not part of the plan; the "rest" stage is what is left, not a deposit
        var withVoid = stages()
        withVoid.insert(OrderInstallment(key: "i3", label: "Huỷ", percent: 5, amount: 50_000, dueDateKey: "2026-10-08", status: "VOID"), at: 2)
        XCTAssertEqual(collect(deposit: 230_000, plan: true, stages: withVoid), 575_000)
        // A short collection makes the stage worth what was taken (API): the rest grows, the rule follows the stage amounts
        var short = stages()
        short[1] = OrderInstallment(key: "i2", label: "Cọc trước ngày lấy", percent: 30, amount: 200_000, dueDateKey: "2026-10-06",
                                    status: "PARTIAL", collectedAt: "2026-10-06T03:00:00.000Z", paidAmount: 200_000)
        XCTAssertEqual(collect(deposit: 430_000, plan: true, stages: short), 720_000)
        // Stages without a plan flag (one-time deposit), or an older API: the single deposit
        XCTAssertEqual(collect(deposit: 300_000, plan: false, stages: stages()), 850_000)
        XCTAssertEqual(collect(deposit: 300_000, plan: nil, stages: nil), 850_000)
        XCTAssertEqual(collect(deposit: 300_000, plan: true, stages: []), 850_000, "a plan with no stage in the answer")
    }

    /// The finding of #1345: the order detail's "Thu khi giao" (handOver) counts only money already collected, so while
    /// stage 2 is unpaid it is 920.000, the "Còn phải thu" of the stage card, while the card's own row "Phần còn lại,
    /// thu khi giao" is 575.000. The image states the plan, so it says 575.000 and the stage 2 line above it says "Chưa thu".
    func testDetailScreenHandOverCountsUnpaidStagesTheImageDoesNot() {
        let detail = OrderDetailLogic.handOver(total: 1_150_000, deposit: 230_000, securityDeposit: 0, payments: [])
        XCTAssertEqual(detail.due, 920_000)
        XCTAssertEqual(ShareMoneyRule.collectOnDelivery(total: 1_150_000, deposit: 230_000, hasPlan: true, stages: stages(),
                                                       currency: .vnd), 575_000)
        // Once stage 2 is collected both agree
        let both = OrderDetailLogic.handOver(total: 1_150_000, deposit: 575_000, securityDeposit: 0, payments: [])
        XCTAssertEqual(both.due, 575_000)
    }
}

extension OrderShareModel {
    /// The plain rows of the money part (the order of all the entries is tested in `OrderShareMoneyOrderTests`)
    var rows: [Row] { money.compactMap { entry in if case .row(let row) = entry { return row } else { return nil } } }

    private var totalEntry: (label: String, value: String, tone: Highlight)? {
        for entry in money { if case .total(let label, let value, let tone) = entry { return (label, value, tone) } }
        return nil
    }

    /// The big box: the rent total, the sale total or the draft estimate
    var highlightLabel: String { totalEntry?.label ?? "" }
    var highlightValue: String { totalEntry?.value ?? "" }
    var highlight: Highlight? { totalEntry?.tone }

    var stageBlock: StageBlock? {
        for entry in money { if case .stages(let block) = entry { return block } }
        return nil
    }
}

// MARK: - #1354 the order's note on the image

/// "Hiện ghi chú đơn trên ảnh chia sẻ": mockup "Ảnh chia sẻ đơn: thứ tự tiền", sections 4 and 5, frames (a)-(g) with the
/// switch ON and OFF. The rule, the 4-line cut and the missing-key reading are pure.
final class OrderShareNoteTests: XCTestCase {
    private let vi = ShareLanguage.make(code: "vi-VN")
    private let en = ShareLanguage.make(code: "en")
    private let now = ISO8601DateFormatter().date(from: "2026-10-07T07:00:00Z")!
    private static let note = "Khách hẹn nhận trước 9h sáng. Váy cần là lại trước khi giao."

    private func make(_ source: OrderShareSource, on: Bool, _ language: ShareLanguage? = nil, qr: Bool = false) -> OrderShareModel {
        OrderShareModel.make(source, language: language ?? vi, bankAccount: qr ? OrderShareImageTests.vcb : nil, qrSwitchOn: qr,
                             showOrderNote: on, now: now)
    }

    private func with(_ base: OrderShareSource, note: String? = OrderShareNoteTests.note) -> OrderShareSource {
        var source = base
        source.orderNote = note
        return source
    }

    private func merchant(_ extra: String) throws -> Merchant {
        try JSONDecoder().decode(Merchant.self, from: Data("{\"id\": 1, \"name\": \"Shop\"\(extra)}".utf8))
    }

    private func profile(_ json: String) throws -> ShareOrderNoteProfile {
        try JSONDecoder().decode(ShareOrderNoteProfile.self, from: Data(json.utf8))
    }

    // MARK: Who sets it, how it is read

    func testOnlyTheShopOwnerSetsIt() {
        XCTAssertTrue(ShareOrderNoteRule.canSet(role: .merchant))
        for role in [Role.admin, .outletAdmin, .outletStaff, .outletInventory] {
            XCTAssertFalse(ShareOrderNoteRule.canSet(role: role), "\(role)")
        }
        XCTAssertFalse(ShareOrderNoteRule.canSet(role: nil))
    }

    func testMissingFlagMeansOff() throws {
        XCTAssertFalse(ShareOrderNoteRule.isOn(nil))
        let old = try merchant("")
        XCTAssertNil(old.shareOrderNote, "an older API or a cached login has no key")
        XCTAssertFalse(ShareOrderNoteRule.isOn(old))
        XCTAssertFalse(ShareOrderNoteRule.isOn(try merchant(", \"shareOrderNote\": null")))
        XCTAssertFalse(ShareOrderNoteRule.isOn(try merchant(", \"shareOrderNote\": false")))
        XCTAssertTrue(ShareOrderNoteRule.isOn(try merchant(", \"shareOrderNote\": true")))
    }

    func testMerchantRoundTripKeepsTheFlag() throws {
        let decoded = try merchant(", \"shareOrderNote\": true")
        let again = try JSONDecoder().decode(Merchant.self, from: try JSONEncoder().encode(decoded))
        XCTAssertEqual(again.shareOrderNote, true)
    }

    func testProfileFlagIsReadAndAnOddValueNeverFailsTheRead() throws {
        XCTAssertEqual(try profile("{\"merchant\": {\"shareOrderNote\": true}}").flag, true)
        XCTAssertEqual(try profile("{\"merchant\": {\"shareOrderNote\": false}}").flag, false)
        XCTAssertEqual(try profile("{\"merchant\": {\"id\": 1}}").flag, false, "missing key = off")
        XCTAssertEqual(try profile("{\"merchant\": {\"shareOrderNote\": null}}").flag, false)
        XCTAssertEqual(try profile("{\"merchant\": {\"shareOrderNote\": \"true\"}}").flag, false, "a string is not a boolean")
        XCTAssertEqual(try profile("{\"merchant\": {\"shareOrderNote\": 1}}").flag, false)
        XCTAssertNil(try profile("{\"id\": 1}").flag, "no shop (ADMIN): nothing to read")
    }

    func testRefreshReadsOnceAMinuteForEveryShopRole() {
        let t = Date()
        XCTAssertTrue(ShopCurrencyLogic.shouldRefresh(role: .outletStaff, lastRefresh: nil, now: t, force: false))
        XCTAssertFalse(ShopCurrencyLogic.shouldRefresh(role: .outletStaff, lastRefresh: t.addingTimeInterval(-30), now: t, force: false))
        XCTAssertTrue(ShopCurrencyLogic.shouldRefresh(role: .outletStaff, lastRefresh: t.addingTimeInterval(-61), now: t, force: false))
        XCTAssertFalse(ShopCurrencyLogic.shouldRefresh(role: .admin, lastRefresh: nil, now: t, force: true), "ADMIN has no shop")
    }

    // MARK: When the block is on the image

    func testTextOnlyForAnOrderWithTheSwitchOnAndANote() {
        XCTAssertEqual(ShareOrderNoteRule.text("  Giao trước 9h \n", enabled: true, isDraft: false), "Giao trước 9h")
        XCTAssertNil(ShareOrderNoteRule.text("Giao trước 9h", enabled: false, isDraft: false), "switch off")
        XCTAssertNil(ShareOrderNoteRule.text("Giao trước 9h", enabled: true, isDraft: true), "a draft has no order note")
        for empty in [nil, "", "   ", "\n \t"] {
            XCTAssertNil(ShareOrderNoteRule.text(empty, enabled: true, isDraft: false), "\(String(describing: empty))")
        }
    }

    func testOffOrNoNoteIsTheImageOfBefore() {
        for base in [OrderShareImageTests.rent(), OrderShareImageTests.sale()] {
            let noNote = make(base, on: true)
            XCTAssertNil(noNote.orderNote, "no note: no block even with the switch on")
            XCTAssertNil(make(with(base), on: false).orderNote, "switch off: no block")
            XCTAssertEqual(make(with(base), on: false), make(base, on: false), "switch off is the image of #1349 line for line")
            XCTAssertEqual(make(base, on: true), make(base, on: false))
        }
    }

    func testTheBlockIsTitledAndKeepsTheNote() {
        let block = make(with(OrderShareImageTests.rent()), on: true).orderNote
        XCTAssertEqual(block?.title, "Ghi chú")
        XCTAssertEqual(block?.text, Self.note)
        XCTAssertEqual(make(with(OrderShareImageTests.rent()), on: true, en).orderNote?.title, "Note")
    }

    func testNothingElseOnTheImageMoves() {
        let off = make(with(OrderShareImageTests.rent()), on: false, qr: true)
        let on = make(with(OrderShareImageTests.rent()), on: true, qr: true)
        XCTAssertNotNil(on.orderNote)
        XCTAssertEqual(on.money, off.money, "the money order (#1349) is the same")
        XCTAssertEqual(on.lines, off.lines, "item notes (#930) are the same")
        XCTAssertEqual(on.qr, off.qr)
        XCTAssertEqual(on.thanks, off.thanks)
        XCTAssertEqual(on.note, off.note)
    }

    // MARK: Frames (a)-(g)

    func testFramesAToG() {
        let rent = OrderShareImageTests.rent()
        var oneDeposit = rent; oneDeposit.deposit = 300_000                                   // (a)
        var staged = rent; staged.deposit = 230_000; staged.hasDepositPlan = true             // (b)
        staged.stages = [OrderInstallment(key: "i1", label: "Cọc giữ chỗ", percent: 20, amount: 230_000, dueDateKey: "2026-10-05",
                                          status: "PAID", collectedAt: "2026-10-05T07:00:00.000Z", paidAmount: 230_000),
                         OrderInstallment(key: "rest", label: "rest", percent: 80, amount: 920_000, dueDateKey: "2026-10-16", status: "UPCOMING")]
        var none = rent; none.deposit = 0                                                     // (c)
        var discounted = rent; discounted.discount = 100_000; discounted.deposit = 300_000    // (d)
        var collateral = rent; collateral.deposit = 300_000                                   // (e)
        collateral.collateralPapers = "CCCD"; collateral.collateralMoney = 2_000_000
        let frames: [(String, OrderShareSource, Bool)] = [
            ("a", oneDeposit, true), ("b", staged, true), ("c", none, true), ("d", discounted, true), ("e", collateral, true),
            ("f sale", OrderShareImageTests.sale(), true), ("g draft", OrderShareImageTests.draft(), false),
        ]
        for (name, source, hasBlock) in frames {
            let off = make(with(source), on: false)
            let on = make(with(source), on: true)
            XCTAssertNil(off.orderNote, "(\(name)) switch off")
            XCTAssertEqual(on.orderNote?.text, hasBlock ? Self.note : nil, "(\(name)) switch on")
            XCTAssertEqual(on.money, off.money, "(\(name)) the money part does not move")
        }
    }

    // MARK: The cut: at most 4 lines, "…" when more

    /// 10 characters per line
    private func fits10(_ s: String) -> Bool { s.count <= 10 }

    func testWrapsByWordsAndKeepsLineBreaks() {
        XCTAssertEqual(ShareNoteClip.lines("hello world foo bar", fits: fits10), ["hello", "world foo", "bar"])
        XCTAssertEqual(ShareNoteClip.lines("a\nb", fits: fits10), ["a", "b"])
        XCTAssertEqual(ShareNoteClip.lines("a\r\n\r\n\nb  c", fits: fits10), ["a", "b c"], "blank lines do not use up the 4 lines")
        XCTAssertEqual(ShareNoteClip.lines("   ", fits: fits10), [])
        XCTAssertEqual(ShareNoteClip.lines("", fits: fits10), [])
    }

    func testALongWordIsCutByCharacters() {
        XCTAssertEqual(ShareNoteClip.lines("abcdefghijklmnopqrstuvwxyz", fits: fits10), ["abcdefghij", "klmnopqrst", "uvwxyz"])
        XCTAssertEqual(ShareNoteClip.lines("ab abcdefghijklmnop", fits: fits10), ["ab", "abcdefghij", "klmnop"])
    }

    func testFourLinesAreKeptWhole() {
        XCTAssertEqual(ShareNoteClip.lines("aaaaaaaa bbbbbbbb cccccccc dddddddd", fits: fits10),
                       ["aaaaaaaa", "bbbbbbbb", "cccccccc", "dddddddd"], "exactly 4 lines: no ellipsis")
    }

    func testMoreThanFourLinesEndWithAnEllipsisOnTheFourth() {
        XCTAssertEqual(ShareNoteClip.lines("aaaaaaaa bbbbbbbb cccccccc dddddddd eeeeeeee ffffffff", fits: fits10),
                       ["aaaaaaaa", "bbbbbbbb", "cccccccc", "dddddddd…"])
        XCTAssertEqual(ShareNoteClip.lines("aaaaaaaaaa bbbbbbbbbb cccccccccc dddddddddd eeeeeeeeee", fits: fits10),
                       ["aaaaaaaaaa", "bbbbbbbbbb", "cccccccccc", "ddddddddd…"], "the fourth is shortened so the dots fit")
        XCTAssertEqual(ShareNoteClip.lines("a\nb\nc\nd\ne", fits: fits10), ["a", "b", "c", "d…"])
        XCTAssertEqual(ShareNoteClip.lines("a b c d e f", maxLines: 2, fits: { $0.count <= 3 }), ["a b", "c…"])
    }

    func testVietnameseIsCutAtCharactersNotAtBytes() {
        // every character here is one Character with combining marks; 10 per line
        XCTAssertEqual(ShareNoteClip.lines("ếếếếếếếếếếếếế", fits: fits10), ["ếếếếếếếếếế", "ếếế"])
    }

    // MARK: The drawn image

    func testTheNoteMakesTheImageTallerAndIsCappedAtFourLines() {
        let rent = OrderShareImageTests.rent()
        let without = OrderShareRenderer.image(make(with(rent), on: false)).size.height
        let short = OrderShareRenderer.image(make(with(rent), on: true)).size.height
        let long = String(repeating: "Váy cưới cần là lại trước khi giao, gọi trước 30 phút. ", count: 12)
        let longA = OrderShareRenderer.image(make(with(rent, note: long), on: true)).size.height
        let longB = OrderShareRenderer.image(make(with(rent, note: long + long), on: true)).size.height
        XCTAssertGreaterThan(short, without, "the block is drawn")
        XCTAssertGreaterThan(longA, short, "a longer note takes more lines")
        XCTAssertEqual(longA, longB, "but never more than 4")
        XCTAssertLessThan(longA - without, 200)
    }

    /// The image as RGBA bytes, `width` × `height` pixels
    private func bitmap(_ image: UIImage) -> (width: Int, height: Int, bytes: [UInt8]) {
        let cg = image.cgImage!
        var data = [UInt8](repeating: 0, count: cg.width * cg.height * 4)
        let context = CGContext(data: &data, width: cg.width, height: cg.height, bitsPerComponent: 8, bytesPerRow: cg.width * 4,
                                space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
        context.draw(cg, in: CGRect(x: 0, y: 0, width: cg.width, height: cg.height))
        return (cg.width, cg.height, data)
    }

    func testTheNoteIsInsideTheItemsCardAboveTheQRCard() {
        let flagged = make(with(OrderShareImageTests.rent()), on: true, qr: true)
        XCTAssertNotNil(flagged.orderNote)
        XCTAssertNotNil(flagged.qr)
        let bits = bitmap(OrderShareRenderer.image(flagged))
        let height = bits.height
        func near(_ a: [UInt8], _ b: [UInt8]) -> Bool { zip(a, b).allSatisfy { abs(Int($0) - Int($1)) <= 2 } }
        func rgb(_ x: Int, _ y: Int) -> [UInt8] { Array(bits.bytes[(y * bits.width + x) * 4..<(y * bits.width + x) * 4 + 3]) }
        // white card rows at x = 36 pt (inside every card), and the rows where the note's grey box (F3F4F6) is at x = 60 pt
        var cards: [ClosedRange<Int>] = []
        var noteRows: [Int] = []
        var start: Int?
        for y in 0..<height {
            let white = rgb(72, y) == [255, 255, 255]
            if white, start == nil { start = y }
            if !white, let from = start { cards.append(from...(y - 1)); start = nil }
            if near(rgb(120, y), [0xF3, 0xF4, 0xF6]) { noteRows.append(y) }
        }
        cards = cards.filter { $0.count > 200 } // the white tile and the title in the blue band are not cards
        XCTAssertEqual(cards.count, 3, "customer card, items card (money and note), QR card: \(cards)")
        guard cards.count == 3, let first = noteRows.first, let last = noteRows.last else { return XCTFail("no note box drawn") }
        XCTAssertTrue(cards[1].contains(first) && cards[1].contains(last), "the note is in the items card: \(cards) \(first)...\(last)")
        XCTAssertLessThan(last, cards[2].lowerBound, "and above the QR card")
        XCTAssertLessThan(cards[2].upperBound, height - 60, "the thanks come after the QR card")
    }
}
