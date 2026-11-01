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

/// #1413: `RatingManager` reads the total, asks once, and stays quiet on a failure.
final class RatingManagerFlowTests: XCTestCase {
    private var defaults: UserDefaults!
    private var suite: String!
    private var total: Int? = 5
    private var reads = 0
    private var reviews = 0
    private var coach = false
    private var heldAnswer: ((Int?) -> Void)?
    private var hold = false

    override func setUp() {
        super.setUp()
        suite = "RatingManagerFlowTests.\(UUID().uuidString)"
        defaults = UserDefaults(suiteName: suite)
        total = 5
        reads = 0
        reviews = 0
        coach = false
        heldAnswer = nil
        hold = false
    }

    override func tearDown() {
        defaults.removePersistentDomain(forName: suite)
        super.tearDown()
    }

    private func manager(reaches: Bool = true) -> RatingManager {
        RatingManager(defaults: defaults,
                      orderTotal: { [unowned self] answer in
                          reads += 1
                          if hold { heldAnswer = answer } else { answer(total) }
                      },
                      merchantId: { 7 },
                      coachRunning: { [unowned self] in coach },
                      presentReview: { [unowned self] _ in
                          reviews += 1
                          return reaches
                      })
    }

    func testTheFirstOrderDoesNotAsk() {
        total = 1
        let rating = manager()
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reviews, 0)
        XCTAssertFalse(rating.hasRequestedRating, "still to be asked later")
    }

    func testTheFifthOrderAsksOnceAndStopsReading() {
        let rating = manager()
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reviews, 1)
        XCTAssertTrue(rating.hasRequestedRating)
        XCTAssertEqual(defaults.object(forKey: "hasRequestedAppRating") as? Bool, true, "the key old installs already have")
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reads, 1, "no read after the request")
        XCTAssertEqual(reviews, 1)
    }

    func testSomeoneAlreadyAskedIsNotAskedAndNothingIsRead() {
        defaults.set(true, forKey: "hasRequestedAppRating")
        manager().requestRatingIfNeeded()
        XCTAssertEqual(reads, 0)
        XCTAssertEqual(reviews, 0)
    }

    func testAFailedReadShowsNothingAndTheNextOrderReadsAgain() {
        total = nil
        let rating = manager()
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reviews, 0)
        XCTAssertFalse(rating.hasRequestedRating)
        total = 5
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reviews, 1)
    }

    func testNoRequestWhileTheGuideRuns() {
        coach = true
        manager().requestRatingIfNeeded()
        XCTAssertEqual(reviews, 0)
    }

    func testThePendingFinishCardWaitsThenClosingItAllowsTheNextOrder() {
        let store = FirstRunGuideStore(defaults: defaults)
        store.save(FirstRunGuideMarks(done: true, finishPending: true), merchantId: 7)
        let rating = manager()
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reviews, 0)
        store.save(FirstRunGuideMarks(done: true, finishPending: false), merchantId: 7)
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reviews, 1)
    }

    func testOneReadAtATime() {
        hold = true
        let rating = manager()
        rating.requestRatingIfNeeded()
        rating.requestRatingIfNeeded()
        XCTAssertEqual(reads, 1)
        heldAnswer?(5)
        XCTAssertEqual(reviews, 1)
    }

    /// No window scene: nothing reached StoreKit, so the mark stays off and a later order may still ask
    func testNotMarkedWhenTheRequestCouldNotBeMade() {
        let rating = manager(reaches: false)
        rating.requestRatingIfNeeded()
        XCTAssertFalse(rating.hasRequestedRating)
    }
}
