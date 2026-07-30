//
//  NotificationsViewController.swift
//  POS ADBD
//
//  In-app notification inbox: list, mark read, open order.
//

import Foundation
import UIKit
import SnapKit

final class NotificationsViewController: BaseViewControler {

    // MARK: - UI
    private lazy var notificationsTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.separatorStyle = .none
        table.register(NotificationCell.self, forCellReuseIdentifier: String(describing: NotificationCell.self))
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

    private func updateMoreMenu() {
        let deleteRead = UIAction(
            title: "notifications.deleteRead".localized(),
            image: UIImage(systemName: "trash"),
            attributes: .destructive
        ) { [weak self] _ in
            self?.deleteAllReadTapped()
        }
        moreButton.menu = UIMenu(children: [deleteRead])
    }

    // MARK: - Data
    private func loadNotifications(page: Int, showProgress: Bool) {
        guard !isLoading else { return }
        isLoading = true

        if showProgress && page == 1 {
            showProgressText(text: "Loading...".localized())
        }

        NotificationService.shared.getNotifications(page: page, limit: 20) { [weak self] data, error in
            guard let self else { return }
            self.isLoading = false
            self.hideProgress()
            self.endRefresh()

            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }

            guard let data else { return }

            if page == 1 {
                self.notifications = data.notifications
            } else {
                self.notifications.append(contentsOf: data.notifications)
            }

            self.currentPage = data.page
            self.hasMore = data.hasMore
            self.unreadCount = data.unreadCount
            self.reloadUI()
            self.postUnreadCount(data.unreadCount)
        }
    }

    private func reloadUI() {
        emptyStateLabel.isHidden = !notifications.isEmpty
        notificationsTableView.reloadData()
        markAllReadButton.isEnabled = unreadCount > 0
        markAllReadButton.alpha = unreadCount > 0 ? 1 : 0.4
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
            self.markAllReadButton.isEnabled = count > 0
            self.markAllReadButton.alpha = count > 0 ? 1 : 0.4
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

    private func openNotification(_ notification: InboxNotification, at indexPath: IndexPath) {
        if !notification.isRead {
            // Optimistic local update
            notifications[indexPath.row] = InboxNotification(
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

    private func toggleRead(at indexPath: IndexPath) {
        let item = notifications[indexPath.row]
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

    private func deleteNotification(at indexPath: IndexPath) {
        let item = notifications[indexPath.row]
        showProgressText(text: "Loading...".localized())
        NotificationService.shared.deleteNotification(notificationId: item.id) { [weak self] success, error in
            guard let self else { return }
            self.hideProgress()
            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            guard success else { return }
            self.notifications.remove(at: indexPath.row)
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
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        notifications.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
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
        openNotification(notifications[indexPath.row], at: indexPath)
    }

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        if indexPath.row >= notifications.count - 5, hasMore, !isLoading {
            loadNotifications(page: currentPage + 1, showProgress: false)
        }
    }

    func tableView(
        _ tableView: UITableView,
        trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath
    ) -> UISwipeActionsConfiguration? {
        let item = notifications[indexPath.row]

        let delete = UIContextualAction(style: .destructive, title: "Delete".localized()) { [weak self] _, _, done in
            self?.deleteNotification(at: indexPath)
            done(true)
        }

        let toggleTitle = item.isRead
            ? "notifications.markUnread".localized()
            : "notifications.markRead".localized()
        let toggle = UIContextualAction(style: .normal, title: toggleTitle) { [weak self] _, _, done in
            self?.toggleRead(at: indexPath)
            done(true)
        }
        toggle.backgroundColor = .systemBlue

        return UISwipeActionsConfiguration(actions: [delete, toggle])
    }
}
