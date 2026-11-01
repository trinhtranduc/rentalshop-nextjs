//
//  FirstRunCoachOverlay.swift
//  POS ADBD
//
//  #1394, #1411: "làm mờ, sáng một chỗ". The dim covers the screen with a hole over one control. A touch in the hole reaches the
//  control; a touch on the dim only flashes the ring. Tiếp moves on when the step is valid; where the user must tap the real control
//  it flashes the ring and scrolls there. Thoát hướng dẫn returns to the card. The bubble follows the control by identifier, every
//  frame, so a screen that moves or rebuilds it does not leave the bubble behind.
//

import UIKit
import SnapKit
import AVFoundation

/// A form with a bubble: it says what the step needs. The cart and the picker have nothing to fill in.
protocol FirstRunCoachForm: AnyObject {
    func coachIsValid(_ bubble: CoachBubble) -> Bool
    /// Thoát hướng dẫn asks first when this is true: a form has no draft, leaving loses it
    var coachHasInput: Bool { get }
    /// The bubble is about to show: move the cursor to its field
    func coachWillShow(_ bubble: CoachBubble)
    /// Thư viện ảnh in the bubble, when the camera is denied
    func coachOpenPhotoLibrary()
}

extension FirstRunCoachForm {
    func coachOpenPhotoLibrary() {}
}

/// The run in progress: which row started it and how far the forms went
final class FirstRunCoach {
    static let shared = FirstRunCoach()

    private var run: CoachRun?
    private var passed = Set<CoachBubble>()
    private var customersExist = false
    /// Home, to come back to on Thoát
    private weak var home: UIViewController?
    private weak var overlay: FirstRunCoachOverlayView?
    /// Bumped on every request; a retry of an older one stops
    private var request = 0
    /// The form said to get out of the way: its duplicate-phone box is on screen
    private var paused = false

    func start(action: FirstRunGuideAction, home: UIViewController) {
        stop()
        run = CoachRun(action: action)
        self.home = home
        customersExist = FirstRunGuideTracker.shared.hasCustomers
    }

    func stop() {
        run = nil
        passed = []
        paused = false
        request += 1
        overlay?.removeFromSuperview()
    }

    /// A form opened: it has no draft, so its bubbles start over
    func formOpened(_ screen: CoachScreen) {
        switch screen {
        case .productForm: passed.subtract([.productPhoto, .productName, .productPrice, .productSave])
        case .newCustomer: passed.subtract([.newCustomer, .newCustomerSave])
        default: break
        }
    }

    /// A screen came to the front, or changed. Waits for what is on top of it to leave.
    func screenChanged(_ host: UIViewController, screen: CoachScreen, cart: CoachCart? = nil) {
        guard run != nil, !paused else { return }
        request += 1
        show(on: host, screen: screen, cart: cart, token: request, attempt: 0)
    }

    /// The form's own message needs the screen (duplicate phone)
    func pause() {
        paused = true
        request += 1
        overlay?.removeFromSuperview()
    }

    func resume(_ host: UIViewController, screen: CoachScreen) {
        guard paused else { return }
        paused = false
        screenChanged(host, screen: screen)
    }

    /// True while the guide is waiting for this bubble, so a form can route its camera differently
    func isShowing(_ bubble: CoachBubble) -> Bool { overlay?.bubble == bubble }

    func showCameraDenied() { overlay?.showCameraDenied() }

    private static let retries = 12
    private static let retryDelay: TimeInterval = 0.25

    private func show(on host: UIViewController, screen: CoachScreen, cart: CoachCart?, token: Int, attempt: Int) {
        guard token == request, run != nil else { return }
        guard let bubble = FirstRunCoachRules.next(run: run, screen: screen, passed: passed, cart: cart,
                                                   customersExist: customersExist, isPad: PadLayout.isPad) else {
            overlay?.removeFromSuperview()
            return
        }
        if let overlay, overlay.superview === host.view, overlay.bubble == bubble {
            overlay.update(plan: plan(cart: cart))
            return
        }
        let retry = { [weak self, weak host] (nextAttempt: Int) in
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.retryDelay) {
                guard let self, let host else { return }
                self.show(on: host, screen: screen, cart: cart, token: token, attempt: nextAttempt)
            }
        }
        guard host.view.window != nil else { return } // under another screen: its viewDidAppear asks again
        guard host.presentedViewController == nil, !host.isBeingDismissed else { return retry(attempt) } // a sheet is on top
        (host as? FirstRunCoachForm)?.coachWillShow(bubble)
        guard let anchor = FirstRunCoachOverlayView.find(bubble.anchor(on: screen), in: host.view) else {
            if attempt < Self.retries {
                retry(attempt + 1)
            } else {
                passed.insert(bubble) // the screen has changed: this bubble is skipped, silently
                screenChanged(host, screen: screen, cart: cart)
            }
            return
        }
        overlay?.removeFromSuperview()
        let view = FirstRunCoachOverlayView(bubble: bubble, screen: screen, plan: plan(cart: cart), anchor: anchor, host: host)
        view.onNext = { [weak self, weak host] in
            guard let self, let host else { return }
            self.passed.insert(bubble)
            self.screenChanged(host, screen: screen, cart: cart)
        }
        view.onExit = { [weak self, weak host] in
            guard let host else { return }
            self?.exit(from: host)
        }
        view.onAnchorLost = { [weak self, weak host] in
            guard let self, let host, self.overlay?.bubble == bubble else { return }
            self.request += 1
            self.overlay?.removeFromSuperview()
            self.show(on: host, screen: screen, cart: cart, token: self.request, attempt: 0)
        }
        host.view.addSubview(view)
        view.frame = host.view.bounds
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay = view
    }

    private func plan(cart: CoachCart?) -> CoachPlan {
        CoachPlan(customersExist: customersExist, isSale: cart?.isSale ?? false)
    }

    /// Thoát hướng dẫn: back to the card, the guide goes on. A form with content asks first.
    private func exit(from host: UIViewController) {
        guard (host as? FirstRunCoachForm)?.coachHasInput == true else { return leave() }
        let alert = UIAlertController(title: "firstRunGuide.exit.discard".localized(), message: nil, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "firstRunGuide.exit.discard.action".localized(), style: .destructive) { [weak self] _ in
            self?.leave()
        })
        host.present(alert, animated: true)
    }

    private func leave() {
        let home = self.home
        stop()
        let backToCard = { home?.navigationController?.popToRootViewController(animated: true) ; return }
        if let root = home?.view.window?.rootViewController, root.presentedViewController != nil {
            root.dismiss(animated: true, completion: backToCard)
        } else {
            backToCard()
        }
    }
}

