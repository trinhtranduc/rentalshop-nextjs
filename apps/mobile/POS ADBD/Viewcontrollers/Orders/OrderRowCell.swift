//
//  OrderRowCell.swift
//  POS ADBD
//
//  One row of the redesigned orders tab (#371, boards Main / VL-tat-ca / VL-ban / VL-tim since #401):
//  a flat row with a tag, the customer, items, a date line, pills, the total and its pay line.
//  #496: no item line; under the name "#code · tạo T? dd/mm" (muted) and a status line ("Giao … · trả …", "Trả …").
//

import UIKit
import SnapKit

/// How a row is shown: a "Việc cần làm" row (late or not), a rent list row, a sale list row or a search result
enum OrderRowContext {
    case work(isLate: Bool)
    case list
    case sale
    case search
    /// #496 "Chưa lấy đồ": overdue rows get "Quá x ngày · nên gọi khách", the right side "còn thu" in orange
    case notPickedUp
}

/// Coloured tag of an order row (#468, boards Main / VL-tat-ca / VL-ban):
/// `.status` ("Giao", "Đã đặt") 14pt bold, 3/8 padding, radius 7; `.note` ("Trễ 1 ngày", "Chưa soạn đồ") 12pt regular,
/// 2/6 padding, radius 6
final class RowTagLabel: UILabel {
    enum Style {
        case status
        case note
    }

    private let insets: UIEdgeInsets

    init(style: Style) {
        switch style {
        case .status:
            insets = UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8)
        case .note:
            insets = UIEdgeInsets(top: 2, left: 6, bottom: 2, right: 6)
        }
        super.init(frame: .zero)
        switch style {
        case .status:
            font = Utils.boldFont(size: DS.TextSize.secondary)
            layer.cornerRadius = DS.Radius.tag
        case .note:
            font = Utils.regularFont(size: DS.TextSize.pill)
            layer.cornerRadius = DS.Radius.chip
        }
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

    /// #496: the "#code · tạo …" line
    static let metaColor = UIColor(hexString: "64748B")
    /// #496: "còn thu" on the "Chưa lấy đồ" list (Còn phải thu colour)
    static let dueColor = UIColor(hexString: "B45309")
    private static let callBorder = UIColor(hexString: "CBD5E1")
    private static let chevronColor = UIColor(hexString: "94A3B8")

    private let tagLabel = RowTagLabel(style: .status)
    private let nameLabel = UILabel()
    private let metaLabel = UILabel()
    private let taskLabel = UILabel()
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
        nameLabel.font = Utils.boldFont(size: DS.TextSize.name)
        nameLabel.textColor = DS.Color.text
        // #424: a long name wraps to a second line (the tag stays centred beside it) instead of being cut
        nameLabel.numberOfLines = 2
        nameLabel.lineBreakMode = .byTruncatingTail
        // #430: above the other labels' hugging (251), so free width goes to the name, not the money column
        nameLabel.setContentCompressionResistancePriority(.defaultHigh - 1, for: .horizontal)
        let firstLine = UIStackView(arrangedSubviews: [tagLabel, nameLabel])
        firstLine.spacing = 6
        firstLine.alignment = .center

        metaLabel.font = Utils.regularFont(size: 13)
        metaLabel.textColor = Self.metaColor
        metaLabel.lineBreakMode = .byTruncatingTail
        taskLabel.font = Utils.mediumFont(size: DS.TextSize.body)
        taskLabel.textColor = DS.Color.text
        taskLabel.numberOfLines = 2
        pillStack.spacing = 6
        pillStack.alignment = .leading
        let pillLine = UIStackView(arrangedSubviews: [pillStack, UIView()])

        let left = UIStackView(arrangedSubviews: [firstLine, metaLabel, taskLabel, pillLine])
        left.axis = .vertical
        left.spacing = DS.Gap.line
        left.alignment = .fill
        left.setCustomSpacing(2, after: metaLabel)

