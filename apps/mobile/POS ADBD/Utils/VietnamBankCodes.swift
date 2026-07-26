//
//  VietnamBankCodes.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

/// Vietnam bank codes mapping (Bank Name -> BIN Code)
/// BIN codes are 6-digit codes used for VietQR generation
/// Based on official bank list from State Bank of Vietnam
struct VietnamBankCodes {
    static let bankCodes: [String: String] = [
        // Major banks
        "Vietcombank": "970436", // VCB - TMCP Ngoại thương Việt Nam
        "Vietinbank": "970415", // ICB - TMCP Công thương Việt Nam
        "BIDV": "970418", // BIDV - Đầu tư và Phát triển Việt Nam
        "Techcombank": "970407", // TCB - TMCP Kỹ thương
        "ACB": "970416", // ACB - TMCP Á Châu
        "VPBank": "970432", // VPB - TMCP Việt Nam Thịnh Vượng
        "MBBank": "970422", // MB - TMCP Quân Đội
        "TPBank": "970423", // TPB - TMCP Tiên Phong
        "VietABank": "970427", // VAB - TMCP Việt Á
        "SHB": "970443", // SHB - TMCP Sài Gòn – Hà Nội
        "HDBank": "970437", // HDB - TMCP Phát triển TP.HCM
        "MSB": "970426", // MSB - TMCP Hàng Hải
        "Sacombank": "970403", // STP - TMCP Sài Gòn Thương tín
        "Eximbank": "970431", // EIB - TMCP Xuất Nhập khẩu Việt Nam
        "VIB": "970441", // VIB - TMCP Quốc Tế Việt Nam
        "OCB": "970448", // OCB - TMCP Phương Đông
        "SeABank": "970440", // SEAB - TMCP Đông Nam Á
        "PGBank": "970430", // PGB - TMCP Xăng dầu Petrolimex
        "NamABank": "970428", // NAB - TMCP Nam Á
        "BacABank": "970409", // BAB - TMCP Bắc Á
        "ABBank": "970425", // ABB - TMCP An Bình
        "VietBank": "970433", // VIETBANK - TMCP Việt Nam Thương Tín
        "PVcomBank": "970412", // PVCB - TMCP Đại chúng Việt Nam
        "GPBank": "970408", // GPB - Thương mại TNHH MTV Dầu Khí Toàn Cầu
        "Agribank": "970405", // VBA - Nông nghiệp và Phát triển Nông thôn Việt Nam
        "LienVietPostBank": "970449", // LPB - TMCP Bưu điện Liên Việt
        "DongABank": "970406", // DOB - TMCP Đông Á
        "KienLongBank": "970452", // KLB - TMCP Kiên Long
        "NCB": "970419", // NCB - TMCP Quốc dân
        "OceanBank": "970410", // Oceanbank - TNHH MTV Đại Dương
        "PublicBank": "970439", // PBVN - liên doanh VID PUBLIC BANK
        "SCB": "970429", // SCB - TMCP Sài Gòn
        "VietCapitalBank": "970454", // VCCB - TMCP Bản Việt
        "VietnamBank": "970433", // VIETBANK - TMCP Việt Nam Thương Tín
        
        // Additional banks
        "SaigonBank": "970400", // SGICB - TMCP Sài Gòn Công thương
        "StandardChartered": "970410", // SCVN - TNHH MTV Standard Chartered
        "VRBank": "970421", // VRB - liên doanh Việt Nga
        "ShinhanBank": "970424", // SHBVN - TNHH MTV Shinhan Việt Nam
        "IndovinaBank": "970434", // IVB - TNHH Indovina
        "BaoVietBank": "970438", // BVB - TMCP Bảo Việt
        "CBBank": "970444", // CBB - Thương mại TNHH MTV Xây dựng Việt Nam
        "COOPBANK": "970446", // COOPBANK - Hợp tác xã Việt Nam
        "HongLeong": "970442", // HLBVN - TNHH MTV Hong Leong Việt Nam
        "Woori": "970457", // WVN - Ngân hàng TNHH Một Thành Viên Woori Bank Việt Nam
        "UnitedOverseas": "970458", // UOB - Ngân hàng TNHH Một Thành Viên UOB Việt Nam
        "CIMBBank": "970459", // CIMB - Ngân hàng TNHH Một Thành Viên CIMB Việt Nam
        "KookminHN": "970462", // KBHN - Ngân hàng Kookmin - Chi nhánh Hà Nội
        "KookminHCM": "970463", // KBHCM - Ngân hàng Kookmin - Chi nhánh Tp. Hồ Chí Minh
        "SINOPAC": "970465", // SINOPAC - Ngân hàng SINOPAC - Chi nhánh Tp. Hồ Chí Minh
        "KEBHanaHCM": "970466", // KEBHANAHCM - Ngân hàng KEB HANA - Chi nhánh Tp. Hồ Chí Minh
        "KEBHANAHN": "970467", // KEBHANAHN - Ngân hàng KEB HANA - Chi nhánh Hà Nội
        "IBKHN": "970455", // IBKHN - Công nghiệp Hàn Quốc - Chi nhánh Hà Nội
        "IBKHCM": "970456" // IBKHCM - Industrial Bank of Korea - Chi nhánh Hồ Chí Minh
    ]
    
    /// Get bank code (BIN) from bank name
    static func getBankCode(for bankName: String) -> String? {
        return bankCodes[bankName]
    }
    
    /// Get all bank names sorted alphabetically
    static func getAllBankNames() -> [String] {
        return Array(bankCodes.keys).sorted()
    }
    
    /// Get bank name from bank code (reverse lookup)
    static func getBankName(for bankCode: String) -> String? {
        return bankCodes.first(where: { $0.value == bankCode })?.key
    }
}

