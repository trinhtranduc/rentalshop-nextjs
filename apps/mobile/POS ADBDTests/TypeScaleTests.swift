import XCTest
@testable import POS_ADBD

/// #424 — one type ramp for the new UI, same numbers as Android `DS.TextSize`
final class TypeScaleTests: XCTestCase {
    func testRampIsTheBoardScale() {
        XCTAssertEqual(DS.TextSize.title, 24)
        XCTAssertEqual(DS.TextSize.amount, 20)
        XCTAssertEqual(DS.TextSize.name, 17)
        XCTAssertEqual(DS.TextSize.input, 16)
        XCTAssertEqual(DS.TextSize.body, 15)
        XCTAssertEqual(DS.TextSize.secondary, 14)
        XCTAssertEqual(DS.TextSize.pill, 12)
    }

    func testNoElevenOrThirteenAndTwelveIsTheMinimum() {
        let ramp = [DS.TextSize.title, DS.TextSize.amount, DS.TextSize.name, DS.TextSize.input,
                    DS.TextSize.body, DS.TextSize.secondary, DS.TextSize.pill]
        XCTAssertFalse(ramp.contains(11))
        XCTAssertFalse(ramp.contains(13))
        XCTAssertEqual(ramp.min(), 12)
    }

    func testListRhythm() {
        XCTAssertEqual(DS.Gap.line, 5)
        XCTAssertEqual(DS.Gap.lineTight, 4)
        XCTAssertEqual(DS.Gap.orderRowVertical, 15)
        XCTAssertEqual(DS.Gap.rowHorizontal, 16)
        XCTAssertEqual(DS.Gap.productRow, 14)
        XCTAssertEqual(DS.Gap.productRowMinHeight, 96)
    }

    func testV2LabelUsesTheTokenSize() {
        let label = V2.label("Trần Văn Minh", size: DS.TextSize.name, weight: .bold)
        XCTAssertEqual(label.font.pointSize, 17)
    }
}
