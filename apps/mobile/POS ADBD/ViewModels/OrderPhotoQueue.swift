//
//  OrderPhotoQueue.swift
//  POS ADBD
//
//  #1418 condition photos of an order: the rule and the on-device queue. The order's status changes first and the
//  photos follow in a separate call, so a photo failure never blocks a hand-over. They wait here until uploaded.
//

import Foundation

/// The existing multipart field of `PUT /api/orders/{id}`
enum OrderPhotoField: String {
    case pickup = "pickupNotesImages"

    func serverCount(in detail: OrderDetail) -> Int {
        switch self {
        case .pickup: return detail.pickupNotesImages?.count ?? 0
        }
    }
}

enum OrderPhotoLogic {
    /// Owner's limit for condition photos. Note photos keep `OrderDetailLogic.maxNotePhotos`; the API allows 5 per field.
    static let maxPhotos = 3

    enum SendDecision: Equatable {
        /// A lost reply: the earlier request went through. There is no idempotency key, so never send again
        case alreadyUploaded
        /// The order already holds the limit
        case noRoom
        case send(count: Int)
    }

    static func canAdd(count: Int) -> Bool { count < maxPhotos }

    static func countLabel(_ count: Int) -> String { "\(count)/\(maxPhotos)" }

    /// A multipart PUT is all or nothing, so our own lost request shows as growth of at least `pending`.
    /// Smaller growth came from another device: our photos are still unsent.
    static func decide(serverCount: Int, baseline: Int, pending: Int) -> SendDecision {
        if serverCount - baseline >= pending { return .alreadyUploaded }
        let room = maxPhotos - serverCount
        return room > 0 ? .send(count: min(pending, room)) : .noRoom
    }

    /// "Thêm" on the order detail: only while the goods are out, and not when the block would be new on the screen
    static func canAddLater(status: OrderStatus, serverCount: Int, pendingCount: Int, canUpdateOrders: Bool) -> Bool {
        status == .pickuped && canUpdateOrders && pendingCount == 0 && serverCount > 0 && canAdd(count: serverCount)
    }
}

/// Photos waiting for one order on this device. The folder carries the user and the shop: another login never sees them.
final class OrderPhotoQueue {
    struct Entry: Equatable {
        let scope: String
        let orderId: Int
        let field: OrderPhotoField
        /// How many photos the order held when these were queued
        let baseline: Int
        let files: [URL]
    }

    private struct Manifest: Codable {
        let baseline: Int
        let count: Int
        let createdAt: Date
    }

    private let root: URL
    private let now: () -> Date
    private let fileManager = FileManager.default

    /// Queues older than this are removed: the user who left them may never log in again
    static let maxAge: TimeInterval = 30 * 24 * 3600

    init(root: URL = OrderPhotoQueue.defaultRoot, now: @escaping () -> Date = Date.init) {
        self.root = root
        self.now = now
    }

    static var defaultRoot: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("order-photos", isDirectory: true)
    }

    static func scope(userId: Int, merchantId: Int?) -> String {
        "u\(userId)_m\(merchantId ?? 0)"
    }

    private func folder(scope: String, orderId: Int, field: OrderPhotoField) -> URL {
        root.appendingPathComponent(scope, isDirectory: true)
            .appendingPathComponent("\(orderId)_\(field.rawValue)", isDirectory: true)
    }

    /// Written to a temporary folder and moved, so a crash never leaves half a queue
    func enqueue(scope: String, orderId: Int, field: OrderPhotoField, baseline: Int, photos: [Data]) throws {
        purgeExpired()
        let target = folder(scope: scope, orderId: orderId, field: field)
        let temp = root.appendingPathComponent(".tmp-\(UUID().uuidString)", isDirectory: true)
        try fileManager.createDirectory(at: temp, withIntermediateDirectories: true)
        defer { try? fileManager.removeItem(at: temp) }
        for (index, photo) in photos.enumerated() {
            try photo.write(to: temp.appendingPathComponent("\(index).jpg"))
        }
        let manifest = Manifest(baseline: baseline, count: photos.count, createdAt: now())
        try JSONEncoder().encode(manifest).write(to: temp.appendingPathComponent("manifest.json"))
        try fileManager.createDirectory(at: target.deletingLastPathComponent(), withIntermediateDirectories: true)
        try? fileManager.removeItem(at: target)
        try fileManager.moveItem(at: temp, to: target)
        var rootURL = root
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? rootURL.setResourceValues(values)
    }

    func entry(scope: String, orderId: Int, field: OrderPhotoField) -> Entry? {
        let dir = folder(scope: scope, orderId: orderId, field: field)
        guard let data = try? Data(contentsOf: dir.appendingPathComponent("manifest.json")),
              let manifest = try? JSONDecoder().decode(Manifest.self, from: data) else { return nil }
        let files = (0..<manifest.count).map { dir.appendingPathComponent("\($0).jpg") }
            .filter { fileManager.fileExists(atPath: $0.path) }
        guard !files.isEmpty else { return nil }
        return Entry(scope: scope, orderId: orderId, field: field, baseline: manifest.baseline, files: files)
    }

    func remove(scope: String, orderId: Int, field: OrderPhotoField) {
        try? fileManager.removeItem(at: folder(scope: scope, orderId: orderId, field: field))
    }

    func purgeExpired() {
        let scopes = (try? fileManager.contentsOfDirectory(at: root, includingPropertiesForKeys: nil)) ?? []
        for scope in scopes {
            for dir in (try? fileManager.contentsOfDirectory(at: scope, includingPropertiesForKeys: nil)) ?? [] {
                guard let data = try? Data(contentsOf: dir.appendingPathComponent("manifest.json")),
                      let manifest = try? JSONDecoder().decode(Manifest.self, from: data),
                      now().timeIntervalSince(manifest.createdAt) > Self.maxAge else { continue }
                try? fileManager.removeItem(at: dir)
            }
        }
    }
}
