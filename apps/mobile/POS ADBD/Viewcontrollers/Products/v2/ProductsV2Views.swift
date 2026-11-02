//
//  ProductsV2Views.swift
//  POS ADBD
//
//  Small views shared by the redesigned products and cart screens (#373).
//

import UIKit
import SnapKit
import Kingfisher

enum V2 {
    static let border = UIColor(hexString: "CBD5E1")
    static let chipFill = UIColor(hexString: "F1F5F9")
    static let sectionFill = UIColor(hexString: "F8FAFC")
    static let ok = UIColor(hexString: "047857")
    static let warn = UIColor(hexString: "9A3412")
    static let danger = UIColor(hexString: "B91C1C")

    /// #1061 (owner: "đổi icon edit không giống", "icon đúng mockup"): the size of the cart's one edit icon
    static let editPencilSize: CGFloat = 15

    /// #1061: the cart's one edit icon — the mockup's blue pen-line (`DS.editIcon`) after the text of every row that
    /// opens a sheet (Giảm giá, Đặt cọc, the order note, a line's note). Android `CartEditIcon`
    static func editPencil() -> UIImageView {
        let pencil = UIImageView(image: DS.editIcon(size: editPencilSize))
        pencil.tintColor = DS.Color.primary
        pencil.contentMode = .center
        pencil.setContentHuggingPriority(.required, for: .horizontal)
        pencil.setContentCompressionResistancePriority(.required, for: .horizontal)
        return pencil
    }

    static func label(_ text: String? = nil, size: CGFloat, weight: UIFont.Weight = .regular,
                      color: UIColor = DS.Color.text, lines: Int = 1) -> UILabel {
        let label = UILabel()
        label.text = text
        switch weight {
        case .bold, .semibold, .heavy, .black: label.font = Utils.boldFont(size: size)
        case .medium: label.font = Utils.mediumFont(size: size)
        default: label.font = Utils.regularFont(size: size)
        }
        label.textColor = color
        label.numberOfLines = lines
        return label
    }

    /// #1395: where a sheet's first line starts, on every sheet of the order detail
    static let sheetTop: CGFloat = 28
    static let sheetSide: CGFloat = 20

    /// #1395: the title of a sheet. One style everywhere; wraps instead of clipping long English
    static func sheetTitle(_ text: String) -> UILabel {
        let title = label(text, size: DS.TextSize.amount, weight: .bold, lines: 0)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        return title
    }

    /// Grey band with an upper-case title ("GIÁ", "KHO", "TIỀN")
    static func sectionHeader(_ title: String, trailing: UIView? = nil) -> UIView {
        let view = UIView()
        view.backgroundColor = sectionFill
        let top = UIView()
        top.backgroundColor = DS.Color.background
        view.addSubview(top)
        top.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(8)
        }
        let label = V2.label(title.uppercased(), size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
        view.addSubview(label)
        label.snp.makeConstraints { make in
            make.top.equalTo(top.snp.bottom).offset(10)
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-6)
        }
        if let trailing {
            view.addSubview(trailing)
            trailing.snp.makeConstraints { make in
                make.centerY.equalTo(label)
                make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            }
        }
        return view
    }

    static func divider() -> UIView {
        let view = UIView()
        view.backgroundColor = DS.Color.divider
        view.snp.makeConstraints { make in make.height.equalTo(1) }
        return view
    }

    static func primaryButton(_ title: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        button.backgroundColor = DS.Color.primary
        button.layer.cornerRadius = 14
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 24, bottom: 0, right: 24)
        button.snp.makeConstraints { make in make.height.equalTo(52) }
        return button
    }

    static func secondaryButton(_ title: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(DS.Color.text, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        button.layer.cornerRadius = 14
        button.layer.borderWidth = 1
        button.layer.borderColor = border.cgColor
        button.snp.makeConstraints { make in make.height.equalTo(52) }
        return button
    }

    static func setImage(_ imageView: UIImageView, url: String?) {
        imageView.kf.cancelDownloadTask()
        imageView.image = nil
        guard let url, let link = URL(string: url) else { return }
        imageView.kf.setImage(with: link, options: [.transition(.fade(0.1))])
    }

    /// Image well with a hanger glyph shown until a photo loads
    static func thumbnail(size: CGFloat, radius: CGFloat) -> UIImageView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = radius
        imageView.backgroundColor = chipFill
        imageView.tintColor = DS.Color.textMuted
        imageView.snp.makeConstraints { make in make.width.height.equalTo(size) }
        return imageView
    }

    static let placeholder = UIImage(systemName: "tshirt")

    /// Full-screen form over the current screen. `.overFullScreen` keeps the presenter in place, so a pushed
    /// screen's hidden tab bar does not come back after the form closes.
    /// #973: on iPad a centered form sheet instead (the form stretched across the landscape screen). It cannot be
    /// swiped or tapped away, so typed values are not lost: the form's own close button closes it.
    static func presentForm(_ controller: UIViewController, from presenter: UIViewController) {
        let nav = UINavigationController(rootViewController: controller)
        nav.setNavigationBarHidden(true, animated: false)
        if PadLayout.isPad {
            nav.modalPresentationStyle = .formSheet
            let window = presenter.view.window?.bounds.size ?? UIScreen.main.bounds.size
            nav.preferredContentSize = PadLayout.formSheetSize(in: window)
            nav.isModalInPresentation = true
        } else {
            nav.modalPresentationStyle = .overFullScreen
        }
        presenter.present(nav, animated: true)
    }
}

