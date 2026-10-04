//
//  OnboardingV2ViewController.swift
//  POS ADBD
//
//  Redesigned first-login onboarding (#387, flag `newAuth`, board Onboarding-E): three steps over drifting blobs,
//  a floating step icon, Bỏ qua, dots and Tiếp / Bắt đầu. Same "show once" storage as the current onboarding
//  (`Utils.markOnboardingCompleted`). No motion when Reduce Motion is on.
//

import UIKit
import SnapKit

final class OnboardingV2ViewController: BaseViewControler {
    private enum Glyph { case dress, person, calendar }

    private struct Step {
        let glyph: Glyph
        let titleKey: String
        let bodyKey: String
    }

    private let steps = [
        Step(glyph: .dress, titleKey: "onboarding.v2.product.title", bodyKey: "onboarding.v2.product.body"),
        Step(glyph: .person, titleKey: "onboarding.v2.customer.title", bodyKey: "onboarding.v2.customer.body"),
        Step(glyph: .calendar, titleKey: "onboarding.v2.order.title", bodyKey: "onboarding.v2.order.body"),
    ]
    private var index = 0

    private let blobs = [OnboardingBlob(), OnboardingBlob(), OnboardingBlob()]
    private let skipButton = UIButton(type: .system)
    private let iconCard = UIView()
    private let iconView = UIImageView()
    private let dressLayer = CAShapeLayer()
    private let stepLabel = V2.label(size: 13, weight: .bold, color: DS.Color.primary)
    private let titleLabel = UILabel()
    private let bodyLabel = V2.label(size: 16, color: DS.Color.textMuted, lines: 0)
    private let dots = UIStackView()
    private let primaryButton = UIButton(type: .system)

