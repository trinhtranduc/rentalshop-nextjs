import XCTest
@testable import POS_ADBD

/// #386 — validation, register payload, error placement and resend cooldown of the new auth screens
final class AuthFormsTests: XCTestCase {

    // MARK: - Login

    func testLoginRequiresEmailAndPassword() {
        let errors = AuthValidation.login(email: "", password: "")
        XCTAssertEqual(errors[.email], "Email is required")
        XCTAssertEqual(errors[.password], "Password is required")
    }

    func testLoginRejectsBadEmailAndShortPassword() {
        let errors = AuthValidation.login(email: "lan@", password: "12345")
        XCTAssertEqual(errors[.email], "Please enter a valid email address")
        XCTAssertEqual(errors[.password], "Password must be at least 6 characters")
    }

    func testLoginAcceptsValidInputWithSurroundingSpaces() {
        XCTAssertTrue(AuthValidation.login(email: " lan@aodaiminhchau.vn ", password: "matkhau123").isEmpty)
    }

    // MARK: - Forgot

    func testForgotValidatesEmailOnly() {
        XCTAssertEqual(AuthValidation.forgot(email: "")[.email], "Email is required")
        XCTAssertEqual(AuthValidation.forgot(email: "abc")[.email], "Please enter a valid email address")
        XCTAssertTrue(AuthValidation.forgot(email: "a@b.vn").isEmpty)
    }

    // MARK: - Step 1

    func testStoreStepRequiresEveryField() {
        let errors = AuthValidation.storeStep(storeName: " ", phone: "", address: "")
        XCTAssertEqual(errors[.storeName], "Store name is required")
        XCTAssertEqual(errors[.phone], "Phone number is required")
        XCTAssertEqual(errors[.address], "Location is required")
    }

    func testStoreStepMinimumsAndPhoneFormat() {
        let errors = AuthValidation.storeStep(storeName: "AB", phone: "09012", address: "Q1")
        XCTAssertEqual(errors[.storeName], "Store name must be at least 3 characters")
        XCTAssertEqual(errors[.phone], "Please enter a valid phone number")
        XCTAssertEqual(errors[.address], "Please enter a valid location (City, Province)")
    }

    func testStoreStepAcceptsSpacedPhone() {
        let errors = AuthValidation.storeStep(storeName: "Áo dài Minh Châu", phone: "0901 234 567", address: "12 Lê Lợi, Q1")
        XCTAssertTrue(errors.isEmpty)
        XCTAssertEqual(AuthValidation.normalizedPhone("0901 234 567"), "0901234567")
        XCTAssertEqual(AuthValidation.normalizedPhone("+84.901-234-567"), "+84901234567")
    }

    // MARK: - Step 2

    func testOwnerStepRequiredFieldsAndTerms() {
        let errors = AuthValidation.ownerStep(fullName: "", email: "", password: "", confirm: "", termsAccepted: false)
        XCTAssertEqual(errors[.fullName], "Name is required")
        XCTAssertEqual(errors[.email], "Email is required")
        XCTAssertEqual(errors[.password], "Password is required")
        XCTAssertEqual(errors[.confirmPassword], "Please confirm your password")
        XCTAssertEqual(errors[.terms], "Please accept the Privacy Policy and Terms of Service to continue.")
    }

    func testOwnerStepPasswordLengthAndMismatch() {
        let errors = AuthValidation.ownerStep(fullName: "Lan", email: "lan@a.vn", password: "matkhau123",
                                              confirm: "matkhau12", termsAccepted: true)
        XCTAssertEqual(Array(errors.keys), [.confirmPassword])
        XCTAssertEqual(errors[.confirmPassword], "authv2.passwordsMismatch")

        let short = AuthValidation.ownerStep(fullName: "L", email: "lan@a.vn", password: "12345", confirm: "12345", termsAccepted: true)
        XCTAssertEqual(short[.fullName], "Name must be at least 2 characters")
        XCTAssertEqual(short[.password], "Password must be at least 6 characters")
        XCTAssertNil(short[.confirmPassword])
    }

