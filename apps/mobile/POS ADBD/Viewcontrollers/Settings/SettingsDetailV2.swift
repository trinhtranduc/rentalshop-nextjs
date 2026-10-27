//
//  SettingsDetailV2.swift
//  POS ADBD
//
//  Pieces of the Settings detail pages in the new style (#459). The pages opened from Settings v2 set `v2 = true`
//  and build their layout from these; with `newSettings` off the same pages keep their old layout.
//  Same look as the redesigned customer screens (#387): ‹ + 20pt title, grey bands, thin dividers, 52pt fields,
//  14pt-radius buttons.
//

import UIKit
import SnapKit

enum SettingsDetailV2 {
    static func backButton() -> UIButton {
        CustomersV2UI.iconButton("chevron.left", label: "Back".localized(), size: DS.Icon.lg)
    }

    /// ‹ + title (+ trailing views) under the safe area, with a border line below. Returns the line: lay the content under it.
    @discardableResult
    static func installHeader(on view: UIView, title: String, back: UIButton, trailing: [UIView] = []) -> UIView {
        let titleLabel = V2.label(title, size: 20, weight: .bold)
        titleLabel.accessibilityTraits = UIAccessibilityTraitHeader
        titleLabel.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let header = UIStackView(arrangedSubviews: [back, titleLabel] + trailing)
        header.alignment = .center
        header.spacing = 4
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        [header, line].forEach(view.addSubview)
        // #973: centered column on iPad, like the content under it
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.equalTo(view.readableColumn()).offset(8)
            make.trailing.equalTo(view.readableColumn()).offset(-8)
            make.height.equalTo(DS.touchTarget)
        }
        line.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(8)
            make.leading.trailing.equalTo(view.readableColumn())
        }
        return line
    }

    /// White bar with a top border and the buttons side by side, above the safe area bottom. Returns the bar.
    @discardableResult
    static func installBottomBar(on view: UIView, buttons: [UIButton]) -> UIView {
        let bar = UIView()
        bar.backgroundColor = .white
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        let stack = UIStackView(arrangedSubviews: buttons)
        stack.spacing = 12
        [line, stack].forEach(bar.addSubview)
        view.addSubview(bar)
        bar.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide)
        }
        line.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalTo(view.readableColumn()).inset(DS.Spacing.lg) // #973 centered on iPad
            make.bottom.equalToSuperview().offset(-12)
        }
        return bar
    }

    /// Plain white list with the v2 cell and band headers
    static func configureList(_ table: UITableView) {
        table.backgroundColor = .white
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 52
        table.sectionHeaderTopPadding = 0
        table.sectionHeaderHeight = UITableViewAutomaticDimension
        table.estimatedSectionHeaderHeight = 40
        table.sectionFooterHeight = 0
        table.register(SettingsDetailV2Cell.self, forCellReuseIdentifier: SettingsDetailV2Cell.reuseId)
    }

    /// Input look of the new customer / product forms: 16pt text, 1pt border, 12pt corners, 52pt high
    static func styleInput(_ input: UITextField, enabled: Bool = true) {
        input.font = Utils.regularFont(size: DS.TextSize.input)
        input.textColor = enabled ? DS.Color.text : DS.Color.textMuted
        input.textAlignment = .natural
        input.backgroundColor = enabled ? .white : V2.sectionFill
        input.layer.borderWidth = 1
        input.layer.borderColor = V2.border.cgColor
        input.layer.cornerRadius = 12
        if let padded = input as? RCSimpleTextField {
            // Drops the old leading icon; the field already pads its text by 16
            padded.setLeftIcon(nil)
        } else {
            input.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
            input.leftViewMode = .always
        }
        input.rightView = nil
        input.rightViewMode = .never
    }

    /// Bold label over an input. `chevron` marks a field that opens a picker.
    static func field(_ title: String, _ input: UITextField, enabled: Bool = true, chevron: Bool = false) -> UIStackView {
        styleInput(input, enabled: enabled)
        if chevron {
            let icon = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))
            icon.tintColor = UIColor(hexString: "94A3B8")
            icon.contentMode = .center
            icon.frame = CGRect(x: 0, y: 0, width: 36, height: 20)
            input.rightView = icon
            input.rightViewMode = .always
        }
        input.accessibilityLabel = title
        // Old fields carry a fixed 50pt height; the new forms use 52
        input.constraints.filter { $0.firstAttribute == .height && $0.firstItem === input && $0.secondItem == nil }
            .forEach { $0.isActive = false }
        input.snp.makeConstraints { make in make.height.equalTo(52) }
        let stack = UIStackView(arrangedSubviews: [label(title), input])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    /// Bold label over a bordered multi-line text view
    static func textArea(_ title: String, _ textView: UITextView, height: CGFloat = 120) -> UIStackView {
        textView.font = Utils.regularFont(size: DS.TextSize.input)
        textView.textColor = DS.Color.text
        textView.backgroundColor = .white
        textView.layer.borderWidth = 1
        textView.layer.borderColor = V2.border.cgColor
        textView.layer.cornerRadius = 12
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 10, bottom: 12, right: 10)
        textView.accessibilityLabel = title
        textView.snp.makeConstraints { make in make.height.equalTo(height) }
        let stack = UIStackView(arrangedSubviews: [label(title), textView])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    /// Field label; a `*` in the title is drawn in the danger colour
    static func label(_ title: String) -> UILabel {
        let label = V2.label(title, size: DS.TextSize.body, weight: .bold, lines: 0)
        if let star = title.range(of: "*") {
            let text = NSMutableAttributedString(string: title, attributes: [
                NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.body),
                NSAttributedString.Key.foregroundColor: DS.Color.text,
            ])
            text.addAttribute(NSAttributedString.Key.foregroundColor, value: V2.danger, range: NSRange(star, in: title))
            label.attributedText = text
        }
        return label
    }
}

