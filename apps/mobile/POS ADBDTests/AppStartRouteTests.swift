import XCTest
@testable import POS_ADBD

/// #1455: same cases as Android `AppStartRouteTest`.
final class AppStartRouteTests: XCTestCase {
    /// What one install keeps, walked moment by moment. A logout or an ended session is `signedIn = false`: they show Login directly.
    private struct Install {
        var signedIn = false
        var onboardingDone = false

        mutating func reach(_ moment: AppStartRoute.Moment) -> AppStartRoute {
            if AppStartRoute.endsOnboarding(moment) { onboardingDone = true }
            if moment == .loggedIn { signedIn = true }
            return AppStartRoute.next(after: moment, signedIn: signedIn, onboardingDone: onboardingDone)
        }
    }

    func testAFreshInstallStartsOnThePagesThenLoginThenHome() {
        var install = Install()
        XCTAssertEqual(install.reach(.launch), .onboarding)
        XCTAssertEqual(install.reach(.onboardingFinished), .login)
        XCTAssertEqual(install.reach(.loggedIn), .main)
        XCTAssertEqual(install.reach(.launch), .main, "shown once")
    }

    func testQuittingOnAPageShowsThePagesAgain() {
        var install = Install()
        XCTAssertEqual(install.reach(.launch), .onboarding)
        XCTAssertEqual(install.reach(.launch), .onboarding)
    }

    func testFinishedPagesBeforeLoginStayFinished() {
        var install = Install()
        _ = install.reach(.onboardingFinished)
        XCTAssertEqual(install.reach(.launch), .login, "quit on the login screen")
    }

    func testSomeoneSignedInWithThePagesToDoSeesThemOnceThenHome() {
        var install = Install(signedIn: true)
        XCTAssertEqual(install.reach(.launch), .onboarding)
        XCTAssertEqual(install.reach(.onboardingFinished), .main)
        XCTAssertEqual(install.reach(.launch), .main, "not twice")
    }

    func testAFlagAlreadySetNeverShowsThePages() {
        var signedIn = Install(signedIn: true, onboardingDone: true)
        XCTAssertEqual(signedIn.reach(.launch), .main)
        var signedOut = Install(signedIn: false, onboardingDone: true)
        XCTAssertEqual(signedOut.reach(.launch), .login)
    }

    func testALogoutLeavesThePagesOver() {
        var install = Install(signedIn: true, onboardingDone: true)
        install.signedIn = false
        XCTAssertEqual(install.reach(.launch), .login)
        XCTAssertEqual(install.reach(.loggedIn), .main)
    }

    func testASessionEndingWhileThePagesAreUpGoesToLoginOnFinish() {
        var install = Install(signedIn: true)
        XCTAssertEqual(install.reach(.launch), .onboarding)
        install.signedIn = false
        XCTAssertEqual(install.reach(.onboardingFinished), .login)
    }

    /// The session ended on a page and Login took over: Home after it, and no pages at the next launch either
    func testALoginNeverLeadsToThePages() {
        var install = Install(signedIn: false, onboardingDone: false)
        XCTAssertEqual(install.reach(.loggedIn), .main)
        XCTAssertTrue(install.onboardingDone)
        XCTAssertEqual(install.reach(.launch), .main)
    }

    /// The same login screen, quit before signing in: signed out with the pages to do is a first launch, and it cannot get stuck
    func testQuittingOnThatLoginScreenShowsThePagesOnceMoreThenLogin() {
        var install = Install(signedIn: false, onboardingDone: false)
        XCTAssertEqual(install.reach(.launch), .onboarding)
        XCTAssertEqual(install.reach(.onboardingFinished), .login)
    }

    func testOnlyFinishingAndLoggingInEndThePages() {
        XCTAssertFalse(AppStartRoute.endsOnboarding(.launch))
        XCTAssertTrue(AppStartRoute.endsOnboarding(.onboardingFinished))
        XCTAssertTrue(AppStartRoute.endsOnboarding(.loggedIn))
    }
}