final class FirstRunCoachOverlayView: UIView {
    var onNext: (() -> Void)?
    var onExit: (() -> Void)?
    var onAnchorLost: (() -> Void)?

    let bubble: CoachBubble
    private let screen: CoachScreen
    private weak var anchor: UIView?
    private weak var host: UIViewController?
    private let dim = CAShapeLayer()
    private let ring = CAShapeLayer()
    private let card = UIView()
    private let arrow = UIView()
    private let counter = V2.label(size: 13, weight: .bold, color: UIColor.white.withAlphaComponent(0.92))
    private let nextButton = UIButton(type: .custom)
    private let column = UIStackView()
    private var deniedBox: UIView?
    private var link: CADisplayLink?
    private var lastHole = CGRect.null
    private var lastFloor = CGFloat.zero
    private var lastSize = CGSize.zero
    private var lastValid: Bool?
    private var scrolledForKeyboard = CGFloat.zero

    private static let bubbleBlue = UIColor(hexString: "1D4ED8")
    private static let margin: CGFloat = 16
    private static let gap: CGFloat = 11
    private static let holeInset: CGFloat = 4

    init(bubble: CoachBubble, screen: CoachScreen, plan: CoachPlan, anchor: UIView, host: UIViewController) {
        self.bubble = bubble
        self.screen = screen
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
        update(plan: plan)
        // Beats the form's own tap that closes the keyboard: a tap on the dim changes nothing but the ring
        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(flash)))
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardDidShow), name: .UIKeyboardDidShow, object: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func update(plan: CoachPlan) {
        counter.text = plan.counter(bubble)
        counter.accessibilityIdentifier = "guide.bubble.counter"
    }

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
        let leave = UIButton(type: .system)
        leave.setAttributedTitle(NSAttributedString(string: "firstRunGuide.exit".localized(), attributes: [
            NSAttributedString.Key.font: Utils.mediumFont(size: 13),
            NSAttributedString.Key.foregroundColor: UIColor.white.withAlphaComponent(0.92),
            NSAttributedString.Key.underlineStyle: NSUnderlineStyle.styleSingle.rawValue,
        ]), for: .normal)
        leave.accessibilityIdentifier = "guide.bubble.exit"
        leave.addTarget(self, action: #selector(exitTapped), for: .touchUpInside)
        leave.setContentCompressionResistancePriority(.required, for: .horizontal)
        leave.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(40) }

        nextButton.setTitle("firstRunGuide.next".localized(), for: .normal)
        nextButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        nextButton.layer.cornerRadius = 10
        nextButton.accessibilityIdentifier = "guide.bubble.next"
        nextButton.addTarget(self, action: #selector(nextTapped), for: .touchUpInside)
        nextButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        nextButton.snp.makeConstraints { make in
            make.height.equalTo(40)
            make.width.greaterThanOrEqualTo(76)
        }
        renderNext(valid: false)

        counter.setContentHuggingPriority(.required, for: .horizontal)
        counter.setContentCompressionResistancePriority(.required, for: .horizontal)
        let foot = UIStackView(arrangedSubviews: [counter, leave, UIView(), nextButton])
        foot.alignment = .center
        foot.spacing = 8
        column.addArrangedSubview(text)
        column.addArrangedSubview(foot)
        column.axis = .vertical
        column.spacing = 8
        card.addSubview(column)
        column.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(11)
            make.bottom.equalToSuperview().offset(-9)
            make.leading.trailing.equalToSuperview().inset(13)
        }
        addSubview(arrow)
        addSubview(card)
    }

    /// "Visibly disabled": see-through with a thin outline. The tap still lands, to flash the ring.
    private func renderNext(valid: Bool) {
        lastValid = valid
        nextButton.backgroundColor = valid ? .white : UIColor.white.withAlphaComponent(0.16)
        nextButton.setTitleColor(valid ? Self.bubbleBlue : UIColor.white.withAlphaComponent(0.72), for: .normal)
        nextButton.layer.borderWidth = valid ? 0 : 1
        nextButton.layer.borderColor = UIColor.white.withAlphaComponent(0.28).cgColor
        nextButton.accessibilityValue = valid ? "on" : "off"
    }

    private var isValid: Bool {
        guard bubble.nextAdvances(on: screen) else { return false }
        return (host as? FirstRunCoachForm)?.coachIsValid(bubble) == true
    }

    /// Camera denied: the existing permission line, Mở Cài đặt, Thư viện ảnh. Tiếp stays as it is.
    func showCameraDenied() {
        guard deniedBox == nil else { return }
        let line = V2.label("common.permission.camera.settingsMessage".localized(), size: 13, weight: .medium, color: .white, lines: 0)
        let settings = outlineButton("attendance.permission.openSettings".localized(), action: #selector(openSettings))
        settings.accessibilityIdentifier = "guide.bubble.openSettings"
        let library = outlineButton("Photo Library".localized(), action: #selector(openLibrary))
        library.accessibilityIdentifier = "guide.bubble.library"
        let buttons = UIStackView(arrangedSubviews: [settings, library])
        buttons.distribution = .fillEqually
        buttons.spacing = 8
        let box = UIStackView(arrangedSubviews: [line, buttons])
        box.axis = .vertical
        box.spacing = 7
        column.insertArrangedSubview(box, at: 1)
        deniedBox = box
        lastHole = .null
        follow()
    }

    private func outlineButton(_ title: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 14)
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = 10
        button.layer.borderWidth = 1.5
        button.layer.borderColor = UIColor.white.cgColor
        button.addTarget(self, action: action, for: .touchUpInside)
        button.snp.makeConstraints { make in make.height.equalTo(38) }
        return button
    }

    @objc private func openSettings() {
        if let url = URL(string: UIApplicationOpenSettingsURLString) { UIApplication.shared.open(url) }
    }

    @objc private func openLibrary() {
        (host as? FirstRunCoachForm)?.coachOpenPhotoLibrary()
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

    /// Bring the control up to the top of the scroll view, so the bubble has room under it. Before it is lit, and again once the
    /// keyboard has shrunk the form.
    private func scrollAnchorIntoView() {
        guard let anchor else { return }
        var parent = anchor.superview
        while let current = parent {
            if let scroll = current as? UIScrollView, !(scroll is UITextView), scroll.isScrollEnabled, scroll.bounds.height < scroll.contentSize.height + 1 {
                layoutIfNeeded()
                let top = anchor.convert(anchor.bounds, to: scroll).minY - 8
                let most = max(scroll.contentSize.height + scroll.adjustedContentInset.bottom - scroll.bounds.height, -scroll.adjustedContentInset.top)
                scroll.setContentOffset(CGPoint(x: scroll.contentOffset.x, y: min(max(top, -scroll.adjustedContentInset.top), most)), animated: false)
                return
            }
            parent = current.superview
        }
    }

    @objc private func keyboardDidShow() {
        scrollAnchorIntoView()
    }

    fileprivate func follow() {
        guard let host else { return removeFromSuperview() }
        // A sheet of the screen's own is on top (the photo source, the dates, the confirm sheet): no bubble over it
        isHidden = host.presentedViewController != nil
        if anchor == nil || anchor?.window == nil || anchor?.isHidden == true {
            anchor = Self.find(bubble.anchor(on: screen), in: host.view)
        }
        guard let anchor else {
            onAnchorLost?() // a control that left: the coach waits a moment, then skips the bubble, silently
            return
        }
        let valid = isValid
        if valid != lastValid { renderNext(valid: valid) }
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

    /// Tiếp moves on when the step is done. Otherwise, and always where the user must tap the real control, it points there.
    @objc private func nextTapped() {
        if isValid {
            onNext?()
        } else {
            scrollAnchorIntoView()
            flash()
        }
    }

    @objc private func exitTapped() { onExit?() }

    @objc private func flash() {
        let blink = CAKeyframeAnimation(keyPath: "opacity")
        blink.values = UIAccessibilityIsReduceMotionEnabled() ? [1, 0.2, 1] : [1, 0.15, 1, 0.15, 1]
        blink.duration = 0.5
        ring.add(blink, forKey: "guide.flash")
    }

    /// The bubble keeps its own touches and the hole lets the touch through to the control. The rest of the dim takes the touch and
    /// only flashes the ring. `event` is nil for accessibility checks, which change nothing.
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        guard !isHidden else { return nil }
        if card.frame.contains(point) { return super.hitTest(point, with: event) }
        return lastHole.contains(point) ? nil : self
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
