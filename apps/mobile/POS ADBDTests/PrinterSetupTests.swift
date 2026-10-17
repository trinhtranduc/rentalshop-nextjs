import XCTest
@testable import POS_ADBD

/// #970 — a printer is set up only when an IP was saved; print errors say what to check (and the Mac hint)
final class PrinterSetupTests: XCTestCase {
    private let key = "IpBillPrinter"
    /// #1011: set when an IP is saved from Cài đặt → Máy in
    private let chosenKey = "IpBillPrinterChosen"
    private var savedIP: String?
    private var savedChosen: Any?

    override func setUp() {
        super.setUp()
        savedIP = UserDefaults.standard.string(forKey: key)
        savedChosen = UserDefaults.standard.object(forKey: chosenKey)
        UserDefaults.standard.removeObject(forKey: chosenKey)
    }

    override func tearDown() {
        UserDefaults.standard.set(savedIP, forKey: key)
        UserDefaults.standard.set(savedChosen, forKey: chosenKey)
        super.tearDown()
    }

    // MARK: #1011 what Máy in saves sticks

    /// The shop's printer can really sit at 192.168.1.199: saved from Máy in, it is kept and used to print
    func testFallbackIPSavedFromSettingsIsKept() {
        Utils.saveBillPrinter(ip: "192.168.1.199")
        XCTAssertEqual(Utils.loadBillPrinter(), "192.168.1.199", "Máy in shows what was saved")
        XCTAssertEqual(PrinterSetup.savedIP, "192.168.1.199", "printing and auto print use it")
    }

    /// A 192.168.1.199 an older build wrote by itself (never saved from Máy in) is still no printer (#970)
    func testFallbackIPNotSavedFromSettingsIsStillNone() {
        UserDefaults.standard.set("192.168.1.199", forKey: key)
        XCTAssertEqual(Utils.loadBillPrinter(), "")
        XCTAssertNil(PrinterSetup.savedIP)
    }

    func testClearingThePrinterIPInSettingsIsKept() {
        Utils.saveBillPrinter(ip: "10.0.0.7")
        Utils.saveBillPrinter(ip: "")
        XCTAssertEqual(Utils.loadBillPrinter(), "")
        XCTAssertNil(PrinterSetup.savedIP)
    }

    // MARK: Configured or not

    func testConfiguredIPIgnoresBlankAndTheOldFallback() {
        XCTAssertNil(PrinterSetup.configuredIP(saved: nil))
        XCTAssertNil(PrinterSetup.configuredIP(saved: ""))
        XCTAssertNil(PrinterSetup.configuredIP(saved: "   "))
        XCTAssertNil(PrinterSetup.configuredIP(saved: "192.168.1.199"), "the old fallback was never chosen by anyone")
        XCTAssertEqual(PrinterSetup.configuredIP(saved: " 192.168.1.50 "), "192.168.1.50")
    }

    func testNoFakeDefaultIP() {
        UserDefaults.standard.removeObject(forKey: key)
        XCTAssertEqual(Utils.loadBillPrinter(), "")
        UserDefaults.standard.set("192.168.1.199", forKey: key)
        XCTAssertEqual(Utils.loadBillPrinter(), "")
        UserDefaults.standard.set("10.0.0.7", forKey: key)
        XCTAssertEqual(Utils.loadBillPrinter(), "10.0.0.7")
    }

    func testAutoPrintSkipsTheOldFallback() {
        XCTAssertFalse(CreatedOrderAutoPrint.shouldPrint(savedPrinterIP: "192.168.1.199"))
    }

    /// Print with no saved IP fails at once with "not set up" (no 5 s wait on 192.168.1.199)
    func testPrintWithoutPrinterFailsNotConfigured() {
        UserDefaults.standard.removeObject(forKey: key)
        let done = expectation(description: "print result")
        let started = Date()
        PrinterManager.shared.printBill(data: NSMutableData(data: Data([0x1B, 0x40]))) { result in
            if case .failure(.notConfigured) = result {} else { XCTFail("expected notConfigured, got \(result)") }
            done.fulfill()
        }
        wait(for: [done], timeout: 2)
        XCTAssertLessThan(Date().timeIntervalSince(started), 1)
    }

    // MARK: Messages

    func testNotConfiguredReadsInAlerts() {
        let error: Error = PrinterError.notConfigured
        XCTAssertEqual(error.localizedDescription, "printer.notConfigured.title".localized())
        for key in ["printer.notConfigured.title", "printer.notConfigured.message", "printer.notConfigured.open",
                    "printer.error.macHint"] {
            XCTAssertNotEqual(key.localized(), key)
        }
    }

    func testConnectFailureNamesTheIPAndAddsTheMacHintOnlyOnMac() {
        let phone = PrinterSetup.failureMessage(.connectionFailed, ip: "10.0.0.9", onMac: false)
        XCTAssertTrue(phone.contains("10.0.0.9"))
        XCTAssertFalse(phone.contains("printer.error.macHint".localized()))
        let mac = PrinterSetup.failureMessage(.connectionFailed, ip: "10.0.0.9", onMac: true)
        XCTAssertTrue(mac.hasPrefix(phone))
        XCTAssertTrue(mac.contains("printer.error.macHint".localized()))
    }

    func testTimeoutAndDisconnectGetTheMacHint() {
        for error in [PrinterError.timeout, .disconnected] {
            XCTAssertFalse(PrinterSetup.failureMessage(error, ip: "10.0.0.9", onMac: false).contains("printer.error.macHint".localized()))
            XCTAssertTrue(PrinterSetup.failureMessage(error, ip: "10.0.0.9", onMac: true).contains("printer.error.macHint".localized()))
        }
    }

    func testNotConfiguredMessageHasNoNetworkHint() {
        XCTAssertEqual(PrinterSetup.failureMessage(.notConfigured, ip: "", onMac: true), "printer.notConfigured.message".localized())
    }

    // MARK: #1028 the IP can be typed with the phone in Vietnamese

    /// `.decimalPad` shows the locale decimal key ("," in vi) and no "."
    func testIPKeyboardHasADot() {
        XCTAssertEqual(PrinterSetup.ipKeyboardType, .numbersAndPunctuation)
    }

    /// A "," from a Vietnamese keyboard becomes ".", spaces go (the #1018 trim stays)
    func testNormalizedIPTurnsCommasIntoDotsAndDropsSpaces() {
        XCTAssertEqual(PrinterSetup.normalizedIP("192,168,1,50"), "192.168.1.50")
        XCTAssertEqual(PrinterSetup.normalizedIP(" 192.168.1.50 \n"), "192.168.1.50")
        XCTAssertEqual(PrinterSetup.normalizedIP("192. 168 ,1.50"), "192.168.1.50")
        XCTAssertEqual(PrinterSetup.normalizedIP("10.0.0.7"), "10.0.0.7")
        XCTAssertEqual(PrinterSetup.normalizedIP(""), "")
    }

    /// An IP saved with commas by an older build still prints
    func testSavedIPWithCommasIsRead() {
        UserDefaults.standard.set("192,168,1,50", forKey: key)
        UserDefaults.standard.set(true, forKey: chosenKey)
        XCTAssertEqual(PrinterSetup.savedIP, "192.168.1.50")
    }
}
