//
//  OverviewInsightsPanelView.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewInsightsPanelView: UIView {

    var onTopProductsTapped: (() -> Void)?
    var onTopCustomersTapped: (() -> Void)?

    private let isIPad: Bool

    private let topProductsRowsStackView = UIStackView()
    private let topCustomersRowsStackView = UIStackView()

    private let contentStackView = UIStackView()
    private lazy var topProductsActionButton: UIButton = {
        let button = OverviewUIBuilder.makeSectionActionButton(title: "View all".localized())
        button.isHidden = true
        button.addTarget(self, action: #selector(topProductsTapped), for: .touchUpInside)
        return button
    }()
    private lazy var topCustomersActionButton: UIButton = {
        let button = OverviewUIBuilder.makeSectionActionButton(title: "View all".localized())
        button.isHidden = true
        button.addTarget(self, action: #selector(topCustomersTapped), for: .touchUpInside)
        return button
    }()

    init(isIPad: Bool) {
        self.isIPad = isIPad

        super.init(frame: .zero)

        topProductsRowsStackView.axis = .vertical
        topProductsRowsStackView.spacing = 0
        topCustomersRowsStackView.axis = .vertical
        topCustomersRowsStackView.spacing = 0

        let productsCard = OverviewUIBuilder.makeInsightCard(
            title: "Top Products".localized(),
            subtitle: "Highest revenue drivers".localized(),
            iconSystemName: "shippingbox.fill",
            contentView: topProductsRowsStackView,
            accessoryView: topProductsActionButton,
            isIPad: isIPad
        )
        let customersCard = OverviewUIBuilder.makeInsightCard(
            title: "Top Customers".localized(),
            subtitle: "Most valuable customers".localized(),
            iconSystemName: "person.2.fill",
            contentView: topCustomersRowsStackView,
            accessoryView: topCustomersActionButton,
            isIPad: isIPad
        )

        contentStackView.axis = .vertical
        contentStackView.spacing = 12
        contentStackView.addArrangedSubview(productsCard)
        contentStackView.addArrangedSubview(customersCard)

        addSubview(contentStackView)
        contentStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func updateTopProducts(_ products: [TopProduct]) {
        topProductsActionButton.isHidden = products.isEmpty
        let rows = products.prefix(3).enumerated().map { index, product -> UIView in
            let trimmedName = product.name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let title = trimmedName.isEmpty ? "Unnamed product".localized() : trimmedName

            var subtitleParts: [String] = []
            if let category = product.category?.trimmingCharacters(in: .whitespacesAndNewlines), !category.isEmpty {
                subtitleParts.append(category)
            }
            subtitleParts.append("\((product.rentalCount ?? 0).formatStringInCommon()) " + "rentals".localized())

            return OverviewUIBuilder.makeRankingRow(
                rank: index + 1,
                title: title,
                subtitle: subtitleParts.joined(separator: " • "),
                value: (product.totalRevenue ?? 0).formatStringInCommon(),
                accentColor: .brandPrimary,
                isIPad: isIPad,
                style: .embedded
            )
        }

        OverviewUIBuilder.populateRows(
            in: topProductsRowsStackView,
            rows: rows,
            emptyText: "No product performance for this period".localized(),
            showsDividers: true
        )
    }

    func updateTopCustomers(_ customers: [TopCustomer]) {
        topCustomersActionButton.isHidden = customers.isEmpty
        let rows = customers.prefix(3).enumerated().map { index, customer -> UIView in
            let trimmedName = customer.name?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let title = trimmedName.isEmpty ? "Walk-in customer".localized() : trimmedName

            var subtitleParts: [String] = []
            if let phone = customer.phone?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
                subtitleParts.append(phone)
            }
            let orderCount = customer.orderCount ?? customer.rentalCount ?? customer.saleCount ?? 0
            if orderCount > 0 {
                subtitleParts.append("\(orderCount.formatStringInCommon()) " + "orders".localized())
            } else if let location = customer.location?.trimmingCharacters(in: .whitespacesAndNewlines), !location.isEmpty {
                subtitleParts.append(location)
            }

            return OverviewUIBuilder.makeRankingRow(
                rank: index + 1,
                title: title,
                subtitle: subtitleParts.joined(separator: " • "),
                value: (customer.totalSpent ?? 0).formatStringInCommon(),
                accentColor: .accentOrange,
                isIPad: isIPad,
                style: .embedded
            )
        }

        OverviewUIBuilder.populateRows(
            in: topCustomersRowsStackView,
            rows: rows,
            emptyText: "No customer performance for this period".localized(),
            showsDividers: true
        )
    }

    @objc private func topProductsTapped() {
        onTopProductsTapped?()
    }

    @objc private func topCustomersTapped() {
        onTopCustomersTapped?()
    }
}

final class OverviewSnapshotSectionView: UIView {

    private let reservedValueLabel: UILabel
    private let activeValueLabel: UILabel
    private let completedValueLabel: UILabel
    private let cancelledValueLabel: UILabel
    private let depositHeldValueLabel: UILabel
    private let depositDueValueLabel: UILabel
    private let depositMetricsRow = UIStackView()

    init(isIPad: Bool) {
        reservedValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        activeValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        completedValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        cancelledValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        depositHeldValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        depositDueValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)

        super.init(frame: .zero)

        let firstRow = UIStackView(arrangedSubviews: [
            OverviewUIBuilder.makeCompactSnapshotItem(
                title: "Report_Summary_Reserved".localized(),
                valueLabel: reservedValueLabel,
                tintColor: .statusReservedText,
                iconSystemName: "bookmark.circle.fill"
            ),
            OverviewUIBuilder.makeCompactSnapshotItem(
                title: "In Progress".localized(),
                valueLabel: activeValueLabel,
                tintColor: .statusActiveText,
                iconSystemName: "figure.walk.circle.fill"
            )
        ])
        firstRow.axis = .horizontal
        firstRow.spacing = 8
        firstRow.distribution = .fillEqually

        let secondRow = UIStackView(arrangedSubviews: [
            OverviewUIBuilder.makeCompactSnapshotItem(
                title: "Completed".localized(),
                valueLabel: completedValueLabel,
                tintColor: .statusDoneText,
                iconSystemName: "checkmark.circle.fill"
            ),
            OverviewUIBuilder.makeCompactSnapshotItem(
                title: "Cancelled".localized(),
                valueLabel: cancelledValueLabel,
                tintColor: .statusCancelledText,
                iconSystemName: "xmark.circle.fill"
            )
        ])
        secondRow.axis = .horizontal
        secondRow.spacing = 8
        secondRow.distribution = .fillEqually

        let grid = UIStackView(arrangedSubviews: [firstRow, secondRow])
        grid.axis = .vertical
        grid.spacing = 8

        depositMetricsRow.axis = .horizontal
        depositMetricsRow.spacing = 8
        depositMetricsRow.distribution = .fillEqually
        depositMetricsRow.isHidden = true
        depositMetricsRow.addArrangedSubview(
            OverviewUIBuilder.makeCompactSnapshotItem(
                title: "Report_Summary_DepositHeld".localized(),
                valueLabel: depositHeldValueLabel,
                tintColor: .brandPrimary,
                iconSystemName: "lock.circle.fill"
            )
        )
        depositMetricsRow.addArrangedSubview(
            OverviewUIBuilder.makeCompactSnapshotItem(
                title: "Report_Summary_DepositDue".localized(),
                valueLabel: depositDueValueLabel,
                tintColor: .accentOrange,
                iconSystemName: "arrow.uturn.backward.circle.fill"
            )
        )

        let contentStack = UIStackView(arrangedSubviews: [grid, depositMetricsRow])
        contentStack.axis = .vertical
        contentStack.spacing = 8

        let card = OverviewUIBuilder.makeInsightCard(
            title: "Operational Snapshot".localized(),
            subtitle: "Status and deposit flow for this period".localized(),
            iconSystemName: "gauge.with.dots.needle.50percent",
            contentView: contentStack,
            isIPad: isIPad
        )

        addSubview(card)
        card.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func update(
        reserved: Int,
        active: Int,
        completed: Int,
        cancelled: Int,
        hasData: Bool,
        depositHeldText: String? = nil,
        depositDueText: String? = nil,
        showsDepositMetrics: Bool = false
    ) {
        reservedValueLabel.text = hasData ? reserved.formatStringInCommon() : "—"
        activeValueLabel.text = hasData ? active.formatStringInCommon() : "—"
        completedValueLabel.text = hasData ? completed.formatStringInCommon() : "—"
        cancelledValueLabel.text = hasData ? cancelled.formatStringInCommon() : "—"
        depositHeldValueLabel.text = depositHeldText ?? "—"
        depositDueValueLabel.text = depositDueText ?? "—"
        depositMetricsRow.isHidden = !showsDepositMetrics
    }
}
