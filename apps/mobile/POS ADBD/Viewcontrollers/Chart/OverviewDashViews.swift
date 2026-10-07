//
//  OverviewDashViews.swift
//  POS ADBD
//
//  #616: views of the redesigned Tổng quan (canvas phone boards): colour tokens for light and dark, KPI tile,
//  day chart with hatched forecast and a value callout, "Hôm nay" counter, detail bars and the tile detail sheet.
//

import UIKit
import SnapKit

// MARK: - Tokens

/// Colours of the canvas, light and dark (the series colours were validated on the canvas)
enum OVColor {
    private static func dynamic(_ light: String, _ dark: String) -> UIColor {
        let l = UIColor(hexString: light)
        let d = UIColor(hexString: dark)
        return UIColor { $0.userInterfaceStyle == .dark ? d : l }
    }

    static let page = dynamic("F3F4F6", "0B1120")
    static let surface = dynamic("FFFFFF", "111827")
    static let line = dynamic("E2E8F0", "273244")
    static let ink = dynamic("0F172A", "F1F5F9")
    static let ink2 = dynamic("334155", "CBD5E1")
    static let muted = dynamic("475569", "94A3B8")
    static let faint = dynamic("94A3B8", "64748B")
    static let track = dynamic("F1F5F9", "1E293B")
    static let blue = dynamic("2563EB", "3B82F6")
    static let amber = dynamic("D97706", "D97706")
    static let green = dynamic("059669", "059669")
    static let violet = dynamic("7C3AED", "8B5CF6")
    static let red = dynamic("DC2626", "EF4444")
    static let total = dynamic("0F172A", "E2E8F0")
    static let link = dynamic("1D4ED8", "60A5FA")

    /// Chip text on its fill
    static func chip(_ tone: OverviewChipTone) -> (fg: UIColor, bg: UIColor) {
        switch tone {
        case .up: return (dynamic("047857", "6EE7B7"), dynamic("D1FAE5", "052E1F"))
        case .down: return (dynamic("B91C1C", "FCA5A5"), dynamic("FEE2E2", "450A0A"))
        case .warn: return (dynamic("92400E", "FCD34D"), dynamic("FEF3C7", "3A2205"))
        case .info: return (dynamic("1E40AF", "93C5FD"), dynamic("DBEAFE", "172554"))
        }
    }
}

/// App fonts scaled with Dynamic Type, capped so the 2×2 grid still fits
enum OVFont {
    static func make(_ size: CGFloat, _ weight: UIFont.Weight = .regular, digits: Bool = false) -> UIFont {
        let base: UIFont
        if digits {
            base = UIFont.monospacedDigitSystemFont(ofSize: size, weight: weight)
        } else {
            switch weight {
            case .bold, .semibold, .heavy, .black: base = Utils.boldFont(size: size)
            case .medium: base = Utils.mediumFont(size: size)
            default: base = Utils.regularFont(size: size)
            }
        }
        return UIFontMetrics(forTextStyle: .body).scaledFont(for: base, maximumPointSize: (size * 1.35).rounded())
    }

    static func label(_ text: String? = nil, _ size: CGFloat, _ weight: UIFont.Weight = .regular,
                      color: UIColor = OVColor.ink, digits: Bool = false, lines: Int = 1) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = make(size, weight, digits: digits)
        label.adjustsFontForContentSizeCategory = true
        label.textColor = color
        label.numberOfLines = lines
        return label
    }
}

/// Diagonal hatch (135°) for "expected / upcoming" marks
enum OVHatch {
    static func fill(_ rect: CGRect, color: UIColor, in context: CGContext, spacing: CGFloat = 5, lineWidth: CGFloat = 1.6) {
        guard rect.width > 0, rect.height > 0 else { return }
        context.saveGState()
        context.clip(to: rect)
        context.setStrokeColor(color.cgColor)
        context.setLineWidth(lineWidth)
        var x = rect.minX - rect.height
        while x < rect.maxX + rect.height {
            context.move(to: CGPoint(x: x, y: rect.maxY))
            context.addLine(to: CGPoint(x: x + rect.height, y: rect.minY))
            x += spacing
        }
        context.strokePath()
        context.restoreGState()
    }
}

// MARK: - Small parts

