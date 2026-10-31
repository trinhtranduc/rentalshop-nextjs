import SwiftUI
import UIKit
import WidgetKit

// "Việc cần làm" home-screen widget (#1375, #1378, epic #1372), design P2 "thẻ có màu".
// Small: a progress ring ("xong 4/10") and three coloured counters. Medium: the counters and two jobs of two lines each.
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
            TodayWidgetRow(orderId: 1, kind: .pickup, isLate: true, name: "Anh Tâm", product: "Áo cưới ren", moreCount: 0, lateDays: 3,
                           lateText: "", notPrepared: false, planTime: "", planDay: ""),
            TodayWidgetRow(orderId: 2, kind: .pickup, isLate: false, name: "Chị Diệu", product: "Áo dài gấm đỏ", moreCount: 1, lateDays: 0,
                           lateText: "", notPrepared: true, planTime: "14:00", planDay: ""),
        ]
        let now = Date()
        return TodayWidgetSnapshot(userId: 0, outletId: 0, date: TodayWidgetClock.dayKey(now), savedAt: now, state: .ok,
                                   hideNames: false, done: 4, counts: TodayWidgetCounts(late: 1, pickup: 3, returns: 2), rows: rows,
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
        TodayWidgetDisplay.make(snapshot: entry.snapshot, now: entry.date, rowLimit: family == .systemMedium ? 2 : 0)
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
                MediumWorkView(display: display)
            } else {
                SmallWorkView(display: display)
            }
        case .empty:
            StateView(display: display, family: family, headline: display.labels.empty, detail: display.tomorrowText,
                      footer: display.updatedText)
        case .allDone:
            StateView(display: display, family: family, headline: display.allDoneText ?? "", detail: display.tomorrowText,
                      footer: display.updatedText, symbol: "checkmark.circle.fill")
        case .stale:
            StateView(display: display, family: family, headline: display.labels.stale, detail: display.staleDetail, footer: nil)
        case .noAccess:
            StateView(display: display, family: family, headline: display.labels.noAccess, detail: nil, footer: nil)
        case .loggedOut:
            StateView(display: display, family: family, headline: display.labels.loggedOut, detail: display.labels.loggedOutHint,
                      footer: nil, showsDay: false)
        }
    }
}

/// Small: the ring, then the three counters
@available(iOS 16.1, *)
private struct SmallWorkView: View {
    let display: TodayWidgetDisplay

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                ProgressRing(progress: display.progress).frame(width: 34, height: 34)
                VStack(alignment: .leading, spacing: 0) {
                    Text(display.progressText).font(.system(size: 15, weight: .bold)).lineLimit(1)
                    Text(display.labels.doneCaption).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(2).minimumScaleFactor(0.85)
                }
            }
            HStack(spacing: 4) {
                CounterTile(number: display.counts.late, word: display.labels.late, fill: .tileLate, icon: nil, stacked: true)
                CounterTile(number: display.counts.pickup, word: display.labels.pickup, fill: .tileGiao, icon: nil, stacked: true)
                CounterTile(number: display.counts.returns, word: display.labels.returnTask, fill: .tileTra, icon: nil, stacked: true)
            }
            Spacer(minLength: 0)
            if let updated = display.updatedText {
                Text(updated).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(1)
            }
        }
    }
}

/// Medium: the counters in a strip, two jobs of two lines, the footer
@available(iOS 16.1, *)
private struct MediumWorkView: View {
    let display: TodayWidgetDisplay

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(spacing: 6) {
                CounterTile(number: display.counts.late, word: display.labels.late, fill: .tileLate, icon: "clock", stacked: false)
                CounterTile(number: display.counts.pickup, word: display.labels.pickup, fill: .tileGiao, icon: "arrow.up.right", stacked: false)
                CounterTile(number: display.counts.returns, word: display.labels.returnTask, fill: .tileTra, icon: "arrow.down.left", stacked: false)
            }
            VStack(spacing: 4) {
                ForEach(Array(display.lines.enumerated()), id: \.offset) { _, line in
                    Link(destination: line.url) { JobRow(line: line, display: display) }
                }
            }
            Spacer(minLength: 0)
            Text(display.footerText).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(1).minimumScaleFactor(0.85)
        }
    }
}

/// One job: line 1 the chip, the customer and when; line 2 the first item and the warning (or the due day)
@available(iOS 16.1, *)
private struct JobRow: View {
    let line: TodayWidgetDisplay.Line
    let display: TodayWidgetDisplay

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(spacing: 6) {
                KindChip(chip: line.chip, text: line.chipText)
                if line.name.isEmpty {
                    Text(display.labels.hiddenName).font(.system(size: 14)).foregroundColor(.secondary).lineLimit(1)
                } else {
                    // Blurred by the system when the phone is locked
                    Text(line.name).font(.system(size: 14, weight: .bold)).lineLimit(1).privacySensitive()
                }
                Spacer(minLength: 4)
                Text(line.rightText)
                    .font(.system(size: 12, weight: line.rightIsLate ? .bold : .semibold))
                    .foregroundColor(line.rightIsLate ? .lateText : .secondary)
                    .lineLimit(1).minimumScaleFactor(0.85)
            }
            HStack(spacing: 6) {
                Text(line.productText).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(1)
                Spacer(minLength: 4)
                if let warning = line.warningText {
                    // Orange text and a warning icon, no background: it must not be mistaken for the TRẢ chip
                    HStack(spacing: 3) {
                        Image(systemName: "exclamationmark.triangle").font(.system(size: 11, weight: .bold))
                        Text(warning).font(.system(size: 12, weight: .bold)).lineLimit(1)
                    }
                    .foregroundColor(.warningText)
                } else if let day = line.dayText {
                    Text(day).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(1)
                }
            }
            .padding(.leading, 1)
        }
    }
}

