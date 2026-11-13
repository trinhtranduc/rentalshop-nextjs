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
        XCTAssertEqual(draft.request(timezone: "Asia/Ho_Chi_Minh"), RegisterRequest(
            loginName: "lan@aodaiminhchau.vn",
            password: "matkhau123",
            storeName: "Áo dài Minh Châu",
            address: "12 Lê Lợi, Q1",
            name: "Nguyễn Thị Lan",
            phone: "0901234567",
            businessTags: ["AO_DAI", "WEDDING_DRESS"],
            country: "Vietnam",
            language: "vi",
            currency: "VND",
            timezone: "Asia/Ho_Chi_Minh"
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

    // MARK: - Country, language, currency (#1539 (app))

    func testDraftDefaultsToVietnamVietnameseVnd() {
        let draft = RegisterDraft()
        XCTAssertEqual(draft.countryCode, "VN")
        XCTAssertEqual(draft.language, .vi)
        XCTAssertEqual(draft.currency, .vnd)
    }

    func testCountryDefaults() {
        XCTAssertEqual(SignupCountries.defaults(for: "VN").language, .vi)
        XCTAssertEqual(SignupCountries.defaults(for: "VN").currency, .vnd)
        XCTAssertEqual(SignupCountries.defaults(for: "vn").language, .vi)
        for code in ["US", "JP", "HK", "FR"] {
            XCTAssertEqual(SignupCountries.defaults(for: code).language, .en, code)
            XCTAssertEqual(SignupCountries.defaults(for: code).currency, .usd, code)
        }
    }

    func testPickingACountryResetsLanguageAndCurrencyUntilTheCountryChangesAgain() {
        var draft = RegisterDraft()
        draft.selectCountry("US")
        XCTAssertEqual(draft.countryCode, "US")
        XCTAssertEqual(draft.language, .en)
        XCTAssertEqual(draft.currency, .usd)

        draft.language = .vi
        draft.currency = .vnd
        draft.selectCountry("US")
        XCTAssertEqual(draft.language, .vi, "the same country keeps the manual choice")
        XCTAssertEqual(draft.currency, .vnd)

        draft.selectCountry("JP")
        XCTAssertEqual(draft.language, .en)
        XCTAssertEqual(draft.currency, .usd)

        draft.currency = .vnd
        draft.selectCountry("VN")
        XCTAssertEqual(draft.language, .vi)
        XCTAssertEqual(draft.currency, .vnd)
    }

    func testRequestSendsEnglishCountryNameLanguageCurrencyAndTimezone() {
        var draft = RegisterDraft()
        var request = draft.request(timezone: "Asia/Ho_Chi_Minh")
        XCTAssertEqual(request.country, "Vietnam")
        XCTAssertEqual(request.language, "vi")
        XCTAssertEqual(request.currency, "VND")
        XCTAssertEqual(request.timezone, "Asia/Ho_Chi_Minh")

        draft.selectCountry("US")
        request = draft.request(timezone: "America/New_York")
        XCTAssertEqual(request.country, "United States")
        XCTAssertEqual(request.language, "en")
        XCTAssertEqual(request.currency, "USD")
        XCTAssertEqual(request.timezone, "America/New_York")

        draft.selectCountry("JP")
        draft.language = .vi
        request = draft.request(timezone: "Asia/Tokyo")
        XCTAssertEqual(request.country, "Japan")
        XCTAssertEqual(request.language, "vi")
        XCTAssertEqual(request.currency, "USD")
        XCTAssertEqual(request.timezone, "Asia/Tokyo")

        draft.selectCountry("HK")
        XCTAssertEqual(draft.request(timezone: "Asia/Hong_Kong").country, "Hong Kong")
    }

    func testRequestWithoutArgumentUsesThePhoneTimeZone() {
        XCTAssertEqual(RegisterDraft().request.timezone, TimeZone.current.identifier)
    }

    func testRegisterBodyKeepsOldFieldsAndAddsTheNewOnes() throws {
        let body = AuthenticationService.registerParameters(
            loginName: "lan@a.vn", password: "matkhau123", storeName: "Áo dài Minh Châu", address: "12 Lê Lợi",
            name: "Nguyễn Thị Lan", phone: "0901234567", businessTags: ["AO_DAI", "WEDDING_DRESS"],
            country: "United States", language: "en", currency: "USD", timezone: "America/New_York")
        XCTAssertEqual(body["firstName"] as? String, "Nguyễn")
        XCTAssertEqual(body["lastName"] as? String, "Thị Lan")
        XCTAssertEqual(body["email"] as? String, "lan@a.vn")
        XCTAssertEqual(body["password"] as? String, "matkhau123")
        XCTAssertEqual(body["phone"] as? String, "0901234567")
        XCTAssertEqual(body["role"] as? String, "MERCHANT")
        XCTAssertEqual(body["businessName"] as? String, "Áo dài Minh Châu")
        XCTAssertEqual(body["outletName"] as? String, "Áo dài Minh Châu")
        XCTAssertEqual(body["address"] as? String, "12 Lê Lợi")
        XCTAssertEqual(Set(try XCTUnwrap(body["businessTags"] as? [String])), ["AO_DAI", "WEDDING_DRESS"])
        XCTAssertEqual(body["pricingType"] as? String, "FIXED")
        XCTAssertEqual(body["country"] as? String, "United States")
        XCTAssertEqual(body["language"] as? String, "en")
        XCTAssertEqual(body["currency"] as? String, "USD")
        XCTAssertEqual(body["timezone"] as? String, "America/New_York")
        XCTAssertEqual(body.count, 15)
    }

    func testRegisterBodyWithoutTheNewValuesIsTheOldBody() {
        let body = AuthenticationService.registerParameters(
            loginName: "lan@a.vn", password: "matkhau123", storeName: "Shop", address: "Q1",
            name: "Lan", phone: "0901234567", businessTags: [])
        XCTAssertEqual(Set(body.keys), ["firstName", "lastName", "email", "password", "phone", "role", "businessName",
                                        "outletName", "address", "businessTags", "pricingType"])
        XCTAssertEqual(body["lastName"] as? String, "")
        XCTAssertEqual(body["businessTags"] as? [String], ["OTHER"])
    }

    func testCountryListHas249CodesVietnamFirstRestSortedByName() {
        XCTAssertEqual(SignupCountries.codes.count, 249)
        XCTAssertEqual(Set(SignupCountries.codes).count, 249)
        for language in ["vi", "en"] {
            let list = SignupCountries.list(language: language)
            XCTAssertEqual(list.count, 249, language)
            XCTAssertEqual(Set(list.map(\.code)), Set(SignupCountries.codes), language)
            XCTAssertEqual(list.first?.code, "VN", language)
            let locale = Locale(identifier: language)
            for (a, b) in zip(list.dropFirst(), list.dropFirst(2)) {
                XCTAssertNotEqual(a.name.compare(b.name, options: [.caseInsensitive, .numeric, .widthInsensitive], range: nil, locale: locale),
                                  .orderedDescending, "\(language): \(a.name) before \(b.name)")
            }
        }
        XCTAssertEqual(SignupCountries.list(language: "vi").first?.name, "Việt Nam")
        XCTAssertEqual(SignupCountries.list(language: "en").first?.name, "Vietnam")
        // Locale-aware order: Åland sits with the A's, not after Z
        let english = SignupCountries.list(language: "en").map(\.code)
        XCTAssertEqual(Array(english[1...3]), ["AF", "AX", "AL"])
        XCTAssertEqual(english.last, "ZW")
    }

    func testCountryNamesFollowTheAppLanguage() {
        XCTAssertEqual(SignupCountries.name("US", language: "vi"), "Hoa Kỳ")
        XCTAssertEqual(SignupCountries.name("US", language: "en"), "United States")
        XCTAssertEqual(SignupCountries.name("JP", language: "vi"), "Nhật Bản")
        XCTAssertEqual(SignupCountries.name("XX", language: "vi"), "XX", "unknown code falls back to the code")
    }

    /// The English name is what the web stores (`countryEnglishName`): every country of the web `COUNTRIES` list
    func testEnglishNamesMatchTheWebList() {
        let web = "US|United States;CA|Canada;MX|Mexico;GB|United Kingdom;DE|Germany;FR|France;IT|Italy;ES|Spain;"
            + "NL|Netherlands;CH|Switzerland;SE|Sweden;NO|Norway;DK|Denmark;FI|Finland;AT|Austria;BE|Belgium;IE|Ireland;"
            + "PT|Portugal;AU|Australia;NZ|New Zealand;JP|Japan;KR|South Korea;SG|Singapore;HK|Hong Kong;TW|Taiwan;"
            + "MY|Malaysia;TH|Thailand;ID|Indonesia;PH|Philippines;VN|Vietnam;IN|India;CN|China;AE|United Arab Emirates;"
            + "SA|Saudi Arabia;IL|Israel;ZA|South Africa;EG|Egypt;MA|Morocco;NG|Nigeria;KE|Kenya;BR|Brazil;AR|Argentina;"
            + "CL|Chile;CO|Colombia;PE|Peru;UY|Uruguay;CR|Costa Rica;PA|Panama;GT|Guatemala;CU|Cuba;DO|Dominican Republic;"
            + "JM|Jamaica"
        let pairs = web.split(separator: ";").map { $0.split(separator: "|").map(String.init) }
        XCTAssertEqual(pairs.count, 52)
        for pair in pairs {
            XCTAssertEqual(SignupCountries.englishName(pair[0]), pair[1], pair[0])
        }
        XCTAssertEqual(SignupCountries.englishName("XX"), "XX")
    }

    func testSearchIgnoresCaseAndAccents() {
        let list = SignupCountries.list(language: "vi")
        XCTAssertEqual(SignupCountries.search("viet", in: list).first?.code, "VN")
        XCTAssertEqual(SignupCountries.search("VIỆT", in: list).first?.code, "VN")
        XCTAssertEqual(SignupCountries.search("  Việt nam ", in: list).map(\.code), ["VN"])
        XCTAssertTrue(SignupCountries.search("hoa ky", in: list).map(\.code).contains("US"))
        XCTAssertTrue(SignupCountries.search("duc", in: list).map(\.code).contains("DE"), "đ matches d")
        XCTAssertTrue(SignupCountries.search("united", in: list).map(\.code).contains("US"), "the English name matches too")
        XCTAssertEqual(SignupCountries.search("", in: list).count, 249)
        XCTAssertTrue(SignupCountries.search("zzzz", in: list).isEmpty)
        let english = SignupCountries.list(language: "en")
        let found = Set(SignupCountries.search("ja", in: english).map(\.code))
        XCTAssertTrue(found.isSuperset(of: ["JM", "AZ"]))
        XCTAssertEqual(SignupCountries.search("ja", in: english).map(\.code), english.map(\.code).filter(found.contains),
                       "matches keep the list order")
    }

    func testLanguageLabelsAndParsing() {
        XCTAssertEqual(SignupLanguage.vi.label, "Tiếng Việt")
        XCTAssertEqual(SignupLanguage.en.label, "English")
        XCTAssertEqual(SignupLanguage.parse(" EN "), .en)
        XCTAssertEqual(SignupLanguage.parse("vi"), .vi)
        XCTAssertNil(SignupLanguage.parse(nil))
        XCTAssertNil(SignupLanguage.parse(""))
        XCTAssertNil(SignupLanguage.parse("ja"))
    }

    // MARK: - Screens (#1539 (app))

    private func view<T: UIView>(_ id: String, in root: UIView) -> T? {
        if root.accessibilityIdentifier == id, let match = root as? T { return match }
        return root.subviews.lazy.compactMap { self.view(id, in: $0) as T? }.first
    }

    func testStepOneHasCountryLanguageAndCurrency() throws {
        let screen = RegisterStoreV2ViewController()
        screen.loadViewIfNeeded()
        let country: UIButton = try XCTUnwrap(view("signupCountry", in: screen.view))
        XCTAssertEqual(country.accessibilityValue, SignupCountries.name("VN", language: SignupCountries.appLanguage))
        let language: UIButton = try XCTUnwrap(view("signupLanguage", in: screen.view))
        XCTAssertTrue(language.showsMenuAsPrimaryAction)
        XCTAssertEqual(language.accessibilityValue, "Tiếng Việt")
        XCTAssertEqual(language.menu?.children.map(\.title), ["Tiếng Việt", "English"])
        let currency: UIButton = try XCTUnwrap(view("signupCurrency", in: screen.view))
        XCTAssertTrue(currency.showsMenuAsPrimaryAction)
        XCTAssertEqual(currency.accessibilityValue, "VND (đ)")
        XCTAssertEqual(currency.menu?.children.map(\.title), ["VND (đ)", "USD ($)"])
    }

    func testCountryPickerListsVietnamFirstAndFilters() throws {
        var picked: String?
        let picker = CountryPickerV2ViewController(selected: "VN") { picked = $0 }
        picker.loadViewIfNeeded()
        let search: UITextField = try XCTUnwrap(view("countrySearch", in: picker.view))
        let table: UITableView = try XCTUnwrap(picker.view.subviews.compactMap { $0 as? UITableView }.first)
        XCTAssertEqual(table.numberOfRows(inSection: 0), 249)
        let first = try XCTUnwrap(table.dataSource?.tableView(table, cellForRowAt: IndexPath(row: 0, section: 0)))
        XCTAssertEqual(first.accessibilityIdentifier, "country-VN")
        XCTAssertTrue(first.accessibilityTraits.contains(.selected))

        // The English name matches whatever the app language
        let searchBar = try XCTUnwrap(picker.view.subviews.compactMap { $0 as? UISearchBar }.first)
        search.text = "JAPAN"
        searchBar.delegate?.searchBar?(searchBar, textDidChange: "JAPAN")
        XCTAssertEqual(table.numberOfRows(inSection: 0), 1)
        let cell = try XCTUnwrap(table.dataSource?.tableView(table, cellForRowAt: IndexPath(row: 0, section: 0)))
        XCTAssertEqual(cell.accessibilityIdentifier, "country-JP")
        table.delegate?.tableView?(table, didSelectRowAt: IndexPath(row: 0, section: 0))
        XCTAssertEqual(picked, "JP")
    }
}
