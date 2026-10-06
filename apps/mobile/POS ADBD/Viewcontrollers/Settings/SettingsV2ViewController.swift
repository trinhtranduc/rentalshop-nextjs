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
        /// #518 "Cho tạo đơn khi trùng lịch" (board CD-trung-lich), shop owner only
        case overlapSwitch
        case logout
    }

    private let listView = UITableView(frame: .zero, style: .plain)
    private var groups: [SettingsV2Section] = []
    private var plan: SettingsPlan?
    /// Totals next to Khách hàng / Người dùng (#388)
    private var counts: [SettingsV2Item: Int] = [:]

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
        loadCounts()
        refreshOverlapSetting()
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.surface
        let title = V2.label("settings.v2.title".localized(), size: DS.TextSize.title, weight: .bold)
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
        listView.register(SettingsV2SwitchCell.self, forCellReuseIdentifier: SettingsV2SwitchCell.reuseId)
        view.addSubview(listView)
        listView.snp.makeConstraints { make in
            make.top.equalTo(title.snp.bottom).offset(DS.Spacing.md)
            make.leading.trailing.bottom.equalToSuperview()
        }
    }

    private func rebuild() {
        let role = user?.role
        let hasPlan = plan != nil && role != .admin
        groups = SettingsV2Logic.sections(role: role, permissions: user?.permissions ?? [], hasPlan: hasPlan,
                                          showsCustomers: FeatureFlags.shared.isOn(.newCustomers))
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

    /// Only for the rows this role sees; a failed call leaves the row without a value
    private func loadCounts() {
        for item in groups.flatMap({ $0.items }) {
            guard let path = SettingsListTotal.path(for: item) else { continue }
            TabsV2APIService.shared.performGET(path: path, parameters: ["limit": 1, "page": 1], responseType: SettingsListTotal.self,
                                     context: "SettingsV2.count") { [weak self] response, _ in
                DispatchQueue.main.async {
                    guard let self, let total = response?.total, self.counts[item] != total else { return }
                    self.counts[item] = total
                    self.listView.reloadData()
                }
            }
        }
    }

    // MARK: - Order overlap setting (#518)

    private var showsOverlapSetting: Bool { ScheduleConflictLogic.canEditSetting(role: user?.role) }

    /// The shop's current value, so the switch matches what was saved on another device
    private func refreshOverlapSetting() {
        guard showsOverlapSetting else { return }
        OverlapSetting.refresh(force: true) { [weak self] _ in
            guard let self, self.showsOverlapSetting, !OverlapSetting.saving else { return }
            self.listView.reloadData()
        }
    }

    /// Optimistic: the cached value and the switch change at once; a failed save puts both back and says why
    private func setOverlapAllowed(_ allowed: Bool, toggle: UISwitch) {
        guard !OverlapSetting.saving else {
            toggle.setOn(!allowed, animated: true)
            return
        }
        let previous = OverlapSetting.isAllowed
        OverlapSetting.saving = true
        OverlapSetting.store(allowed)
        toggle.isEnabled = false
        TabsV2APIService.shared.setAllowOverlappingOrders(allowed) { [weak self] saved, error in
            DispatchQueue.main.async {
                OverlapSetting.saving = false
                if let saved, error == nil {
                    OverlapSetting.store(saved)
                    self?.listView.reloadData()
                    return
                }
                OverlapSetting.store(previous)
                guard let self else { return }
                self.listView.reloadData()
                let failure = error ?? NSError.errorWithOwnMessage(message: "settings.v2.overlap.failed".localized(), domain: "RC")
                UIAlertController.errorAlert(parent: self, error: failure)
            }
        }
    }

    // MARK: - Rows

    private enum Section {
        case profile
        case group(Int)
        case orders
        case logout
    }

    /// Profile, the groups, ĐƠN HÀNG (shop owner), then Đăng xuất
    private var sections: [Section] {
        var list: [Section] = [.profile]
        list += groups.indices.map { Section.group($0) }
        if showsOverlapSetting { list.append(.orders) }
        list.append(.logout)
        return list
    }

    private var sectionCount: Int { sections.count }

    private func rows(in section: Int) -> [Row] {
        let all = sections
        guard section < all.count else { return [] }
        switch all[section] {
        case .profile: return [.profile]
        case .group(let index): return groups[index].items.map { Row.item($0) }
        case .orders: return [.overlapSwitch]
        case .logout: return [.logout]
        }
    }

    private func title(of item: SettingsV2Item) -> String {
        switch item {
        case .storeInfo: return "Store Information".localized()
        case .receiptNote: return "settings.v2.receiptNote".localized()
        case .printer: return "settings.v2.printer".localized()
        case .customers: return "customers.v2.title".localized()
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
        case .customers, .users:
            return counts[item].map(String.init)
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
        // #459: detail pages in the new style
        case .storeInfo:
            let page = AccountViewController()
            page.v2 = true
            navigationController?.pushViewController(page, animated: true)
        case .receiptNote, .printer:
            let page = PrinterConfigurationViewController()
            page.v2 = true
            navigationController?.pushViewController(page, animated: true)
        case .customers:
            let list = CustomersV2ListViewController(mode: .browse)
            list.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(list, animated: true)
        case .users:
            let page = UserManagementViewController()
            page.v2 = true
            navigationController?.pushViewController(page, animated: true)
        case .export:
            let page = ExportViewController()
            page.v2 = true
            navigationController?.pushViewController(page, animated: true)
        case .plan:
            break
        case .language:
            if let url = URL(string: UIApplicationOpenSettingsURLString) {
                UIApplication.shared.open(url)
            }
        case .password:
            askPassword()
        case .appInfo:
            let page = AppInformationViewController()
            page.v2 = true
            navigationController?.pushViewController(page, animated: true)
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

// MARK: - Table

extension SettingsV2ViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        sectionCount
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        rows(in: section).count
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        switch sections[section] {
        case .group(let index):
            return V2.sectionHeader(groups[index].title)
        case .orders:
            return V2.sectionHeader("settings.v2.group.orders".localized())
        case .profile, .logout:
            let band = UIView()
            band.backgroundColor = DS.Color.background
            band.snp.makeConstraints { make in make.height.equalTo(8) }
            return band
        }
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let row = rows(in: indexPath.section)[indexPath.row]
        if case .overlapSwitch = row {
            let cell = tableView.dequeueReusableCell(withIdentifier: SettingsV2SwitchCell.reuseId, for: indexPath) as! SettingsV2SwitchCell
            cell.configure(title: "settings.v2.overlap.title".localized(), subtitle: "settings.v2.overlap.subtitle".localized(),
                           isOn: OverlapSetting.isAllowed, isEnabled: !OverlapSetting.saving)
            cell.onChange = { [weak self] isOn, toggle in self?.setOverlapAllowed(isOn, toggle: toggle) }
            return cell
        }
        let cell = tableView.dequeueReusableCell(withIdentifier: SettingsV2Cell.reuseId, for: indexPath) as! SettingsV2Cell
        switch row {
        case .profile:
            let name = [user?.firstName, user?.lastName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
            let subtitle = [user?.role.displayName, user?.storeName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
            cell.configureProfile(name: name.isEmpty ? (user?.email ?? "—") : name, subtitle: subtitle,
                                  initials: SettingsV2Logic.initials(name))
        case .item(let item):
            cell.configure(title: title(of: item), value: value(of: item), showsChevron: item != .plan)
        case .logout:
            cell.configureLogout("Logout".localized())
        case .overlapSwitch:
            break
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        switch rows(in: indexPath.section)[indexPath.row] {
        case .profile: break
        case .item(let item): open(item)
        case .overlapSwitch: break
        case .logout: confirmLogout()
        }
    }
}

/// Title, grey explanation and a switch that saves at once (board CD-trung-lich)
final class SettingsV2SwitchCell: UITableViewCell {
    static let reuseId = "SettingsV2SwitchCell"
    var onChange: ((Bool, UISwitch) -> Void)?
    private let titleLabel = V2.label(size: DS.TextSize.body, lines: 0)
    private let subtitleLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let toggle = UISwitch()

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        toggle.onTintColor = UIColor(hexString: "16A34A")
        toggle.setContentHuggingPriority(.required, for: .horizontal)
        toggle.setContentCompressionResistancePriority(.required, for: .horizontal)
        toggle.addTarget(self, action: #selector(changed), for: .valueChanged)
        let texts = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        texts.axis = .vertical
        texts.spacing = 2
        let row = UIStackView(arrangedSubviews: [texts, toggle])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg))
            make.height.greaterThanOrEqualTo(48)
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

    func configure(title: String, subtitle: String, isOn: Bool, isEnabled: Bool) {
        titleLabel.text = title
        subtitleLabel.text = subtitle
        toggle.isOn = isOn
        toggle.isEnabled = isEnabled
        toggle.accessibilityLabel = title
        toggle.accessibilityHint = subtitle
    }

    @objc private func changed() {
        onChange?(toggle.isOn, toggle)
    }
}

final class SettingsV2Cell: UITableViewCell {
    static let reuseId = "SettingsV2Cell"
    private let avatar = V2.label(size: DS.TextSize.body, weight: .bold, color: .white)
    private let titleLabel = V2.label(size: DS.TextSize.body)
    private let subtitleLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let valueLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted)
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
        titleLabel.font = Utils.boldFont(size: DS.TextSize.name)
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
        titleLabel.font = Utils.regularFont(size: DS.TextSize.body)
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
        titleLabel.font = Utils.boldFont(size: DS.TextSize.body)
        titleLabel.textColor = V2.danger
        subtitleLabel.isHidden = true
        valueLabel.isHidden = true
        chevron.isHidden = true
        line.isHidden = true
        selectionStyle = .default
        accessibilityTraits = UIAccessibilityTraitButton
    }
}

// MARK: - Đổi mật khẩu (#482, board DMK-doi-mat-khau)

/// Change password as a bottom sheet: three secure fields with a lock and a show/hide eye, the length hint under the
/// new password, the error under the field at fault, "Đổi mật khẩu". Validation is `SettingsV2Logic.validatePassword`.
final class ChangePasswordSheetViewController: UIViewController, UITextFieldDelegate {
    var onSubmit: ((String, String) -> Void)?

    private let currentField = UITextField()
    private let newField = UITextField()
    private let confirmField = UITextField()
    private let currentMessage = V2.label(size: DS.TextSize.secondary, lines: 0)
    private let newMessage = V2.label(size: DS.TextSize.secondary, lines: 0)
    private let confirmMessage = V2.label(size: DS.TextSize.secondary, lines: 0)
    private let submit = UIButton(type: .system)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let scroll = UIScrollView()
    private var problem: SettingsV2Logic.PasswordProblem?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let title = V2.label("Change Password".localized(), size: 20, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", 16, weight: .bold), for: .normal)
        close.tintColor = DS.Color.textMuted
        close.backgroundColor = UIColor(hexString: "F1F5F9")
        close.layer.cornerRadius = 18
        close.accessibilityLabel = "settings.v2.password.close".localized()
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        close.snp.makeConstraints { make in make.size.equalTo(36) }
        let header = UIStackView(arrangedSubviews: [title, close])
        header.alignment = .center

        let content = UIStackView(arrangedSubviews: [
            header,
            field(currentField, title: "settings.v2.password.current".localized(), message: currentMessage, newPassword: false),
            field(newField, title: "settings.v2.password.new".localized(), message: newMessage, newPassword: true),
            field(confirmField, title: "settings.v2.password.confirm".localized(), message: confirmMessage, newPassword: true),
        ])
        content.axis = .vertical
        content.spacing = 14

        submit.setTitle("settings.v2.password.submit".localized(), for: .normal)
        submit.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        submit.setTitleColor(.white, for: .normal)
        submit.backgroundColor = DS.Color.primary
        submit.layer.cornerRadius = 14
        submit.addTarget(self, action: #selector(submitTapped), for: .touchUpInside)
        submit.snp.makeConstraints { make in make.height.equalTo(54) }
        spinner.color = .white
        spinner.hidesWhenStopped = true
        submit.addSubview(spinner)
        spinner.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview().offset(-18)
        }
        content.addArrangedSubview(submit)
        content.setCustomSpacing(18, after: content.arrangedSubviews[content.arrangedSubviews.count - 2])

        scroll.keyboardDismissMode = .interactive
        scroll.alwaysBounceVertical = true
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in make.edges.equalTo(view.safeAreaLayoutGuide) }
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(24)
            make.leading.trailing.equalTo(view).inset(20)
            make.bottom.equalToSuperview().offset(-20)
        }
        render()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        currentField.becomeFirstResponder()
    }

    /// Height of the form, so the sheet is only as tall as its content (board DMK-doi-mat-khau)
    func fittingHeight() -> CGFloat {
        loadViewIfNeeded()
        guard let content = scroll.subviews.first(where: { $0 is UIStackView }) else { return 520 }
        let width = (view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width) - 40
        let size = content.systemLayoutSizeFitting(CGSize(width: width, height: 0),
                                                   withHorizontalFittingPriority: .required,
                                                   verticalFittingPriority: .fittingSizeLevel)
        return 24 + size.height + 20
    }

    private func field(_ textField: UITextField, title: String, message: UILabel, newPassword: Bool) -> UIView {
        let label = V2.label(title, size: DS.TextSize.body, weight: .bold)
        textField.isSecureTextEntry = true
        textField.textContentType = newPassword ? .newPassword : .password
        textField.font = Utils.regularFont(size: DS.TextSize.input)
        textField.textColor = DS.Color.text
        textField.placeholder = "••••••••"
        textField.layer.cornerRadius = 12
        textField.layer.borderWidth = 1
        textField.delegate = self
        textField.returnKeyType = textField === confirmField ? .done : .next
        textField.accessibilityLabel = title
        textField.addTarget(self, action: #selector(edited(_:)), for: .editingChanged)

        // iOS 15+ sizes a side view to its intrinsic size: wrap the icons so the frame keeps their inset
        let lock = UIImageView(image: DS.symbol("lock", DS.Icon.md))
        lock.contentMode = .center
        lock.frame = CGRect(x: 14, y: 0, width: 22, height: 52)
        let lockBox = UIView(frame: CGRect(x: 0, y: 0, width: 44, height: 52))
        lockBox.addSubview(lock)
        textField.leftView = lockBox
        textField.leftViewMode = .always

        let eye = UIButton(type: .system)
        eye.setImage(DS.symbol("eye", DS.Icon.md), for: .normal)
        eye.tintColor = DS.Color.textMuted
        eye.accessibilityLabel = "settings.v2.password.show".localized()
        eye.frame = CGRect(x: 0, y: 0, width: 48, height: 52)
        eye.addTarget(self, action: #selector(toggleVisible(_:)), for: .touchUpInside)
        let eyeBox = UIView(frame: CGRect(x: 0, y: 0, width: 52, height: 52))
        eyeBox.addSubview(eye)
        textField.rightView = eyeBox
        textField.rightViewMode = .always
        textField.snp.makeConstraints { make in make.height.equalTo(52) }

        let stack = UIStackView(arrangedSubviews: [label, textField, message])
        stack.axis = .vertical
        stack.spacing = 6
        return stack
    }

    private func render() {
        defer {
            if #available(iOS 16.0, *) { sheetPresentationController?.animateChanges { sheetPresentationController?.invalidateDetents() } }
        }
        let pairs: [(UITextField, UILabel, SettingsV2Logic.PasswordProblem, String?)] = [
            (currentField, currentMessage, .missingCurrent, nil),
            (newField, newMessage, .tooShort, String(format: "settings.v2.password.hint".localized(), SettingsV2Logic.minPasswordLength)),
            (confirmField, confirmMessage, .mismatch, nil),
        ]
        let danger = UIColor(hexString: "B91C1C")
        for (field, message, fault, hint) in pairs {
            let failed = problem == fault
            field.layer.borderWidth = failed ? 1.5 : 1
            field.layer.borderColor = (failed ? danger : UIColor(hexString: "CBD5E1")).cgColor
            (field.leftView?.subviews.first as? UIImageView)?.tintColor = failed ? danger : UIColor(hexString: "64748B")
            if failed {
                message.text = text(of: fault)
                message.textColor = danger
                message.font = Utils.mediumFont(size: DS.TextSize.secondary)
                message.isHidden = false
            } else {
                message.text = hint
                message.textColor = DS.Color.textMuted
                message.font = Utils.regularFont(size: DS.TextSize.secondary)
                message.isHidden = hint == nil
            }
        }
    }

    private func text(of problem: SettingsV2Logic.PasswordProblem) -> String {
        switch problem {
        case .missingCurrent: return "settings.v2.password.missingCurrent".localized()
        case .tooShort: return "settings.v2.password.tooShort".localized()
        case .mismatch: return "settings.v2.password.mismatch".localized()
        }
    }

    func setBusy(_ busy: Bool) {
        submit.isEnabled = !busy
        busy ? spinner.startAnimating() : spinner.stopAnimating()
        isModalInPresentation = busy
    }

    @objc private func edited(_ sender: UITextField) {
        guard problem != nil else { return }
        problem = nil
        render()
    }

    @objc private func toggleVisible(_ sender: UIButton) {
        guard let field = [currentField, newField, confirmField].first(where: { $0.rightView === sender.superview }) else { return }
        field.isSecureTextEntry.toggle()
        sender.setImage(DS.symbol(field.isSecureTextEntry ? "eye" : "eye.slash", DS.Icon.md), for: .normal)
        sender.accessibilityLabel = (field.isSecureTextEntry ? "settings.v2.password.show" : "settings.v2.password.hide").localized()
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    @objc private func submitTapped() {
        let current = currentField.text ?? ""
        let new = newField.text ?? ""
        problem = SettingsV2Logic.validatePassword(current: current, new: new, confirm: confirmField.text ?? "")
        render()
        guard problem == nil else { return }
        view.endEditing(true)
        onSubmit?(current, new)
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        switch textField {
        case currentField: newField.becomeFirstResponder()
        case newField: confirmField.becomeFirstResponder()
        default: submitTapped()
        }
        return true
    }
}
