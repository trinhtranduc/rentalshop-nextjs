import XCTest
@testable import POS_ADBD

/// #1394: which bubble a screen owes, in the order of the tab "★ Cầm tay: đơn đầu tiên"
final class FirstRunCoachTests: XCTestCase {
    private let empty = CoachCart(hasCustomer: false, isSale: false, hasDates: false, isEditing: false)
    private let withCustomer = CoachCart(hasCustomer: true, isSale: false, hasDates: false, isEditing: false)
    private let ready = CoachCart(hasCustomer: true, isSale: false, hasDates: true, isEditing: false)

    func testNoBubbleWithoutARun() {
        for screen: CoachScreen in [.productForm, .cart, .customerPicker, .newCustomer] {
            XCTAssertNil(FirstRunCoachRules.next(run: nil, screen: screen, shown: [], cart: empty))
        }
    }

    func testThereAreSixBubblesOnFourScreens() {
        XCTAssertEqual(CoachBubble.allCases.count, 6)
        XCTAssertEqual(Set(CoachBubble.allCases.map(\.anchor)).count, 6, "each lights its own control")
        XCTAssertEqual(CoachBubble.allCases.map(\.step), [1, 2, 2, 2, 3, 3])
    }

    func testProductRowOnlyHasTheForm() {
        XCTAssertEqual(FirstRunCoachRules.next(run: .product, screen: .productForm, shown: []), .productName)
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .cart, shown: [], cart: empty))
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .customerPicker, shown: []))
    }

    func testOrderRunWalksTheCart() {
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [], cart: empty), .cartCustomer)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .customerPicker, shown: [.cartCustomer]), .pickerNew)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .newCustomer, shown: [.cartCustomer, .pickerNew]), .newCustomerFields)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [.cartCustomer], cart: withCustomer), .cartDates)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [.cartCustomer, .cartDates], cart: ready), .cartCreate)
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .productForm, shown: []))
    }

    func testBothCartRowsStartTheSameRun() {
        XCTAssertEqual(CoachRun(step: .product), .product)
        XCTAssertEqual(CoachRun(step: .customer), .order)
        XCTAssertEqual(CoachRun(step: .order), .order)
    }

    func testASaleSkipsTheDates() {
        let sale = CoachCart(hasCustomer: true, isSale: true, hasDates: false, isEditing: false)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [.cartCustomer], cart: sale), .cartCreate)
    }

    func testAClosedBubbleDoesNotComeBack() {
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [.cartCustomer], cart: empty))
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [.cartCustomer], cart: withCustomer), .cartDates,
                       "the next one still shows once the customer is chosen")
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .productForm, shown: [.productName]))
    }

    func testPickerBubbleOnlyWhenTheShopHasNoCustomer() {
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .customerPicker, shown: [], customersExist: true))
    }

    func testAnOrderBeingEditedGetsNoBubble() {
        let editing = CoachCart(hasCustomer: false, isSale: false, hasDates: false, isEditing: true)
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [], cart: editing))
    }

    func testIPadIsCardOnly() {
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .productForm, shown: [], isPad: true))
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .cart, shown: [], cart: empty, isPad: true))
    }

    func testBubblesAnchorOnStableIdentifiers() {
        XCTAssertEqual(CoachBubble.cartDates.anchor, "cart.datesRow")
        XCTAssertEqual(CoachBubble.cartCreate.anchor, "cart.cta")
        XCTAssertTrue(CoachBubble.cartCreate.prefersAbove)
        XCTAssertFalse(CoachBubble.cartCustomer.prefersAbove)
    }

    func testBubbleTextsExistInBothLanguages() throws {
        for code in ["en", "vi-VN"] {
            let bundle = try XCTUnwrap(Bundle(for: FirstRunGuideTracker.self).path(forResource: code, ofType: "lproj").flatMap(Bundle.init(path:)))
            for bubble in CoachBubble.allCases {
                XCTAssertNotEqual(bundle.localizedString(forKey: bubble.textKey, value: "MISSING", table: nil), "MISSING", "\(code) \(bubble)")
            }
        }
    }
}
