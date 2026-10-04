//
//  SettingsV2ViewController.swift
//  POS ADBD
//
//  Redesigned settings tab (#374, board Cai-dat), shown when `newSettings` is on: one grouped list that opens the
//  existing sub-screens.
//

import UIKit
import SnapKit

final class SettingsV2ViewController: BaseViewControler {
    private enum Row {
        case profile
        case item(SettingsV2Item)
        case logout
    }

    private let listView = UITableView(frame: .zero, style: .plain)
    private var groups: [SettingsV2Section] = []
    private var plan: SettingsPlan?

    private var user: User? { User.account() }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        rebuild()
        loadPlan()
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.surface
        let title = V2.label("settings.v2.title".localized(), size: 24, weight: .bold)
        view.addSubview(title)
        title.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.lg)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        listView.backgroundColor = DS.Color.surface
        listView.separatorStyle = .none
        listView.rowHeight = UITableViewAutomaticDimension
        listView.estimatedRowHeight = 52
        listView.sectionHeaderTopPadding = 0
        listView.sectionHeaderHeight = UITableViewAutomaticDimension
        listView.estimatedSectionHeaderHeight = 40
        listView.sectionFooterHeight = 0
        listView.dataSource = self
        listView.delegate = self
        listView.register(SettingsV2Cell.self, forCellReuseIdentifier: SettingsV2Cell.reuseId)
        view.addSubview(listView)
        listView.snp.makeConstraints { make in
            make.top.equalTo(title.snp.bottom).offset(DS.Spacing.md)
            make.leading.trailing.bottom.equalToSuperview()
        }
    }

    private func rebuild() {
        let role = user?.role
        let hasPlan = plan != nil && role != .admin
        groups = SettingsV2Logic.sections(role: role, permissions: user?.permissions ?? [], hasPlan: hasPlan)
        listView.reloadData()
    }

    private func loadPlan() {
        guard user?.role != .admin else { return }
        TabsV2APIService.shared.plan { [weak self] plan, _ in
            DispatchQueue.main.async {
                guard let self, let plan else { return }
                self.plan = plan
                self.rebuild()
            }
        }
    }

    // MARK: - Rows

    /// Section 0 profile, then the groups, then Đăng xuất
    private var sectionCount: Int { groups.count + 2 }

    private func rows(in section: Int) -> [Row] {
        if section == 0 { return [.profile] }
        if section == sectionCount - 1 { return [.logout] }
        return groups[section - 1].items.map { Row.item($0) }
    }

    private func title(of item: SettingsV2Item) -> String {
        switch item {
        case .storeInfo: return "Store Information".localized()
        case .receiptNote: return "settings.v2.receiptNote".localized()
        case .printer: return "settings.v2.printer".localized()
        case .users: return "settings.v2.users".localized()
        case .export: return "Export Data".localized()
        case .plan: return "settings.v2.plan".localized()
        case .language: return "settings.v2.language".localized()
        case .password: return "Change Password".localized()
        case .appInfo: return "App Information".localized()
        case .deleteAccount: return "Delete Account".localized()
        }
    }

    private func value(of item: SettingsV2Item) -> String? {
        switch item {
        case .receiptNote:
            return Utils.loadNotePrinter().replacingOccurrences(of: "\n", with: " ")
        case .printer:
            return Utils.loadBillPrinter()
        case .plan:
            return plan.map(SettingsV2Logic.planText)
        case .language:
            let code = Bundle.main.preferredLocalizations.first ?? "vi"
            let locale = Locale(identifier: code)
            return locale.localizedString(forLanguageCode: code)?.capitalized(with: locale)
        default:
            return nil
        }
    }

    // MARK: - Actions

    private func open(_ item: SettingsV2Item) {
        switch item {
        case .storeInfo:
            navigationController?.pushViewController(AccountViewController(), animated: true)
        case .receiptNote, .printer:
            navigationController?.pushViewController(PrinterConfigurationViewController(), animated: true)
        case .users:
            navigationController?.pushViewController(UserManagementViewController(), animated: true)
        case .export:
            navigationController?.pushViewController(ExportViewController(), animated: true)
        case .plan:
            break
        case .language:
            if let url = URL(string: UIApplicationOpenSettingsURLString) {
                UIApplication.shared.open(url)
            }
        case .password:
            askPassword()
        case .appInfo:
            navigationController?.pushViewController(AppInformationViewController(), animated: true)
        case .deleteAccount:
            // Same as the current settings screen
            let alert = UIAlertController(title: "Delete Account".localized(),
                                          message: "Are you sure you want to delete your account? This action cannot be undone.".localized(),
                                          preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
            alert.addAction(UIAlertAction(title: "Delete".localized(), style: .destructive))
            present(alert, animated: true)
        }
    }

    private func confirmLogout() {
        let alert = UIAlertController(title: "Logout".localized(), message: "Are you sure you want to logout?".localized(),
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Logout".localized(), style: .destructive) { _ in
            AuthenticationService.shared.logout { _, _ in appDelegate.logout() }
        })
        present(alert, animated: true)
    }

    private func askPassword(problem: SettingsV2Logic.PasswordProblem? = nil) {
        let alert = UIAlertController(title: "Change Password".localized(), message: problem.map(message(of:)),
                                      preferredStyle: .alert)
        let placeholders = ["settings.v2.password.current", "settings.v2.password.new", "settings.v2.password.confirm"]
        placeholders.forEach { key in
            alert.addTextField { field in
                field.placeholder = key.localized()
                field.isSecureTextEntry = true
                field.textContentType = key.hasSuffix("current") ? .password : .newPassword
            }
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Save".localized(), style: .default) { [weak self, weak alert] _ in
            guard let self else { return }
            let values = (alert?.textFields ?? []).map { $0.text ?? "" }
            guard values.count == 3 else { return }
            if let problem = SettingsV2Logic.validatePassword(current: values[0], new: values[1], confirm: values[2]) {
                self.askPassword(problem: problem)
                return
            }
            self.changePassword(current: values[0], new: values[1])
        })
        present(alert, animated: true)
    }

    private func message(of problem: SettingsV2Logic.PasswordProblem) -> String {
        switch problem {
        case .missingCurrent: return "settings.v2.password.missingCurrent".localized()
        case .tooShort: return "settings.v2.password.tooShort".localized()
        case .mismatch: return "settings.v2.password.mismatch".localized()
        }
    }

    private func changePassword(current: String, new: String) {
        showProgressText(text: "Loading...".localized())
        TabsV2APIService.shared.changePassword(current: current, new: new) { [weak self] error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                // The API revokes every token of the account: sign in again with the new password
                UIAlertController.alert(parent: self, title: "Change Password".localized(),
                                        message: "settings.v2.password.done".localized()) { _ in
                    AuthenticationService.shared.logout { _, _ in appDelegate.logout() }
                }
            }
        }
    }
}

