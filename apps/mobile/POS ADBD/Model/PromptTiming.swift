//
//  PromptTiming.swift
//  POS ADBD
//
//  #1413: when the system prompts may show. Pure rules. Android: `domain/notifications/NotificationPromptRule.kt`
//  (Android has no in-app review).
//

import Foundation
import UserNotifications

enum RatingPromptRule {
    static let minimumOrders = 5

    /// - orderTotal: the caller's scope, cancelled orders included (same read as the guide). nil: the read failed.
    /// - guideMarks: this phone and shop. The total is applied first, as Home will: the finish card may be about to show.
    static func shouldRequest(alreadyRequested: Bool, orderTotal: Int?, guideMarks: FirstRunGuideMarks, coachRunning: Bool) -> Bool {
        guard !alreadyRequested, !coachRunning, let orderTotal, orderTotal >= minimumOrders else { return false }
        return !FirstRunGuide.marks(guideMarks, afterOrderTotal: orderTotal).finishPending
    }
}

enum NotificationPromptRule {
    enum Status: Equatable { case notDetermined, denied, allowed }

    /// Whoever already allowed keeps registering on login and at launch, whatever is on screen
    static func registersAtStart(_ status: Status) -> Bool { status == .allowed }

    /// Only someone who never answered, with onboarding over and Home in front
    static func asksOnHome(status: Status, signedIn: Bool, onboardingDone: Bool, homeInFront: Bool, appBlocked: Bool) -> Bool {
        status == .notDetermined && signedIn && onboardingDone && homeInFront && !appBlocked
    }
}

extension NotificationPromptRule.Status {
    init(_ status: UNAuthorizationStatus) {
        switch status {
        case .notDetermined: self = .notDetermined
        case .authorized, .provisional, .ephemeral: self = .allowed
        default: self = .denied
        }
    }
}
