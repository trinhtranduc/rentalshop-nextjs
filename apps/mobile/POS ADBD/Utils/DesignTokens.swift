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

    /// Diagonal gradients, top-left to bottom-right (CSS 135deg)
    enum Gradient {
        /// #1384: AI image search button. Android `DS.Gradients.AiScan`, web `--ar-ai-gradient`
        static let aiScan = [UIColor(hexString: "1D4ED8"), UIColor(hexString: "7C3AED")]
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
        /// #888 (owner): ~8pt between the text lines of an order row (as on the Home list)
        static let orderRowLine: CGFloat = 8
        /// #888 (owner, mockup v5): 16pt above and below an order row's content
        static let orderRowPadding: CGFloat = 16
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

    /// #1384: the mockup's filled camera with a sparkle, 20 pt. A template image: tint it. Android `AppIcons.AiScan`
    static var aiScanIcon: UIImage? { UIImage(named: "aiScanCamera") }

    /// #1061 (owner: "icon đúng mockup"): the mockup's edit icon, Lucide "pen-line" (pencil + underline), drawn from its
    /// 24×24 paths `M12 20h9` and `M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z`, stroke 2.2, round caps and joins, no
    /// fill. SF `pencil.line` needs iOS 17 (the app targets 15). A template image: tint it. Android `AppIcons.EditLine`
    static func editIcon(size: CGFloat) -> UIImage? {
        let format = UIGraphicsImageRendererFormat.preferred()
        format.opaque = false
        let image = UIGraphicsImageRenderer(size: CGSize(width: size, height: size), format: format).image { context in
            let cg = context.cgContext
            cg.scaleBy(x: size / 24, y: size / 24)
            let path = UIBezierPath()
            path.move(to: CGPoint(x: 12, y: 20))
            path.addLine(to: CGPoint(x: 21, y: 20))
            // the arc's chord (3√2) is longer than 2 × 2.1, so SVG grows the radius to half of it: a half circle at (18, 5)
            path.move(to: CGPoint(x: 16.5, y: 3.5))
            path.addArc(withCenter: CGPoint(x: 18, y: 5), radius: 1.5 * 2.squareRoot(),
                        startAngle: .pi * 5 / 4, endAngle: .pi / 4, clockwise: true)
            path.addLine(to: CGPoint(x: 7, y: 19))
            path.addLine(to: CGPoint(x: 3, y: 20))
            path.addLine(to: CGPoint(x: 4, y: 16))
            path.close()
            path.lineWidth = 2.2
            path.lineCapStyle = .round
            path.lineJoinStyle = .round
            UIColor.black.setStroke()
            path.stroke()
        }
        return image.withRenderingMode(.alwaysTemplate)
    }
}

/// #888 (owner): every order status badge in the app uses the old app colours: solid fill, white text.
enum OrderStatusBadge {
    static func pill(for status: OrderStatus) -> DS.Pill {
        let white = UIColor.white
        switch status {
        case .reserved, .draft: return DS.Pill(text: white, fill: UIColor(hexString: "EF4444"))
        case .pickuped: return DS.Pill(text: white, fill: UIColor.accentOrange)
        case .returned, .completed: return DS.Pill(text: white, fill: UIColor(hexString: "16A34A"))
        default: return DS.Pill(text: white, fill: UIColor(hexString: "991B1B"))
        }
    }
}

/// Day labels and keys of the redesign, in the shop zone (`Date.shopTimeZone`) unless told otherwise (#596)
enum DayFormatter {
    /// A single day anywhere in the app: `05/10/26` (dd/mm/yy, #888 owner: no weekday, any language).
    /// `locale` is kept for callers and unused.
    static func short(_ date: Date, timeZone: TimeZone = Date.shopTimeZone, locale: Locale = .current) -> String {
        dmy(date, timeZone: timeZone)
    }

    /// `05/10/26` (dd/mm/yy, #888): a civil day of the shop zone, whatever the device zone
    static func dmy(_ date: Date, timeZone: TimeZone = Date.shopTimeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%02d/%02d/%02d", parts.day ?? 0, parts.month ?? 0, (parts.year ?? 0) % 100)
    }

    /// Weekday name only, for the 7-bar chart axis: `T7` in Vietnamese, `Sat` otherwise (never a day label)
    static func weekday(_ date: Date, timeZone: TimeZone = Date.shopTimeZone, locale: Locale = .current) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let weekday = calendar.component(.weekday, from: date)
        if locale.languageCode == "vi" { return weekday == 1 ? "CN" : "T\(weekday)" }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = timeZone
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    /// A day with a time: `05/10/26 14:30` (#888), the shop zone's day and clock
    static func dmyTime(_ date: Date, timeZone: TimeZone = Date.shopTimeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return dmy(date, timeZone: timeZone) + String(format: " %02d:%02d", parts.hour ?? 0, parts.minute ?? 0)
    }

