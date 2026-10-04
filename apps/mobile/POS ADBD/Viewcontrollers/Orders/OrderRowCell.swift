//
//  OrderRowCell.swift
//  POS ADBD
//
//  One row of the redesigned orders tab (#371, boards Main / VL-tat-ca / VL-ban / VL-tim since #401):
//  a flat row with a tag, the customer, items, a date line, pills, the total and its pay line.
//

import UIKit
import SnapKit

/// How a row is shown: a "Việc cần làm" row (late or not), a rent list row, a sale list row or a search result
enum OrderRowContext {
    case work(isLate: Bool)
    case list
    case sale
    case search
}

/// Small coloured tag ("Giao", "Đã đặt", "Trễ 1 ngày"): 11pt, 2/6 padding, radius 6
final class RowTagLabel: UILabel {
    private let insets = UIEdgeInsets(top: 2, left: 6, bottom: 2, right: 6)

    init(bold: Bool) {
        super.init(frame: .zero)
        font = bold ? Utils.boldFont(size: 11) : Utils.mediumFont(size: 11)
        layer.cornerRadius = DS.Radius.chip
        layer.masksToBounds = true
        setContentCompressionResistancePriority(.required, for: .horizontal)
        setContentHuggingPriority(.required, for: .horizontal)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func apply(_ text: String, _ colors: DS.Pill) {
        self.text = text
        textColor = colors.text
        backgroundColor = colors.fill
    }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + insets.left + insets.right, height: size.height + insets.top + insets.bottom)
    }

    override func drawText(in rect: CGRect) {
        super.drawText(in: UIEdgeInsetsInsetRect(rect, insets))
    }
}

final class OrderRowCell: UITableViewCell {
    static let reuseId = "OrderRowCell"

    private static let itemsColor = UIColor(hexString: "334155")
    private static let callBorder = UIColor(hexString: "CBD5E1")
    private static let chevronColor = UIColor(hexString: "94A3B8")

