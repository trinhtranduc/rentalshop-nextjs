import XCTest
@testable import POS_ADBD

/// #1413: the rules of the two system prompts: the rating from the 5th order, outside the guide, and the notification question on Home only.
final class PromptTimingTests: XCTestCase {
    private func rating(requested: Bool = false, total: Int?, marks: FirstRunGuideMarks = FirstRunGuideMarks(done: true), coach: Bool = false) -> Bool {
        RatingPromptRule.shouldRequest(alreadyRequested: requested, orderTotal: total, guideMarks: marks, coachRunning: coach)
    }

    func testRatingStartsAtTheFifthOrder() {
        XCTAssertFalse(rating(total: 1), "the first order")
        XCTAssertFalse(rating(total: 4))
        XCTAssertTrue(rating(total: 5))
        XCTAssertTrue(rating(total: 40), "an older shop on a phone that was never asked")
    }

    func testRatingIsAskedOnce() {
        XCTAssertFalse(rating(requested: true, total: 5))
    }

    func testAFailedReadShowsNothing() {
        XCTAssertFalse(rating(total: nil))
    }

    func testNoRatingWhileTheGuideRuns() {
        XCTAssertFalse(rating(total: 5, coach: true))
    }

    func testNoRatingWhileTheFinishCardIsPending() {
        XCTAssertFalse(rating(total: 5, marks: FirstRunGuideMarks(done: true, finishPending: true)))
        XCTAssertTrue(rating(total: 5, marks: FirstRunGuideMarks(done: true, finishPending: false)), "Đóng ends the wait")
    }

    /// Orders from another device: this phone saw the card, and Home has not read the total yet, so the finish card is about to show
    func testNoRatingWhenThisTotalWouldBringTheFinishCard() {
        XCTAssertFalse(rating(total: 5, marks: FirstRunGuideMarks(seen: true)))
        XCTAssertTrue(rating(total: 5, marks: FirstRunGuideMarks(skipped: true, seen: true)), "a skipped guide has no finish card")
        XCTAssertTrue(rating(total: 5, marks: FirstRunGuideMarks()), "a phone that never showed the card has no finish card")
    }

    private func asks(status: NotificationPromptRule.Status = .notDetermined, signedIn: Bool = true, onboardingDone: Bool = true,
                      homeInFront: Bool = true, appBlocked: Bool = false) -> Bool {
        NotificationPromptRule.asksOnHome(status: status, signedIn: signedIn, onboardingDone: onboardingDone, homeInFront: homeInFront, appBlocked: appBlocked)
    }

    func testAsksOnHomeForSomeoneWhoNeverAnswered() {
        XCTAssertTrue(asks())
    }

    func testNeverAsksDuringOnboarding() {
        XCTAssertFalse(asks(onboardingDone: false), "a push or widget link can open the tabs before onboarding ends")
    }

    func testNeverAsksAwayFromHome() {
        XCTAssertFalse(asks(homeInFront: false))
        XCTAssertFalse(asks(signedIn: false))
        XCTAssertFalse(asks(appBlocked: true), "the update screen")
    }

    func testSomeoneWhoAnsweredIsNotAskedAgain() {
        XCTAssertFalse(asks(status: .allowed))
        XCTAssertFalse(asks(status: .denied))
    }

    /// The token must keep flowing for users who already granted, on login and at launch
    func testRegistrationAtStartFollowsTheAnswerNotTheScreen() {
        XCTAssertTrue(NotificationPromptRule.registersAtStart(.allowed))
        XCTAssertFalse(NotificationPromptRule.registersAtStart(.denied))
        XCTAssertFalse(NotificationPromptRule.registersAtStart(.notDetermined), "no question at start: Home asks, then registers")
    }
}
