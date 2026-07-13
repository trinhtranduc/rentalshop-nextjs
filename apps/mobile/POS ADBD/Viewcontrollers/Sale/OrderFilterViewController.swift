//
//  OrderFilterViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 2025.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import UIKit

protocol OrderFilterViewControllerDelegate: AnyObject {
    func didApplyFilter(sortType: OrderSortType, sortOrder: String?, status: OrderStatus?, sender: OrderFilterViewController)
    func didClearFilter(sender: OrderFilterViewController)
}

class OrderFilterViewController: UIViewController {

    // MARK: - Public Properties
    weak var delegate: OrderFilterViewControllerDelegate?

    var initialSortType: OrderSortType = .book_date
    var initialOrderType: OrderType = .rent
    var initialStatus: OrderStatus?

    // MARK: - Private Properties
    private var selectedSortType: OrderSortType = .book_date
    private var selectedStatus: OrderStatus?

    private var availableStatuses: [OrderStatus] {
        switch initialOrderType {
        case .rent:
            return [.reserved, .pickuped, .returned, .cancelled]
        case .sale:
            return [.completed, .cancelled]
        }
    }

    // MARK: - UI Components

    private lazy var headerView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Order Filter".localized()
        label.font = Utils.boldFont(size: 18)
        label.textColor = .textPrimary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var subtitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 13)
        label.textColor = .textSecondary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var closeButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 14, weight: .medium)
        let image = UIImage(systemName: "xmark", withConfiguration: config)
        button.setImage(image, for: .normal)
        button.tintColor = .textSecondary
        button.backgroundColor = .backgroundTertiary
        button.layer.cornerRadius = 15
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        return button
    }()

    // MARK: Sort By Section
    private lazy var sortSectionLabel: UILabel = {
        let label = UILabel()
        label.text = "SORT BY".localized()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .textTertiary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var sortStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()

    private lazy var bookDateButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Book date".localized(), for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 15)
        button.layer.cornerRadius = OrderFilterChipMetrics.cornerRadius
        button.layer.masksToBounds = true
        button.layer.borderWidth = 1
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        button.addTarget(self, action: #selector(sortButtonTapped(_:)), for: .touchUpInside)
        button.tag = 0
        return button
    }()

    private lazy var pickupDateButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Pickup date".localized(), for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 15)
        button.layer.cornerRadius = OrderFilterChipMetrics.cornerRadius
        button.layer.masksToBounds = true
        button.layer.borderWidth = 1
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 20, bottom: 12, right: 20)
        button.addTarget(self, action: #selector(sortButtonTapped(_:)), for: .touchUpInside)
        button.tag = 1
        return button
    }()

    // MARK: Status Filter Section
    private lazy var statusSectionLabel: UILabel = {
        let label = UILabel()
        label.text = "STATUS FILTER".localized()
        label.font = Utils.mediumFont(size: 12)
        label.textColor = .textTertiary
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private lazy var statusFlowContainer: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private var statusButtons: [UIButton] = []

    // MARK: Footer
    private lazy var footerView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()

    private lazy var resetButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Reset".localized(), for: .normal)
        button.setTitleColor(.textSecondary, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 16)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(resetTapped), for: .touchUpInside)
        return button
    }()

    private lazy var applyButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Apply".localized(), for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 16)
        button.backgroundColor = .brandPrimary
        button.layer.cornerRadius = 25
        button.layer.masksToBounds = true
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(applyTapped), for: .touchUpInside)
        return button
    }()

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        selectedSortType = initialSortType
        if let status = initialStatus, availableStatuses.contains(status) {
            selectedStatus = status
        } else {
            selectedStatus = nil
        }
        setupUI()
        updateSubtitle()
        updateSortButtons()
        updateStatusButtons()
    }

    // MARK: - Setup UI

    private func setupUI() {
        view.backgroundColor = .systemBackground

        // Header
        view.addSubview(headerView)
        headerView.addSubview(titleLabel)
        headerView.addSubview(subtitleLabel)
        headerView.addSubview(closeButton)

        // Sort section
        view.addSubview(sortSectionLabel)
        view.addSubview(sortStackView)
        sortStackView.addArrangedSubview(bookDateButton)
        sortStackView.addArrangedSubview(pickupDateButton)

        // Status section
        view.addSubview(statusSectionLabel)
        view.addSubview(statusFlowContainer)
        setupStatusButtons()

        // Footer
        view.addSubview(footerView)
        footerView.addSubview(resetButton)
        footerView.addSubview(applyButton)

        setupConstraints()
    }

    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Header
            headerView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            titleLabel.topAnchor.constraint(equalTo: headerView.topAnchor),
            titleLabel.leadingAnchor.constraint(equalTo: headerView.leadingAnchor),

            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 4),
            subtitleLabel.leadingAnchor.constraint(equalTo: headerView.leadingAnchor),
            subtitleLabel.bottomAnchor.constraint(equalTo: headerView.bottomAnchor),

            closeButton.centerYAnchor.constraint(equalTo: headerView.centerYAnchor),
            closeButton.trailingAnchor.constraint(equalTo: headerView.trailingAnchor),
            closeButton.widthAnchor.constraint(equalToConstant: 30),
            closeButton.heightAnchor.constraint(equalToConstant: 30),

            // Sort section
            sortSectionLabel.topAnchor.constraint(equalTo: headerView.bottomAnchor, constant: 28),
            sortSectionLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            sortStackView.topAnchor.constraint(equalTo: sortSectionLabel.bottomAnchor, constant: 12),
            sortStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            sortStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            sortStackView.heightAnchor.constraint(equalToConstant: 48),

            // Status section
            statusSectionLabel.topAnchor.constraint(equalTo: sortStackView.bottomAnchor, constant: 28),
            statusSectionLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),

            statusFlowContainer.topAnchor.constraint(equalTo: statusSectionLabel.bottomAnchor, constant: 12),
            statusFlowContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            statusFlowContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),

            // Footer
            footerView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            footerView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            footerView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            footerView.heightAnchor.constraint(equalToConstant: 50),

            resetButton.leadingAnchor.constraint(equalTo: footerView.leadingAnchor),
            resetButton.centerYAnchor.constraint(equalTo: footerView.centerYAnchor),

            applyButton.leadingAnchor.constraint(equalTo: resetButton.trailingAnchor, constant: 16),
            applyButton.trailingAnchor.constraint(equalTo: footerView.trailingAnchor),
            applyButton.topAnchor.constraint(equalTo: footerView.topAnchor),
            applyButton.bottomAnchor.constraint(equalTo: footerView.bottomAnchor),
        ])
    }

    // MARK: - Status Buttons (Flow Layout)

    private func setupStatusButtons() {
        // "All" button + available statuses
        let allButton = makeStatusChipButton(title: "All".localized(), tag: -1)
        statusButtons.append(allButton)

        for (index, status) in availableStatuses.enumerated() {
            let button = makeStatusChipButton(title: status.localizedDisplayName(), tag: index)
            statusButtons.append(button)
        }

        layoutStatusButtons()
    }

    private func makeStatusChipButton(title: String, tag: Int) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 15)
        button.layer.cornerRadius = OrderFilterChipMetrics.cornerRadius
        button.layer.masksToBounds = true
        button.layer.borderWidth = 1
        button.contentEdgeInsets = OrderFilterChipMetrics.contentInsets
        button.tag = tag
        button.addTarget(self, action: #selector(statusButtonTapped(_:)), for: .touchUpInside)
        return button
    }

    private func layoutStatusButtons() {
        // Remove any existing buttons from container
        statusFlowContainer.subviews.forEach { $0.removeFromSuperview() }

        let maxWidth = UIScreen.main.bounds.width - 40 // 20 padding on each side
        let horizontalSpacing: CGFloat = 10
        let verticalSpacing: CGFloat = 10

        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var rowHeight: CGFloat = 0

        for button in statusButtons {
            button.sizeToFit()
            let buttonWidth = button.frame.width + OrderFilterChipMetrics.contentInsets.left + OrderFilterChipMetrics.contentInsets.right
            let buttonHeight = OrderFilterChipMetrics.minimumHeight

            if currentX + buttonWidth > maxWidth && currentX > 0 {
                currentX = 0
                currentY += rowHeight + verticalSpacing
            }

            button.frame = CGRect(x: currentX, y: currentY, width: buttonWidth, height: buttonHeight)
            statusFlowContainer.addSubview(button)

            currentX += buttonWidth + horizontalSpacing
            rowHeight = buttonHeight
        }

        // Update container height
        let totalHeight = currentY + rowHeight
        let heightConstraint = statusFlowContainer.constraints.first { $0.firstAttribute == .height }
        if let existing = heightConstraint {
            existing.constant = totalHeight
        } else {
            statusFlowContainer.heightAnchor.constraint(equalToConstant: totalHeight).isActive = true
        }
    }

    // MARK: - Update UI State

    private func updateSubtitle() {
        let sortName = selectedSortType == .book_date ? "Book date".localized() : "Pickup date".localized()
        let orderTypeName = initialOrderType == .rent ? "Rent".localized() : "Sale".localized()
        subtitleLabel.text = "\(orderTypeName) · \(sortName)"
    }

    private func updateSortButtons() {
        // Selected sort = solid blue fill + white text
        // Unselected sort = white bg + border + dark text
        let isBookDate = selectedSortType == .book_date

        applySortStyle(to: bookDateButton, isSelected: isBookDate)
        applySortStyle(to: pickupDateButton, isSelected: !isBookDate)
    }

    private func applySortStyle(to button: UIButton, isSelected: Bool) {
        if isSelected {
            button.backgroundColor = .brandPrimary
            button.layer.borderColor = UIColor.brandPrimary.cgColor
            button.setTitleColor(.white, for: .normal)
        } else {
            button.backgroundColor = .backgroundCard
            button.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.75).cgColor
            button.setTitleColor(.textPrimary, for: .normal)
        }
    }

    private func updateStatusButtons() {
        for button in statusButtons {
            let isSelected: Bool
            if button.tag == -1 {
                // "All" button
                isSelected = selectedStatus == nil
            } else {
                let status = availableStatuses[button.tag]
                isSelected = selectedStatus == status
            }
            OrderFilterChipAppearance.applyNeutral(to: button, isSelected: isSelected)
        }
    }

    // MARK: - Actions

    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    @objc private func sortButtonTapped(_ sender: UIButton) {
        selectedSortType = sender.tag == 0 ? .book_date : .get_date
        updateSortButtons()
        updateSubtitle()
    }

    @objc private func statusButtonTapped(_ sender: UIButton) {
        if sender.tag == -1 {
            selectedStatus = nil
        } else {
            selectedStatus = availableStatuses[sender.tag]
        }
        updateStatusButtons()
    }

    @objc private func resetTapped() {
        delegate?.didClearFilter(sender: self)
        dismiss(animated: true)
    }

    @objc private func applyTapped() {
        delegate?.didApplyFilter(sortType: selectedSortType, sortOrder: "desc", status: selectedStatus, sender: self)
        dismiss(animated: true)
    }
}

// MARK: - Instance Creation
extension OrderFilterViewController {
    static func instance() -> OrderFilterViewController {
        let controller = OrderFilterViewController()

        if let sheet = controller.sheetPresentationController {
            sheet.detents = [.medium()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 16
            sheet.prefersEdgeAttachedInCompactHeight = true
        }

        return controller
    }
}
