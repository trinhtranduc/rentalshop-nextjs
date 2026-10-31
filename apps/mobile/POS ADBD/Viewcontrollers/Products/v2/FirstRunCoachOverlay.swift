//
//  FirstRunCoachOverlay.swift
//  POS ADBD
//
//  #1394: "làm mờ, sáng một chỗ". The dim covers the screen with a hole over one control. A touch in the hole reaches the control
//  and closes the bubble; a touch on the dim closes the bubble only, so the screen is never blocked. It follows the control by
//  identifier, every frame, so a screen that moves or rebuilds it does not leave the bubble behind.
//

import UIKit
import SnapKit

/// The run in progress: which row started it and which bubbles it already showed
final class FirstRunCoach {
    static let shared = FirstRunCoach()

    private var run: CoachRun?
    private var shown = Set<CoachBubble>()
    private weak var overlay: FirstRunCoachOverlayView?
    /// Bumped on every request; a retry of an older one stops
    private var request = 0

    func start(_ step: FirstRunGuideStep) {
        stop()
        run = CoachRun(step: step)
    }

    func stop() {
        run = nil
        shown = []
        request += 1
        overlay?.removeFromSuperview()
    }

    /// A screen came to the front, or changed. Waits for what is on top of it to leave.
    func screenChanged(_ host: UIViewController, screen: CoachScreen, cart: CoachCart? = nil) {
        guard run != nil else { return }
        request += 1
        show(on: host, screen: screen, cart: cart, token: request, attempt: 0)
    }

    private static let retries = 12
    private static let retryDelay: TimeInterval = 0.25

    private func show(on host: UIViewController, screen: CoachScreen, cart: CoachCart?, token: Int, attempt: Int) {
        guard token == request, run != nil else { return }
        guard let bubble = FirstRunCoachRules.next(run: run, screen: screen, shown: shown, cart: cart,
                                                   customersExist: FirstRunGuideTracker.shared.hasCustomers,
                                                   isPad: PadLayout.isPad) else { return }
        let retry = { [weak self, weak host] in
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.retryDelay) {
                guard let self, let host else { return }
                self.show(on: host, screen: screen, cart: cart, token: token, attempt: attempt + 1)
            }
        }
        let inFront = host.view.window != nil && host.presentedViewController == nil && !host.isBeingDismissed
        let anchor = inFront ? FirstRunCoachOverlayView.find(bubble.anchor, in: host.view) : nil
        guard let anchor else {
            if attempt < Self.retries {
                retry()
            } else if inFront {
                shown.insert(bubble) // the screen has changed: this bubble is skipped, silently
                screenChanged(host, screen: screen, cart: cart)
            }
            return
        }
        overlay?.removeFromSuperview()
        shown.insert(bubble)
        let view = FirstRunCoachOverlayView(bubble: bubble, anchor: anchor, host: host)
        view.onSkip = { [weak self, weak host] in
            self?.stop()
            FirstRunGuideTracker.shared.skip()
            (host as? BaseViewControler)?.showToast(message: "firstRunGuide.skipped".localized(), duration: 3)
        }
        host.view.addSubview(view)
        view.frame = host.view.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay = view
    }
}

final class FirstRunCoachOverlayView: UIView {
    var onSkip: (() -> Void)?

    private let bubble: CoachBubble
    private weak var anchor: UIView?
    private weak var host: UIViewController?
    private let dim = CAShapeLayer()
    private let ring = CAShapeLayer()
    private let card = UIView()
    private let arrow = UIView()
    private var link: CADisplayLink?
    private var lastHole = CGRect.null
    private var lastFloor = CGFloat.zero
    private var lastSize = CGSize.zero

    private static let bubbleBlue = UIColor(hexString: "1D4ED8")
    private static let margin: CGFloat = 16
    private static let gap: CGFloat = 11
    private static let holeInset: CGFloat = 4

    init(bubble: CoachBubble, anchor: UIView, host: UIViewController) {
        self.bubble = bubble
        self.anchor = anchor
        self.host = host
        super.init(frame: .zero)
        backgroundColor = .clear
        dim.fillRule = kCAFillRuleEvenOdd
        dim.fillColor = UIColor(red: 15 / 255, green: 23 / 255, blue: 42 / 255, alpha: 0.66).cgColor
        ring.fillColor = UIColor.clear.cgColor
        ring.strokeColor = UIColor.white.cgColor
        ring.lineWidth = 3
        layer.addSublayer(dim)
        layer.addSublayer(ring)
        buildCard()
        // The customer form has the keyboard up: typing starts the work, so the bubble leaves
        NotificationCenter.default.addObserver(self, selector: #selector(close),
                                               name: .UITextFieldTextDidChange, object: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    /// The first visible view with this identifier
    static func find(_ identifier: String, in root: UIView) -> UIView? {
        if root.accessibilityIdentifier == identifier, !root.isHidden, root.alpha > 0, root.bounds.width > 0, root.bounds.height > 0 { return root }
        for child in root.subviews where !child.isHidden {
            if let hit = find(identifier, in: child) { return hit }
        }
        return nil
    }

    private func buildCard() {
        card.backgroundColor = Self.bubbleBlue
        card.layer.cornerRadius = 14
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.35
        card.layer.shadowRadius = 13
        card.layer.shadowOffset = CGSize(width: 0, height: 10)
        arrow.backgroundColor = Self.bubbleBlue
        arrow.transform = CGAffineTransform(rotationAngle: .pi / 4)
        arrow.bounds = CGRect(x: 0, y: 0, width: 14, height: 14)

        let text = V2.label(bubble.textKey.localized(), size: DS.TextSize.body, weight: .bold, color: .white, lines: 0)
        text.accessibilityIdentifier = "guide.bubble.\(bubble.rawValue)"
        let stepLabel = V2.label(String(format: "firstRunGuide.bubble.step".localized(), bubble.step, FirstRunGuideStep.allCases.count),
                                 size: 13, weight: .medium, color: UIColor.white.withAlphaComponent(0.88))
        let skip = UIButton(type: .system)
        skip.setTitle("firstRunGuide.skip".localized(), for: .normal)
        skip.titleLabel?.font = Utils.boldFont(size: 13)
        skip.setTitleColor(.white, for: .normal)
        skip.contentEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 2)
        skip.accessibilityIdentifier = "guide.bubble.skip"
        skip.addTarget(self, action: #selector(skipTapped), for: .touchUpInside)
        skip.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(32) }
        let foot = UIStackView(arrangedSubviews: [stepLabel, UIView(), skip])
        foot.alignment = .center
        let column = UIStackView(arrangedSubviews: [text, foot])
        column.axis = .vertical
        column.spacing = 4
        card.addSubview(column)
        column.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(11)
            make.bottom.equalToSuperview().offset(-6)
            make.leading.trailing.equalToSuperview().inset(13)
        }
        addSubview(arrow)
        addSubview(card)
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        link?.invalidate()
        link = nil
        guard window != nil else { return }
        let proxy = FirstRunCoachLinkProxy(self)
        let next = CADisplayLink(target: proxy, selector: #selector(FirstRunCoachLinkProxy.tick))
        next.add(to: .main, forMode: .commonModes)
        link = next
        scrollAnchorIntoView()
        follow()
        UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, card)
    }

