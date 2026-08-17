//
//  OrderFilterViewController.swift
//  POS ADBD
//

import UIKit
import SnapKit

protocol OrderFilterViewControllerDelegate: AnyObject {
    func didApplyFilter(sortType: OrderSortType, sortOrder: String?, status: OrderStatus?, sender: OrderFilterViewController)
    func didClearFilter(sender: OrderFilterViewController)
}

class OrderFilterViewController: UIViewController {

    weak var delegate: OrderFilterViewControllerDelegate?

    var initialSortType: OrderSortType = .book_date
    var initialOrderType: OrderType = .rent
    var initialStatus: OrderStatus?

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

    private let headerView = RCSheetHeaderView()
    private let sortStack = UIStackView()
    private let statusGrid = UIStackView()
    private var sortButtons: [UIButton] = []
    private var statusButtons: [UIButton] = []
    private lazy var confirmButton: RCPrimaryButton = {
        RCPrimaryButton(title: "Confirm".localized(), backgroundColor: APP_TONE_COLOR)
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        selectedSortType = initialSortType
        if let status = initialStatus, availableStatuses.contains(status) {
            selectedStatus = status
        } else {
            selectedStatus = nil
        }
        view.backgroundColor = .systemBackground
        buildLayout()
        refreshSortSelection()
        refreshStatusSelection()
    }

    private func buildLayout() {
        headerView.title = "Order Filter".localized()
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)

        sortStack.axis = .horizontal
        sortStack.spacing = 10
        sortStack.distribution = .fillEqually
        sortStack.isHidden = initialOrderType == .sale

        let bookDate = makePresetButton(title: "Book date".localized(), tag: 0)
        let pickupDate = makePresetButton(title: "Pickup date".localized(), tag: 1)
        bookDate.addTarget(self, action: #selector(sortTapped(_:)), for: .touchUpInside)
        pickupDate.addTarget(self, action: #selector(sortTapped(_:)), for: .touchUpInside)
        sortButtons = [bookDate, pickupDate]
        sortStack.addArrangedSubview(bookDate)
        sortStack.addArrangedSubview(pickupDate)
        sortStack.snp.makeConstraints { make in
            make.height.equalTo(44)
        }

        statusGrid.axis = .vertical
        statusGrid.spacing = 10
        buildStatusGrid()

        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .vertical)
        let stack = UIStackView(arrangedSubviews: [sortStack, statusGrid, spacer, confirmButton])
        stack.axis = .vertical
        stack.spacing = 16
        view.addSubview(headerView)
        view.addSubview(stack)
        headerView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        stack.snp.makeConstraints { make in
            make.top.equalTo(headerView.snp.bottom).offset(16)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-12)
        }
        confirmButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
    }

    private func buildStatusGrid() {
        var items: [(title: String, tag: Int)] = [("All".localized(), -1)]
        items.append(contentsOf: availableStatuses.enumerated().map { ($1.localizedDisplayName(), $0) })

        var row: [UIView] = []
        for item in items {
            let button = makePresetButton(title: item.title, tag: item.tag)
            button.addTarget(self, action: #selector(statusTapped(_:)), for: .touchUpInside)
            statusButtons.append(button)
            row.append(button)
            if row.count == 2 {
                statusGrid.addArrangedSubview(makeRow(row))
                row.removeAll()
            }
        }
        if !row.isEmpty {
            row.append(UIView())
            statusGrid.addArrangedSubview(makeRow(row))
        }
    }

    private func makeRow(_ views: [UIView]) -> UIStackView {
        let row = UIStackView(arrangedSubviews: views)
        row.axis = .horizontal
        row.spacing = 10
        row.distribution = .fillEqually
        row.snp.makeConstraints { make in
            make.height.equalTo(44)
        }
        return row
    }

    private func makePresetButton(title: String, tag: Int) -> UIButton {
        let button = UIButton(type: .system)
        button.tag = tag
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 14)
        button.setTitleColor(.textPrimary, for: .normal)
        button.backgroundColor = UIColor.systemGray6
        button.layer.cornerRadius = 10
        button.layer.borderWidth = 1.5
        button.layer.borderColor = UIColor.clear.cgColor
        return button
    }

    private func applySelection(_ button: UIButton, selected: Bool) {
        button.backgroundColor = selected ? .systemBackground : UIColor.systemGray6
        button.layer.borderColor = selected ? UIColor.label.cgColor : UIColor.clear.cgColor
    }

    private func refreshSortSelection() {
        applySelection(sortButtons[0], selected: selectedSortType == .book_date)
        applySelection(sortButtons[1], selected: selectedSortType == .get_date)
    }

    private func refreshStatusSelection() {
        for button in statusButtons {
            let selected: Bool
            if button.tag == -1 {
                selected = selectedStatus == nil
            } else {
                selected = selectedStatus == availableStatuses[button.tag]
            }
            applySelection(button, selected: selected)
        }
    }

    @objc private func sortTapped(_ sender: UIButton) {
        selectedSortType = sender.tag == 0 ? .book_date : .get_date
        refreshSortSelection()
    }

    @objc private func statusTapped(_ sender: UIButton) {
        selectedStatus = sender.tag == -1 ? nil : availableStatuses[sender.tag]
        refreshStatusSelection()
    }

    @objc private func confirmTapped() {
        delegate?.didApplyFilter(
            sortType: selectedSortType,
            sortOrder: "desc",
            status: selectedStatus,
            sender: self
        )
        dismiss(animated: true)
    }
}

extension OrderFilterViewController {
    static func instance() -> OrderFilterViewController {
        let controller = OrderFilterViewController()
        if let sheet = controller.sheetPresentationController {
            sheet.detents = [.medium()]
            sheet.selectedDetentIdentifier = .medium
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 16
            sheet.prefersScrollingExpandsWhenScrolledToEdge = false
        }
        return controller
    }
}
