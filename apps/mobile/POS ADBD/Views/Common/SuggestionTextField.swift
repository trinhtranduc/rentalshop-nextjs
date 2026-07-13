//
//  SuggestionTextField.swift
//  POS ADBD
//
//  Created by Tran Trinh on 11/12/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

protocol SuggestionTextFieldDelegate: AnyObject {
    func didSelectCustomer(customer: Customer, sender: SuggestionTextField)
    func didAddNewCustomer(sender: SuggestionTextField)
    func didCreateCustomer(customer: Customer, sender: SuggestionTextField)
}

class SuggestionTextField: BaseViewControler {
    
    // MARK: - UI Components
    private lazy var searchBar: UISearchBar = {
        let searchBar = UISearchBar()
        searchBar.backgroundColor = .white
//        searchBar.backgroundImage = UIImage()
        searchBar.placeholder = "Search by customer name, phone".localized()
        searchBar.placeholderLabel?.font = Utils.regularFont(size: 16)
        searchBar.placeholderLabel?.textColor = .lightGray
        searchBar.textField?.textColor = APP_TEXT_COLOR
        searchBar.textField?.font = Utils.regularFont(size: 16)
        searchBar.delegate = self
        return searchBar
    }()
    
    private lazy var customerTableView: UITableView = {
        let tableView = UITableView()
        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(CustomerCell.self, forCellReuseIdentifier: "CustomerCell")
        tableView.tableHeaderView = UIView()
        tableView.tableFooterView = UIView()
        tableView.backgroundColor = .white
        return tableView
    }()
    
    private lazy var addCustomerButton: UIButton = {
        var config = UIButton.Configuration.filled()
        config.title = "Add new customer".localized()
        config.titleAlignment = .leading
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.regularFont(size: 17)
            outgoing.foregroundColor = APP_TONE_COLOR
            return outgoing
        }
        
        let imageConfig = UIImage.SymbolConfiguration(pointSize: 20, weight: .regular)
        let image = UIImage(systemName: "plus.circle", withConfiguration: imageConfig)
        config.image = image
        config.imageColorTransformer = UIConfigurationColorTransformer { _ in
            return APP_TONE_COLOR
        }
        
