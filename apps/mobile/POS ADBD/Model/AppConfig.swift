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

/// New screens that can be switched on from the server (`MOBILE_FEATURES` on the API)
enum MobileFeature: String, CaseIterable, Codable {
    case newOrders, newOrderDetail, newProducts, newCalendar, newOverview, newSettings
}

struct AppConfig: Codable, Equatable {
    var ios = PlatformConfig()
    var android = PlatformConfig()
    var features: Set<MobileFeature> = []

    enum CodingKeys: String, CodingKey { case ios, android, features }

    init(ios: PlatformConfig = PlatformConfig(), android: PlatformConfig = PlatformConfig(), features: Set<MobileFeature> = []) {
        self.ios = ios
        self.android = android
        self.features = features
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        ios = try container.decodeIfPresent(PlatformConfig.self, forKey: .ios) ?? PlatformConfig()
        android = try container.decodeIfPresent(PlatformConfig.self, forKey: .android) ?? PlatformConfig()
        // `features` is a map of flag → Bool; unknown flags are ignored
        let flags = (try? container.decodeIfPresent([String: Bool].self, forKey: .features)) ?? nil
        features = Set((flags ?? [:]).compactMap { key, on in on ? MobileFeature(rawValue: key) : nil })
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(ios, forKey: .ios)
        try container.encode(android, forKey: .android)
        let flags = Dictionary(uniqueKeysWithValues: MobileFeature.allCases.map { ($0.rawValue, features.contains($0)) })
        try container.encode(flags, forKey: .features)
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
