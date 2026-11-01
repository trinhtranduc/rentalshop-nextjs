//
//  OrderPhotoUploader.swift
//  POS ADBD
//
//  #1418 sends the queued condition photos of an order. It outlives the detail screen, which only shows its state.
//

import Foundation

extension Notification.Name {
    /// `object`: the order id. `userInfo["finished"]` is true when the queue emptied and the order must be read again
    static let orderPhotosDidChange = Notification.Name("orderPhotosDidChange")
}

final class OrderPhotoUploader {
    enum State: Equatable {
        case idle
        case uploading
        case failed
    }

    static let shared = OrderPhotoUploader(
        queue: OrderPhotoQueue(),
        scope: {
            guard let user = User.account() else { return nil }
            return OrderPhotoQueue.scope(userId: user.id, merchantId: user.merchantId)
        },
        loadServerCount: { orderId, field, completion in
            OrderService.shared.loadOrderDetail(orderId: orderId) { detail, _ in
                DispatchQueue.main.async { completion(detail.map(field.serverCount(in:))) }
            }
        },
        send: { orderId, field, photos, completion in
            OrderService.shared.uploadOrderPhotos(orderId: orderId, field: field, photos: photos) { success in
                DispatchQueue.main.async { completion(success) }
            }
        })

    typealias LoadServerCount = (Int, OrderPhotoField, @escaping (Int?) -> Void) -> Void
    typealias Send = (Int, OrderPhotoField, [Data], @escaping (Bool) -> Void) -> Void

    private let queue: OrderPhotoQueue
    private let scope: () -> String?
    private let loadServerCount: LoadServerCount
    private let send: Send
    private var states: [String: State] = [:]

    init(queue: OrderPhotoQueue, scope: @escaping () -> String?, loadServerCount: @escaping LoadServerCount, send: @escaping Send) {
        self.queue = queue
        self.scope = scope
        self.loadServerCount = loadServerCount
        self.send = send
    }

    private func key(_ scope: String, _ orderId: Int, _ field: OrderPhotoField) -> String {
        "\(scope)/\(orderId)/\(field.rawValue)"
    }

    /// What the current login has waiting for this order
    func pending(orderId: Int, field: OrderPhotoField) -> OrderPhotoQueue.Entry? {
        guard let scope = scope() else { return nil }
        return queue.entry(scope: scope, orderId: orderId, field: field)
    }

    func state(orderId: Int, field: OrderPhotoField) -> State {
        guard let scope = scope() else { return .idle }
        return states[key(scope, orderId, field)] ?? .idle
    }

    /// Keeps the photos on disk, then starts sending. False when they could not be saved
    @discardableResult
    func add(orderId: Int, field: OrderPhotoField, baseline: Int, photos: [Data]) -> Bool {
        guard let scope = scope(), !photos.isEmpty else { return false }
        do {
            try queue.enqueue(scope: scope, orderId: orderId, field: field, baseline: baseline, photos: photos)
        } catch {
            print("❌ OrderPhotoUploader could not keep the photos: \(error)")
            return false
        }
        resume(orderId: orderId, field: field)
        return true
    }

    /// Opening the order and "Thử lại" both land here. The order is read first: see `OrderPhotoLogic.decide`.
    func resume(orderId: Int, field: OrderPhotoField) {
        guard let scope = scope(), let entry = queue.entry(scope: scope, orderId: orderId, field: field) else { return }
        let stateKey = key(scope, orderId, field)
        guard states[stateKey] != .uploading else { return }
        update(stateKey, .uploading, orderId: orderId)
        loadServerCount(orderId, field) { [weak self] serverCount in
            guard let self else { return }
            guard let serverCount else {
                self.update(stateKey, .failed, orderId: orderId)
                return
            }
            switch OrderPhotoLogic.decide(serverCount: serverCount, baseline: entry.baseline, pending: entry.files.count) {
            case .alreadyUploaded, .noRoom:
                self.finish(entry, stateKey: stateKey)
            case .send(let count):
                let photos = entry.files.prefix(count).compactMap { try? Data(contentsOf: $0) }
                self.send(orderId, field, photos) { [weak self] success in
                    guard let self else { return }
                    if success {
                        self.finish(entry, stateKey: stateKey)
                    } else {
                        self.update(stateKey, .failed, orderId: orderId)
                    }
                }
            }
        }
    }

    private func finish(_ entry: OrderPhotoQueue.Entry, stateKey: String) {
        queue.remove(scope: entry.scope, orderId: entry.orderId, field: entry.field)
        states[stateKey] = nil
        NotificationCenter.default.post(name: .orderPhotosDidChange, object: entry.orderId, userInfo: ["finished": true])
    }

    private func update(_ stateKey: String, _ state: State, orderId: Int) {
        states[stateKey] = state
        NotificationCenter.default.post(name: .orderPhotosDidChange, object: orderId, userInfo: ["finished": false])
    }
}