        config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 14, bottom: 12, trailing: 14)
        config.imagePadding = 8
        config.background.backgroundColor = UIColor(hexString: "EDF4F4")
        config.background.cornerRadius = 10
        config.baseForegroundColor = APP_TONE_COLOR
        
        let button = UIButton(configuration: config)
        button.addTarget(self, action: #selector(addNewCustomer), for: .touchUpInside)
        button.addTarget(self, action: #selector(addCustomerTouchDown), for: .touchDown)
        button.addTarget(self, action: #selector(addCustomerTouchUp), for: [.touchUpInside, .touchUpOutside, .touchCancel, .touchDragExit])
        button.configurationUpdateHandler = { button in
            guard var updatedConfig = button.configuration else { return }
            updatedConfig.background.backgroundColor = button.isHighlighted
                ? UIColor(hexString: "DDEEEE")
                : UIColor(hexString: "EDF4F4")
            button.configuration = updatedConfig
        }
        return button
    }()
    
    private lazy var loadingFooterView: UIView = {
        let view = UIView(frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 50))
        let activityIndicator = UIActivityIndicatorView(activityIndicatorStyle: .medium)
        activityIndicator.startAnimating()
        view.addSubview(activityIndicator)
        
        let label = UILabel()
        label.text = "Loading more...".localized()
        label.font = Utils.regularFont(size: 14)
        label.textColor = .gray
        view.addSubview(label)
        
        // Setup constraints using SnapKit
        activityIndicator.snp.makeConstraints { make in
            make.centerX.equalToSuperview().offset(-40)
            make.centerY.equalToSuperview()
        }
        
        label.snp.makeConstraints { make in
            make.leading.equalTo(activityIndicator.snp.trailing).offset(8)
            make.centerY.equalToSuperview()
        }
        
        return view
    }()
    
    // MARK: - Properties
    weak var delegate: SuggestionTextFieldDelegate?
    
    private var customers: [Customer] = []
    
    // Pagination properties
    private var currentPage = 1
    private var pageLimit = 20
    private var hasMorePages = true
    private var isLoading = false
    private var currentSearchKeyword: String?
    
    // Debounce properties
    private lazy var searchDebouncer = DebounceManager(delay: 0.7) // 1s debounce
    
    var isSearching = false {
        didSet {
            if isSearching == false {
                updateAddCustomerButtonTitle("Add new customer".localized())
                self.searchBar.text = nil
                self.searchBar.showsCancelButton = false
                
                // Keep pull refresh enabled (already configured in setupUI)
                
                // Reset pagination and load all customers when not searching
                resetPagination()
                currentSearchKeyword = nil
                loadCustomers()
            } else {
                // Keep pull refresh enabled even when searching
                self.searchBar.showsCancelButton = true
                self.customerTableView.reloadData()
            }
        }
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        setupData()
        loadCustomers()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Cancel search debounce to prevent memory leaks
        searchDebouncer.cancel()
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .white
        
        guard let customNavBar = customNavBar else { return }
        
        // Add subviews
        view.addSubview(searchBar)
        view.addSubview(customerTableView)
        view.addSubview(addCustomerButton)
        
        // Setup constraints
        searchBar.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        
        addCustomerButton.snp.makeConstraints { make in
            make.top.equalTo(searchBar.snp.bottom).offset(8)
            make.leading.equalToSuperview()
            make.trailing.equalToSuperview()
            make.height.equalTo(44)
        }
        
        customerTableView.snp.makeConstraints { make in
            make.top.equalTo(addCustomerButton.snp.bottom).offset(8)
            make.leading.trailing.bottom.equalToSuperview()
        }
        
        // Enable pull to refresh from the start
        configPullToRefresh(tableview: customerTableView)
    }
    
    override func setupData() {
        // Load customers from API
        loadCustomers()
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: "Customer".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                guard let self = self else { return }
                // Support both push (iPhone) and present (iPad) navigation
                if let navigationController = self.navigationController {
                    // Check if we can pop (was pushed)
                    if navigationController.viewControllers.count > 1 {
                        navigationController.popViewController(animated: true)
                    } else {
                        // Was presented, so dismiss
                        navigationController.dismiss(animated: true)
                    }
                }
        }
        )
    }
    
    // MARK: - Actions
    @objc private func addNewCustomer() {
        showCustomerView(customer: nil)
    }

    @objc private func addCustomerTouchDown() {
        UIView.animate(withDuration: 0.12) {
            self.addCustomerButton.transform = CGAffineTransform(scaleX: 0.98, y: 0.98)
            self.addCustomerButton.alpha = 0.94
        }
    }

    @objc private func addCustomerTouchUp() {
        UIView.animate(withDuration: 0.12) {
            self.addCustomerButton.transform = .identity
            self.addCustomerButton.alpha = 1
        }
    }
    
    // MARK: - Helper Methods

    private func updateAddCustomerButtonTitle(_ title: String) {
        guard var config = addCustomerButton.configuration else { return }
        config.title = title
        addCustomerButton.configuration = config
    }
    
    private func resetPagination() {
        currentPage = 1
        hasMorePages = true
        isLoading = false
        customers.removeAll()
        // Cancel any pending search debounce
        searchDebouncer.cancel()
    }
    
    private func loadCustomers(isLoadMore: Bool = false) {
        guard !isLoading else { return }
        
        if isLoadMore {
            guard hasMorePages else { return }
            currentPage += 1
            // Show loading footer for pagination (load more)
            customerTableView.tableFooterView = loadingFooterView
        } else {
            resetPagination()
            // Show progress text for initial load (like CustomerViewController)
            showProgressText(text: "Loading...".localized())
        }
        
        isLoading = true
        
        CustomerService.shared.loadCustomer(keyword: currentSearchKeyword, page: currentPage, limit: pageLimit) { [weak self] customersResponse, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.isLoading = false
                
                // Hide loading footer for pagination
                if isLoadMore {
                self.customerTableView.tableFooterView = UIView()
                } else {
                    // Hide progress text for initial load
                    self.hideProgress()
                }
                
                // End refresh control if it's active
                self.endRefresh()
                
                if let error = error {
                    // Revert page increment if there was an error for load more
                    if isLoadMore {
                        self.currentPage -= 1
                    }
                    if !isLoadMore {
                        UIAlertController.errorAlert(parent: self, error: error)
                    }
                } else if let customersResponse = customersResponse {
                    let newCustomers = customersResponse.customers ?? []
                    
                    if isLoadMore {
                        // Append new customers for pagination
                        self.customers.append(contentsOf: newCustomers)
                    } else {
                        // Replace customers for fresh load
                        self.customers = newCustomers//.sorted { ($0.full_name ?? "") < ($1.full_name ?? "") }
                    }
                    
                    // Update pagination state
                    self.hasMorePages = customersResponse.hasMore ?? false
                    
                    self.customerTableView.reloadData()
                }
            }
        }
    }
    
    private func showCustomerView(customer: Customer?) {
        let controller = CustomerViewController()
        controller.customer = customer
        controller.customerText = self.searchBar.text
        controller.delegate = self // Set delegate to receive callbacks when customer is created/updated
        self.navigationController?.present(UINavigationController(rootViewController: controller), animated: true)
    }
    
    private func processSearch(text: String) {
        let searchText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // If search text is less than 2 characters (or empty), clear search
        if searchText.isEmpty || searchText.count < 2 {
            // Cancel any pending search and reload all customers
            searchDebouncer.cancel()
            currentSearchKeyword = nil
            resetPagination()
            loadCustomers()
            return
        }
        
        // Only search if 2 or more characters - no debounce since triggered by button
        performSearch(searchText)
    }
    
    private func performSearch(_ searchText: String) {
        currentSearchKeyword = searchText
        resetPagination()
        loadCustomers()
    }
    
    func reloadTableView() {
        DispatchQueue.main.async {
            self.customerTableView.reloadData()
        }
    }
    
    override func startRefresh(_ sender: Any) {
        // Reset pagination and reload
        // If searching, keep the search keyword; otherwise clear it
        if !isSearching {
            currentSearchKeyword = nil
            searchBar.text = nil
        }
        resetPagination()
        loadCustomers()
        // Note: endRefresh() will be called in loadCustomers() completion
    }
}