/// Card-like pill toggle: "Theo lần | Theo ngày", "Thuê | Bán"
final class V2Segmented: UIControl {
    private let stack = UIStackView()
    private var buttons: [UIButton] = []
    private let compact: Bool
    private(set) var selectedIndex = 0

    init(titles: [String], compact: Bool = false) {
        self.compact = compact
        super.init(frame: .zero)
        backgroundColor = V2.chipFill
        layer.cornerRadius = compact ? 9 : 10
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 0
        addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(3) }
        for (index, title) in titles.enumerated() {
            let button = UIButton(type: .custom)
            button.setTitle(title, for: .normal)
            button.titleLabel?.font = Utils.mediumFont(size: compact ? DS.TextSize.secondary : DS.TextSize.body)
            button.layer.cornerRadius = compact ? 7 : 8
            button.tag = index
            button.contentEdgeInsets = UIEdgeInsets(top: 0, left: compact ? 10 : 16, bottom: 0, right: compact ? 10 : 16)
            button.addTarget(self, action: #selector(tapped(_:)), for: .touchUpInside)
            button.snp.makeConstraints { make in make.height.equalTo(compact ? 30 : 36) }
            stack.addArrangedSubview(button)
            buttons.append(button)
        }
        select(0)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func select(_ index: Int) {
        selectedIndex = index
        for button in buttons {
            let on = button.tag == index
            button.backgroundColor = on ? .white : .clear
            button.setTitleColor(on ? DS.Color.text : DS.Color.textMuted, for: .normal)
            button.titleLabel?.font = on ? Utils.boldFont(size: compact ? DS.TextSize.secondary : DS.TextSize.body) : Utils.regularFont(size: compact ? DS.TextSize.secondary : DS.TextSize.body)
            button.layer.shadowColor = UIColor.black.cgColor
            button.layer.shadowOpacity = on ? 0.08 : 0
            button.layer.shadowRadius = 1
            button.layer.shadowOffset = CGSize(width: 0, height: 1)
            button.accessibilityTraits = on ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        }
    }

    @objc private func tapped(_ sender: UIButton) {
        guard sender.tag != selectedIndex else { return }
        select(sender.tag)
        sendActions(for: .valueChanged)
    }
}

/// − n + stepper. The number opens the same pad as price / deposit / discount (#1162).
final class V2Stepper: UIView {
    private let minus = UIButton(type: .system)
    private let plus = UIButton(type: .system)
    private let valueLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    /// Kept alive: NumberPicker's delegate is weak.
    private let pickerRelay = QuantityPickerRelay()
    var minimum = 0
    var value = 1 {
        didSet {
            valueLabel.text = "\(value)"
            valueLabel.accessibilityValue = "\(value)"
            minus.isEnabled = value > minimum
            plus.isEnabled = value < QuantityEntry.maximum
        }
    }
    var onChange: ((Int) -> Void)?

