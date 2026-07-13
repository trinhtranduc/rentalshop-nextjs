//
//  OrderFilterViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-XX.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import UIKit

protocol OrderFilterViewControllerDelegate: AnyObject {
    func didApplyFilter(sortType: OrderSortType, sortOrder: String?, status: OrderStatus?, sender: OrderFilterViewController)
    func didClearFilter(sender: OrderFilterViewController)
}

class OrderFilterViewController: UIViewController {
    // MARK: - Properties
    weak var delegate: OrderFilterViewControllerDelegate?
    
    var initialSortType: OrderSortType = .book_date
    var initialOrderType: OrderType = .rent
    var initialStatus: OrderStatus?
    
    private var selectedSortType: OrderSortType = .book_date
    private var selectedStatus: OrderStatus?
    
    // Status options based on order type (excluding draft)
    private var availableStatuses: [OrderStatus] {
        switch initialOrderType {
        case .rent:
            // Rent: reserved, pickuped, returned, cancelled (no draft, no completed)
            return [.reserved, .pickuped, .returned, .cancelled]
        case .sale:
            // Sale: completed, cancelled (no draft, no reserved, no pickuped, no returned)
            return [.completed, .cancelled]
        }
    }
    
    // MARK: - UI Components
    private lazy var filterTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .systemBackground
        table.translatesAutoresizingMaskIntoConstraints = false
        return table
    }()
    
    private lazy var buttonStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [clearButton, cancelButton, okButton])
        stack.axis = .horizontal
        stack.spacing = 16
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel".localized(), for: .normal)
        button.setTitleColor(.gray, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 16)
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var clearButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Clear".localized(), for: .normal)
        button.setTitleColor(.gray, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 16)
        button.addTarget(self, action: #selector(clearTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var okButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("OK".localized(), for: .normal)
        button.setTitleColor(APP_BUTTON_BG_COLOR, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 16)
        button.addTarget(self, action: #selector(okTapped), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Sections
    enum Section: Int, CaseIterable {
        case sort
        case sortOrder
        case status
        
        var title: String {
            switch self {
            case .sort:
                return "Sort By".localized()
            case .sortOrder:
                return "Sort Order".localized()
            case .status:
                return "Status Filter".localized()
            }
        }
    }
    
    // MARK: - Sort Order
    enum SortOrder: String, CaseIterable {
        case descending = "desc"
        case ascending = "asc"
        
        var displayName: String {
            switch self {
            case .descending:
                return "Newest First".localized()
            case .ascending:
                return "Oldest First".localized()
            }
        }
    }
    
    private var selectedSortOrder: SortOrder = .descending
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        
        // Initialize selected values
        selectedSortType = initialSortType
        selectedSortOrder = .descending
        
        // Validate initialStatus - if it's not in availableStatuses, reset to nil
        if let initialStatus = initialStatus, availableStatuses.contains(initialStatus) {
            selectedStatus = initialStatus
        } else {
            selectedStatus = nil // Reset to "All" if status is not available for current order type
        }
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        view.addSubview(filterTableView)
        view.addSubview(buttonStackView)
        
        NSLayoutConstraint.activate([
            filterTableView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            filterTableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            filterTableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            filterTableView.bottomAnchor.constraint(equalTo: buttonStackView.topAnchor, constant: -16),
            
            buttonStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            buttonStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            buttonStackView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            buttonStackView.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    // MARK: - Actions
    @objc private func cancelTapped() {
        dismiss(animated: true)
    }
    
    @objc private func clearTapped() {
        delegate?.didClearFilter(sender: self)
        dismiss(animated: true)
    }
    
    @objc private func okTapped() {
        // Always use "desc" (newest first) as sortOrder since the section is hidden
        delegate?.didApplyFilter(sortType: selectedSortType, sortOrder: "desc", status: selectedStatus, sender: self)
        dismiss(animated: true)
    }
}

// MARK: - UITableViewDataSource
extension OrderFilterViewController: UITableViewDataSource {
    func numberOfSections(in tableView: UITableView) -> Int {
        // Hide sortOrder section (default is desc/newest first)
        return 2 // sort, status (sortOrder is hidden)
    }
    
    private func getActualSection(for section: Int) -> Section {
        // Map visible section index to actual Section enum (skip sortOrder)
        switch section {
        case 0: return .sort
        case 1: return .status
        default: return .sort
        }
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        let sectionType = getActualSection(for: section)
        
        switch sectionType {
        case .sort:
            return 2 // book_date, get_date
        case .sortOrder:
            return 0 // Hidden section
        case .status:
            return availableStatuses.count + 1 // Available statuses + "All" option
        }
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        let sectionType = getActualSection(for: section)
        return sectionType.title
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .default, reuseIdentifier: "FilterCell")
        cell.selectionStyle = .none
        cell.backgroundColor = .systemBackground
        cell.textLabel?.font = Utils.regularFont(size: 16)
        cell.textLabel?.textColor = .label
        
        let sectionType = getActualSection(for: indexPath.section)
        
        switch sectionType {
        case .sort:
            if indexPath.row == 0 {
                cell.textLabel?.text = "Book date".localized()
                cell.accessoryType = selectedSortType == .book_date ? .checkmark : .none
            } else if indexPath.row == 1 {
                cell.textLabel?.text = "Pickup date".localized()
                cell.accessoryType = selectedSortType == .get_date ? .checkmark : .none
            }
            
        case .status:
            if indexPath.row == 0 {
                // "All" option
                cell.textLabel?.text = "All".localized()
                cell.accessoryType = selectedStatus == nil ? .checkmark : .none
            } else {
                let status = availableStatuses[indexPath.row - 1]
                // Use localized status name
                cell.textLabel?.text = status.localizedDisplayName()
                cell.accessoryType = selectedStatus == status ? .checkmark : .none
            }
            
        case .sortOrder:
            break // Hidden section
        }
        
        return cell
    }
}

// MARK: - UITableViewDelegate
extension OrderFilterViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let sectionType = getActualSection(for: indexPath.section)
        
        switch sectionType {
        case .sort:
            let newSortType: OrderSortType = indexPath.row == 0 ? .book_date : .get_date
            guard selectedSortType != newSortType else { return } // No change, skip reload
            selectedSortType = newSortType
            // Reload sort section to update checkmarks
            tableView.reloadSections(IndexSet(integer: indexPath.section), with: .none)
            
        case .status:
            let newStatus: OrderStatus? = indexPath.row == 0 ? nil : availableStatuses[indexPath.row - 1]
            guard selectedStatus != newStatus else { return } // No change, skip reload
            selectedStatus = newStatus
            // Reload status section to update checkmarks
            tableView.reloadSections(IndexSet(integer: indexPath.section), with: .none)
            
        case .sortOrder:
            break // Hidden section
        }
    }
    
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return 50
    }
}

// MARK: - Instance Creation
extension OrderFilterViewController {
    static func instance() -> OrderFilterViewController {
        let controller = OrderFilterViewController()
        
        if let sheet = controller.sheetPresentationController {
            // Configure sheet properties similar to DatePickerViewController
            sheet.detents = [.medium()] // Use medium size (approximately half screen)
            sheet.prefersGrabberVisible = true // Show grabber at top
            sheet.preferredCornerRadius = 12
            sheet.prefersEdgeAttachedInCompactHeight = true
        }
        
        return controller
    }
}
