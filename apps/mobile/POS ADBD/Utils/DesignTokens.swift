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
        static let card: CGFloat = 12
        static let sheet: CGFloat = 20
    }

    /// Minimum touch target
    static let touchTarget: CGFloat = 44
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

/// `1.150.000đ` (dot grouping, no decimals)
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
        return (rounded < 0 ? "−" : "") + digits + "đ"
    }
}
