//
//  AppConfigService.swift
//  POS ADBD
//
//  Loads the app config (#370). A failed call falls back to the last good config, so the app never blocks on it.
//

import Foundation

final class AppConfigService: BaseService {
    static let shared = AppConfigService()

    private let cacheKey = "AppConfigCache"
    /// The API answers with `max-age=300`; skipping `URLCache` makes a flag change apply on the next launch (#388)
    static let cachePolicy: URLRequest.CachePolicy = .reloadIgnoringLocalCacheData

    /// Last good config from a previous call (kept across logouts so a forced update survives them)
    var cached: AppConfig? {
        UserDefaults.standard.retrieve(object: AppConfig.self, fromKey: cacheKey)
    }

    /// Calls back on the main queue with the latest config, the cached one on failure, or nil
    func fetch(completion: @escaping (AppConfig?) -> Void) {
        performGET(
            path: APIEndpoint.Path.appConfig,
            responseType: APIResponse<AppConfig>.self,
            context: "AppConfigService.fetch",
            cachePolicy: Self.cachePolicy
        ) { [weak self] response, _ in
            guard let self else { return }
            let config: AppConfig?
            if let response, response.success, let data = response.data {
                UserDefaults.standard.save(customObject: data, inKey: self.cacheKey)
                config = data
            } else {
                config = self.cached
            }
            DispatchQueue.main.async { completion(config) }
        }
    }
}
