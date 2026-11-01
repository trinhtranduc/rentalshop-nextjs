//
//  PromptTiming.swift
//  POS ADBD
//
//  #1413: when the system prompts may show. Pure rules. Android: `domain/notifications/NotificationPromptRule.kt`
//  (Android has no in-app review).
//

import Foundation

enum RatingPromptRule {
    static let minimumOrders = 5

    /// STUB (red): today's behaviour
    static func shouldRequest(alreadyRequested: Bool, orderTotal: Int?, guideMarks: FirstRunGuideMarks, coachRunning: Bool) -> Bool {
        !alreadyRequested
    }
}

enum NotificationPromptRule {
    enum Status: Equatable { case notDetermined, denied, allowed }

    /// STUB (red): today's behaviour
    static func registersAtStart(_ status: Status) -> Bool { status != .denied }

    /// STUB (red): today's behaviour
    static func asksOnHome(status: Status, signedIn: Bool, onboardingDone: Bool, homeInFront: Bool, appBlocked: Bool) -> Bool {
        status == .notDetermined
    }
}
