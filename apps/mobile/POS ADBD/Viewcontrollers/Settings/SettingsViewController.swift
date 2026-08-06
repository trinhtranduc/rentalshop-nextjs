import UIKit
import Kingfisher
import SnapKit

class SettingsViewController: BaseViewControler {
    // MARK: - UI Components
    private lazy var settingTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        return table
    }()
    
    private lazy var headerView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()
    
    private lazy var profileImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.image = UIImage(systemName: "person.circle.fill")
        imageView.tintColor = .textPrimary
        imageView.contentMode = .scaleAspectFit
        imageView.layer.cornerRadius = 30
        imageView.clipsToBounds = true
        return imageView
    }()
    
    private lazy var infoStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        return stack
    }()
    
    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        label.font = .titleMedium()
        label.textColor = .textPrimary
        return label
    }()
    
    private lazy var roleLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyMedium()
        label.textColor = .textSecondary
        return label
    }()
    
    private lazy var planLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyMedium()
        label.textColor = .brandPrimary
        return label
    }()
    
    private lazy var statusBadge: UILabel = {
        let label = UILabel()
        label.font = UIFont.systemFont(ofSize: 11, weight: .semibold)
        label.textAlignment = .center
        label.layer.cornerRadius = 4
        label.layer.masksToBounds = true
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private lazy var planStatusRow: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        return stack
    }()
    
    private lazy var durationLabel: UILabel = {
        let label = UILabel()
        label.font = .captionMedium()
        label.textColor = .textSecondary
        return label
    }()
    
    // MARK: - Properties
    private enum Section: Int, CaseIterable {
        case account
        case tools
        case about
        case logout
        
        var title: String? {
            switch self {
            case .account: return "Account".localized()
            case .tools: return "Tools".localized()
            case .about: return "About".localized()
            case .logout: return nil
            }
        }
    }
    
    // Helper method to get items for a section based on user permissions
    private func items(for section: Section) -> [SettingsItem] {
        switch section {
        case .account:
            var items: [SettingsItem] = [.account]
            // MERCHANT-only: in-app subscription renew via RevenueCat
            if User.account()?.role == .merchant {
                items.append(.subscription)
            }
            // Show user management if user has users.manage permission
            if PermissionManager.shared.canManageUsers() {
                items.append(.userManagement)
            }
            items.append(.notifications)
            return items
        case .tools:
            var items: [SettingsItem] = [.printer]
            
            // Hide export only for outlet staff role (outlet admin can see export)
            let isOutletStaff = User.current()?.role == .outletStaff || User.account()?.role == .outletStaff
            
            // Show export if user has export permission AND not outlet staff
            if !isOutletStaff {
                if PermissionManager.shared.canExportProducts() || 
                   PermissionManager.shared.canExportOrders() || 
                   PermissionManager.shared.canExportCustomers() || 
                   PermissionManager.shared.canExportAnalytics() {
                    items.append(.export)
                }
            } else {
                // For outlet staff, check if they have export permission (but still hide it)
                // This is just for consistency, export will be hidden regardless
            }
            
            // Bank accounts management hidden as per requirement
            // if PermissionManager.shared.canManageBankAccounts() {
            //     items.append(.bankAccounts)
            // }
            
            return items
        case .about:
            return [.appInfo, .deleteAccount]
        case .logout:
            return [.logout]
        }
    }
    
    private enum SettingsItem {
        case account
        case subscription
        case userManagement
        case notifications
        case printer
        case export
        case bankAccounts
        case appInfo
        case deleteAccount
        case logout
        
        var title: String {
            switch self {
            case .account: return "Store Information".localized()
            case .subscription: return "Subscription".localized()
            case .userManagement: return "User Management".localized()
            case .notifications: return "Notifications".localized()
            case .printer: return "Printer Configuration".localized()
            case .export: return "Export Data".localized()
            case .bankAccounts: return "Bank Accounts".localized()
            case .appInfo: return "App Information".localized()
            case .deleteAccount: return "Delete Account".localized()
            case .logout: return "Logout".localized()
            }
        }
        var description: String? {
            switch self {
            case .export: return nil
            default: return nil
            }
        }
        
        var icon: UIImage? {
            switch self {
            case .account: return UIImage(systemName: "building.2")
            case .subscription: return UIImage(systemName: "creditcard.fill")
            case .userManagement: return UIImage(systemName: "person.fill")
            case .notifications: return UIImage(systemName: "bell.fill")
            case .printer: return UIImage(systemName: "printer.fill")
            case .export: return UIImage(systemName: "square.and.arrow.up")
            case .bankAccounts: return UIImage(systemName: "creditcard.fill")
            case .appInfo: return UIImage(systemName: "info.circle.fill")
            case .deleteAccount: return UIImage(systemName: "trash")
            case .logout: return UIImage(systemName: "arrow.right.circle.fill")
            }
        }
        
        var iconColor: UIColor {
            switch self {
            case .account, .subscription, .printer, .appInfo, .export, .bankAccounts, .deleteAccount, .userManagement, .notifications:
                return .neutralGray
            case .logout:
                return .actionDanger
            }
        }
    }
    
    // Update property to use User
    private var user: User? {
        return User.account()
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        // Hide default navigation bar immediately
        navigationController?.setNavigationBarHidden(true, animated: false)
        setupUI()
        updateUserInfo()
        setStatusBarStyle(.darkContent) // or .default
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Keep navigation bar hidden when leaving this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
        updateUserInfo() // Refresh user info + subscription status when view appears
        settingTableView.reloadData() // Reload to update export visibility based on role
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        // Setup table view
        view.addSubview(settingTableView)
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        if isIPad {
            // For iPad - Fixed width centered container
            let containerView = UIView()
            view.addSubview(containerView)
            containerView.addSubview(settingTableView)
            
            // Container constraints
            containerView.snp.makeConstraints { make in
                make.top.equalTo(view.safeAreaLayoutGuide)
                make.centerX.equalToSuperview()
                make.bottom.equalToSuperview()
                make.width.equalTo(600) // Wider for settings to show more content
            }
            
            // TableView constraints within container
            settingTableView.snp.makeConstraints { make in
                make.edges.equalToSuperview()
            }
        } else {
            // For iPhone - Edge to edge
            settingTableView.snp.makeConstraints { make in
                make.top.equalTo(view.safeAreaLayoutGuide)
                make.leading.trailing.bottom.equalToSuperview()
            }
        }
        
        // Configure header view
        let headerContainerView = UIView(frame: CGRect(x: 0, y: 0, width: view.bounds.width, height: 120))
        headerContainerView.backgroundColor = .clear
        
        headerContainerView.addSubview(headerView)
        headerView.addSubview(profileImageView)
        headerView.addSubview(infoStackView)
        
        // Add labels to stack view
        planStatusRow.addArrangedSubview(planLabel)
        planStatusRow.addArrangedSubview(statusBadge)
        [nameLabel, roleLabel, planStatusRow, durationLabel].forEach {
            infoStackView.addArrangedSubview($0)
        }
        planStatusRow.isHidden = true
        durationLabel.isHidden = true
        
        // Setup header view constraints
        headerView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Profile image constraints
        profileImageView.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.leading.equalToSuperview().offset(16)
            make.width.height.equalTo(60)
        }
        
        // Info stack constraints
        infoStackView.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.leading.equalTo(profileImageView.snp.trailing).offset(16)
            make.trailing.lessThanOrEqualToSuperview().offset(-16)
        }
        
        // Set the header view
        settingTableView.tableHeaderView = headerContainerView
        
        // Adjust font sizes for iPad
        if isIPad {
            nameLabel.font = .titleLarge()
            roleLabel.font = .titleMedium()
            
            // Make profile image larger on iPad
            profileImageView.snp.updateConstraints { make in
                make.width.height.equalTo(80)
            }
        }
    }
    
    private func updateUserInfo() {
        // Update user name (firstName + lastName)
        let firstName = user?.firstName ?? ""
        let lastName = user?.lastName ?? ""
        let fullName = [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
        nameLabel.text = fullName.isEmpty ? "User Name".localized() : fullName
        
        // Update role
        let roleName = user?.role.displayName ?? ""
        roleLabel.text = roleName
        
        // Load subscription info for merchants
        if User.account()?.role == .merchant {
            NSLog("[Settings] Loading subscription info for merchant...")
            SubscriptionAPIService.shared.getStatus { [weak self] info, error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if let error {
                        NSLog("[Settings] Subscription status error: \(error.localizedDescription)")
                    }
                    guard let info else {
                        NSLog("[Settings] No subscription info returned")
                        self.planStatusRow.isHidden = true
                        self.durationLabel.isHidden = true
                        return
                    }
                    NSLog("[Settings] Subscription loaded: plan=\(info.displayPlanName) status=\(info.displayStatus ?? "nil")")
                    self.planStatusRow.isHidden = false
                    self.durationLabel.isHidden = false
                    
                    // Plan name
                    self.planLabel.text = info.displayPlanName
                    self.planLabel.textColor = .textPrimary
                    
                    // Status badge
                    let statusText = info.displayStatus ?? "—"
                    self.statusBadge.text = "  \(statusText)  "
                    let status = statusText.uppercased()
                    if status.contains("ACTIVE") || status.contains("TRIAL") {
                        self.statusBadge.textColor = .systemGreen
                        self.statusBadge.backgroundColor = UIColor.systemGreen.withAlphaComponent(0.12)
                    } else if status.contains("EXPIRED") || status.contains("CANCELLED") {
                        self.statusBadge.textColor = .systemRed
                        self.statusBadge.backgroundColor = UIColor.systemRed.withAlphaComponent(0.12)
                    } else if status.contains("PAST_DUE") {
                        self.statusBadge.textColor = .systemOrange
                        self.statusBadge.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.12)
                    } else {
                        self.statusBadge.textColor = .brandPrimary
                        self.statusBadge.backgroundColor = UIColor.brandPrimary.withAlphaComponent(0.12)
                    }
                    
                    // Format expiry as dd/MM/yyyy
                    if let isoEnd = info.currentPeriodEnd, !isoEnd.isEmpty {
                        let formatter = ISO8601DateFormatter()
                        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        var date = formatter.date(from: isoEnd)
                        if date == nil {
                            formatter.formatOptions = [.withInternetDateTime]
                            date = formatter.date(from: isoEnd)
                        }
                        if let date {
                            let displayFormatter = DateFormatter()
                            displayFormatter.dateFormat = "dd/MM/yyyy"
                            self.durationLabel.text = "\("Expires on".localized()): \(displayFormatter.string(from: date))"
                        }
                    }
                }
            }
        } else {
            planStatusRow.isHidden = true
            durationLabel.isHidden = true
        }
    }
    
    // MARK: - Actions
    private func handleSelection(of item: SettingsItem) {
        switch item {
        case .account:
            let accountVC = AccountViewController()
            navigationController?.pushViewController(accountVC, animated: true)

        case .subscription:
            let subscriptionVC = SubscriptionViewController()
            subscriptionVC.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(subscriptionVC, animated: true)
            
        case .userManagement:
            let userManagementVC = UserManagementViewController()
            navigationController?.pushViewController(userManagementVC, animated: true)

        case .notifications:
            let notificationsVC = NotificationsViewController()
            notificationsVC.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(notificationsVC, animated: true)
            
        case .printer:
            let printerVC = PrinterConfigurationViewController()
            navigationController?.pushViewController(printerVC, animated: true)
            
        case .export:
            let exportVC = ExportViewController()
            navigationController?.pushViewController(exportVC, animated: true)
            
        case .bankAccounts:
            let bankAccountVC = BankAccountViewController()
            navigationController?.pushViewController(bankAccountVC, animated: true)
            
        case .appInfo:
            let infoVC = AppInformationViewController()
            navigationController?.pushViewController(infoVC, animated: true)
            
        case .deleteAccount:
            showDeleteAccountAlert()
            
        case .logout:
            showLogoutAlert()
        }
    }
    
    private func showLogoutAlert() {
        let alert = UIAlertController(
            title: "Logout".localized(), 
            message: "Are you sure you want to logout?".localized(), 
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Logout".localized(), style: .destructive) { [weak self] _ in
            self?.performLogout()
        })
        
        present(alert, animated: true)
    }
    
    private func performLogout() {
        // Perform logout logic here
        AuthenticationService.shared.logout { [weak self] success, error  in
            appDelegate.logout()
        }
    }
    
    private func showDeleteAccountAlert() {
        let alert = UIAlertController(
            title: "Delete Account".localized(), 
            message: "Are you sure you want to delete your account? This action cannot be undone.".localized(), 
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete".localized(), style: .destructive) { [weak self] _ in
//            self?.deleteAccount()
        })
        
        present(alert, animated: true)
    }