/// A rounded pill with padding ("▲ 12%", "1 đơn quá ngày")
final class OverviewPillLabel: UILabel {
    private let insets = UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8)

    convenience init(_ chip: OverviewTileChip) {
        self.init(frame: .zero)
        let colors = OVColor.chip(chip.tone)
        text = chip.text
        textColor = colors.fg
        backgroundColor = colors.bg
        font = OVFont.make(DS.TextSize.pill, .bold)
        adjustsFontForContentSizeCategory = true
        layer.cornerRadius = 10
        layer.masksToBounds = true
        lineBreakMode = .byTruncatingTail
    }

    override func drawText(in rect: CGRect) { super.drawText(in: UIEdgeInsetsInsetRect(rect, insets)) }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + insets.left + insets.right, height: size.height + insets.top + insets.bottom)
    }
}

/// A bar on a track: solid, or hatched with a border (upcoming); `left` and `width` are 0…1 of the track
final class OverviewTrackBar: UIView {
    var left: Double = 0 { didSet { setNeedsDisplay() } }
    var width: Double = 0 { didSet { setNeedsDisplay() } }
    var color: UIColor = OVColor.blue { didSet { setNeedsDisplay() } }
    var hatched = false { didSet { setNeedsDisplay() } }
    var showsTrack = true

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        backgroundColor = .clear
        contentMode = .redraw
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        if showsTrack {
            OVColor.track.setFill()
            UIBezierPath(roundedRect: bounds, cornerRadius: 3).fill()
        }
        let w = max(width > 0 ? 3 : 0, bounds.width * CGFloat(width))
        let bar = CGRect(x: min(bounds.width - w, bounds.width * CGFloat(left)), y: 0, width: w, height: bounds.height)
        guard bar.width > 0 else { return }
        let path = UIBezierPath(roundedRect: bar, cornerRadius: 3)
        if hatched {
            context.saveGState()
            path.addClip()
            OVHatch.fill(bar, color: color, in: context)
            context.restoreGState()
            color.setStroke()
            let border = UIBezierPath(roundedRect: bar.insetBy(dx: 0.75, dy: 0.75), cornerRadius: 3)
            border.lineWidth = 1.5
            border.stroke()
        } else {
            color.setFill()
            path.fill()
        }
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        setNeedsDisplay()
    }
}

/// One bar split into coloured parts (shares 0…1), 2 pt between parts; a grey track when all are 0
final class OverviewStackedBar: UIView {
    private var parts: [(share: Double, color: UIColor, hatched: Bool)] = []

    func configure(_ parts: [(share: Double, color: UIColor, hatched: Bool)]) {
        self.parts = parts.filter { $0.share > 0 }
        setNeedsDisplay()
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        backgroundColor = .clear
        contentMode = .redraw
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let outer = UIBezierPath(roundedRect: bounds, cornerRadius: 3)
        guard !parts.isEmpty else {
            OVColor.track.setFill()
            outer.fill()
            return
        }
        context.saveGState()
        outer.addClip()
        let gaps = CGFloat(parts.count - 1) * 2
        var x: CGFloat = 0
        for (index, part) in parts.enumerated() {
            let w = index == parts.count - 1 ? bounds.width - x : (bounds.width - gaps) * CGFloat(part.share)
            let segment = CGRect(x: x, y: 0, width: max(0, w), height: bounds.height)
            if part.hatched {
                OVHatch.fill(segment, color: part.color, in: context)
                part.color.setStroke()
                let border = UIBezierPath(rect: segment.insetBy(dx: 0.75, dy: 0.75))
                border.lineWidth = 1.5
                border.stroke()
            } else {
                part.color.setFill()
                UIRectFill(segment)
            }
            x += w + 2
        }
        context.restoreGState()
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        setNeedsDisplay()
    }
}

/// A control whose touch area grows to 44×44 around a smaller drawn shape
class OverviewHitControl: UIControl {
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        let dx = max(0, DS.touchTarget - bounds.width) / 2
        let dy = max(0, DS.touchTarget - bounds.height) / 2
        return bounds.insetBy(dx: -dx, dy: -dy).contains(point)
    }

    override var isHighlighted: Bool {
        didSet { alpha = isHighlighted ? 0.7 : 1 }
    }
}

// MARK: - Period chip

final class OverviewChipButton: OverviewHitControl {
    private let titleLabel = OVFont.label(nil, DS.TextSize.secondary)

    var isOn = false { didSet { apply() } }

