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
/// Shows rating popup when user creates their first order
class RatingManager {
    
    static let shared = RatingManager()
    
    // MARK: - UserDefaults Keys
    private let hasRequestedRatingKey = "hasRequestedAppRating"
    
    // MARK: - Private Init
    private init() {}
    
    // MARK: - Public Methods
    
    /// Check if rating has been requested before
    var hasRequestedRating: Bool {
        return UserDefaults.standard.bool(forKey: hasRequestedRatingKey)
    }
    
    /// Request rating from user
    /// This should be called when user completes their first order
    /// - Parameter viewController: The view controller to present the rating from (usually the current view controller)
    func requestRatingIfNeeded(from viewController: UIViewController? = nil) {
        // Check if we've already requested rating
        guard !hasRequestedRating else {
            print("ℹ️ Rating already requested, skipping...")
            return
        }
        
        // Use SKStoreReviewController to request rating
        // This is Apple's recommended way to request app ratings
        // It shows a native iOS rating dialog that doesn't interrupt user flow
        if #available(iOS 14.0, *) {
            // iOS 14+ - can request from any window scene
            if let windowScene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                SKStoreReviewController.requestReview(in: windowScene)
                markRatingRequested()
            } else {
                // Fallback: try to get window scene from view controller
                if let viewController = viewController,
                   let windowScene = viewController.view.window?.windowScene {
                    SKStoreReviewController.requestReview(in: windowScene)
                    markRatingRequested()
                }
            }
        } else {
            // iOS 10.3 - 13: requestReview() can be called from anywhere
            SKStoreReviewController.requestReview()
            markRatingRequested()
        }
        
        print("✅ Rating request shown to user")
    }
    
    /// Mark that rating has been requested (so we don't show it again)
    private func markRatingRequested() {
        UserDefaults.standard.set(true, forKey: hasRequestedRatingKey)
        UserDefaults.standard.synchronize()
        print("✅ Rating request marked as completed")
    }
    
    /// Reset rating request status (for testing purposes)
    func resetRatingRequest() {
        UserDefaults.standard.removeObject(forKey: hasRequestedRatingKey)
        UserDefaults.standard.synchronize()
        print("🔄 Rating request status reset")
    }
}

