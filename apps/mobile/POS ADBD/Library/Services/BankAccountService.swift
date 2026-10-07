//
//  BankAccountService.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//
//  /api/merchants/{merchantId}/outlets/{outletId}/bank-accounts[/{id}]
//  #622: every call takes the outlet. A MERCHANT login has no outletId, so the screen passes the chosen outlet and
//  the bill passes the order's outlet; nil falls back to the user's own outlet.
//

import Alamofire
import Foundation

protocol BankAccountServiceProtocol {
    func getBankAccounts(outletId: Int?, completion: @escaping (_ bankAccounts: [BankAccount]?, _ error: NSError?) -> Void)
    func createBankAccount(outletId: Int?, withValues: [String: Any], completion: @escaping (_ bankAccount: BankAccount?, _ error: NSError?) -> Void)
    func updateBankAccount(outletId: Int?, bankAccountId: Int, withValues: [String: Any], completion: @escaping (_ bankAccount: BankAccount?, _ error: NSError?) -> Void)
    func deleteBankAccount(outletId: Int?, bankAccountId: Int, completion: @escaping (_ error: NSError?) -> Void)
}

class BankAccountService: BaseService, BankAccountServiceProtocol {
    static let shared = BankAccountService()

    /// Account printed on bills, per outlet, for this app session (#622). Cleared by any write.
    private var printAccountCache: [Int: BankAccount?] = [:]

    // MARK: - Path

    private func basePath(outletId: Int?) -> String? {
        guard let user = User.account(), let merchantId = user.merchantId, let outlet = outletId ?? user.outletId else {
            return nil
        }
        return APIEndpoint.Path.bankAccounts(merchantId: merchantId, outletId: outlet)
    }

    private func missingScopeError() -> NSError {
        NSError.errorWithOwnMessage(message: "Merchant ID or Outlet ID not found".localized(), domain: "RC")
    }

    private func responseError(code: String?, message: String?, error: String?, defaultMessage: String) -> NSError {
        createErrorFromResponse(success: false, code: code, message: message, error: error,
                                httpStatusCode: nil, defaultMessage: defaultMessage)
    }

    // MARK: - Get Bank Accounts

    func getBankAccounts(outletId: Int?, completion: @escaping ([BankAccount]?, NSError?) -> Void) {
        guard let path = basePath(outletId: outletId) else {
            DispatchQueue.main.async { completion(nil, self.missingScopeError()) }
            return
        }
        performGET(path: path, responseType: APIBankAccountsResponse.self, context: "BankAccountService.getBankAccounts") { response, error in
            let result: ([BankAccount]?, NSError?)
            if let error = error {
                result = (nil, error)
            } else if let response = response, response.success, let accounts = response.data {
                result = (accounts, nil)
            } else {
                result = (nil, self.responseError(code: response?.code, message: response?.message, error: response?.error,
                                                  defaultMessage: "Failed to load bank accounts"))
            }
            DispatchQueue.main.async { completion(result.0, result.1) }
        }
    }

    // MARK: - Create / Update / Delete

    func createBankAccount(outletId: Int?, withValues values: [String: Any], completion: @escaping (BankAccount?, NSError?) -> Void) {
        guard let path = basePath(outletId: outletId) else {
            DispatchQueue.main.async { completion(nil, self.missingScopeError()) }
            return
        }
        performPOST(path: path, parameters: values, responseType: APIBankAccountResponse.self,
                    context: "BankAccountService.createBankAccount") { response, error in
            self.finishWrite(response: response, error: error, defaultMessage: "Failed to create bank account", completion: completion)
        }
    }

    func updateBankAccount(outletId: Int?, bankAccountId: Int, withValues values: [String: Any], completion: @escaping (BankAccount?, NSError?) -> Void) {
        guard let path = basePath(outletId: outletId) else {
            DispatchQueue.main.async { completion(nil, self.missingScopeError()) }
            return
        }
        performPUT(path: "\(path)/\(bankAccountId)", parameters: values, responseType: APIBankAccountResponse.self,
                   context: "BankAccountService.updateBankAccount") { response, error in
            self.finishWrite(response: response, error: error, defaultMessage: "Failed to update bank account", completion: completion)
        }
    }

    func deleteBankAccount(outletId: Int?, bankAccountId: Int, completion: @escaping (NSError?) -> Void) {
        guard let path = basePath(outletId: outletId) else {
            DispatchQueue.main.async { completion(self.missingScopeError()) }
            return
        }
        // The API answers the soft-deleted account; only `success` matters here
        performDELETE(path: "\(path)/\(bankAccountId)", responseType: APIEmptyResponse.self,
                      context: "BankAccountService.deleteBankAccount") { response, error in
            self.clearPrintCache()
            let result: NSError?
            if let error = error {
                result = error
            } else if let response = response, response.success {
                result = nil
            } else {
                result = self.responseError(code: response?.code, message: response?.message, error: response?.error,
                                            defaultMessage: "Failed to delete bank account")
            }
            DispatchQueue.main.async { completion(result) }
        }
    }

    private func finishWrite(response: APIBankAccountResponse?, error: NSError?, defaultMessage: String,
                             completion: @escaping (BankAccount?, NSError?) -> Void) {
        clearPrintCache()
        let result: (BankAccount?, NSError?)
        if let error = error {
            result = (nil, error)
        } else if let response = response, response.success, let account = response.data {
            result = (account, nil)
        } else {
            result = (nil, responseError(code: response?.code, message: response?.message, error: response?.error,
                                         defaultMessage: defaultMessage))
        }
        DispatchQueue.main.async { completion(result.0, result.1) }
    }

    // MARK: - Bill (#622)

    func clearPrintCache() {
        DispatchQueue.main.async { self.printAccountCache.removeAll() }
    }

    /// The outlet's account to print on a bill (default, else first). Nil when there is none or the load fails;
    /// a failure is not cached so the next print tries again. Always answers on the main queue.
    func printAccount(outletId: Int, completion: @escaping (BankAccount?) -> Void) {
        if let cached = printAccountCache[outletId] {
            completion(cached)
            return
        }
        getBankAccounts(outletId: outletId) { [weak self] accounts, error in
            guard let accounts = accounts, error == nil else {
                completion(nil)
                return
            }
            let account = BillBankQR.pick(accounts)
            self?.printAccountCache[outletId] = .some(account)
            completion(account)
        }
    }
}
