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
    /// #1025 orders of one product: the `.list` row with the sorted date bold (as on Tất cả đơn)
    case sortedList(sortedBy: RentOrdersFilter.SortDate)
    /// #888 "Tất cả đơn": "#code", then "↗ dd/mm/yy  ↩ dd/mm/yy" with the sorted date marked
    case rentList(sortedBy: RentOrdersFilter.SortDate)
    case sale
    case search
    /// #496 "Chưa lấy đồ": overdue rows get "Quá x ngày · nên gọi khách", the right side "còn thu" in orange
    case notPickedUp
    /// #891 (owner): product detail → its orders: the same row plus "× qty" of this product before the total
    case productOrders(quantity: Int)
}

/// #891 (option C): the pickup / return / sale date chips of an order row.
/// #1026 (owner): no fill; a grey icon then the date in dark text (only the status badge keeps colour)
final class DateChipStack: UIStackView {
    /// #1026: no fill, so no left padding; the right padding keeps the gap to the next chip
    static let chipInsets = UIEdgeInsets(top: 4, left: 0, bottom: 4, right: 4)

    override init(frame: CGRect) {
        super.init(frame: frame)
        spacing = DS.Spacing.sm
        alignment = .center
        setContentHuggingPriority(.required, for: .horizontal)
    }

    required init(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Fills the chips; an empty list hides the stack
    func show(_ chips: [DateChip]) {
        arrangedSubviews.forEach { $0.removeFromSuperview() }
        for chip in chips {
            let label = InsetLabel()
            label.insets = Self.chipInsets
            label.backgroundColor = chip.kind.colors.fill
            // #893 (owner on device): medium vs bold read the same; the sorted chip is bold (label and date),
            // the other one regular
            // #1008 (owner): an icon in place of the word "Lấy" / "Trả"; VoiceOver still reads "Lấy 14/10/26"
            let labelFont = chip.bold ? Utils.mediumFont(size: DS.TextSize.secondary) : Utils.regularFont(size: DS.TextSize.secondary)
            let text = NSMutableAttributedString(attributedString: DateChipIcon.text(chip.kind, font: labelFont))
            text.append(NSAttributedString(string: " ", attributes: [
                NSAttributedString.Key.font: labelFont,
                NSAttributedString.Key.foregroundColor: chip.kind.colors.text,
            ]))
            text.append(NSAttributedString(string: chip.date, attributes: [
                NSAttributedString.Key.font: chip.bold ? Utils.mediumFont(size: DS.TextSize.body) : Utils.regularFont(size: DS.TextSize.body),
                NSAttributedString.Key.foregroundColor: chip.kind.colors.text,
            ]))
            label.attributedText = text
            label.accessibilityLabel = chip.accessibilityText
            label.setContentCompressionResistancePriority(.required, for: .horizontal)
            addArrangedSubview(label)
        }
        isHidden = chips.isEmpty
    }
}

/// #1008 (owner): the date chip icon (`arrow.up.forward` pickup and sale, `arrow.uturn.backward` return) as text,
/// as big as `font` and centred on the text; #1026: grey (`DateChip.iconColor`)
enum DateChipIcon {
    static func text(_ kind: DateChip.Kind, font: UIFont) -> NSAttributedString {
        let config = UIImage.SymbolConfiguration(font: font)
        guard let image = UIImage(systemName: kind.symbolName, withConfiguration: config)?
            .withTintColor(kind.iconColor, renderingMode: .alwaysOriginal) else { return NSAttributedString() }
        let attachment = NSTextAttachment()
        attachment.image = image
        attachment.bounds = CGRect(x: 0, y: (font.capHeight - image.size.height) / 2,
                                   width: image.size.width, height: image.size.height)
        return NSAttributedString(attachment: attachment)
    }
}

/// #1032 (owner): an order row warning ("Trễ N ngày", "Chưa soạn đồ"): the icon then the text in the warning
/// colour, no fill and no left padding; VoiceOver reads only the text, as before
enum RowWarningLabel {
    /// No fill, so no left padding; the right padding keeps the gap to the next chip (as the date chips)
    static let insets = UIEdgeInsets(top: 4, left: 0, bottom: 4, right: 4)

