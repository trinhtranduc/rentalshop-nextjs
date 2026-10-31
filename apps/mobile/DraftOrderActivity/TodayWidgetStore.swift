import Foundation

/// The one JSON file in the App Group. The app writes it; the widget only reads it.
public struct TodayWidgetStore {
    public static let fileName = "today-widget.json"
    /// Info.plist key of the app and of the extension: the App Group id of the build (`group.com.anyrent`)
    public static let groupInfoKey = "AnyRentAppGroup"

    private let directory: URL?

    /// The shared App Group container of this build; nil when the group is not available (not signed with it)
    public init() {
        if let group = Bundle.main.object(forInfoDictionaryKey: TodayWidgetStore.groupInfoKey) as? String,
           !group.isEmpty, !group.hasPrefix("$(") {
            directory = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)
        } else {
            directory = nil
        }
    }

    /// Tests and previews write to a folder of their own
    public init(directory: URL) {
        self.directory = directory
    }

    public var isAvailable: Bool { directory != nil }

    var fileURL: URL? { directory?.appendingPathComponent(TodayWidgetStore.fileName) }

    /// nil when there is no file, or it cannot be read (a file of a newer version counts as unreadable)
    public func read() -> TodayWidgetSnapshot? {
        guard let url = fileURL, let data = try? Data(contentsOf: url),
              let snapshot = try? TodayWidgetSnapshot.decoder().decode(TodayWidgetSnapshot.self, from: data),
              snapshot.v <= TodayWidgetSnapshot.currentVersion else { return nil }
        return snapshot
    }

    @discardableResult
    public func write(_ snapshot: TodayWidgetSnapshot) -> Bool {
        guard let url = fileURL, let data = try? TodayWidgetSnapshot.encoder().encode(snapshot) else { return false }
        do {
            try data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
            return true
        } catch {
            return false
        }
    }

    public func remove() {
        guard let url = fileURL else { return }
        try? FileManager.default.removeItem(at: url)
    }
}
