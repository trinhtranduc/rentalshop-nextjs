//
//  AuthV2Components.swift
//  POS ADBD
//
//  #386, style 4A in #466 — building blocks of the pre-login screens: page with the dot grid, 52pt fields with a
//  leading icon, the label above and the error below, the 54pt button with a loading state, the top bar with the
//  back button and the small brand, "Bước n/2". Colours come from AuthV2Style.
//

import UIKit
import SnapKit

/// Label above, 52pt field with a leading icon, optional hint and an inline error below.
/// Focus: 1.5pt blue border + 3pt light-blue ring, blue icon. Error: 1.5pt red border, red icon (wins over focus).
final class AuthV2Field: UIView {
    let textField = UITextField()
    private let titleLabel = UILabel()
    private let hintLabel = UILabel()
    private let errorLabel = UILabel()
    private let ring = UIView()
    private let box = UIView()
    private let iconView = UIImageView()
    private var toggleButton: UIButton?
    private var hasError = false

    var onChange: (() -> Void)?

    init(title: String, icon: String, placeholder: String? = nil, hint: String? = nil, secure: Bool = false) {
        super.init(frame: .zero)
        titleLabel.text = title
        titleLabel.font = Utils.boldFont(size: DS.TextSize.body)
        titleLabel.textColor = AuthV2Style.text

        ring.backgroundColor = AuthV2Style.focusRing
        ring.layer.cornerRadius = AuthV2Style.fieldRadius + 3
        ring.isHidden = true
        ring.isUserInteractionEnabled = false

        box.layer.cornerRadius = AuthV2Style.fieldRadius
        box.backgroundColor = AuthV2Style.fieldBackground

        iconView.image = DS.symbol(icon, DS.Icon.md)
        iconView.contentMode = .center
        iconView.isAccessibilityElement = false

        textField.font = Utils.regularFont(size: DS.TextSize.input)
        textField.textColor = AuthV2Style.text
        textField.placeholder = placeholder
        textField.isSecureTextEntry = secure
        textField.accessibilityLabel = title
        textField.addTarget(self, action: #selector(editingChanged), for: .editingChanged)
        textField.addTarget(self, action: #selector(focusChanged), for: [.editingDidBegin, .editingDidEnd])

        hintLabel.text = hint
        hintLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        hintLabel.textColor = AuthV2Style.textMuted
        hintLabel.numberOfLines = 0
        hintLabel.isHidden = hint == nil

        errorLabel.font = Utils.mediumFont(size: DS.TextSize.secondary)
        errorLabel.textColor = AuthV2Style.error
        errorLabel.numberOfLines = 0
        errorLabel.isHidden = true

        let stack = UIStackView(arrangedSubviews: [titleLabel, box, hintLabel, errorLabel])
        stack.axis = .vertical
        stack.spacing = 6
        addSubview(stack)
        stack.snp.makeConstraints { $0.edges.equalToSuperview() }

        // The ring sits behind the box and 3pt outside it; the stack does not clip, so nothing moves on focus
        insertSubview(ring, belowSubview: stack)
        ring.snp.makeConstraints { $0.edges.equalTo(box).inset(-3) }

        box.addSubview(iconView)
        box.addSubview(textField)
        box.snp.makeConstraints { $0.height.equalTo(AuthV2Style.fieldHeight) }
        iconView.snp.makeConstraints { make in
            make.leading.equalToSuperview().inset(14)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(20)
        }
        if secure {
            let button = UIButton(type: .system)
            button.tintColor = AuthV2Style.textMuted
            button.addTarget(self, action: #selector(toggleSecure), for: .touchUpInside)
            box.addSubview(button)
            button.snp.makeConstraints { make in
                make.trailing.equalToSuperview().inset(4)
                make.centerY.equalToSuperview()
                make.width.height.equalTo(DS.touchTarget)
            }
            textField.snp.makeConstraints { make in
                make.leading.equalToSuperview().inset(44)
                make.trailing.equalTo(button.snp.leading)
                make.top.bottom.equalToSuperview()
            }
            toggleButton = button
            updateToggle()
        } else {
            textField.snp.makeConstraints { make in
                make.leading.equalToSuperview().inset(44)
                make.trailing.equalToSuperview().inset(14)
                make.top.bottom.equalToSuperview()
            }
        }
        render()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    var text: String {
        get { textField.text ?? "" }
        set { textField.text = newValue }
    }

    /// `message` is already localized; nil clears the error
    func setError(_ message: String?) {
        errorLabel.text = message
        errorLabel.isHidden = message == nil
        hasError = message != nil
        textField.accessibilityHint = message
        render()
    }

    private func render() {
        let focused = textField.isFirstResponder
        let color: UIColor
        if hasError {
            color = AuthV2Style.error
        } else if focused {
            color = AuthV2Style.primary
        } else {
            color = AuthV2Style.fieldIcon
        }
        box.layer.borderWidth = hasError || focused ? 1.5 : 1
        box.layer.borderColor = (hasError || focused ? color : AuthV2Style.fieldBorder).cgColor
        iconView.tintColor = color
        ring.isHidden = !(focused && !hasError)
    }

    @objc private func editingChanged() {
        onChange?()
    }

    @objc private func focusChanged() {
        render()
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
        toggleButton?.setImage(DS.symbol(hidden ? "eye" : "eye.slash", DS.Icon.md), for: .normal)
        toggleButton?.accessibilityLabel = (hidden ? "authv2.password.show" : "authv2.password.hide").localized()
    }
}

/// Full-width blue 54pt button, radius 14, soft blue shadow; `setLoading` swaps the title for a spinner
final class AuthV2PrimaryButton: UIButton {
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .white)
    private(set) var isLoading = false

    init(title: String) {
        super.init(frame: .zero)
        setTitle(title, for: .normal)
        setTitleColor(AuthV2Style.onPrimary, for: .normal)
        setTitleColor(AuthV2Style.onPrimary.withAlphaComponent(0.7), for: .disabled)
        titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        backgroundColor = AuthV2Style.primary
        layer.cornerRadius = AuthV2Style.buttonRadius
        layer.shadowColor = AuthV2Style.primary.cgColor
        layer.shadowOpacity = 0.25
        layer.shadowRadius = 8
        layer.shadowOffset = CGSize(width: 0, height: 6)
        spinner.hidesWhenStopped = true
        addSubview(spinner)
        spinner.snp.makeConstraints { $0.center.equalToSuperview() }
        snp.makeConstraints { $0.height.equalTo(AuthV2Style.buttonHeight) }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        layer.shadowPath = UIBezierPath(roundedRect: bounds, cornerRadius: AuthV2Style.buttonRadius).cgPath
    }

    override var isEnabled: Bool {
        didSet { alpha = isEnabled ? 1 : 0.6 }
    }

    /// Spinner instead of the title; taps are ignored while loading
    func setLoading(_ loading: Bool) {
        isLoading = loading
        isUserInteractionEnabled = !loading
        titleLabel?.alpha = loading ? 0 : 1
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        accessibilityTraits = loading ? UIAccessibilityTraitButton | UIAccessibilityTraitNotEnabled : UIAccessibilityTraitButton
    }
}

/// Text button in the primary colour with a 44pt tap target
func authV2LinkButton(_ title: String, size: CGFloat = DS.TextSize.body) -> UIButton {
    let button = UIButton(type: .system)
    button.setTitle(title, for: .normal)
    button.setTitleColor(AuthV2Style.primary, for: .normal)
    button.titleLabel?.font = Utils.boldFont(size: size)
    button.snp.makeConstraints { $0.height.greaterThanOrEqualTo(DS.touchTarget) }
    return button
}

/// "Question? Link" centred under the form (board 4A). Returns the row and the link button.
func authV2SecondaryRow(question: String, link: String) -> (UIView, UIButton) {
    let label = UILabel()
    label.text = question
    label.font = Utils.regularFont(size: DS.TextSize.body)
    label.textColor = AuthV2Style.textMuted
    let button = authV2LinkButton(link)
    let row = UIStackView(arrangedSubviews: [label, button])
    row.axis = .horizontal
    row.spacing = 6
    row.alignment = .center
    let wrapper = UIView()
    wrapper.addSubview(row)
    row.snp.makeConstraints { make in
        make.top.bottom.equalToSuperview()
        make.centerX.equalToSuperview()
        make.leading.greaterThanOrEqualToSuperview()
    }
    return (wrapper, button)
}

/// Top bar: round white 44pt back button with a light shadow on the left, small brand centred (board 4A)
final class AuthV2Header: UIView {
    let backButton = UIButton(type: .system)

    init() {
        super.init(frame: .zero)
        backButton.setImage(DS.symbol("chevron.left", DS.Icon.lg), for: .normal)
        backButton.tintColor = AuthV2Style.text
        backButton.backgroundColor = .white
        backButton.layer.cornerRadius = DS.touchTarget / 2
        backButton.layer.shadowColor = UIColor(hexString: "0F172A").cgColor
        backButton.layer.shadowOpacity = 0.12
        backButton.layer.shadowRadius = 1.5
        backButton.layer.shadowOffset = CGSize(width: 0, height: 1)
        backButton.accessibilityLabel = "Back".localized()
        let brand = AuthV2Style.makeBrandBar()
        addSubview(brand)
        addSubview(backButton)
        backButton.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.equalToSuperview().offset(16)
            make.bottom.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        brand.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.centerY.equalTo(backButton)
            make.leading.greaterThanOrEqualTo(backButton.snp.trailing).offset(8)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

/// 6pt progress bar with "Bước n/2" on its right (board Register1-E / Register2-E)
final class AuthV2Progress: UIView {
    private let label = UILabel()
    private let track = UIView()
    private let fill = UIView()

    init() {
        super.init(frame: .zero)
        track.backgroundColor = AuthV2Style.progressTrack
        track.layer.cornerRadius = 3
        fill.backgroundColor = AuthV2Style.primary
        fill.layer.cornerRadius = 3
        label.font = Utils.boldFont(size: DS.TextSize.secondary)
        label.textColor = AuthV2Style.primary
        label.setContentHuggingPriority(.required, for: .horizontal)
        addSubview(track)
        track.addSubview(fill)
        addSubview(label)
        label.snp.makeConstraints { make in
            make.trailing.top.bottom.equalToSuperview()
        }
        track.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.trailing.equalTo(label.snp.leading).offset(-10)
            make.centerY.equalTo(label)
            make.height.equalTo(6)
        }
        isAccessibilityElement = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setStep(_ step: Int, of total: Int) {
        label.text = String(format: "authv2.step".localized(), step, total)
        accessibilityLabel = label.text
        fill.snp.remakeConstraints { make in
            make.leading.top.bottom.equalToSuperview()
            make.width.equalToSuperview().multipliedBy(CGFloat(step) / CGFloat(max(total, 1)))
        }
    }
}

/// 28/36 heading (weight 800, tight spacing) + grey 16pt subtitle; centred on login
func authV2TitleBlock(title: String, subtitle: String, centered: Bool = false) -> UIStackView {
    let alignment: NSTextAlignment = centered ? .center : .natural
    let titleStyle = NSMutableParagraphStyle()
    titleStyle.minimumLineHeight = AuthV2Style.titleLineHeight
    titleStyle.maximumLineHeight = AuthV2Style.titleLineHeight
    titleStyle.alignment = alignment
    let titleLabel = UILabel()
    titleLabel.attributedText = NSAttributedString(string: title, attributes: [
        NSAttributedString.Key.font: Utils.extraBoldFont(size: AuthV2Style.titleSize),
        NSAttributedString.Key.foregroundColor: AuthV2Style.text,
        NSAttributedString.Key.kern: AuthV2Style.headingKern,
        NSAttributedString.Key.paragraphStyle: titleStyle
    ])
    titleLabel.numberOfLines = 0
    titleLabel.accessibilityTraits = UIAccessibilityTraitHeader

    let subtitleStyle = NSMutableParagraphStyle()
    subtitleStyle.minimumLineHeight = 23
    subtitleStyle.alignment = alignment
    let subtitleLabel = UILabel()
    subtitleLabel.attributedText = NSAttributedString(string: subtitle, attributes: [
        NSAttributedString.Key.font: Utils.regularFont(size: 16),
        NSAttributedString.Key.foregroundColor: AuthV2Style.textMuted,
        NSAttributedString.Key.paragraphStyle: subtitleStyle
    ])
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
        titleLabel?.font = Utils.mediumFont(size: DS.TextSize.body)
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
        backgroundColor = on ? AuthV2Style.chipOn : AuthV2Style.chipOff
        setTitleColor(on ? AuthV2Style.chipOnText : AuthV2Style.chipOffText, for: .normal)
        layer.borderColor = (on ? AuthV2Style.chipOn : AuthV2Style.chipBorder).cgColor
        titleLabel?.font = on ? Utils.boldFont(size: DS.TextSize.body) : Utils.mediumFont(size: DS.TextSize.body)
        accessibilityTraits = on ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
    }
}

extension BaseViewControler {
    /// White scrolling page with the 4A dot grid, centred at a max width on iPad. Returns the content stack.
    func authV2Page(header: UIView?, footer: UIView?, contentInsetTop: CGFloat) -> UIStackView {
        view.backgroundColor = AuthV2Style.pageBackground
        AuthV2Style.installDotGrid(in: view)
        let scroll = UIScrollView()
        scroll.backgroundColor = .clear
        scroll.alwaysBounceVertical = true
        // Dragging dismisses the keyboard. No tap-to-dismiss: with IQKeyboardManager the view moves back on
        // the touch-up and the tapped button never gets its action.
        scroll.keyboardDismissMode = .onDrag
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

        return stack
    }

    func authV2Alert(_ message: String) {
        let alert = UIAlertController(title: "Error".localized(), message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }

    /// Button spinner while a request runs; the page ignores touches meanwhile (as the old progress overlay did)
    func authV2SetLoading(_ loading: Bool, button: AuthV2PrimaryButton) {
        button.setLoading(loading)
        view.isUserInteractionEnabled = !loading
    }
}