    init(compact: Bool = false) {
        super.init(frame: .zero)
        if compact { valueLabel.font = Utils.mediumFont(size: DS.TextSize.name) } // #1080: the cart line
        layer.cornerRadius = 10
        layer.borderWidth = 1
        layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        for (button, title, label) in [(minus, "−", "products.stepper.minus"), (plus, "+", "products.stepper.plus")] {
            button.setTitle(title, for: .normal)
            button.setTitleColor(DS.Color.text, for: .normal)
            button.titleLabel?.font = Utils.regularFont(size: 20)
            button.accessibilityLabel = label.localized()
        }
        valueLabel.textAlignment = .center
        valueLabel.isUserInteractionEnabled = true
        valueLabel.isAccessibilityElement = true
        valueLabel.accessibilityTraits = UIAccessibilityTraitButton
        valueLabel.accessibilityLabel = "products.stepper.enter".localized()
        let stack = UIStackView(arrangedSubviews: [minus, valueLabel, plus])
        stack.axis = .horizontal
        addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview() }
        minus.snp.makeConstraints { make in make.width.equalTo(44); make.height.equalTo(compact ? 36 : 40) }
        plus.snp.makeConstraints { make in make.width.equalTo(44) }
        valueLabel.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(44) }
        minus.addTarget(self, action: #selector(step(_:)), for: .touchUpInside)
        plus.addTarget(self, action: #selector(step(_:)), for: .touchUpInside)
        valueLabel.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(editValue)))
        pickerRelay.onValue = { [weak self] raw in
            guard let self else { return }
            let next = QuantityEntry.fromPad(raw, minimum: self.minimum)
            guard next != self.value else { return }
            self.value = next
            self.onChange?(next)
        }
        value = 1
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    @objc private func step(_ sender: UIButton) {
        let next = sender === plus ? min(QuantityEntry.maximum, value + 1) : max(minimum, value - 1)
        guard next != value else { return }
        value = next
        onChange?(next)
    }

    /// Same sheet as cọc / giảm giá: grabber, keypad, one Confirm. Swipe down to keep the old number.
    @objc private func editValue() {
        guard let parent = parentViewController, parent.presentedViewController == nil else { return }
        let picker = NumberPickerViewController.instance()
        picker.delegate = pickerRelay
        picker.configure(initialValue: Double(value), title: "products.stepper.enter".localized())
        parent.present(picker, animated: true)
    }
}

private final class QuantityPickerRelay: NSObject, NumberPickerViewControllerDelegate {
    var onValue: ((Double) -> Void)?
    func didSelectNumber(_ value: Double, sender: NumberPickerViewController) {
        onValue?(value)
    }
}

