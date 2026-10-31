//
//  SettingsV2ViewController.swift
//  POS ADBD
//
//  Redesigned settings tab (#374, board Cai-dat), shown when `newSettings` is on: one grouped list that opens the
//  existing sub-screens.
//

import UIKit
import SnapKit
import IQKeyboardManagerSwift
import DraftOrderActivity

final class SettingsV2ViewController: BaseViewControler {
    private enum Row {
        /// #927 card L, first row when the shop has the attendance module and picked this person
        case attendance
        case profile
        case item(SettingsV2Item)
        /// #518 "Cho phép đặt trùng lịch" (board CD-trung-lich), shop owner only; #1259: last line of CỬA HÀNG
        case overlapSwitch
        /// #1375 "Ẩn tên khách trên widget", right under the Widget row
        case widgetHideNames
        case logout
    }

    private let listView = UITableView(frame: .zero, style: .plain)
    private let bellButton = UIButton(type: .system)
    private let bellBadge: InsetLabel = {
        let label = InsetLabel()
        label.insets = UIEdgeInsets(top: 1, left: 6, bottom: 1, right: 6)
        label.font = Utils.boldFont(size: DS.TextSize.pill)
        label.textColor = .white
        label.textAlignment = .center
        label.backgroundColor = UIColor(hexString: "EF4444")
        label.layer.cornerRadius = 9
        label.layer.masksToBounds = true
        label.isUserInteractionEnabled = false
        return label
    }()
    private var groups: [SettingsV2Section] = []
    private var plan: SettingsPlan?
    /// #1259: bank accounts of the default branch, for the second text of "Thu tiền" (nil until known)
    private var bankCount: Int?
    /// Totals next to Khách hàng / Người dùng (#388)
    private(set) var counts: [SettingsV2Item: Int] = [:]
    /// #674: plan, counts and the overlap switch are fetched on the first appear, then at most every 10 minutes
    private var lastFetchedAt: Date?
    /// #937: unread count on the "Thông báo" row (moved from the Home bell); follows `.inboxUnreadCountDidChange`
    private var unreadCount = 0
    private var unreadLoadedAt: Date?
    /// #927 card L: `/me`, today's pairs (done state), the last punch's day hours, its result, the ticking timer
    private var attendanceMe: AttendanceMe?
    private var attendancePairs: [AttendancePair] = []
    private var attendanceHours: Double?
    private var attendanceSuccess: String?
    private var attendanceError: AttendanceErrorCopy?
    private let punchFlow = AttendancePunchFlow()
    private var attendanceTimer: Timer?

