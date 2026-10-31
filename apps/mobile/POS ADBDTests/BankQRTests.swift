import CoreImage
import XCTest
@testable import POS_ADBD

/// #622: VietQR on printed bills and the bank accounts row in Settings
final class BankQRTests: XCTestCase {
    /// Produced by the web helper `generateVietQRString({bankName, bankCode, accountNumber, accountHolderName})`
    /// (packages/utils/src/core/bank-qr.ts), no amount. Same vectors in the Android `VietQrTest`.
    static let vectors: [(bankName: String, bankCode: String?, account: String, holder: String, expected: String)] = [
        ("Vietcombank", "VCB", "0123456789", "NGUYEN VAN A",
         "00020101021138540010A00000072701240006970436011001234567890208QRIBFTTA53037045802VN63046A15"),
        ("Techcombank", "TCB", "19036781234015", "TRAN THI B",
         "00020101021138580010A000000727012800069704070114190367812340150208QRIBFTTA53037045802VN63045B4B"),
        ("MBBank", "MB", "0901234567", "LE C",
         "00020101021138540010A00000072701240006970422011009012345670208QRIBFTTA53037045802VN63049779"),
    ]

    private func account(_ bankName: String, _ bankCode: String?, _ number: String, _ holder: String,
                         isDefault: Bool = false, isActive: Bool = true) -> BankAccount {
        var account = BankAccount(bankName: bankName, accountNumber: number, accountHolderName: holder, bankCode: bankCode)
        account.isDefault = isDefault
        account.isActive = isActive
        return account
    }

    private func order(type: String) throws -> Order {
        let status = type == "RENT" ? "RESERVED" : "COMPLETED"
        let json = #"{"id":7,"orderNumber":"123456","orderType":"\#(type)","status":"\#(status)","createdAt":"2026-10-05T03:00:00.000Z","updatedAt":"2026-10-05T03:00:00.000Z","customerName":"Lan","outletId":1,"outletName":"A","customerId":1,"createdById":1,"createdByName":"B","totalAmount":148000,"depositAmount":0,"amountDue":0,"refundDue":0,"orderItems":[{"id":1,"productId":7,"productName":"Ao dai","quantity":1,"unitPrice":148000,"totalPrice":148000}]}"#
        return try JSONDecoder.shared.decode(Order.self, from: Data(json.utf8))
    }

    // MARK: - VietQR string

    func testPayloadMatchesWebVectors() {
        for v in Self.vectors {
            XCTAssertEqual(VietQR.payload(for: account(v.bankName, v.bankCode, v.account, v.holder)), v.expected, v.bankName)
            // Same result when the app saved the BIN as bankCode (iOS bank picker) or saved no code (name only)
            let bin = VietnamBankCodes.bankCodes[v.bankName]
            XCTAssertEqual(VietQR.payload(for: account(v.bankName, bin, v.account, v.holder)), v.expected, v.bankName)
            XCTAssertEqual(VietQR.payload(for: account(v.bankName, nil, v.account, v.holder)), v.expected, v.bankName)
        }
    }

    func testCrcIsCcittFalse() {
        XCTAssertEqual(VietQR.crc16("123456789"), "29B1")
        // The CRC closes the payload: recomputing over everything before it gives the same 4 digits
        for v in Self.vectors {
            XCTAssertEqual(VietQR.crc16(String(v.expected.dropLast(4))), String(v.expected.suffix(4)))
        }
    }

    func testNoQrWithoutBinOrWithBadNumber() {
        XCTAssertNil(VietQR.bin(bankName: "Ngân hàng Lạ", bankCode: nil))
        XCTAssertNil(VietQR.payload(for: account("Ngân hàng Lạ", "XYZ", "0123456789", "A")))
        XCTAssertNil(VietQR.payload(for: account("Vietcombank", "VCB", "12345", "A")), "under 8 digits")
        XCTAssertNil(VietQR.payload(for: account("Vietcombank", "VCB", "0123-456789", "A")), "not digits")
    }