    /// The icon, a space, then the text, all in the warning colour
    static func text(_ text: String, _ warning: RowWarning, font: UIFont = RowWarning.font) -> NSAttributedString {
        let config = UIImage.SymbolConfiguration(font: font)
        let result = NSMutableAttributedString()
        if let image = UIImage(systemName: warning.symbolName, withConfiguration: config)?
            .withTintColor(warning.color, renderingMode: .alwaysOriginal) {
            let attachment = NSTextAttachment()
            attachment.image = image
            attachment.bounds = CGRect(x: 0, y: (font.capHeight - image.size.height) / 2,
                                       width: image.size.width, height: image.size.height)
            result.append(NSAttributedString(attachment: attachment))
            result.append(NSAttributedString(string: " ", attributes: [NSAttributedString.Key.font: font]))
        }
        result.append(NSAttributedString(string: text, attributes: [
            NSAttributedString.Key.font: font,
            NSAttributedString.Key.foregroundColor: warning.color,
        ]))
        return result
    }

    static func make(_ text: String, _ warning: RowWarning) -> InsetLabel {
        let label = InsetLabel()
        label.insets = insets
        label.backgroundColor = .clear
        label.attributedText = Self.text(text, warning)
        label.accessibilityLabel = text
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        label.setContentHuggingPriority(.required, for: .horizontal)
        return label
    }
}

/// A label with padding and a rounded fill (#891 date chips and the "× qty" box)
final class InsetLabel: UILabel {
    var insets = UIEdgeInsets(top: 4, left: 8, bottom: 4, right: 8)

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + insets.left + insets.right, height: size.height + insets.top + insets.bottom)
    }

    override func drawText(in rect: CGRect) {
        super.drawText(in: UIEdgeInsetsInsetRect(rect, insets))
    }
}

/// Coloured tag of an order row (#468, boards Main / VL-tat-ca / VL-ban):
/// `.status` ("Giao", "Đã đặt") 14pt bold, 3/8 padding, radius 7; `.note` ("Trễ 1 ngày", "Chưa soạn đồ") 12pt regular,
/// 2/6 padding, radius 6
final class RowTagLabel: UILabel {
    enum Style {
        case status
        case note
    }

    let insets: UIEdgeInsets

    /// #891 (owner): THE status badge of an order, the same in the list rows and the order detail header
    static func statusBadge(_ tag: RowTag) -> RowTagLabel {
        let label = RowTagLabel(style: .status)
        label.apply(tag.text, tag.colors)
        return label
    }

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
    /// #888: the chip behind the date the list is sorted by
    static let markFill = UIColor(hexString: "EFF6FF")
    /// #496: "còn thu" on the "Chưa lấy đồ" list (Còn phải thu colour)
    static let dueColor = UIColor(hexString: "B45309")
    private static let callBorder = UIColor(hexString: "CBD5E1")
    private static let chevronColor = UIColor(hexString: "94A3B8")

    private let tagLabel = RowTagLabel.statusBadge(RowTag(text: "", colors: OrderStatusBadge.pill(for: .reserved)))
    private let nameLabel = UILabel()
    private let metaLabel = UILabel()
    private let taskLabel = UILabel()
    /// #891 (option C): "↗ 14/10/26" and "↩ 16/10/26" chips on line 3 (#1026: no colour; a sale "↗ 15/10/26")
    private let chipStack = DateChipStack()
    private let qtyLabel = InsetLabel()
    private let pillStack = UIStackView()
    private let totalLabel = UILabel()
    private let payLabel = UILabel()
    private let moneyStack = UIStackView()
    private var pillLine: UIStackView?
    private var thirdLine: UIStackView?
    /// #893 (owner): line 2 of a lean Việc cần làm row: the task date chip, "Trễ N ngày", "Chưa soạn đồ"; wraps
    private let workChipLines = UIStackView()
    /// #893 (owner): "còn thu N" under the total on a Việc cần làm row
    private let workDueLabel = UILabel()
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