/// Tappable row "title ……… value ›"; `editable` (#1056, the cart's TIỀN): "title ……… value ✎" in blue
final class V2ValueRow: UIControl {
    let titleLabel = V2.label(size: DS.TextSize.body)
    let valueLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted)
    let chevron = UIImageView(image: DS.symbol("chevron.right", 16))
    /// #1056: the small blue pencil after the value of an editable row (#1061: the cart's one edit icon)
    let pencil = V2.editPencil()
    /// #1056: views between the value and the pencil (the order note's camera + photo count)
    let accessories = UIStackView()
    /// #1056: read after the value on an editable row (the note photos, "2 ảnh")
    var spokenExtra: String?
    private let editable: Bool
    /// #1061 (mockup cartedit A): the value sits 7pt before the pencil, or 6pt before the camera + count
    private var valueToAccessories: Constraint?

    /// `icon`: an SF Symbol before the title (#1024: the cart's order note), grey; nil = none as before.
    /// `editable` (#1056, owner: blue = tappable): no ›, the value blue and bold, then a blue pencil; VoiceOver reads
    /// the title, then "value, Sửa". `wrapsValue` (#1056, the order note): the value on as many lines as it needs, on
    /// the right; the title and the pencil stay on its first line
    init(title: String, chevron: Bool = true, icon: String? = nil, editable: Bool = false, wrapsValue: Bool = false) {
        self.editable = editable
        super.init(frame: .zero)
        let chevron = chevron && !editable
        titleLabel.text = title
        valueLabel.textAlignment = .right
        addSubview(titleLabel)
        addSubview(valueLabel)
        if editable {
            valueLabel.textColor = DS.Color.primary
            valueLabel.font = Utils.boldFont(size: DS.TextSize.body)
            valueLabel.lineBreakMode = wrapsValue ? .byWordWrapping : .byTruncatingTail
            valueLabel.numberOfLines = wrapsValue ? 0 : 1
            valueLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
            accessories.spacing = 3
            accessories.alignment = .center
            accessories.isUserInteractionEnabled = false
            addSubview(accessories)
            addSubview(pencil)
            pencil.snp.makeConstraints { make in
                make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
                if wrapsValue { make.centerY.equalTo(titleLabel) } else { make.centerY.equalToSuperview() }
                make.width.height.equalTo(V2.editPencilSize)
            }
            accessories.snp.makeConstraints { make in
                make.trailing.equalTo(pencil.snp.leading).offset(-7)
                if wrapsValue { make.centerY.equalTo(titleLabel) } else { make.centerY.equalToSuperview() }
            }
            accessories.setContentCompressionResistancePriority(.required, for: .horizontal)
            accessories.setContentHuggingPriority(.required, for: .horizontal)
        } else {
            pencil.isHidden = true
            if wrapsValue {
                // #1243: a read-only value (the cart's staged-deposit template name) wraps instead of ending in "…"
                valueLabel.lineBreakMode = .byWordWrapping
                valueLabel.numberOfLines = 0
                valueLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
            }
        }
        var titleLeading = snp.leading
        var titleInset = DS.Spacing.lg
        if let icon {
            let image = UIImageView(image: DS.symbol(icon, 17))
            image.tintColor = UIColor(hexString: "64748B")
            image.contentMode = .center
            addSubview(image)
            image.snp.makeConstraints { make in
                make.leading.equalToSuperview().offset(DS.Spacing.lg)
                make.centerY.equalToSuperview()
                make.width.height.equalTo(20)
            }
            titleLeading = image.snp.trailing
            titleInset = 8
        }
        let arrow = self.chevron
        arrow.tintColor = UIColor(hexString: "94A3B8")
        arrow.contentMode = .center
        arrow.isHidden = !chevron
        addSubview(arrow)
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(48) }
        titleLabel.snp.makeConstraints { make in
            make.leading.equalTo(titleLeading).offset(titleInset)
            if wrapsValue { make.firstBaseline.equalTo(valueLabel.snp.firstBaseline) } else { make.centerY.equalToSuperview() }
        }
        arrow.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(chevron ? 16 : 0)
        }
        valueLabel.snp.makeConstraints { make in
            make.leading.greaterThanOrEqualTo(titleLabel.snp.trailing).offset(DS.Spacing.sm)
            if editable {
                valueToAccessories = make.trailing.equalTo(accessories.snp.leading).constraint
            } else {
                make.trailing.equalTo(arrow.snp.leading).offset(chevron ? -6 : 0)
            }
            if wrapsValue {
                make.top.equalToSuperview().offset(13)
                make.bottom.equalToSuperview().offset(-13)
            } else {
                make.centerY.equalToSuperview()
            }
        }
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        // the camera + count is added after init (the order note on a new order)
        valueToAccessories?.update(offset: accessories.arrangedSubviews.isEmpty ? 0 : -6)
        super.layoutSubviews()
    }

    override var accessibilityLabel: String? {
        get { editable ? titleLabel.text : [titleLabel.text, valueLabel.text].compactMap { $0 }.joined(separator: ", ") }
        set {}
    }

    override var accessibilityValue: String? {
        get { editable ? CartV2Logic.moneyRowSpoken(value: valueLabel.text ?? "", photos: spokenExtra) : nil }
        set {}
    }

    override var isHighlighted: Bool {
        didSet { backgroundColor = isHighlighted ? V2.chipFill : .clear }
    }
}

/// #1056 (owner: "note cần xuống dòng"): a cart line's note entry — "Ghi chú" when there is no note, else the whole
/// note on as many lines as it needs, in a light box (#1024 cut it to one line). #1061 (owner: "đổi icon edit không
/// giống"): the text, then the cart's one blue edit icon (`V2.editPencil`) like the TIỀN rows; "Ghi chú" is blue
final class CartNoteEntry: UIControl {
    let textLabel = UILabel()
    let pencil = V2.editPencil()

