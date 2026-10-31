//
//  OnboardingV2Stage.swift
//  POS ADBD
//
//  #1404 the picture half of the 3-page onboarding: the one photo that travels, the scan and its results (page 1), the
//  calendar and the overlap warning (page 2), today's rows (page 3). It only draws what `render` is told, one frame at a
//  time, from the pure functions in `OnboardingV2Cycle.swift`. Decorative: VoiceOver reads the page text instead, and
//  nothing in here is tappable. All names, numbers and dates are fixed sample data.
//

import UIKit
import SnapKit

private enum Tone {
    static let stage = UIColor(hexString: "EFF6FF")
    static let ink = UIColor(hexString: "0F172A")
    static let ink2 = UIColor(hexString: "334155")
    static let muted = UIColor(hexString: "64748B")
    static let line = UIColor(hexString: "E2E8F0")
    static let okFill = UIColor(hexString: "ECFDF5")
    static let okInk = UIColor(hexString: "047857")
    static let lowFill = UIColor(hexString: "FFF3E0")
    static let lowInk = UIColor(hexString: "C2410C")
    static let red = UIColor(hexString: "DC2626")
    static let redFill = UIColor(hexString: "FEE2E2")
    static let redInk = UIColor(hexString: "B91C1C")
    static let tick = UIColor(hexString: "059669")
    static let stockDot = UIColor(hexString: "10B981")
    static let purple = UIColor(hexString: "7C3AED")
    static let glow = UIColor(hexString: "7C3AED")
    static let pickupFill = UIColor(hexString: "DBEAFE")
    static let pickupInk = UIColor(hexString: "1E40AF")
    static let returnFill = UIColor(hexString: "EDE9FE")
    static let returnInk = UIColor(hexString: "6D28D9")
    static let shadow = UIColor(hexString: "0F172A")
}

private func text(_ value: String, _ font: UIFont, _ color: UIColor, lines: Int = 1) -> UILabel {
    let label = UILabel()
    label.text = value
    label.font = font
    label.textColor = color
    label.numberOfLines = lines
    label.adjustsFontSizeToFitWidth = lines == 1
    label.minimumScaleFactor = 0.75
    return label
}

/// Cover the view from the top of the image, as the mockup's `object-fit: cover; object-position: 50% 0`.
private func coverFromTop(_ image: UIImage?, _ size: CGSize) -> CGRect {
    guard let image, image.size.height > 0, size.width > 0, size.height > 0 else { return CGRect(x: 0, y: 0, width: 1, height: 1) }
    let imageAspect = image.size.width / image.size.height
    let viewAspect = size.width / size.height
    if imageAspect > viewAspect {
        let visible = viewAspect / imageAspect
        return CGRect(x: (1 - visible) / 2, y: 0, width: visible, height: 1)
    }
    return CGRect(x: 0, y: 0, width: 1, height: imageAspect / viewAspect)
}

private func photo(_ name: String, radius: CGFloat) -> UIImageView {
    let view = UIImageView(image: UIImage(named: name))
    view.contentMode = .scaleToFill
    view.clipsToBounds = true
    view.layer.cornerRadius = radius
    view.backgroundColor = Tone.line
    return view
}

final class OnboardingV2StageView: UIView {
    let metrics: OnboardingV2Metrics
    private let sample: OnboardingV2Sample

    private let cards = UIView()
    private let overlapCard: OverlapCard
    private let todayCard: TodayCard
    private let hero = UIView()
    private let heroImage = photo("onboarding_v2_dress", radius: 0)
    private let scanFrame = ScanFrameView()
    private let results: ResultsPanel
    private let warning: WarningPanel

    private var heroFrom: CGRect = .zero
    private var heroFromRadius: CGFloat = 0
    private var currentHero: CGRect = .zero
    private var currentRadius: CGFloat = 0

    init(metrics: OnboardingV2Metrics) {
        self.metrics = metrics
        sample = OnboardingV2Sample(language: "onboarding.v2.sample.lang".localized())
        overlapCard = OverlapCard(metrics: metrics)
        todayCard = TodayCard(metrics: metrics, sample: sample)
        results = ResultsPanel(metrics: metrics)
        warning = WarningPanel(metrics: metrics)
        super.init(frame: .zero)
        accessibilityElementsHidden = true
        isUserInteractionEnabled = false
        backgroundColor = Tone.stage
        clipsToBounds = true
        layer.cornerRadius = metrics.compact ? 22 : 30
        layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]

        let grid = AuthV2DotGrid()
        [grid, overlapCard, todayCard, hero, scanFrame, results, warning].forEach(addSubview)
        grid.snp.makeConstraints { $0.edges.equalToSuperview() }

