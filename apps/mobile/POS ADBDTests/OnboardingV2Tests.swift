import XCTest
@testable import POS_ADBD

/// #1404 the 3-page onboarding: the copy, which page plays, the cycle, cancel on leave, reduced motion, and the effect
/// of each page as a function of time. Android `OnboardingV2CycleTest` holds the same numbers.
final class OnboardingV2Tests: XCTestCase {

    // MARK: - Copy

    private func strings(_ language: String) throws -> [String: String] {
        // .../apps/mobile/POS ADBDTests/OnboardingV2Tests.swift -> apps/mobile
        var url = URL(fileURLWithPath: #filePath)
        for _ in 0..<2 { url.deleteLastPathComponent() }
        url.appendPathComponent("POS ADBD/\(language).lproj/Localizable.strings")
        return try XCTUnwrap(NSDictionary(contentsOf: url) as? [String: String])
    }

    private func oneLine(_ text: String?) -> String? { text?.replacingOccurrences(of: "\n", with: " ") }

    func testCopyIsExactInBothLanguages() throws {
        let vi = try strings("vi-VN")
        let en = try strings("en")
        let expected: [(OnboardingV2Page, String, String, String, String)] = [
            (.photoSearch, "Quên tên đồ? Chụp là ra.", "Đồ đã có ảnh trong kho là AI tìm được.",
             "Forgot the name? Just snap it.", "AI finds any item with a photo in your stock."),
            (.overlap, "Trùng lịch, app báo trước.", "Món nào hết ngày nào, nhìn là biết.",
             "Double-booked? You'll know first.", "See which item is out on which day."),
            (.calendar, "Giao ai, trả ai? Mở Lịch là thấy.", "Còn thu bao nhiêu cũng hiện ngay trên đơn.",
             "Who's due today? Open Calendar.", "What's left to collect shows on each order."),
        ]
        for (page, viTitle, viBody, enTitle, enBody) in expected {
            XCTAssertEqual(oneLine(vi[page.titleKey]), viTitle)
            XCTAssertEqual(vi[page.bodyKey], viBody)
            XCTAssertEqual(oneLine(en[page.titleKey]), enTitle)
            XCTAssertEqual(en[page.bodyKey], enBody)
        }
    }

    func testEverySampleWordIsAStringInBothLanguages() throws {
        let vi = try strings("vi-VN")
        let en = try strings("en")
        let vietnamese = CharacterSet(charactersIn: "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ")
        XCTAssertGreaterThan(OnboardingV2Copy.keys.count, 30)
        for key in OnboardingV2Copy.keys {
            XCTAssertFalse(vi[key]?.isEmpty ?? true, "vi \(key)")
            XCTAssertFalse(en[key]?.isEmpty ?? true, "en \(key)")
            XCTAssertNil(en[key]?.lowercased().rangeOfCharacter(from: vietnamese), "en \(key) has Vietnamese: \(en[key] ?? "")")
        }
        XCTAssertEqual(vi["onboarding.v2.sample.lang"], "vi")
        XCTAssertEqual(en["onboarding.v2.sample.lang"], "en")
    }

    func testSampleMoneyIsFixedPerLanguageNotTheShopCurrency() {
        let vi = OnboardingV2Sample(language: "vi")
        let en = OnboardingV2Sample(language: "en")
        XCTAssertEqual(vi.money(1_500_000), "1.500.000")
        XCTAssertEqual(vi.money(720_000), "720.000")
        XCTAssertEqual(vi.money(0), "0")
        XCTAssertEqual(en.money(150), "$150")
        XCTAssertEqual(en.money(0), "$0")
        XCTAssertEqual(vi.collectTargets, [1_500_000, 720_000])
        XCTAssertEqual(en.collectTargets, [150, 75])
    }

    // MARK: - Which page plays

    func testOpeningPlaysPageOneWithoutTravel() {
        var cycle = OnboardingV2Cycle()
        let run = cycle.start(reduceMotion: false)
        XCTAssertEqual(run.page, 0)
        XCTAssertNil(run.travelFrom)
        XCTAssertFalse(run.isRepeat)
        XCTAssertTrue(run.animated)
        XCTAssertEqual(cycle.phase, .playing)
    }

    func testGoingToAPagePlaysItWithTravelBothWays() throws {
        var cycle = OnboardingV2Cycle()
        _ = cycle.start(reduceMotion: false)
        let forward = try XCTUnwrap(cycle.go(to: 1))
        XCTAssertEqual(forward.page, 1)
        XCTAssertEqual(forward.travelFrom, 0)
        let back = try XCTUnwrap(cycle.go(to: 0))
        XCTAssertEqual(back.page, 0)
        XCTAssertEqual(back.travelFrom, 1)
    }

    func testSwipingPastEitherEndOrToTheSamePageDoesNothing() {
        var cycle = OnboardingV2Cycle()
        _ = cycle.start(reduceMotion: false)
        let generation = cycle.generation
        XCTAssertNil(cycle.go(to: -1))
        XCTAssertNil(cycle.go(to: 0))
        XCTAssertNil(cycle.go(to: 3))
        XCTAssertEqual(cycle.generation, generation, "the running effect keeps going")
        XCTAssertEqual(cycle.phase, .playing)
    }

    // MARK: - Cycle state

    func testEffectHoldsThenRepeatsWithoutTravel() throws {
        var cycle = OnboardingV2Cycle()
        _ = cycle.start(reduceMotion: false)
        let run = try XCTUnwrap(cycle.go(to: 2))
        XCTAssertTrue(cycle.effectEnded(generation: run.generation))
        XCTAssertEqual(cycle.phase, .holding)
        let again = try XCTUnwrap(cycle.holdEnded(generation: run.generation))
        XCTAssertEqual(again.page, 2)
        XCTAssertNil(again.travelFrom, "a repeat replays only the page's own effect")
        XCTAssertTrue(again.isRepeat)
        XCTAssertEqual(cycle.phase, .playing)
    }

    func testTimingsMatchTheOwnersNumbers() {
        XCTAssertEqual(OnboardingV2Timing.effect, 1.5)
        XCTAssertEqual(OnboardingV2Timing.hold, 4)
        XCTAssertLessThan(OnboardingV2Timing.travel, OnboardingV2Timing.effect)
    }

    // MARK: - Cancel on leave

    func testSwipingMidRunCancelsThePageBeingLeft() throws {
        var cycle = OnboardingV2Cycle()
        let first = cycle.start(reduceMotion: false)
        let second = try XCTUnwrap(cycle.go(to: 1))
        XCTAssertFalse(cycle.effectEnded(generation: first.generation), "the old effect's end is stale")
        XCTAssertEqual(cycle.phase, .playing)
        XCTAssertNil(cycle.holdEnded(generation: first.generation), "the old hold never repeats")
        XCTAssertEqual(cycle.page, 1)
        XCTAssertTrue(cycle.effectEnded(generation: second.generation))
    }

    func testAFastSwipeRunLeavesOneCycleOnly() throws {
        var cycle = OnboardingV2Cycle()
        var runs = [cycle.start(reduceMotion: false)]
        for target in [1, 2, 1, 0, 1, 2, 1] { runs.append(try XCTUnwrap(cycle.go(to: target))) }
        let live = runs.filter { $0.generation == cycle.generation }
        XCTAssertEqual(live.count, 1)
        XCTAssertEqual(live.first?.page, 1)
        for run in runs.dropLast() { XCTAssertFalse(cycle.effectEnded(generation: run.generation)) }
    }

    func testStopCancelsEverythingAndStartReplaysTheCurrentPageWithoutTravel() throws {
        var cycle = OnboardingV2Cycle()
        _ = cycle.start(reduceMotion: false)
        let run = try XCTUnwrap(cycle.go(to: 1))
        cycle.stop()
        XCTAssertEqual(cycle.phase, .stopped)
        XCTAssertFalse(cycle.effectEnded(generation: run.generation))
        XCTAssertNil(cycle.holdEnded(generation: run.generation))
        let back = cycle.start(reduceMotion: false)
        XCTAssertEqual(back.page, 1, "background and return keeps the page")
        XCTAssertNil(back.travelFrom)
    }

    func testStopDuringAHoldNeverRepeats() throws {
        var cycle = OnboardingV2Cycle()
        let run = cycle.start(reduceMotion: false)
        XCTAssertTrue(cycle.effectEnded(generation: run.generation))
        cycle.stop()
        XCTAssertNil(cycle.holdEnded(generation: run.generation))
    }

    // MARK: - Reduced motion

    func testReducedMotionGivesTheFinishedStateAndNoLoop() throws {
        var cycle = OnboardingV2Cycle()
        let open = cycle.start(reduceMotion: true)
        XCTAssertFalse(open.animated)
        XCTAssertEqual(cycle.phase, .finished)
        let next = try XCTUnwrap(cycle.go(to: 1))
        XCTAssertFalse(next.animated)
        XCTAssertNil(next.travelFrom, "no travel either")
        XCTAssertEqual(cycle.page, 1)
        XCTAssertEqual(cycle.phase, .finished)
        XCTAssertFalse(cycle.effectEnded(generation: next.generation))
        XCTAssertNil(cycle.holdEnded(generation: next.generation))
    }

    func testTurningReduceMotionOnMidRunFinishesAtOnce() {
        var cycle = OnboardingV2Cycle()
        let run = cycle.start(reduceMotion: false)
        let finished = cycle.start(reduceMotion: true)
        XCTAssertFalse(finished.animated)
        XCTAssertFalse(cycle.effectEnded(generation: run.generation))
        XCTAssertEqual(cycle.phase, .finished)
    }

    // MARK: - Page effects

    func testPhotoSearchStartsEmptyAndFinishesWithThreeTicks() {
        let start = OnboardingV2Effect.photoSearch(at: 0)
        XCTAssertEqual(start.scan, 0)
        XCTAssertEqual(start.resultAlpha, 0)
        XCTAssertEqual(start.rows, [0, 0, 0])
        XCTAssertEqual(start.ticks, [0, 0, 0])
        XCTAssertEqual(OnboardingV2Effect.photoSearch(at: 1.5), OnboardingV2Effect.PhotoSearch.finished)
        XCTAssertEqual(OnboardingV2Effect.PhotoSearch.finished.rows, [1, 1, 1])
        XCTAssertEqual(OnboardingV2Effect.PhotoSearch.finished.ticks, [1, 1, 1])
        XCTAssertEqual(OnboardingV2Effect.PhotoSearch.finished.scan, 0.62, accuracy: 0.0001)
    }

    func testPhotoSearchShowsTheScanThenRowsOneByOneEachWithATick() {
        XCTAssertEqual(OnboardingV2Effect.photoSearch(at: 0.42).scan, 0.97, accuracy: 0.0001, "the line reaches the bottom first")
        let t = OnboardingV2Effect.photoSearch(at: 0.8)
        XCTAssertGreaterThan(t.rows[0], 0)
        XCTAssertEqual(t.rows[1], 0)
        XCTAssertEqual(t.ticks[0], 0, "the row comes before its tick")
        let later = OnboardingV2Effect.photoSearch(at: 1.0)
        XCTAssertGreaterThan(later.ticks[0], 0)
        XCTAssertGreaterThan(later.rows[1], 0)
        XCTAssertEqual(later.rows[2], 0)
    }

    func testOverlapChipsMeetThenTheCellShakesTurnsRedThenTheWarning() {
        let start = OnboardingV2Effect.overlap(at: 0)
        XCTAssertEqual(start.chipBooked.alpha, 0)
        XCTAssertEqual(start.red, 0)
        XCTAssertFalse(start.showsOut)
        XCTAssertEqual(start.warning, 0)
        let met = OnboardingV2Effect.overlap(at: 0.8)
        XCTAssertEqual(met.chipBooked.alpha, 1)
        XCTAssertEqual(met.chipNew.alpha, 1)
        XCTAssertEqual(met.chipBooked.offsetX, 0)
        XCTAssertEqual(met.red, 0, "red only after both chips are in")
        let shaking = OnboardingV2Effect.overlap(at: 0.9)
        XCTAssertEqual(shaking.red, 1)
        XCTAssertTrue(shaking.showsOut)
        XCTAssertNotEqual(shaking.shake, 0)
        XCTAssertEqual(shaking.warning, 0, "the warning comes after the shake starts")
        XCTAssertGreaterThan(OnboardingV2Effect.overlap(at: 1.3).warning, 0)
        let end = OnboardingV2Effect.overlap(at: 1.5)
        XCTAssertEqual(end, OnboardingV2Effect.Overlap.finished)
        XCTAssertEqual(end.chipBooked.alpha, 0, "the chips are gone, the red cell stays")
        XCTAssertEqual(end.red, 1)
        XCTAssertEqual(end.shake, 0)
        XCTAssertEqual(end.warning, 1)
    }

    func testCalendarRowsComeOneByOneAndCollectCountsUpFromZero() {
        let start = OnboardingV2Effect.calendar(at: 0)
        XCTAssertEqual(start.rows, [0, 0, 0])
        XCTAssertEqual(start.collect, 0)
        let mid = OnboardingV2Effect.calendar(at: 0.5)
        XCTAssertGreaterThan(mid.rows[0], mid.rows[1])
        XCTAssertEqual(mid.rows[2], 0)
        XCTAssertGreaterThan(mid.collect, 0)
        XCTAssertLessThan(mid.collect, 1)
        XCTAssertEqual(OnboardingV2Effect.calendar(at: 1.5), OnboardingV2Effect.Calendar.finished)
        XCTAssertEqual(OnboardingV2Effect.Calendar.finished.collect, 1)
    }

    func testARepeatFadesFromTheFinishedStateToTheStart() {
        let fade = -OnboardingV2Timing.repeatFade
        XCTAssertEqual(OnboardingV2Effect.photoSearch(at: fade).rows, [1, 1, 1])
        XCTAssertEqual(OnboardingV2Effect.photoSearch(at: -0.0001).rows[0], 0, accuracy: 0.01)
        XCTAssertEqual(OnboardingV2Effect.overlap(at: fade).warning, 1)
        XCTAssertEqual(OnboardingV2Effect.overlap(at: fade).red, 1)
        XCTAssertEqual(OnboardingV2Effect.overlap(at: -0.0001).red, 0, accuracy: 0.01)
        XCTAssertEqual(OnboardingV2Effect.calendar(at: -0.1).collect, 1, "rows fade, the number does not rewind")
    }

    func testPhotoTravelEndsOnTheTargetAndCardsSettle() {
        XCTAssertEqual(OnboardingV2Travel.hero(at: 0), 0)
        XCTAssertEqual(OnboardingV2Travel.hero(at: OnboardingV2Timing.travel), 1)
        XCTAssertEqual(OnboardingV2Travel.hero(at: 1.5), 1)
        XCTAssertEqual(OnboardingV2Travel.fade(at: 0), 0)
        XCTAssertEqual(OnboardingV2Travel.fade(at: 1), 1)
    }

    // MARK: - Layout (no clipped text on small phones)

    func testStageMatchesTheMockupAndLeavesRoomForText() {
        let regular = OnboardingV2Metrics(width: 390, height: 844, safeTop: 47, safeBottom: 34)
        XCTAssertFalse(regular.compact)
        XCTAssertEqual(regular.stageHeight, 548, accuracy: 1)
        let tiny = OnboardingV2Metrics(width: 320, height: 568, safeTop: 20, safeBottom: 0)
        XCTAssertTrue(tiny.compact)
        XCTAssertEqual(tiny.stageHeight, 312, accuracy: 1)
        for m in [regular, tiny,
                  OnboardingV2Metrics(width: 375, height: 667, safeTop: 20, safeBottom: 0),
                  OnboardingV2Metrics(width: 440, height: 956, safeTop: 62, safeBottom: 34)] {
            XCTAssertLessThanOrEqual(m.textTop + m.textHeight, m.footerTop, "\(m.width)x\(m.height)")
            XCTAssertLessThan(m.cardTop, m.stageHeight)
        }
    }

    func testPhotoFillsTheStageOnPageOneAndSitsOnTheCardAfter() {
        let m = OnboardingV2Metrics(width: 390, height: 844, safeTop: 47, safeBottom: 34)
        XCTAssertEqual(m.heroRect(page: 0), CGRect(x: 0, y: 0, width: 390, height: m.stageHeight))
        XCTAssertEqual(m.heroRect(page: 1).width, 64)
        XCTAssertEqual(m.heroRect(page: 1).minX, 32)
        XCTAssertEqual(m.heroRect(page: 2).width, 56)
        XCTAssertEqual(m.heroRect(page: 2).minX, 36)
    }

    func testHeroLayoutIsTheOwnersCompactSizeOnTinyPhones() {
        let m = OnboardingV2Metrics(width: 320, height: 568, safeTop: 20, safeBottom: 0)
        XCTAssertEqual(m.heroRect(page: 1).width, 40)
        XCTAssertEqual(m.heroRect(page: 2).width, 40)
        XCTAssertEqual(m.titleSize, 24)
        XCTAssertEqual(m.bodySize, 14)
    }
}