// MARK: - UITableViewDelegate, UITableViewDataSource
extension SuggestionTextField: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "CustomerCell", for: indexPath) as! CustomerCell
        cell.delegate = self
        cell.bind(user: self.customers[indexPath.row], searchWords: nil)
        return cell
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return self.customers.count
    }
    
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return 60
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        delegate?.didSelectCustomer(customer: customers[indexPath.row], sender: self)
        
        // Support both push (iPhone) and present (iPad) navigation
        if let navigationController = self.navigationController {
            // Check if we can pop (was pushed)
            if navigationController.viewControllers.count > 1 {
                navigationController.popViewController(animated: true)
            } else {
                // Was presented, so dismiss
                navigationController.dismiss(animated: true)
            }
        }
    }
    
    // MARK: - Scroll Detection for Pagination
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        // Only trigger load more if not searching or if search has results
        guard !isSearching || currentSearchKeyword != nil else { return }
        
        let offsetY = scrollView.contentOffset.y
        let contentHeight = scrollView.contentSize.height
        let height = scrollView.frame.size.height
        
        // Trigger load more when user scrolls near the bottom (about 100 points from bottom)
        if offsetY > contentHeight - height - 100 && contentHeight > height {
            loadMoreCustomersIfNeeded()
        }
    }
    
    private func loadMoreCustomersIfNeeded() {
        guard hasMorePages && !isLoading else { return }
        loadCustomers(isLoadMore: true)
    }
}

// MARK: - UISearchBarDelegate
extension SuggestionTextField: UISearchBarDelegate {
    func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
        self.isSearching = true
    }
    
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        // Just update text when typing, don't trigger search yet
        // Search will only be triggered when user taps search button
    }
    
    func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
        searchDebouncer.cancel()
        self.isSearching = false
        self.searchBar.resignFirstResponder()
        // Reset search and load all customers when cancel is pressed
        currentSearchKeyword = nil
        resetPagination()
        loadCustomers()
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
        // Trigger search when user taps search button
        if let searchText = searchBar.text {
            processSearch(text: searchText)
        }
    }
}

