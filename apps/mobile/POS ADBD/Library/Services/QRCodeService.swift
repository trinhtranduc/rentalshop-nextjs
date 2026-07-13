//
//  QRCodeService.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import Alamofire

// MARK: - QR Code Response Models
struct QRCodeResponse: Codable {
    let success: Bool
    let data: QRCodeData?
    let code: String?
    let message: String?
    let error: String?
}

struct QRCodeData: Codable {
    let qrCodeString: String
    let bankAccount: QRCodeBankAccount
    let amount: Int
    let orderNumber: String
    let transferDescription: String?
    
    enum CodingKeys: String, CodingKey {
        case qrCodeString
        case bankAccount
        case amount
        case orderNumber
        case transferDescription
    }
}

struct QRCodeBankAccount: Codable {
    let id: Int
    let accountHolderName: String
    let accountNumber: String
    let bankName: String
    let bankCode: String?
    let branch: String?
}

// MARK: - QR Code Service
class QRCodeService: BaseService {
    static let shared = QRCodeService()
    
    private override init() {}
    
    /// Lấy QR code string cho order payment
    /// - Parameters:
    ///   - orderId: Order ID
    ///   - completion: Completion handler với QRCodeData hoặc Error
    func getQRCode(for orderId: Int, completion: @escaping (QRCodeData?, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.orders)/\(orderId)/qr-code"
        
        performGET(
            path: path,
            responseType: QRCodeResponse.self,
            context: "QRCodeService.getQRCode"
        ) { apiResponse, error in
            if let error = error {
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                DispatchQueue.main.async {
                    completion(nil, error)
                }
                return
            }
            
            if apiResponse.success, let qrData = apiResponse.data {
                print("✅ QR code loaded successfully for order \(orderId)")
                DispatchQueue.main.async {
                    completion(qrData, nil)
                }
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Failed to load QR code"
                )
                
                // Check for specific error: no bank account
                if apiResponse.code == "NO_BANK_ACCOUNT" || apiResponse.message?.contains("bank account") == true {
                    let error = NSError.errorWithOwnMessage(
                        message: "No default bank account found for this outlet".localized(),
                        domain: "RC"
                    )
                    DispatchQueue.main.async {
                        completion(nil, error)
                    }
                } else {
                    print("❌ QR code load failed: \(nsError.localizedDescription)")
                    DispatchQueue.main.async {
                        completion(nil, nsError)
                    }
                }
            }
        }
    }
}

