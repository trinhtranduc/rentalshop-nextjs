//
//  OutletLinkEditorViewController.swift
//  POS ADBD
//
//  #1643: add or edit one link of a branch (mockup "Thêm liên kết"): the type list with a check, the address with its
//  red error under it, a name for "Khác", and "Xóa liên kết" for an existing link. "Xong" hands the link back to the
//  branch form, which keeps the list in memory until its own Lưu. Rules: `OutletLinkLogic` (same as the web and the API).
//

import UIKit
import SnapKit

extension OutletLinkType {
    /// "Facebook" (the same in every language), "Trang web" / "Khác" translated
    var title: String {
        if let brand = OutletLinkLogic.brandName(self) { return brand }
        return (self == .website ? "shopinfo.links.type.website" : "shopinfo.links.type.other").localized()
    }
}

extension OutletLinkError {
    var message: String {
        switch self {
        case .invalid: return "shopinfo.links.err.invalid".localized()
        case .platform: return "shopinfo.links.err.platform".localized()
        case .labelRequired: return "shopinfo.links.err.labelRequired".localized()
        case .labelTooLong: return "shopinfo.links.err.labelTooLong".localized()
        }
    }
}

final class OutletLinkEditorViewController: BaseViewControler {
    /// The link being edited; nil when adding
    var initial: OutletLink?
    /// The type a new link starts with (the first one the branch has not used yet)
    var suggestedType: OutletLinkType = .website
    var onDone: ((OutletLink) -> Void)?
    var onDelete: (() -> Void)?

    private var type: OutletLinkType = .website
    private let urlField = UITextField()
    private let labelField = UITextField()
    private let urlError = V2.label(size: DS.TextSize.secondary, color: V2.danger, lines: 0)
    private let labelError = V2.label(size: DS.TextSize.secondary, color: V2.danger, lines: 0)
    private var typeRows: [OutletLinkType: UIImageView] = [:]
    private var labelBlock = UIView()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        view.backgroundColor = .white
        type = initial?.type ?? suggestedType

