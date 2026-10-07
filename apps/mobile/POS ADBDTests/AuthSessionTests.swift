import XCTest
import Alamofire
@testable import POS_ADBD

/// #344 — iOS refreshes the 1-hour token and retries; it signs out with the server's reason otherwise.
/// Same rules as Android `ApiClientRefreshTest`.
final class AuthSessionTests: XCTestCase {
    private var savedUser: Data?
    private var savedRefreshToken: String?

    override func setUp() {
        super.setUp()
        savedUser = UserDefaults.standard.data(forKey: "com.rental.shop.user")
        savedRefreshToken = AuthTokenStore.refreshToken
        StubURLProtocol.reset()
    }

    override func tearDown() {
        AuthTokenStore.refreshToken = savedRefreshToken
        if let savedUser {
            UserDefaults.standard.set(savedUser, forKey: "com.rental.shop.user")
        } else {
            UserDefaults.standard.removeObject(forKey: "com.rental.shop.user")
        }
        StubURLProtocol.reset()
        super.tearDown()
    }

    // MARK: JWT expiry

    private func jwt(iat: TimeInterval, exp: TimeInterval) -> String {
        let payload = try! JSONSerialization.data(withJSONObject: ["iat": iat, "exp": exp])
        let base64url = payload.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
        return "eyJhbGciOiJIUzI1NiJ9.\(base64url).signature"
    }

    func testReadsIssuedAtAndExpiryFromTheToken() {
        let claims = JWTClaims(token: jwt(iat: 1_000, exp: 4_600))
        XCTAssertEqual(claims?.issuedAt, 1_000)
        XCTAssertEqual(claims?.expiresAt, 4_600)
        XCTAssertNil(JWTClaims(token: "not-a-jwt"))
    }

    func testRefreshesAMinuteBeforeExpiryOnTheServerClock() {
        let token = jwt(iat: 1_000, exp: 4_600)
        XCTAssertFalse(AuthTokenStore.needsRefresh(token, now: 4_000, clockSkew: 0))
        XCTAssertTrue(AuthTokenStore.needsRefresh(token, now: 4_545, clockSkew: 0))
        // Device clock 10 minutes behind the server: the server already sees the token as nearly expired
        XCTAssertTrue(AuthTokenStore.needsRefresh(token, now: 4_000, clockSkew: 600))
        // A token without exp (old 90-day login) is never refreshed proactively
        XCTAssertFalse(AuthTokenStore.needsRefresh("opaque", now: 4_000, clockSkew: 0))
    }

    // MARK: What a 401 means

    private func action(_ status: Int?, _ code: String?, authed: Bool = true, refresh: Bool = true, retry: Int = 0)
        -> AuthResponsePolicy.Action {
        AuthResponsePolicy.action(statusCode: status, code: code, sentAuthorization: authed,
                                  hasRefreshToken: refresh, retryCount: retry)
    }

    func testTokenExpiredRefreshesAndRetriesOnce() {
        XCTAssertEqual(action(401, "TOKEN_EXPIRED"), .refreshAndRetry)
        XCTAssertEqual(action(401, "TOKEN_EXPIRED", retry: 1), .signOut(code: "TOKEN_EXPIRED"))
    }

    func testTokenExpiredWithoutRefreshTokenSignsOut() {
        XCTAssertEqual(action(401, "TOKEN_EXPIRED", refresh: false), .signOut(code: "TOKEN_EXPIRED"))
    }

    func testSessionReplacedSignsOutWithThatReason() {
        XCTAssertEqual(action(401, "SESSION_REPLACED"), .signOut(code: "SESSION_REPLACED"))
        XCTAssertEqual(action(401, "SESSION_EXPIRED"), .signOut(code: "SESSION_EXPIRED"))
        XCTAssertEqual(action(401, nil), .signOut(code: nil))
    }

    func testWrongPasswordAndSuccessDoNotSignOut() {
        XCTAssertEqual(action(401, "INVALID_CREDENTIALS", authed: false), .none)
        XCTAssertEqual(action(200, nil), .none)
        XCTAssertEqual(action(403, "FORBIDDEN"), .none)
        XCTAssertEqual(action(nil, nil), .none)
    }