    private var user: User? { User.account() }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        NotificationCenter.default.addObserver(self, selector: #selector(inboxCountChanged(_:)), name: .inboxUnreadCountDidChange, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(shopBranchCountChanged(_:)), name: .shopBranchCountDidChange, object: nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        rebuild()
        refreshAttendance()
        startAttendanceTimer()
        // #674/#937: the server is asked on first show and when 10 min old; the inbox signal keeps it current
        if RefreshPolicy.shouldReload(dirty: false, lastLoadedAt: unreadLoadedAt, now: Date(), ttl: RefreshPolicy.summaryTTL) {
            refreshUnreadCount()
        }
        guard RefreshPolicy.shouldReload(dirty: false, lastLoadedAt: lastFetchedAt, now: Date(), ttl: RefreshPolicy.summaryTTL) else { return }
        lastFetchedAt = Date()
        loadPlan()
        loadCounts()
        refreshOverlapSetting()
        refreshCurrency()
        loadBankCount()
        // #1199: a login payload without `depositMode` (older cached login) is fetched here, not guessed
        DepositModeStore.refresh { [weak self] _ in self?.listView.reloadData() }
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        attendanceTimer?.invalidate()
        attendanceTimer = nil
        // Leaving Cài đặt (not the scanner on top): the last result goes
        if presentedViewController == nil {
            attendanceSuccess = nil
            attendanceError = nil
        }
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.surface
        let title = V2.label("settings.v2.title".localized(), size: DS.TextSize.title, weight: .bold)
        view.addSubview(title)
        // #1259: the inbox is the bell at the top right (it was the "Thông báo" row), with the unread count
        bellButton.setImage(DS.symbol("bell", DS.Icon.lg), for: .normal)
        bellButton.tintColor = DS.Color.text
        bellButton.accessibilityLabel = "Notifications".localized()
        bellButton.accessibilityIdentifier = "settings.notifications"
        bellButton.addTarget(self, action: #selector(openInbox), for: .touchUpInside)
        view.addSubview(bellButton)
        bellBadge.isHidden = true
        view.addSubview(bellBadge)
        bellButton.snp.makeConstraints { make in
            make.centerY.equalTo(title)
            make.trailing.equalTo(view.readableColumn()).inset(DS.Spacing.md)
            make.width.height.equalTo(DS.touchTarget)
        }
        bellBadge.snp.makeConstraints { make in
            make.top.equalTo(bellButton).offset(4)
            make.leading.equalTo(bellButton.snp.centerX).offset(2)
            make.height.equalTo(18)
            make.width.greaterThanOrEqualTo(18)
        }
        title.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.lg)
            make.leading.equalTo(view.readableColumn()).inset(DS.Spacing.lg) // #973 centered column on iPad
            make.trailing.equalTo(bellButton.snp.leading)
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
        listView.register(SettingsAttendanceCardCell.self, forCellReuseIdentifier: SettingsAttendanceCardCell.reuseId)
        view.addSubview(listView)
        listView.snp.makeConstraints { make in
            make.top.equalTo(title.snp.bottom).offset(DS.Spacing.md)
            make.leading.trailing.equalTo(view.readableColumn())
            make.bottom.equalToSuperview()
        }
    }

    private func rebuild() {
        let role = user?.role
        let hasPlan = plan != nil && role != .admin
        groups = SettingsV2Logic.sections(role: role, permissions: user?.permissions ?? [], hasPlan: hasPlan,
                                          showsCustomers: FeatureFlags.shared.isOn(.newCustomers),
                                          supportsWidget: TodayWidgetBridge.isSupported)
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
            if item == .storeInfo && user?.role != .merchant { continue } // only the owner's row shows a count (#1313)
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

    /// #1331: the shop screen read its branch list inside the 10 minutes; the row shows the same number
    @objc private func shopBranchCountChanged(_ note: Notification) {
        guard let count = note.userInfo?["count"] as? Int, counts[.storeInfo] != count else { return }
        counts[.storeInfo] = count
        listView.reloadData()
    }

    // MARK: - Thông báo (#937)

    private func refreshUnreadCount() {
        guard User.account() != nil else { return }
        NotificationService.shared.getUnreadCount { [weak self] count, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                if count != nil { self.unreadLoadedAt = Date() }
                self.applyUnread(count ?? self.unreadCount)
            }
        }
    }

    @objc private func inboxCountChanged(_ note: Notification) {
        if let count = note.userInfo?["count"] as? Int {
            unreadLoadedAt = Date()
            applyUnread(count)
        } else {
            refreshUnreadCount()
        }
    }

    private func applyUnread(_ count: Int) {
        guard count != unreadCount else { return }
        unreadCount = count
        guard isViewLoaded else { return }
        let badge = SettingsV2Logic.unreadBadge(count)
        bellBadge.text = badge
        bellBadge.isHidden = badge == nil
        bellButton.accessibilityValue = badge
    }

    @objc private func openInbox() {
        let inbox = NotificationsViewController()
        inbox.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(inbox, animated: true)
    }

    // MARK: - Chấm công (#909, card L #927)

    private var showsAttendance: Bool { AttendanceCardLogic.shows(merchant: user?.merchant, me: attendanceMe) }

    private var attendanceOutletName: String? { attendanceMe?.outletName ?? user?.outlet?.name }

    private var attendanceModel: AttendanceCardModel {
        AttendanceCardLogic.model(me: attendanceMe, todayPairs: attendancePairs, outletName: attendanceOutletName,
                                  fallbackHours: attendanceHours)
    }