        [overlapCard, todayCard].forEach { card in
            card.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(metrics.cardTop)
                make.leading.trailing.equalToSuperview().inset(metrics.cardInset)
            }
        }
        let side = metrics.compact ? CGFloat(10) : 14
        let panelInset = max(side, metrics.cardInset - 6)
        let bottom = metrics.compact ? CGFloat(8) : 14
        [results, warning].forEach { panel in
            panel.snp.makeConstraints { make in
                make.leading.trailing.equalToSuperview().inset(panelInset)
                make.bottom.equalToSuperview().offset(-bottom)
            }
        }
        scanFrame.frame = CGRect(x: metrics.compact ? 84 : 70, y: metrics.cardTop, width: metrics.width - (metrics.compact ? 168 : 140),
                                 height: max(70, metrics.stageHeight - metrics.cardTop - (metrics.compact ? 144 : 262)))

        hero.layer.shadowColor = Tone.shadow.cgColor
        hero.layer.shadowOffset = CGSize(width: 0, height: 6)
        hero.layer.shadowRadius = 7
        hero.addSubview(heroImage)
        currentHero = metrics.heroRect(page: 0)
        setHero(currentHero, radius: 0, lift: 0)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// The page being left jumps to its finished state, and the photo leaves from wherever it is now.
    func beginRun(_ run: OnboardingV2Run) {
        if let from = run.travelFrom { applyFinished(page: from) }
        heroFrom = currentHero
        heroFromRadius = currentRadius
    }

    /// `leaving` is the page the photo is coming from, nil when it stays. `t` runs from the start of the effect.
    func render(page: Int, leaving: Int?, t: Double) {
        let settle = max(0, t)
        let travel = leaving == nil ? 1 : OnboardingV2Travel.hero(at: settle)
        let target = metrics.heroRect(page: page)
        let targetRadius = metrics.heroRadius(page: page)
        let lerp: (CGFloat, CGFloat) -> CGFloat = { $0 + ($1 - $0) * CGFloat(travel) }
        let rect = leaving == nil ? target : CGRect(x: lerp(heroFrom.minX, target.minX), y: lerp(heroFrom.minY, target.minY),
                                                    width: lerp(heroFrom.width, target.width), height: lerp(heroFrom.height, target.height))
        let radius = leaving == nil ? targetRadius : OnboardingV2Travel.radius(from: heroFromRadius, to: targetRadius, travel: travel)
        // The shadow grows as the photo leaves the full stage
        let lift = max(0, min(1, 1 - rect.width / metrics.width))
        setHero(rect, radius: radius, lift: lift)

        let fade = leaving == nil ? 1 : OnboardingV2Travel.fade(at: settle)
        let slide = leaving == nil ? 1 : OnboardingV2Travel.slide(at: settle)
        apply(view: overlapCard, page: 1, shown: page, leaving: leaving, fade: fade, slide: slide)
        apply(view: todayCard, page: 2, shown: page, leaving: leaving, fade: fade, slide: slide)
        let photoAlpha = page == 0 ? fade : (leaving == 0 ? 1 - fade : 0)
        scanFrame.alpha = CGFloat(photoAlpha)
        if page != 0 { results.alpha = CGFloat(photoAlpha) }
        if page != 1 { warning.alpha = leaving == 1 ? CGFloat(1 - fade) : 0 }

        switch OnboardingV2Page(rawValue: page) {
        case .photoSearch: applyPhotoSearch(OnboardingV2Effect.photoSearch(at: t), container: fade)
        case .overlap: applyOverlap(OnboardingV2Effect.overlap(at: t))
        case .calendar: todayCard.apply(OnboardingV2Effect.calendar(at: t))
        case .none: break
        }
    }

    /// Reduce Motion, background, the hold: the page as it ends, with the photo in place
    func renderFinished(page: Int) {
        render(page: page, leaving: nil, t: OnboardingV2Timing.effect)
    }

    private func applyFinished(page: Int) {
        switch OnboardingV2Page(rawValue: page) {
        case .photoSearch: applyPhotoSearch(.finished, container: 1)
        case .overlap: applyOverlap(.finished)
        case .calendar: todayCard.apply(.finished)
        case .none: break
        }
    }

    private func apply(view: UIView, page: Int, shown: Int, leaving: Int?, fade: Double, slide: Double) {
        if page == shown {
            view.alpha = CGFloat(fade)
            view.transform = CGAffineTransform(translationX: 0, y: CGFloat(24 * (1 - slide)))
        } else if page == leaving {
            view.alpha = CGFloat(1 - fade)
            view.transform = CGAffineTransform(translationX: 0, y: CGFloat(24 * fade))
        } else {
            view.alpha = 0
            view.transform = .identity
        }
    }

    private func applyPhotoSearch(_ frame: OnboardingV2Effect.PhotoSearch, container: Double) {
        scanFrame.setLine(at: CGFloat(frame.scan))
        results.alpha = CGFloat(frame.resultAlpha * container)
        results.apply(frame)
    }

    private func applyOverlap(_ frame: OnboardingV2Effect.Overlap) {
        overlapCard.apply(frame)
        let w = CGFloat(frame.warning)
        warning.alpha = min(1, w)
        warning.transform = CGAffineTransform(translationX: 0, y: 22 * (1 - w)).scaledBy(x: 0.94 + 0.06 * w, y: 0.94 + 0.06 * w)
    }

    private func setHero(_ rect: CGRect, radius: CGFloat, lift: CGFloat) {
        currentHero = rect
        currentRadius = radius
        hero.frame = rect
        heroImage.frame = hero.bounds
        heroImage.layer.cornerRadius = radius
        heroImage.layer.contentsRect = coverFromTop(heroImage.image, rect.size)
        hero.layer.shadowOpacity = Float(0.2 * lift)
        hero.layer.shadowPath = lift > 0 ? UIBezierPath(roundedRect: hero.bounds, cornerRadius: radius).cgPath : nil
    }
}

