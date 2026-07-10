//
//  SaleViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/25/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import QRCodeReader
import AudioToolbox
import SnapKit

enum OrderSortType: Int {
    case book_date
    case get_date

    /// Default for rent order lists: sort by pickup/rental date (Ngày thuê).
    static let rentDefault: OrderSortType = .get_date
}

class SaleViewController : BaseViewControler{
    // MARK: - UI Components
    private var tbv: UITableView!
    private lazy var searchSectionView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        return view
    }()

    private lazy var searchBar: UISearchBar = {
        let searchBar = UISearchBar()
        searchBar.delegate = self
        searchBar.backgroundColor = .clear
        searchBar.searchBarStyle = .minimal
        searchBar.setBackgroundImage(UIImage(), for: .any, barMetrics: .default)
        searchBar.placeholder = "Order number, name, phone number...".localized()
        searchBar.placeholderLabel?.font = Utils.regularFont(size: 16)
        searchBar.placeholderLabel?.textColor = .textTertiary
        searchBar.textField?.textColor = .textPrimary
        searchBar.textField?.font = Utils.boldFont(size: 16)
        searchBar.tintColor = .brandPrimary

        let searchTextField = searchBar.searchTextField
        searchTextField.backgroundColor = .backgroundCard
        searchTextField.layer.cornerRadius = 12
        searchTextField.layer.masksToBounds = true
        searchTextField.layer.borderWidth = 1
        searchTextField.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.9).cgColor
        searchTextField.leftView?.tintColor = .textSecondary
        searchTextField.clearButtonMode = .whileEditing
        
        // Configure text input traits
        searchBar.searchTextField.autocorrectionType = .no
        searchBar.searchTextField.autocapitalizationType = .none
        searchBar.searchTextField.spellCheckingType = .no
        searchBar.searchTextField.smartDashesType = .no
        searchBar.searchTextField.smartQuotesType = .no
        searchBar.searchTextField.smartInsertDeleteType = .no
        
        return searchBar
    }()
    
    var user : User?
    
    // MARK: - ViewModel
    private let viewModel = OrderListViewModel.shared
    
    lazy var readerVC: QRCodeReaderViewController = {
        let builder = QRCodeReaderViewControllerBuilder {
            $0.reader = QRCodeReader(metadataObjectTypes: [.code128], captureDevicePosition: .back)
        }
        
        return QRCodeReaderViewController(builder: builder)
    }()
    
    var sortType: OrderSortType = .rentDefault {
        didSet {
            // Removed automatic loadOrders call - will be called explicitly when needed
        }
    }
    
    var sortOrder: String? = "desc" {
        didSet {
            // Removed automatic loadOrders call - will be called explicitly when needed
        }
    }
    
    var selectedOrderType: OrderType = .rent
    
    var selectedStatus: OrderStatus? = nil {
        didSet {
            // Update filter button icon when status changes
            updateFilterButtonIcon()
            // Removed automatic loadOrders call - will be called explicitly in didApplyFilter
        }
    }
    
    var font : CGFloat {
        if UIDevice.current.userInterfaceIdiom == .pad{
             return CGFloat(15)
        }else{
             return CGFloat(13)
            
        }
    }
    
    

    // Search state properties
    private var currentSearchText: String = ""
    private lazy var searchDebouncer = DebounceManager(delay: 0.7)
    private var isSearching = false {
        didSet{
            if isSearching == false{
                self.searchBar.text = nil
                self.searchBar.showsCancelButton = false
                self.currentSearchText = ""

                self.configPullToRefresh(tableview: self.tbv)
                self.resetPaginationAndReload()
            }else{
                self.searchBar.showsCancelButton = true
                self.stopPullToRefresh()
                // Don't reload orders when starting search, let searchBar textDidChange handle it
            }
        }
    }
    
    private lazy var sortButton: UIButton = {
        let button = UIButton(type: .system)
        button.addTarget(self, action: #selector(filterButtonTapped), for: .touchUpInside)
        button.tintColor = .textPrimary
        
        // Set initial icon directly (don't call updateFilterButtonIcon() here to avoid infinite loop)
        let config = UIImage.SymbolConfiguration(pointSize: 17, weight: .medium)
        let filterImage = UIImage(systemName: "line.3.horizontal.decrease", withConfiguration: config)
        button.setImage(filterImage, for: .normal)
        
        return button
    }()
    
    private func updateFilterButtonIcon() {
        let config = UIImage.SymbolConfiguration(pointSize: 17, weight: .medium)
        let iconName = "line.3.horizontal.decrease"
        let filterImage = UIImage(systemName: iconName, withConfiguration: config)
        sortButton.setImage(filterImage, for: .normal)
        sortButton.tintColor = (selectedStatus != nil) ? .brandPrimary : .textPrimary
    }
    
    private lazy var barcodeButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 18, weight: .regular)
        button.setImage(UIImage(systemName: "barcode.viewfinder", withConfiguration: config), for: .normal)
        button.tintColor = .textPrimary
        button.addTarget(self, action: #selector(barcode), for: .touchUpInside)
        return button
    }()
    
    private lazy var segmentedControl: UISegmentedControl = {
        let items = ["Rent".localized(), "Sale".localized()]
        let segmentedControl = UISegmentedControl(items: items)
        segmentedControl.selectedSegmentIndex = 0 // Default to Rent
        segmentedControl.addTarget(self, action: #selector(segmentedControlChanged), for: .valueChanged)
        segmentedControl.backgroundColor = UIColor.backgroundSecondary.withAlphaComponent(0.92)
        segmentedControl.selectedSegmentTintColor = .brandPrimary
        segmentedControl.layer.cornerRadius = 16
        segmentedControl.layer.masksToBounds = true
        segmentedControl.translatesAutoresizingMaskIntoConstraints = false
        segmentedControl.snp.makeConstraints { make in
            make.width.equalTo(UIDevice.current.userInterfaceIdiom == .pad ? 244 : 180)
            make.height.equalTo(40)
        }

        // Set text attributes for different states
        let fontSize: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 16 : 14
        let selectedAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.textInverted,
            .font: Utils.boldFont(size: fontSize)
        ]

        let normalAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: APP_TEXT_COLOR,
            .font: Utils.regularFont(size: fontSize)
        ]
        
        segmentedControl.setTitleTextAttributes(selectedAttributes, for: .selected)
        segmentedControl.setTitleTextAttributes(normalAttributes, for: .normal)
        segmentedControl.setContentPositionAdjustment(UIOffset(horizontal: 0, vertical: -1), forSegmentType: .any, barMetrics: .default)
        
        return segmentedControl
    }()
    
    private lazy var segmentedControlItem: UIBarButtonItem = {
        return UIBarButtonItem(customView: segmentedControl)
    }()
    
    override func startRefresh(_ sender: Any) {
        viewModel.loadOrders(
            filter: selectedOrderType,
            sort: sortType,
            sortOrder: sortOrder ?? "desc",
            status: selectedStatus,
            keyword: isSearching ? currentSearchText : nil,
            isRefreshing: true
        )
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Set ViewModel delegate
        viewModel.delegate = self
        setupNavigationBar()
        setupUI()
        setupData()
        
        // Update filter button icon after view is loaded (sortButton is now initialized)
        updateFilterButtonIcon()
    }
    
    override func setupUI() {
        super.setupUI()
        
        // Sort button is now handled by filterButtonTapped
        
        // Create and configure table view
        tbv = UITableView(frame: .zero, style: .plain)
        tbv.delegate = self
        tbv.dataSource = self
        tbv.contentInset = .zero
        tbv.backgroundColor = .backgroundPrimary
        tbv.separatorStyle = .none // Bỏ separator giữa các cells
        if #available(iOS 15.0, *) {
            tbv.sectionHeaderTopPadding = 0
        }
        tbv.sectionHeaderHeight = 56
        tbv.tableFooterView = UIView(frame: .zero)
        tbv.register(SaleDetailCell_Option5.self, forCellReuseIdentifier: "SaleDetailCell")
        
        // Set row height for Option 5 (Clean Border style)
        let isIPad = UIDevice.current.userInterfaceIdiom == .pad
        tbv.rowHeight = UITableViewAutomaticDimension
        tbv.estimatedRowHeight = isIPad ? 132 : 118
        tbv.contentInset = UIEdgeInsets(top: 10, left: 0, bottom: 18, right: 0)
        
        // Configure search bar
        searchBar.frame = CGRect(x: 0, y: 0, width: view.bounds.width, height: 52)
        searchBar.sizeToFit()
        
        // Add subviews in order: search bar, then table view
        view.addSubview(searchSectionView)
        searchSectionView.addSubview(searchBar)
        view.addSubview(tbv)
        view.backgroundColor = .backgroundPrimary
        
        // Setup constraints
        tbv.translatesAutoresizingMaskIntoConstraints = false
        
        guard let customNavBar = customNavBar else { return }
        
        // Setup search bar constraints - below navigation bar
        searchSectionView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(72)
        }

        searchBar.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.bottom.equalToSuperview().offset(-10)
        }
        
        // Setup table view constraints
        tbv.snp.makeConstraints { make in
            make.top.equalTo(searchSectionView.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalToSuperview()
        }
        
        // Adjust content inset to account for navigation bar
        tbv.contentInsetAdjustmentBehavior = .automatic
        
        // Pull-to-refresh must be attached explicitly on initial load.
        // Previously this happened indirectly via isSearching.didSet,
        // but that path no longer runs after fixing the loading indicator flow.
        configPullToRefresh(tableview: tbv)
    }

    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        // Create navBar first when using customTitleView
        let navBar = RCCustomNavigationBar()
        // Pass empty string instead of nil to ensure title label is properly initialized
        // This prevents left/right buttons from collapsing when using customTitleView
        // Set titleCentered: false to align segment control to the left
        setupCustomNavigationBar(
            navBar,
            title: " ",
            statusBarBackgroundColor: .white,
            titleCentered: false,
            customTitleView: segmentedControl,
            hideBackButton: true,
            backAction: .pop
        )
        
        // Add right buttons - add sort button only if rent is selected (default)
        // Use fixed size for icon-only buttons (44x44 is standard for navigation bar buttons)
        navBar.addRightButton(barcodeButton, size: CGSize(width: 44, height: 44))
        if selectedOrderType == .rent {
            navBar.addRightButton(sortButton, size: CGSize(width: 44, height: 44))
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
        
        // Check if ViewModel needs refresh
        if viewModel.needsRefresh {
            viewModel.refreshOrders(
                filter: selectedOrderType,
                sort: sortType,
                sortOrder: sortOrder ?? "desc",
                status: selectedStatus,
                keyword: isSearching ? currentSearchText : nil
            )
        }
    }
    
    override func setupData() {
        // isSearching is already false by default.
        // Do not assign it here because its didSet triggers a refresh flow,
        // which would skip the initial full-screen loading indicator.
        // Initial load should use .loading state (not .refreshing) to show progress indicator.
        viewModel.loadOrders(
            filter: selectedOrderType,
            sort: sortType,
            sortOrder: sortOrder ?? "desc",
            status: selectedStatus,
            keyword: nil,
            isRefreshing: false
        )
    }
    
    private func resetPaginationAndReload() {
        viewModel.loadOrders(
            filter: selectedOrderType,
            sort: sortType,
            sortOrder: sortOrder ?? "desc",
            status: selectedStatus,
            keyword: isSearching ? currentSearchText : nil,
            isRefreshing: true
        )
        searchDebouncer.cancel()
    }
    
    func reloadOrders(){
        // Reload orders from API with current filters and sorting
        viewModel.loadOrders(
            filter: selectedOrderType,
            sort: sortType,
            sortOrder: sortOrder ?? "desc",
            status: selectedStatus,
            keyword: isSearching ? currentSearchText : nil,
            isRefreshing: true
        )
    }
    
    private func applySearch(_ searchText: String) {
        let trimmedText = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        
        print("🔍 applySearch called with: '\(trimmedText)', count: \(trimmedText.count)")
        
        // If search text is less than 2 characters (or empty), clear search
        if trimmedText.isEmpty || trimmedText.count < 2 {
            if isSearching {
                // Cancel search and reload all orders
                currentSearchText = ""
                isSearching = false
                searchBar.resignFirstResponder() // Dismiss keyboard
                viewModel.loadOrders(
                    filter: selectedOrderType,
                    sort: sortType,
                    sortOrder: sortOrder ?? "desc",
                    status: selectedStatus,
                    keyword: nil,
                    isRefreshing: true
                )
            }
            return
        }
        
        // Only search if 2 or more characters
        // IMPORTANT: Set isSearching to true and currentSearchText before reloading
        isSearching = true
        currentSearchText = trimmedText
        print("✅ Setting currentSearchText to: '\(currentSearchText)', isSearching: \(isSearching)")
        // Apply filters (sortType, sortOrder, status) when searching
        viewModel.loadOrders(
            filter: selectedOrderType,
            sort: sortType,
            sortOrder: sortOrder ?? "desc",
            status: selectedStatus,
            keyword: trimmedText,
            isRefreshing: true
        )
    }
    
    func reloadTableView(){
        // Table view will be reloaded via delegate callback
        // This method kept for backward compatibility but may not be needed
    }
    
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(true)
        
        // Restore search state if exists
        if !currentSearchText.isEmpty {
            searchBar.text = currentSearchText
            isSearching = true
            applySearch(currentSearchText)
        }
    }
    
    // MARK: - Filter Button
    @objc private func filterButtonTapped() {
        let filterVC = OrderFilterViewController.instance()
        filterVC.delegate = self
        filterVC.initialSortType = sortType
        filterVC.initialOrderType = selectedOrderType
        filterVC.initialStatus = selectedStatus
        
        present(filterVC, animated: true)
    }
    
    @objc private func barcode(_ sender: Any) {
        // By using the delegate pattern
        readerVC.delegate = self
        
        // Presents the readerVC as modal form sheet
        readerVC.modalPresentationStyle = .formSheet
        present(readerVC, animated: true, completion: nil)
    }
    
    @objc private func segmentedControlChanged(_ sender: UISegmentedControl) {
        let newOrderType: OrderType = sender.selectedSegmentIndex == 0 ? .rent : .sale
        
        // Only reload if order type actually changed
        guard newOrderType != selectedOrderType else { return }
        
        selectedOrderType = newOrderType
        
        // Hide/show sort button based on order type
        guard let customNavBar = customNavBar else { return }
        if selectedOrderType == .sale {
            // Hide sort button for sale orders
            customNavBar.removeRightButton(sortButton)
        } else {
            // Show sort button for rent orders - remove first to avoid duplicates
            customNavBar.removeRightButton(sortButton)
            customNavBar.addRightButton(sortButton, size: CGSize(width: 44, height: 44))
        }
        
        // Explicitly reload orders when order type changes (use refreshing state)
        viewModel.loadOrders(
            filter: selectedOrderType,
            sort: sortType,
            sortOrder: sortOrder ?? "desc",
            status: selectedStatus,
            keyword: nil,
            isRefreshing: true
        )
    }
    

    @IBAction func sort(_ sender: UIButton) {
//        if sender == btBookDate{
//            self.sortType = .book_date
//        }else if sender == btGetDate{
//            self.sortType = .get_date
//        }else if sender == btStatus{
//            self.sortType = .status
//        }
    }
    
    @IBAction func deleteOrder(_ sender: Any) {
    
    }
    
    // MARK: - Print Methods
    func printOrder(_ order: Order) {
        let printMethod = Utils.loadPrintMethod()
        
        if printMethod == "bluetooth" {
            printOrderViaBluetooth(order)
        } else {
            printOrderViaNetwork(order)
        }
    }
    
    private func printOrderViaBluetooth(_ order: Order) {
        // Check if Bluetooth printer is connected
        if let savedPrinterInfo = Utils.loadBluetoothPrinter() {
            // Bluetooth printer is configured, use PrinterManager
            PrinterManager.shared.printOrder(order) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success:
                        self.showPrintSuccessAlert()
                    case .failure(let error):
                        self.showPrintErrorAlert(error: error)
                    }
                }
            }
        } else {
            // No Bluetooth printer configured
            showBluetoothPrinterNotConfiguredAlert()
        }
    }
    
    private func printOrderViaNetwork(_ order: Order) {
        let ipAddress = Utils.loadBillPrinter()
        
        if ipAddress.isEmpty || ipAddress == "192.168.1.199" {
            // No network printer configured or using default IP
            showNetworkPrinterNotConfiguredAlert()
            return
        }
        
        // Use PrinterManager for network printing
        PrinterManager.shared.printOrder(order) { result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    self.showPrintSuccessAlert()
                case .failure(let error):
                    self.showPrintErrorAlert(error: error)
                }
            }
        }
    }
    
    private func showPrintSuccessAlert() {
        let alert = UIAlertController(
            title: "Print Success".localized(),
            message: "Order has been sent to printer successfully".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
    
    private func showPrintErrorAlert(error: Error) {
        let alert = UIAlertController(
            title: "Print Error".localized(),
            message: "Failed to print order: \(error.localizedDescription)".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
    
    private func showBluetoothPrinterNotConfiguredAlert() {
        let alert = UIAlertController(
            title: "Bluetooth Printer Not Configured".localized(),
            message: "Please configure a Bluetooth printer in Settings > Printer Configuration".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Configure Now".localized(), style: .default) { _ in
            self.navigateToPrinterConfiguration()
        })
        present(alert, animated: true)
    }
    
    private func showNetworkPrinterNotConfiguredAlert() {
        let alert = UIAlertController(
            title: "Network Printer Not Configured".localized(),
            message: "Please configure a network printer IP address in Settings > Printer Configuration".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Configure Now".localized(), style: .default) { _ in
            self.navigateToPrinterConfiguration()
        })
        present(alert, animated: true)
    }
    
    private func navigateToPrinterConfiguration() {
        let printerVC = PrinterConfigurationViewController()
        navigationController?.pushViewController(printerVC, animated: true)
    }
}

extension SaleViewController : UITableViewDataSource, UITableViewDelegate{
    func numberOfSections(in tableView: UITableView) -> Int {
        return 1
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return viewModel.orders.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "SaleDetailCell", for: indexPath) as! SaleDetailCell_Option5
        let orders = viewModel.orders
        guard indexPath.row < orders.count else { return cell }
        
        cell.bind(order: orders[indexPath.row], sortType: self.sortType)
        
        // Option 5 has subtle border for visual separation, no need for alternating backgrounds
        cell.backgroundColor = .clear
        
        // Load more data when scrolling near the end
        if indexPath.row >= orders.count - 5 && viewModel.canLoadMore && !isSearching {
            viewModel.loadMoreOrders(
                filter: selectedOrderType,
                sort: sortType,
                sortOrder: sortOrder ?? "desc",
                status: selectedStatus,
                keyword: isSearching ? currentSearchText : nil
            )
        }
        
        return cell
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let orders = viewModel.orders
        guard indexPath.row < orders.count else { return }
        
        let order = orders[indexPath.row]
        let orderViewController = PreviewViewController(order: order)
        orderViewController.hidesBottomBarWhenPushed = true
        orderViewController.delegate = self // Set delegate to reload orders after update
        self.navigationController?.pushViewController(orderViewController, animated: true)
    }
    
    func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        return true
    }
    
    func tableView(_ tableView: UITableView, canPerformAction action: Selector, forRowAt indexPath: IndexPath, withSender sender: Any?) -> Bool {
        return true
    }
    
    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        
        let orders = viewModel.orders
        guard indexPath.row < orders.count else { return nil }
        
        let order = orders[indexPath.row]
        // No need to reload product model for new API Order
        print (order)
        let updateContext = UIContextualAction(style: .normal, title: "Update Order".localized().uppercased()) {  (contextualAction, view, boolValue) in
            if let tabbarController = appDelegate.window?.rootViewController as? TabbarViewController{
                // Create a copy of the order for editing
                // Convert Order API model to Cart
                let cart = Cart.fromOrder(order)
                
                // Ensure cart customer has complete information (including id)
                if var cartCustomer = cart.customer {
                    cartCustomer.id = order.customerId
                    cartCustomer.customer_id = order.customerId
                    cart.customer = cartCustomer
                }
                
                CartStore.shared.replaceCart(with: cart)
                tabbarController.selectedIndex = 0
                
                // Find MainViewController in the navigation stack to update cart badge and reload cart
                if let navigationController = tabbarController.viewControllers?.first as? UINavigationController {
                    for viewController in navigationController.viewControllers {
                        if let mainVC = viewController as? MainViewController {
                            mainVC.updateCartBadge()
                            break
                        }
                    }
                }
                
                // Log order update event
                FirebaseManager.shared.logOrderUpdated(
                    orderId: String(order.id),
                    totalAmount: order.totalAmount
                )
            }
        }
        let swipeActions = UISwipeActionsConfiguration(actions: [updateContext])
        
        updateContext.backgroundColor = UIColor.systemGray
        
        // Only allow editing for outlet admin
        if User.account()?.role == .admin
            || User.account()?.role == .outletAdmin
            || User.account()?.role == .merchant  {
            // For RENT orders: allow editing if status is RESERVED
            if order.orderType == .rent && order.status == .reserved {
                return swipeActions
            }
            
            // For SALE orders: allow editing if status is COMPLETED
            if order.orderType == .sale && order.status == .completed {
                return swipeActions
            }
        }
        
        return nil
    }
    
    // Add UITableView delegate method for sticky header
    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
