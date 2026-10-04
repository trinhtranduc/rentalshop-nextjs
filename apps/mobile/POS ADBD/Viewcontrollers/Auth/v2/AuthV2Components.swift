//
//  AuthV2Components.swift
//  POS ADBD
//
//  #386 — building blocks of the new auth boards (Dang-nhap, Dang-ky, Quen-mat-khau): white page,
//  52pt fields with the label above and the error below, a blue 52pt button, back + "Bước n/2" header.
//

import UIKit
import SnapKit

enum AuthV2Style {
    static let fieldBorder = UIColor(hexString: "CBD5E1")
    static let error = UIColor(hexString: "B91C1C")
    static let chipBorder = UIColor(hexString: "E2E8F0")
    static let track = UIColor(hexString: "E5E7EB")
    static let sideInset: CGFloat = 24
    static let maxWidth: CGFloat = 480
}

/// Label above, 52pt field, optional hint and an inline error below
final class AuthV2Field: UIView {
    let textField = UITextField()
    private let titleLabel = UILabel()
    private let hintLabel = UILabel()
    private let errorLabel = UILabel()
    private let box = UIView()
    private var toggleButton: UIButton?

    var onChange: (() -> Void)?

    init(title: String, placeholder: String? = nil, hint: String? = nil, secure: Bool = false) {
        super.init(frame: .zero)
        titleLabel.text = title
        titleLabel.font = Utils.boldFont(size: 14)
        titleLabel.textColor = DS.Color.text

        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1
        box.layer.borderColor = AuthV2Style.fieldBorder.cgColor
        box.backgroundColor = .white

        textField.font = Utils.regularFont(size: 16)
        textField.textColor = DS.Color.text
        textField.placeholder = placeholder
        textField.isSecureTextEntry = secure
        textField.accessibilityLabel = title
        textField.addTarget(self, action: #selector(editingChanged), for: .editingChanged)

        hintLabel.text = hint
        hintLabel.font = Utils.regularFont(size: 13)
        hintLabel.textColor = DS.Color.textMuted
        hintLabel.numberOfLines = 0
        hintLabel.isHidden = hint == nil

        errorLabel.font = Utils.mediumFont(size: 13)
        errorLabel.textColor = AuthV2Style.error
        errorLabel.numberOfLines = 0
        errorLabel.isHidden = true

        let stack = UIStackView(arrangedSubviews: [titleLabel, box, hintLabel, errorLabel])
        stack.axis = .vertical
        stack.spacing = 6
        addSubview(stack)
        stack.snp.makeConstraints { $0.edges.equalToSuperview() }

        box.addSubview(textField)
        box.snp.makeConstraints { $0.height.equalTo(52) }
        if secure {
            let button = UIButton(type: .system)
            button.tintColor = DS.Color.textMuted
            button.addTarget(self, action: #selector(toggleSecure), for: .touchUpInside)
            box.addSubview(button)
            button.snp.makeConstraints { make in
                make.trailing.equalToSuperview().inset(4)
                make.centerY.equalToSuperview()
                make.width.height.equalTo(DS.touchTarget)
            }
            textField.snp.makeConstraints { make in
                make.leading.equalToSuperview().inset(14)
                make.trailing.equalTo(button.snp.leading)
                make.top.bottom.equalToSuperview()
            }
            toggleButton = button
            updateToggle()
        } else {
            textField.snp.makeConstraints { make in
                make.leading.trailing.equalToSuperview().inset(14)
                make.top.bottom.equalToSuperview()
            }
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    var text: String {
        get { textField.text ?? "" }
        set { textField.text = newValue }
    }

    /// `key` is a localization key; nil clears the error
    func setError(_ message: String?) {
        errorLabel.text = message
        errorLabel.isHidden = message == nil
        box.layer.borderWidth = message == nil ? 1 : 1.5
        box.layer.borderColor = (message == nil ? AuthV2Style.fieldBorder : AuthV2Style.error).cgColor
        textField.accessibilityHint = message
    }

    @objc private func editingChanged() {
        onChange?()
    }

    @objc private func toggleSecure() {
        textField.isSecureTextEntry.toggle()
        // Re-set the text so the caret does not jump and the font stays the same after toggling
        let current = textField.text
        textField.text = nil
        textField.text = current
        updateToggle()
    }

    private func updateToggle() {
        let hidden = textField.isSecureTextEntry
        toggleButton?.setImage(UIImage(systemName: hidden ? "eye" : "eye.slash"), for: .normal)
        toggleButton?.accessibilityLabel = (hidden ? "authv2.password.show" : "authv2.password.hide").localized()
    }
}

/// Blue 52pt button with a radius of 14
final class AuthV2PrimaryButton: UIButton {
    init(title: String) {
        super.init(frame: .zero)
        setTitle(title, for: .normal)
        setTitleColor(.white, for: .normal)
        setTitleColor(UIColor.white.withAlphaComponent(0.7), for: .disabled)
        titleLabel?.font = Utils.boldFont(size: 16)
        backgroundColor = DS.Color.primary
        layer.cornerRadius = 14
        snp.makeConstraints { $0.height.equalTo(52) }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var isEnabled: Bool {
        didSet { alpha = isEnabled ? 1 : 0.6 }
    }
}

/// Text button in the primary colour with a 44pt tap target
func authV2LinkButton(_ title: String, size: CGFloat = 15) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.setTitleColor(DS.Color.primary, for: .normal)
    button.titleLabel?.font = Utils.boldFont(size: size)
    button.snp.makeConstraints { $0.height.greaterThanOrEqualTo(DS.touchTarget) }
    return button
}

/// Back chevron, optional "Bước n/2" on the right and a progress bar under it
final class AuthV2Header: UIView {
    let backButton = UIButton(type: .system)
    private let stepLabel = UILabel()
    private let track = UIView()
    private let fill = UIView()
    private var fillWidth: Constraint?

    init(showsProgress: Bool) {
        super.init(frame: .zero)
        backButton.setImage(UIImage(systemName: "chevron.left", withConfiguration: UIImage.SymbolConfiguration(pointSize: 18, weight: .semibold)), for: .normal)
        backButton.tintColor = DS.Color.text
        backButton.accessibilityLabel = "Back".localized()
        addSubview(backButton)
        backButton.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(8)
            make.leading.equalToSuperview().offset(8)
            make.width.height.equalTo(DS.touchTarget)
            if !showsProgress { make.bottom.equalToSuperview() }
        }
        guard showsProgress else { return }

        stepLabel.font = Utils.regularFont(size: 13)
        stepLabel.textColor = DS.Color.textMuted
        stepLabel.textAlignment = .right
        addSubview(stepLabel)
        stepLabel.snp.makeConstraints { make in
            make.centerY.equalTo(backButton)
            make.trailing.equalToSuperview().inset(AuthV2Style.sideInset)
        }

        track.backgroundColor = AuthV2Style.track
        track.layer.cornerRadius = 2
        fill.backgroundColor = DS.Color.primary
        fill.layer.cornerRadius = 2
        addSubview(track)
        track.addSubview(fill)
        track.snp.makeConstraints { make in
            make.top.equalTo(backButton.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview().inset(AuthV2Style.sideInset)
            make.height.equalTo(4)
            make.bottom.equalToSuperview()
        }
        fill.snp.makeConstraints { make in
            make.leading.top.bottom.equalToSuperview()
            fillWidth = make.width.equalToSuperview().multipliedBy(0.5).constraint
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setStep(_ step: Int, of total: Int) {
        stepLabel.text = String(format: "authv2.step".localized(), step, total)
        fill.snp.remakeConstraints { make in
            make.leading.top.bottom.equalToSuperview()
            make.width.equalToSuperview().multipliedBy(CGFloat(step) / CGFloat(max(total, 1)))
        }
        accessibilityElements = [backButton, stepLabel]
    }
}

/// Title (24 bold) + muted subtitle
func authV2TitleBlock(title: String, subtitle: String) -> UIStackView {
    let titleLabel = UILabel()
    titleLabel.text = title
    titleLabel.font = Utils.boldFont(size: 24)
    titleLabel.textColor = DS.Color.text
    titleLabel.numberOfLines = 0
    titleLabel.accessibilityTraits = UIAccessibilityTraitHeader

    let subtitleLabel = UILabel()
    subtitleLabel.text = subtitle
    subtitleLabel.font = Utils.regularFont(size: 15)
    subtitleLabel.textColor = DS.Color.textMuted
    subtitleLabel.numberOfLines = 0

    let stack = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
    stack.axis = .vertical
    stack.spacing = 6
    return stack
}

/// Chips that wrap onto new lines; height follows the content
final class AuthV2ChipFlow: UIView {
    var chips: [UIButton] = [] {
        didSet {
            oldValue.forEach { $0.removeFromSuperview() }
            chips.forEach { addSubview($0) }
            invalidateIntrinsicContentSize()
            setNeedsLayout()
        }
    }
    private let spacing: CGFloat = 8
    private var contentHeight: CGFloat = 0

    override var intrinsicContentSize: CGSize {
        CGSize(width: UIViewNoIntrinsicMetric, height: contentHeight)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        for chip in chips {
            let size = chip.intrinsicContentSize
            let width = min(size.width, bounds.width)
            if x > 0, x + width > bounds.width {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            chip.frame = CGRect(x: x, y: y, width: width, height: size.height)
            x += width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        let height = chips.isEmpty ? 0 : y + rowHeight
        if abs(height - contentHeight) > 0.5 {
            contentHeight = height
            invalidateIntrinsicContentSize()
        }
    }
}

/// Pill chip: dark filled when on, white with a border when off (board Dang-ky)
final class AuthV2Chip: UIButton {
    init(title: String) {
        super.init(frame: .zero)
        setTitle(title, for: .normal)
        titleLabel?.font = Utils.mediumFont(size: 14)
        contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
        layer.cornerRadius = 20
        layer.borderWidth = 1
        setOn(false)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width, height: 40)
    }

    func setOn(_ on: Bool) {
        backgroundColor = on ? DS.Color.text : .white
        setTitleColor(on ? .white : DS.Color.text, for: .normal)
        layer.borderColor = (on ? DS.Color.text : AuthV2Style.chipBorder).cgColor
        titleLabel?.font = on ? Utils.boldFont(size: 14) : Utils.mediumFont(size: 14)
        accessibilityTraits = on ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
    }
}

extension BaseViewControler {
    /// White scrolling page centred at a max width on iPad. Returns the content stack.
    func authV2Page(header: UIView?, footer: UIView?, contentInsetTop: CGFloat) -> UIStackView {
        view.backgroundColor = .white
        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        scroll.keyboardDismissMode = .interactive
        view.addSubview(scroll)

        if let header {
            view.addSubview(header)
            header.snp.makeConstraints { make in
                make.top.equalTo(view.safeAreaLayoutGuide)
                make.centerX.equalToSuperview()
                make.width.lessThanOrEqualTo(AuthV2Style.maxWidth)
                make.width.equalToSuperview().priority(.high)
            }
        }
        if let footer {
            view.addSubview(footer)
            footer.snp.makeConstraints { make in
                make.bottom.equalTo(view.safeAreaLayoutGuide).inset(16)
                make.centerX.equalToSuperview()
                make.width.lessThanOrEqualTo(AuthV2Style.maxWidth - 2 * AuthV2Style.sideInset)
                make.leading.greaterThanOrEqualToSuperview().inset(AuthV2Style.sideInset)
                make.leading.equalToSuperview().inset(AuthV2Style.sideInset).priority(.high)
            }
        }
        scroll.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            if let header { make.top.equalTo(header.snp.bottom) } else { make.top.equalTo(view.safeAreaLayoutGuide) }
            if let footer { make.bottom.equalTo(footer.snp.top).offset(-12) } else { make.bottom.equalToSuperview() }
        }

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        scroll.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(contentInsetTop)
            make.bottom.equalToSuperview().inset(16)
            make.centerX.equalToSuperview()
            make.width.lessThanOrEqualTo(AuthV2Style.maxWidth - 2 * AuthV2Style.sideInset)
            make.width.equalTo(scroll.frameLayoutGuide).offset(-2 * AuthV2Style.sideInset).priority(.high)
        }

        let tap = UITapGestureRecognizer(target: view, action: #selector(UIView.endEditing(_:)))
        tap.cancelsTouchesInView = false
        view.addGestureRecognizer(tap)
        return stack
    }

    func authV2Alert(_ message: String) {
        let alert = UIAlertController(title: "Error".localized(), message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
}
