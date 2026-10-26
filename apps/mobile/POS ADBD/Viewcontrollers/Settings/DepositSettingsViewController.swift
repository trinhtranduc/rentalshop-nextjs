//
//  DepositSettingsViewController.swift
//  POS ADBD
//
//  "Cách thu cọc" (#1199, mockups m11a/m11b/m4): Settings → Cách thu cọc. Two modes as radio rows (never a switch):
//  "Thu cọc 1 lần" and "Thu cọc theo giai đoạn". Only the shop owner changes anything; every other role reads.
//  Mode 2 has the stage templates and the cancellation policy of the shop.
//

import UIKit
import SnapKit

// MARK: - Small views the deposit screens share

/// A label that wraps to as many lines as it needs. A plain multi-line `UILabel` inside a stack keeps the height of its
/// first measure (one line) when the stack then squeezes its width, so a long stage name ended in "…" (#1243).
final class WrappingLabel: UILabel {
    override func layoutSubviews() {
        super.layoutSubviews()
        if preferredMaxLayoutWidth != bounds.width {
            preferredMaxLayoutWidth = bounds.width
            invalidateIntrinsicContentSize()
        }
    }
}

enum DepositUI {
    /// `V2.label` that wraps (never "…"): the stage names, their sub lines and the card title
    static func wrapLabel(_ text: String?, size: CGFloat, weight: UIFont.Weight = .regular, color: UIColor = DS.Color.text) -> UILabel {
        wrapping(V2.label(text, size: size, weight: weight, color: color, lines: 0))
    }

    /// The same label as `source` (text, font, colour) as a wrapping one
    static func wrapping(_ source: UILabel) -> UILabel {
        let label = WrappingLabel()
        label.text = source.text
        label.font = source.font
        label.textColor = source.textColor
        label.adjustsFontForContentSizeCategory = source.adjustsFontForContentSizeCategory
        label.textAlignment = source.textAlignment
        label.numberOfLines = 0
        return label
    }