        totalLabel.font = Utils.boldFont(size: DS.TextSize.name)
        totalLabel.textColor = DS.Color.text
        // #468: the pay line is regular weight (colour carries the meaning); the total stays bold
        payLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        moneyStack.axis = .vertical
        moneyStack.alignment = .trailing
        moneyStack.addArrangedSubview(totalLabel)
        moneyStack.addArrangedSubview(payLabel)
        moneyStack.setContentCompressionResistancePriority(.required, for: .horizontal)
        moneyStack.setContentHuggingPriority(.required, for: .horizontal)
        [totalLabel, payLabel].forEach {
            $0.setContentCompressionResistancePriority(.required, for: .horizontal)
            $0.setContentHuggingPriority(.required, for: .horizontal)
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
            make.top.bottom.equalToSuperview().inset(DS.Gap.orderRowVertical)
            make.leading.trailing.equalToSuperview().inset(DS.Gap.rowHorizontal)
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
        // #496: hand-overs are reserved rentals, take-backs rented out; the API sends no created day for these rows
        setLines(OrdersHomeLogic.rowLines(code: OrdersHomeLogic.shortNumber(work.orderNumber), orderType: .rent,
                                          status: kind == .handOver ? .reserved : .pickuped, createdAt: nil,
                                          pickupPlanAt: work.pickupPlanAt, returnPlanAt: work.returnPlanAt,
                                          returnedAt: nil, updatedAt: nil, isLate: isLate || work.lateDays > 0))
        if kind == .handOver && !work.isReadyToDeliver {
            addPill("orders.v2.notPrepared".localized(), DS.Status.waiting)
        }
        if work.lateDays > 0 {
            addPill(LateText.days(work.lateDays), DS.Status.late)
        }

        setTotal(work.totalAmount, struck: false)
        setPay(OrdersHomeLogic.payLine(amountDue: work.amountDue, refundDue: work.refundDue))

        phone = OrdersHomeLogic.workCallPhone(work, isLate: isLate)
        callButton.isHidden = phone == nil
    }

    private func bindOrder(_ order: Order, lateDays: Int, context: OrderRowContext, hidesMoney: Bool) {
        let tag = OrdersHomeLogic.statusTag(order, inSearch: { if case .search = context { return true }; return false }())
        tagLabel.apply(tag.text, tag.colors)
        setName(order.customerName)
        setLines(OrdersHomeLogic.rowLines(order, lateDays: lateDays))
        setTotal(order.totalAmount, struck: order.status == .cancelled)
        if case .notPickedUp = context {
            if lateDays > 0 {
                addPill(PluralText.format("notPickedUp.chip", count: lateDays, lateDays), DS.Status.late)
            }
            // Only what is still to collect, in the Còn phải thu colour
            if let due = order.listAmountDue, due > 0 {
                setPay(.due(due))
                payLabel.textColor = Self.dueColor
            } else {
                setPay(nil)
            }
        } else {
            if lateDays > 0 {
                addPill(LateText.days(lateDays), DS.Status.late)
            }
            // Balances of the list API (#389); nothing on an older API, a cancelled order or when fully paid (#458)
            setPay(OrdersHomeLogic.listPayLine(order))
        }
        phone = nil
    }

    private func setName(_ name: String?) {
        let trimmed = name?.trimmingCharacters(in: .whitespaces) ?? ""
        nameLabel.text = trimmed.isEmpty ? "N/A" : trimmed
    }

    private func setLines(_ lines: OrderRowLines) {
        metaLabel.text = lines.meta
        taskLabel.text = lines.task
        taskLabel.isHidden = lines.task.isEmpty
    }

    private func setTotal(_ amount: Double, struck: Bool) {
        let text = MoneyFormatter.format(amount)
        if struck {
            totalLabel.attributedText = NSAttributedString(string: text, attributes: [
                NSAttributedString.Key.strikethroughStyle: NSUnderlineStyle.styleSingle.rawValue,
                NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
                NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.name),
            ])
        } else {
            totalLabel.attributedText = nil
            totalLabel.text = text
            totalLabel.textColor = DS.Color.text
        }
    }

    /// "còn thu N" / "trả cọc N" under the total; no line (the total alone) when nothing is due (#458)
    private func setPay(_ line: PayLine?) {
        switch line {
        case .refund(let amount)?:
            payLabel.text = String(format: "orders.v2.pay.refund".localized(), MoneyFormatter.format(amount))
            payLabel.textColor = DS.Status.returning.text
            payLabel.isHidden = false
        case .due(let amount)?:
            payLabel.text = String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(amount))
            payLabel.textColor = DS.Status.waiting.text
            payLabel.isHidden = false
        case nil:
            payLabel.text = nil
            payLabel.isHidden = true
        }
    }

    private func addPill(_ text: String, _ colors: DS.Pill) {
        let pill = RowTagLabel(style: .note)
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
        titleLabel.font = Utils.boldFont(size: DS.TextSize.secondary)
        summaryLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
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
