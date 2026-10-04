//
//  AuthV2Components.swift
//  POS ADBD
//
//  #386 — building blocks of the new auth boards (Dang-nhap, Dang-ky, Quen-mat-khau): page, 52pt fields with
//  the label above and the error below, the 52pt button, back + "Bước n/2" header. Colours come from AuthV2Style.
//

import UIKit
import SnapKit

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
        titleLabel.font = Utils.boldFont(size: DS.TextSize.body)
        titleLabel.textColor = AuthV2Style.text

        box.layer.cornerRadius = AuthV2Style.fieldRadius
        box.layer.borderWidth = 1
        box.layer.borderColor = AuthV2Style.fieldBorder.cgColor
        box.backgroundColor = AuthV2Style.fieldBackground

        textField.font = Utils.regularFont(size: DS.TextSize.input)
        textField.textColor = AuthV2Style.text
        textField.placeholder = placeholder
        textField.isSecureTextEntry = secure
        textField.accessibilityLabel = title
        textField.addTarget(self, action: #selector(editingChanged), for: .editingChanged)

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

        box.addSubview(textField)
        box.snp.makeConstraints { $0.height.equalTo(AuthV2Style.fieldHeight) }
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
        toggleButton?.setImage(DS.symbol(hidden ? "eye" : "eye.slash", DS.Icon.md), for: .normal)
        toggleButton?.accessibilityLabel = (hidden ? "authv2.password.show" : "authv2.password.hide").localized()
    }
}

/// Blue 52pt button with a radius of 14
final class AuthV2PrimaryButton: UIButton {
    init(title: String) {
        super.init(frame: .zero)
        setTitle(title, for: .normal)
        setTitleColor(AuthV2Style.onPrimary, for: .normal)
        setTitleColor(AuthV2Style.onPrimary.withAlphaComponent(0.7), for: .disabled)
        titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        backgroundColor = AuthV2Style.primary
        layer.cornerRadius = AuthV2Style.buttonRadius
        snp.makeConstraints { $0.height.equalTo(AuthV2Style.buttonHeight) }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override var isEnabled: Bool {
        didSet { alpha = isEnabled ? 1 : 0.6 }
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

/// Round 44pt back button, white at 0.9 over the blobs (style E)
final class AuthV2Header: UIView {
    let backButton = UIButton(type: .system)

    init() {
        super.init(frame: .zero)
        backButton.setImage(DS.symbol("chevron.left", DS.Icon.lg), for: .normal)
        backButton.tintColor = AuthV2Style.text
        backButton.backgroundColor = AuthV2Style.backButtonFill
        backButton.layer.cornerRadius = DS.touchTarget / 2
        backButton.accessibilityLabel = "Back".localized()
        addSubview(backButton)
        backButton.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.equalToSuperview().offset(16)
            make.bottom.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
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

/// Big heading (weight 800, tight spacing) + grey 16pt subtitle
func authV2TitleBlock(title: String, subtitle: String, size: CGFloat = 30) -> UIStackView {
    let titleLabel = UILabel()
    titleLabel.attributedText = NSAttributedString(string: title, attributes: [
        NSAttributedString.Key.font: Utils.extraBoldFont(size: size),
        NSAttributedString.Key.foregroundColor: AuthV2Style.text,
        NSAttributedString.Key.kern: AuthV2Style.headingKern
    ])
    titleLabel.numberOfLines = 0
    titleLabel.accessibilityTraits = UIAccessibilityTraitHeader

    let subtitleLabel = UILabel()
    subtitleLabel.text = subtitle
    subtitleLabel.font = Utils.regularFont(size: 16)
    subtitleLabel.textColor = AuthV2Style.textMuted
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
    /// White scrolling page centred at a max width on iPad. Returns the content stack.
    func authV2Page(header: UIView?, footer: UIView?, contentInsetTop: CGFloat, blobs: AuthV2Style.BlobScale) -> UIStackView {
        view.backgroundColor = AuthV2Style.pageBackground
        let blobLayer = AuthV2Style.installBlobs(in: view, scale: blobs)
        // The blobs move with the content (keyboard up, scrolling), so they never slide over the text
        let scroll = AuthV2ScrollView()
        scroll.minStackTop = contentInsetTop
        scroll.blobClearance = AuthV2Style.blobClearance(blobs)
        scroll.onOffsetChange = { [weak blobLayer] scroll in
            blobLayer?.transform = CGAffineTransform(translationX: 0, y: -(scroll.contentOffset.y + scroll.adjustedContentInset.top))
        }
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
            scroll.stackTop = make.top.equalToSuperview().offset(contentInsetTop).constraint
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
}

/// Reports every content offset change (user scroll, IQKeyboardManager, programmatic)
final class AuthV2ScrollView: UIScrollView {
    var onOffsetChange: ((UIScrollView) -> Void)?
    var stackTop: Constraint?
    var minStackTop: CGFloat = 0
    var blobClearance: CGFloat = 0
    private var appliedTop: CGFloat = -1

    override func layoutSubviews() {
        super.layoutSubviews()
        // The scroll's top depends on the safe area and the header; keep the content below the blobs
        let top = max(minStackTop, blobClearance - frame.minY)
        if top != appliedTop {
            appliedTop = top
            stackTop?.update(offset: top)
        }
    }

    override var contentOffset: CGPoint {
        didSet { onOffsetChange?(self) }
    }

    override func adjustedContentInsetDidChange() {
        super.adjustedContentInsetDidChange()
        onOffsetChange?(self)
    }
}
