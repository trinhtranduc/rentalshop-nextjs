import XCTest
@testable import POS_ADBD

/// #1394, #1411: which bubble a screen owes, Tiếp, and the counter, in the order the owner chose: 9 steps
final class FirstRunCoachTests: XCTestCase {
    private func cart(_ customer: Bool = false, sale: Bool = false, dates: Bool = false, editing: Bool = false, empty: Bool = false) -> CoachCart {
        CoachCart(isEmpty: empty, hasCustomer: customer, isSale: sale, hasDates: dates, isEditing: editing)
    }

    // MARK: - The plan and its totals

    func testNineBubblesInTheOwnersOrder() {
        XCTAssertEqual(CoachPlan().bubbles, [.productPhoto, .productName, .productPrice, .productSave, .cartCustomer,
                                             .newCustomer, .newCustomerSave, .cartDates, .cartCreate])
    }

    func testTotalsForEveryShop() {
        XCTAssertEqual(CoachPlan().bubbles.count, 9, "rent, no customers")
        XCTAssertEqual(CoachPlan(customersExist: true).bubbles.count, 7, "rent, picks from the list")
        XCTAssertEqual(CoachPlan(isSale: true).bubbles.count, 8, "sale has no dates")
        XCTAssertEqual(CoachPlan(customersExist: true, isSale: true).bubbles.count, 6)
    }

    func testCounterIsThePositionInThePlan() {
        XCTAssertEqual(CoachPlan().counter(.productPhoto), "1/9")
        XCTAssertEqual(CoachPlan().counter(.cartCreate), "9/9")
        XCTAssertEqual(CoachPlan(customersExist: true).counter(.cartCustomer), "5/7")
        XCTAssertEqual(CoachPlan(customersExist: true).counter(.cartDates), "6/7")
        XCTAssertEqual(CoachPlan(customersExist: true).counter(.cartCreate), "7/7")
        XCTAssertEqual(CoachPlan(isSale: true).counter(.cartCreate), "8/8")
        XCTAssertEqual(CoachPlan(customersExist: true, isSale: true).counter(.cartCreate), "6/6")
        XCTAssertNil(CoachPlan(customersExist: true).counter(.newCustomer))
        XCTAssertNil(CoachPlan(isSale: true).counter(.cartDates))
    }

    // MARK: - Which bubble

    func testNoBubbleWithoutARun() {
        for screen: CoachScreen in [.productForm, .cart, .customerPicker, .newCustomer] {
            XCTAssertNil(FirstRunCoachRules.next(run: nil, screen: screen, passed: [], cart: cart()))
        }
    }

