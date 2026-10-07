import XCTest
@testable import POS_ADBD

/// #370 — app config decoding, version comparison and the minimum-version check
final class AppConfigTests: XCTestCase {
    func testVersionCompare() {
        XCTAssertLessThan(AppVersion.compare("1.1.3", "1.2.0"), 0)
        XCTAssertGreaterThan(AppVersion.compare("1.10.0", "1.9.9"), 0)
        XCTAssertEqual(AppVersion.compare("1.2", "1.2.0"), 0)
        XCTAssertEqual(AppVersion.compare("1.2.0-beta", "1.2.0"), 0)
    }

    func testDecodesTheApiResponse() throws {
        let json = """
        {"success":true,"code":"APP_CONFIG_SUCCESS","data":{
          "ios":{"minVersion":"1.2.0","latestVersion":"1.3.0","storeUrl":null},
          "android":{"minVersion":"0.0.0","latestVersion":"0.1.3","storeUrl":"https://play.google.com/store/apps/details?id=anyrent.shop"},
          "features":{"newOrders":true,"newOrderDetail":false,"somethingNew":true}}}
        """.data(using: .utf8)!
        let response = try JSONDecoder.shared.decode(APIResponse<AppConfig>.self, from: json)
        let config = try XCTUnwrap(response.data)
        XCTAssertEqual(config.ios.minVersion, "1.2.0")
        XCTAssertNil(config.ios.storeUrl)
        // #456: only an explicit false turns a screen off; keys the server does not send stay on
        XCTAssertEqual(config.features, Set(MobileFeature.allCases).subtracting([.newOrderDetail]))
        XCTAssertTrue(config.updateRequired(currentVersion: "1.1.3"))
        XCTAssertFalse(config.updateRequired(currentVersion: "1.2.0"))
    }

    func testMissingFieldsAreSafeDefaults() throws {
        let config = try JSONDecoder.shared.decode(AppConfig.self, from: "{}".data(using: .utf8)!)
        XCTAssertEqual(config.ios.minVersion, "0.0.0")
        // #456: a config without `features` (an API that does not send them) keeps every new screen on
        XCTAssertEqual(config.features, Set(MobileFeature.allCases))
        XCTAssertFalse(config.updateRequired(currentVersion: "1.1.3"))
    }

    /// #456 — first launch (no cached config) shows every new screen, including LoginV2
    func testFeatureFlagsDefaultOnWithoutCache() {
        let flags = FeatureFlags(cached: nil)
        for feature in MobileFeature.allCases {
            XCTAssertTrue(flags.isOn(feature), "\(feature) should be on without a cached config")
        }
        XCTAssertTrue(flags.isOn(.newAuth))
    }

    /// #456 — a config that says false still turns that screen off
    func testExplicitFalseTurnsAScreenOff() throws {
        let json = #"{"features":{"newAuth":false,"newOrders":true}}"#.data(using: .utf8)!
        let config = try JSONDecoder.shared.decode(AppConfig.self, from: json)
        let flags = FeatureFlags(cached: config)
        XCTAssertFalse(flags.isOn(.newAuth))
        XCTAssertTrue(flags.isOn(.newOrders))
        XCTAssertTrue(flags.isOn(.newCalendar))
    }

    /// #456 — the API default (MOBILE_FEATURES unset) sends every flag true; `none` sends every flag false
    func testAllTrueAndAllFalseConfigs() throws {
        func decode(_ on: Bool) throws -> AppConfig {
            let map = MobileFeature.allCases.map { "\"\($0.rawValue)\":\(on)" }.joined(separator: ",")
            return try JSONDecoder.shared.decode(AppConfig.self, from: "{\"features\":{\(map)}}".data(using: .utf8)!)
        }
        XCTAssertEqual(try decode(true).features, Set(MobileFeature.allCases))
        XCTAssertTrue(try decode(false).features.isEmpty)
    }

    func testCacheRoundTrip() throws {
        let config = AppConfig(ios: PlatformConfig(minVersion: "1.2.0", storeUrl: "https://apps.apple.com/app/id1"), features: [.newCalendar])
        let data = try JSONEncoder.shared.encode(config)
        XCTAssertEqual(try JSONDecoder.shared.decode(AppConfig.self, from: data), config)
    }
}
