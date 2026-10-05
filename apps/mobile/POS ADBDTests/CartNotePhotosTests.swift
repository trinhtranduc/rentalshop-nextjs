import XCTest
@testable import POS_ADBD

/// #480 — note photos picked in the cart note editor: kept by the cart (memory only), sent on create as `notesImages`
final class CartNotePhotosTests: XCTestCase {
    private func jpeg(_ byte: UInt8) -> Data { Data([0xFF, 0xD8, byte]) }

    override func setUp() {
        super.setUp()
        CartStore.shared.resetCart(notify: false, persistToDisk: false)
    }

    override func tearDown() {
        CartStore.shared.resetCart(notify: false, persistToDisk: false)
        super.tearDown()
    }

    func testCartKeepsAtMostFivePhotos() {
        CartStore.shared.setNoteImageData((1...7).map { jpeg(UInt8($0)) })
        XCTAssertEqual(CartStore.shared.noteImageData.count, OrderDetailLogic.maxNotePhotos)
        XCTAssertEqual(CartStore.shared.noteImageData.first, jpeg(1))
    }

    func testSavingAgainReplacesThePhotos() {
        CartStore.shared.setNoteImageData([jpeg(1), jpeg(2)])
        CartStore.shared.setNoteImageData([jpeg(2)])
        XCTAssertEqual(CartStore.shared.noteImageData, [jpeg(2)])
    }

    func testResetCartClearsThePhotos() {
        CartStore.shared.setNoteImageData([jpeg(1)])
        CartStore.shared.resetCart(notify: false, persistToDisk: false)
        XCTAssertTrue(CartStore.shared.noteImageData.isEmpty)
    }

    func testLoadingAnotherCartClearsThePhotos() {
        CartStore.shared.setNoteImageData([jpeg(1)])
        CartStore.shared.replaceCart(with: Cart(), notify: false)
        XCTAssertTrue(CartStore.shared.noteImageData.isEmpty)
    }

    func testPhotosAreNotInTheSavedDraft() throws {
        CartStore.shared.setNotes("Có ảnh")
        CartStore.shared.setNoteImageData([jpeg(1)])
        let json = String(data: try JSONEncoder().encode(CartStore.shared.cart.makeDiskSnapshot()), encoding: .utf8) ?? ""
        XCTAssertTrue(json.contains("Có ảnh"))
        XCTAssertFalse(json.lowercased().contains("image"))
    }

    // MARK: Create payload

    func testCreatePayloadHasOneNotesImagesPartPerPhoto() {
        let parts = OrderService.notesImageParts([jpeg(1), jpeg(2)])
        XCTAssertEqual(parts.map { $0.name }, ["notesImages", "notesImages"])
        XCTAssertEqual(parts.map { $0.fileName }, ["notes_image_0.jpg", "notes_image_1.jpg"])
        XCTAssertEqual(parts.map { $0.mimeType }, ["image/jpeg", "image/jpeg"])
        XCTAssertEqual(parts.map { $0.data }, [jpeg(1), jpeg(2)])
    }

    func testCreatePayloadWithoutPhotosHasNoFileParts() {
        XCTAssertTrue(OrderService.notesImageParts([]).isEmpty)
    }

    func testCartPhotosAreWhatCreateSends() {
        CartStore.shared.setNoteImageData([jpeg(3)])
        XCTAssertEqual(OrderService.notesImageParts(CartStore.shared.noteImageData).map { $0.data }, [jpeg(3)])
    }
}