    func testPayloadDecodesFromRenderedQr() throws {
        let payload = Self.vectors[0].expected
        let filter = try XCTUnwrap(CIFilter(name: "CIQRCodeGenerator"))
        filter.setValue(Data(payload.utf8), forKey: "inputMessage")
        filter.setValue("M", forKey: "inputCorrectionLevel")
        let image = try XCTUnwrap(filter.outputImage).transformed(by: CGAffineTransform(scaleX: 8, y: 8))
        let detector = try XCTUnwrap(CIDetector(ofType: CIDetectorTypeQRCode, context: nil,
                                                options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]))
        let decoded = detector.features(in: image).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
        XCTAssertEqual(decoded, [payload])
    }

    // MARK: - ESC/POS bytes

    func testQrCommandStoresPayloadWithLength() {
        let payload = Self.vectors[1].expected
        let bytes = [UInt8](PrinterCommand.printQRCode(payload))
        XCTAssertEqual(Array(bytes[0..<9]), [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00], "model 2")
        XCTAssertEqual(Array(bytes[9..<17]), [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06], "module size 6")
        XCTAssertEqual(Array(bytes[17..<25]), [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31], "error correction M")
        let length = payload.utf8.count + 3
        XCTAssertEqual(Array(bytes[25..<33]), [0x1D, 0x28, 0x6B, UInt8(length & 0xFF), UInt8(length >> 8), 0x31, 0x50, 0x30])
        XCTAssertEqual(Array(bytes[33..<(33 + payload.utf8.count)]), Array(payload.utf8))
        XCTAssertEqual(Array(bytes.suffix(8)), [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30], "print")
    }

    func testSwitchOffKeepsBillBytesIdentical() throws {
        let vcb = account("Vietcombank", "VCB", "0123456789", "NGUYEN VAN A", isDefault: true)
        for type in ["RENT", "SALE"] {
            let order = try order(type: type)
            let before = order.toPrintData()
            XCTAssertEqual(BillBankQR.billData(for: order, switchOn: false, account: vcb), before, type)
            XCTAssertNil(before.range(of: Data("QRIBFTTA".utf8)), type)
            XCTAssertNil(before.range(of: Data([0x1D, 0x28, 0x6B])), type)
        }
    }

    func testNoAccountPrintsBillAsBefore() throws {
        for type in ["RENT", "SALE"] {
            let order = try order(type: type)
            XCTAssertEqual(BillBankQR.billData(for: order, switchOn: true, account: nil), order.toPrintData(), type)
        }
    }

    func testSwitchOnAddsBankBlockAndQrBeforeThankYou() throws {
        let vcb = account("Vietcombank", "VCB", "0123456789", "Nguyễn Văn A", isDefault: true)
        for type in ["RENT", "SALE"] {
            let order = try order(type: type)
            let before = order.toPrintData()
            let after = BillBankQR.billData(for: order, switchOn: true, account: vcb)
            let block = BillBankQR.printData(for: vcb)
            XCTAssertEqual(after.count, before.count + block.count, type)
            let qr = try XCTUnwrap(after.range(of: Data(Self.vectors[0].expected.utf8)), type)
            XCTAssertNotNil(after.range(of: Data("0123456789".utf8)), type)
            XCTAssertNotNil(after.range(of: Data("NGUYEN VAN A".utf8)), "holder printed in ASCII capitals")
            let thanks = Data("Thank you for shopping".localized().formatStringOriginalCharacter().uppercased().utf8)
            let thanksAt = try XCTUnwrap(after.range(of: thanks), type)
            XCTAssertLessThan(qr.upperBound, thanksAt.lowerBound, "QR before the thank-you line")
        }
    }

    func testBankWithoutBinPrintsTextOnly() {
        let odd = account("Ngân hàng Lạ", nil, "0123456789", "A")
        let block = BillBankQR.printData(for: odd)
        XCTAssertNotNil(block.range(of: Data("0123456789".utf8)))
        XCTAssertNil(block.range(of: Data([0x1D, 0x28, 0x6B])))
    }

    func testPickDefaultElseFirstActive() {
        let a = account("ACB", nil, "11111111", "A")
        let b = account("BIDV", nil, "22222222", "B", isDefault: true)
        let gone = account("VIB", nil, "33333333", "C", isDefault: true, isActive: false)
        XCTAssertEqual(BillBankQR.pick([a, b])?.accountNumber, "22222222")
        XCTAssertEqual(BillBankQR.pick([gone, a])?.accountNumber, "11111111")
        XCTAssertNil(BillBankQR.pick([]))
        XCTAssertNil(BillBankQR.pick([gone]))
    }

    // MARK: - Settings row

    /// #1270: the bank accounts line is a row of CỬA HÀNG for owners and outlet admins only
    func testBankAccountsRowForOwnersAndOutletAdminsOnly() {
        for role: Role in [.merchant, .outletAdmin] {
            XCTAssertTrue(SettingsV2Logic.sections(role: role, permissions: [], hasPlan: false)[0].items.contains(.bankAccounts), "\(role)")
        }
        for role: Role in [.outletStaff, .outletInventory] {
            XCTAssertFalse(SettingsV2Logic.sections(role: role, permissions: [], hasPlan: false).flatMap(\.items).contains(.bankAccounts), "\(role)")
        }
    }

    /// #1319: the outlet admin sees the row and the list; only the shop owner adds, edits, deletes, sets the default
    func testOnlyTheOwnerManagesBankAccounts() {
        XCTAssertTrue(SettingsV2Logic.canManageBankAccounts(role: .merchant))
        for role: Role in [.outletAdmin, .outletStaff, .outletInventory] {
            XCTAssertFalse(SettingsV2Logic.canManageBankAccounts(role: role), "\(role)")
        }
        for role: Role in [.merchant, .outletAdmin] {
            XCTAssertTrue(SettingsV2Logic.canViewBankAccounts(role: role), "\(role)")
        }
        for role: Role in [.outletStaff, .outletInventory] {
            XCTAssertFalse(SettingsV2Logic.canViewBankAccounts(role: role), "\(role)")
        }
    }

    /// #1319: the empty list tells the outlet admin who adds an account, not "Tap +"
    func testEmptyTextPerRole() {
        XCTAssertEqual(SettingsV2Logic.bankAccountsEmptyKey(canManage: true), "bankAccounts.empty")
        XCTAssertEqual(SettingsV2Logic.bankAccountsEmptyKey(canManage: false), "bankAccounts.emptyReadOnly")
    }

    func testNewStringsExistInBothLanguages() throws {
        let keys = ["bankAccounts.empty", "bankAccounts.emptyReadOnly", "printer.bankQr.title", "printer.bankQr.hint", "bill.bankQr.title", "bill.bankQr.accountNumber"]
        for language in ["en", "vi-VN"] {
            let bundle = try XCTUnwrap(Bundle(path: try XCTUnwrap(Bundle.main.path(forResource: language, ofType: "lproj"))))
            for key in keys {
                XCTAssertNotEqual(bundle.localizedString(forKey: key, value: "∅", table: nil), "∅", "\(language): \(key)")
            }
        }
    }
}