    func testProductFormWalksFourBubblesAsTiepMovesOn() {
        var passed = Set<CoachBubble>()
        for bubble: CoachBubble in [.productPhoto, .productName, .productPrice, .productSave] {
            XCTAssertEqual(FirstRunCoachRules.next(run: .product, screen: .productForm, passed: passed), bubble)
            passed.insert(bubble)
        }
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .productForm, passed: passed))
    }

    func testProductRunHasOnlyTheForm() {
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .cart, passed: [], cart: cart()))
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .customerPicker, passed: []))
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .productForm, passed: []))
    }

    func testARowWithNoProductOpensTheFormSoTheRunIsTheProductRun() {
        XCTAssertEqual(CoachRun(action: .openProductForm), .product)
        XCTAssertEqual(CoachRun(action: .openCart(addFirstProduct: true)), .order)
    }

    func testOrderRunWalksTheCartByItsData() {
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart()), .cartCustomer)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .customerPicker, passed: []), .newCustomer)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .newCustomer, passed: []), .newCustomer)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .newCustomer, passed: [.newCustomer]), .newCustomerSave)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart(true)), .cartDates)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart(true, dates: true)), .cartCreate)
    }

    func testGoingBackToTheCartResumesWhereTheDataIs() {
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart()), .cartCustomer,
                       "back from the picker with no customer: the same bubble again")
    }

    func testAShopWithCustomersHasNoCreationBubbles() {
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .customerPicker, passed: [], customersExist: true))
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .newCustomer, passed: [], customersExist: true))
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart(), customersExist: true), .cartCustomer)
    }

    func testASaleSkipsTheDates() {
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart(true, sale: true)), .cartCreate)
    }

    func testAMissingControlSkipsItsBubbleSilently() {
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [.cartDates], cart: cart(true)), .cartCreate)
        XCTAssertEqual(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [.cartCustomer], cart: cart()), .cartDates)
        XCTAssertEqual(FirstRunCoachRules.next(run: .product, screen: .productForm, passed: [.productPhoto]), .productName)
    }

    func testAnOrderBeingEditedOrJustCreatedGetsNoBubble() {
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart(editing: true)))
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart(empty: true)))
    }

    func testIPadIsCardOnly() {
        XCTAssertNil(FirstRunCoachRules.next(run: .product, screen: .productForm, passed: [], isPad: true))
        XCTAssertNil(FirstRunCoachRules.next(run: .order, screen: .cart, passed: [], cart: cart(), isPad: true))
    }

    // MARK: - Tiếp

    func testTiepActsOnlyWhereThereIsAFieldToFill() {
        for bubble: CoachBubble in [.productPhoto, .productName, .productPrice] {
            XCTAssertTrue(bubble.nextAdvances(on: .productForm), bubble.rawValue)
        }
        XCTAssertTrue(CoachBubble.newCustomer.nextAdvances(on: .newCustomer))
        XCTAssertFalse(CoachBubble.newCustomer.nextAdvances(on: .customerPicker), "Khách mới is a real button")
        for bubble: CoachBubble in [.productSave, .cartCustomer, .newCustomerSave, .cartDates, .cartCreate] {
            XCTAssertFalse(bubble.nextAdvances(on: .productForm), "\(bubble) never acts for the user")
            XCTAssertFalse(bubble.nextAdvances(on: .cart), "\(bubble) never acts for the user")
        }
    }

    func testPhotoNeedsOne() {
        XCTAssertFalse(FirstRunCoachRules.photoIsValid(count: 0))
        XCTAssertTrue(FirstRunCoachRules.photoIsValid(count: 1))
    }

    func testPriceNeedsOneOfTheTwoAboveZero() {
        XCTAssertFalse(FirstRunCoachRules.priceIsValid(perRental: nil, perDay: nil))
        XCTAssertFalse(FirstRunCoachRules.priceIsValid(perRental: 0, perDay: 0))
        XCTAssertTrue(FirstRunCoachRules.priceIsValid(perRental: 1_000, perDay: nil))
        XCTAssertTrue(FirstRunCoachRules.priceIsValid(perRental: 0, perDay: 500))
    }

    func testTheNormalFormStaysPhotoOptionalAndSavesZero() {
        let input = ProductFormInput(name: "Áo", perRental: nil, perDay: nil, defaultMode: .perRental, block: nil, salePrice: nil,
                                     deposit: nil, quantity: 1, rented: 0, photoCount: 0, showsPrices: true)
        XCTAssertTrue(ProductFormValidator.validate(input).isEmpty, "the guide's rules stay inside the guide")
    }

    func testCustomerStepUsesTheFormsOwnRuleAndNoOther() {
        XCTAssertNotNil(CustomersV2Logic.validate(name: "Lan", phone: ""))
        XCTAssertNotNil(CustomersV2Logic.validate(name: "", phone: "0912"))
        XCTAssertNil(CustomersV2Logic.validate(name: "Lan", phone: "1"), "no length rule")
    }

    // MARK: - Camera

    func testCameraRoute() {
        XCTAssertEqual(FirstRunCoachRules.cameraRoute(authorized: true, undetermined: false), .open)
        XCTAssertEqual(FirstRunCoachRules.cameraRoute(authorized: false, undetermined: true), .ask)
        XCTAssertEqual(FirstRunCoachRules.cameraRoute(authorized: false, undetermined: false), .denied)
    }

    // MARK: - Anchors and strings

    func testBubblesAnchorOnStableIdentifiers() {
        XCTAssertEqual(CoachBubble.newCustomer.anchor(on: .customerPicker), "customers.picker.new")
        XCTAssertEqual(CoachBubble.newCustomer.anchor(on: .newCustomer), "customers.new.fields")
        XCTAssertEqual(CoachBubble.cartDates.anchor(on: .cart), "cart.datesRow")
        XCTAssertEqual(CoachBubble.cartCreate.anchor(on: .cart), "cart.cta")
        XCTAssertTrue(CoachBubble.cartCreate.prefersAbove)
        XCTAssertFalse(CoachBubble.cartCustomer.prefersAbove)
    }

    func testBubbleTextsExistInBothLanguages() throws {
        for code in ["en", "vi-VN"] {
            let bundle = try XCTUnwrap(Bundle(for: FirstRunGuideTracker.self).path(forResource: code, ofType: "lproj").flatMap(Bundle.init(path:)))
            let keys = CoachBubble.allCases.map(\.textKey) + ["firstRunGuide.next", "firstRunGuide.exit", "firstRunGuide.exit.discard", "firstRunGuide.exit.discard.action"]
            for key in keys {
                XCTAssertNotEqual(bundle.localizedString(forKey: key, value: "MISSING", table: nil), "MISSING", "\(code) \(key)")
            }
            XCTAssertEqual(bundle.localizedString(forKey: "firstRunGuide.bubble.step", value: "MISSING", table: nil), "MISSING")
        }
    }
}
