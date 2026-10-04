//
//  OrderRowCell.swift
//  POS ADBD
//
//  One order card of the redesigned orders tab (#371): a "Việc cần làm" row or an order of a list.
//

import UIKit
import SnapKit

final class OrderRowCell: UITableViewCell {
    static let reuseId = "OrderRowCell"

    private let card = UIView()
    private let orderNumberLabel = UILabel()
    private let pillStack = UIStackView()
    private let customerLabel = UILabel()
    private let phoneLabel = UILabel()
    private let callButton = UIButton(type: .system)
    private let detailLabel = UILabel()
    private let dateLabel = UILabel()
    private let amountLabel = UILabel()

    private var phone: String?
    var onCall: ((String) -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        contentView.backgroundColor = .clear
        buildLayout()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func buildLayout() {
        card.backgroundColor = DS.Color.surface
        card.layer.cornerRadius = DS.Radius.card
        card.layer.borderWidth = 1
        card.layer.borderColor = DS.Color.border.cgColor
        contentView.addSubview(card)
        card.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.xs)
            make.bottom.equalToSuperview().offset(-DS.Spacing.xs)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }

        orderNumberLabel.font = Utils.boldFont(size: 15)
        orderNumberLabel.textColor = DS.Color.text
        orderNumberLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        pillStack.axis = .horizontal
        pillStack.spacing = DS.Spacing.xs
        pillStack.alignment = .center
        let topRow = UIStackView(arrangedSubviews: [orderNumberLabel, UIView(), pillStack])
        topRow.axis = .horizontal
        topRow.spacing = DS.Spacing.sm
        topRow.alignment = .center

        customerLabel.font = Utils.mediumFont(size: 15)
        customerLabel.textColor = DS.Color.text
        phoneLabel.font = Utils.regularFont(size: 13)
        phoneLabel.textColor = DS.Color.textMuted
        let customerColumn = UIStackView(arrangedSubviews: [customerLabel, phoneLabel])
        customerColumn.axis = .vertical
        customerColumn.spacing = 2

