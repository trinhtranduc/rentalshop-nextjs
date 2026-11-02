import Foundation
import WidgetKit

/// What the UIKit app (Swift 4) calls. Lives in this Swift 5 module like `DraftOrderLiveActivityBridge`.
public enum TodayWidgetBridge {
    /// The widget extension targets iOS 16.1; an older phone has no widget and the app simply skips the widget work
    public static var isSupported: Bool {
        if #available(iOS 16.1, *) { return true }
        return false
    }

    /// Writes the file and asks WidgetKit to redraw. False when there is no App Group (an unsigned build).
    @discardableResult
    public static func write(_ snapshot: TodayWidgetSnapshot) -> Bool {
        guard isSupported else { return false }
        let ok = TodayWidgetStore().write(snapshot)
        reloadTimelines()
        return ok
    }

    /// Sign-out: the shop's data goes away at once; the widget keeps only the "Mở AnyRent để đăng nhập" text
    public static func signOut(labels: TodayWidgetLabels) {
        guard isSupported else { return }
        TodayWidgetStore().write(.loggedOut(labels: labels))
        reloadTimelines()
    }

    public static func reloadTimelines() {
        guard isSupported else { return }
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// True when at least one AnyRent widget is on the phone. Always false below iOS 16.1.
    public static func hasWidget(_ completion: @escaping (Bool) -> Void) {
        guard isSupported else {
            completion(false)
            return
        }
        WidgetCenter.shared.getCurrentConfigurations { result in
            if case .success(let configurations) = result {
                completion(!configurations.isEmpty)
            } else {
                completion(false)
            }
        }
    }
}
