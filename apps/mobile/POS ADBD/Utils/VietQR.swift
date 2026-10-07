//
//  VietQR.swift
//  POS ADBD
//
//  #622: VietQR (EMV QR, NAPAS) string of a bank account, built on the device. The stored `qrCode` of a bank
//  account (`acc|name|code`) cannot be scanned by banking apps; this string can. Same output as the web
//  `generateVietQRString(info)` in packages/utils/src/core/bank-qr.ts without amount or description.
//

import Foundation

enum VietQR {
    /// Bank code -> BIN. Same table as web `VIETNAM_BANK_BIN_CODES`.
    static let binByBankCode: [String: String] = [
        "VCB": "970436", "CTG": "970415", "ICB": "970415", "BID": "970418", "BIDV": "970418",
        "TCB": "970407", "ACB": "970416", "VPB": "970432", "VPBank": "970432", "MBB": "970422",
        "MB": "970422", "TPB": "970423", "TPBank": "970423", "VAB": "970427", "SHB": "970443",
        "HDB": "970437", "HDBank": "970437", "MSB": "970426", "STB": "970403", "STP": "970403",
        "EIB": "970431", "VIB": "970441", "OCB": "970448", "SSB": "970440", "SEAB": "970440",
        "PGB": "970430", "NAB": "970428", "BAB": "970409", "ABB": "970425", "VCC": "970433",
        "VIETBANK": "970433", "PVC": "970412", "PVCB": "970412", "GPB": "970408", "VBA": "970405",
        "LPB": "970449", "DAB": "970406", "DOB": "970406", "KLB": "970452", "NCB": "970419",
        "OCE": "970410", "PBV": "970439", "PBVN": "970439", "SCB": "970429", "VCCB": "970454",
        "VNB": "970433", "SGICB": "970400", "SCVN": "970410", "VRB": "970421", "SHBVN": "970424",
        "IVB": "970434", "BVB": "970438", "CBB": "970444", "COOPBANK": "970446", "HLBVN": "970442",
        "WVN": "970457", "UOB": "970458", "CIMB": "970459", "KBHN": "970462", "KBHCM": "970463",
        "SINOPAC": "970465", "KEBHANAHCM": "970466", "KEBHANAHN": "970467", "IBKHN": "970455",
        "IBKHCM": "970456",
    ]

    /// BIN of an account, looked up like the web (`getBankBINCode`): bank code first, then bank name. The apps
    /// save the BIN itself as `bankCode` (bank picker), so a known 6-digit BIN is accepted as is.
    static func bin(bankName: String?, bankCode: String?) -> String? {
        let code = bankCode?.trimmingCharacters(in: .whitespaces) ?? ""
        if let bin = binByBankCode[code] { return bin }
        if let name = bankName?.trimmingCharacters(in: .whitespaces), let bin = VietnamBankCodes.bankCodes[name] {
            return bin
        }
        let knownBins = Set(VietnamBankCodes.bankCodes.values).union(binByBankCode.values)
        return knownBins.contains(code) ? code : nil
    }

    /// EMV string for an account, or nil when the bank has no BIN or the number is not 8-16 digits (web rules)
    static func payload(for account: BankAccount) -> String? {
        let number = account.accountNumber.trimmingCharacters(in: .whitespaces)
        guard let bin = bin(bankName: account.bankName, bankCode: account.bankCode),
              number.count >= 8, number.count <= 16, number.allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
        return payload(bin: bin, accountNumber: number)
    }

    /// Static VietQR (no amount): 00 01 · 01 11 · 38 {00 GUID · 01 {00 BIN · 01 account} · 02 QRIBFTTA} · 53 704 · 58 VN · 63 CRC
    static func payload(bin: String, accountNumber: String) -> String {
        let beneficiary = tlv("00", bin) + tlv("01", accountNumber)
        let merchant = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA")
        let body = tlv("00", "01") + tlv("01", "11") + tlv("38", merchant) + tlv("53", "704") + tlv("58", "VN") + "6304"
        return body + crc16(body)
    }

