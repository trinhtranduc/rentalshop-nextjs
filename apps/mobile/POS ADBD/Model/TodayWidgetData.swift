//
//  TodayWidgetData.swift
//  POS ADBD
//
//  #1375 (epic #1372): the "Việc cần làm" home-screen widget. Pure rules of the app side: from the answer of
//  GET /api/analytics/outlet-operations to the JSON file the widget extension reads (App Group), and the one-time
//  hint. The shared file model, the Vietnam-day rules and what the widget draws are in `DraftOrderActivity`.
//
//  The file has no money, no phone number and no token.
//

import Foundation
import DraftOrderActivity

enum TodayWidgetData {
    /// The widget's words, in the app's own language (so the extension needs no string file)
    static func labels(bundle: Bundle = .main, language: String? = nil) -> TodayWidgetLabels {
        func text(_ key: String) -> String { NSLocalizedString(key, bundle: bundle, comment: "") }
        let code = language ?? bundle.preferredLocalizations.first ?? "vi"
        return TodayWidgetLabels(
            locale: code.hasPrefix("vi") ? "vi" : "en",
            appName: "AnyRent",
            today: text("Today section"),
            pickup: text("widget.pickup"),
            returnTask: text("widget.return"),
            pickupCount: text("widget.count.pickup"),
            returnCount: text("widget.count.return"),
            lateCount: text("widget.count.late"),
            notPrepared: text("orders.v2.notPrepared"),
            moreFormat: text("widget.more"),
            updatedFormat: text("widget.updated"),
            empty: text("widget.empty"),
            tomorrowFormat: text("widget.tomorrow"),
            loggedOut: text("widget.loggedOut"),
            loggedOutHint: text("widget.loggedOutHint"),
            noAccess: text("widget.noAccess"),
            stale: text("widget.stale"),
            staleFormat: text("widget.staleDetail"),
            yesterday: text("widget.yesterday"),
            hiddenName: text("widget.hiddenName"),
            displayName: text("widget.name"),
            displayDescription: text("widget.description"))
    }

    /// Late first (most late first, the order of the tab), then the hand-overs, then the returns. A deposit stage
    /// ("Thu cọc") and tomorrow's jobs are not part of the widget. Counts are the API's, not the cut rows.
    static func snapshot(from work: TodayWork, userId: Int, outletId: Int, hideNames: Bool, now: Date,
                         labels: TodayWidgetLabels) -> TodayWidgetSnapshot {
        let sections = OrdersHomeLogic.todaySections(from: work)
        var late: [TodayWidgetRow] = []
        var today: [TodayWidgetRow] = []
        for section in sections {
            for case .work(let job, let kind) in section.rows {
                guard kind != .collect else { continue }
                switch section.kind {
                case .late: late.append(row(job, kind: kind, isLate: true, hideNames: hideNames))
                case .today: today.append(row(job, kind: kind, isLate: false, hideNames: hideNames))
                default: break
                }
            }
        }
        let counts = TodayWidgetCounts(late: work.noShows.count + work.overdueReturns.count,
                                       pickup: work.pickupsToday.count, returns: work.returnsToday.count,
                                       tomorrowPickup: work.tomorrowPickups?.count, tomorrowReturn: work.tomorrowReturns?.count)
        let dayKey = (work.date?.isEmpty == false ? work.date : nil) ?? TodayWidgetClock.dayKey(now)
        return TodayWidgetSnapshot(userId: userId, outletId: outletId, date: dayKey, savedAt: now, state: .ok,
                                   hideNames: hideNames, counts: counts, rows: late + today, labels: labels)
    }

    private static func row(_ job: TodayWorkRow, kind: WorkKind, isLate: Bool, hideNames: Bool) -> TodayWidgetRow {
        let first = job.productNames.components(separatedBy: ", ").first ?? ""
        return TodayWidgetRow(
            orderId: job.id, kind: kind == .handOver ? .pickup : .returnTask, isLate: isLate,
            name: hideNames ? "" : (job.customerName ?? ""), product: first.trimmingCharacters(in: .whitespaces),
            lateDays: job.lateDays, lateText: job.lateDays > 0 ? LateText.days(job.lateDays) : "",
            notPrepared: OrdersHomeLogic.notPreparedApplies(kind: kind, isReadyToDeliver: job.isReadyToDeliver))
    }
}

/// W11: a small card in the Đơn tab, shown once, that points to "Thêm vào widget". iOS has no API for an app to add a
/// widget, so the card only opens a three-step guide. It never shows a sheet by itself.
enum TodayWidgetHint {
    static let dismissedKey = "widget.hintDismissed"

    /// - hasWidget: nil while the check (`getCurrentConfigurations`) has not answered
    static func shouldShow(supported: Bool, todayAvailable: Bool, hasWork: Bool, hasWidget: Bool?, dismissed: Bool) -> Bool {
        supported && todayAvailable && hasWork && hasWidget == false && !dismissed
    }

    static func isDismissed(defaults: UserDefaults = .standard) -> Bool {
        defaults.bool(forKey: dismissedKey)
    }

    /// "Không hỏi lại": per phone, for good
    static func dismiss(defaults: UserDefaults = .standard) {
        defaults.set(true, forKey: dismissedKey)
    }
}
