import UIKit
import SnapKit

// MARK: - Protocols & Enums
protocol ExportItem {
    var title: String { get }
}

enum ExportPeriod: String, CaseIterable, ExportItem {
    case oneMonth = "1month"
    case threeMonths = "3months"
    case sixMonths = "6months"
    case oneYear = "1year"
    case custom = "custom"
    
    var title: String {
        switch self {
        case .oneMonth: return "Last 1 Month".localized()
        case .threeMonths: return "Last 3 Months".localized()
        case .sixMonths: return "Last 6 Months".localized()
        case .oneYear: return "Last 1 Year".localized()
        case .custom: return "Custom Range".localized()
        }
    }
    
    var apiValue: String {
        return self.rawValue
    }
}

enum ExportFormat: String, CaseIterable, ExportItem {
    case excel = "excel"
    case csv = "csv"
    
    var title: String {
        switch self {
        case .excel: return "Excel (.xlsx)".localized()
        case .csv: return "CSV (.csv)".localized()
        }
    }
    
    var apiValue: String {
        return self.rawValue
    }
    
    var fileExtension: String {
        switch self {
        case .excel: return "xlsx"
        case .csv: return "csv"
        }
    }
}

enum ExportType: Int, CaseIterable, ExportItem {
    case products
    case orders
    case customers
    
    var title: String {
        switch self {
        case .products: return "Products".localized()
        case .orders: return "Orders".localized()
        case .customers: return "Customers".localized()
        }
    }
    
    var icon: UIImage? {
        switch self {
        case .products:
            return UIImage(systemName: "cube.box.fill")
        case .orders:
            return UIImage(systemName: "doc.text.fill")
        case .customers:
            return UIImage(systemName: "person.2.fill")
        }
    }
}

enum OrderStatusFilter: String, CaseIterable, ExportItem {
    case all = ""
    case reserved = "RESERVED"
    case pickuped = "PICKUPED"
    case returned = "RETURNED"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
    
    var title: String {
        switch self {
        case .all: return "All Statuses".localized()
        case .reserved: return "Reserved".localized()
        case .pickuped: return "Picked Up".localized()
        case .returned: return "Returned".localized()
        case .completed: return "Completed".localized()
        case .cancelled: return "Cancelled".localized()
        }
    }
}

enum OrderTypeFilter: String, CaseIterable, ExportItem {
    case all = ""
    case rent = "RENT"
    case sale = "SALE"
    
    var title: String {
        switch self {
        case .all: return "All Types".localized()
        case .rent: return "Rent".localized()
        case .sale: return "Sale".localized()
        }
    }
}

enum OrderDateField: String, CaseIterable, ExportItem {
    case createdAt = "createdAt"
    case pickupPlanAt = "pickupPlanAt"
    case returnPlanAt = "returnPlanAt"
    
    var title: String {
        switch self {
        case .createdAt: return "Created Date".localized()
        case .pickupPlanAt: return "Pickup Date".localized()
        case .returnPlanAt: return "Return Date".localized()
        }
    }
}

enum ExportSection: Int, CaseIterable {
    case type
    case period
    case format
    case customDates
    case orderFilters
    
    var title: String? {
        switch self {
        case .type: return "Export Type".localized()
        case .period: return "Time Period".localized()
        case .format: return "File Format".localized()
        case .customDates: return "Date Range".localized()
        case .orderFilters: return "Order Filters".localized()
        }
    }
    
    var items: [ExportItem] {
        switch self {
        case .type: return ExportType.allCases
        case .period: return ExportPeriod.allCases
        case .format: return ExportFormat.allCases
        case .customDates: return []
        case .orderFilters: return []
        }
    }
}

