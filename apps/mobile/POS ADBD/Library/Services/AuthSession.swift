//
//  AuthSession.swift
//  POS ADBD
//
//  Keeps the access token fresh with a refresh token and signs out when the
//  server says the session is gone (#344).
//

import Foundation
import Alamofire
import Security

// MARK: - Session used for every API call

enum AuthSession {
    /// Use instead of `AF` for API calls.
    /// - The interceptor refreshes the 1-hour access token shortly before it expires.
    /// - The monitor signs out on a 401 and passes the server code (SESSION_REPLACED, ...).
    static let shared = Session(interceptor: AuthInterceptor(), eventMonitors: [AuthEventMonitor()])
}

// MARK: - Token storage

enum AuthTokenStore {
    private static let keychainService = "com.rental.shop.auth"
    private static let refreshTokenAccount = "refreshToken"
    private static let clockSkewKey = "com.rental.shop.tokenClockSkew"

    /// Rotated on every refresh. Kept in the Keychain, this device only.
    static var refreshToken: String? {
        get { readKeychain(account: refreshTokenAccount) }
        set {
            if let value = newValue, !value.isEmpty {
                writeKeychain(value, account: refreshTokenAccount)
            } else {
                deleteKeychain(account: refreshTokenAccount)
            }
        }
    }

    /// Call when a new access token arrives (login or refresh).
    /// Remembers the server/device clock offset so expiry checks survive a wrong device clock.
    static func didReceiveAccessToken(_ token: String) {
        guard let issuedAt = JWTClaims(token: token)?.issuedAt else { return }
        UserDefaults.standard.set(issuedAt - Date().timeIntervalSince1970, forKey: clockSkewKey)
    }

    /// Stores a refreshed access token on the saved user.
    static func saveRefreshedAccessToken(_ token: String) {
        if let user = User.account() {
            user.token = token
            User.save(user: user)
        }
        didReceiveAccessToken(token)
    }

    /// True when the token expires within `margin` seconds on the server's clock.
    static func needsRefresh(_ token: String, margin: TimeInterval = 60) -> Bool {
        guard let expiresAt = JWTClaims(token: token)?.expiresAt else { return false }
        let skew = UserDefaults.standard.double(forKey: clockSkewKey)
        return Date().timeIntervalSince1970 + skew >= expiresAt - margin
    }

    static func clear() {
        deleteKeychain(account: refreshTokenAccount)
        UserDefaults.standard.removeObject(forKey: clockSkewKey)
    }

    private static func baseQuery(account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: account,
        ]
    }

    private static func readKeychain(account: String) -> String? {
        var query = baseQuery(account: account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    private static func writeKeychain(_ value: String, account: String) {
        let data = Data(value.utf8)
        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let status = SecItemUpdate(baseQuery(account: account) as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var query = baseQuery(account: account)
            query.merge(attributes) { _, new in new }
            SecItemAdd(query as CFDictionary, nil)
        }
    }

    private static func deleteKeychain(account: String) {
        SecItemDelete(baseQuery(account: account) as CFDictionary)
    }
}

// MARK: - JWT claims (no signature check; only used to schedule a refresh)

struct JWTClaims {
    let issuedAt: TimeInterval?
    let expiresAt: TimeInterval?

    init?(token: String) {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return nil }
        var base64 = String(parts[1])
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        guard let data = Data(base64Encoded: base64),
              let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { return nil }
        issuedAt = (json["iat"] as? NSNumber)?.doubleValue
        expiresAt = (json["exp"] as? NSNumber)?.doubleValue
    }
}

// MARK: - Refresh (one at a time)

final class TokenRefresher {
    static let shared = TokenRefresher()

    private let queue = DispatchQueue(label: "com.rental.shop.token-refresh")
    private var waiters: [(Bool) -> Void] = []
    private var inFlight = false

    /// Calls back `true` when a new access token was saved. Concurrent callers share one request.
    func refresh(completion: @escaping (Bool) -> Void) {
        queue.async {
            self.waiters.append(completion)
            guard !self.inFlight else { return }
            self.inFlight = true
            self.performRefresh()
        }
    }