    /// #640 share image: the bill's VietQR of `account` plus the amount (54, when > 0) and the transfer content
    /// (62/08, ASCII), as the web `generateVietQRString(info, amount, description)`; dynamic (01 = 12) when either
    /// is set. Nil under the same rules as `payload(for:)`. Same output as the Android `VietQr.payload(account, …)`.
    static func payload(for account: BankAccount, amount: Double, content: String?) -> String? {
        guard payload(for: account) != nil, let bin = bin(bankName: account.bankName, bankCode: account.bankCode) else { return nil }
        let number = account.accountNumber.trimmingCharacters(in: .whitespaces)
        let rounded = Int64(amount.rounded())
        let text = content.map(ascii).flatMap { $0.isEmpty ? nil : $0 }
        guard rounded > 0 || text != nil else { return payload(bin: bin, accountNumber: number) }
        let beneficiary = tlv("00", bin) + tlv("01", number)
        let merchant = tlv("00", "A000000727") + tlv("01", beneficiary) + tlv("02", "QRIBFTTA")
        var body = tlv("00", "01") + tlv("01", "12") + tlv("38", merchant) + tlv("53", "704")
        if rounded > 0 { body += tlv("54", String(rounded)) }
        body += tlv("58", "VN")
        if let text { body += tlv("62", tlv("08", text)) }
        body += "6304"
        return body + crc16(body)
    }

    /// Accents removed (đ → d), ASCII only, as the web `convertToASCII`
    static func ascii(_ text: String) -> String {
        let plain = text.replacingOccurrences(of: "đ", with: "d").replacingOccurrences(of: "Đ", with: "D")
            .folding(options: .diacriticInsensitive, locale: Locale(identifier: "en_US_POSIX"))
        return String(plain.unicodeScalars.filter { $0.value >= 32 && $0.value <= 126 }.map(Character.init))
            .trimmingCharacters(in: .whitespaces)
    }

    static func tlv(_ tag: String, _ value: String) -> String {
        tag + String(format: "%02d", value.utf8.count) + value
    }

    /// CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF), 4 uppercase hex digits
    static func crc16(_ text: String) -> String {
        var crc: UInt16 = 0xFFFF
        for byte in text.utf8 {
            crc ^= UInt16(byte) << 8
            for _ in 0..<8 {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1
            }
        }
        return String(format: "%04X", crc)
    }
}

/// #622: bank transfer block at the end of a printed bill (per-device switch in printer settings)
enum BillBankQR {
    /// The account to print: the default active one, else the first active one
    static func pick(_ accounts: [BankAccount]) -> BankAccount? {
        let active = accounts.filter { $0.isActive ?? true }
        return active.first { $0.isDefault == true } ?? active.first
    }

    /// Bytes sent to the printer: the bank block only when the device switch is on and an account was found
    static func billData(for order: Order, switchOn: Bool, account: BankAccount?) -> Data {
        order.toPrintData(bankAccount: switchOn ? account : nil)
    }

    /// Centered: title, bank name, account number, holder name, then the VietQR (only when the bank has a BIN)
    static func printData(for account: BankAccount) -> Data {
        func line(_ text: String) -> Data { ("\(text.formatStringOriginalCharacter())\n").data(using: .utf8) ?? Data() }
        var data = Data()
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.center.rawValue))
        data.append(line("------------------------------------------------"))
        data.append(PrinterCommand.selectOrCancleBoldModel(1))
        data.append(line("bill.bankQr.title".localized()))
        data.append(PrinterCommand.selectOrCancleBoldModel(0))
        data.append(line(account.bankName))
        data.append(line(String(format: "bill.bankQr.accountNumber".localized(), account.accountNumber)))
        data.append(line(account.accountHolderName.uppercased()))
        if let payload = VietQR.payload(for: account) {
            data.append(PrinterCommand.printQRCode(payload))
            data.append(line(""))
        }
        data.append(PrinterCommand.selectAlignment(PrinterCommand.Alignment.left.rawValue))
        return data
    }
}
