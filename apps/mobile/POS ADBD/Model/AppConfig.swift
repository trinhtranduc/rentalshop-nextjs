//
//  AppConfig.swift
//  POS ADBD
//
//  What `GET /api/mobile/app-config` tells the app (#370): the minimum version each platform must run
//  and which redesigned screens are switched on. The server only returns versions; the app compares them.
//

import Foundation

struct PlatformConfig: Codable, Equatable {
    var minVersion: String = "0.0.0"
    var latestVersion: String?
    var storeUrl: String?

    enum CodingKeys: String, CodingKey { case minVersion, latestVersion, storeUrl }

    init(minVersion: String = "0.0.0", latestVersion: String? = nil, storeUrl: String? = nil) {
        self.minVersion = minVersion
        self.latestVersion = latestVersion
        self.storeUrl = storeUrl
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let minimum = try container.decodeIfPresent(String.self, forKey: .minVersion) ?? ""
        minVersion = minimum.isEmpty ? "0.0.0" : minimum
        latestVersion = try container.decodeIfPresent(String.self, forKey: .latestVersion)
        storeUrl = try container.decodeIfPresent(String.self, forKey: .storeUrl).flatMap { $0.isEmpty ? nil : $0 }
    }
}

/// New screens switched by the server (`MOBILE_FEATURES` on the API). On by default (#456); a config that
/// says `false` for a screen turns it off and shows the old one.
enum MobileFeature: String, CaseIterable, Codable {
    case newOrders, newOrderDetail, newProducts, newCalendar, newOverview, newSettings, newAuth, newCustomers
}

struct AppConfig: Codable, Equatable {
    var ios = PlatformConfig()
    var android = PlatformConfig()
    var features: Set<MobileFeature> = Set(MobileFeature.allCases)
    /// #682: Nhân viên kho can be given in the user form (off until the API says `true`)
    var inventoryRole = false

    enum CodingKeys: String, CodingKey { case ios, android, features, inventoryRole }

    init(ios: PlatformConfig = PlatformConfig(), android: PlatformConfig = PlatformConfig(), features: Set<MobileFeature> = Set(MobileFeature.allCases)) {
        self.ios = ios
        self.android = android
        self.features = features
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ios = try container.decodeIfPresent(PlatformConfig.self, forKey: .ios) ?? PlatformConfig()
        android = try container.decodeIfPresent(PlatformConfig.self, forKey: .android) ?? PlatformConfig()
        // `features` is a map of flag → Bool; unknown flags are ignored. #456: only an explicit `false` turns a
        // screen off, so a missing map (an API without flags) or a missing key keeps it on
        let flags = (try? container.decodeIfPresent([String: Bool].self, forKey: .features)) ?? nil
        features = Set(MobileFeature.allCases.filter { flags?[$0.rawValue] ?? true })
        inventoryRole = ((try? container.decodeIfPresent(Bool.self, forKey: .inventoryRole)) ?? nil) ?? false
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(ios, forKey: .ios)
        try container.encode(android, forKey: .android)
        let flags = Dictionary(uniqueKeysWithValues: MobileFeature.allCases.map { ($0.rawValue, features.contains($0)) })
        try container.encode(flags, forKey: .features)
        try container.encode(inventoryRole, forKey: .inventoryRole)
    }

    /// True when this iOS build is older than the minimum the server asks for
    func updateRequired(currentVersion: String) -> Bool {
        AppVersion.compare(currentVersion, ios.minVersion) < 0
    }
}

enum AppVersion {
    /// Version of this build (`CFBundleShortVersionString`)
    static var current: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0.0.0"
    }

    /// Compares `x.y.z`; missing or non-numeric parts count as 0, suffixes like `-beta` are ignored
    static func compare(_ a: String, _ b: String) -> Int {
        let left = parts(a)
        let right = parts(b)
        for index in 0..<max(left.count, right.count) {
            let l = index < left.count ? left[index] : 0
            let r = index < right.count ? right[index] : 0
            if l != r { return l < r ? -1 : 1 }
        }
        return 0
    }

    private static func parts(_ version: String) -> [Int] {
        let core = version.trimmingCharacters(in: .whitespaces).split(separator: "-").first.map(String.init) ?? ""
        return core.split(separator: ".").map { Int($0) ?? 0 }
    }
}
