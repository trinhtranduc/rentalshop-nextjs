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
    /// - The interceptor refreshes the 1-hour access token shortly before it expires, and on a
    ///   401 TOKEN_EXPIRED refreshes once and retries the request (same as Android).
    /// - The monitor signs out on any other 401 and passes the server code (SESSION_REPLACED, ...).
    static let shared: Session = AuthAwareSession(interceptor: AuthInterceptor(), eventMonitors: [AuthEventMonitor()])
}

/// Turns a 401 TOKEN_EXPIRED into a validation error so `AuthInterceptor.retry` runs.
/// Alamofire only asks the retrier about failed requests, and call sites do not `validate()`.
/// Other responses (including other 401s) stay successful, so call sites still read the body.
final class AuthAwareSession: Session {
    override func request(_ convertible: URLRequestConvertible, interceptor: RequestInterceptor? = nil) -> DataRequest {
        super.request(convertible, interceptor: interceptor).validate { request, response, data in
            let action = AuthResponsePolicy.action(
                statusCode: response.statusCode,
                code: response.statusCode == 401 ? AuthResponsePolicy.errorCode(in: data) : nil,
                sentAuthorization: request?.value(forHTTPHeaderField: "Authorization") != nil,
                hasRefreshToken: AuthTokenStore.refreshToken != nil,
                retryCount: 0
            )
            guard action == .refreshAndRetry else { return .success(()) }
            return .failure(AFError.responseValidationFailed(reason: .unacceptableStatusCode(code: response.statusCode)))
        }
    }
}

// MARK: - What a response means for the session (pure, unit-tested)

enum AuthResponsePolicy {
    enum Action: Equatable {
        /// Nothing to do with the session.
        case none
        /// The access token expired: refresh once, then retry the request.
        case refreshAndRetry
        /// The session is gone; sign out and say why (`code` from the server).
        case signOut(code: String?)
    }

    static func action(statusCode: Int?, code: String?, sentAuthorization: Bool,
                       hasRefreshToken: Bool, retryCount: Int) -> Action {
        // A 401 without a token (e.g. wrong password on login) is not a lost session.
        guard statusCode == 401, sentAuthorization else { return .none }
        if code == APIErrorCode.tokenExpired.rawValue, hasRefreshToken, retryCount == 0 {
            return .refreshAndRetry
        }
        return .signOut(code: code)
    }

    static func errorCode(in data: Data?) -> String? {
        data.flatMap { (try? JSONSerialization.jsonObject(with: $0)) as? [String: Any] }?["code"] as? String
    }
}

/// Which message to show when the app signs the user out.
enum SessionEndReason {
    static func errorCode(forServerCode code: String?) -> APIErrorCode {
        code == APIErrorCode.sessionReplaced.rawValue ? .sessionReplaced : .sessionExpired
    }
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
        needsRefresh(token, margin: margin, now: Date().timeIntervalSince1970,
                     clockSkew: UserDefaults.standard.double(forKey: clockSkewKey))
    }

    static func needsRefresh(_ token: String, margin: TimeInterval = 60, now: TimeInterval, clockSkew: TimeInterval) -> Bool {
        guard let expiresAt = JWTClaims(token: token)?.expiresAt else { return false }
        return now + clockSkew >= expiresAt - margin
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

    /// Must not be `AuthSession.shared`: the refresh call must not pass through AuthInterceptor.
    private let session: Session
    private let queue = DispatchQueue(label: "com.rental.shop.token-refresh")
    private var waiters: [(Bool) -> Void] = []
    private var inFlight = false

    init(session: Session = Alamofire.AF) {
        self.session = session
    }

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

        session.request(url, method: .post, parameters: params, encoding: JSONEncoding.default, headers: headers)
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
                // 401: the session is gone (another device signed in, logout, timeout). Drop the dead refresh
                // token so no other request tries it again. Network errors keep the user signed in.
                if response.response?.statusCode == 401 {
                    AuthEventMonitor.endSession(code: json?["code"] as? String)
                    AuthTokenStore.refreshToken = nil
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

// MARK: - Interceptor: send a fresh token, retry once after TOKEN_EXPIRED

final class AuthInterceptor: RequestInterceptor {
    private let refresher: TokenRefresher

    init(refresher: TokenRefresher = .shared) {
        self.refresher = refresher
    }

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
        refresher.refresh { _ in
            let latest = User.account()?.token ?? token
            completion(.success(Self.authorized(urlRequest, token: latest)))
        }
    }

    /// Runs for a 401 TOKEN_EXPIRED (see `AuthAwareSession`): refresh once, then retry; `adapt` puts the new token on.
    func retry(_ request: Request, for session: Session, dueTo error: Error, completion: @escaping (RetryResult) -> Void) {
        let sentAuthorization = request.request?.value(forHTTPHeaderField: "Authorization")
        let action = AuthResponsePolicy.action(
            statusCode: request.response?.statusCode,
            code: AuthResponsePolicy.errorCode(in: (request as? DataRequest)?.data),
            sentAuthorization: sentAuthorization != nil,
            hasRefreshToken: AuthTokenStore.refreshToken != nil,
            retryCount: request.retryCount
        )
        guard action == .refreshAndRetry else {
            completion(.doNotRetry)
            return
        }
        // Another request already refreshed while this one was in flight: just retry with the new token.
        if let current = User.account()?.token, "Bearer \(current)" != sentAuthorization {
            completion(.retry)
            return
        }
        refresher.refresh { refreshed in
            completion(refreshed ? .retry : .doNotRetry)
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

    /// Sees only the final response: a request the interceptor retried reports the retry's result.
    func requestDidFinish(_ request: Request) {
        let action = AuthResponsePolicy.action(
            statusCode: request.response?.statusCode,
            code: AuthResponsePolicy.errorCode(in: (request as? DataRequest)?.data),
            sentAuthorization: request.request?.value(forHTTPHeaderField: "Authorization") != nil,
            hasRefreshToken: AuthTokenStore.refreshToken != nil,
            retryCount: request.retryCount
        )
        switch action {
        case .none:
            return
        case .refreshAndRetry:
            // Not retried: the refresh failed on the network, or an upload (not validated). Stay signed in
            // and refresh for the next call; TokenRefresher signs out if the session itself is gone.
            TokenRefresher.shared.refresh { _ in }
        case .signOut(let code):
            Self.endSession(code: code)
        }
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