    init(title: String) {
        super.init(frame: .zero)
        titleLabel.text = title
        titleLabel.isUserInteractionEnabled = false
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14))
        }
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(36) }
        layer.borderWidth = 1
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
        apply()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func setTitle(_ title: String) {
        titleLabel.text = title
        accessibilityLabel = title
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        layer.cornerRadius = bounds.height / 2
    }

    private func apply() {
        backgroundColor = isOn ? OVColor.ink : OVColor.surface
        titleLabel.textColor = isOn ? OVColor.surface : OVColor.ink2
        titleLabel.font = OVFont.make(DS.TextSize.secondary, isOn ? .semibold : .regular)
        layer.borderColor = (isOn ? OVColor.ink : OVColor.line).resolvedColor(with: traitCollection).cgColor
        accessibilityLabel = titleLabel.text
        accessibilityTraits = isOn ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        apply()
    }
}

// MARK: - KPI tile

/// Collected (solid) then expected (hatched, bordered) in one thin bar
final class OverviewForecastBar: UIView {
    var collectedShare: Double = 0 { didSet { setNeedsDisplay() } }

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        backgroundColor = .clear
        contentMode = .redraw
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        let done = (bounds.width - 2) * CGFloat(min(1, max(0, collectedShare)))
        if done > 0 {
            OVColor.blue.setFill()
            UIBezierPath(roundedRect: CGRect(x: 0, y: 0, width: done, height: bounds.height),
                         byRoundingCorners: [.topLeft, .bottomLeft], cornerRadii: CGSize(width: 3, height: 3)).fill()
        }
        let rest = CGRect(x: done > 0 ? done + 2 : 0, y: 0, width: bounds.width - (done > 0 ? done + 2 : 0), height: bounds.height)
        guard rest.width > 0 else { return }
        let path = UIBezierPath(roundedRect: rest, byRoundingCorners: done > 0 ? [.topRight, .bottomRight] : .allCorners,
                                cornerRadii: CGSize(width: 3, height: 3))
        context.saveGState()
        path.addClip()
        OVHatch.fill(rest, color: OVColor.blue, in: context, spacing: 4, lineWidth: 1.2)
        context.restoreGState()
        OVColor.blue.setStroke()
        let border = UIBezierPath(roundedRect: rest.insetBy(dx: 0.6, dy: 0.6), byRoundingCorners: done > 0 ? [.topRight, .bottomRight] : .allCorners,
                                  cornerRadii: CGSize(width: 3, height: 3))
        border.lineWidth = 1.2
        border.stroke()
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        setNeedsDisplay()
    }
}

final class OverviewTileView: UIControl {
    let kind: OverviewTileKind

    init(tile: OverviewTile, valueText: String, forecast: OverviewForecast?, forecastText: String?, loading: Bool) {
        kind = tile.kind
        super.init(frame: .zero)
        backgroundColor = OVColor.surface
        layer.cornerRadius = 14
        layer.borderWidth = 1
        layer.borderColor = OVColor.line.resolvedColor(with: traitCollection).cgColor

        let title = OVFont.label(tile.kind.title, DS.TextSize.secondary, color: OVColor.ink2)
        title.adjustsFontSizeToFitWidth = true
        title.minimumScaleFactor = 0.8
        let value = OVFont.label(loading ? "…" : valueText, DS.TextSize.amount, .bold, digits: true)
        value.adjustsFontSizeToFitWidth = true
        value.minimumScaleFactor = 0.6
        let column = UIStackView(arrangedSubviews: [title, value])
        column.axis = .vertical
        column.spacing = 6
        column.alignment = .fill
        column.isUserInteractionEnabled = false

        if !loading, let forecast, let forecastText {
            let bar = OverviewForecastBar()
            bar.collectedShare = forecast.collectedShare
            bar.snp.makeConstraints { make in make.height.equalTo(5) }
            let note = OVFont.label(forecastText, DS.TextSize.pill, color: OVColor.muted, lines: 2)
            column.addArrangedSubview(bar)
            column.addArrangedSubview(note)
            column.setCustomSpacing(4, after: bar)
        }
        if !loading, let chip = tile.chip {
            let pill = OverviewPillLabel(chip)
            let row = UIStackView(arrangedSubviews: [pill, UIView()])
            row.alignment = .center
            column.addArrangedSubview(row)
        }
        addSubview(column)
        column.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview().inset(12)
            make.bottom.lessThanOrEqualToSuperview().inset(12)
        }
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(108) }

        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
        accessibilityLabel = [tile.kind.title, loading ? nil : valueText, forecastText, tile.chip?.text]
            .compactMap { $0 }.joined(separator: ", ")
        accessibilityHint = "overview.dash.openDetail".localized()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var isHighlighted: Bool {
        didSet { backgroundColor = isHighlighted ? OVColor.track : OVColor.surface }
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        layer.borderColor = OVColor.line.resolvedColor(with: traitCollection).cgColor
    }
}