    /// `yyyy-MM-dd` civil day
    static func key(_ date: Date, timeZone: TimeZone = Date.shopTimeZone) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }
}

/// #1145 the shop's currency (`merchant.currency`). Amounts are never converted, only shown differently.
enum ShopCurrency: String, Equatable, CaseIterable {
    case vnd = "VND"
    case usd = "USD"

    /// "USD" (any case, trimmed) is USD; anything else, empty or missing is VND (as before #1145)
    static func normalise(_ raw: String?) -> ShopCurrency {
        raw?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased() == ShopCurrency.usd.rawValue ? .usd : .vnd
    }

    /// "VND (đ)" / "USD ($)"
    var label: String {
        switch self {
        case .vnd: return "VND (đ)"
        case .usd: return "USD ($)"
        }
    }
}

/// The one money formatter of the app (#399, #1145).
/// VND: `1.150.000` (dot grouping, no decimals, no symbol). USD: `$1,150,000` (en-US grouping, symbol first,
/// 2 decimals only when there are cents: `$1,234.50`). Negative amounts start with "−" (U+2212).
enum MoneyFormatter {
    private static let formatter: NumberFormatter = {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = "."
        formatter.usesGroupingSeparator = true
        formatter.maximumFractionDigits = 0
        return formatter
    }()

    private static func usdFormatter(cents: Bool) -> NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = ","
        formatter.decimalSeparator = "."
        formatter.groupingSize = 3
        formatter.usesGroupingSeparator = true
        formatter.minimumFractionDigits = cents ? 2 : 0
        formatter.maximumFractionDigits = cents ? 2 : 0
        return formatter
    }

    private static let usdWhole = usdFormatter(cents: false)
    private static let usdCents = usdFormatter(cents: true)

    /// "1.150.000" in VND, "$1,150,000" in USD (the shop's currency unless one is given)
    static func format(_ amount: Double, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        switch currency {
        case .vnd:
            return plain(amount)
        case .usd:
            let cents = (amount * 100).rounded()
            let magnitude = abs(cents) / 100
            let whole = abs(cents).truncatingRemainder(dividingBy: 100) == 0
            let digits = (whole ? usdWhole : usdCents).string(from: NSNumber(value: magnitude)) ?? String(format: "%.2f", magnitude)
            return (cents < 0 ? "−" : "") + "$" + digits
        }
    }

    /// The VND style "1.150.000" whatever the currency: money input fields stay plain numbers (#1145)
    static func plain(_ amount: Double) -> String {
        let rounded = amount.rounded()
        let digits = formatter.string(from: NSNumber(value: abs(rounded))) ?? "\(Int(abs(rounded)))"
        return (rounded < 0 ? "−" : "") + digits
    }

    /// With the currency mark where the app wrote "đ" after the amount: "150.000đ" in VND, "$150,000" in USD
    static func suffixed(_ amount: Double, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        currency == .vnd ? format(amount, currency: .vnd) + "đ" : format(amount, currency: currency)
    }

    /// Unit next to a price field: "đ" / "đ/ngày" in VND, "$" / "$/ngày" in USD
    static func unitLabel(daily: Bool, currency: ShopCurrency = ShopCurrencyStore.current) -> String {
        switch currency {
        case .vnd: return (daily ? "products.cart.pricing.unitDaily" : "products.cart.pricing.unit").localized()
        case .usd: return (daily ? "currency.usd.unitDaily" : "currency.usd.unit").localized()
        }
    }

    /// USD compact: "$18.65M", "$1.2B" (two decimals at most, trailing zeros dropped); the full amount below a million
    static func compactUSD(_ amount: Double) -> String {
        let magnitude = abs(amount)
        guard magnitude >= 1_000_000 else { return format(amount, currency: .usd) }
        let billion = magnitude >= 1_000_000_000
        var scaled = magnitude / (billion ? 1_000_000_000 : 1_000_000)
        scaled = (scaled * 100).rounded() / 100
        var text = String(format: "%.2f", scaled)
        while text.hasSuffix("0") { text.removeLast() }
        if text.hasSuffix(".") { text.removeLast() }
        return (amount < 0 ? "−" : "") + "$" + text + (billion ? "B" : "M")
    }
}