//        let headerView = SaleHeaderView(frame: CGRect(x: 0, y: 0, width: tableView.bounds.width, height: 44), 
//                                      layout: .sale,
//                                      sortable: selectedOrderType == .rent)
//        
//        // Only set sort type for rent orders, since sale orders always sort by created date
//        if selectedOrderType == .rent {
//            headerView.sortType = self.sortType
//        } else {
//            // For sale orders, always show book date as bold (created date)
//            headerView.sortType = .book_date
//        }
//        
//        return headerView
        return nil
    }
    
    // Ensure header height is consistent
    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        return 0
    }
    
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        // Use automatic dimension for card style
        return UITableViewAutomaticDimension
    }
}

extension SaleViewController: UISearchBarDelegate {
    func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
        self.isSearching = true
    }
    
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        // Just update currentSearchText when typing, don't trigger search yet
        // Search will only be triggered when user taps search button
        currentSearchText = searchText
    }

    func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
        searchDebouncer.cancel()
        searchBar.resignFirstResponder()
        isSearching = false
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        self.searchBar.resignFirstResponder()
        // Trigger search when user taps search button
        applySearch(currentSearchText)
    }
}

extension SaleViewController : PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        // Listen for order updates and reload order list
        print("📢 didCompleteOrder called with order: \(updatedOrder?.orderNumber ?? "nil")")
        
        if let order = updatedOrder {
            // Update order in ViewModel (will notify delegate automatically)
            viewModel.updateOrder(order)
        } else {
            // If no order provided (e.g., new order created), set flag for refresh
            print("🔄 Setting refresh flag after create/update (no order data provided)...")
            viewModel.setNeedsRefresh()
        }
    }
}

