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

    /// - launch (also the update screen lifting): the pages once per install, before login. Someone signed in who never saw them
    ///   (an update in the middle) gets them before Home.
    /// - onboardingFinished: `signedIn` is read at that moment, a session can end while a page is up.
    /// - loggedIn: always Home. A login never leads to the pages.
    static func next(after moment: Moment, signedIn: Bool, onboardingDone: Bool) -> AppStartRoute {
        switch moment {
        case .launch:
            guard onboardingDone else { return .onboarding }
            return signedIn ? .main : .login
        case .onboardingFinished:
            return signedIn ? .main : .login
        case .loggedIn:
            return .main
        }
    }

    /// After these the pages are over for this install. A login counts: Login can come with the pages unfinished (the session ended on a page).
    static func endsOnboarding(_ moment: Moment) -> Bool {
        moment == .onboardingFinished || moment == .loggedIn
    }
}
