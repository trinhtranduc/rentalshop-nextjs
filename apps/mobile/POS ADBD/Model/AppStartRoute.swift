//
//  AppStartRoute.swift
//  POS ADBD
//
//  #1455: which screen comes first, and where the pages and a login lead. Pure rules. Android: `domain/appstart/AppStartRoute.kt`.
//

import Foundation

enum AppStartRoute: Equatable {
    case onboarding, login, main

    enum Moment { case launch, onboardingFinished, loggedIn }

    static func next(after moment: Moment, signedIn: Bool, onboardingDone: Bool) -> AppStartRoute {
        switch moment {
        case .launch:
            if signedIn && !onboardingDone { return .onboarding }
            return signedIn ? .main : .login
        case .onboardingFinished:
            return .main
        case .loggedIn:
            return onboardingDone ? .main : .onboarding
        }
    }

    static func endsOnboarding(_ moment: Moment) -> Bool {
        moment == .onboardingFinished
    }
}
