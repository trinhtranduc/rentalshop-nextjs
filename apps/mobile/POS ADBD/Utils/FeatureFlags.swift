//
//  FeatureFlags.swift
//  POS ADBD
//
//  Redesigned screens switched on from the server (`features` of the app config, #370).
//  Everything is off until a config says otherwise.
//

import Foundation

final class FeatureFlags {
    static let shared = FeatureFlags()

    private(set) var enabled: Set<MobileFeature>

    private init() {
        enabled = AppConfigService.shared.cached?.features ?? []
    }

    func isOn(_ feature: MobileFeature) -> Bool {
        enabled.contains(feature)
    }

    func update(_ features: Set<MobileFeature>) {
        enabled = features
    }
}
