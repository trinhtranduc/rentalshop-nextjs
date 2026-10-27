import CoreImage
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
            .init(label: "Đã đặt cọc", value: "300.000đ"),
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
        XCTAssertEqual(model(discounted).rows.first, .init(label: "Giảm giá", value: "− 50.000đ"))
        XCTAssertEqual(model(discounted).highlightValue, "1.100.000đ")

        var bare = Self.rent()
        bare.deposit = 0
        bare.collateralPapers = nil
        bare.collateralMoney = 0
        XCTAssertEqual(model(bare).rows, [])
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
        let plan = try XCTUnwrap(m.plan)
        XCTAssertEqual(plan.title, "Thu cọc theo giai đoạn")
        XCTAssertEqual(plan.stages.map(\.title), ["1. Giữ chỗ", "2. Chốt mẫu", "Phần còn lại, thu khi giao"])
        XCTAssertEqual(plan.stages.map(\.amount), [300_000, 400_000, 300_000])
        XCTAssertEqual(plan.stages[0].detail, "30% đơn · 26/10 · Đã thu")
        XCTAssertEqual(plan.stages[1].detail, "40% đơn · hạn 07/10 · Hôm nay")
        XCTAssertNil(plan.stages[2].detail)
        XCTAssertEqual([plan.collectedLabel, plan.remainingLabel], ["Đã thu", "Còn phải thu"])
        XCTAssertEqual([plan.collected, plan.remaining], [300_000, 700_000])
        XCTAssertFalse(m.rows.contains { $0.value == OrderShareModel.money(300_000) }, "the single deposit row goes")
        // English uses the same keys in the other bundle
        XCTAssertEqual(try XCTUnwrap(model(source, en).plan).title, "Staged deposit")
    }

    func testShareStaysTheSameWithoutAPlan() {
        var source = Self.rent()
        let before = model(source)
        XCTAssertNil(before.plan)
        XCTAssertTrue(before.rows.contains { $0.value == OrderShareModel.money(300_000) })
        source.hasDepositPlan = false
        source.stages = Self.stages
        XCTAssertNil(model(source).plan, "stages without hasDepositPlan (one-time deposit) show nothing")
        var sale = Self.sale()
        sale.hasDepositPlan = true
        sale.stages = Self.stages
        XCTAssertNil(model(sale).plan)
        var draft = Self.draft()
        draft.hasDepositPlan = true
        draft.stages = Self.stages
        XCTAssertNil(model(draft).plan)
    }

    func testLateStageSaysHowManyDays() throws {
        var source = Self.rent()
        source.hasDepositPlan = true
        source.stages = [OrderInstallment(key: "i1", label: "Giữ chỗ", percent: 50, amount: 500_000, dueDateKey: "2026-10-04", status: "OVERDUE")]
        let plan = try XCTUnwrap(model(source).plan)
        XCTAssertEqual(plan.stages[0].detail, "50% đơn · hạn 04/10 · Trễ 3 ngày")
        XCTAssertEqual([plan.collected, plan.remaining], [0, 500_000])
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