/// "title ……… value" row with an optional leading icon and a chevron or a check
final class SettingsDetailV2Cell: UITableViewCell {
    enum Accessory { case none, chevron, check }

    static let reuseId = "SettingsDetailV2Cell"
    private let iconView = UIImageView()
    private let titleLabel = V2.label(size: DS.TextSize.body)
    private let valueLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let accessoryIcon = UIImageView()
    private let line = V2.divider()

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        iconView.tintColor = DS.Color.textMuted
        iconView.contentMode = .center
        iconView.snp.makeConstraints { make in make.width.height.equalTo(DS.Icon.md) }
        valueLabel.textAlignment = .right
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        accessoryIcon.contentMode = .center
        accessoryIcon.snp.makeConstraints { make in make.width.height.equalTo(DS.Icon.md) }

        let spacer = UIView()
        spacer.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        let row = UIStackView(arrangedSubviews: [iconView, titleLabel, spacer, valueLabel, accessoryIcon])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg))
            make.height.greaterThanOrEqualTo(36)
        }
        contentView.addSubview(line)
        line.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(title: String, value: String? = nil, icon: UIImage? = nil, accessory: Accessory = .none, selectable: Bool = false) {
        titleLabel.text = title
        valueLabel.text = value
        valueLabel.isHidden = (value ?? "").isEmpty
        iconView.image = icon
        iconView.isHidden = icon == nil
        switch accessory {
        case .none:
            accessoryIcon.isHidden = true
        case .chevron:
            accessoryIcon.isHidden = false
            accessoryIcon.image = DS.symbol("chevron.right", DS.Icon.sm)
            accessoryIcon.tintColor = UIColor(hexString: "94A3B8")
        case .check:
            accessoryIcon.isHidden = false
            accessoryIcon.image = DS.symbol("checkmark", DS.Icon.md, weight: .semibold)
            accessoryIcon.tintColor = DS.Color.primary
        }
        let tappable = selectable || accessory != .none
        selectionStyle = tappable ? .default : .none
        var traits = tappable ? UIAccessibilityTraitButton : UIAccessibilityTraitStaticText
        if accessory == .check { traits |= UIAccessibilityTraitSelected }
        accessibilityTraits = traits
    }
}