    func testOwnerStepValid() {
        XCTAssertTrue(AuthValidation.ownerStep(fullName: "Nguyễn Thị Lan", email: "lan@a.vn", password: "123456",
                                               confirm: "123456", termsAccepted: true).isEmpty)
    }

    // MARK: - Chips

    func testTagRulesMatchCurrentSignUp() {
        var tags = BusinessTagRules.initial
        XCTAssertEqual(tags, ["OTHER"])
        tags = BusinessTagRules.toggle("AO_DAI", in: tags)
        XCTAssertEqual(tags, ["AO_DAI"], "a niche replaces OTHER")
        tags = BusinessTagRules.toggle("WEDDING_DRESS", in: tags)
        XCTAssertEqual(tags, ["AO_DAI", "WEDDING_DRESS"])
        tags = BusinessTagRules.toggle("AO_DAI", in: tags)
        tags = BusinessTagRules.toggle("WEDDING_DRESS", in: tags)
        XCTAssertEqual(tags, ["WEDDING_DRESS"], "the last chip stays on")
        tags = BusinessTagRules.toggle("OTHER", in: tags)
        XCTAssertEqual(tags, ["WEDDING_DRESS", "OTHER"])
    }

    func testChipsUseApiValues() {
        let apiValues = Set(BusinessTagRules.options.map(\.apiValue))
        XCTAssertEqual(apiValues, Set(BusinessTagRules.catalog))
    }

    // MARK: - Payload

    func testRegisterRequestFromBothSteps() {
        var draft = RegisterDraft()
        draft.storeName = " Áo dài Minh Châu "
        draft.phone = "0901 234 567"
        draft.address = "12 Lê Lợi, Q1 "
        draft.tags = ["WEDDING_DRESS", "AO_DAI"]
        draft.fullName = "Nguyễn Thị Lan"
        draft.email = " lan@aodaiminhchau.vn"
        draft.password = "matkhau123"
        draft.confirmPassword = "matkhau123"
        draft.termsAccepted = true

        XCTAssertTrue(draft.storeErrors.isEmpty)
        XCTAssertTrue(draft.ownerErrors.isEmpty)
        XCTAssertEqual(draft.request, RegisterRequest(
            loginName: "lan@aodaiminhchau.vn",
            password: "matkhau123",
            storeName: "Áo dài Minh Châu",
            address: "12 Lê Lợi, Q1",
            name: "Nguyễn Thị Lan",
            phone: "0901234567",
            businessTags: ["AO_DAI", "WEDDING_DRESS"]
        ))
    }

    func testDefaultDraftSendsOther() {
        XCTAssertEqual(RegisterDraft().request.businessTags, ["OTHER"])
        XCTAssertEqual(BusinessTagRules.payload([]), ["OTHER"])
    }

    // MARK: - Errors

    func testErrorPlacement() {
        XCTAssertEqual(AuthErrorPlacement.login(status: 401), .field(.password))
        XCTAssertEqual(AuthErrorPlacement.login(status: 403), .alert)
        XCTAssertEqual(AuthErrorPlacement.login(status: 500), .alert)
        XCTAssertEqual(AuthErrorPlacement.register(status: 409), .field(.email))
        XCTAssertEqual(AuthErrorPlacement.register(status: 400), .alert)
    }

    // MARK: - Cooldown

    func testResendCooldown() {
        let t0 = Date(timeIntervalSince1970: 1_000)
        var cooldown = ResendCooldown(seconds: 60)
        XCTAssertTrue(cooldown.canResend(now: t0))
        XCTAssertEqual(cooldown.remaining(now: t0), 0)

        cooldown.start(now: t0)
        XCTAssertFalse(cooldown.canResend(now: t0))
        XCTAssertEqual(cooldown.remaining(now: t0), 60)
        XCTAssertEqual(cooldown.remaining(now: t0.addingTimeInterval(0.4)), 60)
        XCTAssertEqual(cooldown.remaining(now: t0.addingTimeInterval(59.5)), 1)
        XCTAssertTrue(cooldown.canResend(now: t0.addingTimeInterval(60)))
    }
}