// MARK: - Page 1

private final class ScanFrameView: UIView {
    private let corners = CAShapeLayer()
    private let line = UIView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        corners.strokeColor = UIColor.white.cgColor
        corners.fillColor = UIColor.clear.cgColor
        corners.lineWidth = 3
        layer.addSublayer(corners)
        line.backgroundColor = .white
        line.layer.cornerRadius = 1.5
        line.layer.shadowColor = Tone.glow.cgColor
        line.layer.shadowOpacity = 0.85
        line.layer.shadowRadius = 9
        line.layer.shadowOffset = .zero
        addSubview(line)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        let w = bounds.width, h = bounds.height, arm: CGFloat = 30, r: CGFloat = 10
        let path = UIBezierPath()
        path.move(to: CGPoint(x: 0, y: arm)); path.addLine(to: CGPoint(x: 0, y: r))
        path.addQuadCurve(to: CGPoint(x: r, y: 0), controlPoint: .zero); path.addLine(to: CGPoint(x: arm, y: 0))
        path.move(to: CGPoint(x: w - arm, y: 0)); path.addLine(to: CGPoint(x: w - r, y: 0))
        path.addQuadCurve(to: CGPoint(x: w, y: r), controlPoint: CGPoint(x: w, y: 0)); path.addLine(to: CGPoint(x: w, y: arm))
        path.move(to: CGPoint(x: 0, y: h - arm)); path.addLine(to: CGPoint(x: 0, y: h - r))
        path.addQuadCurve(to: CGPoint(x: r, y: h), controlPoint: CGPoint(x: 0, y: h)); path.addLine(to: CGPoint(x: arm, y: h))
        path.move(to: CGPoint(x: w - arm, y: h)); path.addLine(to: CGPoint(x: w - r, y: h))
        path.addQuadCurve(to: CGPoint(x: w, y: h - r), controlPoint: CGPoint(x: w, y: h)); path.addLine(to: CGPoint(x: w, y: h - arm))
        corners.path = path.cgPath
    }

    func setLine(at position: CGFloat) {
        line.frame = CGRect(x: 6, y: position * bounds.height, width: bounds.width - 12, height: 3)
    }
}

private final class ResultsPanel: UIView {
    private var rows: [UIView] = []
    private var ticks: [UIView] = []

    init(metrics: OnboardingV2Metrics) {
        super.init(frame: .zero)
        let compact = metrics.compact
        backgroundColor = .white
        layer.cornerRadius = compact ? 13 : 18
        layer.shadowColor = UIColor(hexString: "1E2846").cgColor
        layer.shadowOpacity = 0.3
        layer.shadowRadius = 17
        layer.shadowOffset = CGSize(width: 0, height: 14)

        let iconSize: CGFloat = compact ? 24 : 40
        let icon = GradientTile(radius: compact ? 7 : 11)
        let glyph = UIImageView(image: DS.aiScanIcon)
        glyph.tintColor = .white
        glyph.contentMode = .scaleAspectFit
        icon.addSubview(glyph)
        glyph.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(compact ? 15 : 22)
        }
        icon.snp.makeConstraints { $0.width.height.equalTo(iconSize) }
        let count = text("onboarding.v2.scan.count".localized(), Utils.extraBoldFont(size: compact ? 12.5 : 16), Tone.ink)
        let headTexts = UIStackView(arrangedSubviews: compact ? [count] : [
            count, text("onboarding.v2.scan.from".localized(), Utils.regularFont(size: 12.5), Tone.muted),
        ])
        headTexts.axis = .vertical
        let head = UIStackView(arrangedSubviews: [icon, headTexts])
        head.spacing = compact ? 7 : 10
        head.alignment = .center