        let back = CustomersV2UI.iconButton("chevron.left", label: "Back".localized(), size: DS.Icon.lg)
        back.addTarget(self, action: #selector(close), for: .touchUpInside)
        let title = V2.label(initial.map { $0.type.title } ?? "shopinfo.links.add".localized(), size: 20, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let done = UIButton(type: .system)
        done.setTitle("Done".localized(), for: .normal)
        done.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        done.setTitleColor(DS.Color.primary, for: .normal)
        done.accessibilityIdentifier = "linkDoneButton"
        done.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)
        done.setContentHuggingPriority(.required, for: .horizontal)
        let spacer = UIView()
        let header = UIStackView(arrangedSubviews: [back, title, spacer, done])
        header.alignment = .center
        header.spacing = 4
        let headerLine = V2.divider()
        headerLine.backgroundColor = DS.Color.border

        urlField.keyboardType = .URL
        urlField.autocapitalizationType = .none
        urlField.autocorrectionType = .no
        urlField.returnKeyType = .done
        urlField.text = initial?.url ?? ""
        urlField.clearButtonMode = .whileEditing
        urlField.accessibilityIdentifier = "linkUrlField"
        urlField.addTarget(self, action: #selector(urlChanged), for: .editingChanged)
        urlField.addTarget(self, action: #selector(urlEnded), for: .editingDidEnd)
        urlField.delegate = self
        labelField.autocorrectionType = .no
        labelField.returnKeyType = .done
        labelField.text = initial?.label ?? ""
        labelField.clearButtonMode = .whileEditing
        labelField.placeholder = "shopinfo.links.labelPlaceholder".localized()
        labelField.accessibilityIdentifier = "linkLabelField"
        labelField.addTarget(self, action: #selector(labelChanged), for: .editingChanged)
        labelField.delegate = self
        [urlError, labelError].forEach { $0.isHidden = true }

        var parts: [UIView] = [sectionTitle("shopinfo.links.typeTitle".localized()), typeList()]
        let urlBox = UIStackView(arrangedSubviews: [sectionTitle("shopinfo.links.urlTitle".localized()), box(urlField), urlError,
                                                    V2.label("shopinfo.links.hint".localized(), size: DS.TextSize.secondary,
                                                             color: DS.Color.textMuted, lines: 0)])
        urlBox.axis = .vertical
        urlBox.spacing = 6
        let labelStack = UIStackView(arrangedSubviews: [sectionTitle("shopinfo.links.labelTitle".localized()), box(labelField), labelError])
        labelStack.axis = .vertical
        labelStack.spacing = 6
        labelBlock = labelStack
        parts += [urlBox, labelStack]
        if initial != nil {
            let remove = UIButton(type: .system)
            remove.setTitle("shopinfo.links.remove".localized(), for: .normal)
            remove.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
            remove.setTitleColor(V2.danger, for: .normal)
            remove.layer.cornerRadius = 14
            remove.layer.borderWidth = 1
            remove.layer.borderColor = V2.border.cgColor
            remove.snp.makeConstraints { make in make.height.equalTo(52) }
            remove.accessibilityIdentifier = "linkDeleteButton"
            remove.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)
            parts.append(remove)
        }
        let form = UIStackView(arrangedSubviews: parts)
        form.axis = .vertical
        form.spacing = 16

        let scroll = UIScrollView()
        scroll.keyboardDismissMode = .interactive
        scroll.addSubview(form)
        [header, headerLine, scroll].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.equalToSuperview().inset(8)
            make.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        headerLine.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.equalToSuperview()
        }
        scroll.snp.makeConstraints { make in
            make.top.equalTo(headerLine.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view.keyboardLayoutGuide.snp.top)
        }
        form.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-24)
            make.width.equalToSuperview().offset(-2 * DS.Spacing.lg)
        }
        render()
    }

    // MARK: - Pieces

    private func sectionTitle(_ text: String) -> UILabel {
        // normal case (owner feedback), the same bold title as the fields of the branch form
        let label = V2.label(text, size: DS.TextSize.body, weight: .bold, lines: 0)
        label.accessibilityTraits = UIAccessibilityTraitHeader
        return label
    }

    /// A text field in the form's bordered box (52 high)
    private func box(_ input: UITextField) -> UIView {
        input.font = Utils.regularFont(size: DS.TextSize.input)
        input.textColor = DS.Color.text
        input.layer.borderWidth = 1
        input.layer.borderColor = V2.border.cgColor
        input.layer.cornerRadius = 12
        input.backgroundColor = .white
        input.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
        input.leftViewMode = .always
        input.snp.makeConstraints { make in make.height.equalTo(52) }
        return input
    }

    /// The seven types, the picked one with a check
    private func typeList() -> UIView {
        let list = UIStackView()
        list.axis = .vertical
        list.layer.borderWidth = 1
        list.layer.borderColor = V2.border.cgColor
        list.layer.cornerRadius = 12
        list.clipsToBounds = true
        for (index, item) in OutletLinkType.allCases.enumerated() {
            if index > 0 { list.addArrangedSubview(V2.divider()) }
            let row = UIControl()
            row.isAccessibilityElement = true
            row.accessibilityIdentifier = "linkTypeRow_\(item.rawValue)"
            row.accessibilityLabel = item.title
            row.accessibilityTraits = UIAccessibilityTraitButton
            let name = V2.label(item.title, size: DS.TextSize.input)
            name.isUserInteractionEnabled = false
            let check = UIImageView(image: DS.symbol("checkmark", DS.Icon.sm, weight: .bold))
            check.tintColor = DS.Color.primary
            check.isUserInteractionEnabled = false
            typeRows[item] = check
            row.addSubview(name)
            row.addSubview(check)
            name.snp.makeConstraints { make in
                make.leading.equalToSuperview().offset(14)
                make.centerY.equalToSuperview()
            }
            check.snp.makeConstraints { make in
                make.trailing.equalToSuperview().offset(-14)
                make.centerY.equalToSuperview()
            }
            row.snp.makeConstraints { make in make.height.equalTo(48) }
            row.tag = index
            row.addTarget(self, action: #selector(typeTapped(_:)), for: .touchUpInside)
            list.addArrangedSubview(row)
        }
        return list
    }

    // MARK: - State

    private func render() {
        for (item, check) in typeRows { check.isHidden = item != type }
        for (item, _) in typeRows {
            if let row = typeRows[item]?.superview { row.accessibilityTraits = item == type ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton }
        }
        urlField.placeholder = OutletLinkLogic.example(type)
        labelBlock.isHidden = type != .other
    }

    private func pick(_ item: OutletLinkType) {
        view.endEditing(true)
        type = item
        render()
        if !(urlField.text ?? "").trimmingCharacters(in: .whitespaces).isEmpty { validateUrl() } else { showUrlError(nil) }
    }

    private func showUrlError(_ text: String?) {
        urlError.text = text
        urlError.isHidden = text == nil
        urlField.layer.borderColor = (text == nil ? V2.border : V2.danger).cgColor
    }

    private func showLabelError(_ text: String?) {
        labelError.text = text
        labelError.isHidden = text == nil
        labelField.layer.borderColor = (text == nil ? V2.border : V2.danger).cgColor
    }

    /// The first problem of the address, shown under it; true when it is fine
    @discardableResult
    private func validateUrl() -> Bool {
        let result = OutletLinkLogic.normalize(type: type == .other ? .website : type, url: urlField.text ?? "")
        if case .failure(let reason) = result {
            showUrlError(reason.message)
            return false
        }
        showUrlError(nil)
        return true
    }

    // MARK: - Actions

    @objc private func close() {
        view.endEditing(true)
        navigationController?.popViewController(animated: true)
    }

    @objc private func typeTapped(_ sender: UIControl) {
        pick(OutletLinkType.allCases[sender.tag])
    }

    @objc private func urlChanged() { showUrlError(nil) }
    @objc private func labelChanged() { showLabelError(nil) }
    @objc private func urlEnded() {
        if !(urlField.text ?? "").trimmingCharacters(in: .whitespaces).isEmpty { validateUrl() }
    }

    @objc private func doneTapped() {
        view.endEditing(true)
        switch OutletLinkLogic.normalize(type: type, url: urlField.text ?? "", label: labelField.text) {
        case .success(let link):
            onDone?(link)
            navigationController?.popViewController(animated: true)
        case .failure(let reason):
            if reason == .labelRequired || reason == .labelTooLong {
                showLabelError(reason.message)
                labelField.becomeFirstResponder()
            } else {
                showUrlError(reason.message)
                urlField.becomeFirstResponder()
            }
        }
    }

    @objc private func deleteTapped() {
        view.endEditing(true)
        onDelete?()
        navigationController?.popViewController(animated: true)
    }
}

extension OutletLinkEditorViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
}
