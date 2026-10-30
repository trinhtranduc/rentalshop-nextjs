import XCTest
@testable import POS_ADBD

/// #1309 settings sync, bill data of a device that is NOT the owner (manager, staff, kho), checked as DATA before any
/// image is drawn: the app logs in as that account with its own `AuthenticationService`, loads an order with its own
/// `OrderService`, and builds the printed bytes (`Order.toPrintData`) and the share model (`OrderShareModel`).
/// The owner changes the shop over HTTP. Skipped unless a local API is given (TEST_RUNNER_E2E_API_URL, TEST_RUNNER_E2E_BILL_EMAIL).
///   - note and QR switch come from `order.outlet` of the server (#1308)
///   - the bank account on the bill is the outlet's default; the device keeps it up to 5 minutes and drops it when
///     the app enters the foreground (#1320)
final class SettingsSyncBillTests: XCTestCase {
    private var env: [String: String] { ProcessInfo.processInfo.environment }
    private var base: String { env["E2E_API_URL"] ?? "" }
    private var token = ""
    private var createdAccountIds: [Int] = []
    private var outletId = 1
    private var merchantId = 0
    private var originalOutlet: (note: String, qr: Bool) = ("", false)

    // MARK: HTTP as the owner (a separate session from the device under test)

    @discardableResult
    private func call(_ method: String, _ path: String, _ json: [String: Any]? = nil) -> (status: Int, body: [String: Any]?) {
        guard let url = URL(string: base + path) else { return (-1, nil) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("10.\(Int.random(in: 1...250)).\(Int.random(in: 1...250)).\(Int.random(in: 1...250))", forHTTPHeaderField: "x-forwarded-for")
        if !token.isEmpty { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let json = json {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: json)
        }
        var result: (Int, [String: Any]?) = (-1, nil)
        let done = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: request) { data, response, _ in
            result = ((response as? HTTPURLResponse)?.statusCode ?? -1, data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] })
            done.signal()
        }.resume()
        _ = done.wait(timeout: .now() + 30)
        return result
    }

    private func bankPath() -> String { "/api/merchants/\(merchantId)/outlets/\(outletId)/bank-accounts" }

    private func addAccount(number: String, isDefault: Bool) -> Int? {
        let r = call("POST", bankPath(), ["accountHolderName": "NGUYEN VAN E2E", "accountNumber": number,
                                          "bankName": "Vietcombank", "bankCode": "VCB", "isDefault": isDefault])
        let id = (r.body?["data"] as? [String: Any])?["id"] as? Int
        if let id { createdAccountIds.append(id) }
        return id
    }

    // MARK: Device under test (the app's own services)

    private func login(_ email: String, _ password: String) -> User? {
        var user: User?
        let done = expectation(description: "login")
        AuthenticationService.shared.login(emailUser: email, passwordUser: password) { u, _ in user = u; done.fulfill() }
        wait(for: [done], timeout: 30)
        return user
    }

    private func detail(_ orderId: Int) -> OrderDetail? {
        var out: OrderDetail?
        let done = expectation(description: "detail")
        OrderService.shared.loadOrderDetail(orderId: orderId) { d, _ in out = d; done.fulfill() }
        wait(for: [done], timeout: 30)
        return out
    }

    private func printAccount() -> BankAccount? {
        var out: BankAccount?
        let done = expectation(description: "printAccount")
        BankAccountService.shared.printAccount(outletId: outletId) { a in out = a; done.fulfill() }
        wait(for: [done], timeout: 30)
        return out
    }

    private func enterForeground() {
        UIApplication.shared.delegate?.applicationWillEnterForeground?(UIApplication.shared)
        let settled = expectation(description: "cache cleared on the main queue")
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { settled.fulfill() }
        wait(for: [settled], timeout: 5)
    }

    /// `clearPrintCache` clears on the main queue: let it run before the next read
    private func clearCache() {
        BankAccountService.shared.clearPrintCache()
        let settled = expectation(description: "cache cleared")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { settled.fulfill() }
        wait(for: [settled], timeout: 5)
    }

    private func ascii(_ data: Data) -> String { String(decoding: data, as: UTF8.self) }

    private func setUpScenario() throws -> (email: String, password: String, orderId: Int) {
        guard !base.isEmpty, let email = env["E2E_BILL_EMAIL"], let password = env["E2E_BILL_PASSWORD"] else {
            throw XCTSkip("needs TEST_RUNNER_E2E_API_URL and TEST_RUNNER_E2E_BILL_EMAIL / _PASSWORD (local API only)")
        }
        outletId = Int(env["E2E_OUTLET_ID"] ?? "") ?? 1
        let r = call("POST", "/api/mobile/auth/login", ["email": env["E2E_OWNER_EMAIL"] ?? "merchant1@example.com",
                                                        "password": env["E2E_OWNER_PASSWORD"] ?? "merchant123", "deviceId": "bill-owner"])
        token = ((r.body?["data"] as? [String: Any])?["token"] as? String) ?? ""
        merchantId = (((r.body?["data"] as? [String: Any])?["user"] as? [String: Any])?["merchantId"] as? Int) ?? 0
        XCTAssertFalse(token.isEmpty, "owner login over HTTP")
        XCTAssertGreaterThan(merchantId, 0, "owner merchant id")
        // keep the shop as it was
        let list = call("GET", "/api/outlets?limit=50").body?["data"]
        let rows = (list as? [[String: Any]]) ?? ((list as? [String: Any])?["outlets"] as? [[String: Any]]) ?? []
        let row = rows.first { ($0["id"] as? Int) == outletId }
        originalOutlet = ((row?["printNote"] as? String) ?? "", (row?["printBankQr"] as? Bool) ?? false)
        // a RENT order of this outlet (the note block is printed on rentals)
        let orders = call("GET", "/api/orders?limit=20&outletId=\(outletId)&orderType=RENT").body?["data"] as? [String: Any]
        let first = (orders?["orders"] as? [[String: Any]])?.first { ($0["orderType"] as? String) == "RENT" && ($0["status"] as? String) != "CANCELLED" }
        guard let orderId = first?["id"] as? Int else { throw XCTSkip("no RENT order in outlet \(outletId)") }
        return (email, password, orderId)
    }

    override func tearDown() {
        if !token.isEmpty {
            for id in createdAccountIds { _ = call("DELETE", "\(bankPath())/\(id)") }
            _ = call("PUT", "/api/outlets?outletId=\(outletId)", ["printNote": originalOutlet.note, "printBankQr": originalOutlet.qr])
        }
        super.tearDown()
    }

    // MARK: Tests

    /// The device's bill carries the outlet's note and the QR block of the default account, from the server, in the printed bytes and in the share model
    func testBillOfThisDeviceCarriesTheOutletNoteAndTheDefaultBankAccount() throws {
        let s = try setUpScenario()
        let note = "Ghi chu hoa don \(Int(Date().timeIntervalSince1970) % 100000)"
        let number = "19\(Int(Date().timeIntervalSince1970) % 100000000)1"
        let accountId = addAccount(number: number, isDefault: true)
        XCTAssertNotNil(accountId, "the owner adds the default account")
        XCTAssertEqual(call("PUT", "/api/outlets?outletId=\(outletId)", ["printNote": note, "printBankQr": true]).status, 200, "the owner sets note + QR")

        let user = login(s.email, s.password)
        XCTAssertNotNil(user, "the device logs in as \(s.email)")
        print("E2E_NOTE: BILL role=\(user?.role.rawValue ?? "?") outlet=\(user?.outletId ?? -1)")
        clearCache()
        guard let d = detail(s.orderId) else { return XCTFail("the order detail loads on the device") }
        XCTAssertEqual(d.outlet.printNote, note, "the order's outlet carries the owner's note")
        XCTAssertEqual(d.outlet.printBankQr, true, "the order's outlet carries the QR switch ON")
        let order = Order.from(detail: d)
        XCTAssertEqual(order.outletPrintNote, note)
        XCTAssertTrue(OutletPrintSettings.printsBankQr(order.outletPrintBankQr))
        let account = printAccount()
        XCTAssertEqual(account?.accountNumber, number, "the bill's account is the outlet's default")

        let bytes = ascii(BillBankQR.billData(for: order, switchOn: true, account: account))
        XCTAssertTrue(bytes.contains(note), "the printed bytes contain the outlet note")
        XCTAssertTrue(bytes.contains(number), "the printed bytes contain the default account number")
        let off = ascii(BillBankQR.billData(for: order, switchOn: false, account: nil))
        XCTAssertTrue(off.contains(note), "note without QR: still printed")
        XCTAssertFalse(off.contains(number), "QR block off: no account on the bill")

        let source = OrderShareSource(detail: d)
        let model = OrderShareModel.make(source, bankAccount: account, qrSwitchOn: OutletPrintSettings.printsBankQr(source.outletPrintBankQr))
        XCTAssertEqual(model.qr?.accountNumber, number, "the share model carries the same account")
        print("E2E_NOTE: BILL note in bytes=\(bytes.contains(note)) account in bytes=\(bytes.contains(number)) share qr account=\(model.qr?.accountNumber ?? "nil")")
    }

    /// The owner changes the default account on "another device": this device keeps the old one until the app enters the foreground
    func testNewDefaultAccountReachesTheBillAfterForeground() throws {
        let s = try setUpScenario()
        let a = "19\(Int(Date().timeIntervalSince1970) % 100000000)2"
        let b = "19\(Int(Date().timeIntervalSince1970) % 100000000)3"
        XCTAssertNotNil(addAccount(number: a, isDefault: true))
        XCTAssertEqual(call("PUT", "/api/outlets?outletId=\(outletId)", ["printBankQr": true]).status, 200)
        XCTAssertNotNil(login(s.email, s.password), "the device logs in")
        clearCache()
        XCTAssertEqual(printAccount()?.accountNumber, a, "first print: account A")

        // the owner makes B the default over HTTP (another device)
        XCTAssertNotNil(addAccount(number: b, isDefault: true), "the owner adds B as the default")
        let list = call("GET", bankPath()).body?["data"] as? [[String: Any]] ?? []
        print("E2E_NOTE: BANK server default=\(list.first { ($0["isDefault"] as? Bool) == true }?["accountNumber"] ?? "nil")")
        XCTAssertEqual(printAccount()?.accountNumber, a, "inside the 5 minutes the device still prints A (cache)")

        enterForeground()
        let after = printAccount()
        XCTAssertEqual(after?.accountNumber, b, "after the app enters the foreground the device prints B")
        guard let d = detail(s.orderId) else { return XCTFail("detail") }
        let bytes = ascii(BillBankQR.billData(for: Order.from(detail: d), switchOn: true, account: after))
        XCTAssertTrue(bytes.contains(b))
        XCTAssertFalse(bytes.contains(a))
    }

    /// Without a foreground, the cache ends by itself after 5 minutes (waits 5 min; only with TEST_RUNNER_E2E_BILL_WAIT=1)
    func testNewDefaultAccountReachesTheBillAfterFiveMinutes() throws {
        guard env["E2E_BILL_WAIT"] == "1" else { throw XCTSkip("waits 5 minutes: set TEST_RUNNER_E2E_BILL_WAIT=1") }
        let s = try setUpScenario()
        let a = "19\(Int(Date().timeIntervalSince1970) % 100000000)4"
        let b = "19\(Int(Date().timeIntervalSince1970) % 100000000)5"
        XCTAssertNotNil(addAccount(number: a, isDefault: true))
        XCTAssertNotNil(login(s.email, s.password), "the device logs in")
        clearCache()
        XCTAssertEqual(printAccount()?.accountNumber, a)
        XCTAssertNotNil(addAccount(number: b, isDefault: true))
        XCTAssertEqual(printAccount()?.accountNumber, a, "right away: still A")
        let waited = expectation(description: "5 minutes")
        DispatchQueue.main.asyncAfter(deadline: .now() + 302) { waited.fulfill() }
        wait(for: [waited], timeout: 320)
        XCTAssertEqual(printAccount()?.accountNumber, b, "after 5 minutes without a foreground: B")
    }
}