// MARK: - OrderListViewModelDelegate
extension SaleViewController: OrderListViewModelDelegate {
    func didUpdateOrders(_ orders: [Order]) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.tbv.reloadData()
            print("✅ SaleViewController - Table view reloaded with \(orders.count) orders")
        }
    }
    
    func didUpdateLoadingState(_ isLoading: Bool) {
        print("🔄 SaleViewController - didUpdateLoadingState called: isLoading=\(isLoading), shouldShowProgress=\(viewModel.shouldShowProgress), isRefreshing=\(viewModel.isRefreshing)")
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            if isLoading {
                // Show progress for initial load (not for load more or refresh)
                // Simple logic: show if not refreshing (refreshing uses pull-to-refresh indicator)
                let isRefreshing = self.viewModel.isRefreshing
                let shouldShow = !isRefreshing
                
                print("🔍 SaleViewController - shouldShow check: \(shouldShow), isRefreshing: \(isRefreshing), shouldShowProgress: \(self.viewModel.shouldShowProgress)")
                
                if shouldShow {
                    // Show immediately - view should be ready in viewDidLoad
                    print("✅ SaleViewController - Showing progress indicator")
                    self.showProgressText(text: "Loading...".localized())
                } else {
                    print("⏭️ SaleViewController - Skipping progress (isRefreshing: true, pull-to-refresh handles it)")
                }
            } else {
                print("🛑 SaleViewController - Hiding progress indicator")
                self.hideProgress()
                // Always end refresh when loading is done
                    self.endRefresh()
            }
        }
    }
    
    func didShowError(_ error: Error) {
        DispatchQueue.main.async { [weak self] in
            UIAlertController.errorAlert(parent: self, error: error)
        }
    }
    
    func didUpdatePagination(hasMore: Bool, currentPage: Int) {
        // Pagination state updated - can be used for UI indicators if needed
        print("📦 SaleViewController - Pagination updated - HasMore: \(hasMore), Page: \(currentPage)")
    }
}

