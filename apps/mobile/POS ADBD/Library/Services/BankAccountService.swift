//
//  BankAccountService.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Alamofire
import Foundation

protocol BankAccountServiceProtocol {
    func getBankAccounts(completion: @escaping (_ bankAccounts: [BankAccount]?, _ error: NSError?) -> Void)
    func createBankAccount(withValues: [String: Any], completion: @escaping (_ bankAccount: BankAccount?, _ error: NSError?) -> Void)
    func updateBankAccount(bankAccountId: Int, withValues: [String: Any], completion: @escaping (_ bankAccount: BankAccount?, _ error: NSError?) -> Void)
    func deleteBankAccount(bankAccountId: Int, completion: @escaping (_ error: NSError?) -> Void)
}

class BankAccountService: BaseService, BankAccountServiceProtocol {
    static let shared = BankAccountService()
    
    // MARK: - Get Bank Accounts
    func getBankAccounts(completion: @escaping ([BankAccount]?, NSError?) -> Void) {
        // Get merchantId and outletId from current user
        guard let user = User.account(),
              let merchantId = user.merchantId,
              let outletId = user.outletId else {
            let error = NSError.errorWithOwnMessage(
                message: "Merchant ID or Outlet ID not found".localized(),
                domain: "RC"
            )
            DispatchQueue.main.async {
                completion(nil, error)
            }
            return
        }
        
        let path = APIEndpoint.Path.bankAccounts(merchantId: merchantId, outletId: outletId)
        
        performGET(
            path: path,
            responseType: APIBankAccountsResponse.self,
            context: "BankAccountService.getBankAccounts"
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
            
            if apiResponse.success, let bankAccounts = apiResponse.data {
                print("✅ Bank accounts loaded successfully: \(bankAccounts.count) accounts")
                DispatchQueue.main.async {
                    completion(bankAccounts, nil)
                }
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Failed to load bank accounts"
                )
                print("❌ Bank accounts load failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    // MARK: - Create Bank Account
    func createBankAccount(withValues values: [String: Any], completion: @escaping (BankAccount?, NSError?) -> Void) {
        // Get merchantId and outletId from current user
        guard let user = User.account(),
              let merchantId = user.merchantId,
              let outletId = user.outletId else {
            let error = NSError.errorWithOwnMessage(
                message: "Merchant ID or Outlet ID not found".localized(),
                domain: "RC"
            )
            DispatchQueue.main.async {
                completion(nil, error)
            }
            return
        }
        
        let path = APIEndpoint.Path.bankAccounts(merchantId: merchantId, outletId: outletId)
        
        performPOST(
            path: path,
            parameters: values,
            responseType: APIBankAccountResponse.self,
            context: "BankAccountService.createBankAccount"
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
            
            if apiResponse.success, let bankAccount = apiResponse.data {
                print("✅ Bank account created successfully")
                DispatchQueue.main.async {
                    completion(bankAccount, nil)
                }
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Failed to create bank account"
                )
                print("❌ Bank account creation failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    // MARK: - Update Bank Account
    func updateBankAccount(bankAccountId: Int, withValues values: [String: Any], completion: @escaping (BankAccount?, NSError?) -> Void) {
        // Get merchantId and outletId from current user
        guard let user = User.account(),
              let merchantId = user.merchantId,
              let outletId = user.outletId else {
            let error = NSError.errorWithOwnMessage(
                message: "Merchant ID or Outlet ID not found".localized(),
                domain: "RC"
            )
            DispatchQueue.main.async {
                completion(nil, error)
            }
            return
        }
        
        let path = "\(APIEndpoint.Path.bankAccounts(merchantId: merchantId, outletId: outletId))/\(bankAccountId)"
        
        performPUT(
            path: path,
            parameters: values,
            responseType: APIBankAccountResponse.self,
            context: "BankAccountService.updateBankAccount"
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
            
            if apiResponse.success, let bankAccount = apiResponse.data {
                print("✅ Bank account updated successfully")
                DispatchQueue.main.async {
                    completion(bankAccount, nil)
                }
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Failed to update bank account"
                )
                print("❌ Bank account update failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nil, nsError)
                }
            }
        }
    }
    
    // MARK: - Delete Bank Account
    func deleteBankAccount(bankAccountId: Int, completion: @escaping (NSError?) -> Void) {
        // Get merchantId and outletId from current user
        guard let user = User.account(),
              let merchantId = user.merchantId,
              let outletId = user.outletId else {
            let error = NSError.errorWithOwnMessage(
                message: "Merchant ID or Outlet ID not found".localized(),
                domain: "RC"
            )
            DispatchQueue.main.async {
                completion(error)
            }
            return
        }
        
        let path = "\(APIEndpoint.Path.bankAccounts(merchantId: merchantId, outletId: outletId))/\(bankAccountId)"
        
        performDELETE(
            path: path,
            responseType: APIEmptyResponse.self,
            context: "BankAccountService.deleteBankAccount"
        ) { apiResponse, error in
            if let error = error {
                DispatchQueue.main.async {
                    completion(error)
                }
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                DispatchQueue.main.async {
                    completion(error)
                }
                return
            }
            
            if apiResponse.success {
                print("✅ Bank account deleted successfully")
                DispatchQueue.main.async {
                    completion(nil)
                }
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse.success,
                    code: apiResponse.code,
                    message: apiResponse.message,
                    error: apiResponse.error,
                    httpStatusCode: nil,
                    defaultMessage: "Failed to delete bank account"
                )
                print("❌ Bank account deletion failed: \(nsError.localizedDescription)")
                DispatchQueue.main.async {
                    completion(nsError)
                }
            }
        }
    }
}

