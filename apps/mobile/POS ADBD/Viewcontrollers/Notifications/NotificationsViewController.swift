//
//  NotificationsViewController.swift
//  POS ADBD
//
//  In-app notification inbox: list, mark read, open order.
//  #477: new style (board TB-thong-bao) when `newProducts` is on: day groups on Vietnam days, type tiles,
//  "Tất cả" / "Chưa đọc · N" chips. Same calls, paging and unread badge; flag off keeps the old screen.
//

import Foundation
import UIKit
import SnapKit

final class NotificationsViewController: BaseViewControler {
    /// #477: new style, on with the new products home (the screen that hosts the bell)
    var v2 = FeatureFlags.shared.isOn(.newProducts)

    // MARK: - UI
    private lazy var notificationsTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.separatorStyle = .none
        table.register(NotificationCell.self, forCellReuseIdentifier: String(describing: NotificationCell.self))
        table.register(NotificationV2Cell.self, forCellReuseIdentifier: NotificationV2Cell.reuseId)
        table.tableHeaderView = UIView()
        table.tableFooterView = UIView()
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 96
        table.keyboardDismissMode = .onDrag
        return table
    }()

    override var tableView: UITableView? {
        get { notificationsTableView }
        set { }
    }

    private lazy var emptyStateLabel: UILabel = {
        let label = UILabel()
        label.text = "notifications.empty".localized()
        label.font = Utils.regularFont(size: 15)
        label.textColor = .textSecondary
        label.textAlignment = .center
        label.numberOfLines = 0
        label.isHidden = true
        return label
    }()

    private lazy var markAllReadButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "checkmark.circle"), for: .normal)
        button.tintColor = .textPrimary
        button.accessibilityLabel = "notifications.markAllRead".localized()
        button.addTarget(self, action: #selector(markAllReadTapped), for: .touchUpInside)
        return button
    }()

    private lazy var moreButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "ellipsis.circle"), for: .normal)
        button.tintColor = .textPrimary
        button.showsMenuAsPrimaryAction = true
        button.accessibilityLabel = "notifications.more".localized()
        return button
    }()

    // MARK: - New style (#477)
    private lazy var markAllReadV2Button: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(DS.symbol("checkmark", DS.Icon.sm, weight: .semibold), for: .normal)
        button.setTitle(" " + "notifications.v2.markAllRead".localized(), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        button.tintColor = DS.Color.primary
        button.setTitleColor(DS.Color.primary, for: .normal)
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 10, bottom: 0, right: 10)
        button.accessibilityLabel = "notifications.markAllRead".localized()
        button.addTarget(self, action: #selector(markAllReadTapped), for: .touchUpInside)
        button.setContentCompressionResistancePriority(.required, for: .horizontal)
        button.snp.makeConstraints { make in make.height.equalTo(40) }
        return button
    }()

    private lazy var moreV2Button: UIButton = {
        let button = CustomersV2UI.iconButton("ellipsis", label: "notifications.more".localized(), size: DS.Icon.md)
        button.showsMenuAsPrimaryAction = true
        return button
    }()

    private let allChip = UIButton(type: .system)
    private let unreadChip = UIButton(type: .system)
    private var unreadOnly = false
    private var groups: [NotificationsLogic.DayGroup] = []
    private let emptyV2 = UIStackView()
    private let emptyV2Label = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)

    // MARK: - State
    private var notifications: [InboxNotification] = []
    private var currentPage = 1
    private var hasMore = true
    private var isLoading = false
    private var unreadCount = 0

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadNotifications(page: 1, showProgress: true)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    // MARK: - Setup
    override func setupUI() {
        super.setupUI()
        if v2 {
            setupV2()
            return
        }
        view.backgroundColor = .backgroundPrimary
        setupNavigationBar()

        if #available(iOS 15.0, *) {
            notificationsTableView.sectionHeaderTopPadding = 0
        }

        view.addSubview(notificationsTableView)
        view.addSubview(emptyStateLabel)
        configPullToRefresh(tableview: notificationsTableView)
        setupConstraints()
        updateMoreMenu()
    }

    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Notifications".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
        navBar.addRightButton(moreButton, size: CGSize(width: 44, height: 44))
        navBar.addRightButton(markAllReadButton, size: CGSize(width: 44, height: 44))
    }

    private func setupConstraints() {
        guard let customNavBar else { return }

        notificationsTableView.snp.remakeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }

        emptyStateLabel.snp.remakeConstraints { make in
            make.centerX.equalToSuperview()
            make.centerY.equalToSuperview().offset(-20)
            make.leading.trailing.equalToSuperview().inset(32)
        }
    }

    private func setupV2() {
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addAction(UIAction { [weak self] _ in self?.navigationController?.popViewController(animated: true) },
                       for: .touchUpInside)
        let headerLine = SettingsDetailV2.installHeader(on: view, title: "Notifications".localized(), back: back,
                                                        trailing: [markAllReadV2Button, moreV2Button])

        for (chip, tag) in [(allChip, 0), (unreadChip, 1)] {
            chip.tag = tag
            chip.layer.cornerRadius = 17
            chip.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            chip.snp.makeConstraints { make in make.height.equalTo(34) }
        }
        let chips = UIStackView(arrangedSubviews: [allChip, unreadChip, UIView()])
        chips.spacing = DS.Spacing.sm
        let chipsLine = V2.divider()
        [chips, chipsLine].forEach(view.addSubview)
        chips.snp.makeConstraints { make in
            make.top.equalTo(headerLine.snp.bottom).offset(10)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        chipsLine.snp.makeConstraints { make in
            make.top.equalTo(chips.snp.bottom).offset(10)
            make.leading.trailing.equalToSuperview()
        }

        notificationsTableView.backgroundColor = .white
        if #available(iOS 15.0, *) {
            notificationsTableView.sectionHeaderTopPadding = 0
        }
        notificationsTableView.estimatedRowHeight = 90
        view.addSubview(notificationsTableView)
        notificationsTableView.snp.makeConstraints { make in
            make.top.equalTo(chipsLine.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        configPullToRefresh(tableview: notificationsTableView)

        let tile = UIImageView(image: DS.symbol("bell", DS.Icon.lg))
        tile.tintColor = DS.Status.cancelled.text
        tile.backgroundColor = DS.Status.cancelled.fill
        tile.contentMode = .center
        tile.layer.cornerRadius = 16
        tile.snp.makeConstraints { make in make.size.equalTo(56) }
        emptyV2Label.textAlignment = .center
        emptyV2.axis = .vertical
        emptyV2.alignment = .center
        emptyV2.spacing = DS.Spacing.md
        [tile, emptyV2Label].forEach(emptyV2.addArrangedSubview)
        emptyV2.isHidden = true
        view.addSubview(emptyV2)
        emptyV2.snp.makeConstraints { make in
            make.centerY.equalTo(notificationsTableView).offset(-40)
            make.leading.trailing.equalToSuperview().inset(32)
        }
        updateMoreMenu()
        renderChips()
    }

    private func renderChips() {
        unreadChip.setTitle(String(format: "notifications.v2.unread".localized(), unreadCount), for: .normal)
        allChip.setTitle("notifications.v2.all".localized(), for: .normal)
        for (chip, selected) in [(allChip, !unreadOnly), (unreadChip, unreadOnly)] {
            chip.backgroundColor = selected ? DS.Color.text : .white
            chip.setTitleColor(selected ? .white : DS.Color.text, for: .normal)
            chip.titleLabel?.font = selected ? Utils.boldFont(size: DS.TextSize.secondary) : Utils.regularFont(size: DS.TextSize.secondary)
            chip.layer.borderWidth = selected ? 0 : 1
            chip.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
            chip.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
        }
    }

    @objc private func chipTapped(_ sender: UIButton) {
        let wantsUnread = sender.tag == 1
        guard wantsUnread != unreadOnly else { return }
        unreadOnly = wantsUnread
        notifications = []
        // A page in flight is dropped when it lands, and page 1 of this list is asked then
        if !isLoading { loadNotifications(page: 1, showProgress: true) }
        reloadUI()
    }

    private func updateMoreMenu() {
        let deleteRead = UIAction(
            title: "notifications.deleteRead".localized(),
            image: UIImage(systemName: "trash"),
            attributes: .destructive
        ) { [weak self] _ in
            self?.deleteAllReadTapped()
        }
        (v2 ? moreV2Button : moreButton).menu = UIMenu(children: [deleteRead])
    }

    // MARK: - Data
    private func loadNotifications(page: Int, showProgress: Bool) {
        guard !isLoading else { return }
        isLoading = true

        if showProgress && page == 1 {
            showProgressText(text: "Loading...".localized())
        }

        let wantsUnread = v2 && unreadOnly
        NotificationService.shared.getNotifications(page: page, limit: 20, isRead: wantsUnread ? false : nil) { [weak self] data, error in
            guard let self else { return }
            self.isLoading = false
            self.hideProgress()
            self.endRefresh()
            // #477: the chip changed while this page loaded; drop it and load page 1 of the chosen list
            guard wantsUnread == (self.v2 && self.unreadOnly) else {
                self.loadNotifications(page: 1, showProgress: false)
                return
            }

            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }

            guard let data else { return }

            if page == 1 {
                self.notifications = data.notifications
            } else {
                self.notifications = NotificationsLogic.appendPage(self.notifications, data.notifications)
            }

            self.currentPage = data.page
            self.hasMore = data.hasMore
            self.unreadCount = data.unreadCount
            self.reloadUI()
            self.postUnreadCount(data.unreadCount)
        }
    }

    private func reloadUI() {
        if v2 {
            groups = NotificationsLogic.groups(notifications)
            emptyV2Label.text = (unreadOnly ? "notifications.v2.emptyUnread" : "notifications.empty").localized()
            emptyV2.isHidden = !notifications.isEmpty || isLoading
            notificationsTableView.reloadData()
            updateMarkAllEnabled()
            renderChips()
            return
        }
        emptyStateLabel.isHidden = !notifications.isEmpty
        notificationsTableView.reloadData()
        updateMarkAllEnabled()
    }

    private func updateMarkAllEnabled() {
        let button = v2 ? markAllReadV2Button : markAllReadButton
        button.isEnabled = unreadCount > 0
        button.alpha = unreadCount > 0 ? 1 : 0.4
    }

    /// Row of the flat list behind a table index path (the new style groups rows by day)
    private func flatIndex(_ indexPath: IndexPath) -> Int? {
        guard v2 else { return notifications.indices.contains(indexPath.row) ? indexPath.row : nil }
        guard groups.indices.contains(indexPath.section),
              groups[indexPath.section].items.indices.contains(indexPath.row) else { return nil }
        let id = groups[indexPath.section].items[indexPath.row].id
        return notifications.firstIndex { $0.id == id }
    }

    private func postUnreadCount(_ count: Int) {
        NotificationCenter.default.post(
            name: .inboxUnreadCountDidChange,
            object: nil,
            userInfo: ["count": count]
        )
    }

    private func refreshUnreadCountFromServer() {
        NotificationService.shared.getUnreadCount { [weak self] count, _ in
            guard let self, let count else { return }
            self.unreadCount = count
            self.updateMarkAllEnabled()
            if self.v2 { self.renderChips() }
            self.postUnreadCount(count)
        }
    }

    // MARK: - Actions
    override func startRefresh(_ sender: Any) {
        loadNotifications(page: 1, showProgress: false)
    }

    @objc private func markAllReadTapped() {
        guard unreadCount > 0 else { return }
        showProgressText(text: "Loading...".localized())
        NotificationService.shared.markAllAsRead { [weak self] _, error in
            guard let self else { return }
            self.hideProgress()
            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            self.loadNotifications(page: 1, showProgress: false)
        }
    }

    private func deleteAllReadTapped() {
        let alert = UIAlertController(
            title: "notifications.deleteRead".localized(),
            message: "notifications.deleteRead.confirm".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete".localized(), style: .destructive) { [weak self] _ in
            guard let self else { return }
            self.showProgressText(text: "Loading...".localized())
            NotificationService.shared.deleteAllRead { [weak self] _, error in
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                self.loadNotifications(page: 1, showProgress: false)
            }
        })
        present(alert, animated: true)
    }

    private func openNotification(_ notification: InboxNotification, at index: Int) {
        if !notification.isRead {
            // Optimistic local update
            notifications[index] = InboxNotification(
                id: notification.id,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                body: notification.body,
                isRead: true,
                readAt: ISO8601DateFormatter().string(from: Date()),
                createdAt: notification.createdAt,
                data: notification.data
            )
            if unreadCount > 0 { unreadCount -= 1 }
            reloadUI()
            postUnreadCount(unreadCount)

            NotificationService.shared.markAsRead(notificationId: notification.id) { [weak self] success, error in
                if let error {
                    self?.refreshUnreadCountFromServer()
                    print("⚠️ Failed to mark notification read: \(error.localizedDescription)")
                    return
                }
                if !success {
                    self?.loadNotifications(page: 1, showProgress: false)
                }
            }
        }

        if let orderId = notification.orderIdValue {
            PushNotificationManager.shared.openOrderDetail(orderId: orderId)
        }
    }

    private func toggleRead(at index: Int) {
        let item = notifications[index]
        let markRead = !item.isRead

        showProgressText(text: "Loading...".localized())
        let completion: (Bool, NSError?) -> Void = { [weak self] success, error in
            guard let self else { return }
            self.hideProgress()
            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            guard success else { return }
            self.loadNotifications(page: 1, showProgress: false)
        }

        if markRead {
            NotificationService.shared.markAsRead(notificationId: item.id, completion: completion)
        } else {
            NotificationService.shared.markAsUnread(notificationId: item.id, completion: completion)
        }
    }

    private func deleteNotification(at index: Int) {
        let item = notifications[index]
        showProgressText(text: "Loading...".localized())
        NotificationService.shared.deleteNotification(notificationId: item.id) { [weak self] success, error in
            guard let self else { return }
            self.hideProgress()
            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            guard success else { return }
            // The list may have reloaded meanwhile: remove by id
            self.notifications.removeAll { $0.id == item.id }
            if !item.isRead, self.unreadCount > 0 {
                self.unreadCount -= 1
            }
            self.reloadUI()
            self.postUnreadCount(self.unreadCount)
        }
    }
}