    /// A control under the fold, or under the keyboard: bring it up once, before it is lit
    private func scrollAnchorIntoView() {
        guard let anchor else { return }
        var parent = anchor.superview
        while let current = parent {
            if let scroll = current as? UIScrollView, !(scroll is UITextView) {
                scroll.scrollRectToVisible(anchor.convert(anchor.bounds, to: scroll).insetBy(dx: 0, dy: -8), animated: false)
                layoutIfNeeded()
                return
            }
            parent = current.superview
        }
    }

    fileprivate func follow() {
        guard let host else { return close() }
        if anchor == nil || anchor?.window == nil || anchor?.isHidden == true {
            anchor = Self.find(bubble.anchor, in: host.view)
        }
        guard let anchor else { return close() } // a control that left takes its bubble with it, silently
        let hole = anchor.convert(anchor.bounds, to: self).insetBy(dx: -Self.holeInset, dy: -Self.holeInset)
        // The keyboard guide sits on the keyboard when it is up, on the safe area when it is not
        let floor = min(bounds.height - safeAreaInsets.bottom, keyboardLayoutGuide.layoutFrame.minY)
        guard hole != lastHole || bounds.size != lastSize || floor != lastFloor else { return }
        lastHole = hole
        lastSize = bounds.size
        lastFloor = floor
        layoutFor(hole, floor: floor)
    }

    private func layoutFor(_ hole: CGRect, floor: CGFloat) {
        CATransaction.begin()
        CATransaction.setDisableActions(true)
        let shape = UIBezierPath(rect: bounds)
        shape.append(UIBezierPath(roundedRect: hole, cornerRadius: 12))
        dim.frame = bounds
        dim.path = shape.cgPath
        ring.frame = bounds
        ring.path = UIBezierPath(roundedRect: hole, cornerRadius: 12).cgPath
        CATransaction.commit()

        let width = max(bounds.width - 2 * Self.margin, 0)
        let height = card.systemLayoutSizeFitting(CGSize(width: width, height: UILayoutFittingCompressedSize.height),
                                                  withHorizontalFittingPriority: .required,
                                                  verticalFittingPriority: .fittingSizeLevel).height
        let ceiling = safeAreaInsets.top
        let roomBelow = floor - hole.maxY - Self.gap
        let roomAbove = hole.minY - Self.gap - ceiling
        let above = bubble.prefersAbove ? roomAbove >= height || roomAbove > roomBelow : roomBelow < height && roomAbove > roomBelow
        var top = above ? hole.minY - Self.gap - height : hole.maxY + Self.gap
        top = max(ceiling, min(top, floor - height)) // large text on a small phone: stay on screen
        card.frame = CGRect(x: Self.margin, y: top, width: width, height: height)
        // Under the control: its centre when narrow, near the left edge like the mockup when it is wide
        let target = hole.width < width * 0.6 ? hole.midX : Self.margin + 24 + 7
        arrow.center = CGPoint(x: min(max(target, Self.margin + 21), bounds.width - Self.margin - 21),
                               y: above ? card.frame.maxY : card.frame.minY)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        follow()
    }

    @objc private func skipTapped() { onSkip?() }

    @objc private func close() {
        removeFromSuperview()
    }

    /// The bubble keeps its own touches. The hole lets the touch through to the control and closes the bubble; the rest of
    /// the dim takes the touch and closes the bubble. `event` is nil for accessibility checks, which change nothing.
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        let inCard = card.frame.contains(point)
        if inCard { return super.hitTest(point, with: event) }
        guard event?.type == .touches else { return lastHole.contains(point) ? nil : self }
        if lastHole.contains(point) {
            DispatchQueue.main.async { [weak self] in self?.close() }
            return nil
        }
        return self
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        close()
    }

    deinit {
        link?.invalidate()
    }
}

/// CADisplayLink keeps its target: the proxy lets the overlay go
private final class FirstRunCoachLinkProxy: NSObject {
    private weak var overlay: FirstRunCoachOverlayView?

    init(_ overlay: FirstRunCoachOverlayView) {
        self.overlay = overlay
    }

    @objc func tick(_ link: CADisplayLink) {
        guard let overlay else { return link.invalidate() }
        overlay.follow()
    }
}
