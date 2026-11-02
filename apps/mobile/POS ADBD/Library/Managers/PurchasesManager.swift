//
//  PurchasesManager.swift
//  POS ADBD
//
//  RevenueCat wrapper for the owner's plan (#1459: Basic and Professional, 6 / 12 months via StoreKit).
//  App User ID = merchant_{merchantId} so the RevenueCat webhook maps the purchase to the shop's Subscription.
//  Products come from the server (`storeProductIds` of GET /api/plans); prices from the store, never from the app.
//
//  e2e runs (#1459): the hosted test PlanRenewalHostedE2ETests opens an SKTestSession in the app process (storefront VNM)
//  and sets `E2EStoreKit.isActive`; the app then buys through StoreKit directly and the test sends the RevenueCat webhook
//  to the local API. Nothing in the app turns it on.
//

import Foundation
import RevenueCat
import StoreKit
import UIKit

/// Outcome of a store purchase or restore, as the plan screen needs it
enum PlanStoreResult {
    case purchased
    case cancelled
    case failed(String)
}

enum PurchasesManager {
    static let entitlementMerchant = "merchant_subscription"
    /// Basic (already on the stores) and Professional (#1459). Must match App Store Connect, Google Play and RevenueCat.
    static let productSemiAnnual = "anyrent_merchant_semi_annual"
    static let productAnnual = "anyrent_merchant_annual"
    static let productProfessionalSemiAnnual = "anyrent_professional_semi_annual"
    static let productProfessionalAnnual = "anyrent_professional_annual"

    private static var configured = false
    /// Products from the last fetch, by store product id
    private static var productsById: [String: StoreProduct] = [:]

    /// The store can sell: RevenueCat is configured, or a DEBUG e2e StoreKit session is on
    static var isConfigured: Bool { configured || E2EStoreKit.isActive }

    static func configure() {
        let apiKey = Bundle.main.object(forInfoDictionaryKey: "REVENUECAT_API_KEY") as? String
        let trimmed = apiKey?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !trimmed.isEmpty, !trimmed.hasPrefix("$(") else {
            NSLog("[PurchasesManager] REVENUECAT_API_KEY missing — Purchases not configured")
            return
        }
        guard !configured, !E2EStoreKit.isActive else { return }
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
            NSLog("[PurchasesManager] logIn ok user=\(appUserId) created=\(created) active=\(active)")
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

    // MARK: - Products

    /// Store products for these ids, in the store's currency. An empty list when the store is not set up.
    static func products(ids: [String], completion: @escaping ([PlanStoreProduct]) -> Void) {
        let unique = Array(Set(ids.compactMap { PlanRenewalLogic.baseProductId($0) }))
        guard !unique.isEmpty else { return completion([]) }
        if E2EStoreKit.isActive {
            E2EStoreKit.products(ids: unique, completion: completion)
            return
        }
        guard configured else { return completion([]) }
        Purchases.shared.getProducts(unique) { products in
            for product in products { productsById[product.productIdentifier] = product }
            NSLog("[PurchasesManager] products: \(products.map { "\($0.productIdentifier)=\($0.localizedPriceString)" })")
            let list = products.map { product -> PlanStoreProduct in
                let formatter = product.priceFormatter
                return PlanStoreProduct(
                    productId: product.productIdentifier,
                    priceText: product.localizedPriceString,
                    price: product.price,
                    currencyCode: product.currencyCode,
                    format: { amount in formatter?.string(from: amount as NSDecimalNumber) ?? "\(amount)" }
                )
            }
            DispatchQueue.main.async { completion(list) }
        }
    }

    /// Buys one product. Within the App Store subscription group, Basic → Professional is an upgrade Apple applies at once.
    static func purchase(productId: String, completion: @escaping (PlanStoreResult) -> Void) {
        if E2EStoreKit.isActive {
            E2EStoreKit.purchase(productId: productId, completion: completion)
            return
        }
        guard configured, let product = productsById[productId] else {
            return completion(.failed("plan.storeUnavailable".localized()))
        }
        Purchases.shared.purchase(product: product) { _, customerInfo, error, userCancelled in
            DispatchQueue.main.async {
                if userCancelled { return completion(.cancelled) }
                if let error {
                    NSLog("[PurchasesManager] purchase failed: \(error.localizedDescription)")
                    return completion(.failed(error.localizedDescription))
                }
                NSLog("[PurchasesManager] purchase ok active=\(customerInfo?.entitlements.active.keys.joined(separator: ",") ?? "")")
                completion(.purchased)
            }
        }
    }

    /// Restore: `.purchased` when an AnyRent subscription is active again, `.cancelled` when there is none to restore
    static func restore(completion: @escaping (PlanStoreResult) -> Void) {
        if E2EStoreKit.isActive {
            E2EStoreKit.restore(completion: completion)
            return
        }
        guard configured else { return completion(.failed("plan.storeUnavailable".localized())) }
        Purchases.shared.restorePurchases { customerInfo, error in
            DispatchQueue.main.async {
                if let error {
                    NSLog("[PurchasesManager] restore failed: \(error.localizedDescription)")
                    return completion(.failed(error.localizedDescription))
                }
                completion(customerInfo.map(hasMerchantEntitlement) == true ? .purchased : .cancelled)
            }
        }
    }

    /// Apple's own subscription management sheet (cancel, change plan); the account page when it cannot show
    static func showManageSubscriptions(from controller: UIViewController) {
        if #available(iOS 15.0, *), let scene = controller.view.window?.windowScene {
            Task { @MainActor in
                do {
                    try await AppStore.showManageSubscriptions(in: scene)
                } catch {
                    openSubscriptionsPage()
                }
            }
        } else {
            openSubscriptionsPage()
        }
    }