// MARK: - Day chart

/// "Thực thu theo ngày": solid collected, hatched forecast on top, a dashed "Hôm nay" marker, axis labels at the
/// first day, today and the last day. Tap a bar for its values; tap it again (or outside) to hide them.
final class OverviewDayChartView: UIView {
    private var bars: [OverviewDashBar] = []
    private var labelFor: (OverviewDashBar) -> String = { $0.key }
    private var axisFor: (OverviewDashBar) -> String = { $0.key }
    private var selected: Int?
    private let callout = UIView()
    private let calloutLabel = UILabel()

    private let topInset: CGFloat = 20
    private let axisHeight: CGFloat = 20

    override init(frame: CGRect) {
        super.init(frame: frame)
        isOpaque = false
        backgroundColor = .clear
        contentMode = .redraw
        callout.backgroundColor = OVColor.surface
        callout.layer.cornerRadius = 10
        callout.layer.borderWidth = 1
        callout.layer.shadowColor = UIColor.black.cgColor
        callout.layer.shadowOpacity = 0.12
        callout.layer.shadowRadius = 8
        callout.layer.shadowOffset = CGSize(width: 0, height: 3)
        callout.isHidden = true
        callout.isUserInteractionEnabled = false
        calloutLabel.numberOfLines = 0
        callout.addSubview(calloutLabel)
        calloutLabel.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)) }
        addSubview(callout)
        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tapped(_:))))
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// `label`: callout day ("T3 07/10"); `axis`: label under a bar ("07/10")
    func configure(_ bars: [OverviewDashBar], label: @escaping (OverviewDashBar) -> String, axis: @escaping (OverviewDashBar) -> String) {
        self.bars = bars
        labelFor = label
        axisFor = axis
        selected = nil
        callout.isHidden = true
        setNeedsDisplay()
        setNeedsLayout()
    }

    private var plot: CGRect {
        CGRect(x: 0, y: topInset, width: bounds.width, height: max(0, bounds.height - topInset - axisHeight))
    }

    private var gap: CGFloat { bars.count > 20 ? 2 : 4 }

    private func barFrame(_ index: Int) -> CGRect {
        let n = CGFloat(max(1, bars.count))
        let width = (plot.width - gap * (n - 1)) / n
        let x = plot.minX + CGFloat(index) * (width + gap)
        return CGRect(x: x, y: plot.minY, width: width, height: plot.height)
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext(), !bars.isEmpty else { return }
        let plot = self.plot
        for (index, bar) in bars.enumerated() {
            let column = barFrame(index)
            let dim = selected != nil && selected != index
            let alpha: CGFloat = dim ? 0.35 : 1
            let totalHeight = bar.ratio > 0 ? max(3, plot.height * CGFloat(bar.ratio)) : 0
            let forecastHeight = bar.forecastRatio > 0 ? max(3, plot.height * CGFloat(bar.forecastRatio)) : 0
            let valueHeight = max(0, totalHeight - forecastHeight)
            let radius = min(3, column.width / 2)
            if valueHeight > 0 {
                let r = CGRect(x: column.minX, y: plot.maxY - valueHeight, width: column.width, height: valueHeight)
                OVColor.blue.withAlphaComponent(alpha).setFill()
                UIBezierPath(roundedRect: r, byRoundingCorners: forecastHeight > 0 ? [] : [.topLeft, .topRight],
                             cornerRadii: CGSize(width: radius, height: radius)).fill()
            }
            if forecastHeight > 0 {
                let r = CGRect(x: column.minX, y: plot.maxY - totalHeight, width: column.width, height: forecastHeight)
                let path = UIBezierPath(roundedRect: r, byRoundingCorners: [.topLeft, .topRight], cornerRadii: CGSize(width: radius, height: radius))
                context.saveGState()
                path.addClip()
                OVHatch.fill(r, color: OVColor.blue.withAlphaComponent(alpha), in: context, spacing: 4.5, lineWidth: 1.4)
                context.restoreGState()
                OVColor.blue.withAlphaComponent(alpha).setStroke()
                let border = UIBezierPath(roundedRect: r.insetBy(dx: 0.75, dy: 0.75), byRoundingCorners: [.topLeft, .topRight],
                                          cornerRadii: CGSize(width: radius, height: radius))
                border.lineWidth = 1.5
                border.stroke()
            }
        }
        // Base line
        OVColor.line.setFill()
        UIRectFill(CGRect(x: 0, y: plot.maxY, width: bounds.width, height: 1))

        // "Hôm nay" marker
        if let today = bars.firstIndex(where: { $0.isToday }) {
            let x = barFrame(today).midX
            let dash = UIBezierPath()
            dash.move(to: CGPoint(x: x, y: plot.minY - 6))
            dash.addLine(to: CGPoint(x: x, y: plot.maxY + 4))
            dash.lineWidth = 1.5
            dash.setLineDash([4, 3], count: 2, phase: 0)
            OVColor.faint.setStroke()
            dash.stroke()
            let text = "overview.dash.chart.today".localized() as NSString
            let attrs: [NSAttributedString.Key: Any] = [.font: OVFont.make(DS.TextSize.pill, .semibold), .foregroundColor: OVColor.ink2]
            let size = text.size(withAttributes: attrs)
            var origin = CGPoint(x: x - size.width / 2, y: 0)
            origin.x = min(max(0, origin.x), bounds.width - size.width)
            OVColor.surface.setFill()
            UIRectFill(CGRect(x: origin.x - 4, y: origin.y, width: size.width + 8, height: size.height))
            text.draw(at: origin, withAttributes: attrs)
        }

        // Axis labels: first, today, last
        let indexes = OverviewDashLogic.axisLabelIndexes(bars)
        var lastMaxX: CGFloat = -.greatestFiniteMagnitude
        for index in indexes {
            let bar = bars[index]
            let text = axisFor(bar) as NSString
            let bold = bar.isToday
            let attrs: [NSAttributedString.Key: Any] = [
                .font: OVFont.make(DS.TextSize.pill, bold ? .bold : .regular),
                .foregroundColor: bold ? OVColor.ink : OVColor.muted,
            ]
            let size = text.size(withAttributes: attrs)
            var x = barFrame(index).midX - size.width / 2
            if index == 0 { x = 0 }
            if index == bars.count - 1 { x = bounds.width - size.width }
            x = min(max(0, x), bounds.width - size.width)
            guard x >= lastMaxX + 4 else { continue }
            text.draw(at: CGPoint(x: x, y: plot.maxY + 5), withAttributes: attrs)
            lastMaxX = x + size.width
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        placeCallout()
        updateAccessibility()
    }

    @objc private func tapped(_ gesture: UITapGestureRecognizer) {
        let point = gesture.location(in: self)
        let index = bars.indices.first { barFrame($0).insetBy(dx: -gap / 2, dy: 0).contains(CGPoint(x: point.x, y: plot.midY)) }
        selected = (index == nil || index == selected) ? nil : index
        setNeedsDisplay()
        placeCallout()
        if selected != nil, let text = calloutLabel.attributedText?.string {
            UIAccessibilityPostNotification(UIAccessibilityAnnouncementNotification, text.replacingOccurrences(of: "\n", with: ", "))
        }
    }

    private func placeCallout() {
        guard let index = selected, bars.indices.contains(index) else {
            callout.isHidden = true
            return
        }
        let bar = bars[index]
        let money: (Double) -> String = { MoneyFormatter.format($0) }
        let text = NSMutableAttributedString(string: labelFor(bar) + "\n",
                                             attributes: [.font: OVFont.make(DS.TextSize.pill, .bold), .foregroundColor: OVColor.ink])
        let row: (String, String) -> Void = { name, value in
            text.append(NSAttributedString(string: name + "  ", attributes: [.font: OVFont.make(DS.TextSize.pill), .foregroundColor: OVColor.ink2]))
            text.append(NSAttributedString(string: value + "\n", attributes: [.font: OVFont.make(DS.TextSize.pill, .semibold, digits: true),
                                                                              .foregroundColor: OVColor.ink]))
        }
        row("overview.dash.chart.collected".localized(), money(bar.value))
        if bar.forecast > 0 {
            row("overview.dash.chart.forecast".localized(), money(bar.forecast))
            row("overview.dash.chart.total".localized(), money(bar.value + bar.forecast))
        }
        if text.string.hasSuffix("\n") { text.deleteCharacters(in: NSRange(location: text.length - 1, length: 1)) }
        calloutLabel.attributedText = text
        callout.layer.borderColor = OVColor.line.resolvedColor(with: traitCollection).cgColor
        let size = calloutLabel.sizeThatFits(CGSize(width: 220, height: CGFloat.greatestFiniteMagnitude))
        let width = size.width + 20
        let height = size.height + 16
        let column = barFrame(index)
        var x = column.midX - width / 2
        x = min(max(0, x), bounds.width - width)
        callout.frame = CGRect(x: x, y: 0, width: width, height: height)
        callout.isHidden = false
        bringSubview(toFront: callout)
    }

    private func updateAccessibility() {
        accessibilityElements = bars.indices.map { index in
            let bar = bars[index]
            let element = UIAccessibilityElement(accessibilityContainer: self)
            var parts = [labelFor(bar), "overview.dash.chart.collected".localized() + " " + MoneyFormatter.format(bar.value)]
            if bar.forecast > 0 { parts.append("overview.dash.chart.forecast".localized() + " " + MoneyFormatter.format(bar.forecast)) }
            element.accessibilityLabel = parts.joined(separator: ", ")
            element.accessibilityFrameInContainerSpace = barFrame(index)
            return element
        }
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        setNeedsDisplay()
        placeCallout()
    }
}

