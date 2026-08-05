//
//  PurchasesManager.swift
//  POS ADBD
//
//  RevenueCat wrapper for MERCHANT subscription renewals (6m / 12m via StoreKit).
//  App User ID = merchant_{publicId} for webhook mapping to Subscription.
//

import Foundation
import RevenueCat

struct RenewPackageInfo {
    let productId: String
    let title: String
    let priceLabel: String
    /// Store price in currency major units.
    let priceAmount: Double
}

enum PurchasesManager {
    static let entitlementMerchant = "merchant_subscription"
    /// Must match App Store Connect + RevenueCat product identifiers.
    static let productSemiAnnual = "anyrent_merchant_semi_annual"
    static let productAnnual = "anyrent_merchant_annual"

    private static var configured = false
    /// Cached packages keyed by store product id (from last offerings fetch).
    private static var packageByProductId: [String: Package] = [:]

    static var isConfigured: Bool { configured }

    static func configure() {
        let apiKey = Bundle.main.object(forInfoDictionaryKey: "REVENUECAT_API_KEY") as? String
        let trimmed = apiKey?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else {
            NSLog("[PurchasesManager] REVENUECAT_API_KEY missing — Purchases not configured")
            return
        }
        guard !configured else { return }
        #if DEBUG
        Purchases.logLevel = .debug
        #else
        Purchases.logLevel = .info
        #endif
        Purchases.configure(withAPIKey: trimmed)
        configured = true
        NSLog("[PurchasesManager] RevenueCat configured")
        syncFromCurrentUser()
    }

    /// Call after login / cold start when User.account() exists.
    static func syncFromCurrentUser() {
        guard configured else { return }
        guard let user = User.account(),
              user.role == .merchant,
              let merchantId = user.merchantId,
              merchantId > 0 else {
            logOut()
            return
        }
        logInMerchant(merchantId: merchantId)
    }

    static func logInMerchant(merchantId: Int) {
        guard configured else { return }
        let appUserId = "merchant_\(merchantId)"
        Purchases.shared.logIn(appUserId) { customerInfo, created, error in
            if let error {
                NSLog("[PurchasesManager] logIn failed: \(error.localizedDescription)")
                return
            }
            let active = customerInfo?.entitlements.active.keys.joined(separator: ",") ?? ""
            NSLog("[PurchasesManager] logIn ok user=\(appUserId) created=\(created ?? false) active=\(active)")
        }
    }

    static func logOut() {
        guard configured else { return }
        guard !Purchases.shared.isAnonymous else { return }
        Purchases.shared.logOut { _, error in
            if let error {
                NSLog("[PurchasesManager] logOut failed: \(error.localizedDescription)")
            } else {
                NSLog("[PurchasesManager] logOut ok")
            }
        }
    }

    static func hasMerchantEntitlement(_ info: CustomerInfo) -> Bool {
        info.entitlements[entitlementMerchant]?.isActive == true
    }

    static func getRenewPackages(completion: @escaping ([RenewPackageInfo]?, Error?) -> Void) {
        guard configured else {
            completion(nil, NSError.errorWithOwnMessage(
                message: "Purchases not configured".localized(),
                domain: "PurchasesManager"
            ))
            return
        }
        Purchases.shared.getOfferings { offerings, error in
            if let error {
                NSLog("[PurchasesManager] getOfferings failed: \(error.localizedDescription)")
                completion(nil, error)
                return
            }
            var byId: [String: Package] = [:]
            if let current = offerings?.current {
                for pkg in current.availablePackages {
                    byId[pkg.storeProduct.productIdentifier] = pkg
                }
            }
            if let all = offerings?.all {
                for offering in all.values {
                    for pkg in offering.availablePackages {
                        if byId[pkg.storeProduct.productIdentifier] == nil {
                            byId[pkg.storeProduct.productIdentifier] = pkg
                        }
                    }
                }
            }
            packageByProductId = byId
            let ordered = [productSemiAnnual, productAnnual]
            let renew: [RenewPackageInfo] = ordered.compactMap { id in
                guard let pkg = byId[id] else { return nil }
                return RenewPackageInfo(
                    productId: id,
                    title: titleForProduct(id),
                    priceLabel: pkg.storeProduct.localizedPriceString,
                    priceAmount: (pkg.storeProduct.price as NSDecimalNumber).doubleValue
                )
            }
            completion(renew, nil)
        }
    }

    static func purchase(
        productId: String,
        completion: @escaping (CustomerInfo?, Error?, Bool) -> Void
    ) {
        guard configured else {
            completion(nil, NSError.errorWithOwnMessage(
                message: "Purchases not configured".localized(),
                domain: "PurchasesManager"
            ), false)
            return
        }
        guard let pkg = packageByProductId[productId] else {
            completion(nil, NSError.errorWithOwnMessage(
                message: "Package not found — refresh offerings first".localized(),
                domain: "PurchasesManager"
            ), false)
            return
        }
        Purchases.shared.purchase(package: pkg) { _, customerInfo, error, userCancelled in
            if userCancelled {
                completion(nil, nil, true)
                return
            }
            if let error {
                NSLog("[PurchasesManager] purchase failed: \(error.localizedDescription)")
                completion(nil, error, false)
                return
            }
            NSLog("[PurchasesManager] purchase ok active=\(customerInfo?.entitlements.active.keys.joined(separator: ",") ?? "")")
            completion(customerInfo, nil, false)
        }
    }

    static func restore(completion: @escaping (CustomerInfo?, Error?) -> Void) {
        guard configured else {
            completion(nil, NSError.errorWithOwnMessage(
                message: "Purchases not configured".localized(),
                domain: "PurchasesManager"
            ))
            return
        }
        Purchases.shared.restorePurchases { customerInfo, error in
            if let error {
                NSLog("[PurchasesManager] restore failed: \(error.localizedDescription)")
                completion(nil, error)
                return
            }
            NSLog("[PurchasesManager] restore ok")
            completion(customerInfo, nil)
        }
    }

    private static func titleForProduct(_ productId: String) -> String {
        switch productId {
        case productSemiAnnual: return "6 months".localized()
        case productAnnual: return "12 months".localized()
        default: return productId
        }
    }
}
