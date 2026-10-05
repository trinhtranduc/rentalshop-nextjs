//
//  OnboardingV2ViewController.swift
//  POS ADBD
//
//  Redesigned first-login onboarding (#387, flag `newAuth`; style 4A in #466, board DX-Gioi-thieu): three steps under
//  the dot-grid header, small brand top-left, Bỏ qua top-right, a step icon card, dots and Tiếp / Bắt đầu.
//  Same "show once" storage as the current onboarding (`Utils.markOnboardingCompleted`). No motion.
//

import UIKit
import SnapKit

final class OnboardingV2ViewController: BaseViewControler {
    private enum Glyph { case garment, person, calendar }

    private struct Step {
        let glyph: Glyph
        let titleKey: String
        let bodyKey: String
    }

    private let steps = [
        Step(glyph: .garment, titleKey: "onboarding.v2.product.title", bodyKey: "onboarding.v2.product.body"),
        Step(glyph: .person, titleKey: "onboarding.v2.customer.title", bodyKey: "onboarding.v2.customer.body"),
        Step(glyph: .calendar, titleKey: "onboarding.v2.order.title", bodyKey: "onboarding.v2.order.body"),
    ]
    private var index = 0

    private let skipButton = UIButton(type: .system)
    private let iconCard = UIView()
    private let iconView = UIImageView()
    private let stepLabel = V2.label(size: DS.TextSize.secondary, weight: .bold, color: DS.Color.primary)
    private let titleLabel = UILabel()
    private let bodyLabel = V2.label(size: 16, color: DS.Color.textMuted, lines: 0)
    private let dots = UIStackView()
    private let primaryButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        render()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let rect = iconCard.bounds
        iconCard.layer.shadowPath = UIBezierPath(roundedRect: rect, cornerRadius: 36).cgPath
    }

    override func setupUI() {
        view.backgroundColor = .white
        view.clipsToBounds = true

        AuthV2Style.installDotGrid(in: view)
        let brand = AuthV2Style.makeBrandBar()

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

        iconCard.backgroundColor = .white
        iconCard.layer.cornerRadius = 36
        iconCard.layer.borderWidth = 1
        iconCard.layer.borderColor = UIColor(hexString: "E8ECF2").cgColor
        iconCard.layer.shadowColor = UIColor(hexString: "0F172A").cgColor
        iconCard.layer.shadowOpacity = 0.10
        iconCard.layer.shadowRadius = 15
        iconCard.layer.shadowOffset = CGSize(width: 0, height: 12)
        iconCard.isAccessibilityElement = false
        iconView.tintColor = DS.Color.primary
        iconView.contentMode = .scaleAspectFit
        iconCard.addSubview(iconView)
        iconView.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(64)
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
        primaryButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        primaryButton.backgroundColor = DS.Color.primary
        primaryButton.layer.cornerRadius = 14
        primaryButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 28, bottom: 0, right: 28)
        primaryButton.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)

        [brand, skipButton, iconCard, texts, dots, primaryButton].forEach(view.addSubview)
        skipButton.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(12)
            make.trailing.equalToSuperview().offset(-16)
            make.height.equalTo(DS.touchTarget)
        }
        brand.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(24)
            make.centerY.equalTo(skipButton)
        }
        iconCard.snp.makeConstraints { make in
            make.top.equalTo(skipButton.snp.bottom).offset(110)
            make.centerX.equalToSuperview()
            make.width.height.equalTo(132)
        }
        texts.snp.makeConstraints { make in
            make.top.equalTo(iconCard.snp.bottom).offset(120).priority(.high)
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
        // Board: hanger (step 1), user (2), calendar (3). `hanger` is iOS 16+; deployment target is 15
        let name: String
        switch step.glyph {
        case .garment: name = UIImage(systemName: "hanger") != nil ? "hanger" : "tshirt"
        case .person: name = "person"
        case .calendar: name = "calendar"
        }
        iconView.image = DS.symbol(name, 64)
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
