//
//  FeatureFlags.swift
//  POS ADBD
//
//  Redesigned screens switched on from the server (`features` of the app config, #370).
//  #456: every new screen is on until a config says `false` for it (first launch has no cached config).
//

import Foundation

final class FeatureFlags {
    static let shared = FeatureFlags()

    private(set) var enabled: Set<MobileFeature>

    private convenience init() {
        self.init(cached: AppConfigService.shared.cached)
    }

    /// Flags from the last good config; without one (first launch, no successful fetch yet) every screen is on
    init(cached: AppConfig?) {
        enabled = cached?.features ?? Set(MobileFeature.allCases)
    }

    func isOn(_ feature: MobileFeature) -> Bool {
        enabled.contains(feature)
    }

    func update(_ features: Set<MobileFeature>) {
        enabled = features
    }
}