    private static func openSubscriptionsPage() {
        if let url = URL(string: "https://apps.apple.com/account/subscriptions") {
            UIApplication.shared.open(url)
        }
    }
}

// MARK: - e2e: StoreKit directly, under a test's SKTestSession (#1459)

/// SKTestSession only works in an XCTest process, so the e2e test runs hosted in the app: it opens the session (the
/// .storekit file, storefront VNM, no dialogs) and sets `isActive`. Products, purchase and restore then go to StoreKit
/// directly instead of RevenueCat; the server learns the payment from the webhook the test sends.
enum E2EStoreKit {
    static var isActive = false

    static func products(ids: [String], completion: @escaping ([PlanStoreProduct]) -> Void) {
        guard #available(iOS 15.0, *) else { return completion([]) }
        Task {
            let products = (try? await StoreKit.Product.products(for: ids)) ?? []
            let list = products.map { product in
                PlanStoreProduct(
                    productId: product.id,
                    priceText: product.displayPrice,
                    price: product.price,
                    currencyCode: product.priceFormatStyle.currencyCode,
                    format: { amount in amount.formatted(product.priceFormatStyle) }
                )
            }
            await MainActor.run { completion(list) }
        }
    }

    static func purchase(productId: String, completion: @escaping (PlanStoreResult) -> Void) {
        guard #available(iOS 15.0, *) else { return completion(.failed("iOS 15")) }
        Task {
            let result: PlanStoreResult
            do {
                guard let product = try await StoreKit.Product.products(for: [productId]).first else {
                    throw NSError.errorWithOwnMessage(message: "plan.storeUnavailable".localized(), domain: "E2EStoreKit")
                }
                switch try await product.purchase() {
                case .success(let verification):
                    if case .verified(let transaction) = verification { await transaction.finish() }
                    result = .purchased
                case .userCancelled, .pending:
                    result = .cancelled
                @unknown default:
                    result = .cancelled
                }
            } catch {
                result = .failed(error.localizedDescription)
            }
            await MainActor.run { completion(result) }
        }
    }

    static func restore(completion: @escaping (PlanStoreResult) -> Void) {
        guard #available(iOS 15.0, *) else { return completion(.failed("iOS 15")) }
        Task {
            var found = false
            for await entitlement in StoreKit.Transaction.currentEntitlements {
                if case .verified(let transaction) = entitlement, PlanRenewalLogic.allProductIds.contains(transaction.productID) {
                    found = true
                }
            }
            await MainActor.run { completion(found ? .purchased : .cancelled) }
        }
    }
}
