//
//  OverviewInsightsPanelView.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewInsightsPanelView: UIView {

    private let isIPad: Bool

    private let reservedValueLabel: UILabel
    private let activeValueLabel: UILabel
    private let completedValueLabel: UILabel
    private let cancelledValueLabel: UILabel

    private let topProductsRowsStackView = UIStackView()
    private let topCustomersRowsStackView = UIStackView()

    private let contentStackView = UIStackView()

    init(isIPad: Bool) {
        self.isIPad = isIPad

        reservedValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        activeValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        completedValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)
        cancelledValueLabel = OverviewUIBuilder.makeSnapshotValueLabel(isIPad: isIPad)

        super.init(frame: .zero)

        topProductsRowsStackView.axis = .vertical
        topProductsRowsStackView.spacing = 8
        topCustomersRowsStackView.axis = .vertical
        topCustomersRowsStackView.spacing = 8

        let snapshotGrid = makeSnapshotGrid()
        let snapshotCard = OverviewUIBuilder.makeInsightCard(
            title: "Operational Snapshot".localized(),
            subtitle: "Orders by status for this period".localized(),
            iconSystemName: "gauge.with.dots.needle.50percent",
            contentView: snapshotGrid,
            isIPad: isIPad
        )
        let productsCard = OverviewUIBuilder.makeInsightCard(
            title: "Top Products".localized(),
            subtitle: "Highest revenue drivers".localized(),
            iconSystemName: "shippingbox.fill",
            contentView: topProductsRowsStackView,
            isIPad: isIPad
        )
        let customersCard = OverviewUIBuilder.makeInsightCard(
            title: "Top Customers".localized(),
            subtitle: "Most valuable customers".localized(),
            iconSystemName: "person.2.fill",
            contentView: topCustomersRowsStackView,
            isIPad: isIPad
        )

        contentStackView.axis = .vertical
        contentStackView.spacing = 14
        contentStackView.addArrangedSubview(snapshotCard)
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

    func updateSnapshot(
        reserved: Int,
        active: Int,
        completed: Int,
        cancelled: Int,
        hasData: Bool
    ) {
        reservedValueLabel.text = hasData ? reserved.formatStringInCommon() : "—"
        activeValueLabel.text = hasData ? active.formatStringInCommon() : "—"
        completedValueLabel.text = hasData ? completed.formatStringInCommon() : "—"
        cancelledValueLabel.text = hasData ? cancelled.formatStringInCommon() : "—"
    }

    func updateTopProducts(_ products: [TopProduct]) {
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
                isIPad: isIPad
            )
        }

        OverviewUIBuilder.populateRows(
            in: topProductsRowsStackView,
            rows: rows,
            emptyText: "No product performance for this period".localized()
        )
    }

    func updateTopCustomers(_ customers: [TopCustomer]) {
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
                isIPad: isIPad
            )
        }

        OverviewUIBuilder.populateRows(
            in: topCustomersRowsStackView,
            rows: rows,
            emptyText: "No customer performance for this period".localized()
        )
    }

    private func makeSnapshotGrid() -> UIStackView {
        let topRow = UIStackView(arrangedSubviews: [
            OverviewUIBuilder.makeSnapshotItem(
                title: "Reserved".localized(),
                valueLabel: reservedValueLabel,
                backgroundColor: .backgroundCard,
                tintColor: .statusReservedText
            ),
            OverviewUIBuilder.makeSnapshotItem(
                title: "In Progress".localized(),
                valueLabel: activeValueLabel,
                backgroundColor: .backgroundCard,
                tintColor: .statusActiveText
            )
        ])
        topRow.axis = .horizontal
        topRow.spacing = 8
        topRow.distribution = .fillEqually

        let bottomRow = UIStackView(arrangedSubviews: [
            OverviewUIBuilder.makeSnapshotItem(
                title: "Completed".localized(),
                valueLabel: completedValueLabel,
                backgroundColor: .backgroundCard,
                tintColor: .statusDoneText
            ),
            OverviewUIBuilder.makeSnapshotItem(
                title: "Cancelled".localized(),
                valueLabel: cancelledValueLabel,
                backgroundColor: .backgroundCard,
                tintColor: .statusCancelledText
            )
        ])
        bottomRow.axis = .horizontal
        bottomRow.spacing = 8
        bottomRow.distribution = .fillEqually

        let stack = UIStackView(arrangedSubviews: [topRow, bottomRow])
        stack.axis = .vertical
        stack.spacing = 8
        return stack
    }
}
