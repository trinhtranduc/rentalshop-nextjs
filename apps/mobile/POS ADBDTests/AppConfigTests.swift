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
        XCTAssertEqual(config.features, [.newOrders])
        XCTAssertTrue(config.updateRequired(currentVersion: "1.1.3"))
        XCTAssertFalse(config.updateRequired(currentVersion: "1.2.0"))
    }

    func testMissingFieldsAreSafeDefaults() throws {
        let config = try JSONDecoder.shared.decode(AppConfig.self, from: "{}".data(using: .utf8)!)
        XCTAssertEqual(config.ios.minVersion, "0.0.0")
        XCTAssertTrue(config.features.isEmpty)
        XCTAssertFalse(config.updateRequired(currentVersion: "1.1.3"))
    }

    func testCacheRoundTrip() throws {
        let config = AppConfig(ios: PlatformConfig(minVersion: "1.2.0", storeUrl: "https://apps.apple.com/app/id1"), features: [.newCalendar])
        let data = try JSONEncoder.shared.encode(config)
        XCTAssertEqual(try JSONDecoder.shared.decode(AppConfig.self, from: data), config)
    }
}