// MARK: - UITableView
extension NotificationsViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        v2 ? groups.count : 1
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        v2 ? groups[section].items.count : notifications.count
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        guard v2 else { return nil }
        let band = UIView()
        band.backgroundColor = V2.sectionFill
        let label = V2.label(groups[section].title, size: DS.TextSize.secondary, weight: .bold, color: UIColor(hexString: "334155"))
        label.accessibilityTraits = UIAccessibilityTraitHeader
        let line = V2.divider()
        [label, line].forEach(band.addSubview)
        label.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.bottom.equalToSuperview().offset(-6)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return band
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        v2 ? UITableViewAutomaticDimension : 0
    }

    func tableView(_ tableView: UITableView, estimatedHeightForHeaderInSection section: Int) -> CGFloat {
        v2 ? 38 : 0
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if v2 {
            let cell = tableView.dequeueReusableCell(withIdentifier: NotificationV2Cell.reuseId, for: indexPath)
            (cell as? NotificationV2Cell)?.configure(with: groups[indexPath.section].items[indexPath.row])
            return cell
        }
        guard let cell = tableView.dequeueReusableCell(
            withIdentifier: String(describing: NotificationCell.self),
            for: indexPath
        ) as? NotificationCell else {
            return UITableViewCell()
        }
        cell.configure(with: notifications[indexPath.row])
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard let index = flatIndex(indexPath) else { return }
        openNotification(notifications[index], at: index)
    }

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        guard let index = flatIndex(indexPath) else { return }
        if index >= notifications.count - 5, hasMore, !isLoading {
            loadNotifications(page: currentPage + 1, showProgress: false)
        }
    }

    func tableView(
        _ tableView: UITableView,
        trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath
    ) -> UISwipeActionsConfiguration? {
        guard let index = flatIndex(indexPath) else { return nil }
        let item = notifications[index]

        let delete = UIContextualAction(style: .destructive, title: "Delete".localized()) { [weak self] _, _, done in
            self?.deleteNotification(at: index)
            done(true)
        }

        let toggleTitle = item.isRead
            ? "notifications.markUnread".localized()
            : "notifications.markRead".localized()
        let toggle = UIContextualAction(style: .normal, title: toggleTitle) { [weak self] _, _, done in
            self?.toggleRead(at: index)
            done(true)
        }
        toggle.backgroundColor = .systemBlue

        return UISwipeActionsConfiguration(actions: [delete, toggle])
    }
}
