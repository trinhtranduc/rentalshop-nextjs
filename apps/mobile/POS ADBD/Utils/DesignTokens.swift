//
//  DesignTokens.swift
//  POS ADBD
//
//  Design tokens of the redesign (He-thong board, #370). New screens use these; current screens keep theirs.
//

import UIKit

enum DS {
    enum Color {
        static let primary = UIColor(hexString: "1D4ED8")
        static let text = UIColor(hexString: "0F172A")
        static let textMuted = UIColor(hexString: "475569")
        static let surface = UIColor.white
        static let background = UIColor(hexString: "F3F4F6")
        static let border = UIColor(hexString: "E5E7EB")
        static let divider = UIColor(hexString: "F1F5F9")
    }

    /// Pill colors: `text` on `fill`
    struct Pill {
        let text: UIColor
        let fill: UIColor
    }

    enum Status {
        static let late = Pill(text: UIColor(hexString: "B91C1C"), fill: UIColor(hexString: "FEE2E2"))
        static let handOver = Pill(text: UIColor(hexString: "1E40AF"), fill: UIColor(hexString: "DBEAFE"))
        static let returning = Pill(text: UIColor(hexString: "5B21B6"), fill: UIColor(hexString: "EDE9FE"))
        static let waiting = Pill(text: UIColor(hexString: "9A3412"), fill: UIColor(hexString: "FFEDD5"))
        static let done = Pill(text: UIColor(hexString: "047857"), fill: UIColor(hexString: "D1FAE5"))
        static let cancelled = Pill(text: UIColor(hexString: "475569"), fill: UIColor(hexString: "F1F5F9"))
    }

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
    }

    enum Radius {
        static let chip: CGFloat = 6
        /// Status tag of an order row (#468)
        static let tag: CGFloat = 7
        static let card: CGFloat = 12
        static let sheet: CGFloat = 20
    }

    /// Type ramp of the new UI (He-thong board, owner-approved 2026-10-04, #424).
    /// Text uses only 17 · 15 · 14 · 12; inputs and primary buttons 16; headings and hero numbers 18–30.
    /// No 11 or 13. Same numbers on Android (`DS.TextSize`, sp).
    enum TextSize {
        /// Screen title, 700
        static let title: CGFloat = 24
        /// Main money amount, 700
        static let amount: CGFloat = 20
        /// Customer name, product name, row total, price, card title (600–700)
        static let name: CGFloat = 17
        /// Text inputs and primary buttons
        static let input: CGFloat = 16
        /// Body, buttons, item line, field labels, segmented control (400–600)
        static let body: CGFloat = 15
        /// Secondary: dates, order code, còn thu / trả cọc, stock, per-day price (400–600)
        static let secondary: CGFloat = 14
        /// Status pills, tags, count badges, tab labels (600–700). The minimum.
        static let pill: CGFloat = 12
    }

    /// Vertical rhythm of the new lists (#424)
    enum Gap {
        /// Between text lines inside one block (board: 4–5)
        static let line: CGFloat = 5
        static let lineTight: CGFloat = 4
        /// Order list row: 15 top/bottom, 16 left/right
        static let orderRowVertical: CGFloat = 15
        static let rowHorizontal: CGFloat = 16
        /// Product list row: 14 padding, 96 min height
        static let productRow: CGFloat = 14
        static let productRowMinHeight: CGFloat = 96
    }

    /// Minimum touch target
    static let touchTarget: CGFloat = 44

    /// Icon box sizes of the boards (canvas px = icon box; the 2px outline glyph fills ~75–88% of it) (#396)
    enum Icon {
        static let sm: CGFloat = 18
        static let md: CGFloat = 20
        static let lg: CGFloat = 22
        /// SF Symbol point size per canvas px, measured against the boards' outline icons
        static let pointFactor: CGFloat = 0.78
        /// Glyphs that draw >10% larger than the boards' at the same point size (camera +26%, chevrons +13%)
        static let opticalCorrection: [String: CGFloat] = ["camera": 0.8, "chevron": 0.88]
    }

    /// SF Symbol point size that draws like a board icon of `size` px
    static func symbolPointSize(for size: CGFloat, name: String = "") -> CGFloat {
        let base = name.split(separator: ".").first.map(String.init) ?? name
        let correction = Icon.opticalCorrection[base] ?? 1
        return (size * Icon.pointFactor * correction * 2).rounded() / 2
    }

    /// SF Symbol sized like a board icon of `size` px; `.medium` is the closest stroke to the boards' 2px line
    static func symbol(_ name: String, _ size: CGFloat, weight: UIImage.SymbolWeight = .medium) -> UIImage? {
        UIImage(systemName: name, withConfiguration: UIImage.SymbolConfiguration(pointSize: symbolPointSize(for: size, name: name), weight: weight))
    }
}

/// Device time zone, sent as `timeZone` on day-based API calls
enum DeviceTimeZone {
    static var identifier: String { TimeZone.current.identifier }
}

/// Day labels of the redesign, in the device time zone unless told otherwise
enum DayFormatter {
    /// `T7 03/10` in Vietnamese, `Sat 03/10` otherwise
    static func short(_ date: Date, timeZone: TimeZone = .current, locale: Locale = .current) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.weekday, .day, .month], from: date)
        let dayMonth = String(format: "%02d/%02d", parts.day ?? 0, parts.month ?? 0)
        let weekday: String
        if locale.languageCode == "vi" {
            // Calendar weekday: 1 = Sunday … 7 = Saturday → CN, T2 … T7
            weekday = parts.weekday == 1 ? "CN" : "T\(parts.weekday ?? 0)"
        } else {
            let formatter = DateFormatter()
            formatter.locale = locale
            formatter.timeZone = timeZone
            formatter.dateFormat = "EEE"
            weekday = formatter.string(from: date)
        }
        return "\(weekday) \(dayMonth)"
    }

    /// `yyyy-MM-dd` civil day
    static func key(_ date: Date, timeZone: TimeZone = .current) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }
}

/// `1.150.000` (dot grouping, no decimals, no currency symbol — #399)
enum MoneyFormatter {
    private static let formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = "."
        formatter.usesGroupingSeparator = true
        formatter.maximumFractionDigits = 0
        return formatter
    }()

    static func format(_ amount: Double) -> String {
        let rounded = amount.rounded()
        let digits = formatter.string(from: NSNumber(value: abs(rounded))) ?? "\(Int(abs(rounded)))"
        return (rounded < 0 ? "−" : "") + digits
    }
}
