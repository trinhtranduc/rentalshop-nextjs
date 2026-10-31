import SwiftUI
import UIKit
import WidgetKit

// "Việc cần làm" home-screen widget (#1375, epic #1372). Small: three numbers. Medium: the numbers and three jobs.
//
// It only reads the file the app wrote into the App Group. No network, no token, no Keychain. What it draws is decided
// by `TodayWidgetDisplay.make` (pure, tested): a list from an earlier Vietnam day is never shown as today's.
// The shared files DraftOrderActivity/TodayWidget{Snapshot,Display,Store}.swift are compiled into this extension too,
// the way DraftOrderAttributes.swift already is.

@available(iOS 16.1, *)
struct TodayWorkEntry: TimelineEntry {
    let date: Date
    let snapshot: TodayWidgetSnapshot?
}

@available(iOS 16.1, *)
struct TodayWorkProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayWorkEntry {
        TodayWorkEntry(date: Date(), snapshot: Self.sample())
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayWorkEntry) -> Void) {
        // The gallery preview shows a sample, a real widget shows the file
        completion(TodayWorkEntry(date: Date(), snapshot: context.isPreview ? Self.sample() : TodayWidgetStore().read()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayWorkEntry>) -> Void) {
        let now = Date()
        let snapshot = TodayWidgetStore().read()
        // A second entry at the Vietnam midnight turns the list into "Mở app để cập nhật" with no help from the app
        let entries = [
            TodayWorkEntry(date: now, snapshot: snapshot),
            TodayWorkEntry(date: TodayWidgetClock.nextMidnight(after: now), snapshot: snapshot),
        ]
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(30 * 60))))
    }

    static func sample() -> TodayWidgetSnapshot {
        let labels = TodayWidgetLabels.fallback()
        let rows = [
            TodayWidgetRow(orderId: 1, kind: .pickup, isLate: true, name: "Hà Gia Bảo", product: "Áo dài gấm đỏ", lateDays: 2,
                           lateText: "", notPrepared: false),
            TodayWidgetRow(orderId: 2, kind: .pickup, isLate: false, name: "Mai Quốc Huy", product: "Vest", lateDays: 0,
                           lateText: "", notPrepared: true),
            TodayWidgetRow(orderId: 3, kind: .returnTask, isLate: false, name: "Bùi Thanh Tâm", product: "Áo dài gấm đỏ", lateDays: 0,
                           lateText: "", notPrepared: false),
        ]
        let now = Date()
        return TodayWidgetSnapshot(userId: 0, outletId: 0, date: TodayWidgetClock.dayKey(now), savedAt: now, state: .ok,
                                   hideNames: false, counts: TodayWidgetCounts(late: 1, pickup: 3, returns: 2), rows: rows,
                                   labels: labels)
    }
}

@available(iOS 16.1, *)
struct TodayWorkWidget: Widget {
    static let kind = "TodayWorkWidget"

    var body: some WidgetConfiguration {
        let labels = TodayWidgetStore().read()?.labels ?? TodayWidgetLabels.fallback()
        return StaticConfiguration(kind: Self.kind, provider: TodayWorkProvider()) { entry in
            TodayWorkWidgetView(entry: entry)
        }
        .configurationDisplayName(labels.displayName)
        .description(labels.displayDescription)
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Views

@available(iOS 16.1, *)
struct TodayWorkWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: TodayWorkEntry

    private var display: TodayWidgetDisplay {
        TodayWidgetDisplay.make(snapshot: entry.snapshot, now: entry.date, rowLimit: family == .systemMedium ? 3 : 0)
    }

    var body: some View {
        content
            .widgetURL(display.headerURL)
            .todayWidgetBackground()
    }

    @ViewBuilder
    private var content: some View {
        let display = self.display
        switch display.kind {
        case .work:
            if family == .systemMedium {
                MediumWorkView(display: display, now: entry.date)
            } else {
                SmallWorkView(display: display)
            }
        case .empty:
            StateView(display: display, now: entry.date, family: family, headline: display.labels.empty,
                      detail: display.tomorrowText, footer: display.updatedText)
        case .stale:
            StateView(display: display, now: entry.date, family: family, headline: display.labels.stale,
                      detail: display.staleDetail, footer: nil)
        case .noAccess:
            StateView(display: display, now: entry.date, family: family, headline: display.labels.noAccess, detail: nil, footer: nil)
        case .loggedOut:
            StateView(display: display, now: entry.date, family: family, headline: display.labels.loggedOut,
                      detail: display.labels.loggedOutHint, footer: nil, showsDay: false)
        }
    }
}

@available(iOS 16.1, *)
private struct HeaderView: View {
    let display: TodayWidgetDisplay
    let now: Date
    let family: WidgetFamily
    var showsDay = true

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(display.title).font(.system(size: 13, weight: .bold)).lineLimit(1)
            Spacer(minLength: 4)
            if showsDay {
                Text(family == .systemMedium ? Self.longDay(now, display.labels) : display.dayText)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
    }

    /// "Thứ Bảy 31/10" in the app's language, Vietnam day
    static func longDay(_ date: Date, _ labels: TodayWidgetLabels) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: labels.locale)
        formatter.timeZone = TodayWidgetClock.timeZone
        formatter.dateFormat = "EEEE dd/MM"
        let text = formatter.string(from: date)
        return text.prefix(1).uppercased() + text.dropFirst()
    }
}