// MARK: - Hôm nay counter

final class OverviewCounterView: UIControl {
    init(title: String, value: String, valueColor: UIColor, dot: UIColor, accessibility: String) {
        super.init(frame: .zero)
        layer.cornerRadius = 12
        layer.borderWidth = 1
        layer.borderColor = OVColor.line.resolvedColor(with: traitCollection).cgColor
        let swatch = UIView()
        swatch.backgroundColor = dot
        swatch.layer.cornerRadius = 2
        swatch.snp.makeConstraints { make in make.width.height.equalTo(8) }
        let label = OVFont.label(title, DS.TextSize.pill, color: OVColor.ink2)
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.85
        let head = UIStackView(arrangedSubviews: [swatch, label])
        head.spacing = 6
        head.alignment = .center
        let number = OVFont.label(value, 22, .bold, color: valueColor, digits: true)
        let column = UIStackView(arrangedSubviews: [head, number])
        column.axis = .vertical
        column.spacing = 4
        column.isUserInteractionEnabled = false
        addSubview(column)
        column.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)) }
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
        accessibilityLabel = accessibility
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var isHighlighted: Bool {
        didSet { backgroundColor = isHighlighted ? OVColor.track : .clear }
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        layer.borderColor = OVColor.line.resolvedColor(with: traitCollection).cgColor
    }
}