    private let tagLabel = RowTagLabel(bold: true)
    private let nameLabel = UILabel()
    private let itemsLabel = UILabel()
    private let whenLabel = UILabel()
    private let pillStack = UIStackView()
    private let totalLabel = UILabel()
    private let payLabel = UILabel()
    private let moneyStack = UIStackView()
    private let callButton = UIButton(type: .system)
    private let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))

    private var phone: String?
    var onCall: ((String) -> Void)?

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        backgroundColor = DS.Color.surface
        let highlight = UIView()
        highlight.backgroundColor = DS.Color.divider
        selectedBackgroundView = highlight
        buildLayout()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func buildLayout() {
        nameLabel.font = Utils.boldFont(size: 15)
        nameLabel.textColor = DS.Color.text
        nameLabel.lineBreakMode = .byTruncatingTail
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let firstLine = UIStackView(arrangedSubviews: [tagLabel, nameLabel])
        firstLine.spacing = 6
        firstLine.alignment = .center

        itemsLabel.font = Utils.regularFont(size: 13)
        itemsLabel.textColor = Self.itemsColor
        itemsLabel.lineBreakMode = .byTruncatingTail
        whenLabel.font = Utils.regularFont(size: 12)
        whenLabel.textColor = DS.Color.textMuted
        whenLabel.numberOfLines = 2
        pillStack.spacing = 6
        pillStack.alignment = .leading
        let pillLine = UIStackView(arrangedSubviews: [pillStack, UIView()])

        let left = UIStackView(arrangedSubviews: [firstLine, itemsLabel, whenLabel, pillLine])
        left.axis = .vertical
        left.spacing = 3
        left.alignment = .fill
        left.setCustomSpacing(5, after: whenLabel)

        totalLabel.font = Utils.boldFont(size: 15)
        totalLabel.textColor = DS.Color.text
        payLabel.font = Utils.boldFont(size: 12)
        moneyStack.axis = .vertical
        moneyStack.alignment = .trailing
        moneyStack.addArrangedSubview(totalLabel)
        moneyStack.addArrangedSubview(payLabel)
        moneyStack.setContentCompressionResistancePriority(.required, for: .horizontal)
        moneyStack.setContentHuggingPriority(.required, for: .horizontal)
        [totalLabel, payLabel].forEach {
            $0.setContentCompressionResistancePriority(.required, for: .horizontal)
            $0.textAlignment = .right
        }

        callButton.setImage(DS.symbol("phone", DS.Icon.sm), for: .normal)
        callButton.tintColor = DS.Color.text
        callButton.layer.cornerRadius = 10
        callButton.layer.borderWidth = 1
        callButton.layer.borderColor = Self.callBorder.cgColor
        callButton.accessibilityLabel = "Call customer".localized()
        callButton.addTarget(self, action: #selector(callTapped), for: .touchUpInside)
        callButton.snp.makeConstraints { make in make.size.equalTo(40) }

        chevron.tintColor = Self.chevronColor
        chevron.contentMode = .center
        chevron.snp.makeConstraints { make in make.size.equalTo(DS.Icon.sm) }

        let row = UIStackView(arrangedSubviews: [left, moneyStack, callButton, chevron])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(DS.Spacing.md)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }

        let divider = UIView()
        divider.backgroundColor = DS.Color.divider
        contentView.addSubview(divider)
        divider.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(1)
        }
    }

    @objc private func callTapped() {
        guard let phone, !phone.isEmpty else { return }
        onCall?(phone)
    }

    // MARK: - Bind

    func configure(_ row: OrdersRow, context: OrderRowContext, hidesMoney: Bool) {
        pillStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        callButton.isHidden = true
        switch row {
        case .work(let work, let kind):
            var isLate = false
            if case .work(let late) = context { isLate = late }
            bindWork(work, kind: kind, isLate: isLate, hidesMoney: hidesMoney)
        case .order(let order, let lateDays):
            bindOrder(order, lateDays: lateDays, context: context, hidesMoney: hidesMoney)
        }
        pillStack.superview?.isHidden = pillStack.arrangedSubviews.isEmpty
        moneyStack.isHidden = hidesMoney
    }

    private func bindWork(_ work: TodayWorkRow, kind: WorkKind, isLate: Bool, hidesMoney: Bool) {
        if kind == .handOver {
            tagLabel.apply("orders.v2.tag.handOver".localized(), DS.Status.handOver)
        } else {
            tagLabel.apply("orders.v2.tag.takeBack".localized(), DS.Status.returning)
        }
        setName(work.customerName)
        setItems(work.productNames)
        whenLabel.text = "#\(OrdersHomeLogic.shortNumber(work.orderNumber)) · "
            + OrdersHomeLogic.workWhen(work, kind: kind, isLate: isLate)
        if kind == .handOver && !work.isReadyToDeliver {
            addPill("orders.v2.notPrepared".localized(), DS.Status.waiting)
        }
        if work.lateDays > 0 {
            addPill(LateText.days(work.lateDays), DS.Status.late)
        }

        setTotal(work.totalAmount, struck: false)
        switch OrdersHomeLogic.payLine(amountDue: work.amountDue, refundDue: work.refundDue) {
        case .refund(let amount):
            setPay(String(format: "orders.v2.pay.refund".localized(), MoneyFormatter.format(amount)), DS.Status.returning.text)
        case .due(let amount):
            setPay(String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(amount)), DS.Status.waiting.text)
        case .paid:
            setPay("orders.v2.pay.paid".localized(), DS.Status.done.text)
        }

        // Board Main: the call button only on TRỄ HẠN rows
        let trimmedPhone = work.customerPhone?.removeWhiteSpace() ?? ""
        phone = trimmedPhone
        callButton.isHidden = !isLate || trimmedPhone.isEmpty
    }

    private func bindOrder(_ order: Order, lateDays: Int, context: OrderRowContext, hidesMoney: Bool) {
        let tag = OrdersHomeLogic.statusTag(order, inSearch: { if case .search = context { return true }; return false }())
        tagLabel.apply(tag.text, tag.colors)
        setName(order.customerName)
        setItems(order.itemsSummary)
        let number = "#\(OrdersHomeLogic.shortNumber(order.orderNumber))"
        switch context {
        case .sale:
            whenLabel.text = number
        case .search:
            whenLabel.text = number + " · " + OrdersHomeLogic.searchWhen(order, lateDays: lateDays)
        default:
            whenLabel.text = number + " · " + OrdersHomeLogic.listWhen(order, lateDays: lateDays)
        }
        if lateDays > 0 {
            addPill(LateText.days(lateDays), DS.Status.late)
        }
        // The list API has no per-step payments: the total only (no "còn thu")
        setTotal(order.totalAmount, struck: order.status == .cancelled)
        payLabel.text = nil
        payLabel.isHidden = true
        phone = nil
    }

    private func setName(_ name: String?) {
        let trimmed = name?.trimmingCharacters(in: .whitespaces) ?? ""
        nameLabel.text = trimmed.isEmpty ? "N/A" : trimmed
    }

    private func setItems(_ items: String) {
        itemsLabel.text = items
        itemsLabel.isHidden = items.isEmpty
    }

    private func setTotal(_ amount: Double, struck: Bool) {
        let text = MoneyFormatter.format(amount)
        if struck {
            totalLabel.attributedText = NSAttributedString(string: text, attributes: [
                NSAttributedString.Key.strikethroughStyle: NSUnderlineStyle.styleSingle.rawValue,
                NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
                NSAttributedString.Key.font: Utils.boldFont(size: 15),
            ])
        } else {
            totalLabel.attributedText = nil
            totalLabel.text = text
            totalLabel.textColor = DS.Color.text
        }
    }

    private func setPay(_ text: String, _ color: UIColor) {
        payLabel.text = text
        payLabel.textColor = color
        payLabel.isHidden = false
    }

    private func addPill(_ text: String, _ colors: DS.Pill) {
        let pill = RowTagLabel(bold: false)
        pill.font = Utils.boldFont(size: 11)
        pill.apply(text, colors)
        pillStack.addArrangedSubview(pill)
    }
}

