import XCTest
@testable import POS_ADBD

/// #674 — reload on appear only when data changed or got old
final class RefreshPolicyTests: XCTestCase {
    private let t0 = Date(timeIntervalSince1970: 1_790_000_000)

    func testNeverLoadedReloads() {
        XCTAssertTrue(RefreshPolicy.shouldReload(dirty: false, lastLoadedAt: nil, now: t0, ttl: 300))
    }

    func testDirtyReloadsEvenWhenFresh() {
        XCTAssertTrue(RefreshPolicy.shouldReload(dirty: true, lastLoadedAt: t0, now: t0, ttl: 300))
    }

    func testFreshAndCleanDoesNotReload() {
        XCTAssertFalse(RefreshPolicy.shouldReload(dirty: false, lastLoadedAt: t0, now: t0 + 299, ttl: 300))
    }

    func testStaleReloadsAtTheTTL() {
        XCTAssertTrue(RefreshPolicy.shouldReload(dirty: false, lastLoadedAt: t0, now: t0 + 300, ttl: 300))
    }

    func testTTLs() {
        XCTAssertEqual(RefreshPolicy.listTTL, 5 * 60)
        XCTAssertEqual(RefreshPolicy.summaryTTL, 10 * 60)
    }

    func testTrackerLoadClearsDirty() {
        var tracker = RefreshTracker()
        XCTAssertTrue(tracker.shouldReload(now: t0, ttl: 300))
        tracker.loaded(version: tracker.begin(), at: t0)
        XCTAssertFalse(tracker.shouldReload(now: t0 + 10, ttl: 300))
        tracker.markDirty()
        XCTAssertTrue(tracker.isDirty)
        XCTAssertTrue(tracker.shouldReload(now: t0 + 10, ttl: 300))
        tracker.loaded(version: tracker.begin(), at: t0 + 20)
        XCTAssertFalse(tracker.isDirty)
    }

    func testChangeDuringLoadStaysDirty() {
        var tracker = RefreshTracker()
        let version = tracker.begin()
        tracker.markDirty()
        tracker.loaded(version: version, at: t0)
        XCTAssertTrue(tracker.isDirty)
    }

    func testOlderLoadDoesNotUndoANewerOne() {
        var tracker = RefreshTracker()
        tracker.markDirty()
        let newer = tracker.begin()
        tracker.loaded(version: newer, at: t0)
        tracker.loaded(version: 0, at: t0 + 1)
        XCTAssertFalse(tracker.isDirty)
    }
}