    /// `merchant.modules` from the profile (a module turned on after sign-in), then `/me` (today's shifts, status,
    /// `required`), then today's pairs when the day is done
    private func refreshAttendance() {
        AttendanceService.refreshModules { [weak self] isOn in
            guard let self else { return }
            guard isOn else {
                if self.attendanceMe != nil {
                    self.attendanceMe = nil
                    self.listView.reloadData()
                }
                return
            }
            AttendanceService.shared.me { [weak self] result in
                guard let self else { return }
                switch result {
                case .success(let me):
                    self.attendanceMe = me
                case .failure(let failure):
                    // Module turned off meanwhile; any other failure keeps what is on screen
                    if failure.code == "MODULE_NOT_ENABLED" { self.attendanceMe = nil }
                }
                self.listView.reloadData()
                if AttendanceLogic.state(self.attendanceMe) == .done { self.loadTodayPairs() }
            }
        }
    }

    /// Today's IN / OUT pairs from the own month (hours of the done state)
    private func loadTodayPairs() {
        guard let user, showsAttendance else { return }
        let now = Date()
        let outletId = user.outletId ?? CurrentOutlet.shared.merchantFilterId
        AttendanceService.shared.month(userId: user.id, outletId: outletId, month: AttendanceLogic.monthKey(now)) { [weak self] result in
            guard let self, case .success(let month) = result else { return }
            self.attendancePairs = AttendanceCardLogic.todayPairs(month.rows, now: now)
            self.listView.reloadData()
        }
    }

    /// The big number follows the clock (time now, or time on shift); only the label changes
    private func startAttendanceTimer() {
        attendanceTimer?.invalidate()
        let timer = Timer(timeInterval: 1, repeats: true) { [weak self] _ in self?.tickAttendance() }
        RunLoop.main.add(timer, forMode: .commonModes)
        attendanceTimer = timer
    }

    private func tickAttendance() {
        guard showsAttendance, case .attendance? = sections.first,
              let cell = listView.cellForRow(at: IndexPath(row: 0, section: 0)) as? SettingsAttendanceCardCell else { return }
        cell.setBig(attendanceModel.big)
    }