// MARK: - CustomerCellDelegate
extension SuggestionTextField: CustomerCellDelegate {
    func more(user: Customer?, sender: CustomerCell) {
        let optionMenu = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        
        let updateAction = UIAlertAction(title: "Update customer".localized(), style: .default) { [weak self] _ in
            self?.showCustomerView(customer: user)
        }
        
        let deleteAction = UIAlertAction(title: "Delete customer".localized(), style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            // Use new API id field if available, fallback to customer_id
            let customerId = user?.id ?? user?.customer_id ?? 0
            
            if customerId == 0 {
                UIAlertController.alert(
                    parent: self,
                    title: "Error".localized(),
                    message: "Invalid customer ID".localized()
                )
                return
            }
            
            UIAlertController.alertConfirmWithStyle(
                parent: self,
                title: "Note!".localized(),
                message: "You're deleting this customer. Are you sure?".localized(),
                specialMessage: "\(user?.full_name ?? "")",
                okAction: { [weak self] _ in
                    guard let self = self else { return }
                    self.showProgressText(text: "Deleting customer...".localized())
                    
                    CustomerService.shared.deleteCustomer(customerId: customerId) { [weak self] error in
                        guard let self = self else { return }
                        DispatchQueue.main.async {
                            self.hideProgress()
                            
                            if let error = error {
                                UIAlertController.errorAlert(parent: self, error: error)
                            } else {
                                print("✅ Customer deleted successfully")
                                // Remove from local array and reload table
                                self.customers.removeAll { customer in
                                    (customer.id ?? customer.customer_id) == customerId
                                }
                                self.customerTableView.reloadData()
                            }
                        }
                    }
                },
                cancelAction: { _ in }
            )
        }
        
        let cancelAction = UIAlertAction(title: "Cancel".localized(), style: .cancel)
        
        optionMenu.addAction(updateAction)
        optionMenu.addAction(deleteAction)
        optionMenu.addAction(cancelAction)
        
        if UI_USER_INTERFACE_IDIOM() == .pad {
            if let popoverController = optionMenu.popoverPresentationController {
                popoverController.sourceView = sender.moreButton
                popoverController.sourceRect = sender.moreButton.bounds
                popoverController.permittedArrowDirections = .up
            }
        }
        
        self.present(optionMenu, animated: true)
    }
}

// MARK: - CustomerViewControllerDelegate
extension SuggestionTextField: CustomerViewControllerDelegate {
    func didCreateCustomer(customer: Customer, sender: CustomerViewController) {
        // Add new customer to the list
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // If there's an active search, clear it and reload to show the new customer in correct sorted position
            if self.currentSearchKeyword != nil {
                self.currentSearchKeyword = nil
                self.searchBar.text = ""
                self.resetPagination()
                self.loadCustomers()
            } else {
                // No active search - insert at the beginning of the array
                self.customers.insert(customer, at: 0)
                
                // Reload table view with animation
                self.customerTableView.beginUpdates()
                self.customerTableView.insertRows(at: [IndexPath(row: 0, section: 0)], with: .top)
                self.customerTableView.endUpdates()
                
                // Scroll to top to show the new customer
                if !self.customers.isEmpty {
                    self.customerTableView.scrollToRow(at: IndexPath(row: 0, section: 0), at: .top, animated: true)
                }
            }
            
            // Notify delegate
            self.delegate?.didCreateCustomer(customer: customer, sender: self)
        }
    }
    
    func didUpdateCustomer(customer: Customer, sender: CustomerViewController) {
        // Update existing customer in the list
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Find and update customer in the list
            if let index = self.customers.firstIndex(where: { ($0.id ?? $0.customer_id) == (customer.id ?? customer.customer_id) }) {
                self.customers[index] = customer
                self.customerTableView.reloadRows(at: [IndexPath(row: index, section: 0)], with: .fade)
            } else {
                // If not found, reload all data
                self.loadCustomers()
            }
        }
    }
}