/// User row: initials, name + status pill, email, "role · outlet", ⋯ menu
final class UserV2Cell: UITableViewCell {
    static let reuseId = "UserV2Cell"
    private let avatar = CustomersV2UI.avatar(size: 44, fontSize: DS.TextSize.body)
    private let nameLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    private let statusPill = OrderStatusPillLabel()
    private let emailLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let roleLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 2)
    let moreButton = CustomersV2UI.iconButton("ellipsis", label: "More".localized(), size: DS.Icon.md)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        statusPill.font = Utils.boldFont(size: DS.TextSize.pill)
        statusPill.contentInsets = UIEdgeInsets(top: 2, left: 8, bottom: 2, right: 8)
        statusPill.layer.cornerRadius = 10
        statusPill.clipsToBounds = true
        statusPill.setContentCompressionResistancePriority(.required, for: .horizontal)
        statusPill.setContentHuggingPriority(.required, for: .horizontal)
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        moreButton.tintColor = DS.Color.textMuted
        moreButton.showsMenuAsPrimaryAction = true

        let nameRow = UIStackView(arrangedSubviews: [nameLabel, statusPill, UIView()])
        nameRow.spacing = 8
        nameRow.alignment = .center
        let texts = UIStackView(arrangedSubviews: [nameRow, emailLabel, roleLabel])
        texts.axis = .vertical
        texts.spacing = DS.Gap.lineTight
        let row = UIStackView(arrangedSubviews: [avatar, texts, moreButton])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: 4))
        }
        let line = V2.divider()
        contentView.addSubview(line)
        line.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func bind(user: User, menu: UIMenu) {
        let name = user.fullName ?? user.email ?? "Unknown"
        avatar.text = SettingsV2Logic.initials(name)
        nameLabel.text = name
        nameLabel.textColor = user.isActive ? DS.Color.text : DS.Color.textMuted
        let pill = user.isActive ? DS.Status.done : DS.Status.late
        statusPill.text = user.isActive ? "Active".localized() : "Disabled".localized()
        statusPill.textColor = pill.text
        statusPill.backgroundColor = pill.fill
        emailLabel.text = user.email
        emailLabel.isHidden = (user.email ?? "").isEmpty
        let outlet = (user.outlet?.name).map { String(format: "Outlet: %@".localized(), $0) }
        roleLabel.text = [user.role.displayName, outlet].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
        moreButton.menu = menu
    }
}

// MARK: - Settings list pages (#1259): Thu tiền, Nâng cao, Hồ sơ & bảo mật

struct SettingsPageRow {
    var title: String
    var value: String?
    var identifier: String?
    var destructive = false
    /// #1270: looks dimmed but stays tappable (Mẫu giai đoạn, Chính sách in "Thu cọc 1 lần")
    var dimmed = false
    var action: (() -> Void)?
}

struct SettingsPageSection {
    var header: String?
    var rows: [SettingsPageRow]
}

/// A flat list page in the Settings style: optional band headers, a value row per line, a thin divider under each.
/// Subclasses give the sections; `reload()` redraws them (values change after a save).
class SettingsListPageViewController: BaseViewControler {
    private let scroll = UIScrollView()
    private let stack = UIStackView()
    private let pageTitle: String
    private var actions: [() -> Void] = []

