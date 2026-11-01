import XCTest
@testable import POS_ADBD

/// #1418 condition photos: the limit, the resend rule and the queue on the device
final class OrderPhotoQueueTests: XCTestCase {
    private var root: URL!
    private let photo = Data([0xFF, 0xD8, 0xFF, 1])

    override func setUpWithError() throws {
        root = FileManager.default.temporaryDirectory.appendingPathComponent("order-photo-tests-\(UUID().uuidString)")
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: root)
    }

    // MARK: Limits

    func testConditionPhotosStopAtThreeAndNotePhotosStayAtFive() {
        XCTAssertEqual(OrderPhotoLogic.maxPhotos, 3)
        XCTAssertEqual(OrderDetailLogic.maxNotePhotos, 5)
        XCTAssertTrue(OrderPhotoLogic.canAdd(count: 2))
        XCTAssertFalse(OrderPhotoLogic.canAdd(count: 3))
        XCTAssertEqual(OrderPhotoLogic.countLabel(2), "2/3")
    }

    // MARK: Resend rule

    func testALostReplyIsNotSentAgain() {
        XCTAssertEqual(OrderPhotoLogic.decide(serverCount: 3, baseline: 0, pending: 3), .alreadyUploaded)
        XCTAssertEqual(OrderPhotoLogic.decide(serverCount: 3, baseline: 2, pending: 1), .alreadyUploaded)
    }

    func testNothingArrivedSendsEverything() {
        XCTAssertEqual(OrderPhotoLogic.decide(serverCount: 0, baseline: 0, pending: 3), .send(count: 3))
    }

    func testAPhotoFromAnotherDeviceLeavesOnlyTheRoom() {
        XCTAssertEqual(OrderPhotoLogic.decide(serverCount: 1, baseline: 0, pending: 3), .send(count: 2))
        XCTAssertEqual(OrderPhotoLogic.decide(serverCount: 3, baseline: 0, pending: 4), .noRoom)
    }

    func testAddLaterOnlyWhileOutWithRoomAndNothingWaiting() {
        let can = { (status: OrderStatus, server: Int, pending: Int, update: Bool) in
            OrderPhotoLogic.canAddLater(status: status, serverCount: server, pendingCount: pending, canUpdateOrders: update)
        }
        XCTAssertTrue(can(.pickuped, 2, 0, true))
        XCTAssertFalse(can(.pickuped, 3, 0, true), "3/3 hides it")
        XCTAssertFalse(can(.pickuped, 2, 1, true))
        XCTAssertFalse(can(.pickuped, 2, 0, false))
        XCTAssertFalse(can(.returned, 2, 0, true))
        XCTAssertFalse(can(.pickuped, 0, 0, true), "no photos: the detail screen stays as today")
    }

    // MARK: Disk

    func testQueueSurvivesANewInstance() throws {
        try OrderPhotoQueue(root: root).enqueue(scope: "u1_m1", orderId: 9, field: .pickup, baseline: 1, photos: [photo, photo])
        let entry = try XCTUnwrap(OrderPhotoQueue(root: root).entry(scope: "u1_m1", orderId: 9, field: .pickup))
        XCTAssertEqual(entry.baseline, 1)
        XCTAssertEqual(entry.files.count, 2)
        XCTAssertEqual(try Data(contentsOf: entry.files[0]), photo)
    }

    func testAnotherUserOrShopSeesNothing() throws {
        let queue = OrderPhotoQueue(root: root)
        try queue.enqueue(scope: OrderPhotoQueue.scope(userId: 1, merchantId: 7), orderId: 9, field: .pickup, baseline: 0, photos: [photo])
        XCTAssertNil(queue.entry(scope: OrderPhotoQueue.scope(userId: 2, merchantId: 7), orderId: 9, field: .pickup))
        XCTAssertNil(queue.entry(scope: OrderPhotoQueue.scope(userId: 1, merchantId: 8), orderId: 9, field: .pickup))
        XCTAssertNotNil(queue.entry(scope: OrderPhotoQueue.scope(userId: 1, merchantId: 7), orderId: 9, field: .pickup))
    }

    func testQueuesExpire() throws {
        var today = Date(timeIntervalSince1970: 1_000_000)
        let queue = OrderPhotoQueue(root: root, now: { today })
        try queue.enqueue(scope: "u1_m1", orderId: 9, field: .pickup, baseline: 0, photos: [photo])
        today = today.addingTimeInterval(OrderPhotoQueue.maxAge + 60)
        queue.purgeExpired()
        XCTAssertNil(queue.entry(scope: "u1_m1", orderId: 9, field: .pickup))
    }

    // MARK: Uploader

    private final class Fake {
        var scope: String? = "u1_m1"
        var serverCount: Int? = 0
        var sendResult = true
        var sent: [Int] = []
        var loads = 0
    }

    private func uploader(_ fake: Fake) -> OrderPhotoUploader {
        OrderPhotoUploader(
            queue: OrderPhotoQueue(root: root),
            scope: { fake.scope },
            loadServerCount: { _, _, done in
                fake.loads += 1
                done(fake.serverCount)
            },
            send: { _, _, photos, done in
                fake.sent.append(photos.count)
                done(fake.sendResult)
            })
    }

    func testSuccessEmptiesTheQueue() {
        let fake = Fake()
        let sut = uploader(fake)
        XCTAssertTrue(sut.add(orderId: 9, field: .pickup, baseline: 0, photos: [photo, photo, photo]))
        XCTAssertEqual(fake.sent, [3])
        XCTAssertNil(sut.pending(orderId: 9, field: .pickup))
        XCTAssertEqual(sut.state(orderId: 9, field: .pickup), .idle)
    }

    func testFailureKeepsThePhotosAndRetryThenSends() {
        let fake = Fake()
        fake.sendResult = false
        let sut = uploader(fake)
        sut.add(orderId: 9, field: .pickup, baseline: 0, photos: [photo])
        XCTAssertEqual(sut.state(orderId: 9, field: .pickup), .failed)
        XCTAssertNotNil(sut.pending(orderId: 9, field: .pickup))
        fake.sendResult = true
        sut.resume(orderId: 9, field: .pickup)
        XCTAssertEqual(fake.sent, [1, 1])
        XCTAssertNil(sut.pending(orderId: 9, field: .pickup))
    }

    func testRetryAfterALostReplySkipsTheResend() {
        let fake = Fake()
        fake.sendResult = false
        let sut = uploader(fake)
        sut.add(orderId: 9, field: .pickup, baseline: 0, photos: [photo])
        fake.serverCount = 1
        sut.resume(orderId: 9, field: .pickup)
        XCTAssertEqual(fake.sent, [1], "the second attempt read the order and did not send")
        XCTAssertNil(sut.pending(orderId: 9, field: .pickup))
    }

    func testOrderCannotBeReadCountsAsFailedAndSendsNothing() {
        let fake = Fake()
        fake.serverCount = nil
        let sut = uploader(fake)
        sut.add(orderId: 9, field: .pickup, baseline: 0, photos: [photo])
        XCTAssertEqual(fake.sent, [])
        XCTAssertEqual(sut.state(orderId: 9, field: .pickup), .failed)
    }

    func testAnotherLoginNeitherSeesNorSendsAndTheOwnerGetsThemBack() {
        let fake = Fake()
        fake.sendResult = false
        let sut = uploader(fake)
        sut.add(orderId: 9, field: .pickup, baseline: 0, photos: [photo])
        fake.scope = "u2_m7"
        XCTAssertNil(sut.pending(orderId: 9, field: .pickup))
        XCTAssertEqual(sut.state(orderId: 9, field: .pickup), .idle)
        sut.resume(orderId: 9, field: .pickup)
        XCTAssertEqual(fake.sent, [1], "the other login sent nothing")
        fake.scope = nil
        sut.resume(orderId: 9, field: .pickup)
        XCTAssertEqual(fake.sent, [1], "logged out: nothing is sent")
        fake.scope = "u1_m1"
        XCTAssertNotNil(sut.pending(orderId: 9, field: .pickup))
    }

    func testUploadInFlightIsNotStartedTwice() {
        var pendingSend: ((Bool) -> Void)?
        var sends = 0
        let sut = OrderPhotoUploader(
            queue: OrderPhotoQueue(root: root), scope: { "u1_m1" },
            loadServerCount: { _, _, done in done(0) },
            send: { _, _, _, done in
                sends += 1
                pendingSend = done
            })
        sut.add(orderId: 9, field: .pickup, baseline: 0, photos: [photo])
        sut.resume(orderId: 9, field: .pickup)
        XCTAssertEqual(sends, 1)
        pendingSend?(true)
    }

    // MARK: API shape

    /// The ordinary update of an installed or current app must not touch these fields, or a shorter list would erase photos
    func testOrdinaryUpdateDoesNotSendConditionPhotos() throws {
        let request = UpdateOrderRequest(status: "RETURNED", damageFee: 10, notesImages: ["https://x/a.jpg"], lateFee: 5)
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: JSONEncoder().encode(request)) as? [String: Any])
        XCTAssertNil(body["pickupNotesImages"])
        XCTAssertNil(body["returnNotesImages"])
    }

    func testPhotoPartsUseTheFieldName() {
        let parts = OrderService.photoParts([photo, photo], field: .pickup)
        XCTAssertEqual(parts.map(\.name), ["pickupNotesImages", "pickupNotesImages"])
        XCTAssertEqual(parts.map(\.fileName), ["pickupNotesImages_0.jpg", "pickupNotesImages_1.jpg"])
        XCTAssertEqual(parts[0].mimeType, "image/jpeg")
    }
}
