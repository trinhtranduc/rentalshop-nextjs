//
//  OnboardingV2ViewController.swift
//  POS ADBD
//
//  First-login onboarding (#387, flag `newAuth`). #1404: three pages that show the app's best features, with one photo
//  travelling through them (tab "★ 3 trang hướng dẫn", variant A). Same "show once" storage as the current onboarding
//  (`Utils.markOnboardingCompleted`). The logic lives in `OnboardingV2Cycle.swift`, the picture in `OnboardingV2Stage.swift`.
//

import UIKit
import SnapKit

/// CADisplayLink keeps its target alive; this keeps it from keeping the screen alive
private final class DisplayLinkTarget: NSObject {
    weak var owner: OnboardingV2ViewController?

    init(owner: OnboardingV2ViewController) {
        self.owner = owner
    }

    @objc func tick() {
        owner?.tick()
    }
}

final class OnboardingV2ViewController: BaseViewControler {
    private var cycle = OnboardingV2Cycle()
    private var run: OnboardingV2Run?
    private var runStart: CFTimeInterval = 0
    private var displayLink: CADisplayLink?
    private var holdWork: DispatchWorkItem?
    private var isOnScreen = false
    private var hasStarted = false

    private var metrics: OnboardingV2Metrics?
    private var stage: OnboardingV2StageView?