        callButton.setImage(UIImage(systemName: "phone.fill"), for: .normal)
        callButton.tintColor = DS.Color.primary
        callButton.backgroundColor = DS.Status.handOver.fill
        callButton.layer.cornerRadius = DS.touchTarget / 2
        callButton.accessibilityLabel = "Call customer".localized()
        callButton.addTarget(self, action: #selector(callTapped), for: .touchUpInside)
        callButton.snp.makeConstraints { make in
            make.size.equalTo(DS.touchTarget)
        }
        let customerRow = UIStackView(arrangedSubviews: [customerColumn, callButton])
        customerRow.axis = .horizontal
        customerRow.spacing = DS.Spacing.sm
        customerRow.alignment = .center

        detailLabel.font = Utils.regularFont(size: 13)
        detailLabel.textColor = DS.Color.textMuted
        detailLabel.numberOfLines = 2
        dateLabel.font = Utils.regularFont(size: 13)
        dateLabel.textColor = DS.Color.textMuted
        amountLabel.font = Utils.boldFont(size: 15)
        amountLabel.textColor = DS.Color.text
        amountLabel.textAlignment = .right
        amountLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let bottomRow = UIStackView(arrangedSubviews: [dateLabel, amountLabel])
        bottomRow.axis = .horizontal
        bottomRow.spacing = DS.Spacing.sm

        let stack = UIStackView(arrangedSubviews: [topRow, customerRow, detailLabel, bottomRow])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.sm
        card.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(DS.Spacing.md)
        }
    }

    override func setHighlighted(_ highlighted: Bool, animated: Bool) {
        super.setHighlighted(highlighted, animated: animated)
        card.backgroundColor = highlighted ? DS.Color.divider : DS.Color.surface
    }

    @objc private func callTapped() {
        guard let phone, !phone.isEmpty else { return }
        onCall?(phone)
    }

    // MARK: - Bind

    func configure(_ row: OrdersRow, showsType: Bool, hidesMoney: Bool) {
        pillStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        switch row {
        case .work(let work, let kind):
            bindWork(work, kind: kind, hidesMoney: hidesMoney)
        case .order(let order, let lateDays):
            bindOrder(order, lateDays: lateDays, showsType: showsType, hidesMoney: hidesMoney)
        }
    }

    private func bindWork(_ work: TodayWorkRow, kind: WorkKind, hidesMoney: Bool) {
        orderNumberLabel.text = "#\(work.orderNumber)"
        if work.lateDays > 0 {
            addPill(String(format: "Late %d days".localized(), work.lateDays), DS.Status.late)
        }
        if kind == .handOver && !work.isReadyToDeliver {
            addPill("Not prepared".localized(), DS.Status.waiting)
        }
        addPill(kind == .handOver ? "Hand over".localized() : "Take back".localized(),
                kind == .handOver ? DS.Status.handOver : DS.Status.returning)
        bindCustomer(name: work.customerName, phone: work.customerPhone)
        detailLabel.text = work.productNames
        detailLabel.isHidden = work.productNames.isEmpty
        let planned = kind == .handOver ? work.pickupPlanAt : work.returnPlanAt
        dateLabel.text = planned.map { DayFormatter.short($0) } ?? ""

        if hidesMoney {
            amountLabel.text = nil
        } else if work.refundDue > 0 {
            amountLabel.text = String(format: "Refund %@".localized(), MoneyFormatter.format(work.refundDue))
            amountLabel.textColor = DS.Status.returning.text
        } else if work.amountDue > 0 {
            amountLabel.text = String(format: "Collect %@".localized(), MoneyFormatter.format(work.amountDue))
            amountLabel.textColor = DS.Color.text
        } else {
            amountLabel.text = nil
        }
    }

    private func bindOrder(_ order: Order, lateDays: Int, showsType: Bool, hidesMoney: Bool) {
        orderNumberLabel.text = "#\(order.orderNumber)"
        if showsType {
            addPill(order.orderType == .rent ? "Order_Type_Rent".localized() : "Order_Type_Sale".localized(),
                    DS.Pill(text: DS.Color.textMuted, fill: DS.Color.divider))
        }
        if lateDays > 0 {
            addPill(String(format: "Late %d days".localized(), lateDays), DS.Status.late)
        }
        let status = OrderStatusPillLabel()
        status.apply(status: order.status)
        pillStack.addArrangedSubview(status)

        bindCustomer(name: order.customerName, phone: order.customerPhone)
        let count = order.itemCount
        detailLabel.text = "\(count) " + (count == 1 ? "item" : "items").localized()
        detailLabel.isHidden = false
        if order.orderType == .rent {
            let from = order.pickupPlanAt.map { DayFormatter.short($0) } ?? "—"
            let to = order.returnPlanAt.map { DayFormatter.short($0) } ?? "—"
            dateLabel.text = "\(from) → \(to)"
        } else {
            dateLabel.text = DayFormatter.short(order.createdAt)
        }
        amountLabel.textColor = DS.Color.text
        amountLabel.text = hidesMoney ? nil : MoneyFormatter.format(order.totalAmount)
    }

    private func bindCustomer(name: String?, phone: String?) {
        let trimmedName = name?.trimmingCharacters(in: .whitespaces) ?? ""
        customerLabel.text = trimmedName.isEmpty ? "N/A" : trimmedName
        let trimmedPhone = phone?.removeWhiteSpace() ?? ""
        self.phone = trimmedPhone
        phoneLabel.text = trimmedPhone.isEmpty ? nil : trimmedPhone.maskedPhoneNumber
        phoneLabel.isHidden = trimmedPhone.isEmpty
        callButton.isHidden = trimmedPhone.isEmpty
    }

    private func addPill(_ text: String, _ colors: DS.Pill) {
        let pill = OrderStatusPillLabel()
        pill.text = text
        pill.textColor = colors.text
        pill.backgroundColor = colors.fill
        pillStack.addArrangedSubview(pill)
    }
}

/// Section header: "TRỄ HẠN" in red, others muted
final class OrdersSectionHeaderView: UITableViewHeaderFooterView {
    static let reuseId = "OrdersSectionHeaderView"
    private let titleLabel = UILabel()

    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        var background = UIBackgroundConfiguration.clear()
        background.backgroundColor = DS.Color.background
        backgroundConfiguration = background
        titleLabel.font = Utils.boldFont(size: 13)
        contentView.addSubview(titleLabel)
        titleLabel.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg + DS.Spacing.xs)
            make.top.equalToSuperview().offset(DS.Spacing.md)
            make.bottom.equalToSuperview().offset(-DS.Spacing.xs)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(title: String, count: Int?, style: OrdersSection.Style) {
        let text = title.uppercased()
        titleLabel.text = count.map { "\(text) · \($0)" } ?? text
        titleLabel.textColor = style == .late ? DS.Status.late.text : DS.Color.textMuted
    }
}
