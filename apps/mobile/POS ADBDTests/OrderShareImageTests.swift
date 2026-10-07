import CoreImage
import XCTest
@testable import POS_ADBD

/// #640: the order share image (spec .agent/changes/640-share-image/spec.md)
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
            pickup: day("2026-10-07"), returnDate: day("2026-10-16"), rentalDays: nil, createdAt: day("2026-10-05"),
            items: [.init(name: "Váy cưới đuôi cá trơn", quantity: 1, total: 650_000),
                    .init(name: "Áo dài cưới đỏ", quantity: 1, total: 350_000),
                    .init(name: "Vương miện ngọc trai", quantity: 2, total: 150_000)],
            discount: 0, total: 1_150_000, deposit: 300_000, collateralPapers: "CCCD", collateralMoney: 2_000_000,
            amountDue: OrderShareSource.amountDue(orderType: .rent, status: status, total: 1_150_000, deposit: 300_000,
                                                  payments: []))
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
            discount: 20_000, total: 400_000, deposit: 0, collateralPapers: nil, collateralMoney: 0, amountDue: 400_000)
    }

    /// The rental as a cart (draft), made on 07/10
    static func draft() -> OrderShareSource {
        var source = rent()
        source.isDraft = true
        source.status = .draft
        source.orderNumber = ""
        source.createdAt = day("2026-10-07")
        source.amountDue = source.total
        return source
    }

    private func model(_ source: OrderShareSource, _ language: ShareLanguage? = nil, qr: Bool = false,
                       now: Date = day("2026-10-07", hour: 14)) -> OrderShareModel {
        OrderShareModel.make(source, language: language ?? vi, bankAccount: qr ? Self.vcb : nil, qrSwitchOn: qr, now: now)
    }

    // MARK: - Header

    func testPillTextPerStatus() {
        XCTAssertEqual(model(Self.rent(status: .reserved)).pill, "Chờ giao đồ")
        XCTAssertEqual(model(Self.rent(status: .pickuped)).pill, "Đang thuê")
        XCTAssertEqual(model(Self.rent(status: .returned)).pill, "Đã trả đồ")
        XCTAssertEqual(model(Self.rent(status: .cancelled)).pill, "Đã huỷ")
        XCTAssertEqual(model(Self.rent(status: .cancelled)).pillTone, .cancelled)
        XCTAssertEqual(model(Self.sale()).pill, "Đã thanh toán")
        XCTAssertEqual(model(Self.sale()).pillTone, .paid)
        XCTAssertEqual(model(Self.draft()).pill, "Chưa chốt")
        XCTAssertEqual(model(Self.draft()).pillTone, .draft)
    }

    func testHeaderLines() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.shopName, "Lan Anh Bridal")
        XCTAssertEqual(rent.outletLine, "Chi nhánh Quận 3 · 0901 234 567")
        XCTAssertEqual(rent.kindLine, "Đơn thuê")
        XCTAssertEqual(rent.title, "#482113")
        XCTAssertEqual(model(Self.sale()).kindLine, "Đơn bán · T4 07/10")
        let draft = model(Self.draft())
        XCTAssertEqual(draft.kindLine, "Đơn thuê · lập T4 07/10")
        XCTAssertEqual(draft.title, "Đơn nháp")
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
        XCTAssertEqual(strip, OrderShareModel.Strip(pickupLabel: "Nhận đồ", pickupDay: "T4 07/10", days: "10 ngày",
                                                    returnLabel: "Trả đồ", returnDay: "T6 16/10"))
        // 00:30 on 07/10 in Vietnam is still 06/10 in UTC: the strip shows the Vietnam day
        var early = Self.rent()
        early.pickup = Self.day("2026-10-07", hour: 0).addingTimeInterval(30 * 60)
        early.returnDate = Self.day("2026-10-07", hour: 23)
        XCTAssertEqual(model(early).strip?.pickupDay, "T4 07/10")
        XCTAssertEqual(model(early).strip?.days, "1 ngày", "a same-day rental is one day")
        XCTAssertEqual(model(early, en).strip?.days, "1 day")
        // The order's own duration wins, as on the detail screen
        var stored = Self.rent()
        stored.rentalDays = 3
        XCTAssertEqual(model(stored).strip?.days, "3 ngày")
        XCTAssertNil(model(Self.sale()).strip, "sales have no strip")
    }

    // MARK: - Items and totals

    func testItemLinesAndMoneyFormat() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.itemsHeader, "Đồ thuê · 3 món")
        XCTAssertEqual(rent.lines[2], OrderShareModel.Line(name: "Vương miện ngọc trai", detail: "2 × 75.000đ", amount: "150.000đ"))
        XCTAssertEqual(OrderShareModel.money(1_150_000), "1.150.000đ")
        XCTAssertEqual(OrderShareModel.money(0), "0đ")
        XCTAssertEqual(OrderShareModel.minus(300_000), "− 300.000đ")
        XCTAssertEqual(model(Self.sale()).itemsHeader, "Hàng mua · 2 món")
        // Same money format in English
        XCTAssertEqual(model(Self.rent(), en).lines[0].amount, "650.000đ")
    }

    func testRentTotalsKeepCollateralOutOfAmountDue() {
        let rent = model(Self.rent())
        XCTAssertEqual(rent.rows, [
            .init(label: "Tổng tiền thuê", value: "1.150.000đ"),
            .init(label: "Đã đặt cọc", value: "− 300.000đ"),
            .init(label: "Thế chân khi nhận đồ", value: "CCCD + 2.000.000đ"),
        ])
        XCTAssertEqual(rent.highlightLabel, "Còn phải trả")
        // Owner decision: total − deposit − hand-over payments; the 2.000.000đ collateral stays on its own row
        XCTAssertEqual(rent.highlightValue, "850.000đ")
        XCTAssertEqual(rent.highlight, .due)
        XCTAssertNil(rent.note)

        var bare = Self.rent()
        bare.deposit = 0
        bare.collateralPapers = nil
        bare.collateralMoney = 0
        XCTAssertEqual(model(bare).rows.map(\.label), ["Tổng tiền thuê"])
    }

    func testRentAmountDueRule() {
        let pickup = OrderPaymentLine(amount: 500_000, status: "COMPLETED", notes: "PICKUP")
        let pending = OrderPaymentLine(amount: 500_000, status: "PENDING", notes: "PICKUP")
        let due: (OrderStatus, [OrderPaymentLine]) -> Double = {
            OrderShareSource.amountDue(orderType: .rent, status: $0, total: 1_150_000, deposit: 300_000, payments: $1)
        }
        XCTAssertEqual(due(.reserved, []), 850_000)
        XCTAssertEqual(due(.reserved, [pickup]), 350_000)
        XCTAssertEqual(due(.reserved, [pending]), 850_000, "only completed payments count")
        XCTAssertEqual(due(.pickuped, [OrderPaymentLine(amount: 2_850_000, status: "COMPLETED", notes: "PICKUP")]), 0,
                       "a hand-over that also took the collateral never goes below 0")
        XCTAssertEqual(due(.reserved, [OrderPaymentLine(amount: 100_000, status: "COMPLETED", notes: "RETURN_ADJUSTMENT")]),
                       850_000, "return adjustments ignored")
        XCTAssertEqual(due(.returned, []), 0)
        XCTAssertEqual(due(.cancelled, []), 0)
        XCTAssertEqual(OrderShareSource.amountDue(orderType: .sale, status: .completed, total: 400_000, deposit: 0,
                                                  payments: [OrderPaymentLine(amount: 400_000, status: "COMPLETED", notes: "SALE")]),
                       400_000, "a sale keeps its total")
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
        // Same string as the web `generateVietQRString(info, 850000, "DH482113")` and the Android share image:
        // 01 = 12 (dynamic), 54 = the amount due, 62/08 = DH<number>
        XCTAssertEqual(qr.payload, "00020101021238570010A00000072701270006970436011300710012345670208QRIBFTTA530370454068500005802VN62120808DH4821136304E529")

        XCTAssertNil(OrderShareModel.make(Self.rent(), language: vi, bankAccount: Self.vcb, qrSwitchOn: false).qr, "switch off")
        XCTAssertNil(OrderShareModel.make(Self.rent(), language: vi, bankAccount: nil, qrSwitchOn: true).qr, "no account")
        XCTAssertNil(model(Self.draft(), qr: true).qr, "never on a draft")
        var unknownBank = Self.vcb
        unknownBank.bankName = "Ngân hàng Lạ"
        unknownBank.bankCode = "XYZ"
        XCTAssertNil(OrderShareModel.make(Self.rent(), language: vi, bankAccount: unknownBank, qrSwitchOn: true).qr)
    }

    func testQrWithoutAmountWhenNothingIsDue() throws {
        var returned = Self.rent(status: .returned)
        XCTAssertEqual(returned.amountDue, 0)
        returned.collateralMoney = 0
        let qr = try XCTUnwrap(model(returned, qr: true).qr)
        XCTAssertFalse(qr.payload.contains("530370454"), "no amount tag when nothing is due")
        XCTAssertTrue(qr.payload.hasPrefix("000201010212"), "dynamic: it carries a content")
        XCTAssertEqual(model(returned).highlightValue, "0đ")
        XCTAssertTrue(try XCTUnwrap(model(Self.sale(), qr: true).qr).payload.contains("5406400000"), "a sale: its total")
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
        XCTAssertEqual(rent.kindLine, "Rental order")
        XCTAssertEqual(rent.pill, "Awaiting pickup")
        XCTAssertEqual(rent.strip?.pickupDay, "Wed 07/10")
        XCTAssertEqual(rent.strip?.returnDay, "Fri 16/10")
        XCTAssertEqual(rent.strip?.days, "10 days")
        XCTAssertEqual(rent.highlightLabel, "Amount due")
        XCTAssertEqual(rent.customerLabel, "Customer")
        XCTAssertEqual(rent.qr?.content, "Reference: DH482113")
        XCTAssertEqual(model(Self.draft(), en).kindLine, "Rental order · made Wed 07/10")
        let labels = [rent.kindLine, rent.pill ?? "", rent.customerLabel, rent.itemsHeader, rent.highlightLabel,
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
}