//    
//    private func deleteAccount() {
//        let viewController = AccountDeletionViewController()
//        navigationController?.pushViewController(viewController, animated: true)
//    }
//    
    private func showComingSoonAlert() {
        let alert = UIAlertController(
            title: "Coming Soon".localized(),
            message: "This feature is coming soon!".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDataSource
extension SettingsViewController: UITableViewDataSource {
    func numberOfSections(in tableView: UITableView) -> Int {
        return Section.allCases.count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        guard let sectionEnum = Section(rawValue: section) else { return 0 }
        return items(for: sectionEnum).count
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return Section(rawValue: section)?.title
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: "SettingsCell")
        
        guard let section = Section(rawValue: indexPath.section) else {
            return cell
        }
        
        let sectionItems = items(for: section)
        guard indexPath.row < sectionItems.count else {
            return cell
        }
        
        let item = sectionItems[indexPath.row]
        var config = cell.defaultContentConfiguration()
        config.text = item.title
        config.textProperties.font = .bodyRegular(size: 16)
        config.secondaryText = item.description
        config.secondaryTextProperties.font = .captionSmall(size: 12)
        config.secondaryTextProperties.color = .textSecondary
        config.image = item.icon
        config.imageProperties.tintColor = item.iconColor
        cell.contentConfiguration = config
        
        if item != .logout {
            cell.accessoryType = .disclosureIndicator
        }
        
        return cell
    }
}

// MARK: - UITableViewDelegate
extension SettingsViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        guard let section = Section(rawValue: indexPath.section) else {
            return
        }
        
        let sectionItems = items(for: section)
        guard indexPath.row < sectionItems.count else {
            return
        }
        
        let item = sectionItems[indexPath.row]
        handleSelection(of: item)
    }
} 