class ExportViewController: BaseViewControler {
    // MARK: - UI Components
    private lazy var exportButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Export".localized(), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 17)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.addTarget(self, action: #selector(exportTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var exportTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.translatesAutoresizingMaskIntoConstraints = false
        return table
    }()
    
    // MARK: - Properties
    private var selectedType: ExportType?
    private var selectedPeriod: ExportPeriod = .oneMonth
    private var selectedFormat: ExportFormat = .excel
    private var customStartDate: Date?
    private var customEndDate: Date?
    private var selectedOrderStatus: OrderStatusFilter = .all
    private var selectedOrderType: OrderTypeFilter = .all
    private var selectedDateField: OrderDateField = .createdAt
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    // MARK: - Setup
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Export Data".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
        navBar.addRightButton(exportButton)
    }
    
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        guard let customNavBar = customNavBar else { return }
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        if isIPad {
            // For iPad - Fixed width centered container
            let containerView = UIView()
            containerView.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(containerView)
            containerView.addSubview(exportTableView)
            
            NSLayoutConstraint.activate([
                // Container constraints
                containerView.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
                containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                containerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                containerView.widthAnchor.constraint(equalToConstant: 600),
                
                // TableView constraints within container
                exportTableView.topAnchor.constraint(equalTo: containerView.topAnchor),
                exportTableView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
                exportTableView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
                exportTableView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
            ])
        } else {
            // For iPhone - Edge to edge
            view.addSubview(exportTableView)
            NSLayoutConstraint.activate([
                exportTableView.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
                exportTableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                exportTableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                exportTableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
        }
    }
    
    // MARK: - Helper Methods
    
    private func getDateRangeForPeriod(_ period: ExportPeriod) -> (startDate: Date, endDate: Date) {
        let endDate = Date()
        let calendar = Calendar.current
        var startDate = endDate
        
        switch period {
        case .oneMonth:
            startDate = calendar.date(byAdding: .month, value: -1, to: endDate) ?? endDate
        case .threeMonths:
            startDate = calendar.date(byAdding: .month, value: -3, to: endDate) ?? endDate
        case .sixMonths:
            startDate = calendar.date(byAdding: .month, value: -6, to: endDate) ?? endDate
        case .oneYear:
            startDate = calendar.date(byAdding: .year, value: -1, to: endDate) ?? endDate
        case .custom:
            startDate = customStartDate ?? endDate
        }
        
        // Set time to start/end of day
        let startOfDay = calendar.startOfDay(for: startDate)
        let endOfDay = calendar.date(bySettingHour: 23, minute: 59, second: 59, of: endDate) ?? endDate
        
        return (startOfDay, endOfDay)
    }
    
    private func showDatePicker(isStartDate: Bool) {
        let datePicker = UIDatePicker()
        datePicker.datePickerMode = .date
        datePicker.preferredDatePickerStyle = .wheels
        if #available(iOS 14.0, *) {
            datePicker.preferredDatePickerStyle = .inline
        }
        
        if isStartDate {
            datePicker.date = customStartDate ?? Date()
            datePicker.maximumDate = customEndDate ?? Date()
        } else {
            datePicker.date = customEndDate ?? Date()
            datePicker.maximumDate = Date()
            if let startDate = customStartDate {
                datePicker.minimumDate = startDate
            }
        }
        
        let alert = UIAlertController(
            title: isStartDate ? "Select Start Date".localized() : "Select End Date".localized(),
            message: nil,
            preferredStyle: .actionSheet
        )
        
        alert.view.addSubview(datePicker)
        datePicker.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            datePicker.topAnchor.constraint(equalTo: alert.view.topAnchor, constant: 60),
            datePicker.leadingAnchor.constraint(equalTo: alert.view.leadingAnchor),
            datePicker.trailingAnchor.constraint(equalTo: alert.view.trailingAnchor),
            datePicker.heightAnchor.constraint(equalToConstant: 200)
        ])
        
        alert.addAction(UIAlertAction(title: "Done".localized(), style: .default) { [weak self] _ in
            if isStartDate {
                self?.customStartDate = datePicker.date
            } else {
                self?.customEndDate = datePicker.date
            }
            self?.exportTableView.reloadData()
        })
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        
        // For iPad
        if let popover = alert.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }
        
        present(alert, animated: true)
    }
    
    // MARK: - Actions
    @objc private func exportTapped() {
        guard let exportType = selectedType else {
            let alert = UIAlertController(
                title: "Error".localized(),
                message: "Please select an export type".localized(),
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
            present(alert, animated: true)
            return
        }
        
        // Validate custom date range if needed
        if selectedPeriod == .custom {
            guard let startDate = customStartDate, let endDate = customEndDate else {
                let alert = UIAlertController(
                    title: "Error".localized(),
                    message: "Please select start and end dates for custom range".localized(),
                    preferredStyle: .alert
                )
                alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
                present(alert, animated: true)
                return
            }
            
            if startDate >= endDate {
                let alert = UIAlertController(
                    title: "Error".localized(),
                    message: "Start date must be before end date".localized(),
                    preferredStyle: .alert
                )
                alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
                present(alert, animated: true)
                return
            }
            
            // Check max range (365 days)
            let days = Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 0
            if days > 365 {
                let alert = UIAlertController(
                    title: "Error".localized(),
                    message: "Date range cannot exceed 365 days".localized(),
                    preferredStyle: .alert
                )
                alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
                present(alert, animated: true)
                return
            }
        }
        
        let (startDate, endDate) = getDateRangeForPeriod(selectedPeriod)
        
        self.showProgressText(text: "Preparing export...".localized())
        
        // Call appropriate export API based on type
        switch exportType {
        case .products:
            exportProducts(period: selectedPeriod.apiValue, format: selectedFormat.apiValue, startDate: selectedPeriod == .custom ? customStartDate : startDate, endDate: selectedPeriod == .custom ? customEndDate : endDate)
        case .orders:
            exportOrders(
                period: selectedPeriod.apiValue,
                format: selectedFormat.apiValue,
                startDate: selectedPeriod == .custom ? customStartDate : startDate,
                endDate: selectedPeriod == .custom ? customEndDate : endDate,
                status: selectedOrderStatus.rawValue.isEmpty ? nil : selectedOrderStatus.rawValue,
                orderType: selectedOrderType.rawValue.isEmpty ? nil : selectedOrderType.rawValue,
                dateField: selectedDateField.rawValue
            )
        case .customers:
            exportCustomers(period: selectedPeriod.apiValue, format: selectedFormat.apiValue, startDate: selectedPeriod == .custom ? customStartDate : startDate, endDate: selectedPeriod == .custom ? customEndDate : endDate)
        }
    }
    
    private func exportProducts(period: String, format: String, startDate: Date?, endDate: Date?) {
        ProductService.shared.exportProducts(period: period, format: format, startDate: startDate, endDate: endDate) { [weak self] data, filename, error in
            guard let self = self else { return }
            
            if let error = error {
                self.hideProgress()
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            
            if let data = data {
                let finalFilename = filename ?? "products-export.\(self.selectedFormat.fileExtension)"
                self.saveAndShareFile(data: data, filename: finalFilename)
            }
        }
    }
    
    private func exportOrders(period: String, format: String, startDate: Date?, endDate: Date?, status: String?, orderType: String?, dateField: String?) {
        OrderService.shared.exportOrders(period: period, format: format, startDate: startDate, endDate: endDate, status: status, orderType: orderType, dateField: dateField) { [weak self] data, filename, error in
            guard let self = self else { return }
            
            if let error = error {
                self.hideProgress()
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            
            if let data = data {
                let finalFilename = filename ?? "orders-export.\(self.selectedFormat.fileExtension)"
                self.saveAndShareFile(data: data, filename: finalFilename)
            }
        }
    }
    
    private func exportCustomers(period: String, format: String, startDate: Date?, endDate: Date?) {
        CustomerService.shared.exportCustomers(period: period, format: format, startDate: startDate, endDate: endDate) { [weak self] data, filename, error in
            guard let self = self else { return }
            
            if let error = error {
                self.hideProgress()
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            
            if let data = data {
                let finalFilename = filename ?? "customers-export.\(self.selectedFormat.fileExtension)"
                self.saveAndShareFile(data: data, filename: finalFilename)
            }
        }
    }
    
    private func saveAndShareFile(data: Data, filename: String) {
        // Create temporary file URL
        let tempDirectoryURL = FileManager.default.temporaryDirectory
        let fileURL = tempDirectoryURL.appendingPathComponent(filename)
        
        do {
            // Write data to temporary file
            try data.write(to: fileURL)
            
            // Hide progress before showing share sheet
            self.hideProgress()
            
            // Share file using UIActivityViewController
            DispatchQueue.main.async {
                let activityViewController = UIActivityViewController(
                    activityItems: [fileURL],
                    applicationActivities: nil
                )
                
                // Configure for iPad
                if let popoverController = activityViewController.popoverPresentationController {
                    popoverController.sourceView = self.view
                    popoverController.sourceRect = CGRect(x: self.view.bounds.midX, y: self.view.bounds.midY, width: 0, height: 0)
                    popoverController.permittedArrowDirections = []
                }
                
                // Add completion handler to clean up file after sharing
                activityViewController.completionWithItemsHandler = { _, _, _, _ in
                    try? FileManager.default.removeItem(at: fileURL)
                }
                
                self.present(activityViewController, animated: true)
            }
            
        } catch {
            self.hideProgress()
            UIAlertController.errorAlert(parent: self, error: error)
        }
    }
}

// MARK: - UITableViewDataSource
extension ExportViewController: UITableViewDataSource {
    func numberOfSections(in tableView: UITableView) -> Int {
        var count = 3 // type, period, format
        
        // Show custom dates section if custom period is selected
        if selectedPeriod == .custom {
            count += 1
        }
        
        // Show order filters section if orders type is selected
        if selectedType == .orders {
            count += 1
        }
        
        return count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        let actualSection = getActualSection(for: section)
        
        switch actualSection {
        case .type: return ExportType.allCases.count
        case .period: return ExportPeriod.allCases.count
        case .format: return ExportFormat.allCases.count
        case .customDates: return 2 // Start date, End date
        case .orderFilters: return 3 // Status, Order Type, Date Field
        }
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        let actualSection = getActualSection(for: section)
        return actualSection.title
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .value1, reuseIdentifier: "Cell")
        let actualSection = getActualSection(for: indexPath.section)
        
        var config = cell.defaultContentConfiguration()
        
        switch actualSection {
        case .type:
            let type = ExportType.allCases[indexPath.row]
            config.text = type.title
            // Render icon with gray color directly
            if let icon = type.icon {
                config.image = icon.withTintColor(.systemGray, renderingMode: .alwaysOriginal)
            }
            cell.accessoryType = selectedType == type ? .checkmark : .none
            
        case .period:
            let period = ExportPeriod.allCases[indexPath.row]
            config.text = period.title
            cell.accessoryType = selectedPeriod == period ? .checkmark : .none
            
        case .format:
            let format = ExportFormat.allCases[indexPath.row]
            config.text = format.title
            cell.accessoryType = selectedFormat == format ? .checkmark : .none
            
        case .customDates:
            if indexPath.row == 0 {
                config.text = "Start Date".localized()
                config.secondaryText = customStartDate?.dateServerInString() ?? "Select".localized()
            } else {
                config.text = "End Date".localized()
                config.secondaryText = customEndDate?.dateServerInString() ?? "Select".localized()
            }
            cell.accessoryType = .disclosureIndicator
            
        case .orderFilters:
            if indexPath.row == 0 {
                config.text = "Status".localized()
                config.secondaryText = selectedOrderStatus.title
            } else if indexPath.row == 1 {
                config.text = "Order Type".localized()
                config.secondaryText = selectedOrderType.title
            } else {
                config.text = "Date Field".localized()
                config.secondaryText = selectedDateField.title
            }
            cell.accessoryType = .disclosureIndicator
        }
        
        cell.contentConfiguration = config
        return cell
    }
    
    private func getActualSection(for section: Int) -> ExportSection {
        var currentSection = 0
        
        // Type section (always visible)
        if section == currentSection { return .type }
        currentSection += 1
        
        // Period section (always visible)
        if section == currentSection { return .period }
        currentSection += 1
        
        // Format section (always visible)
        if section == currentSection { return .format }
        currentSection += 1
        
        // Custom dates section (conditional)
        if selectedPeriod == .custom {
            if section == currentSection { return .customDates }
            currentSection += 1
        }
        
        // Order filters section (conditional)
        if selectedType == .orders {
            if section == currentSection { return .orderFilters }
        }
        
        return .type // Fallback
    }
}

// MARK: - UITableViewDelegate
extension ExportViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let actualSection = getActualSection(for: indexPath.section)
        
        switch actualSection {
        case .type:
            if let type = ExportType(rawValue: indexPath.row) {
                selectedType = type
                tableView.reloadData()
            }
            
        case .period:
            let period = ExportPeriod.allCases[indexPath.row]
            selectedPeriod = period
            if period != .custom {
                customStartDate = nil
                customEndDate = nil
            }
            tableView.reloadData()
            
        case .format:
            let format = ExportFormat.allCases[indexPath.row]
            selectedFormat = format
            tableView.reloadSections(IndexSet(integer: indexPath.section), with: .none)
            
        case .customDates:
            showDatePicker(isStartDate: indexPath.row == 0)
            
        case .orderFilters:
            if indexPath.row == 0 {
                showOrderStatusPicker()
            } else if indexPath.row == 1 {
                showOrderTypePicker()
            } else {
                showDateFieldPicker()
            }
        }
    }
    
    private func showOrderStatusPicker() {
        let alert = UIAlertController(title: "Select Status".localized(), message: nil, preferredStyle: .actionSheet)
        
        for status in OrderStatusFilter.allCases {
            alert.addAction(UIAlertAction(title: status.title, style: .default) { [weak self] _ in
                self?.selectedOrderStatus = status
                self?.exportTableView.reloadData()
            })
        }
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        
        if let popover = alert.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }
        
        present(alert, animated: true)
    }
    
    private func showOrderTypePicker() {
        let alert = UIAlertController(title: "Select Order Type".localized(), message: nil, preferredStyle: .actionSheet)
        
        for orderType in OrderTypeFilter.allCases {
            alert.addAction(UIAlertAction(title: orderType.title, style: .default) { [weak self] _ in
                self?.selectedOrderType = orderType
                self?.exportTableView.reloadData()
            })
        }
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        
        if let popover = alert.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }
        
        present(alert, animated: true)
    }
    
    private func showDateFieldPicker() {
        let alert = UIAlertController(title: "Select Date Field".localized(), message: nil, preferredStyle: .actionSheet)
        
        for dateField in OrderDateField.allCases {
            alert.addAction(UIAlertAction(title: dateField.title, style: .default) { [weak self] _ in
                self?.selectedDateField = dateField
                self?.exportTableView.reloadData()
            })
        }
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        
        if let popover = alert.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
        }
        
        present(alert, animated: true)
    }
}