    init(note: String?, emptyTitle: String) {
        super.init(frame: .zero)
        let shown = CartV2Logic.noteShown(note)
        textLabel.numberOfLines = 0
        textLabel.lineBreakMode = .byWordWrapping
        textLabel.text = shown ?? emptyTitle
        let font = shown == nil ? Utils.mediumFont(size: DS.TextSize.secondary) : Utils.regularFont(size: DS.TextSize.secondary)
        textLabel.font = font
        textLabel.textColor = shown == nil ? DS.Color.primary : UIColor(hexString: "334155")
        // the pencil sits on the text's first line
        pencil.snp.makeConstraints { make in
            make.width.equalTo(V2.editPencilSize)
            make.height.equalTo(max(V2.editPencilSize, ceil(font.lineHeight)))
        }
        let row = UIStackView(arrangedSubviews: [textLabel, pencil])
        row.spacing = 6
        row.alignment = .top
        row.isUserInteractionEnabled = false
        addSubview(row)
        if shown != nil {
            backgroundColor = UIColor(hexString: "F8FAFC")
            layer.cornerRadius = 8
        }
        let insets = shown == nil ? UIEdgeInsets(top: 4, left: 3, bottom: 4, right: 8)
            : UIEdgeInsets(top: 6, left: 9, bottom: 6, right: 10)
        row.snp.makeConstraints { make in make.edges.equalToSuperview().inset(insets) }
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(32) }
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override var isHighlighted: Bool {
        didSet { alpha = isHighlighted ? 0.5 : 1 }
    }
}

/// Number and phone pads have no return key (#461): a "Xong" bar above the keyboard ends editing
enum KeyboardDoneBar {
    static func attach(_ fields: [UITextField]) {
        fields.forEach { field in
            let bar = UIToolbar(frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))
            let done = UIBarButtonItem(title: "Done".localized(), style: .done, target: field,
                                       action: #selector(UIResponder.resignFirstResponder))
            done.tintColor = DS.Color.primary
            bar.items = [UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil), done]
            bar.sizeToFit()
            field.inputAccessoryView = bar
        }
    }
}

// MARK: - Create order sheets (#476, boards Gio-hang-xac-nhan, Gio-hang-da-tao)

/// Bottom sheet as tall as its content: grabber, 24pt top radius
class V2FittingSheet: UIViewController {
    let stack = UIStackView()

    init() {
        super.init(nibName: nil, bundle: nil)
        if let sheet = sheetPresentationController {
            sheet.detents = [.medium()]
            if #available(iOS 16.0, *) {
                sheet.detents = [.custom { [weak self] context in
                    guard let self else { return nil }
                    return min(context.maximumDetentValue, self.fittingHeight())
                }]
            }
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 24
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        stack.axis = .vertical
        stack.spacing = 14
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(V2.sheetTop)
            make.leading.trailing.equalToSuperview().inset(V2.sheetSide)
        }
    }

    private func fittingHeight() -> CGFloat {
        loadViewIfNeeded()
        let width = (view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width) - 2 * V2.sheetSide
        let size = stack.systemLayoutSizeFitting(CGSize(width: width, height: 0),
                                                 withHorizontalFittingPriority: .required,
                                                 verticalFittingPriority: .fittingSizeLevel)
        return V2.sheetTop + size.height + 24
    }

    static func buttons(cancel: UIButton, confirm: UIButton, confirmRatio: CGFloat) -> UIStackView {
        [cancel, confirm].forEach { button in button.snp.remakeConstraints { make in make.height.equalTo(50) } }
        let row = UIStackView(arrangedSubviews: [cancel, confirm])
        row.spacing = 10
        // After both are in the row: a width constraint needs a common ancestor
        confirm.snp.makeConstraints { make in make.width.equalTo(cancel).multipliedBy(confirmRatio) }
        return row
    }
}

/// "Tạo đơn thuê?" / "Bán & thu tiền?" — Hủy / Tạo đơn
final class CreateOrderConfirmSheet: V2FittingSheet {
    var onConfirm: (() -> Void)?
    private let confirm: CreateOrderConfirm
    /// #518 (board GH-trung-bat): lines booked out on the chosen dates while the shop allows it
    private let overlapWarnings: [String]
    private let confirmButton: UIButton