/// #1308: the bill's note and bank QR come from the order's own outlet (server), not from the device
final class OutletPrintSettingsTests: XCTestCase {
    private let merchant = #""merchant":{"id":1,"name":"Shop","email":"a@b.c","phone":"1","address":"1","city":"A","state":"B","zipCode":"1","country":"VN","businessType":"EQUIPMENT","pricingType":"DAILY","taxId":"1","currency":"VND"}"#

    private func outlet(_ extra: String) throws -> OutletDetail {
        let json = #"{"id":1,"name":"Main","address":"1","phone":"1","city":"A","state":"B","zipCode":"1","country":"VN","isActive":true,\#(extra)\#(merchant)}"#
        return try JSONDecoder.shared.decode(OutletDetail.self, from: Data(json.utf8))
    }

    // MARK: - Model

    func testOutletDetailReadsPrintNoteAndQr() throws {
        let detail = try outlet(#""printNote":"Mang CCCD","printBankQr":true,"#)
        XCTAssertEqual(detail.printNote, "Mang CCCD")
        XCTAssertEqual(detail.printBankQr, true)
    }

    func testOutletDetailWithoutTheFieldsStillDecodes() throws {
        let detail = try outlet("")
        XCTAssertNil(detail.printNote)
        XCTAssertNil(detail.printBankQr)
    }

    // MARK: - Note

    func testNoteIsTheServerNote() {
        XCTAssertEqual(OutletPrintSettings.note(serverNote: "Mang CCCD"), "Mang CCCD")
    }

    func testBlankOrMissingServerNoteIsNoNoteNotTheOldDefault() {
        XCTAssertNil(OutletPrintSettings.note(serverNote: nil))
        XCTAssertNil(OutletPrintSettings.note(serverNote: ""))
        XCTAssertNil(OutletPrintSettings.note(serverNote: "  \n "))
    }

    // MARK: - QR

    func testQrFollowsTheOutletSwitch() {
        XCTAssertTrue(OutletPrintSettings.printsBankQr(true))
        XCTAssertFalse(OutletPrintSettings.printsBankQr(false))
        XCTAssertFalse(OutletPrintSettings.printsBankQr(nil))
    }

    // MARK: - Roles

    func testOnlyOwnerEdits() {
        XCTAssertTrue(OutletPrintSettings.canEdit(role: .merchant))
        XCTAssertFalse(OutletPrintSettings.canEdit(role: .outletAdmin))
        XCTAssertFalse(OutletPrintSettings.canEdit(role: .outletStaff))
        XCTAssertFalse(OutletPrintSettings.canEdit(role: .outletInventory))
        XCTAssertFalse(OutletPrintSettings.canEdit(role: nil))
    }

    // MARK: - Pre-fill

    func testOwnerGetsTheOldDeviceNoteWhenTheServerHasNone() {
        XCTAssertEqual(OutletPrintSettings.prefillNote(serverNote: nil, legacyNote: "Cũ", canEdit: true), "Cũ")
        XCTAssertEqual(OutletPrintSettings.prefillNote(serverNote: " ", legacyNote: "Cũ", canEdit: true), "Cũ")
    }

    func testServerNoteWinsAndStaffNeverSeeTheDeviceNote() {
        XCTAssertEqual(OutletPrintSettings.prefillNote(serverNote: "Máy chủ", legacyNote: "Cũ", canEdit: true), "Máy chủ")
        XCTAssertEqual(OutletPrintSettings.prefillNote(serverNote: nil, legacyNote: "Cũ", canEdit: false), "")
        XCTAssertEqual(OutletPrintSettings.prefillNote(serverNote: nil, legacyNote: nil, canEdit: true), "")
        XCTAssertEqual(OutletPrintSettings.prefillNote(serverNote: nil, legacyNote: "  ", canEdit: true), "")
    }

    // MARK: - Branch

    func testBranchOwnThenCurrentThenDefaultThenFirst() {
        let list: [(id: Int, isDefault: Bool)] = [(1, false), (2, true), (3, false)]
        XCTAssertEqual(OutletPrintSettings.initialOutletId(own: 3, current: 1, outlets: list), 3)
        XCTAssertEqual(OutletPrintSettings.initialOutletId(own: nil, current: 1, outlets: list), 1)
        XCTAssertEqual(OutletPrintSettings.initialOutletId(own: nil, current: 9, outlets: list), 2)
        XCTAssertEqual(OutletPrintSettings.initialOutletId(own: nil, current: nil, outlets: [(5, false), (6, false)]), 5)
        XCTAssertNil(OutletPrintSettings.initialOutletId(own: nil, current: nil, outlets: []))
    }
}
