import UIKit
import SnapKit

class AppInformationViewController: BaseViewControler {
    /// #459: new style, set by Settings v2 before the page is shown
    var v2 = false

    private lazy var appInformationViewControler: UITableView = {
        let table = UITableView(frame: .zero, style: v2 ? .plain : .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.translatesAutoresizingMaskIntoConstraints = false
        return table
    }()
    
    private enum Section: Int, CaseIterable {
        case info
        case legal
        case contact
        
        var title: String {
            switch self {
            case .info: return "App Information".localized()
            case .legal: return "Legal".localized()
            case .contact: return "Developer Contact".localized()
            }
        }
        
        var items: [InfoItem] {
            switch self {
            case .info: return [.version, .build]
            case .legal: return [.privacyPolicy, .termsOfService]
            case .contact: return [.email, .website]
            }
        }
    }
    
    private enum InfoItem {
        case version, build, privacyPolicy, termsOfService, email, website
        
        var title: String {
            switch self {
            case .version: return "Version".localized()
            case .build: return "Build".localized()
            case .privacyPolicy: return "Privacy Policy".localized()
            case .termsOfService: return "Terms of Service".localized()
            case .email: return "Email".localized()
            case .website: return "Website".localized()
            }
        }
        
        var value: String {
            switch self {
            case .version: return Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
            case .build: return Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
            case .privacyPolicy: return ""
            case .termsOfService: return ""
            case .email: return "trinhduc20@gmail.com"
            case .website: return AppLegalLinks.websiteHost
            }
        }
        
        var isClickable: Bool {
            switch self {
            case .privacyPolicy, .termsOfService, .email, .website:
                return true
            default:
                return false
            }
        }
        
        var url: URL? {
            switch self {
            case .privacyPolicy:
                return URL(string: AppLegalLinks.privacyURL)
            case .termsOfService:
                return URL(string: AppLegalLinks.termsURL)
            case .email:
                return URL(string: "mailto:trinhduc20@gmail.com")
            case .website:
                return URL(string: AppLegalLinks.websiteURL)
            default:
                return nil
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
    }
    
    override func setupUI() {
        if v2 {
            setupV2UI()
            return
        }
        view.backgroundColor = .backgroundPrimary
        
        // Setup custom navigation bar
        setupNavigationBar()

        guard let customNavBar = customNavBar else { return }
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        if isIPad {
            // For iPad - Fixed width centered container
            let containerView = UIView()
            containerView.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(containerView)
            containerView.addSubview(appInformationViewControler)
            
            NSLayoutConstraint.activate([
                // Container constraints
                containerView.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
                containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                containerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                containerView.widthAnchor.constraint(equalToConstant: 600), // Match settings width
                
                // TableView constraints within container
                appInformationViewControler.topAnchor.constraint(equalTo: containerView.topAnchor),
                appInformationViewControler.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
                appInformationViewControler.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
                appInformationViewControler.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
            ])
        } else {
            // For iPhone - Edge to edge
            view.addSubview(appInformationViewControler)
            NSLayoutConstraint.activate([
                appInformationViewControler.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
                appInformationViewControler.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                appInformationViewControler.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                appInformationViewControler.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
        }
    }
    
    private func setupV2UI() {
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "App Information".localized(), back: back)
        SettingsDetailV2.configureList(appInformationViewControler)
        view.addSubview(appInformationViewControler)
        appInformationViewControler.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
    }

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: "App Information".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
    }
}

extension AppInformationViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        return Section.allCases.count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return Section(rawValue: section)?.items.count ?? 0
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        return Section(rawValue: section)?.title
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        guard v2, let title = Section(rawValue: section)?.title else { return nil }
        return V2.sectionHeader(title)
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if v2, let section = Section(rawValue: indexPath.section) {
            let item = section.items[indexPath.row]
            let cell = tableView.dequeueReusableCell(withIdentifier: SettingsDetailV2Cell.reuseId, for: indexPath) as! SettingsDetailV2Cell
            cell.configure(title: item.title, value: item.value, accessory: item.isClickable ? .chevron : .none)
            return cell
        }
        let cell = UITableViewCell(style: .value1, reuseIdentifier: "InfoCell")
        
        guard let section = Section(rawValue: indexPath.section) else {
            return cell
        }
        
        let item = section.items[indexPath.row]
        var config = cell.defaultContentConfiguration()
        config.text = item.title
        config.textProperties.font = Utils.regularFont(size: 16)
        config.secondaryText = item.value
        config.secondaryTextProperties.font = Utils.regularFont(size: 14)
        config.secondaryTextProperties.color = .secondaryLabel
        cell.contentConfiguration = config
        
        // Set accessory type for clickable items
        if item.isClickable {
            cell.accessoryType = .disclosureIndicator
        }
        
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        guard let section = Section(rawValue: indexPath.section) else {
            return
        }
        
        let item = section.items[indexPath.row]
        
        if let url = item.url {
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
        }
    }
} 