    init(confirm: CreateOrderConfirm, overlapWarnings: [String] = []) {
        self.confirm = confirm
        self.overlapWarnings = overlapWarnings
        let title: String
        if !overlapWarnings.isEmpty {
            title = "cart.overlap.createAnyway".localized()
        } else {
            title = (confirm.isSale ? "products.cart.sellAndCollect" : "products.cart.create").localized()
        }
        confirmButton = V2.primaryButton(title)
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.addArrangedSubview(V2.label(confirm.titleKey.localized(), size: 20, weight: .bold, lines: 0))

        let rows = UIStackView()
        rows.axis = .vertical
        rows.spacing = 2
        rows.addArrangedSubview(row("products.cart.confirm.customer".localized(), confirm.customer))
        if let range = confirm.range, let days = confirm.days {
            rows.addArrangedSubview(row("products.cart.confirm.dates".localized(),
                                        range + " · " + PluralText.format("products.cart.days", count: days, days)))
        }
        var itemsText = confirm.items
        if confirm.moreCount > 0 {
            itemsText += "\n" + PluralText.format("products.cart.confirm.more", count: confirm.moreCount, confirm.moreCount)
        }
        rows.addArrangedSubview(row("products.cart.confirm.items".localized(), itemsText))
        rows.addArrangedSubview(row("products.cart.total".localized(), MoneyFormatter.format(confirm.total), bold: true))
        stack.addArrangedSubview(rows)
        if !overlapWarnings.isEmpty {
            stack.addArrangedSubview(CartOverlapViews.notice(overlapWarnings.joined(separator: "\n"), style: .warning,
                                                             title: "cart.overlap.title".localized()))
        }

        let collect = UIView()
        collect.backgroundColor = UIColor(hexString: "EFF6FF")
        collect.layer.cornerRadius = 14
        let navy = UIColor(hexString: "1E3A8A")
        let collectLabel = V2.label(confirm.collectKey.localized(), size: DS.TextSize.body, color: navy)
        let collectAmount = V2.label(MoneyFormatter.format(confirm.collect), size: 22, weight: .bold, color: navy)
        collectAmount.setContentCompressionResistancePriority(.required, for: .horizontal)
        [collectLabel, collectAmount].forEach(collect.addSubview)
        collectLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(14)
            make.centerY.equalToSuperview()
        }
        collectAmount.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-14)
            make.top.bottom.equalToSuperview().inset(12)
            make.leading.greaterThanOrEqualTo(collectLabel.snp.trailing).offset(8)
        }
        collect.isAccessibilityElement = true
        collect.accessibilityLabel = [collectLabel.text, collectAmount.text].compactMap { $0 }.joined(separator: " ")
        stack.addArrangedSubview(collect)

        let cancel = V2.secondaryButton("Cancel".localized())
        cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        confirmButton.accessibilityIdentifier = "cart.confirm.create"
        let buttons = V2FittingSheet.buttons(cancel: cancel, confirm: confirmButton, confirmRatio: 1.6)
        stack.setCustomSpacing(16, after: collect)
        stack.addArrangedSubview(buttons)
    }

    /// Greyed while the create is on its way; swipe-down is blocked too
    func setBusy(_ busy: Bool) {
        confirmButton.isEnabled = !busy
        confirmButton.alpha = busy ? 0.6 : 1
        isModalInPresentation = busy
    }

    private func row(_ title: String, _ value: String, bold: Bool = false) -> UIView {
        let titleLabel = V2.label(title, size: DS.TextSize.body, color: DS.Color.textMuted)
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let valueLabel = V2.label(value, size: DS.TextSize.body, weight: bold ? .semibold : .regular, lines: 0)
        valueLabel.textAlignment = .right
        let row = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        row.alignment = .firstBaseline
        row.spacing = 12
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(30) }
        row.isAccessibilityElement = true
        row.accessibilityLabel = title + ", " + value
        return row
    }

    @objc private func cancelTapped() {
        dismiss(animated: true)
    }

    @objc private func confirmTapped() {
        onConfirm?()
    }
}

/// "Lưu thay đổi đơn #482913?" (#676, board sua-don) — rows with a yellow "Đã đổi" tag, Lưu thay đổi / Tiếp tục sửa
final class EditOrderConfirmSheet: V2FittingSheet {
    var onConfirm: (() -> Void)?
    private let confirm: EditOrderConfirm
    let saveButton = V2.primaryButton("products.cart.edit.save".localized())