    init(title: String) {
        pageTitle = title
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func sections() -> [SettingsPageSection] { [] }

    override func viewDidLoad() {
        super.viewDidLoad()
        DepositUI.scaffold(in: self, title: pageTitle, scroll: scroll, stack: stack)
        reload()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        reload()
    }

    func reload() {
        guard isViewLoaded else { return }
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        actions = []
        for section in sections() {
            if let header = section.header { stack.addArrangedSubview(V2.sectionHeader(header)) }
            for row in section.rows {
                let control = V2ValueRow(title: row.title, chevron: row.action != nil)
                control.valueLabel.text = row.value
                control.accessibilityIdentifier = row.identifier
                if row.destructive { control.titleLabel.textColor = V2.danger }
                if row.dimmed { control.titleLabel.alpha = 0.45; control.valueLabel.alpha = 0.45 }
                if let action = row.action {
                    control.tag = actions.count
                    actions.append(action)
                    control.addTarget(self, action: #selector(rowTapped(_:)), for: .touchUpInside)
                }
                control.snp.makeConstraints { make in make.height.equalTo(52) }
                stack.addArrangedSubview(DepositUI.withDivider(control))
            }
        }
    }

    @objc private func rowTapped(_ sender: UIControl) {
        guard sender.tag < actions.count else { return }
        actions[sender.tag]()
    }
}

enum SettingsBankCount {
    /// Active bank accounts of the own branch (the owner: the default, else the first, branch). Completion on the
    /// main queue; nil when unknown or the role has no bank accounts.
    static func load(role: Role?, ownOutletId: Int?, completion: @escaping (Int?) -> Void) {
        guard SettingsV2Logic.canManageBankAccounts(role: role) else { completion(nil); return }
        let count: (Int?) -> Void = { outletId in
            guard let outletId else { completion(nil); return }
            BankAccountService.shared.getBankAccounts(outletId: outletId) { accounts, error in
                DispatchQueue.main.async {
                    guard error == nil, let accounts else { completion(nil); return }
                    completion(accounts.filter { $0.isActive ?? true }.count)
                }
            }
        }
        if let ownOutletId {
            count(ownOutletId)
            return
        }
        OutletService.shared.getOutlets { outlets, _ in
            let active = (outlets ?? []).filter { $0.isActive ?? true }
            DispatchQueue.main.async { count((active.first { $0.isDefault == true } ?? active.first)?.id) }
        }
    }
}

/// Cài đặt › Cọc (#1270 plan B): CÁCH THU CỌC (the mode screen) and GIAI ĐOẠN & CHÍNH SÁCH (Mẫu giai đoạn, Chính sách
/// huỷ / dời ngày). Every role reads; only the shop owner edits. The two lower rows look dimmed in "Thu cọc 1 lần".
final class DepositHubViewController: SettingsListPageViewController {
    private var settings = DepositSettings(depositMode: DepositModeStore.current)
    private var loaded = false
    private var generation = 0

    private var canEdit: Bool { User.account()?.role == .merchant }

    init() { super.init(title: "settings.v2.deposit".localized()) }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadSettings()
    }

    private func loadSettings() {
        generation += 1
        let token = generation
        DepositPlanAPIService.shared.settings { [weak self] settings, _ in
            DispatchQueue.main.async {
                guard let self, token == self.generation, let settings else { return }
                self.settings = settings
                self.loaded = true
                DepositModeStore.didSave(settings)
                self.reload()
            }
        }
    }

    override func sections() -> [SettingsPageSection] {
        let staged = settings.depositMode == .staged
        let dimmed = SettingsV2Logic.depositStagesDimmed(staged: staged)
        let isSet = !settings.cancellationPolicy.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        return [
            SettingsPageSection(header: "settings.v2.deposit.group.mode".localized(), rows: [
                SettingsPageRow(title: "deposit.settings.title".localized(),
                                value: (staged ? "settings.v2.collect.staged" : "settings.v2.collect.oneTime").localized(),
                                identifier: "settings.collect.mode") { [weak self] in
                    self?.navigationController?.pushViewController(DepositSettingsViewController(), animated: true)
                },
            ]),
            SettingsPageSection(header: "settings.v2.deposit.group.stages".localized(), rows: [
                SettingsPageRow(title: "deposit.templates.row".localized(),
                                value: String(format: "deposit.templates.count".localized(), settings.choices.count),
                                identifier: "deposit.templates.row", dimmed: dimmed) { [weak self] in self?.openTemplates(focusPolicy: false) },
                SettingsPageRow(title: "deposit.policy.row".localized(),
                                value: (isSet ? "settings.v2.collect.policy.set" : "settings.v2.collect.policy.unset").localized(),
                                identifier: "deposit.policy.row", dimmed: dimmed) { [weak self] in self?.openTemplates(focusPolicy: true) },
            ]),
        ]
    }

    private func openTemplates(focusPolicy: Bool) {
        guard loaded else {
            loadSettings()
            return
        }
        let page = DepositTemplatesViewController(settings: settings, canEdit: canEdit, focusPolicy: focusPolicy)
        page.onChange = { [weak self] saved in
            self?.settings = saved
            self?.reload()
        }
        navigationController?.pushViewController(page, animated: true)
    }
}

/// Cài đặt › Nâng cao: Thông tin ứng dụng, Xoá tài khoản (no longer next to Đổi mật khẩu)
final class AdvancedSettingsViewController: SettingsListPageViewController {
    init() { super.init(title: "settings.v2.advanced".localized()) }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func sections() -> [SettingsPageSection] {
        [SettingsPageSection(header: nil, rows: [
            SettingsPageRow(title: "App Information".localized(), identifier: "settings.advanced.appInfo") { [weak self] in
                let page = AppInformationViewController()
                page.v2 = true
                self?.navigationController?.pushViewController(page, animated: true)
            },
            SettingsPageRow(title: "Delete Account".localized(), identifier: "settings.advanced.deleteAccount", destructive: true) { [weak self] in
                // Same as the current settings screen
                guard let self else { return }
                let alert = UIAlertController(title: "Delete Account".localized(),
                                              message: "Are you sure you want to delete your account? This action cannot be undone.".localized(),
                                              preferredStyle: .alert)
                alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
                alert.addAction(UIAlertAction(title: "Delete".localized(), style: .destructive))
                self.present(alert, animated: true)
            },
        ])]
    }
}

/// Cài đặt › the name card: Hồ sơ (name, email, role) and Đổi mật khẩu
final class ProfileSecurityViewController: SettingsListPageViewController {
    init() { super.init(title: "settings.v2.profile.title".localized()) }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func sections() -> [SettingsPageSection] {
        let user = User.account()
        let name = [user?.firstName, user?.lastName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
        return [
            SettingsPageSection(header: "settings.v2.profile.group".localized(), rows: [
                SettingsPageRow(title: "Staff Name".localized(), value: name.isEmpty ? "N/A".localized() : name),
                SettingsPageRow(title: "Email".localized(), value: user?.email),
                SettingsPageRow(title: "Role".localized(), value: user?.role.displayName),
            ]),
            SettingsPageSection(header: "settings.v2.profile.security".localized(), rows: [
                SettingsPageRow(title: "Change Password".localized(), identifier: "settings.profile.password") { [weak self] in self?.askPassword() },
            ]),
        ]
    }

    /// #482 (board DMK-doi-mat-khau): a bottom sheet over Cài đặt; same call and validation as before
    private func askPassword() {
        let sheet = ChangePasswordSheetViewController()
        sheet.onSubmit = { [weak self, weak sheet] current, new in
            self?.changePassword(current: current, new: new, sheet: sheet)
        }
        if let presentation = sheet.sheetPresentationController {
            presentation.detents = [.large()]
            if #available(iOS 16.0, *) {
                presentation.detents = [.custom { [weak sheet] context in
                    sheet.map { min(context.maximumDetentValue, $0.fittingHeight()) }
                }]
            }
            presentation.prefersGrabberVisible = true
            presentation.preferredCornerRadius = 24
        }
        present(sheet, animated: true)
    }

    private func changePassword(current: String, new: String, sheet: ChangePasswordSheetViewController?) {
        sheet?.setBusy(true)
        TabsV2APIService.shared.changePassword(current: current, new: new) { [weak self] error in
            DispatchQueue.main.async {
                guard let self else { return }
                sheet?.setBusy(false)
                if let error {
                    UIAlertController.errorAlert(parent: sheet ?? self, error: error)
                    return
                }
                sheet?.dismiss(animated: true)
                // The API revokes every token of the account: sign in again with the new password
                UIAlertController.alert(parent: self, title: "Change Password".localized(),
                                        message: "settings.v2.password.done".localized()) { _ in
                    AuthenticationService.shared.logout { _, _ in appDelegate.logout() }
                }
            }
        }
    }
}