    private func performRefresh() {
        guard let refreshToken = AuthTokenStore.refreshToken else {
            finish(success: false)
            return
        }
        let url = APIEndpoint.currentBaseURL + APIEndpoint.Path.mobileRefresh
        let params: [String: Any] = [
            "refreshToken": refreshToken,
            "deviceId": PushNotificationManager.shared.deviceId,
        ]
        var headers = BaseService.jsonHeader
        headers.remove(name: "Authorization")

        // Plain Alamofire session on purpose: the refresh call must not pass through AuthInterceptor.
        Alamofire.AF.request(url, method: .post, parameters: params, encoding: JSONEncoding.default, headers: headers)
            .responseData(queue: queue) { response in
                let json = response.data.flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] }
                let data = json?["data"] as? [String: Any]
                if response.response?.statusCode == 200,
                   let token = data?["token"] as? String,
                   let newRefreshToken = data?["refreshToken"] as? String {
                    AuthTokenStore.refreshToken = newRefreshToken
                    AuthTokenStore.saveRefreshedAccessToken(token)
                    self.finish(success: true)
                    return
                }
                // 401: the session is gone (another device signed in, logout, timeout). Network errors keep the user signed in.
                if response.response?.statusCode == 401 {
                    AuthEventMonitor.endSession(code: json?["code"] as? String)
                }
                self.finish(success: false)
            }
    }

    private func finish(success: Bool) {
        let callbacks = waiters
        waiters = []
        inFlight = false
        callbacks.forEach { $0(success) }
    }
}

// MARK: - Interceptor: send a fresh token

final class AuthInterceptor: RequestInterceptor {
    func adapt(_ urlRequest: URLRequest, for session: Session, completion: @escaping (Result<URLRequest, Error>) -> Void) {
        // Only touch requests the call site marked as authenticated.
        guard urlRequest.value(forHTTPHeaderField: "Authorization") != nil,
              let token = User.account()?.token else {
            completion(.success(urlRequest))
            return
        }
        guard AuthTokenStore.refreshToken != nil, AuthTokenStore.needsRefresh(token) else {
            completion(.success(Self.authorized(urlRequest, token: token)))
            return
        }
        TokenRefresher.shared.refresh { _ in
            let latest = User.account()?.token ?? token
            completion(.success(Self.authorized(urlRequest, token: latest)))
        }
    }

    private static func authorized(_ urlRequest: URLRequest, token: String) -> URLRequest {
        var request = urlRequest
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        return request
    }
}

// MARK: - Monitor: sign out with the server's reason

final class AuthEventMonitor: EventMonitor {
    let queue = DispatchQueue(label: "com.rental.shop.auth-monitor")

    private static let lock = NSLock()
    private static var sessionEnded = false

    func requestDidFinish(_ request: Request) {
        guard request.response?.statusCode == 401,
              request.request?.value(forHTTPHeaderField: "Authorization") != nil else { return }
        let body = (request as? DataRequest)?.data
        let code = body
            .flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] }?["code"] as? String

        if code == APIErrorCode.tokenExpired.rawValue, AuthTokenStore.refreshToken != nil {
            // Rare: expired between the check in adapt and the server. Refresh so the next call works;
            // TokenRefresher signs out if the session itself is gone.
            TokenRefresher.shared.refresh { _ in }
            return
        }
        Self.endSession(code: code)
    }

    /// Posts `.userSessionExpired` once per signed-in session, with the server code in userInfo["code"].
    static func endSession(code: String?) {
        lock.lock()
        let alreadyEnded = sessionEnded
        sessionEnded = true
        lock.unlock()
        guard !alreadyEnded else { return }
        DispatchQueue.main.async {
            NotificationCenter.default.post(
                name: .userSessionExpired,
                object: nil,
                userInfo: code.map { ["code": $0] }
            )
        }
    }

    /// Call after a successful login.
    static func sessionStarted() {
        lock.lock()
        sessionEnded = false
        lock.unlock()
    }
}