    /// #1037: a row placed in a stack view instead of a table view (product and customer detail lists).
    /// Outside a table view a cell keeps its `contentView` on autoresizing, so the cell had no Auto Layout height
    /// and the rows collapsed to 0 pt. Here the content view is pinned to the cell, and its content sets the height.
    static func standalone() -> OrderRowCell {
        let cell = OrderRowCell(style: .default, reuseIdentifier: nil)
        cell.contentView.translatesAutoresizingMaskIntoConstraints = false
        cell.contentView.snp.makeConstraints { make in make.edges.equalToSuperview() }
        return cell
    }

    /// #888 (owner, mockup v5): line 1 name (one line, full width) + status badge right; line 2 "#code · tạo …";
    /// line 3 dates / task + total right; line 4 notes (late, not prepared) + pay line right. 8pt between lines.
    private func buildLayout() {
        nameLabel.font = Utils.mediumFont(size: DS.TextSize.name)
        nameLabel.textColor = DS.Color.text
        nameLabel.numberOfLines = 1
        nameLabel.lineBreakMode = .byTruncatingTail
        nameLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        tagLabel.setContentHuggingPriority(.required, for: .horizontal)
        tagLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let firstLine = UIStackView(arrangedSubviews: [nameLabel, tagLabel])
        firstLine.spacing = DS.Spacing.sm
        firstLine.alignment = .center

        metaLabel.font = Utils.regularFont(size: 13)
        metaLabel.textColor = Self.metaColor
        metaLabel.lineBreakMode = .byTruncatingTail
        taskLabel.font = Utils.mediumFont(size: DS.TextSize.body)
        taskLabel.textColor = DS.Color.text
        taskLabel.numberOfLines = 1
        taskLabel.lineBreakMode = .byTruncatingTail
        taskLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        taskLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)

