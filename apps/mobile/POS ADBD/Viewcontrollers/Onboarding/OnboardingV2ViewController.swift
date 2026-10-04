//
//  OnboardingV2ViewController.swift
//  POS ADBD
//
//  Redesigned first-login onboarding (#387, flag `newAuth`, board Onboarding): three steps, Bỏ qua, dots,
//  Tiếp / Bắt đầu. Same "show once" storage as the current onboarding (`Utils.markOnboardingCompleted`).
//

import UIKit
import SnapKit

final class OnboardingV2ViewController: BaseViewControler {
    private struct Step {
        let symbol: String
        let titleKey: String
        let bodyKey: String
    }

    private let steps = [
        Step(symbol: "tshirt", titleKey: "onboarding.v2.product.title", bodyKey: "onboarding.v2.product.body"),
        Step(symbol: "person.2", titleKey: "onboarding.v2.customer.title", bodyKey: "onboarding.v2.customer.body"),
        Step(symbol: "doc.text", titleKey: "onboarding.v2.order.title", bodyKey: "onboarding.v2.order.body"),
    ]
    private var index = 0

    private let skipButton = CustomersV2UI.textButton("onboarding.v2.skip".localized())
    private let tile = UIView()
    private let icon = UIImageView()
    private let stepLabel = V2.label(size: 13, weight: .bold, color: DS.Color.primary)
    private let titleLabel = V2.label(size: 26, weight: .bold, lines: 0)
    private let bodyLabel = V2.label(size: 16, color: DS.Color.textMuted, lines: 0)
    private let dots = UIStackView()
    private let primaryButton = V2.primaryButton("")

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        render()
    }

    override func setupUI() {
        view.backgroundColor = .white
        skipButton.addTarget(self, action: #selector(finish), for: .touchUpInside)
        tile.backgroundColor = CustomersV2UI.avatarFill
        tile.layer.cornerRadius = 48
        tile.isAccessibilityElement = false
        icon.tintColor = DS.Color.primary
        icon.contentMode = .scaleAspectFit
        tile.addSubview(icon)
        icon.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.height.equalTo(110)
        }
        tile.snp.makeConstraints { make in make.width.height.equalTo(220) }
        [titleLabel, bodyLabel].forEach { $0.textAlignment = .center }

        let center = UIStackView(arrangedSubviews: [tile, stepLabel, titleLabel, bodyLabel])
        center.axis = .vertical
        center.alignment = .center
        center.spacing = 16
        center.setCustomSpacing(24, after: tile)

        dots.spacing = 8
        dots.alignment = .center
        dots.isAccessibilityElement = false
        primaryButton.addTarget(self, action: #selector(primaryTapped), for: .touchUpInside)

        [skipButton, center, dots, primaryButton].forEach(view.addSubview)
        skipButton.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.trailing.equalToSuperview().offset(-8)
        }
        primaryButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(24)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-24)
        }
        dots.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.bottom.equalTo(primaryButton.snp.top).offset(-20)
            make.height.equalTo(8)
        }
        center.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(32)
            make.centerY.equalToSuperview().offset(-24)
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
        icon.image = UIImage(systemName: step.symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 96, weight: .light))
        stepLabel.text = String(format: "onboarding.v2.step".localized(), index + 1, steps.count)
        titleLabel.text = step.titleKey.localized()
        bodyLabel.text = step.bodyKey.localized()
        bodyLabel.textAlignment = .center
        skipButton.isHidden = isLast
        primaryButton.setTitle((isLast ? "onboarding.v2.start" : "onboarding.v2.next").localized(), for: .normal)

        dots.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for i in steps.indices {
            let dot = UIView()
            dot.backgroundColor = i == index ? DS.Color.primary : V2.border
            dot.layer.cornerRadius = 4
            dot.snp.makeConstraints { make in
                make.width.equalTo(i == index ? 24 : 8)
                make.height.equalTo(8)
            }
            dots.addArrangedSubview(dot)
        }
        UIAccessibilityPostNotification(UIAccessibilityScreenChangedNotification, titleLabel)
    }

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