// MARK: - Detail sheet

/// What a tile's sheet shows; built by the overview from the report and the "now" figures
struct OverviewDetailContent {
    let kind: OverviewTileKind
    let periodTitle: String
    let valueText: String
    let report: OverviewReport
    let now: OverviewNow?
}

/// Bottom sheet of one tile (board "Điện thoại · đang mở chi tiết Thực thu"): its value, a small chart, and
/// "Xem các đơn liên quan →"
final class OverviewDetailSheet: UIViewController {
    var onOpenOrders: (() -> Void)?
    private let content: OverviewDetailContent

    init(_ content: OverviewDetailContent) {
        self.content = content
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = OVColor.surface

        let caption = OVFont.label("\(content.kind.title) · \(content.periodTitle)", DS.TextSize.secondary, color: OVColor.ink2, lines: 0)
        let value = OVFont.label(content.valueText, 26, .bold, digits: true)
        value.adjustsFontSizeToFitWidth = true
        value.minimumScaleFactor = 0.6
        let titles = UIStackView(arrangedSubviews: [caption, value])
        titles.axis = .vertical
        titles.spacing = 2
        titles.isAccessibilityElement = true
        titles.accessibilityTraits = UIAccessibilityTraitHeader
        titles.accessibilityLabel = "\(caption.text ?? ""), \(content.valueText)"

        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", 18, weight: .semibold), for: .normal)
        close.tintColor = OVColor.ink
        close.backgroundColor = OVColor.track
        close.layer.cornerRadius = 12
        close.accessibilityLabel = "overview.v2.detail.close".localized()
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        close.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        close.setContentHuggingPriority(.required, for: .horizontal)
        let header = UIStackView(arrangedSubviews: [titles, close])
        header.alignment = .top
        header.spacing = DS.Spacing.md

        let body = UIStackView(arrangedSubviews: bodyViews())
        body.axis = .vertical
        body.spacing = 10

        let link = UIButton(type: .system)
        link.setTitle("overview.dash.detail.viewOrders".localized(), for: .normal)
        link.setTitleColor(OVColor.link, for: .normal)
        link.titleLabel?.font = OVFont.make(DS.TextSize.secondary, .semibold)
        link.titleLabel?.adjustsFontForContentSizeCategory = true
        link.contentHorizontalAlignment = .leading
        link.addTarget(self, action: #selector(linkTapped), for: .touchUpInside)
        link.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }

        let stack = UIStackView(arrangedSubviews: [header, body, link])
        stack.axis = .vertical
        stack.spacing = 14
        let scroll = UIScrollView()
        view.addSubview(scroll)
        scroll.addSubview(stack)
        scroll.snp.makeConstraints { make in make.edges.equalTo(view.safeAreaLayoutGuide) }
        stack.snp.makeConstraints { make in
            make.top.equalTo(scroll.contentLayoutGuide).offset(DS.Spacing.lg)
            make.bottom.equalTo(scroll.contentLayoutGuide).offset(-DS.Spacing.lg)
            make.leading.trailing.equalTo(scroll.frameLayoutGuide).inset(18)
        }
    }