    /// A list row with a radio dot, a bold title and a grey description (settings mode rows, cart template list)
    static func radioRow(title: String, detail: String?, selected: Bool, identifier: String? = nil) -> UIControl {
        let row = UIControl()
        let dot = UIView()
        dot.isUserInteractionEnabled = false
        dot.backgroundColor = .white
        dot.layer.cornerRadius = 12
        dot.layer.borderWidth = selected ? 7 : 1.5
        dot.layer.borderColor = UIColor(hexString: selected ? "1D4ED8" : "94A3B8").cgColor
        dot.snp.makeConstraints { make in make.size.equalTo(24) }
        let name = V2.label(title, size: DS.TextSize.input, weight: selected ? .bold : .regular, lines: 0)
        let texts = UIStackView(arrangedSubviews: [name])
        texts.axis = .vertical
        texts.spacing = 4
        if let detail {
            texts.addArrangedSubview(V2.label(detail, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0))
        }
        texts.isUserInteractionEnabled = false
        let line = UIStackView(arrangedSubviews: [dot, texts])
        line.spacing = 14
        line.alignment = .top
        line.isUserInteractionEnabled = false
        row.addSubview(line)
        line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 14, left: DS.Spacing.lg, bottom: 14, right: DS.Spacing.lg)) }
        row.isAccessibilityElement = true
        row.accessibilityLabel = [title, detail].compactMap { $0 }.joined(separator: ". ")
        row.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
        row.accessibilityIdentifier = identifier
        return row
    }

    /// Amber note ("Nhân viên đang dùng app cũ ...")
    static func warningBox(_ text: String) -> UIView {
        let box = UIView()
        box.backgroundColor = UIColor(hexString: "FFFBEB")
        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1
        box.layer.borderColor = UIColor(hexString: "FDE68A").cgColor
        let label = V2.label(text, size: DS.TextSize.secondary, color: UIColor(hexString: "334155"), lines: 0)
        box.addSubview(label)
        label.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)) }
        return box
    }

    /// A small status pill ("Đã thu", "Chờ thu", "Trễ 2 ngày")
    static func pill(_ text: String, _ colors: DS.Pill) -> UIView {
        let label = V2.label(text, size: DS.TextSize.pill, weight: .bold, color: colors.text)
        label.setContentCompressionResistancePriority(.required, for: .horizontal) // a pill never ends in "…"
        let box = UIView()
        box.backgroundColor = colors.fill
        box.layer.cornerRadius = 10
        box.addSubview(label)
        label.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8)) }
        box.setContentHuggingPriority(.required, for: .horizontal)
        box.setContentCompressionResistancePriority(.required, for: .horizontal)
        return box
    }

    /// Bordered text input of 48pt
    static func field(_ text: String?, placeholder: String, keyboard: UIKeyboardType = .default) -> UITextField {
        let field = UITextField()
        field.text = text
        field.placeholder = placeholder
        field.font = Utils.regularFont(size: DS.TextSize.input)
        field.textColor = DS.Color.text
        field.keyboardType = keyboard
        field.layer.cornerRadius = 12
        field.layer.borderWidth = 1
        field.layer.borderColor = V2.border.cgColor
        field.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 1))
        field.leftViewMode = .always
        field.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 1))
        field.rightViewMode = .always
        field.snp.makeConstraints { make in make.height.equalTo(48) }
        if keyboard == .numberPad || keyboard == .decimalPad { KeyboardDoneBar.attach([field]) }
        return field
    }

    static func gap(_ height: CGFloat) -> UIView {
        let view = UIView()
        view.snp.makeConstraints { make in make.height.equalTo(height) }
        return view
    }

    static func note(_ text: String) -> UIView {
        let label = V2.label(text, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let box = UIView()
        box.addSubview(label)
        label.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg)) }
        return box
    }

    /// Full-width row for a screen's scroll stack: wraps the control with side padding of 0 and a divider below
    static func withDivider(_ view: UIView) -> UIView {
        let stack = UIStackView(arrangedSubviews: [view, V2.divider()])
        stack.axis = .vertical
        return stack
    }

    /// The scroll + stack skeleton under the custom navigation bar
    static func scaffold(in controller: BaseViewControler, title: String, scroll: UIScrollView, stack: UIStackView,
                         bottom: UIView? = nil) {
        controller.view.backgroundColor = DS.Color.surface
        _ = controller.setupCustomNavigationBar(title: title, hideBackButton: false)
        stack.axis = .vertical
        scroll.alwaysBounceVertical = true
        scroll.keyboardDismissMode = .interactive
        controller.view.addSubview(scroll)
        scroll.addSubview(stack)
        scroll.snp.makeConstraints { make in
            if let navBar = controller.customNavBar { make.top.equalTo(navBar.snp.bottom) } else { make.top.equalTo(controller.view.safeAreaLayoutGuide) }
            make.leading.trailing.equalTo(controller.view.readableColumn())
            if let bottom { make.bottom.equalTo(bottom.snp.top) } else { make.bottom.equalToSuperview() }
        }
        stack.snp.makeConstraints { make in
            make.top.bottom.equalTo(scroll.contentLayoutGuide)
            make.leading.trailing.equalTo(scroll.frameLayoutGuide)
        }
    }
}

// MARK: - Cách thu cọc

final class DepositSettingsViewController: BaseViewControler {
    private let scroll = UIScrollView()
    private let stack = UIStackView()
    private var settings = DepositSettings(depositMode: DepositModeStore.current)
    private var loaded = false
    private var saving = false
    private var generation = 0

    /// Only the shop owner changes the setting (the API answers 403 to every other role)
    private var canEdit: Bool { User.account()?.role == .merchant }

    init() {
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        DepositUI.scaffold(in: self, title: "deposit.settings.title".localized(), scroll: scroll, stack: stack)
        render()
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if loaded { load() }
    }