// MARK: - Table

extension SettingsV2ViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        sectionCount
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        rows(in: section).count
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        if section == 0 || section == sectionCount - 1 {
            let band = UIView()
            band.backgroundColor = DS.Color.background
            band.snp.makeConstraints { make in make.height.equalTo(8) }
            return band
        }
        return V2.sectionHeader(groups[section - 1].title)
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: SettingsV2Cell.reuseId, for: indexPath) as! SettingsV2Cell
        switch rows(in: indexPath.section)[indexPath.row] {
        case .profile:
            let name = [user?.firstName, user?.lastName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
            let subtitle = [user?.role.displayName, user?.storeName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
            cell.configureProfile(name: name.isEmpty ? (user?.email ?? "—") : name, subtitle: subtitle,
                                  initials: SettingsV2Logic.initials(name))
        case .item(let item):
            cell.configure(title: title(of: item), value: value(of: item), showsChevron: item != .plan)
        case .logout:
            cell.configureLogout("Logout".localized())
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        switch rows(in: indexPath.section)[indexPath.row] {
        case .profile: break
        case .item(let item): open(item)
        case .logout: confirmLogout()
        }
    }
}

final class SettingsV2Cell: UITableViewCell {
    static let reuseId = "SettingsV2Cell"
    private let avatar = V2.label(size: 15, weight: .bold, color: .white)
    private let titleLabel = V2.label(size: 15)
    private let subtitleLabel = V2.label(size: 13, color: DS.Color.textMuted)
    private let valueLabel = V2.label(size: 14, color: DS.Color.textMuted)
    private let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))
    private let line = V2.divider()

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        avatar.backgroundColor = DS.Color.primary
        avatar.textAlignment = .center
        avatar.layer.cornerRadius = 24
        avatar.layer.masksToBounds = true
        avatar.snp.makeConstraints { make in make.width.height.equalTo(48) }
        valueLabel.textAlignment = .right
        valueLabel.lineBreakMode = .byTruncatingTail
        titleLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.contentMode = .center
        chevron.snp.makeConstraints { make in make.width.height.equalTo(DS.Icon.sm) }

        let texts = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        texts.axis = .vertical
        let row = UIStackView(arrangedSubviews: [avatar, texts, valueLabel, chevron])
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

    func configureProfile(name: String, subtitle: String, initials: String) {
        avatar.isHidden = false
        avatar.text = initials
        titleLabel.text = name
        titleLabel.font = Utils.boldFont(size: 16)
        titleLabel.textColor = DS.Color.text
        subtitleLabel.text = subtitle
        subtitleLabel.isHidden = subtitle.isEmpty
        valueLabel.isHidden = true
        chevron.isHidden = true
        line.isHidden = true
        selectionStyle = .none
        accessibilityTraits = UIAccessibilityTraitStaticText
    }

    func configure(title: String, value: String?, showsChevron: Bool) {
        avatar.isHidden = true
        titleLabel.text = title
        titleLabel.font = Utils.regularFont(size: 15)
        titleLabel.textColor = DS.Color.text
        subtitleLabel.isHidden = true
        valueLabel.text = value
        valueLabel.isHidden = (value ?? "").isEmpty
        chevron.isHidden = !showsChevron
        line.isHidden = false
        selectionStyle = showsChevron ? .default : .none
        accessibilityTraits = showsChevron ? UIAccessibilityTraitButton : UIAccessibilityTraitStaticText
    }

    func configureLogout(_ title: String) {
        avatar.isHidden = true
        titleLabel.text = title
        titleLabel.font = Utils.boldFont(size: 15)
        titleLabel.textColor = V2.danger
        subtitleLabel.isHidden = true
        valueLabel.isHidden = true
        chevron.isHidden = true
        line.isHidden = true
        selectionStyle = .default
        accessibilityTraits = UIAccessibilityTraitButton
    }
}