    func testReadsTheErrorCodeFromTheBody() {
        XCTAssertEqual(AuthResponsePolicy.errorCode(in: Data(#"{"success":false,"code":"TOKEN_EXPIRED"}"#.utf8)),
                       "TOKEN_EXPIRED")
        XCTAssertNil(AuthResponsePolicy.errorCode(in: Data("<html>".utf8)))
        XCTAssertNil(AuthResponsePolicy.errorCode(in: nil))
    }

    // MARK: Sign-out message

    func testAnotherDeviceLoginGetsItsOwnMessage() {
        XCTAssertEqual(SessionEndReason.errorCode(forServerCode: "SESSION_REPLACED"), .sessionReplaced)
        XCTAssertEqual(SessionEndReason.errorCode(forServerCode: "SESSION_EXPIRED"), .sessionExpired)
        XCTAssertEqual(SessionEndReason.errorCode(forServerCode: "TOKEN_EXPIRED"), .sessionExpired)
        XCTAssertEqual(SessionEndReason.errorCode(forServerCode: nil), .sessionExpired)
    }

    // MARK: Request pipeline

    private func stubSession(interceptor: RequestInterceptor?) -> Session {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        if let interceptor {
            return AuthAwareSession(configuration: configuration, interceptor: interceptor)
        }
        return Session(configuration: configuration)
    }

    func testExpiredTokenIsRefreshedAndTheRequestRetriedWithTheNewToken() throws {
        let user = try JSONDecoder.shared.decode(User.self, from: Data(#"{"id":1,"token":"old-access"}"#.utf8))
        User.save(user: user)
        AuthTokenStore.refreshToken = "rt-1"

        StubURLProtocol.handler = { request in
            let auth = request.value(forHTTPHeaderField: "Authorization")
            if request.url?.path == APIEndpoint.Path.mobileRefresh {
                return (200, #"{"success":true,"data":{"token":"new-access","refreshToken":"rt-2"}}"#)
            }
            if auth == "Bearer old-access" {
                return (401, #"{"success":false,"code":"TOKEN_EXPIRED"}"#)
            }
            return (200, #"{"success":true,"data":{"ok":true}}"#)
        }

        let refresher = TokenRefresher(session: stubSession(interceptor: nil))
        let session = stubSession(interceptor: AuthInterceptor(refresher: refresher))
        let done = expectation(description: "response")
        var status: Int?
        session.request("https://example.test/api/orders", headers: ["Authorization": "Bearer old-access"])
            .responseData { response in
                status = response.response?.statusCode
                done.fulfill()
            }
        wait(for: [done], timeout: 5)

        XCTAssertEqual(status, 200)
        XCTAssertEqual(User.account()?.token, "new-access")
        XCTAssertEqual(AuthTokenStore.refreshToken, "rt-2")
        XCTAssertEqual(StubURLProtocol.calls, [
            "/api/orders Bearer old-access",
            "\(APIEndpoint.Path.mobileRefresh) -",
            "/api/orders Bearer new-access",
        ])
    }

    func testAnOrdinaryErrorIsNotRetried() throws {
        let user = try JSONDecoder.shared.decode(User.self, from: Data(#"{"id":1,"token":"access"}"#.utf8))
        User.save(user: user)
        AuthTokenStore.refreshToken = "rt-1"
        StubURLProtocol.handler = { _ in (400, #"{"success":false,"code":"VALIDATION_ERROR"}"#) }

        let refresher = TokenRefresher(session: stubSession(interceptor: nil))
        let session = stubSession(interceptor: AuthInterceptor(refresher: refresher))
        let done = expectation(description: "response")
        var body: Data?
        session.request("https://example.test/api/orders", headers: ["Authorization": "Bearer access"])
            .responseData { response in
                body = response.data
                done.fulfill()
            }
        wait(for: [done], timeout: 5)

        XCTAssertEqual(AuthResponsePolicy.errorCode(in: body), "VALIDATION_ERROR")
        XCTAssertEqual(StubURLProtocol.calls.count, 1)
    }
}

/// Answers every request from `handler` and records "<path> <Authorization or ->".
final class StubURLProtocol: URLProtocol {
    static var handler: ((URLRequest) -> (Int, String))?
    private static let lock = NSLock()
    private static var recorded: [String] = []

    static var calls: [String] {
        lock.lock(); defer { lock.unlock() }
        return recorded
    }

    static func reset() {
        lock.lock(); recorded = []; lock.unlock()
        handler = nil
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let auth = request.value(forHTTPHeaderField: "Authorization") ?? "-"
        Self.lock.lock()
        Self.recorded.append("\(request.url?.path ?? "") \(auth)")
        Self.lock.unlock()
        let (status, body) = Self.handler?(request) ?? (500, "{}")
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1",
                                       headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(body.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}