    private func load() {
        generation += 1
        let token = generation
        DepositPlanAPIService.shared.settings { [weak self] settings, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                if let settings {
                    self.settings = settings
                    self.loaded = true
                    DepositModeStore.didSave(settings)
                    self.render()
                } else if let error, !self.loaded {
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }

    private func render() {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stack.addArrangedSubview(V2.sectionHeader("deposit.settings.header".localized()))

        let modes: [(DepositMode, String, String)] = [
            (.oneTime, "deposit.mode.oneTime".localized(), "deposit.mode.oneTime.detail".localized()),
            (.staged, "deposit.mode.staged".localized(), "deposit.mode.staged.detail".localized()),
        ]
        for (mode, title, detail) in modes {
            let row = DepositUI.radioRow(title: title, detail: detail, selected: settings.depositMode == mode,
                                         identifier: "deposit.mode." + mode.rawValue)
            row.tag = mode == .staged ? 1 : 0
            row.addTarget(self, action: #selector(modeTapped(_:)), for: .touchUpInside)
            stack.addArrangedSubview(DepositUI.withDivider(row))
        }

        if settings.depositMode == .staged {
            let warning = DepositUI.warningBox("deposit.warning.oldApps".localized())
            let padded = UIView()
            padded.addSubview(warning)
            warning.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg)) }
            stack.addArrangedSubview(padded)
            stack.addArrangedSubview(V2.sectionHeader(""))
            let templates = V2ValueRow(title: "deposit.templates.row".localized())
            templates.valueLabel.text = String(format: "deposit.templates.count".localized(), settings.choices.count)
            templates.addTarget(self, action: #selector(openTemplates), for: .touchUpInside)
            templates.accessibilityIdentifier = "deposit.templates.row"
            templates.snp.makeConstraints { make in make.height.equalTo(52) }
            stack.addArrangedSubview(DepositUI.withDivider(templates))
            let policy = V2ValueRow(title: "deposit.policy.row".localized())
            policy.addTarget(self, action: #selector(openPolicy), for: .touchUpInside)
            policy.accessibilityIdentifier = "deposit.policy.row"
            policy.snp.makeConstraints { make in make.height.equalTo(52) }
            stack.addArrangedSubview(DepositUI.withDivider(policy))
            stack.addArrangedSubview(DepositUI.note("deposit.footnote.newOrdersOnly".localized()))
        } else {
            stack.addArrangedSubview(V2.sectionHeader("deposit.oneTime.readOnly".localized()))
            for (number, title, detail) in [("1", "deposit.oneTime.stage1".localized(), "deposit.oneTime.stage1.detail".localized()),
                                            ("2", "deposit.oneTime.stage2".localized(), "deposit.oneTime.stage2.detail".localized())] {
                stack.addArrangedSubview(DepositUI.withDivider(numberedRow(number, title, detail)))
            }
            stack.addArrangedSubview(DepositUI.note("deposit.oneTime.footnote".localized()))
        }
        if !canEdit {
            stack.addArrangedSubview(DepositUI.note("deposit.ownerOnly".localized()))
        }
    }

    private func numberedRow(_ number: String, _ title: String, _ detail: String) -> UIView {
        let circle = UIView()
        circle.backgroundColor = UIColor(hexString: "EFF6FF")
        circle.layer.cornerRadius = 13
        let digit = V2.label(number, size: DS.TextSize.secondary, weight: .bold, color: DS.Color.primary)
        circle.addSubview(digit)
        digit.snp.makeConstraints { make in make.center.equalToSuperview() }
        circle.snp.makeConstraints { make in make.size.equalTo(26) }
        let texts = UIStackView(arrangedSubviews: [V2.label(title, size: DS.TextSize.input, weight: .bold),
                                                   V2.label(detail, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)])
        texts.axis = .vertical
        texts.spacing = 3
        let line = UIStackView(arrangedSubviews: [circle, texts])
        line.spacing = 14
        line.alignment = .top
        let box = UIView()
        box.addSubview(line)
        line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg)) }
        return box
    }

    // MARK: Actions

    @objc private func modeTapped(_ sender: UIControl) {
        let mode: DepositMode = sender.tag == 1 ? .staged : .oneTime
        guard mode != settings.depositMode, !saving else { return }
        guard canEdit else {
            UIAlertController.alert(parent: self, title: "deposit.settings.title".localized(), message: "deposit.ownerOnly".localized())
            return
        }
        if mode == .staged {
            // The warning of the mockup: staff on an older app keep collecting one deposit per product
            UIAlertController.alert(parent: self, title: "deposit.enable.title".localized(), message: "deposit.warning.oldApps".localized(),
                                    okTitle: "deposit.enable.confirm".localized(), cancelTitle: "common.action.cancel".localized(),
                                    okAction: { [weak self] _ in self?.save(mode) }, cancelAction: nil)
        } else {
            save(mode)
        }
    }

    private func save(_ mode: DepositMode) {
        saving = true
        DepositModeStore.saving = true
        showProgressText(text: "Updating...".localized())
        DepositPlanAPIService.shared.saveSettings(mode: mode) { [weak self] saved, error in
            DispatchQueue.main.async {
                DepositModeStore.saving = false
                guard let self else { return }
                self.saving = false
                self.hideProgress()
                if let saved {
                    self.settings = saved
                    DepositModeStore.didSave(saved)
                    self.render()
                } else if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }

    @objc private func openTemplates() { pushTemplates(focusPolicy: false) }
    @objc private func openPolicy() { pushTemplates(focusPolicy: true) }

    private func pushTemplates(focusPolicy: Bool) {
        let page = DepositTemplatesViewController(settings: settings, canEdit: canEdit, focusPolicy: focusPolicy)
        page.onChange = { [weak self] saved in
            self?.settings = saved
            self?.render()
        }
        navigationController?.pushViewController(page, animated: true)
    }
}

// MARK: - Mẫu giai đoạn cọc + chính sách huỷ

final class DepositTemplatesViewController: BaseViewControler, UITextViewDelegate {
    var onChange: ((DepositSettings) -> Void)?

    private var settings: DepositSettings
    private let canEdit: Bool
    private let focusPolicy: Bool
    private let scroll = UIScrollView()
    private let stack = UIStackView()
    private let policyView = UITextView()
    private let saveButton = V2.primaryButton("deposit.policy.save".localized())

    init(settings: DepositSettings, canEdit: Bool, focusPolicy: Bool) {
        self.settings = settings
        self.canEdit = canEdit
        self.focusPolicy = focusPolicy
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        DepositUI.scaffold(in: self, title: "deposit.templates.title".localized(), scroll: scroll, stack: stack)
        render()
        if focusPolicy && canEdit {
            DispatchQueue.main.async { [weak self] in self?.policyView.becomeFirstResponder() }
        }
    }

    private func render() {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stack.addArrangedSubview(V2.sectionHeader("deposit.templates.title".localized()))
        stack.addArrangedSubview(DepositUI.note("deposit.templates.hint".localized()))
        stack.addArrangedSubview(V2.divider())
        if settings.templates.isEmpty, let builtIn = settings.defaultTemplate {
            stack.addArrangedSubview(DepositUI.withDivider(templateRow(builtIn, builtIn: true)))
        }
        for template in settings.templates {
            stack.addArrangedSubview(DepositUI.withDivider(templateRow(template, builtIn: false)))
        }
        if canEdit && settings.templates.count < 10 {
            let add = UIButton(type: .system)
            add.setTitle("deposit.templates.add".localized(), for: .normal)
            add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
            add.contentHorizontalAlignment = .leading
            add.contentEdgeInsets = UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 0, right: 0)
            add.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
            add.accessibilityIdentifier = "deposit.templates.add"
            add.snp.makeConstraints { make in make.height.equalTo(52) }
            stack.addArrangedSubview(add)
        }

        stack.addArrangedSubview(V2.sectionHeader("deposit.policy.header".localized()))
        stack.addArrangedSubview(DepositUI.note("deposit.policy.hint".localized()))
        policyView.text = settings.cancellationPolicy
        policyView.font = Utils.regularFont(size: DS.TextSize.body)
        policyView.textColor = DS.Color.text
        policyView.layer.cornerRadius = 12
        policyView.layer.borderWidth = 1
        policyView.layer.borderColor = V2.border.cgColor
        policyView.textContainerInset = UIEdgeInsets(top: 12, left: 8, bottom: 12, right: 8)
        policyView.isEditable = canEdit
        policyView.delegate = self
        policyView.accessibilityIdentifier = "deposit.policy.text"
        policyView.snp.remakeConstraints { make in make.height.equalTo(110) }
        let holder = UIView()
        holder.addSubview(policyView)
        policyView.snp.remakeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: DS.Spacing.lg, right: DS.Spacing.lg))
            make.height.equalTo(110)
        }
        stack.addArrangedSubview(holder)
        if canEdit {
            saveButton.addTarget(self, action: #selector(savePolicy), for: .touchUpInside)
            saveButton.accessibilityIdentifier = "deposit.policy.save"
            let buttonHolder = UIView()
            buttonHolder.addSubview(saveButton)
            saveButton.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 28, right: DS.Spacing.lg))
            }
            stack.addArrangedSubview(buttonHolder)
        }
    }

    private func templateRow(_ template: DepositTemplate, builtIn: Bool) -> UIView {
        let row = UIControl()
        let name = V2.label(template.name, size: DS.TextSize.input, lines: 0)
        let nameLine = UIStackView(arrangedSubviews: [name])
        nameLine.spacing = 8
        nameLine.alignment = .center
        if template.isDefault == true {
            nameLine.addArrangedSubview(DepositUI.pill("deposit.templates.default".localized(), DS.Status.done))
            nameLine.addArrangedSubview(UIView())
        }
        let texts = UIStackView(arrangedSubviews: [nameLine,
                                                   V2.label(template.summary, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)])
        texts.axis = .vertical
        texts.spacing = 4
        texts.isUserInteractionEnabled = false
        nameLine.isUserInteractionEnabled = false
        let chevron = UIImageView(image: DS.symbol("chevron.right", 16))
        chevron.tintColor = DS.Color.textMuted
        chevron.setContentHuggingPriority(.required, for: .horizontal)
        let line = UIStackView(arrangedSubviews: [texts, chevron])
        line.spacing = 8
        line.alignment = .center
        line.isUserInteractionEnabled = false
        row.addSubview(line)
        line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg)) }
        if canEdit {
            row.addAction(UIAction { [weak self] _ in self?.edit(template, builtIn: builtIn) }, for: .touchUpInside)
        } else {
            chevron.isHidden = true
        }
        row.accessibilityIdentifier = "deposit.template." + template.id
        return row
    }

    // MARK: Actions

    @objc private func addTapped() { edit(nil, builtIn: false) }

    private func edit(_ template: DepositTemplate?, builtIn: Bool) {
        // The built-in template is a copy to save as the shop's own first template
        let source = builtIn ? template.map { DepositTemplate(id: "t" + String(UUID().uuidString.prefix(8)).lowercased(), name: $0.name,
                                                               isDefault: true, items: $0.items) } : template
        let editor = DepositTemplateEditorViewController(template: source, isNew: template == nil || builtIn,
                                                         others: settings.templates.filter { $0.id != source?.id })
        editor.onSave = { [weak self] saved in self?.apply(saved) }
        editor.onDelete = { [weak self] id in self?.remove(id) }
        navigationController?.pushViewController(editor, animated: true)
    }

    private func apply(_ template: DepositTemplate) {
        var next = settings.templates
        if template.isDefault == true { next = next.map { item in var copy = item; copy.isDefault = nil; return copy } }
        if let index = next.firstIndex(where: { $0.id == template.id }) { next[index] = template } else { next.append(template) }
        save(templates: next)
    }

    private func remove(_ id: String) {
        save(templates: settings.templates.filter { $0.id != id })
    }

    private func save(templates: [DepositTemplate]) {
        showProgressText(text: "Updating...".localized())
        DepositPlanAPIService.shared.saveSettings(templates: templates) { [weak self] saved, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let saved {
                    self.settings = saved
                    DepositModeStore.didSave(saved)
                    self.onChange?(saved)
                    self.navigationController?.popToViewController(self, animated: true)
                    self.render()
                } else if let error {
                    UIAlertController.errorAlert(parent: self.navigationController?.topViewController ?? self, error: error)
                }
            }
        }
    }

    @objc private func savePolicy() {
        view.endEditing(true)
        showProgressText(text: "Updating...".localized())
        DepositPlanAPIService.shared.saveSettings(cancellationPolicy: policyView.text ?? "") { [weak self] saved, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let saved {
                    self.settings = saved
                    self.onChange?(saved)
                    UIAlertController.alert(parent: self, title: "deposit.policy.header".localized(), message: "deposit.policy.saved".localized())
                } else if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
}

// MARK: - Sửa một mẫu

final class DepositTemplateEditorViewController: BaseViewControler {
    var onSave: ((DepositTemplate) -> Void)?
    var onDelete: ((String) -> Void)?

    private let templateId: String
    private let isNew: Bool
    private var name: String
    private var isDefault: Bool
    private var stages: [DepositStageTemplate]
    private let scroll = UIScrollView()
    private let stack = UIStackView()
    private let saveButton = V2.primaryButton("deposit.template.save".localized())
    private let errorLabel = V2.label(size: DS.TextSize.secondary, color: DS.Status.late.text, lines: 0)
    private let bottomBar = UIView()
    private var nameField: UITextField?
    private var labelFields: [UITextField] = []
    private var percentFields: [UITextField] = []
    private var dayFields: [UITextField] = []

    init(template: DepositTemplate?, isNew: Bool, others: [DepositTemplate]) {
        templateId = template?.id ?? "t" + String(UUID().uuidString.prefix(8)).lowercased()
        self.isNew = isNew
        name = template?.name ?? ""
        isDefault = template?.isDefault == true || (template == nil && others.isEmpty)
        stages = template?.items ?? [DepositStageTemplate(label: "deposit.stage.default1".localized(), value: 30, dueRule: .onCreate)]
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.addSubview(bottomBar)
        bottomBar.backgroundColor = DS.Color.surface
        bottomBar.addSubview(saveButton)
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        saveButton.accessibilityIdentifier = "deposit.template.save"
        saveButton.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-DS.Spacing.sm)
        }
        bottomBar.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
        }
        DepositUI.scaffold(in: self, title: "deposit.template.title".localized(), scroll: scroll, stack: stack, bottom: bottomBar)
        render()
    }

    /// Writes what is typed into the model before a redraw
    private func capture() {
        name = nameField?.text ?? name
        for index in stages.indices where index < labelFields.count {
            stages[index].label = labelFields[index].text ?? stages[index].label
            stages[index].value = Double((percentFields[index].text ?? "").replacingOccurrences(of: ",", with: ".")) ?? 0
            if stages[index].dueRule.kind != DepositDueRule.onCreateKind {
                stages[index].dueRule.days = Int(dayFields[index].text ?? "") ?? 0
            }
        }
    }

    private func render() {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        labelFields = []
        percentFields = []
        dayFields = []
        stack.addArrangedSubview(V2.sectionHeader("deposit.template.name".localized()))
        let nameInput = DepositUI.field(name, placeholder: "deposit.template.name.placeholder".localized())
        nameInput.accessibilityIdentifier = "deposit.template.name"
        // #1243: a long template name shrinks to fit the field instead of ending in "…"
        nameInput.adjustsFontSizeToFitWidth = true
        nameInput.minimumFontSize = 11
        nameField = nameInput
        stack.addArrangedSubview(padded(nameInput))

        stack.addArrangedSubview(V2.sectionHeader("deposit.template.stages".localized()))
        for (index, stage) in stages.enumerated() {
            stack.addArrangedSubview(stageCard(index, stage))
        }
        if stages.count < 3 {
            let add = UIButton(type: .system)
            add.setTitle("deposit.template.addStage".localized(), for: .normal)
            add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
            add.contentHorizontalAlignment = .leading
            add.contentEdgeInsets = UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 0, right: 0)
            add.addTarget(self, action: #selector(addStage), for: .touchUpInside)
            add.snp.makeConstraints { make in make.height.equalTo(48) }
            stack.addArrangedSubview(add)
        }
        let total = stages.reduce(0) { $0 + $1.value }
        let rest = max(0, 100 - total)
        let restRow = V2.label(String(format: "deposit.template.rest".localized(), DepositPlanMath.percentText(rest)),
                               size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
        stack.addArrangedSubview(padded(restRow))

        let defaultRow = DepositUI.radioRow(title: "deposit.template.makeDefault".localized(), detail: nil, selected: isDefault)
        defaultRow.addAction(UIAction { [weak self] _ in
            guard let self else { return }
            self.capture()
            self.isDefault.toggle()
            self.render()
        }, for: .touchUpInside)
        stack.addArrangedSubview(V2.sectionHeader(""))
        stack.addArrangedSubview(defaultRow)
        errorLabel.isHidden = true
        stack.addArrangedSubview(padded(errorLabel))
        if !isNew {
            let delete = UIButton(type: .system)
            delete.setTitle("deposit.template.delete".localized(), for: .normal)
            delete.setTitleColor(DS.Status.late.text, for: .normal)
            delete.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
            delete.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)
            delete.snp.makeConstraints { make in make.height.equalTo(52) }
            stack.addArrangedSubview(delete)
        }
        stack.addArrangedSubview(DepositUI.gap(24))
    }

    private func padded(_ view: UIView) -> UIView {
        let holder = UIView()
        holder.addSubview(view)
        view.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 6, left: DS.Spacing.lg, bottom: 6, right: DS.Spacing.lg)) }
        return holder
    }

    private func stageCard(_ index: Int, _ stage: DepositStageTemplate) -> UIView {
        let label = DepositUI.field(stage.label, placeholder: "deposit.template.stage.label".localized())
        label.accessibilityIdentifier = "deposit.stage.label.\(index)"
        let percent = DepositUI.field(DepositPlanMath.percentText(stage.value), placeholder: "%", keyboard: .decimalPad)
        percent.accessibilityIdentifier = "deposit.stage.percent.\(index)"
        let days = DepositUI.field(String(stage.dueRule.days ?? 0), placeholder: "0", keyboard: .numberPad)
        days.accessibilityIdentifier = "deposit.stage.days.\(index)"
        days.isHidden = stage.dueRule.kind == DepositDueRule.onCreateKind
        days.addAction(UIAction { [weak self] _ in
            self?.capture()
            self?.render()
        }, for: .editingDidEnd)
        labelFields.append(label)
        percentFields.append(percent)
        dayFields.append(days)

        let percentRow = UIStackView(arrangedSubviews: [percent, V2.label("deposit.template.percentOfOrder".localized(), size: DS.TextSize.body, color: DS.Color.textMuted)])
        percentRow.spacing = 10
        percentRow.alignment = .center
        percent.snp.makeConstraints { make in make.width.equalTo(96) }

        let rule = UIButton(type: .system)
        rule.setTitle(stage.dueRule.text + "  ⌄", for: .normal)
        rule.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        rule.contentHorizontalAlignment = .leading
        rule.addAction(UIAction { [weak self] _ in self?.pickRule(index) }, for: .touchUpInside)
        rule.accessibilityIdentifier = "deposit.stage.rule.\(index)"
        rule.snp.makeConstraints { make in make.height.equalTo(40) }

        var rows: [UIView] = [label, percentRow, rule, days]
        if stages.count > 1 {
            let remove = UIButton(type: .system)
            remove.setTitle("deposit.template.removeStage".localized(), for: .normal)
            remove.setTitleColor(DS.Status.late.text, for: .normal)
            remove.titleLabel?.font = Utils.regularFont(size: DS.TextSize.secondary)
            remove.contentHorizontalAlignment = .trailing
            remove.addAction(UIAction { [weak self] _ in
                guard let self else { return }
                self.capture()
                self.stages.remove(at: index)
                self.render()
            }, for: .touchUpInside)
            rows.append(remove)
        }
        let card = UIStackView(arrangedSubviews: rows)
        card.axis = .vertical
        card.spacing = 8
        card.isLayoutMarginsRelativeArrangement = true
        card.layoutMargins = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        card.layer.cornerRadius = 12
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        return padded(card)
    }

    private func pickRule(_ index: Int) {
        capture()
        let sheet = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        let options: [(String, DepositDueRule)] = [
            (DepositDueRule.onCreate.text, .onCreate),
            (DepositDueRule.beforePickup(3).text.replacingOccurrences(of: "3", with: "N"), .beforePickup(stages[index].dueRule.days ?? 3)),
            (DepositDueRule.afterCreate(3).text.replacingOccurrences(of: "3", with: "N"), .afterCreate(stages[index].dueRule.days ?? 3)),
        ]
        for (title, rule) in options {
            sheet.addAction(UIAlertAction(title: title, style: .default) { [weak self] _ in
                self?.stages[index].dueRule = rule
                self?.render()
            })
        }
        sheet.addAction(UIAlertAction(title: "common.action.cancel".localized(), style: .cancel))
        sheet.popoverPresentationController?.sourceView = view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        present(sheet, animated: true)
    }

    @objc private func addStage() {
        capture()
        let used = stages.reduce(0) { $0 + $1.value }
        stages.append(DepositStageTemplate(label: "deposit.stage.default2".localized(), value: min(40, max(10, 100 - used - 10)),
                                           dueRule: .beforePickup(3)))
        render()
    }

    @objc private func deleteTapped() {
        UIAlertController.alert(parent: self, title: "deposit.template.delete".localized(), message: "deposit.template.delete.confirm".localized(),
                                okTitle: "deposit.template.delete".localized(), cancelTitle: "common.action.cancel".localized(),
                                okAction: { [weak self] _ in
                                    guard let self else { return }
                                    self.onDelete?(self.templateId)
                                }, cancelAction: nil)
    }

    @objc private func saveTapped() {
        view.endEditing(true)
        capture()
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let total = stages.reduce(0) { $0 + $1.value }
        var problem: String?
        if trimmed.isEmpty { problem = "deposit.template.error.name".localized() }
        else if stages.contains(where: { $0.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || $0.value <= 0 || $0.value > 100 }) {
            problem = "deposit.template.error.stage".localized()
        } else if total > 100 { problem = "deposit.template.error.total".localized() }
        if let problem {
            errorLabel.text = problem
            errorLabel.isHidden = false
            return
        }
        let items = stages.map { stage -> DepositStageTemplate in
            var copy = stage
            copy.label = stage.label.trimmingCharacters(in: .whitespacesAndNewlines)
            if copy.dueRule.kind == DepositDueRule.onCreateKind { copy.dueRule.days = nil }
            return copy
        }
        onSave?(DepositTemplate(id: templateId, name: trimmed, isDefault: isDefault ? true : nil, items: items))
    }
}

// MARK: - Text helpers of the deposit screens

extension DepositUI {
    /// "Tiền mặt" / "Chuyển khoản" / "Séc" for an API payment method
    static func methodName(_ method: String) -> String {
        switch method.uppercased() {
        case "TRANSFER": return "deposit.method.transfer".localized()
        case "CHECK": return "deposit.method.check".localized()
        case "MANUAL": return "deposit.method.manual".localized()
        default: return "deposit.method.cash".localized()
        }
    }

    /// `2026-11-10` → `10/11`
    static func dayText(_ key: String?) -> String {
        guard let key, key.count == 10 else { return "" }
        let parts = key.split(separator: "-")
        guard parts.count == 3 else { return key }
        return "\(parts[2])/\(parts[1])"
    }
}
