import UIKit
import SnapKit

class AccountViewController: BaseViewControler {
    private lazy var accountTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.translatesAutoresizingMaskIntoConstraints = false
        return table
    }()
    
    // User property
    private var user: User? {
        return User.account()
    }
    
    private enum Section: Int, CaseIterable {
        case info
        
        var title: String {
            switch self {
            case .info: return "Store Information".localized()
            }
        }
        
        var items: [StoreItem] {
            switch self {
            case .info: 
                var items: [StoreItem] = [.storeName, .staffName, .role, .email, .address, .phone]
                // Add affiliate link if available (only for admin/merchant)
                if let user = User.account(), (user.role == .admin || user.role == .merchant) {
                    if user.affiliateLink != nil {
                        items.append(.affiliateLink)
                    }
                    if user.publicProductLink != nil {
                        items.append(.publicProductLink)
                    }
                }
                return items
            }
        }
    }
    
    private enum StoreItem {
        case storeName, staffName, role, plan, duration, subscription, email, address, phone, affiliateLink, publicProductLink
        
        var title: String {
            switch self {
            case .storeName: return "Store Name".localized()
            case .staffName: return "Staff Name".localized()
            case .role: return "Role".localized()
            case .plan: return "Plan".localized()
            case .duration: return "Duration".localized()
            case .subscription: return "Subscription".localized()
            case .email: return "Email".localized()
            case .address: return "Store Address".localized()
            case .phone: return "Phone Number".localized()
            case .affiliateLink: return "Affiliate Link".localized()
            case .publicProductLink: return "Public Product Link".localized()
            }
        }
        
        func value(for user: User) -> String? {
            switch self {
            case .storeName: return user.storeName
            case .staffName:
                let firstName = user.firstName ?? ""
                let lastName = user.lastName ?? ""
                let fullName = [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
                return fullName.isEmpty ? "N/A".localized() : fullName
            case .role: return user.role.displayName
            case .plan:
                if let subscription = user.merchant?.subscription {
                    return subscription.plan?.name ?? "No Plan".localized()
                }
                return "No Plan".localized()
            case .duration:
                if let subscription = user.merchant?.subscription {
                    let startDateStr = subscription.currentPeriodStart.dateInString() ?? "N/A"
                    let endDateStr = subscription.currentPeriodEnd.dateInString() ?? "N/A"
                    
                    // Calculate remaining days
                    let calendar = Calendar.current
                    let today = calendar.startOfDay(for: Date())
                    let endDate = calendar.startOfDay(for: subscription.currentPeriodEnd)
                    let daysRemaining = calendar.dateComponents([.day], from: today, to: endDate).day ?? 0
                    
                    // Format: "dd/MM/yy - dd/MM/yy (X days)"
                    if daysRemaining >= 0 {
                        let daysText = daysRemaining == 1 ? "day".localized() : "days".localized()
                        return "\(startDateStr) - \(endDateStr) (\(daysRemaining) \(daysText))"
                    } else {
                        return "\(startDateStr) - \(endDateStr) (\("Expired".localized()))"
                    }
                }
                return "N/A".localized()
            case .subscription:
                if let subscription = user.merchant?.subscription {
                    let status = subscription.status.capitalized
                    let startDateStr = CustomDateCoding.displayDateFormatter.string(from: subscription.currentPeriodStart)
                    let endDateStr = CustomDateCoding.displayDateFormatter.string(from: subscription.currentPeriodEnd)
                    return "\(subscription.plan?.name ?? "Unknown") • \(status) • \(startDateStr) to \(endDateStr)"
                }
                return "No active subscription".localized()
            case .email: return user.email
            case .address: return AccountViewController.formatFullAddress(user: user)
            case .phone: return user.phone
            case .affiliateLink: return user.affiliateLink
            case .publicProductLink: return user.publicProductLink
            }
        }
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
        accountTableView.reloadData() // Refresh data when view appears
    }
    
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        // Setup custom navigation bar and get reference
        let navBar = setupNavigationBar()
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        if isIPad {
            // For iPad - Fixed width centered container
            let containerView = UIView()
            containerView.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(containerView)
            containerView.addSubview(accountTableView)
            
            NSLayoutConstraint.activate([
                // Container constraints
                containerView.topAnchor.constraint(equalTo: navBar.bottomAnchor),
                containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                containerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                containerView.widthAnchor.constraint(equalToConstant: 600), // Match settings width
                
                // TableView constraints within container
                accountTableView.topAnchor.constraint(equalTo: containerView.topAnchor),
                accountTableView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
                accountTableView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
                accountTableView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
            ])
        } else {
            // For iPhone - Edge to edge
            view.addSubview(accountTableView)
            NSLayoutConstraint.activate([
                accountTableView.topAnchor.constraint(equalTo: navBar.bottomAnchor),
                accountTableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                accountTableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                accountTableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
        }
    }
    
    private func setupNavigationBar() -> RCCustomNavigationBar {
        let navBar = setupCustomNavigationBar(
            title: "Store Information".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
        
        // Add Edit button if user has permission to manage outlets
        if PermissionManager.shared.canManageOutlets() {
            let editButton = UIButton(type: .system)
            editButton.setTitle("Edit".localized(), for: .normal)
            editButton.titleLabel?.font = Utils.regularFont(size: 17)
            editButton.setTitleColor(APP_TONE_COLOR, for: .normal)
            editButton.addTarget(self, action: #selector(editButtonTapped), for: .touchUpInside)
            navBar.addRightButton(editButton)
        }
        
        return navBar
    }
    
    // MARK: - Helper Methods
    static func formatFullAddress(user: User) -> String {
        // Prefer outlet address, fallback to merchant address
        let outlet = user.outlet
        let merchant = user.merchant
        
        var addressComponents: [String] = []
        
        // Address line (street address)
        if let address = outlet?.address ?? merchant?.address, !address.isEmpty {
            addressComponents.append(address)
        }
        
        // City
        if let city = outlet?.city ?? merchant?.city, !city.isEmpty {
            addressComponents.append(city)
        }
        
        // State/Province
        if let state = outlet?.state ?? merchant?.state, !state.isEmpty {
            addressComponents.append(state)
        }
        
        // Country
        if let country = outlet?.country ?? merchant?.country, !country.isEmpty {
            addressComponents.append(country)
        }
        
        // Zip/Postal Code
        if let zipCode = outlet?.zipCode ?? merchant?.zipCode, !zipCode.isEmpty {
            addressComponents.append(zipCode)
        }
        
        return addressComponents.isEmpty ? "-" : addressComponents.joined(separator: ", ")
    }
    
    // MARK: - Actions
    @objc private func editButtonTapped() {
        let editVC = EditStoreViewController()
        editVC.delegate = self
        let navController = UINavigationController(rootViewController: editVC)
        present(navController, animated: true)
    }
}

// MARK: - EditStoreViewControllerDelegate
extension AccountViewController: EditStoreViewControllerDelegate {
    func didUpdateStore() {
        // Refresh table view when returning from edit screen
        accountTableView.reloadData()
    }
}

extension AccountViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        return Section.allCases.count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return Section(rawValue: section)?.items.count ?? 0
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return Section(rawValue: section)?.title
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .value1, reuseIdentifier: "AccountCell")
        
        guard let section = Section(rawValue: indexPath.section) else {
            return cell
        }
        
        let item = section.items[indexPath.row]
        var config = cell.defaultContentConfiguration()
        config.text = item.title
        config.textProperties.font = Utils.regularFont(size: 16)
        
        // Get value using the method that takes user parameter
        let value = user.flatMap { item.value(for: $0) } ?? "-"
        config.secondaryText = value
        config.secondaryTextProperties.font = Utils.regularFont(size: 14)
        config.secondaryTextProperties.color = .secondaryLabel
        
        // Enable selection for links to allow copying
        if item == .affiliateLink || item == .publicProductLink {
            cell.selectionStyle = .default
            cell.accessoryType = .none
        } else {
            cell.selectionStyle = .none
        }
        
        cell.contentConfiguration = config
        
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        guard let section = Section(rawValue: indexPath.section),
              let user = user else {
            return
        }
        
        let item = section.items[indexPath.row]
        
        // Handle link copying
        if item == .affiliateLink, let link = user.affiliateLink {
            copyToClipboard(text: link, label: "Affiliate Link".localized())
        } else if item == .publicProductLink, let link = user.publicProductLink {
            copyToClipboard(text: link, label: "Public Product Link".localized())
        }
    }
    
    private func copyToClipboard(text: String, label: String) {
        UIPasteboard.general.string = text
        // Show toast or alert
        let alert = UIAlertController(
            title: nil,
            message: "\(label) copied to clipboard".localized(),
            preferredStyle: .alert
        )
        present(alert, animated: true)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            alert.dismiss(animated: true)
        }
    }
} 