/// Band over a group: "TRỄ HẠN · 3" on pink, others on light grey; a summary on the right
final class OrdersSectionHeaderView: UITableViewHeaderFooterView {
    static let reuseId = "OrdersSectionHeaderView"
    private static let titleColor = UIColor(hexString: "334155")
    private static let lateFill = UIColor(hexString: "FEF2F2")
    private static let normalFill = UIColor(hexString: "F8FAFC")

    private let titleLabel = UILabel()
    private let summaryLabel = UILabel()

    override init(reuseIdentifier: String?) {
        super.init(reuseIdentifier: reuseIdentifier)
        titleLabel.font = Utils.boldFont(size: 13)
        summaryLabel.font = Utils.regularFont(size: 13)
        summaryLabel.textColor = DS.Color.textMuted
        summaryLabel.textAlignment = .right
        summaryLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [titleLabel, summaryLabel])
        row.alignment = .firstBaseline
        row.spacing = DS.Spacing.sm
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.top.equalToSuperview().offset(10)
            make.bottom.equalToSuperview().offset(-6)
        }
        let divider = UIView()
        divider.backgroundColor = DS.Color.divider
        contentView.addSubview(divider)
        divider.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(1)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(title: String, summary: String?, style: OrdersSection.Style) {
        var background = UIBackgroundConfiguration.clear()
        background.backgroundColor = style == .late ? Self.lateFill : Self.normalFill
        backgroundConfiguration = background
        titleLabel.text = title
        titleLabel.textColor = style == .late ? DS.Status.late.text : Self.titleColor
        summaryLabel.text = summary
    }
}
