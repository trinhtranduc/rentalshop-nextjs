import XCTest
@testable import POS_ADBD

/// #1320: the bank account printed on bills is cached per outlet; the cache must expire (5 minutes)
final class BankAccountCacheTests: XCTestCase {
    private let cachedAt = Date(timeIntervalSince1970: 1_800_000_000)

    func testTimeToLiveIsFiveMinutes() {
        XCTAssertEqual(BillBankQR.cacheTTL, 300)
    }

    func testFreshRightAfterCaching() {
        XCTAssertTrue(BillBankQR.isCacheFresh(cachedAt: cachedAt, now: cachedAt))
        XCTAssertTrue(BillBankQR.isCacheFresh(cachedAt: cachedAt, now: cachedAt.addingTimeInterval(60)))
    }

    func testStillFreshJustBeforeTheLimit() {
        XCTAssertTrue(BillBankQR.isCacheFresh(cachedAt: cachedAt, now: cachedAt.addingTimeInterval(299.9)))
    }

    func testStaleAtTheLimitAndAfter() {
        XCTAssertFalse(BillBankQR.isCacheFresh(cachedAt: cachedAt, now: cachedAt.addingTimeInterval(300)))
        XCTAssertFalse(BillBankQR.isCacheFresh(cachedAt: cachedAt, now: cachedAt.addingTimeInterval(3_600)))
    }

    func testStaleWhenTheClockWentBackwards() {
        XCTAssertFalse(BillBankQR.isCacheFresh(cachedAt: cachedAt, now: cachedAt.addingTimeInterval(-1)))
    }
}