    private var reduceMotion: Bool { UIAccessibilityIsReduceMotionEnabled() }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        render()
        NotificationCenter.default.addObserver(self, selector: #selector(motionSettingChanged),
                                               name: NSNotification.Name.UIAccessibilityReduceMotionStatusDidChange, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(motionSettingChanged),
                                               name: NSNotification.Name.UIApplicationWillEnterForeground, object: nil)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startMotion()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let rect = iconCard.bounds
        iconCard.layer.shadowPath = UIBezierPath(roundedRect: rect, cornerRadius: 36).cgPath
        // Board glyph "M9 3h6l-1 4 5 13H5l5-13z" on a 24 grid, drawn at 60pt
        let s: CGFloat = 60 / 24
        let path = UIBezierPath()
        path.move(to: CGPoint(x: 9 * s, y: 3 * s))
        path.addLine(to: CGPoint(x: 15 * s, y: 3 * s))
        path.addLine(to: CGPoint(x: 14 * s, y: 7 * s))
        path.addLine(to: CGPoint(x: 19 * s, y: 20 * s))
        path.addLine(to: CGPoint(x: 5 * s, y: 20 * s))
        path.addLine(to: CGPoint(x: 10 * s, y: 7 * s))
        path.close()
        dressLayer.path = path.cgPath
        dressLayer.frame = CGRect(x: (rect.width - 60) / 2, y: (rect.height - 60) / 2, width: 60, height: 60)
    }

    override func setupUI() {
        view.backgroundColor = .white
        view.clipsToBounds = true

        let blobSpecs: [(UIColor, CGFloat, [CGFloat])] = [
            (UIColor(hexString: "DBEAFE"), 299, [0.42, 0.5, 0.5, 0.45]),
            (UIColor(hexString: "FFEDD5"), 195, [0.5, 0.45, 0.4, 0.5]),
            (DS.Color.primary, 80, [0.5, 0.5, 0.5, 0.5]),
        ]
        for (blob, spec) in zip(blobs, blobSpecs) {
            blob.configure(color: spec.0, radii: spec.2)
            blob.isUserInteractionEnabled = false
            blob.isAccessibilityElement = false
            view.addSubview(blob)
            blob.snp.makeConstraints { make in make.width.height.equalTo(spec.1) }
        }
        blobs[0].snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(-80)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(-29)
        }
        blobs[1].snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(69)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(178)
        }
        blobs[2].snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(69)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(304)
        }

        skipButton.setTitle("onboarding.v2.skip".localized(), for: .normal)
        skipButton.setTitleColor(DS.Color.textMuted, for: .normal)
        skipButton.titleLabel?.font = Utils.boldFont(size: 15)
        skipButton.backgroundColor = UIColor.white.withAlphaComponent(0.9)
        skipButton.layer.cornerRadius = DS.touchTarget / 2
        skipButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        skipButton.addTarget(self, action: #selector(finish), for: .touchUpInside)

        iconCard.backgroundColor = .white
        iconCard.layer.cornerRadius = 36
        iconCard.layer.shadowColor = DS.Color.primary.cgColor
        iconCard.layer.shadowOpacity = 0.2
        iconCard.layer.shadowRadius = 15
        iconCard.layer.shadowOffset = CGSize(width: 0, height: 12)
        iconCard.isAccessibilityElement = false
        iconView.tintColor = DS.Color.primary
        iconView.contentMode = .scaleAspectFit
        dressLayer.strokeColor = DS.Color.primary.cgColor
        dressLayer.fillColor = UIColor.clear.cgColor
        dressLayer.lineWidth = 1.5 * 60 / 24
        dressLayer.lineJoin = kCALineJoinRound
        dressLayer.lineCap = kCALineCapRound
        iconCard.layer.addSublayer(dressLayer)
        iconCard.addSubview(iconView)
        iconView.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(60)
        }

        titleLabel.font = Utils.extraBoldFont(size: 28)
        titleLabel.textColor = DS.Color.text
        titleLabel.numberOfLines = 0
        let texts = UIStackView(arrangedSubviews: [stepLabel, titleLabel, bodyLabel])
        texts.axis = .vertical
        texts.alignment = .leading
        texts.spacing = 6
        texts.setCustomSpacing(10, after: stepLabel)

        dots.spacing = 8
        dots.alignment = .center
        dots.isAccessibilityElement = false
        primaryButton.setTitleColor(.white, for: .normal)
        primaryButton.titleLabel?.font = Utils.boldFont(size: 16)
        primaryButton.backgroundColor = DS.Color.primary
        primaryButton.layer.cornerRadius = 14
        primaryButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 28, bottom: 0, right: 28)
        primaryButton.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)

        [skipButton, iconCard, texts, dots, primaryButton].forEach(view.addSubview)
        skipButton.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(12)
            make.trailing.equalToSuperview().offset(-16)
            make.height.equalTo(DS.touchTarget)
        }
        iconCard.snp.makeConstraints { make in
            make.top.equalTo(skipButton.snp.bottom).offset(110)
            make.centerX.equalToSuperview()
            make.width.height.equalTo(120)
        }
        texts.snp.makeConstraints { make in
            make.top.equalTo(iconCard.snp.bottom).offset(150).priority(.high)
            make.top.greaterThanOrEqualTo(iconCard.snp.bottom).offset(40)
            make.leading.trailing.equalToSuperview().inset(28)
            make.bottom.lessThanOrEqualTo(primaryButton.snp.top).offset(-24)
        }
        primaryButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-24)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-24)
            make.height.equalTo(54)
        }
        dots.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(24)
            make.centerY.equalTo(primaryButton)
            make.height.equalTo(8)
        }

        let swipeLeft = UISwipeGestureRecognizer(target: self, action: #selector(swiped(_:)))
        swipeLeft.direction = .left
        let swipeRight = UISwipeGestureRecognizer(target: self, action: #selector(swiped(_:)))
        swipeRight.direction = .right
        [swipeLeft, swipeRight].forEach(view.addGestureRecognizer)
    }

    private func render() {
        let step = steps[index]
        let isLast = index == steps.count - 1
        switch step.glyph {
        case .dress:
            iconView.image = nil
            dressLayer.isHidden = false
        case .person, .calendar:
            dressLayer.isHidden = true
            iconView.image = UIImage(systemName: step.glyph == .person ? "person" : "calendar",
                                     withConfiguration: UIImage.SymbolConfiguration(pointSize: 48, weight: .regular))
        }
        stepLabel.attributedText = NSAttributedString(
            string: String(format: "onboarding.v2.step".localized(), index + 1, steps.count).uppercased(),
            attributes: [NSAttributedString.Key.kern: 0.5])
        titleLabel.text = step.titleKey.localized()
        let style = NSMutableParagraphStyle()
        style.minimumLineHeight = 23
        bodyLabel.attributedText = NSAttributedString(string: step.bodyKey.localized(), attributes: [
            NSAttributedString.Key.paragraphStyle: style,
            NSAttributedString.Key.font: Utils.regularFont(size: 16),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
        ])
        skipButton.isHidden = isLast
        primaryButton.setTitle((isLast ? "onboarding.v2.start" : "onboarding.v2.next").localized(), for: .normal)

        dots.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for i in steps.indices {
            let dot = UIView()
            dot.backgroundColor = i == index ? DS.Color.primary : UIColor(hexString: "BFDBFE")
            dot.layer.cornerRadius = 4
            dot.snp.makeConstraints { make in
                make.width.equalTo(i == index ? 24 : 8)
                make.height.equalTo(8)
            }
            dots.addArrangedSubview(dot)
        }
        UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, titleLabel)
    }

    // MARK: - Motion

    private func startMotion() {
        stopMotion()
        guard !reduceMotion else { return }
        for (i, blob) in blobs.enumerated() {
            blob.startDrift(delay: CFTimeInterval(i) * 4)
        }
        let float = CABasicAnimation(keyPath: "transform.translation.y")
        float.fromValue = 0
        float.toValue = -8
        float.duration = 2.1
        float.autoreverses = true
        float.repeatCount = .infinity
        float.timingFunction = CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseInEaseOut)
        iconCard.layer.add(float, forKey: "float")
    }

    private func stopMotion() {
        blobs.forEach { $0.layer.removeAllAnimations() }
        iconCard.layer.removeAnimation(forKey: "float")
    }

    @objc private func motionSettingChanged() {
        startMotion()
    }

    // MARK: - Actions

    @objc private func primaryTapped() {
        if index == steps.count - 1 {
            finish()
        } else {
            index += 1
            render()
        }
    }

    @objc private func swiped(_ gesture: UISwipeGestureRecognizer) {
        let next = gesture.direction == .left ? index + 1 : index - 1
        guard steps.indices.contains(next) else { return }
        index = next
        render()
    }

    @objc private func finish() {
        Utils.markOnboardingCompleted()
        guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }
        appDelegate.loadMainUserView(forceMain: true)
    }
}