    private func punch() {
        attendanceSuccess = nil
        attendanceError = nil
        listView.reloadData()
        punchFlow.start(from: self, onCall: { [weak self] in
            self?.listView.reloadData()
        }, completion: { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let punch):
                self.applyPunch(punch)
            case .failure(let failure):
                self.attendanceError = AttendanceLogic.errorCopy(failure, outletName: self.attendanceOutletName)
            }
            self.listView.reloadData()
            if case .success = result { self.refreshAttendance() }
        })
    }

    /// The card switches at once; `/me` and the pairs then come from the server
    private func applyPunch(_ punch: AttendancePunchResult) {
        attendanceSuccess = AttendanceCardLogic.successLine(punch)
        guard var me = attendanceMe else { return }
        if punch.isOut {
            me.openRecord = nil
            me.todayStatus = "DONE"
            me.lastAction = "OUT"
            me.lastActionAt = punch.record?.checkOutAt ?? Date()
            attendanceHours = punch.todayHours
        } else {
            var record = punch.record ?? AttendanceRecord(checkInAt: Date(), checkOutAt: nil)
            record.status = "OPEN"
            if record.checkInAt == nil { record.checkInAt = Date() }
            me.openRecord = record
            me.todayStatus = "IN_SHIFT"
            me.lastAction = "IN"
            me.lastActionAt = record.checkInAt
        }
        attendanceMe = me
    }

    // MARK: - Order overlap setting (#518)

    private var showsOverlapSetting: Bool { ScheduleConflictLogic.canEditSetting(role: user?.role) }

    /// The shop's current value, so the switch matches what was saved on another device
    private func refreshOverlapSetting() {
        guard showsOverlapSetting else { return }
        OverlapSetting.refresh { [weak self] _ in
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

    // MARK: - Shop currency (#1145)

    private func refreshCurrency() {
        // #1307: every shop role reads it; only the row and the PUT are owner-only
        ShopCurrencyStore.refresh { [weak self] _ in
            guard let self, !ShopCurrencyStore.saving else { return }
            self.listView.reloadData()
        }
    }

    // MARK: - Bank accounts count (#1270)

    /// Bank accounts of the own branch (owner: the default branch), shown next to the deposit mode. A failed call
    /// leaves the count out.
    private func loadBankCount() {
        SettingsBankCount.load(role: user?.role, ownOutletId: user?.outletId) { [weak self] count in
            guard let self, let count, self.bankCount != count else { return }
            self.bankCount = count
            self.listView.reloadData()
        }
    }

    // MARK: - Rows

    private enum Section {
        case attendance
        case profile
        case group(Int)
        case logout
    }

    /// Profile, the groups (Thông báo, CỬA HÀNG with the overlap switch for the owner, QUẢN LÝ, TÀI KHOẢN), then Đăng xuất
    private var sections: [Section] {
        var list: [Section] = showsAttendance ? [.attendance, .profile] : [.profile]
        list += groups.indices.map { Section.group($0) }
        list.append(.logout)
        return list
    }

    private var sectionCount: Int { sections.count }

    private func rows(in section: Int) -> [Row] {
        let all = sections
        guard section < all.count else { return [] }
        switch all[section] {
        case .attendance: return [.attendance]
        case .profile: return [.profile]
        case .group(let index):
            let rows = groups[index].items.flatMap { item -> [Row] in item == .widget ? [.item(item), .widgetHideNames] : [.item(item)] }
            return groups[index].group == .store && showsOverlapSetting ? rows + [.overlapSwitch] : rows
        case .logout: return [.logout]
        }
    }

    private func title(of item: SettingsV2Item) -> String {
        switch item {
        case .storeInfo: return ShopInfoLogic.rowTitleKey(role: user?.role).localized()
        case .bankAccounts: return "Bank Accounts".localized()
        case .deposit: return "settings.v2.deposit".localized()
        case .printing: return "settings.v2.printing".localized()
        case .categories: return "settings.v2.categories".localized()
        case .customers: return "customers.v2.title".localized()
        case .users: return "settings.v2.users".localized()
        case .export: return "Export Data".localized()
        case .plan: return "settings.v2.plan".localized()
        case .language: return "settings.v2.language".localized()
        case .advanced: return "settings.v2.advanced".localized()
        case .widget: return "widget.settings.row".localized()
        }
    }

    private func value(of item: SettingsV2Item) -> String? {
        switch item {
        case .storeInfo:
            return ShopInfoLogic.rowValue(role: user?.role, branchName: user?.outlet?.name, branchCount: counts[.storeInfo],
                                          countText: { String(format: "shopinfo.branchCount".localized(), $0) },
                                          readOnlyText: "shopinfo.viewOnlyValue".localized())
        case .bankAccounts:
            return bankCount.map { String(format: "settings.v2.collect.accounts".localized(), $0) }
        case .deposit:
            return (DepositModeStore.current == .staged ? "settings.v2.collect.staged" : "settings.v2.collect.oneTime").localized()
        case .printing:
            let paper = PaperSize(rawValue: UserDefaults.standard.integer(forKey: "PrinterPaperSize"))?.rawValue ?? PaperSize.k80.rawValue
            return SettingsV2Logic.printingValue(hasPrinter: !Utils.loadBillPrinter().isEmpty, paperMillimetres: paper,
                                                 none: "settings.v2.printing.noPrinter".localized())
        case .customers, .users:
            return counts[item].map(String.init)
        case .plan:
            return plan.map(SettingsV2Logic.planText)
        case .language:
            let code = Bundle.main.preferredLocalizations.first ?? "vi"
            let locale = Locale(identifier: code)
            return locale.localizedString(forLanguageCode: code)?.capitalized(with: locale)
        case .advanced:
            return "settings.v2.advanced.value".localized()
        default:
            return nil
        }
    }

    // MARK: - Actions

    private func open(_ item: SettingsV2Item) {
        switch item {
        // #459: detail pages in the new style
        // #1313: the owner gets the shop + branches screen, the branch manager the own branch form, staff the same read-only
        case .storeInfo:
            navigationController?.pushViewController(ShopInfoRouter.makeScreen(), animated: true)
        case .bankAccounts:
            let page = BankAccountViewController()
            page.v2 = true
            navigationController?.pushViewController(page, animated: true)
        case .deposit:
            navigationController?.pushViewController(DepositHubViewController(), animated: true)
        case .printing:
            let page = PrinterConfigurationViewController()
            page.v2 = true
            navigationController?.pushViewController(page, animated: true)
        case .categories:
            let page = CategoryManageViewController()
            page.hidesBottomBarWhenPushed = true
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
        case .advanced:
            navigationController?.pushViewController(AdvancedSettingsViewController(), animated: true)
        case .widget:
            present(WidgetGuideViewController(offersNeverAsk: false), animated: true)
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
        case .attendance:
            return nil
        case .profile, .logout:
            return thinBand()
        }
    }

    private func thinBand() -> UIView {
        let band = UIView()
        band.backgroundColor = DS.Color.background
        band.snp.makeConstraints { make in make.height.equalTo(8) }
        return band
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let row = rows(in: indexPath.section)[indexPath.row]
        if case .attendance = row {
            let cell = tableView.dequeueReusableCell(withIdentifier: SettingsAttendanceCardCell.reuseId, for: indexPath) as! SettingsAttendanceCardCell
            cell.configure(attendanceModel, success: attendanceSuccess, error: attendanceError, busy: punchFlow.busy)
            cell.onPunch = { [weak self] in self?.punch() }
            cell.onMine = { [weak self] in
                self?.navigationController?.pushViewController(MyShiftsViewController(), animated: true)
            }
            return cell
        }
        if case .overlapSwitch = row {
            let cell = tableView.dequeueReusableCell(withIdentifier: SettingsV2SwitchCell.reuseId, for: indexPath) as! SettingsV2SwitchCell
            cell.configure(title: "settings.v2.overlap.title".localized(), subtitle: "settings.v2.overlap.subtitle".localized(),
                           isOn: OverlapSetting.isAllowed, isEnabled: !OverlapSetting.saving)
            cell.onChange = { [weak self] isOn, toggle in self?.setOverlapAllowed(isOn, toggle: toggle) }
            return cell
        }
        if case .widgetHideNames = row {
            let cell = tableView.dequeueReusableCell(withIdentifier: SettingsV2SwitchCell.reuseId, for: indexPath) as! SettingsV2SwitchCell
            cell.configure(title: "widget.hideNames.title".localized(), subtitle: "widget.hideNames.subtitle".localized(),
                           isOn: TodayWidgetSync.hideNames(), isEnabled: true)
            cell.onChange = { isOn, _ in
                TodayWidgetSync.setHideNames(isOn)
                TodayWidgetSync.shared.hideNamesChanged()
            }
            return cell
        }
        let cell = tableView.dequeueReusableCell(withIdentifier: SettingsV2Cell.reuseId, for: indexPath) as! SettingsV2Cell
        switch row {
        case .profile:
            let name = [user?.firstName, user?.lastName].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " ")
            let subtitle = [user?.role.displayName, user?.storeName, "settings.v2.profile.hint".localized()]
                .compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")
            cell.configureProfile(name: name.isEmpty ? (user?.email ?? "—") : name, subtitle: subtitle,
                                  initials: SettingsV2Logic.initials(name))
        case .item(let item):
            cell.configure(title: title(of: item), value: value(of: item), showsChevron: item != .plan,
                           badge: nil)
        case .logout:
            cell.configureLogout("Logout".localized())
        case .overlapSwitch, .attendance, .widgetHideNames:
            break
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        switch rows(in: indexPath.section)[indexPath.row] {
        case .attendance: break
        case .profile: navigationController?.pushViewController(ProfileSecurityViewController(), animated: true)
        case .item(let item): open(item)
        case .overlapSwitch, .widgetHideNames: break
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
    /// #937: unread count on "Thông báo" (red pill, mockup cartbell)
    private let badgeLabel: InsetLabel = {
        let label = InsetLabel()
        label.insets = UIEdgeInsets(top: 1, left: 7, bottom: 1, right: 7)
        label.font = Utils.boldFont(size: DS.TextSize.pill)
        label.textColor = .white
        label.textAlignment = .center
        label.backgroundColor = UIColor(hexString: "EF4444")
        label.layer.cornerRadius = 9
        label.layer.masksToBounds = true
        return label
    }()
    private let badgeBox = UIView()
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
        // #937: the pill sits at the trailing end of a box that takes the free width, so it keeps its size
        badgeLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        badgeLabel.setContentHuggingPriority(.required, for: .horizontal)
        badgeBox.addSubview(badgeLabel)
        badgeBox.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        badgeBox.isHidden = true
        badgeLabel.snp.makeConstraints { make in
            make.trailing.centerY.equalToSuperview()
            make.leading.greaterThanOrEqualToSuperview()
            make.height.equalTo(18)
            make.width.greaterThanOrEqualTo(18)
        }
        badgeBox.snp.makeConstraints { make in make.height.equalTo(18) }
        let row = UIStackView(arrangedSubviews: [avatar, texts, valueLabel, badgeBox, chevron])
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
        subtitleLabel.numberOfLines = 2 // #1259: "Chủ shop · Tiệm Hoa · hồ sơ, mật khẩu" wraps instead of cutting
        subtitleLabel.isHidden = subtitle.isEmpty
        valueLabel.isHidden = true
        badgeBox.isHidden = true
        accessibilityValue = nil
        // #1259: the name card opens Hồ sơ & bảo mật
        chevron.isHidden = false
        line.isHidden = true
        selectionStyle = .default
        accessibilityTraits = UIAccessibilityTraitButton
    }

    func configure(title: String, value: String?, showsChevron: Bool, badge: String? = nil) {
        avatar.isHidden = true
        subtitleLabel.numberOfLines = 1
        titleLabel.text = title
        titleLabel.font = Utils.regularFont(size: DS.TextSize.body)
        titleLabel.textColor = DS.Color.text
        subtitleLabel.isHidden = true
        valueLabel.text = value
        valueLabel.isHidden = (value ?? "").isEmpty
        badgeLabel.text = badge
        badgeBox.isHidden = badge == nil
        accessibilityValue = badge
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
        badgeBox.isHidden = true
        accessibilityValue = nil
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
        // #532: the scroll view fills the sheet and the home-indicator inset is added as content inset
        // (viewSafeAreaInsetsDidChange). Pinned to the safe area it was 34pt shorter than the form
        // (fittingHeight() did not count it) and scrolled the title and the close button off the top.
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.snp.makeConstraints { make in make.edges.equalToSuperview() }
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(24)
            make.leading.trailing.equalTo(view).inset(20)
            make.bottom.equalToSuperview().offset(-20)
        }
        render()
    }

    // #532: IQKeyboardManager pushed a content inset equal to the keyboard onto the scroll view and scrolled it
    // 44pt, so the title and the close button left the top of the sheet. The sheet lifts itself above the keyboard.
    private var keyboardManagerWasEnabled = true

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        keyboardManagerWasEnabled = IQKeyboardManager.shared.enable
        IQKeyboardManager.shared.enable = false
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        IQKeyboardManager.shared.enable = keyboardManagerWasEnabled
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        currentField.becomeFirstResponder()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        scroll.contentInset.bottom = view.safeAreaInsets.bottom
    }

    /// Height of the form, so the sheet is only as tall as its content (board DMK-doi-mat-khau)
    func fittingHeight() -> CGFloat {
        loadViewIfNeeded()
        guard let content = scroll.subviews.first(where: { $0 is UIStackView }) else { return 520 }
        let width = (view.bounds.width > 0 ? view.bounds.width : UIScreen.main.bounds.width) - 40
        let size = content.systemLayoutSizeFitting(CGSize(width: width, height: 0),
                                                   withHorizontalFittingPriority: .required,
                                                   verticalFittingPriority: .fittingSizeLevel)
        let homeIndicator = view.safeAreaInsets.bottom > 0 ? view.safeAreaInsets.bottom
            : (view.window ?? UIApplication.shared.windows.first)?.safeAreaInsets.bottom ?? 34
        return 24 + size.height + 20 + homeIndicator
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