    init(confirm: EditOrderConfirm) {
        self.confirm = confirm
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        let title = confirm.number.map { String(format: "products.cart.edit.confirmTitle".localized(), $0) }
            ?? "products.cart.edit.confirmTitleNoNumber".localized()
        let header = UIStackView(arrangedSubviews: [
            V2.label(title, size: 20, weight: .bold, lines: 0),
            V2.label(confirm.subtitle, size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0),
        ])
        header.axis = .vertical
        header.spacing = 4
        stack.addArrangedSubview(header)

        let card = UIStackView()
        card.axis = .vertical
        card.layer.cornerRadius = 14
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        var rows: [UIView] = []
        if let range = confirm.range, let days = confirm.days {
            rows.append(row("products.cart.edit.dates".localized(),
                            range + " · " + PluralText.format("products.cart.days", count: days, days), changed: confirm.datesChanged))
        }
        rows.append(row(confirm.itemsKey.localized(), PluralText.format("products.cart.edit.itemCount", count: confirm.itemCount, confirm.itemCount),
                        changed: confirm.itemsChanged))
        rows.append(row("products.cart.total".localized(), MoneyFormatter.format(confirm.total), changed: false))
        if let paid = confirm.paid {
            rows.append(row("products.cart.edit.paid".localized(), MoneyFormatter.format(paid), changed: false))
        }
        if let due = confirm.collectAtHandOver {
            rows.append(row("products.cart.edit.collectAtHandOver".localized(), MoneyFormatter.format(due), changed: false))
        }
        for (index, row) in rows.enumerated() {
            if index > 0 { card.addArrangedSubview(V2.divider()) }
            card.addArrangedSubview(row)
        }
        stack.addArrangedSubview(card)

        saveButton.snp.remakeConstraints { make in make.height.equalTo(52) }
        saveButton.accessibilityIdentifier = "cart.edit.save"
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        let keepEditing = UIButton(type: .system)
        keepEditing.setTitle("products.cart.edit.keepEditing".localized(), for: .normal)
        keepEditing.setTitleColor(DS.Color.text, for: .normal)
        keepEditing.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        keepEditing.addTarget(self, action: #selector(keepEditingTapped), for: .touchUpInside)
        keepEditing.snp.makeConstraints { make in make.height.equalTo(48) }
        stack.setCustomSpacing(18, after: card)
        stack.addArrangedSubview(saveButton)
        stack.setCustomSpacing(4, after: saveButton)
        stack.addArrangedSubview(keepEditing)
    }

    /// Greyed while the save is on its way; swipe-down is blocked too
    func setBusy(_ busy: Bool) {
        saveButton.isEnabled = !busy
        saveButton.alpha = busy ? 0.6 : 1
        isModalInPresentation = busy
    }

    private func row(_ title: String, _ value: String, changed: Bool) -> UIView {
        let titleLabel = V2.label(title, size: DS.TextSize.body, color: DS.Color.textMuted)
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let valueLabel = V2.label(value, size: DS.TextSize.body, weight: .bold, lines: 0)
        valueLabel.textAlignment = .right
        let line = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        line.alignment = .center
        line.spacing = 10
        if changed {
            let tag = V2.label(" " + "products.cart.edit.changed".localized() + " ", size: DS.TextSize.pill, weight: .bold,
                               color: UIColor(hexString: "92400E"))
            tag.backgroundColor = UIColor(hexString: "FEF3C7")
            tag.layer.cornerRadius = 10
            tag.clipsToBounds = true
            tag.setContentHuggingPriority(.required, for: .horizontal)
            tag.setContentCompressionResistancePriority(.required, for: .horizontal)
            tag.snp.makeConstraints { make in make.height.equalTo(22) }
            tag.accessibilityIdentifier = "cart.edit.changed"
            line.addArrangedSubview(tag)
        }
        let wrap = UIView()
        wrap.addSubview(line)
        line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)) }
        wrap.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(48) }
        wrap.isAccessibilityElement = true
        wrap.accessibilityLabel = [title, value, changed ? "products.cart.edit.changed".localized() : nil].compactMap { $0 }.joined(separator: ", ")
        return wrap
    }

    @objc private func keepEditingTapped() {
        dismiss(animated: true)
    }

    @objc private func saveTapped() {
        onConfirm?()
    }
}