    @objc private func closeTapped() { dismiss(animated: true) }

    @objc private func linkTapped() {
        let open = onOpenOrders
        dismiss(animated: true) { open?() }
    }

    // MARK: Bodies

    private func bodyViews() -> [UIView] {
        switch content.kind {
        case .collected: return collectedBody()
        case .outstanding: return outstandingBody()
        case .collateral: return collateralBody()
        case .orderValue: return orderValueBody()
        }
    }

    private func empty() -> [UIView] {
        [OVFont.label("overview.dash.detail.empty".localized(), DS.TextSize.secondary, color: OVColor.muted, lines: 0)]
    }

    /// Label (112 pt) · bar · amount (≥ 82 pt), as the board's grid
    private func barRow(_ name: String, note: String? = nil, bar: UIView, value: String, strong: Bool = false) -> UIView {
        let label = UILabel()
        label.numberOfLines = 0
        label.adjustsFontForContentSizeCategory = true
        let text = NSMutableAttributedString(string: name, attributes: [
            .font: OVFont.make(DS.TextSize.pill, strong ? .bold : .regular), .foregroundColor: strong ? OVColor.ink : OVColor.ink2])
        if let note {
            text.append(NSAttributedString(string: " · " + note, attributes: [.font: OVFont.make(DS.TextSize.pill), .foregroundColor: OVColor.muted]))
        }
        label.attributedText = text
        label.snp.makeConstraints { make in make.width.equalTo(112) }
        let amount = OVFont.label(value, DS.TextSize.pill, strong ? .bold : .regular, color: strong ? OVColor.ink : OVColor.ink2, digits: true)
        amount.textAlignment = .right
        amount.setContentHuggingPriority(.required, for: .horizontal)
        amount.setContentCompressionResistancePriority(.required, for: .horizontal)
        amount.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(82) }
        bar.snp.makeConstraints { make in make.height.equalTo(10) }
        let row = UIStackView(arrangedSubviews: [label, bar, amount])
        row.alignment = .center
        row.spacing = 8
        row.isAccessibilityElement = true
        row.accessibilityLabel = [name, note, value].compactMap { $0 }.joined(separator: ", ")
        return row
    }

    private func track(left: Double = 0, width: Double, color: UIColor, hatched: Bool = false) -> OverviewTrackBar {
        let bar = OverviewTrackBar()
        bar.left = left
        bar.width = width
        bar.color = color
        bar.hatched = hatched
        return bar
    }

    private func orders(_ count: Int) -> String { PluralText.format("overview.dash.orders", count: count, count) }

    private static func signedMoney(_ amount: Double) -> String {
        amount < 0 ? "−" + MoneyFormatter.format(-amount) : "+" + MoneyFormatter.format(amount)
    }

    private func collectedBody() -> [UIView] {
        guard let parts = content.report.collectedBreakdown else { return empty() }
        let names: [OverviewWaterfallRow.Key: String] = [
            .deposits: "overview.dash.money.deposits".localized(),
            .pickupAndSale: "overview.dash.money.pickupAndSale".localized(),
            .fees: "overview.dash.money.fees".localized(),
            .refunds: "overview.dash.money.refunds".localized(),
            .total: "overview.dash.kpi.collected".localized(),
        ]
        return OverviewDashLogic.waterfall(parts, total: content.report.netRevenue).map { row in
            let color: UIColor = row.isTotal ? OVColor.total : (row.amount < 0 ? OVColor.red : OVColor.blue)
            let value = row.isTotal ? MoneyFormatter.format(row.amount) : Self.signedMoney(row.amount)
            return barRow(names[row.key] ?? "", bar: track(left: row.left, width: row.width, color: color), value: value, strong: row.isTotal)
        }
    }

    private func legendRow(_ color: UIColor, _ name: String, note: String, value: String) -> UIView {
        let dot = UIView()
        dot.backgroundColor = color
        dot.layer.cornerRadius = 3
        dot.snp.makeConstraints { make in make.width.height.equalTo(10) }
        let label = UILabel()
        label.numberOfLines = 0
        label.adjustsFontForContentSizeCategory = true
        let text = NSMutableAttributedString(string: name, attributes: [.font: OVFont.make(DS.TextSize.secondary), .foregroundColor: OVColor.ink])
        text.append(NSAttributedString(string: " · " + note, attributes: [.font: OVFont.make(DS.TextSize.secondary), .foregroundColor: OVColor.muted]))
        label.attributedText = text
        let amount = OVFont.label(value, DS.TextSize.secondary, .semibold, digits: true)
        amount.setContentHuggingPriority(.required, for: .horizontal)
        amount.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [dot, label, amount])
        row.alignment = .center
        row.spacing = 10
        row.isAccessibilityElement = true
        row.accessibilityLabel = "\(name), \(note), \(value)"
        return row
    }

    private func stacked(_ parts: [(share: Double, color: UIColor, hatched: Bool)]) -> UIView {
        let bar = OverviewStackedBar()
        bar.configure(parts)
        bar.snp.makeConstraints { make in make.height.equalTo(16) }
        bar.isAccessibilityElement = false
        return bar
    }

    private func outstandingBody() -> [UIView] {
        guard let parts = content.report.outstandingBreakdown else { return empty() }
        let (atPickup, overdue) = OverviewDashLogic.split(parts.atPickup, parts.overduePickup)
        return [
            stacked([(atPickup.share, OVColor.blue, false), (overdue.share, OVColor.amber, false)]),
            legendRow(OVColor.blue, "overview.dash.money.atPickup".localized(), note: orders(atPickup.orders),
                      value: MoneyFormatter.format(atPickup.amount)),
            legendRow(OVColor.amber, "overview.dash.money.overduePickup".localized(), note: orders(overdue.orders),
                      value: MoneyFormatter.format(overdue.amount)),
        ]
    }

    private func collateralBody() -> [UIView] {
        let rows = OverviewDashLogic.collateralRows(flow: content.report.collateralFlow, now: content.now)
        guard !rows.isEmpty else { return empty() }
        let names: [OverviewCollateralRow.Key: String] = [
            .received: "overview.dash.detail.received".localized(),
            .returned: "overview.dash.detail.returned".localized(),
            .toCollect: "overview.dash.detail.toCollect".localized(),
            .toReturn: "overview.dash.detail.toReturn".localized(),
        ]
        var views: [UIView] = rows.map { row in
            let color = row.key == .received || row.key == .toCollect ? OVColor.green : OVColor.violet
            return barRow(names[row.key] ?? "", note: row.orders.map(orders), bar: track(width: row.width, color: color, hatched: row.upcoming),
                          value: MoneyFormatter.format(row.amount))
        }
        if rows.contains(where: \.upcoming) {
            views.append(OVFont.label("overview.dash.detail.hatchNote".localized(), DS.TextSize.pill, color: OVColor.muted, lines: 0))
        }
        return views
    }

    private func orderValueBody() -> [UIView] {
        var views: [UIView] = []
        let count = content.report.newOrders
        views.append(legendRow(OVColor.ink, "overview.dash.detail.newOrders".localized(), note: count.map(orders) ?? "—",
                               value: content.report.totalOrderValue.map(MoneyFormatter.format) ?? "—"))
        if let split = content.report.orderValueByType {
            let (rent, sale) = OverviewDashLogic.split(split.rent, split.sale)
            views.append(stacked([(rent.share, OVColor.blue, false), (sale.share, OVColor.violet, false)]))
            views.append(legendRow(OVColor.blue, "overview.dash.detail.rent".localized(), note: orders(rent.orders),
                                   value: MoneyFormatter.format(rent.amount)))
            views.append(legendRow(OVColor.violet, "overview.dash.detail.sale".localized(), note: orders(sale.orders),
                                   value: MoneyFormatter.format(sale.amount)))
        }
        if let chip = OverviewDashLogic.growthChip(content.report.orderValueGrowth) {
            let pill = OverviewPillLabel(chip)
            let row = UIStackView(arrangedSubviews: [pill, OVFont.label("overview.v2.vsPreviousPeriod".localized(), DS.TextSize.pill, color: OVColor.muted), UIView()])
            row.spacing = 6
            row.alignment = .center
            views.append(row)
        }
        return views
    }
}