/// Decorative blob with uneven corner radii (fractions of its side: top-left, top-right, bottom-right, bottom-left)
private final class OnboardingBlob: UIView {
    private let shape = CAShapeLayer()
    private var radii: [CGFloat] = [0.5, 0.5, 0.5, 0.5]

    func configure(color: UIColor, radii: [CGFloat]) {
        self.radii = radii
        shape.fillColor = color.cgColor
        if shape.superlayer == nil { layer.addSublayer(shape) }
        setNeedsLayout()
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        let w = bounds.width
        let h = bounds.height
        let r = radii.map { min($0, 0.5) * min(w, h) }
        let path = UIBezierPath()
        path.move(to: CGPoint(x: r[0], y: 0))
        path.addLine(to: CGPoint(x: w - r[1], y: 0))
        path.addArc(withCenter: CGPoint(x: w - r[1], y: r[1]), radius: r[1], startAngle: -.pi / 2, endAngle: 0, clockwise: true)
        path.addLine(to: CGPoint(x: w, y: h - r[2]))
        path.addArc(withCenter: CGPoint(x: w - r[2], y: h - r[2]), radius: r[2], startAngle: 0, endAngle: .pi / 2, clockwise: true)
        path.addLine(to: CGPoint(x: r[3], y: h))
        path.addArc(withCenter: CGPoint(x: r[3], y: h - r[3]), radius: r[3], startAngle: .pi / 2, endAngle: .pi, clockwise: true)
        path.addLine(to: CGPoint(x: 0, y: r[0]))
        path.addArc(withCenter: CGPoint(x: r[0], y: r[0]), radius: r[0], startAngle: .pi, endAngle: 3 * .pi / 2, clockwise: true)
        path.close()
        shape.path = path.cgPath
        shape.frame = bounds
    }

    /// Translate up to 15pt and scale 0.96–1.06 on a 12 s ease-in-out loop, started [delay] seconds into the loop
    func startDrift(delay: CFTimeInterval) {
        let identity = CATransform3DIdentity
        let a = CATransform3DScale(CATransform3DMakeTranslation(15, -12, 0), 1.06, 1.06, 1)
        let b = CATransform3DScale(CATransform3DMakeTranslation(-14, 10, 0), 0.96, 0.96, 1)
        let drift = CAKeyframeAnimation(keyPath: "transform")
        drift.values = [identity, a, b, identity].map { NSValue(caTransform3D: $0) }
        drift.keyTimes = [0, 0.33, 0.66, 1]
        drift.timingFunctions = Array(repeating: CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseInEaseOut), count: 3)
        drift.duration = 12
        drift.repeatCount = .infinity
        drift.timeOffset = delay
        layer.add(drift, forKey: "drift")
    }
}