@available(iOS 16.1, *)
private struct KindChip: View {
    let chip: TodayWidgetDisplay.Chip
    let text: String

    var body: some View {
        HStack(spacing: 3) {
            Image(systemName: symbol).font(.system(size: 10, weight: .heavy))
            Text(text).font(.system(size: 12, weight: .heavy)).lineLimit(1)
        }
        .foregroundColor(.white)
        .padding(.horizontal, 6).padding(.vertical, 1)
        .background(RoundedRectangle(cornerRadius: 6).fill(fill))
    }

    private var symbol: String {
        switch chip {
        case .late: return "clock"
        case .pickup: return "arrow.up.right"
        case .returnTask: return "arrow.down.left"
        }
    }

    private var fill: Color {
        switch chip {
        case .late: return .tileLate
        case .pickup: return .tileGiao
        case .returnTask: return .tileTra
        }
    }
}

/// A coloured counter: a number and its word on a solid fill; a counter at 0 is dimmed
@available(iOS 16.1, *)
private struct CounterTile: View {
    let number: Int
    let word: String
    let fill: Color
    let icon: String?
    /// Small widget: number above the word. Medium: icon, number and word in a row.
    let stacked: Bool

    var body: some View {
        Group {
            if stacked {
                VStack(alignment: .leading, spacing: 0) {
                    Text("\(number)").font(.system(size: 22, weight: .bold)).monospacedDigit()
                    Text(word).font(.system(size: 12, weight: .bold)).lineLimit(1).minimumScaleFactor(0.8)
                }
                .padding(.horizontal, 6).padding(.vertical, 4)
            } else {
                HStack(spacing: 4) {
                    if let icon = icon { Image(systemName: icon).font(.system(size: 11, weight: .heavy)) }
                    Text("\(number)").font(.system(size: 20, weight: .bold)).monospacedDigit()
                    Text(word).font(.system(size: 12, weight: .bold)).lineLimit(1)
                }
                .padding(.horizontal, 9).padding(.vertical, 3)
            }
        }
        .foregroundColor(.white)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 10).fill(fill))
        .opacity(number == 0 ? 0.4 : 1)
    }
}

@available(iOS 16.1, *)
private struct ProgressRing: View {
    let progress: Double

    var body: some View {
        ZStack {
            Circle().stroke(Color.ringTrack, lineWidth: 5)
            Circle().trim(from: 0, to: CGFloat(progress))
                .stroke(Color.ringFill, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

@available(iOS 16.1, *)
private struct HeaderView: View {
    let display: TodayWidgetDisplay
    let family: WidgetFamily
    var showsDay = true

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(display.title).font(.system(size: 14, weight: .bold)).lineLimit(1)
            Spacer(minLength: 4)
            if showsDay {
                Text(display.dayText).font(.system(size: 12, weight: .semibold)).foregroundColor(.secondary).lineLimit(1)
            }
        }
    }
}

@available(iOS 16.1, *)
private struct StateView: View {
    let display: TodayWidgetDisplay
    let family: WidgetFamily
    let headline: String
    let detail: String?
    let footer: String?
    var showsDay = true
    var symbol: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HeaderView(display: display, family: family, showsDay: showsDay)
            Spacer(minLength: 0)
            if let symbol = symbol {
                Image(systemName: symbol).font(.system(size: 22)).foregroundColor(.ringFill)
            }
            Text(headline).font(.system(size: family == .systemSmall ? 15 : 17, weight: .bold)).lineLimit(3).minimumScaleFactor(0.8)
            if let detail = detail {
                Text(detail).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(2)
            }
            Spacer(minLength: 0)
            if let footer = footer {
                Text(footer).font(.system(size: 12)).foregroundColor(.secondary).lineLimit(1)
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

    /// Kind colours of the P2 design: Trễ red, Giao blue (AnyRent), Trả orange; the counters and the chips share them
    static let tileLate = dynamic(light: 0xB91C1C, dark: 0xDC2626)
    static let tileGiao = dynamic(light: 0x1D4ED8, dark: 0x2563EB)
    static let tileTra = dynamic(light: 0xC2410C, dark: 0xEA580C)
    /// "Trễ N ngày" and "Chưa soạn đồ" are text colours, not fills
    static let lateText = dynamic(light: 0xB91C1C, dark: 0xFCA5A5)
    static let warningText = dynamic(light: 0x9A3412, dark: 0xFDBA74)
    static let ringFill = dynamic(light: 0x1D4ED8, dark: 0x60A5FA)
    static let ringTrack = dynamic(light: 0xE2E8F0, dark: 0x3A3A3C)
}

private extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}
