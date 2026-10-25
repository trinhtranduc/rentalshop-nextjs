import Foundation
// Payment struct copied verbatim from release-2026-10-12.2 apps/mobile/POS ADBD/Model/Order.swift:969-976
struct Payment: Codable {
    let id: Int
    let amount: Double
    let paymentMethod: String
    let paymentDate: Date
    let status: String
    let notes: String?
}
struct Wrap: Codable { let success: Bool; let payments: [Payment] }

// Decoder copied from JSONHelper.swift:68-90 (JSONDecoder.shared)
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .custom { d in
    let c = try d.singleValueContainer(); let s = try c.decode(String.self)
    let f1 = ISO8601DateFormatter(); f1.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let x = f1.date(from: s) { return x }
    if let x = ISO8601DateFormatter().date(from: s) { return x }
    throw DecodingError.dataCorruptedError(in: c, debugDescription: "bad date")
}
func run(_ name: String, _ json: String) {
    do { let w = try decoder.decode(Wrap.self, from: json.data(using: .utf8)!); print("\(name): OK payments=\(w.payments.count)") }
    catch { print("\(name): FAIL \(error)") }
}
func runFile(_ name: String, _ path: String) {
    let d = FileManager.default.contents(atPath: path)!
    do { let w = try decoder.decode(Wrap.self, from: d); print("\(name): OK payments=\(w.payments.count) first=\(w.payments[0].paymentMethod)/\(w.payments[0].paymentDate)") }
    catch { print("\(name): FAIL \(error)") }
}
runFile("old client (no header)", CommandLine.arguments[1])
runFile("client with installments", CommandLine.arguments[2])
// the shape returned BEFORE this PR (method/processedAt only) must still fail on the old server = proof of the bug
run("before PR (method/processedAt only)", #"{"success":true,"payments":[{"id":5,"amount":500000,"method":"CASH","status":"COMPLETED","reference":"r1","notes":"PICKUP","processedAt":"2026-10-12T03:00:00.000Z","createdAt":"2026-10-12T03:00:00.000Z","updatedAt":"2026-10-12T03:00:00.000Z"}]}"#)