/// "Đã tạo đơn #0063" — Tạo đơn mới / Xem đơn
final class OrderCreatedSheet: V2FittingSheet {
    var onNewOrder: (() -> Void)?
    var onViewOrder: (() -> Void)?
    private let summary: CreatedOrderSummary

    init(summary: CreatedOrderSummary) {
        self.summary = summary
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.alignment = .center
        stack.spacing = 12

        let check = UIImageView(image: DS.symbol("checkmark", 28, weight: .bold))
        check.tintColor = V2.ok
        check.contentMode = .center
        check.backgroundColor = UIColor(hexString: "D1FAE5")
        check.layer.cornerRadius = 28
        check.snp.makeConstraints { make in make.width.height.equalTo(56) }
        stack.addArrangedSubview(check)

        let title = V2.label(String(format: "products.cart.created.title".localized(), summary.shortNumber), size: 20, weight: .bold, lines: 0)
        title.textAlignment = .center
        stack.addArrangedSubview(title)

        let paid = String(format: summary.paidKey.localized(), MoneyFormatter.format(summary.paid))
        let detail = V2.label(summary.subtitle + "\n" + paid, size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
        detail.textAlignment = .center
        stack.addArrangedSubview(detail)

        let newOrder = V2.secondaryButton("products.cart.created.newOrder".localized())
        newOrder.addTarget(self, action: #selector(newOrderTapped), for: .touchUpInside)
        let viewOrder = V2.primaryButton("products.cart.created.viewOrder".localized())
        viewOrder.addTarget(self, action: #selector(viewOrderTapped), for: .touchUpInside)
        let buttons = V2FittingSheet.buttons(cancel: newOrder, confirm: viewOrder, confirmRatio: 1)
        stack.setCustomSpacing(18, after: detail)
        stack.addArrangedSubview(buttons)
        buttons.snp.makeConstraints { make in make.width.equalTo(stack) }
    }

    @objc private func newOrderTapped() {
        dismiss(animated: true) { [onNewOrder] in onNewOrder?() }
    }

    @objc private func viewOrderTapped() {
        dismiss(animated: true) { [onViewOrder] in onViewOrder?() }
    }
}

// MARK: - Trùng lịch (#518, boards GH-trung-bat, GH-trung-tat)

enum CartOverlapViews {
    enum Style {
        /// Red: the shop does not allow overlapping orders (cart bottom bar)
        case blocked
        /// Orange "Trùng lịch" block of the confirm sheet
        case warning
    }

    /// Rounded box with a warning triangle, an optional bold title and the message
    static func notice(_ message: String, style: Style, title: String? = nil) -> UIView {
        let text: UIColor
        let fill: UIColor
        let stroke: UIColor
        let iconTint: UIColor
        switch style {
        case .blocked:
            text = UIColor(hexString: "991B1B")
            fill = UIColor(hexString: "FEF2F2")
            stroke = UIColor(hexString: "FECACA")
            iconTint = UIColor(hexString: "B91C1C")
        case .warning:
            text = UIColor(hexString: "9A3412")
            fill = UIColor(hexString: "FFF7ED")
            stroke = UIColor(hexString: "FED7AA")
            iconTint = UIColor(hexString: "C2410C")
        }
        let icon = UIImageView(image: DS.symbol("exclamationmark.triangle", DS.Icon.md))
        icon.tintColor = iconTint
        icon.contentMode = .top
        icon.setContentHuggingPriority(.required, for: .horizontal)
        icon.setContentCompressionResistancePriority(.required, for: .horizontal)
        let texts = UIStackView()
        texts.axis = .vertical
        texts.spacing = 2
        if let title {
            texts.addArrangedSubview(V2.label(title, size: DS.TextSize.body, weight: .bold, color: text, lines: 0))
        }
        texts.addArrangedSubview(V2.label(message, size: DS.TextSize.secondary, color: text, lines: 0))
        let row = UIStackView(arrangedSubviews: [icon, texts])
        row.alignment = .top
        row.spacing = 10
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)
        row.backgroundColor = fill
        row.layer.cornerRadius = 12
        row.layer.borderWidth = 1
        row.layer.borderColor = stroke.cgColor
        row.isAccessibilityElement = true
        row.accessibilityLabel = [title, message].compactMap { $0 }.joined(separator: ". ")
        return row
    }
}