        let stack = UIStackView(arrangedSubviews: [head])
        stack.axis = .vertical
        stack.spacing = compact ? 3 : 7
        addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(compact ? 6 : 10)
            make.leading.trailing.equalToSuperview().inset(compact ? 8 : 12)
        }
        let items = [("onboarding_v2_dress", "dress1"), ("onboarding_v2_dress2", "dress2"), ("onboarding_v2_dress3", "dress3")]
        for (image, key) in items {
            let (row, tick) = makeRow(image: image, key: key, compact: compact)
            stack.addArrangedSubview(row)
            rows.append(row)
            ticks.append(tick)
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func makeRow(image: String, key: String, compact: Bool) -> (UIView, UIView) {
        let row = UIView()
        let hairline = UIView()
        hairline.backgroundColor = Tone.line
        let size: CGFloat = compact ? 26 : 40
        let thumb = photo(image, radius: compact ? 6 : 9)
        thumb.layer.contentsRect = coverFromTop(thumb.image, CGSize(width: size, height: size))
        let name = text("onboarding.v2.scan.\(key)".localized(), Utils.boldFont(size: compact ? 11.5 : 14), Tone.ink)
        let meta = UILabel()
        let metaFont = Utils.regularFont(size: compact ? 10 : 12)
        let attributed = NSMutableAttributedString(string: "● ", attributes: [
            .font: Utils.regularFont(size: compact ? 8 : 9.5), .foregroundColor: Tone.stockDot,
        ])
        attributed.append(NSAttributedString(string: "onboarding.v2.scan.\(key).meta".localized(), attributes: [
            .font: metaFont, .foregroundColor: Tone.muted,
        ]))
        meta.attributedText = attributed
        meta.adjustsFontSizeToFitWidth = true
        meta.minimumScaleFactor = 0.8
        let texts = UIStackView(arrangedSubviews: [name, meta])
        texts.axis = .vertical
        let tickSize: CGFloat = compact ? 18 : 24
        let tick = UIImageView(image: UIImage(systemName: "checkmark", withConfiguration: UIImage.SymbolConfiguration(pointSize: compact ? 9 : 12, weight: .heavy)))
        tick.contentMode = .center
        tick.tintColor = .white
        tick.backgroundColor = Tone.tick
        tick.layer.cornerRadius = tickSize / 2
        [hairline, thumb, texts, tick].forEach(row.addSubview)
        hairline.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(1)
        }
        thumb.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.top.bottom.equalToSuperview().inset(compact ? 3 : 6)
            make.width.height.equalTo(size)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalTo(thumb.snp.trailing).offset(compact ? 7 : 10)
            make.centerY.equalTo(thumb)
            make.trailing.equalTo(tick.snp.leading).offset(-8)
        }
        tick.snp.makeConstraints { make in
            make.trailing.centerY.equalToSuperview()
            make.width.height.equalTo(tickSize)
        }
        return (row, tick)
    }

    func apply(_ frame: OnboardingV2Effect.PhotoSearch) {
        for (index, row) in rows.enumerated() {
            let p = CGFloat(frame.rows[index])
            row.alpha = p
            row.transform = CGAffineTransform(translationX: 0, y: 10 * (1 - p))
            let tick = CGFloat(frame.ticks[index])
            ticks[index].alpha = min(1, tick)
            ticks[index].transform = CGAffineTransform(scaleX: 0.3 + 0.7 * tick, y: 0.3 + 0.7 * tick)
        }
    }
}

private final class GradientTile: UIView {
    override class var layerClass: AnyClass { CAGradientLayer.self }