    private let skipButton = UIButton(type: .system)
    private let brand = AuthV2Style.makeBrandBar()
    private var pageTexts: [UIStackView] = []
    private var titleLabels: [UILabel] = []
    private var bodyLabels: [UILabel] = []
    private let textHost = UIView()
    private let dots = UIStackView()
    private var dotWidths: [Constraint] = []
    private let primaryButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        renderControls(animated: false)
        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(appWentToBackground), name: .UIApplicationDidEnterBackground, object: nil)
        center.addObserver(self, selector: #selector(restartCurrentPage), name: .UIApplicationWillEnterForeground, object: nil)
        center.addObserver(self, selector: #selector(restartCurrentPage), name: .UIAccessibilityReduceMotionStatusDidChange, object: nil)
    }

    deinit {
        displayLink?.invalidate()
        holdWork?.cancel()
        NotificationCenter.default.removeObserver(self)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let next = OnboardingV2Metrics(width: view.bounds.width, height: view.bounds.height,
                                       safeTop: view.safeAreaInsets.top, safeBottom: view.safeAreaInsets.bottom)
        guard next != metrics else { return }
        metrics = next
        applyLayout(next)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        isOnScreen = true
        restartCurrentPage()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        isOnScreen = false
        stopCycle()
    }

    override func setupUI() {
        view.backgroundColor = .white
        view.clipsToBounds = true

        skipButton.setTitle("onboarding.v2.skip".localized(), for: .normal)
        skipButton.setTitleColor(DS.Color.textMuted, for: .normal)
        skipButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        skipButton.backgroundColor = .white
        skipButton.layer.cornerRadius = DS.touchTarget / 2
        skipButton.layer.shadowColor = UIColor(hexString: "0F172A").cgColor
        skipButton.layer.shadowOpacity = 0.12
        skipButton.layer.shadowRadius = 1.5
        skipButton.layer.shadowOffset = CGSize(width: 0, height: 1)
        skipButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        skipButton.addTarget(self, action: #selector(finish), for: .touchUpInside)

        for page in OnboardingV2Page.allCases {
            let title = UILabel()
            title.numberOfLines = 2
            title.adjustsFontSizeToFitWidth = true
            title.minimumScaleFactor = 0.8
            title.accessibilityTraits = UIAccessibilityTraitHeader
            title.accessibilityLabel = page.titleKey.localized().replacingOccurrences(of: "\n", with: " ")
            let body = UILabel()
            body.numberOfLines = 0
            let stack = UIStackView(arrangedSubviews: [title, body])
            stack.axis = .vertical
            textHost.addSubview(stack)
            stack.snp.makeConstraints { make in
                make.top.leading.trailing.equalToSuperview()
            }
            pageTexts.append(stack)
            titleLabels.append(title)
            bodyLabels.append(body)
        }

        dots.spacing = 8
        dots.alignment = .center
        dots.isAccessibilityElement = false
        for _ in OnboardingV2Page.allCases {
            let dot = UIView()
            dot.layer.cornerRadius = 4
            dot.snp.makeConstraints { make in
                dotWidths.append(make.width.equalTo(8).constraint)
                make.height.equalTo(8)
            }
            dots.addArrangedSubview(dot)
        }
        primaryButton.setTitleColor(.white, for: .normal)
        primaryButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        primaryButton.backgroundColor = DS.Color.primary
        primaryButton.layer.cornerRadius = 14
        primaryButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 28, bottom: 0, right: 28)
        primaryButton.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)

        [textHost, dots, primaryButton, brand, skipButton].forEach(view.addSubview)

        let swipeLeft = UISwipeGestureRecognizer(target: self, action: #selector(swiped(_:)))
        swipeLeft.direction = .left
        let swipeRight = UISwipeGestureRecognizer(target: self, action: #selector(swiped(_:)))
        swipeRight.direction = .right
        [swipeLeft, swipeRight].forEach(view.addGestureRecognizer)
    }

    /// Everything that depends on the screen size. Runs again if the size changes (the stage is rebuilt).
    private func applyLayout(_ metrics: OnboardingV2Metrics) {
        stage?.removeFromSuperview()
        let newStage = OnboardingV2StageView(metrics: metrics)
        view.insertSubview(newStage, at: 0)
        newStage.frame = CGRect(x: 0, y: 0, width: metrics.width, height: metrics.stageHeight)
        newStage.layoutIfNeeded()
        stage = newStage

        skipButton.snp.remakeConstraints { make in
            make.top.equalToSuperview().offset(metrics.topBarTop)
            make.trailing.equalToSuperview().offset(-16)
            make.height.equalTo(DS.touchTarget)
        }
        brand.snp.remakeConstraints { make in
            make.leading.equalToSuperview().offset(24)
            make.centerY.equalTo(skipButton)
        }
        textHost.snp.remakeConstraints { make in
            make.top.equalToSuperview().offset(metrics.textTop)
            make.height.equalTo(metrics.textHeight)
            make.leading.trailing.equalToSuperview().inset(metrics.textInset)
        }
        primaryButton.snp.remakeConstraints { make in
            make.trailing.equalToSuperview().offset(-24)
            make.top.equalToSuperview().offset(metrics.footerTop)
            make.height.equalTo(metrics.footerHeight)
        }
        dots.snp.remakeConstraints { make in
            make.leading.equalToSuperview().offset(24)
            make.centerY.equalTo(primaryButton)
            make.height.equalTo(8)
        }
        for (index, page) in OnboardingV2Page.allCases.enumerated() {
            let titleStyle = NSMutableParagraphStyle()
            titleStyle.minimumLineHeight = metrics.titleLine
            titleStyle.maximumLineHeight = metrics.titleLine
            titleLabels[index].attributedText = NSAttributedString(string: page.titleKey.localized(), attributes: [
                NSAttributedString.Key.font: Utils.extraBoldFont(size: metrics.titleSize),
                NSAttributedString.Key.foregroundColor: DS.Color.text,
                NSAttributedString.Key.paragraphStyle: titleStyle,
                NSAttributedString.Key.kern: -0.022 * metrics.titleSize,
            ])
            let bodyStyle = NSMutableParagraphStyle()
            bodyStyle.minimumLineHeight = metrics.bodyLine
            bodyStyle.maximumLineHeight = metrics.bodyLine
            bodyLabels[index].attributedText = NSAttributedString(string: page.bodyKey.localized(), attributes: [
                NSAttributedString.Key.font: Utils.regularFont(size: metrics.bodySize),
                NSAttributedString.Key.foregroundColor: UIColor(hexString: "64748B"),
                NSAttributedString.Key.paragraphStyle: bodyStyle,
            ])
            pageTexts[index].spacing = metrics.compact ? 5 : 8
        }
        renderNow()
    }

    private func renderControls(animated: Bool) {
        let isLast = cycle.page == OnboardingV2Cycle.pageCount - 1
        skipButton.isHidden = isLast
        primaryButton.setTitle((isLast ? "onboarding.v2.start" : "onboarding.v2.next").localized(), for: .normal)
        let update = {
            for (index, dot) in self.dots.arrangedSubviews.enumerated() {
                let on = index == self.cycle.page
                dot.backgroundColor = on ? DS.Color.primary : UIColor(hexString: "BFDBFE")
                self.dotWidths[index].update(offset: on ? 24 : 8)
            }
            self.dots.layoutIfNeeded()
        }
        if animated {
            UIView.animate(withDuration: 0.3, animations: update)
        } else {
            update()
        }
    }

    // MARK: - Cycle

    private func play(_ next: OnboardingV2Run) {
        holdWork?.cancel()
        holdWork = nil
        hasStarted = true
        run = next
        if next.travelFrom != nil || !next.animated {
            renderControls(animated: next.animated)
            UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, titleLabels[next.page])
        }
        stage?.beginRun(next)
        guard next.animated else {
            stopDisplayLink()
            renderNow()
            return
        }
        // A repeat starts with the fade from the finished state, before the effect's zero
        runStart = CACurrentMediaTime() + (next.isRepeat ? OnboardingV2Timing.repeatFade : 0)
        startDisplayLink()
        tick()
    }

    fileprivate func tick() {
        guard let run, view.window != nil else {
            stopCycle()
            return
        }
        let t = CACurrentMediaTime() - runStart
        stage?.render(page: run.page, leaving: run.travelFrom, t: t)
        renderTexts(page: run.page, leaving: run.travelFrom, t: t)
        guard t >= OnboardingV2Timing.effect else { return }
        stopDisplayLink()
        guard cycle.effectEnded(generation: run.generation) else { return }
        let generation = run.generation
        let work = DispatchWorkItem { [weak self] in
            guard let self, let next = self.cycle.holdEnded(generation: generation) else { return }
            self.play(next)
        }
        holdWork = work
        DispatchQueue.main.asyncAfter(deadline: .now() + OnboardingV2Timing.hold, execute: work)
    }

    /// The state with no clock running. Before the first run that is the effect's start, so nothing pops when it begins.
    private func renderNow() {
        let t = hasStarted || UIAccessibilityIsReduceMotionEnabled() ? OnboardingV2Timing.effect : 0
        stage?.render(page: cycle.page, leaving: nil, t: t)
        renderTexts(page: cycle.page, leaving: nil, t: t)
    }

    private func renderTexts(page: Int, leaving: Int?, t: Double) {
        let fade = leaving == nil ? 1 : CGFloat(OnboardingV2Travel.fade(at: max(0, t)))
        for (index, stack) in pageTexts.enumerated() {
            if index == page {
                stack.alpha = fade
                stack.transform = CGAffineTransform(translationX: 18 * (1 - fade), y: 0)
                stack.isHidden = false
            } else if index == leaving, fade < 1 {
                stack.alpha = 1 - fade
                stack.transform = CGAffineTransform(translationX: 18 * fade, y: 0)
                stack.isHidden = false
            } else {
                stack.isHidden = true
            }
        }
    }

    private func startDisplayLink() {
        guard displayLink == nil else { return }
        let link = CADisplayLink(target: DisplayLinkTarget(owner: self), selector: #selector(DisplayLinkTarget.tick))
        link.add(to: .main, forMode: .commonModes)
        displayLink = link
    }

    private func stopDisplayLink() {
        displayLink?.invalidate()
        displayLink = nil
    }

    /// Leaving the screen or going to background: no timer survives this
    private func stopCycle() {
        cycle.stop()
        run = nil
        holdWork?.cancel()
        holdWork = nil
        stopDisplayLink()
        renderNow()
    }

    @objc private func appWentToBackground() {
        stopCycle()
    }

    /// Opening, coming back from background, or Reduce Motion changed: the current page's own effect, no travel
    @objc private func restartCurrentPage() {
        guard isOnScreen else { return }
        play(cycle.start(reduceMotion: UIAccessibilityIsReduceMotionEnabled()))
    }

    // MARK: - Actions

    @objc private func primaryTapped() {
        if cycle.page == OnboardingV2Cycle.pageCount - 1 {
            finish()
        } else if let next = cycle.go(to: cycle.page + 1) {
            play(next)
        }
    }

    @objc private func swiped(_ gesture: UISwipeGestureRecognizer) {
        let target = gesture.direction == .left ? cycle.page + 1 : cycle.page - 1
        guard let next = cycle.go(to: target) else { return }
        play(next)
    }

    @objc private func finish() {
        isOnScreen = false
        stopCycle()
        Utils.markOnboardingCompleted()
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        appDelegate.loadMainUserView(forceMain: true)
    }
}