        totalLabel.font = Utils.mediumFont(size: DS.TextSize.name)
        totalLabel.textColor = DS.Color.text
        // #468: the pay line is regular weight (colour carries the meaning); the total stays bold
        payLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        [totalLabel, payLabel].forEach {
            $0.setContentCompressionResistancePriority(.required, for: .horizontal)
            $0.setContentHuggingPriority(.required, for: .horizontal)
            $0.textAlignment = .right
        }
        qtyLabel.insets = UIEdgeInsets(top: 2, left: 7, bottom: 2, right: 7)
        qtyLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        qtyLabel.textColor = UIColor(hexString: "334155")
        qtyLabel.backgroundColor = UIColor(hexString: "F1F5F9")
        qtyLabel.layer.cornerRadius = 6
        qtyLabel.layer.masksToBounds = true
        qtyLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        qtyLabel.setContentHuggingPriority(.required, for: .horizontal)
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow - 1, for: .horizontal)
        workChipLines.axis = .vertical
        workChipLines.alignment = .leading
        workChipLines.spacing = 6
        workChipLines.isHidden = true
        workDueLabel.font = Utils.mediumFont(size: DS.TextSize.secondary)
        workDueLabel.textColor = DS.Status.waiting.text
        workDueLabel.textAlignment = .right
        workDueLabel.isHidden = true
        let amountStack = UIStackView(arrangedSubviews: [totalLabel, workDueLabel])
        amountStack.axis = .vertical
        amountStack.alignment = .trailing
        amountStack.spacing = 2
        amountStack.setContentCompressionResistancePriority(.required, for: .horizontal)
        amountStack.setContentHuggingPriority(.required, for: .horizontal)
        let thirdLine = UIStackView(arrangedSubviews: [taskLabel, chipStack, workChipLines, spacer, qtyLabel, amountStack])
        thirdLine.spacing = DS.Spacing.sm
        thirdLine.alignment = .center
        self.thirdLine = thirdLine
        moneyStack.isHidden = true // kept for the money switch; the amounts now sit in lines 3 and 4

        pillStack.spacing = 6
        pillStack.alignment = .leading
        let pillLine = UIStackView(arrangedSubviews: [pillStack, UIView(), payLabel])
        pillLine.alignment = .center
        pillLine.spacing = DS.Spacing.sm
        self.pillLine = pillLine

        let left = UIStackView(arrangedSubviews: [firstLine, metaLabel, thirdLine, pillLine])
        left.axis = .vertical
        left.spacing = DS.Gap.orderRowLine // #888 owner: ~8pt between lines
        left.alignment = .fill

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

        // #891 (owner): no ">" chevron; the whole row stays tappable and the content takes the width
        let row = UIStackView(arrangedSubviews: [left, callButton])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview().inset(DS.Gap.orderRowPadding) // #888 owner: 16pt
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
        resetForBind()
        switch row {
        case .work(let work, let kind):
            var isLate = false
            if case .work(let late) = context { isLate = late }
            bindWork(work, kind: kind, isLate: isLate, hidesMoney: hidesMoney)
        case .order(let order, let lateDays):
            bindOrder(order, lateDays: lateDays, context: context, hidesMoney: hidesMoney)
        }
        totalLabel.isHidden = hidesMoney
        if hidesMoney { payLabel.isHidden = true; workDueLabel.isHidden = true }
        pillStack.isHidden = pillStack.arrangedSubviews.isEmpty
        pillLine?.isHidden = pillStack.arrangedSubviews.isEmpty && payLabel.isHidden
    }

    private func resetForBind() {
        pillStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        callButton.isHidden = true
        setChips([])
        qtyLabel.isHidden = true
        metaLabel.font = Utils.regularFont(size: 13)
        metaLabel.textColor = Self.metaColor
        metaLabel.isHidden = false
        workChipLines.arrangedSubviews.forEach { $0.removeFromSuperview() }
        workChipLines.isHidden = true
        thirdLine?.alignment = .center
        totalLabel.font = Utils.mediumFont(size: DS.TextSize.name)
        workDueLabel.isHidden = true
    }

    /// #893 (owner): lays the chips out in lines that fit `width` (wrap only when they do not fit)
    private func setWorkChips(_ chips: [OrdersHomeLogic.WorkChip], width: CGFloat) {
        Self.fillChipLines(workChipLines, chips: chips, width: width)
    }

    /// #893: chip lines shared by Việc cần làm and the calendar day rows
    static func fillChipLines(_ stack: UIStackView, chips: [OrdersHomeLogic.WorkChip], width: CGFloat) {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        var line = UIStackView()
        var used: CGFloat = 0
        for chip in chips {
            let label: InsetLabel
            if let warning = chip.warning {
                // #1032 (owner): "Trễ N ngày" / "Chưa soạn đồ": icon + coloured text, no box
                label = RowWarningLabel.make(chip.text, warning)
            } else {
                label = InsetLabel()
                label.insets = UIEdgeInsets(top: 4, left: 8, bottom: 4, right: 8)
                label.font = Utils.mediumFont(size: DS.TextSize.secondary)
                label.text = chip.text
                label.textColor = chip.colors.text
                if let kind = chip.dateKind, let date = chip.date {
                    // #1008 (owner): the date chip shows its icon then the date; VoiceOver reads `text` ("Lấy 14/10/26")
                    let font = Utils.mediumFont(size: DS.TextSize.secondary)
                    let text = NSMutableAttributedString(attributedString: DateChipIcon.text(kind, font: font))
                    text.append(NSAttributedString(string: " " + date, attributes: [
                        NSAttributedString.Key.font: font,
                        NSAttributedString.Key.foregroundColor: chip.colors.text,
                    ]))
                    label.attributedText = text
                    label.accessibilityLabel = chip.text
                    // #1026 (owner): the date chip has no fill, so no left padding
                    label.insets = DateChipStack.chipInsets
                }
                label.backgroundColor = chip.colors.fill
                label.layer.cornerRadius = 8
                label.layer.masksToBounds = true
            }
            let size = label.intrinsicContentSize.width
            if used > 0 && used + 6 + size > width {
                stack.addArrangedSubview(line)
                line = UIStackView()
                used = 0
            }
            line.spacing = 6
            line.addArrangedSubview(label)
            used += (used > 0 ? 6 : 0) + size
        }
        if !line.arrangedSubviews.isEmpty { stack.addArrangedSubview(line) }
        stack.isHidden = chips.isEmpty
    }

    /// #891 (owner): a customer's order (customer detail): the same row with the item names in place of the name
    func configure(customerOrder row: CustomerOrderRow, hidesMoney: Bool) {
        resetForBind()
        let tag = OrdersHomeLogic.statusTag(row.status)
        tagLabel.apply(tag.text, tag.colors)
        nameLabel.text = CustomersV2Logic.itemsTitle(row)
        var meta = "#\(OrdersHomeLogic.shortNumber(row.orderNumber))"
        if let created = row.createdAt {
            meta += " · " + String(format: "orders.row.created".localized(), DayFormatter.dmyTime(created))
        }
        metaLabel.text = meta
        if row.orderType == .rent {
            setLines(OrderRowLines(meta: meta, task: ""))
            setChips(OrdersHomeLogic.dateChips(pickupPlanAt: row.pickupPlanAt, returnPlanAt: row.returnPlanAt, sortedBy: nil))
        } else {
            let lines = OrdersHomeLogic.rowLines(code: OrdersHomeLogic.shortNumber(row.orderNumber), orderType: .sale,
                                                 status: row.status, createdAt: row.createdAt, pickupPlanAt: nil,
                                                 returnPlanAt: nil, returnedAt: nil, updatedAt: row.createdAt, isLate: false)
            setLines(lines)
            // #1026 (owner): "Bán dd/mm/yy" → "↗ dd/mm/yy"
            setChips(OrdersHomeLogic.saleChip(orderType: .sale, status: row.status, createdAt: row.createdAt).map { [$0] } ?? [])
        }
        setTotal(row.totalAmount, struck: row.status == .cancelled)
        setPay(nil)
        totalLabel.isHidden = hidesMoney
        pillStack.isHidden = true
        pillLine?.isHidden = true
    }

    /// Fills the chip stack; an empty list hides it
    private func setChips(_ chips: [DateChip]) {
        chipStack.show(chips)
        if !chips.isEmpty { taskLabel.isHidden = true }
    }

    private func bindWork(_ work: TodayWorkRow, kind: WorkKind, isLate: Bool, hidesMoney: Bool) {
        // #893 (owner): the task tag in its light colours (a task, not an order status)
        if kind == .handOver {
            tagLabel.apply("orders.v2.tag.handOver".localized(), DS.Status.handOver)
        } else {
            tagLabel.apply("orders.v2.tag.takeBack".localized(), DS.Status.returning)
        }
        setName(work.customerName)
        // #893 (owner, lean row): no "#code · tạo", no other date, no notes line; line 2 = the task's date chip,
        // "Trễ N ngày", "Chưa soạn đồ" (wrapping), and on the right "còn thu N" (else the total)
        metaLabel.isHidden = true
        taskLabel.isHidden = true
        chipStack.show([])
        thirdLine?.alignment = .top
        // Right: the total (bold) always; "còn thu N" smaller under it when something is due (owner)
        let dueText = OrdersHomeLogic.workDue(work).map { String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format($0)) }
        let totalText = MoneyFormatter.format(work.totalAmount)
        let totalWidth = (totalText as NSString).size(withAttributes: [NSAttributedString.Key.font: Utils.mediumFont(size: DS.TextSize.name)]).width
        let dueWidth = (dueText as NSString?)?.size(withAttributes: [NSAttributedString.Key.font: Utils.mediumFont(size: DS.TextSize.secondary)]).width ?? 0
        let available = PadLayout.rowWidthEstimate - 2 * DS.Gap.rowHorizontal - max(totalWidth, dueWidth) - DS.Spacing.sm
        setWorkChips(OrdersHomeLogic.workChips(work, kind: kind), width: available)
        setTotal(work.totalAmount, struck: false)
        workDueLabel.text = dueText
        workDueLabel.isHidden = dueText == nil
        setPay(nil)

        phone = OrdersHomeLogic.workCallPhone(work, isLate: isLate)
        callButton.isHidden = phone == nil
    }

    private func bindOrder(_ order: Order, lateDays: Int, context: OrderRowContext, hidesMoney: Bool) {
        let tag = OrdersHomeLogic.statusTag(order, inSearch: { if case .search = context { return true }; return false }())
        tagLabel.apply(tag.text, tag.colors)
        setName(order.customerName)
        setLines(OrdersHomeLogic.rowLines(order, lateDays: lateDays))
        if order.orderType == .rent {
            // #891 (option C): two light chips; on Tất cả đơn the sorted date is bolder, and a created-date sort
            // makes "tạo …" bold dark text
            var sortedBy: RentOrdersFilter.SortDate?
            if case .rentList(let date) = context { sortedBy = date }
            if case .sortedList(let date) = context { sortedBy = date }
            metaLabel.text = OrdersHomeLogic.rentRowMeta(order)
            if OrdersHomeLogic.metaIsBold(sortedBy: sortedBy) {
                metaLabel.font = Utils.mediumFont(size: 13)
                metaLabel.textColor = DS.Color.text
            }
            setChips(OrdersHomeLogic.dateChips(pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt, sortedBy: sortedBy))
        } else if let sale = OrdersHomeLogic.saleChip(orderType: order.orderType, status: order.status, createdAt: {
            // #1041: a product's sorted list shows the day it is sorted by; every other list the created day
            guard case .sortedList(let date) = context else { return order.createdAt }
            return OrdersHomeLogic.saleChipDate(createdAt: order.createdAt, pickupPlanAt: order.pickupPlanAt, sortedBy: date)
        }()) {
            // #1026 (owner): "Bán dd/mm/yy" → "↗ dd/mm/yy"; VoiceOver still reads "Bán dd/mm/yy"
            setChips([sale])
        }
        if case .productOrders(let quantity) = context {
            qtyLabel.text = "× \(quantity)"
            qtyLabel.isHidden = false
        }
        setTotal(order.totalAmount, struck: order.status == .cancelled)
        if case .notPickedUp = context {
            if lateDays > 0 {
                addWarning(PluralText.format("notPickedUp.chip", count: lateDays, lateDays), .late)
            }
            // Only what is still to collect, in the Còn phải thu colour
            if let due = order.listAmountDue, due > 0 {
                setPay(.due(due))
                payLabel.textColor = Self.dueColor
            } else {
                setPay(nil)
            }
        } else {
            // #888 (owner): no "Trễ N ngày" chip on Tất cả đơn; Việc cần làm and the detail keep it
            let isRentList: Bool = { if case .rentList = context { return true }; return false }()
            let isProducts: Bool = { if case .productOrders = context { return true }; return false }()
            if lateDays > 0 && !isRentList && !isProducts {
                addWarning(LateText.days(lateDays), .late)
            }
            // Balances of the list API (#389); nothing on an older API, a cancelled order or when fully paid (#458)
            // #891 (owner): Tất cả đơn and product order rows show no pay line; the other lists keep it
            let isProductList: Bool = { if case .productOrders = context { return true }; return false }()
            setPay(isRentList || isProductList ? nil : OrdersHomeLogic.listPayLine(order))
        }
        // #1199/#1222: "Đã thu 30%" on an order that has a deposit plan
        if order.status == .reserved,
           let badge = DepositPlanLogic.badge(percentCollected: DepositPlanLogic.listBadgePercent(order)) {
            pillStack.addArrangedSubview(DepositUI.pill(badge, DS.Status.done))
        }
        phone = nil
    }

    private func setName(_ name: String?) {
        let trimmed = name?.trimmingCharacters(in: .whitespaces) ?? ""
        nameLabel.text = trimmed.isEmpty ? "N/A" : trimmed
    }

    private func setLines(_ lines: OrderRowLines) {
        metaLabel.text = lines.meta
        taskLabel.attributedText = nil
        taskLabel.font = Utils.mediumFont(size: DS.TextSize.body)
        taskLabel.textColor = DS.Color.text
        taskLabel.text = lines.task
        taskLabel.accessibilityLabel = nil
        taskLabel.isHidden = lines.task.isEmpty
    }

    private func setTotal(_ amount: Double, struck: Bool) {
        let text = MoneyFormatter.format(amount)
        if struck {
            totalLabel.attributedText = NSAttributedString(string: text, attributes: [
                NSAttributedString.Key.strikethroughStyle: NSUnderlineStyle.styleSingle.rawValue,
                NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
                NSAttributedString.Key.font: Utils.mediumFont(size: DS.TextSize.name),
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

    /// #1032 (owner): "Trễ N ngày" / "Quá N ngày" on line 4: icon + red text, no box
    private func addWarning(_ text: String, _ warning: RowWarning) {
        pillStack.addArrangedSubview(RowWarningLabel.make(text, warning))
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