    init(radius: CGFloat) {
        super.init(frame: .zero)
        if let gradient = layer as? CAGradientLayer {
            gradient.colors = DS.Gradient.aiScan.map(\.cgColor)
            gradient.startPoint = .zero
            gradient.endPoint = CGPoint(x: 1, y: 1)
        }
        layer.cornerRadius = radius
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

// MARK: - Page 2

private final class CardView: UIView {
    init(radius: CGFloat) {
        super.init(frame: .zero)
        backgroundColor = .white
        layer.cornerRadius = radius
        layer.shadowColor = Tone.shadow.cgColor
        layer.shadowOpacity = 0.14
        layer.shadowRadius = 20
        layer.shadowOffset = CGSize(width: 0, height: 18)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}

private enum DayKind { case other, free, low, hit, out }

private final class OverlapCard: UIView {
    private let grid: CalendarGrid

    init(metrics: OnboardingV2Metrics) {
        grid = CalendarGrid(compact: metrics.compact)
        super.init(frame: .zero)
        let compact = metrics.compact
        let card = CardView(radius: compact ? 16 : 22)
        addSubview(card)
        card.snp.makeConstraints { $0.edges.equalToSuperview() }

        let thumbSize: CGFloat = compact ? 30 : 44
        let thumb = photo("onboarding_v2_vest", radius: compact ? 7 : 10)
        thumb.layer.contentsRect = coverFromTop(thumb.image, CGSize(width: thumbSize, height: thumbSize))
        let title = text("onboarding.v2.cal.title".localized(), Utils.boldFont(size: compact ? 12.5 : 15), Tone.ink)
        let subtitle = text("onboarding.v2.cal.subtitle".localized(), Utils.regularFont(size: compact ? 10 : 12.5), Tone.muted)
        let texts = UIStackView(arrangedSubviews: [title, subtitle])
        texts.axis = .vertical
        texts.spacing = 3
        [thumb, texts, grid].forEach(card.addSubview)
        let heroSpace = metrics.heroRect(page: 1).width + (compact ? 6 : 12)
        let pad = metrics.cardPadding
        thumb.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(pad + heroSpace)
            make.width.height.equalTo(thumbSize)
            make.centerY.equalTo(card.snp.top).offset(pad + metrics.heroRect(page: 1).height / 2)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalTo(thumb.snp.trailing).offset(compact ? 6 : 9)
            make.trailing.equalToSuperview().offset(-pad)
            make.centerY.equalTo(thumb)
        }
        grid.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(pad + metrics.heroRect(page: 1).height + (compact ? 4 : 10))
            make.leading.trailing.equalToSuperview().inset(pad)
            make.bottom.equalToSuperview().inset(compact ? pad : 14)
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func apply(_ frame: OnboardingV2Effect.Overlap) { grid.apply(frame) }
}

private final class CalendarGrid: UIView {
    private static let days: [(Int, DayKind, Int)] = [
        (28, .other, 0), (29, .other, 0), (30, .other, 0), (1, .free, 2), (2, .free, 2), (3, .low, 1), (4, .free, 2),
        (5, .free, 2), (6, .low, 1), (7, .low, 1), (8, .hit, 1), (9, .low, 1), (10, .low, 1), (11, .free, 2),
        (12, .free, 2), (13, .free, 2), (14, .free, 2), (15, .low, 1), (16, .free, 2), (17, .out, 0), (18, .out, 0),
        (19, .free, 2), (20, .free, 2), (21, .free, 2), (22, .free, 2), (23, .free, 2), (24, .low, 1), (25, .free, 2),
        (26, .free, 2), (27, .free, 2), (28, .free, 2), (29, .free, 2), (30, .low, 1), (31, .free, 2), (1, .other, 0),
    ]

    private let compact: Bool
    private let cellHeight: CGFloat
    private let gap: CGFloat
    private let headerHeight: CGFloat
    private var headers: [UILabel] = []
    private var cells: [UIView] = []
    private let hit = UIView()
    private let hitNumber: UILabel
    private let hitCount: UILabel
    private let chipBooked: ChipLabel
    private let chipNew: ChipLabel
    private let outWord = "onboarding.v2.cal.out".localized()

    init(compact: Bool) {
        self.compact = compact
        cellHeight = compact ? 23 : 42
        gap = compact ? 2 : 4
        headerHeight = compact ? 13 : 18
        hitNumber = text("8", Utils.mediumFont(size: compact ? 11 : 13), Tone.lowInk)
        hitCount = text("1", Utils.boldFont(size: 10), Tone.lowInk)
        chipBooked = ChipLabel("onboarding.v2.cal.chip.booked".localized(), color: UIColor(hexString: "1D4ED8"), compact: compact)
        chipNew = ChipLabel("onboarding.v2.cal.chip.new".localized(), color: Tone.purple, compact: compact)
        super.init(frame: .zero)
        for key in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] {
            let label = text("onboarding.v2.cal.\(key)".localized(), Utils.mediumFont(size: compact ? 9.5 : 11), Tone.muted)
            label.textAlignment = .center
            headers.append(label)
            addSubview(label)
        }
        for (day, kind, count) in Self.days {
            if kind == .hit { continue }
            let cell = makeCell(day: day, kind: kind, count: count)
            cells.append(cell)
            addSubview(cell)
        }
        hit.layer.cornerRadius = compact ? 6 : 9
        addCellLabels(to: hit, number: hitNumber, count: hitCount)
        addSubview(hit)
        addSubview(chipBooked)
        addSubview(chipNew)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var intrinsicContentSize: CGSize {
        CGSize(width: UIViewNoIntrinsicMetric, height: headerHeight + cellHeight * 5 + gap * 4)
    }

    private func makeCell(day: Int, kind: DayKind, count: Int) -> UIView {
        let cell = UIView()
        cell.layer.cornerRadius = compact ? 6 : 9
        let ink: UIColor
        switch kind {
        case .other: ink = Tone.line
        case .free: ink = Tone.okInk; cell.backgroundColor = Tone.okFill
        case .low, .hit: ink = Tone.lowInk; cell.backgroundColor = Tone.lowFill
        case .out: ink = .white; cell.backgroundColor = Tone.red
        }
        let countText = kind == .other ? "" : (kind == .out ? outWord : String(count))
        addCellLabels(to: cell, number: text(String(day), Utils.mediumFont(size: compact ? 11 : 13), ink),
                      count: text(countText, Utils.boldFont(size: 10), ink))
        return cell
    }

    private func addCellLabels(to cell: UIView, number: UILabel, count: UILabel) {
        number.textAlignment = .center
        count.textAlignment = .center
        let stack = UIStackView(arrangedSubviews: compact ? [number] : [number, count])
        stack.axis = .vertical
        stack.spacing = 2
        stack.alignment = .center
        cell.addSubview(stack)
        stack.snp.makeConstraints { $0.center.equalToSuperview() }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let columnWidth = (bounds.width - gap * 6) / 7
        func cellFrame(_ index: Int) -> CGRect {
            CGRect(x: CGFloat(index % 7) * (columnWidth + gap), y: headerHeight + CGFloat(index / 7) * (cellHeight + gap),
                   width: columnWidth, height: cellHeight)
        }
        for (index, header) in headers.enumerated() {
            header.frame = CGRect(x: CGFloat(index) * (columnWidth + gap), y: 0, width: columnWidth, height: headerHeight - 2)
        }
        var next = 0
        for index in Self.days.indices {
            if Self.days[index].1 == .hit {
                hit.bounds = CGRect(origin: .zero, size: cellFrame(index).size)
                hit.center = CGPoint(x: cellFrame(index).midX, y: cellFrame(index).midY)
                let lift: CGFloat = compact ? 11 : 14
                let booked = chipBooked.intrinsicContentSize
                chipBooked.bounds = CGRect(origin: .zero, size: booked)
                chipBooked.center = CGPoint(x: cellFrame(index).midX - booked.width / 2, y: cellFrame(index).minY - lift + booked.height / 2)
                let new = chipNew.intrinsicContentSize
                chipNew.bounds = CGRect(origin: .zero, size: new)
                chipNew.center = CGPoint(x: cellFrame(index).midX + new.width / 2, y: cellFrame(index).maxY + lift - new.height / 2)
            } else {
                cells[next].frame = cellFrame(index)
                next += 1
            }
        }
    }

    func apply(_ frame: OnboardingV2Effect.Overlap) {
        applyChip(chipBooked, frame.chipBooked)
        applyChip(chipNew, frame.chipNew)
        hit.transform = CGAffineTransform(translationX: CGFloat(frame.shake), y: 0)
        hit.backgroundColor = Self.mix(Tone.lowFill, Tone.red, CGFloat(frame.red))
        let ink = Self.mix(Tone.lowInk, .white, CGFloat(frame.red))
        hitNumber.textColor = ink
        hitCount.textColor = ink
        hitCount.text = frame.showsOut ? outWord : "1"
    }

    private func applyChip(_ chip: UILabel, _ state: OnboardingV2Effect.Chip) {
        chip.alpha = CGFloat(state.alpha)
        chip.transform = CGAffineTransform(translationX: CGFloat(state.offsetX), y: 0).scaledBy(x: CGFloat(state.scale), y: CGFloat(state.scale))
    }

    private static func mix(_ a: UIColor, _ b: UIColor, _ k: CGFloat) -> UIColor {
        var (r1, g1, b1, a1): (CGFloat, CGFloat, CGFloat, CGFloat) = (0, 0, 0, 0)
        var (r2, g2, b2, a2): (CGFloat, CGFloat, CGFloat, CGFloat) = (0, 0, 0, 0)
        a.getRed(&r1, green: &g1, blue: &b1, alpha: &a1)
        b.getRed(&r2, green: &g2, blue: &b2, alpha: &a2)
        return UIColor(red: r1 + (r2 - r1) * k, green: g1 + (g2 - g1) * k, blue: b1 + (b2 - b1) * k, alpha: 1)
    }
}

private final class ChipLabel: UILabel {
    private let padding: UIEdgeInsets

    init(_ value: String, color: UIColor, compact: Bool) {
        padding = compact ? UIEdgeInsets(top: 2, left: 5, bottom: 2, right: 5) : UIEdgeInsets(top: 3, left: 7, bottom: 3, right: 7)
        super.init(frame: .zero)
        text = value
        font = Utils.boldFont(size: compact ? 9.5 : 11)
        textColor = .white
        backgroundColor = color
        layer.cornerRadius = 7
        clipsToBounds = true
        alpha = 0
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func drawText(in rect: CGRect) { super.drawText(in: UIEdgeInsetsInsetRect(rect, padding)) }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: ceil(size.width + padding.left + padding.right), height: ceil(size.height + padding.top + padding.bottom))
    }
}

private final class WarningPanel: UIView {
    init(metrics: OnboardingV2Metrics) {
        super.init(frame: .zero)
        let compact = metrics.compact
        backgroundColor = .white
        layer.cornerRadius = compact ? 13 : 18
        layer.borderWidth = 1
        layer.borderColor = Tone.line.cgColor
        layer.shadowColor = Tone.shadow.cgColor
        layer.shadowOpacity = 0.32
        layer.shadowRadius = 20
        layer.shadowOffset = CGSize(width: 0, height: 18)

        let title = text("cart.overlap.title".localized(), Utils.extraBoldFont(size: compact ? 13 : 16), Tone.redInk)
        let body = text("onboarding.v2.warn.body".localized(), Utils.regularFont(size: compact ? 11 : 13), Tone.ink2, lines: 0)
        let cancel = button("Cancel".localized(), filled: false, compact: compact)
        let anyway = button("cart.overlap.createAnyway".localized(), filled: true, compact: compact)
        let buttons = UIStackView(arrangedSubviews: [cancel, anyway])
        buttons.spacing = 8
        anyway.snp.makeConstraints { $0.width.equalTo(cancel).multipliedBy(1.66) }
        let stack = UIStackView(arrangedSubviews: [title, body, buttons])
        stack.axis = .vertical
        stack.spacing = compact ? 2 : 3
        stack.setCustomSpacing(compact ? 5 : 9, after: body)
        addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(compact ? 7 : 12)
            make.leading.trailing.equalToSuperview().inset(compact ? 10 : 14)
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func button(_ title: String, filled: Bool, compact: Bool) -> UIView {
        let label = text(title, Utils.boldFont(size: compact ? 12 : 14), filled ? .white : Tone.ink)
        label.textAlignment = .center
        label.backgroundColor = filled ? DS.Color.primary : .white
        label.layer.cornerRadius = compact ? 8 : 10
        label.layer.borderWidth = filled ? 0 : 1
        label.layer.borderColor = Tone.line.cgColor
        label.clipsToBounds = true
        label.snp.makeConstraints { $0.height.equalTo(compact ? 28 : 40) }
        return label
    }
}

// MARK: - Page 3

private final class TodayCard: UIView {
    private let sample: OnboardingV2Sample
    private var rows: [UIView] = []
    private var collects: [UILabel] = []

    init(metrics: OnboardingV2Metrics, sample: OnboardingV2Sample) {
        self.sample = sample
        super.init(frame: .zero)
        let compact = metrics.compact
        let card = CardView(radius: compact ? 16 : 22)
        addSubview(card)
        card.snp.makeConstraints { $0.edges.equalToSuperview() }

        let head = text("onboarding.v2.today.head".localized(), Utils.boldFont(size: compact ? 11 : 13), Tone.ink2)
        let count = text("onboarding.v2.today.count".localized(), Utils.regularFont(size: compact ? 11 : 13), Tone.muted)
        count.textAlignment = .right
        count.setContentCompressionResistancePriority(.required, for: .horizontal)
        [head, count].forEach(card.addSubview)
        head.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(metrics.todayPaddingTop)
            make.leading.equalToSuperview().offset(metrics.todayPaddingX)
            make.trailing.lessThanOrEqualTo(count.snp.leading).offset(-8)
        }
        count.snp.makeConstraints { make in
            make.centerY.equalTo(head)
            make.trailing.equalToSuperview().offset(-metrics.todayPaddingX)
        }

        let thumbs: [String?] = [nil, "onboarding_v2_vest", "onboarding_v2_camera"]
        var previous: UIView?
        for index in 0..<3 {
            let row = makeRow(index: index, image: thumbs[index], metrics: metrics)
            card.addSubview(row)
            row.snp.makeConstraints { make in
                make.leading.trailing.equalToSuperview().inset(metrics.todayPaddingX)
                make.height.equalTo(index == 0 ? metrics.todayRowHeight : (compact ? 54 : 76))
                if let previous {
                    make.top.equalTo(previous.snp.bottom)
                } else {
                    make.top.equalToSuperview().offset(metrics.todayPaddingTop + metrics.todayHeaderHeight)
                }
                if index == 2 { make.bottom.equalToSuperview().inset(compact ? 0 : 4) }
            }
            rows.append(row)
            previous = row
        }
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func makeRow(index: Int, image: String?, metrics: OnboardingV2Metrics) -> UIView {
        let compact = metrics.compact
        let row = UIView()
        let hairline = UIView()
        hairline.backgroundColor = Tone.line
        row.addSubview(hairline)
        hairline.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(1)
        }
        let size: CGFloat = compact ? 40 : 56
        let slot: UIView
        if let image {
            let thumb = photo(image, radius: compact ? 9 : 12)
            thumb.layer.contentsRect = coverFromTop(thumb.image, CGSize(width: size, height: size))
            slot = thumb
        } else {
            slot = UIView() // The travelling photo sits here
        }
        let n = index + 1
        let isReturn = index == 2
        let pill = PillLabel(("onboarding.v2.today." + (isReturn ? "return" : "pickup")).localized(),
                             text: isReturn ? Tone.returnInk : Tone.pickupInk, fill: isReturn ? Tone.returnFill : Tone.pickupFill, compact: compact)
        let name = text("onboarding.v2.today.name\(n)".localized(), Utils.boldFont(size: compact ? 13 : 15), Tone.ink)
        let line1 = UIStackView(arrangedSubviews: [pill, name])
        line1.spacing = 6
        line1.alignment = .center
        pill.setContentCompressionResistancePriority(.required, for: .horizontal)
        let item = text("onboarding.v2.today.item\(n)".localized(), Utils.regularFont(size: compact ? 10.5 : 11.5), Tone.muted)
        let left = UIStackView(arrangedSubviews: [line1, item])
        left.axis = .vertical
        left.alignment = .leading
        left.spacing = compact ? 2 : 4

        let amount = text("onboarding.v2.today.amount\(n)".localized(), Utils.boldFont(size: compact ? 12 : 14), Tone.ink)
        amount.textAlignment = .right
        let note = UILabel()
        note.font = Utils.boldFont(size: compact ? 10 : 11.5)
        note.textAlignment = .right
        note.adjustsFontSizeToFitWidth = true
        note.minimumScaleFactor = 0.8
        if isReturn {
            note.text = "onboarding.v2.today.refund".localized()
            note.textColor = Tone.purple
        } else {
            note.textColor = Tone.redInk
            note.font = UIFont.monospacedDigitSystemFont(ofSize: compact ? 10 : 11.5, weight: .bold)
            collects.append(note)
        }
        let right = UIStackView(arrangedSubviews: [amount, note])
        right.axis = .vertical
        right.alignment = .trailing
        right.spacing = compact ? 2 : 4
        right.setContentCompressionResistancePriority(.required, for: .horizontal)
        note.setContentCompressionResistancePriority(.required, for: .horizontal)
        amount.setContentCompressionResistancePriority(.required, for: .horizontal)

        [slot, left, right].forEach(row.addSubview)
        slot.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.centerY.equalToSuperview()
            make.width.height.equalTo(size)
        }
        left.snp.makeConstraints { make in
            make.leading.equalTo(slot.snp.trailing).offset(compact ? 8 : 10)
            make.centerY.equalToSuperview()
            make.trailing.lessThanOrEqualTo(right.snp.leading).offset(-6)
        }
        right.snp.makeConstraints { make in
            make.trailing.centerY.equalToSuperview()
        }
        return row
    }

    func apply(_ frame: OnboardingV2Effect.Calendar) {
        for (index, row) in rows.enumerated() {
            let p = CGFloat(frame.rows[index])
            row.alpha = p
            row.transform = CGAffineTransform(translationX: 0, y: 10 * (1 - p))
        }
        for (index, label) in collects.enumerated() {
            let value = sample.money(Double(sample.collectTargets[index]) * frame.collect)
            label.text = String(format: "onboarding.v2.today.collect".localized(), value)
        }
    }
}

private final class PillLabel: UILabel {
    private let padding: UIEdgeInsets

    init(_ value: String, text ink: UIColor, fill: UIColor, compact: Bool) {
        padding = UIEdgeInsets(top: 1, left: compact ? 5 : 6, bottom: 1, right: compact ? 5 : 6)
        super.init(frame: .zero)
        text = value
        font = Utils.boldFont(size: compact ? 10 : 11.5)
        textColor = ink
        backgroundColor = fill
        layer.cornerRadius = 6
        clipsToBounds = true
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func drawText(in rect: CGRect) { super.drawText(in: UIEdgeInsetsInsetRect(rect, padding)) }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: ceil(size.width + padding.left + padding.right), height: ceil(size.height + padding.top + padding.bottom))
    }
}