@available(iOS 16.1, *)
private struct SmallWorkView: View {
    let display: TodayWidgetDisplay

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HeaderView(display: display, now: Date(), family: .systemSmall)
            Spacer(minLength: 0)
            HStack(alignment: .bottom, spacing: 0) {
                CountView(number: display.counts.pickup, word: display.labels.pickupCount, color: .giao, big: true)
                Spacer(minLength: 2)
                CountView(number: display.counts.returns, word: display.labels.returnCount, color: .tra, big: true)
                Spacer(minLength: 2)
                CountView(number: display.counts.late, word: display.labels.lateCount, color: .tre, big: true)
            }
            Spacer(minLength: 0)
        }
    }
}

@available(iOS 16.1, *)
private struct MediumWorkView: View {
    let display: TodayWidgetDisplay
    let now: Date

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HeaderView(display: display, now: now, family: .systemMedium)
            HStack(spacing: 12) {
                CountView(number: display.counts.pickup, word: display.labels.pickupCount, color: .giao, big: false)
                CountView(number: display.counts.returns, word: display.labels.returnCount, color: .tra, big: false)
                CountView(number: display.counts.late, word: display.labels.lateCount, color: .tre, big: false)
            }
            VStack(spacing: 0) {
                ForEach(Array(display.lines.enumerated()), id: \.offset) { _, line in
                    Link(destination: line.url) { LineView(line: line, display: display) }
                }
            }
            Spacer(minLength: 0)
            HStack {
                if let more = display.moreText { Text(more).font(.system(size: 11, weight: .semibold)) }
                Spacer()
                if let updated = display.updatedText { Text(updated).font(.system(size: 11)) }
            }
            .foregroundColor(.secondary)
            .lineLimit(1)
        }
    }
}

@available(iOS 16.1, *)
private struct LineView: View {
    let line: TodayWidgetDisplay.Line
    let display: TodayWidgetDisplay

    var body: some View {
        HStack(spacing: 8) {
            Text(line.tag)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(line.isReturn ? .traTagText : .giaoTagText)
                .padding(.horizontal, 7).padding(.vertical, 1)
                .background(RoundedRectangle(cornerRadius: 6).fill(line.isReturn ? Color.traTagFill : Color.giaoTagFill))
            if line.name.isEmpty {
                Text(display.labels.hiddenName).font(.system(size: 13)).foregroundColor(.secondary).lineLimit(1)
            } else {
                // Blurred by the system when the phone is locked
                Text(line.name).font(.system(size: 13, weight: .semibold)).lineLimit(1).privacySensitive()
            }
            Spacer(minLength: 4)
            trailing
        }
        .frame(height: 25)
        .overlay(Divider().opacity(0.6), alignment: .top)
    }

    @ViewBuilder
    private var trailing: some View {
        switch line.trailing {
        case .late(let text):
            Text(text).font(.system(size: 11.5, weight: .bold)).foregroundColor(.tre).lineLimit(1)
        case .notPrepared(let text):
            Text(text).font(.system(size: 11.5, weight: .bold)).foregroundColor(.chuaSoan).lineLimit(1)
        case .product(let text):
            Text(text).font(.system(size: 11.5)).foregroundColor(.secondary).lineLimit(1).frame(maxWidth: 110, alignment: .trailing)
        case .none:
            EmptyView()
        }
    }
}

@available(iOS 16.1, *)
private struct CountView: View {
    let number: Int
    let word: String
    let color: Color
    let big: Bool

    var body: some View {
        if big {
            VStack(alignment: .leading, spacing: 0) {
                Text("\(number)").font(.system(size: 32, weight: .bold)).foregroundColor(color)
                Text(word).font(.system(size: 12, weight: .semibold)).foregroundColor(color)
            }
        } else {
            HStack(alignment: .firstTextBaseline, spacing: 3) {
                Text("\(number)").font(.system(size: 14, weight: .bold))
                Text(word).font(.system(size: 12, weight: .semibold))
            }
            .foregroundColor(color)
        }
    }
}

@available(iOS 16.1, *)
private struct StateView: View {
    let display: TodayWidgetDisplay
    let now: Date
    let family: WidgetFamily
    let headline: String
    let detail: String?
    let footer: String?
    var showsDay = true

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HeaderView(display: display, now: now, family: family, showsDay: showsDay)
            Spacer(minLength: 0)
            Text(headline).font(.system(size: family == .systemSmall ? 14 : 16, weight: .bold)).lineLimit(3).minimumScaleFactor(0.8)
            if let detail = detail {
                Text(detail).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(2)
            }
            Spacer(minLength: 0)
            if let footer = footer {
                Text(footer).font(.system(size: 11)).foregroundColor(.secondary).lineLimit(1)
            }
        }
    }
}

// MARK: - Look

@available(iOS 16.1, *)
private extension View {
    /// iOS 17 wants the background declared as the widget's container
    @ViewBuilder
    func todayWidgetBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { Color(UIColor.systemBackground) }
        } else {
            self.padding(14).background(Color(UIColor.systemBackground))
        }
    }
}

private extension Color {
    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }

    /// The colours of the tab "Việc cần làm": Giao blue, Trả purple, Trễ red, Chưa soạn đồ orange
    static let giao = dynamic(light: 0x2563EB, dark: 0x93C5FD)
    static let tra = dynamic(light: 0x7C3AED, dark: 0xC4B5FD)
    static let tre = dynamic(light: 0xDC2626, dark: 0xFCA5A5)
    static let chuaSoan = dynamic(light: 0xC2410C, dark: 0xFDBA74)
    static let giaoTagText = dynamic(light: 0x1E40AF, dark: 0xBFDBFE)
    static let giaoTagFill = dynamic(light: 0xDBEAFE, dark: 0x1E3A8A)
    static let traTagText = dynamic(light: 0x5B21B6, dark: 0xDDD6FE)
    static let traTagFill = dynamic(light: 0xEDE9FE, dark: 0x4C1D95)
}

private extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}