// MARK: - OrderFilterViewControllerDelegate
extension SaleViewController: OrderFilterViewControllerDelegate {
    func didApplyFilter(sortType: OrderSortType, sortOrder: String?, status: OrderStatus?, sender: OrderFilterViewController) {
        // Update properties
        self.sortType = sortType
        self.sortOrder = sortOrder ?? "desc" // Default to desc if nil
        self.selectedStatus = status
        
        print("🔍 SaleViewController - didApplyFilter called - Sort: \(sortType), SortOrder: \(sortOrder ?? "desc"), Status: \(selectedStatus?.rawValue ?? "nil")")
        
        // Call refresh function exactly like pull refresh with selected parameters
        // This ensures proper table view reload behavior
        startRefresh(self)
    }
    
    func didClearFilter(sender: OrderFilterViewController) {
        // Reset to defaults
        self.sortType = .rentDefault
        self.sortOrder = "desc"
        self.selectedStatus = nil
        
        // Call refresh function exactly like pull refresh with default parameters
        startRefresh(self)
    }
}

extension SaleViewController : QRCodeReaderViewControllerDelegate{
    func readerDidCancel(_ reader: QRCodeReaderViewController) {
        dismiss(animated: true, completion: nil)
    }
    
    func reader(_ reader: QRCodeReaderViewController, didScanResult result: QRCodeReaderResult) {
        reader.stopScanning()
        
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        AudioServicesPlaySystemSound(1016)
        
        self.dismiss(animated: true, completion: { [self] in
            if  result.value.count >= 2{
                applySearch(String(result.value.suffix(5)))
            }
        })
    }
}
