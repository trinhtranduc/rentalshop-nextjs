//
//  RatingManager.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-20.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import StoreKit
import UIKit

/// Manager to handle app rating requests
/// #1413: asks once, from the shop's 5th order on, outside the first-run guide (`RatingPromptRule`).
/// Apple decides whether the sheet actually appears.
class RatingManager {

    static let shared = RatingManager(
        defaults: .standard,
        orderTotal: { LiveFirstRunGuideDataSource().orderTotal(completion: $0) },
        merchantId: { User.current()?.merchantId },
        coachRunning: { FirstRunCoach.shared.isRunning },
        presentReview: RatingManager.presentReviewSheet
    )

    // MARK: - UserDefaults Keys
    private let hasRequestedRatingKey = "hasRequestedAppRating"

    private let defaults: UserDefaults
    private let orderTotal: (@escaping (Int?) -> Void) -> Void
    private let merchantId: () -> Int?
    private let coachRunning: () -> Bool
    /// True when the request reached StoreKit
    private let presentReview: (UIViewController?) -> Bool
    private var isReading = false

    init(defaults: UserDefaults,
         orderTotal: @escaping (@escaping (Int?) -> Void) -> Void,
         merchantId: @escaping () -> Int?,
         coachRunning: @escaping () -> Bool,
         presentReview: @escaping (UIViewController?) -> Bool) {
        self.defaults = defaults
        self.orderTotal = orderTotal
        self.merchantId = merchantId
        self.coachRunning = coachRunning
        self.presentReview = presentReview
    }

    // MARK: - Public Methods

    /// Check if rating has been requested before
    var hasRequestedRating: Bool {
        return defaults.bool(forKey: hasRequestedRatingKey)
    }

    /// Call when the user completed an order. Once asked there is no more reading; a failed read shows nothing.
    /// - Parameter viewController: The view controller to present the rating from (usually the current view controller)
    func requestRatingIfNeeded(from viewController: UIViewController? = nil) {
        guard !hasRequestedRating, !isReading else { return }
        isReading = true
        orderTotal { [weak self, weak viewController] total in
            guard let self else { return }
            self.isReading = false
            guard self.shouldRequest(orderTotal: total), self.presentReview(viewController) else { return }
            self.defaults.set(true, forKey: self.hasRequestedRatingKey)
        }
    }

    private func shouldRequest(orderTotal: Int?) -> Bool {
        guard let shop = merchantId() else { return false } // signed out meanwhile
        return RatingPromptRule.shouldRequest(alreadyRequested: hasRequestedRating,
                                              orderTotal: orderTotal,
                                              guideMarks: FirstRunGuideStore(defaults: defaults).marks(merchantId: shop),
                                              coachRunning: coachRunning())
    }

    private static func presentReviewSheet(from viewController: UIViewController?) -> Bool {
        let scene = UIApplication.shared.connectedScenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
        guard let windowScene = scene ?? viewController?.view.window?.windowScene else { return false }
        SKStoreReviewController.requestReview(in: windowScene)
        return true
    }
}
