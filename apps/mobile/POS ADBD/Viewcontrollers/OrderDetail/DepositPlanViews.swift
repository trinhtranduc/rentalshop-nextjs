//
//  DepositPlanViews.swift
//  POS ADBD
//
//  Order detail of a "Thu cọc theo giai đoạn" order (#1199, mockups m6, m7, m9, m10): the progress card, "Thu giai
//  đoạn N", the stages still unpaid at hand-over, the cancel sheet with the kept amount, and the plan editor.
//

import UIKit
import SnapKit

// MARK: - Progress card

enum InstallmentCardView {
    /// Chip text and colours of a stage
    static func chip(_ stage: OrderInstallment, today: String = DayFormatter.key(Date())) -> (String, DS.Pill) {
        switch stage.status {
        case "PAID": return ("deposit.status.paid".localized(), DS.Status.done)
        case "PARTIAL": return ("deposit.status.partial".localized(), DS.Status.waiting)
        case "VOID": return ("deposit.status.void".localized(), DS.Status.cancelled)
        case "OVERDUE":
            let late = lateDays(stage.dueDateKey, today: today)
            return (late > 0 ? String(format: "deposit.status.late".localized(), late) : "deposit.status.due".localized(), DS.Status.late)
        case "DUE_TODAY": return ("deposit.status.today".localized(), DS.Status.waiting)
        default: return ("deposit.status.pending".localized(), DS.Status.handOver)
        }
    }

    /// Whole days between a due day and today (both `YYYY-MM-DD`)
    static func lateDays(_ dueKey: String?, today: String) -> Int {
        guard let dueKey, dueKey.count == 10 else { return 0 }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        guard let due = formatter.date(from: dueKey), let now = formatter.date(from: today) else { return 0 }
        return max(0, Int(now.timeIntervalSince(due) / 86_400))
    }

    /// `dd/MM` of the shop day (Vietnam civil day) a stage was collected; never the UTC day (#1213, timezone-dates).
    /// `collectedAt` is an instant; `dueDateKey` is already a day key and goes to `DepositUI.dayText` as it is.
    static func paidDay(_ iso: String?) -> String {
        guard let iso, !iso.isEmpty else { return "" }
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        guard let instant = fractional.date(from: iso) ?? plain.date(from: iso) else { return DepositUI.dayText(String(iso.prefix(10))) }
        return DepositUI.dayText(DayFormatter.key(instant))
    }

    static func subtitle(_ stage: OrderInstallment) -> String {
        let percent = DepositPlanMath.percentText(stage.percent)
        if stage.isRest {
            return String(format: "deposit.card.restDetail".localized(), DepositUI.dayText(stage.dueDateKey))
        }
        if stage.isPaid {
            let day = paidDay(stage.collectedAt)
            return String(format: "deposit.card.paidDetail".localized(), percent, day)
        }
        return String(format: "deposit.card.dueDetail".localized(), percent, DepositUI.dayText(stage.dueDateKey))
    }

    /// The card. `onEdit` is "Sửa" / "Xem"; `onCollect` is the blue button; `onStage` a tap on a stage row.
    static func make(detail: OrderDetail, role: Role?, onEdit: @escaping () -> Void, onCollect: @escaping (OrderInstallment) -> Void,
                     onStage: @escaping (OrderInstallment) -> Void) -> UIView {
        let stages = detail.installments ?? []
        let summary = detail.installmentSummary
        let percent = summary?.percentCollected ?? 0
        let collected = summary?.collected ?? stages.reduce(0) { $0 + $1.paidAmount }
        let planned = summary?.planned ?? stages.reduce(0) { $0 + $1.amount }
        let reserved = detail.status == .reserved

        let title = DepositUI.wrapLabel("deposit.card.title".localized(), size: DS.TextSize.input, weight: .bold)
        let badge = DepositUI.pill(String(format: "deposit.badge.collected".localized(), DepositPlanMath.percentText(percent)), DS.Status.done)
        badge.accessibilityIdentifier = "deposit.card.badge"
        title.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        var head: [UIView] = [title, UIView(), badge]
        if reserved {
            let edit = UIButton(type: .system)
            edit.setTitle((DepositPlanLogic.canEditPlan(role: role) ? "deposit.card.edit" : "deposit.card.view").localized(), for: .normal)
            edit.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
            edit.addAction(UIAction { _ in onEdit() }, for: .touchUpInside)
            edit.accessibilityIdentifier = "deposit.card.edit"
            edit.setContentCompressionResistancePriority(.required, for: .horizontal)
            edit.setContentHuggingPriority(.required, for: .horizontal)
            head.append(edit)
        }
        let headRow = UIStackView(arrangedSubviews: head)
        headRow.spacing = 10
        headRow.alignment = .center

        let track = UIView()
        track.backgroundColor = UIColor(hexString: "E2E8F0")
        track.layer.cornerRadius = 4
        let fill = UIView()
        fill.backgroundColor = UIColor(hexString: "10B981")
        fill.layer.cornerRadius = 4
        track.addSubview(fill)
        track.snp.makeConstraints { make in make.height.equalTo(8) }
        fill.snp.makeConstraints { make in
            make.leading.top.bottom.equalToSuperview()
            make.width.equalToSuperview().multipliedBy(min(1, max(0.0001, percent / 100)))
        }

        func money(_ title: String, _ amount: Double, align: NSTextAlignment) -> UIView {
            let t = V2.label(title, size: DS.TextSize.secondary, color: DS.Color.textMuted)
            let v = V2.label(MoneyFormatter.format(amount), size: DS.TextSize.input, weight: .bold)
            t.textAlignment = align
            v.textAlignment = align
            let s = UIStackView(arrangedSubviews: [t, v])
            s.axis = .vertical
            return s
        }
        let totals = UIStackView(arrangedSubviews: [money("deposit.card.collected".localized(), collected, align: .left),
                                                    money("deposit.card.remaining".localized(), max(0, planned - collected), align: .right)])
        totals.distribution = .fillEqually

        let card = UIStackView(arrangedSubviews: [headRow, track, totals])
        card.axis = .vertical
        card.spacing = 10

        for (index, stage) in stages.enumerated() {
            card.addArrangedSubview(V2.divider())
            card.addArrangedSubview(stageRow(stage, number: index + 1, tappable: reserved && stage.isPaid && DepositPlanLogic.canVoid(role: role),
                                             onTap: onStage))
        }
        if reserved, let next = DepositPlanLogic.nextToCollect(stages, status: detail.status),
           let number = DepositPlanLogic.stageNumber(stages, key: next.key) {
            let button = V2.primaryButton(String(format: "deposit.card.collectStage".localized(), number))
            button.layer.cornerRadius = 10
            button.snp.remakeConstraints { make in make.height.equalTo(46) }
            button.addAction(UIAction { _ in onCollect(next) }, for: .touchUpInside)
            button.accessibilityIdentifier = "deposit.card.collect"
            card.addArrangedSubview(button)
        }

        let box = UIView()
        box.layer.cornerRadius = 14
        box.layer.borderWidth = 1
        box.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        box.addSubview(card)
        card.snp.makeConstraints { make in make.edges.equalToSuperview().inset(14) }
        let holder = UIView()
        holder.addSubview(box)
        box.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: DS.Spacing.lg, bottom: 10, right: DS.Spacing.lg)) }
        holder.accessibilityIdentifier = "deposit.card"
        return holder
    }

    private static func stageRow(_ stage: OrderInstallment, number: Int, tappable: Bool, onTap: @escaping (OrderInstallment) -> Void) -> UIView {
        let circle = UIView()
        let paid = stage.isPaid
        circle.backgroundColor = paid ? UIColor(hexString: "10B981") : UIColor(hexString: "EFF6FF")
        circle.layer.cornerRadius = 12
        let glyph = V2.label(paid ? "✓" : "\(number)", size: DS.TextSize.pill, weight: .bold, color: paid ? .white : DS.Color.primary)
        circle.addSubview(glyph)
        glyph.snp.makeConstraints { make in make.center.equalToSuperview() }
        circle.snp.makeConstraints { make in make.size.equalTo(24) }
        let name = DepositUI.wrapLabel(stage.isRest ? "deposit.rest.label".localized() : stage.label, size: DS.TextSize.body)
        let sub = DepositUI.wrapLabel(subtitle(stage), size: DS.TextSize.pill, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [name, sub])
        texts.axis = .vertical
        texts.spacing = 2
        let (chipText, chipColors) = chip(stage)
        let amount = V2.label(MoneyFormatter.format(stage.amount), size: DS.TextSize.body, weight: .bold)
        amount.textAlignment = .right
        let right = UIStackView(arrangedSubviews: [amount, DepositUI.pill(chipText, chipColors)])
        right.axis = .vertical
        right.alignment = .trailing
        right.spacing = 3
        right.setContentCompressionResistancePriority(.required, for: .horizontal)
        let line = UIStackView(arrangedSubviews: [circle, texts, right])
        line.spacing = 10
        line.alignment = .center
        let row = UIControl()
        line.isUserInteractionEnabled = false
        row.addSubview(line)
        line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)) }
        row.accessibilityIdentifier = "deposit.stage.\(stage.key)"
        if tappable { row.addAction(UIAction { _ in onTap(stage) }, for: .touchUpInside) }
        return row
    }
}

// MARK: - Thu giai đoạn N

final class CollectInstallmentSheet: V2FittingSheet, UITextFieldDelegate {
    /// Called after the API took the money
    var onCollected: (() -> Void)?

    private let detail: OrderDetail
    private let stage: OrderInstallment
    private let number: Int
    private let methods: [String]
    private var method: String
    private let amountField = UITextField()
    private let errorLabel = V2.label(size: DS.TextSize.secondary, color: DS.Status.late.text, lines: 0)
    private let confirmButton = V2.primaryButton("")
    private let methodStack = UIStackView()
    /// One per sheet: a retry after a lost answer is the same collect for the API
    private let reference = "ios-" + UUID().uuidString
    private var busy = false

    init(detail: OrderDetail, stage: OrderInstallment, number: Int) {
        self.detail = detail
        self.stage = stage
        self.number = number
        methods = DepositPlanLogic.collectMethods(role: User.account()?.role)
        method = "CASH"
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.addArrangedSubview(V2.label(String(format: "deposit.collect.title".localized(), number), size: 20, weight: .bold))
        let sub = [stage.isRest ? "deposit.rest.label".localized() : stage.label, DepositPlanMath.percentText(stage.percent) + "%"].joined(separator: " · ")
        stack.addArrangedSubview(V2.label(sub, size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0))

        amountField.text = MoneyInput.display(stage.remaining > 0 ? stage.remaining : stage.amount)
        amountField.font = UIFont.monospacedDigitSystemFont(ofSize: 22, weight: .bold)
        amountField.keyboardType = .numberPad
        amountField.textColor = DS.Color.text
        amountField.layer.cornerRadius = 12
        amountField.layer.borderWidth = 1.5
        amountField.layer.borderColor = DS.Color.primary.cgColor
        amountField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
        amountField.leftViewMode = .always
        amountField.delegate = self
        amountField.accessibilityIdentifier = "deposit.collect.amount"
        amountField.addTarget(self, action: #selector(amountChanged), for: .editingChanged)
        amountField.snp.makeConstraints { make in make.height.equalTo(56) }
        KeyboardDoneBar.attach([amountField])
        stack.addArrangedSubview(amountField)

        methodStack.axis = .vertical
        stack.addArrangedSubview(methodStack)
        renderMethods()

        errorLabel.isHidden = true
        stack.addArrangedSubview(errorLabel)
        let cancel = V2.secondaryButton("Cancel".localized())
        cancel.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        confirmButton.accessibilityIdentifier = "deposit.collect.confirm"
        stack.addArrangedSubview(V2FittingSheet.buttons(cancel: cancel, confirm: confirmButton, confirmRatio: 1.6))
        refresh()
    }

    private func renderMethods() {
        methodStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for item in methods {
            let row = DepositUI.radioRow(title: DepositUI.methodName(item), detail: nil, selected: item == method,
                                         identifier: "deposit.collect.method." + item)
            row.addAction(UIAction { [weak self] _ in
                self?.method = item
                self?.renderMethods()
            }, for: .touchUpInside)
            methodStack.addArrangedSubview(row)
        }
    }

    private var amount: Double { MoneyInput.parse(amountField.text) ?? 0 }

    private func refresh() {
        confirmButton.setTitle(String(format: "deposit.collect.confirm".localized(), MoneyFormatter.format(amount)), for: .normal)
        let valid = amount > 0 && amount <= stage.plannedAmount + 0.000001 && !busy
        confirmButton.isEnabled = valid
        confirmButton.alpha = valid ? 1 : 0.5
    }

    @objc private func amountChanged() {
        amountField.text = MoneyInput.display(MoneyInput.parse(amountField.text))
        errorLabel.isHidden = true
        refresh()
    }

    @objc private func closeTapped() { dismiss(animated: true) }

    @objc private func confirmTapped() {
        guard !busy else { return }
        busy = true
        isModalInPresentation = true
        refresh()
        let request = CollectInstallmentRequest(amount: amount, method: method, collectedOn: nil, note: nil, reference: reference)
        DepositPlanAPIService.shared.collect(orderId: detail.id, key: stage.key, request: request) { [weak self] ok, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.busy = false
                self.isModalInPresentation = false
                if ok {
                    self.dismiss(animated: true) { self.onCollected?() }
                } else {
                    self.errorLabel.text = error?.localizedDescription.localized() ?? "Error".localized()
                    self.errorLabel.isHidden = false
                    self.refresh()
                }
            }
        }
    }
}

// MARK: - Giai đoạn chưa thu khi giao

/// "Còn giai đoạn cọc chưa thu": the hand-over waits until these are collected (API: INSTALLMENT_UNPAID_AT_PICKUP)
final class UnpaidStagesSheet: V2FittingSheet {
    var onCollect: ((OrderInstallment) -> Void)?
    private let stages: [OrderInstallment]
    private let all: [OrderInstallment]

    init(unpaid: [OrderInstallment], all: [OrderInstallment]) {
        stages = unpaid
        self.all = all
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.addArrangedSubview(V2.label("deposit.unpaid.title".localized(), size: 20, weight: .bold, lines: 0))
        stack.addArrangedSubview(V2.label("deposit.unpaid.message".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0))
        for stage in stages {
            let number = DepositPlanLogic.stageNumber(all, key: stage.key) ?? 0
            let name = V2.label(String(format: "deposit.unpaid.row".localized(), number, stage.label), size: DS.TextSize.body, lines: 0)
            let amount = V2.label(MoneyFormatter.format(stage.amount), size: DS.TextSize.body, weight: .bold)
            amount.setContentCompressionResistancePriority(.required, for: .horizontal)
            let row = UIStackView(arrangedSubviews: [name, amount])
            row.spacing = 10
            stack.addArrangedSubview(row)
        }
        if let first = stages.first {
            let number = DepositPlanLogic.stageNumber(all, key: first.key) ?? 1
            let collect = V2.primaryButton(String(format: "deposit.card.collectStage".localized(), number))
            collect.accessibilityIdentifier = "deposit.unpaid.collect"
            collect.addAction(UIAction { [weak self] _ in
                self?.dismiss(animated: true) { self?.onCollect?(first) }
            }, for: .touchUpInside)
            stack.addArrangedSubview(collect)
        }
        let close = V2.secondaryButton("Cancel".localized())
        close.addAction(UIAction { [weak self] _ in self?.dismiss(animated: true) }, for: .touchUpInside)
        stack.addArrangedSubview(close)
    }
}

// MARK: - Huỷ đơn có giữ lại (#1199, mockup m7)

final class CancelDepositOrderSheet: V2FittingSheet, UITextFieldDelegate {
    /// kept amount and the note
    var onConfirm: ((Double, String?) -> Void)?

    private let orderNumber: String
    private let collected: Double
    private let policy: String?
    private let canKeep: Bool
    private var amounts: DepositPlanLogic.CancelAmounts
    private let keptField = UITextField()
    private let refundField = UITextField()
    private let noteField = DepositUI.field(nil, placeholder: "deposit.cancel.note".localized())
    private let confirmButton = UIButton(type: .system)

    init(orderNumber: String, collected: Double, policy: String?, canKeep: Bool) {
        self.orderNumber = orderNumber
        self.collected = collected
        self.policy = policy
        self.canKeep = canKeep
        amounts = .keeping(0, of: collected)
        super.init()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        stack.spacing = 10
        stack.addArrangedSubview(V2.label(String(format: "deposit.cancel.title".localized(), orderNumber), size: 22, weight: .bold, lines: 0))
        if let policy, !policy.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            stack.addArrangedSubview(DepositUI.warningBox(String(format: "deposit.cancel.policy".localized(), policy)))
        }
        stack.addArrangedSubview(row("deposit.cancel.paid".localized(), field: nil, value: MoneyFormatter.format(collected)))
        configure(keptField, id: "deposit.cancel.kept")
        configure(refundField, id: "deposit.cancel.refund")
        stack.addArrangedSubview(row("deposit.cancel.kept".localized(), field: keptField, value: nil))
        stack.addArrangedSubview(row("deposit.cancel.refund".localized(), field: refundField, value: nil))
        if canKeep {
            stack.addArrangedSubview(V2.label("deposit.cancel.hint".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0))
            noteField.accessibilityIdentifier = "deposit.cancel.noteField"
            stack.addArrangedSubview(noteField)
        } else {
            stack.addArrangedSubview(V2.label("deposit.cancel.staffHint".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0))
        }
        confirmButton.setTitle("deposit.cancel.confirm".localized(), for: .normal)
        confirmButton.setTitleColor(.white, for: .normal)
        confirmButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        confirmButton.backgroundColor = UIColor(hexString: "DC2626")
        confirmButton.layer.cornerRadius = 12
        confirmButton.snp.makeConstraints { make in make.height.equalTo(52) }
        confirmButton.accessibilityIdentifier = "deposit.cancel.confirm"
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        stack.addArrangedSubview(confirmButton)
        show()
    }

    private func configure(_ field: UITextField, id: String) {
        field.font = Utils.boldFont(size: 17)
        field.textColor = canKeep ? DS.Color.primary : DS.Color.text
        field.textAlignment = .right
        field.keyboardType = .numberPad
        field.isEnabled = canKeep
        field.accessibilityIdentifier = id
        field.addTarget(self, action: #selector(changed(_:)), for: .editingChanged)
        // a tap selects the number, so typing replaces it (a "0" left in front would turn 1800000 into 18000000)
        field.addAction(UIAction { [weak field] _ in DispatchQueue.main.async { field?.selectAll(nil) } }, for: .editingDidBegin)
        KeyboardDoneBar.attach([field])
    }

    private func row(_ title: String, field: UITextField?, value: String?) -> UIView {
        let label = V2.label(title, size: 17)
        let right: UIView
        if let field {
            field.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(120) }
            right = field
        } else {
            right = V2.label(value, size: 17, weight: .bold)
        }
        let line = UIStackView(arrangedSubviews: [label, UIView(), right])
        line.alignment = .center
        line.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(44) }
        return line
    }

    private func show() {
        keptField.text = MoneyInput.display(amounts.kept)
        refundField.text = MoneyInput.display(amounts.refund)
        confirmButton.isEnabled = amounts.isValid
        confirmButton.alpha = amounts.isValid ? 1 : 0.5
    }

    @objc private func changed(_ sender: UITextField) {
        let typed = MoneyInput.parse(sender.text) ?? 0
        amounts = sender === keptField ? .keeping(typed, of: collected) : .refunding(typed, of: collected)
        // the box being typed in stays empty at 0 (a "0" put back would send the next digit before it)
        func shown(_ value: Double) -> String { value > 0 ? MoneyInput.display(value) : "" }
        if sender === keptField { refundField.text = MoneyInput.display(amounts.refund); sender.text = shown(amounts.kept) }
        else { keptField.text = MoneyInput.display(amounts.kept); sender.text = shown(amounts.refund) }
        confirmButton.isEnabled = amounts.isValid
    }

    @objc private func confirmTapped() {
        view.endEditing(true)
        onConfirm?(canKeep ? amounts.kept : 0, canKeep ? noteField.text : nil)
    }
}

// MARK: - Sửa kế hoạch thanh toán (#1199, mockups m9 / m10)

final class EditDepositPlanViewController: BaseViewControler {
    /// Called after the plan was saved
    var onSaved: (() -> Void)?

    private struct Row {
        var key: String?
        var label: String
        var percent: Double
        var dueKey: String
        var paid: Bool
        var plannedAmount: Double
        /// the amount the stage had when it was opened: kept while the percentage is not touched
        var keepAmount: Double?
        var paidAmount: Double
    }

    private let detail: OrderDetail
    private let canEdit: Bool
    private var rows: [Row]
    private let rest: OrderInstallment?
    private let scroll = UIScrollView()
    private let stack = UIStackView()
    private let saveButton = V2.primaryButton("deposit.plan.save".localized())
    private let bottomBar = UIView()
    private var labelFields: [UITextField] = []
    private var percentFields: [UITextField] = []
    private var pickers: [UIDatePicker] = []
    private let totalLabel = V2.label(size: DS.TextSize.input, weight: .bold)
    private let okLabel = V2.label(size: DS.TextSize.body, weight: .bold, color: UIColor(hexString: "047857"))

    init(detail: OrderDetail, canEdit: Bool) {
        self.detail = detail
        self.canEdit = canEdit
        let stages = detail.installments ?? []
        rest = stages.first { $0.isRest }
        rows = stages.filter { !$0.isRest }.map { stage in
            // a stage the owner gave a fixed amount keeps it until its percentage is touched
            Row(key: stage.key, label: stage.label, percent: stage.percent, dueKey: stage.dueDateKey ?? DayFormatter.key(Date()),
                paid: stage.isPaid, plannedAmount: stage.amount,
                keepAmount: stage.isPaid || abs(stage.plannedAmount - DepositPlanMath.percentOf(detail.totalAmount, percent: stage.percent, currency: ShopCurrencyStore.current)) <= 0.5
                    ? nil : stage.plannedAmount,
                paidAmount: stage.paidAmount)
        }
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        if canEdit {
            view.addSubview(bottomBar)
            bottomBar.backgroundColor = DS.Color.surface
            bottomBar.addSubview(saveButton)
            saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
            saveButton.accessibilityIdentifier = "deposit.plan.save"
            saveButton.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(10)
                make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
                make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-DS.Spacing.sm)
            }
            bottomBar.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        }
        DepositUI.scaffold(in: self, title: (canEdit ? "deposit.plan.title.edit" : "deposit.plan.title.view").localized(),
                           scroll: scroll, stack: stack, bottom: canEdit ? bottomBar : nil)
        render()
    }

    private var total: Double { detail.installmentSummary?.planned ?? detail.totalAmount }
    private var orderTotal: Double { detail.totalAmount }

    private func amount(_ row: Row) -> Double {
        if row.paid { return row.paidAmount }
        if let keep = row.keepAmount { return keep }
        return DepositPlanMath.percentOf(orderTotal, percent: row.percent, currency: ShopCurrencyStore.current)
    }

    private func render() {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        labelFields = []
        percentFields = []
        pickers = []
        if !canEdit {
            let box = DepositUI.warningBox("deposit.plan.staffNote".localized())
            let holder = UIView()
            holder.addSubview(box)
            box.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 4, right: DS.Spacing.lg)) }
            stack.addArrangedSubview(holder)
        }
        stack.addArrangedSubview(V2.sectionHeader("deposit.plan.header".localized()))
        let sub = V2.label("#\(detail.orderNumber) · \(MoneyFormatter.format(orderTotal))", size: DS.TextSize.secondary, color: DS.Color.textMuted)
        stack.addArrangedSubview(pad(sub))
        for (index, row) in rows.enumerated() { stack.addArrangedSubview(pad(card(index, row))) }
        if canEdit && rows.count < 3 {
            let add = UIButton(type: .system)
            add.setTitle("deposit.template.addStage".localized(), for: .normal)
            add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
            add.contentHorizontalAlignment = .leading
            add.contentEdgeInsets = UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 0, right: 0)
            add.addTarget(self, action: #selector(addStage), for: .touchUpInside)
            add.accessibilityIdentifier = "deposit.plan.add"
            add.snp.makeConstraints { make in make.height.equalTo(48) }
            stack.addArrangedSubview(add)
        }
        if let rest {
            let box = UIStackView(arrangedSubviews: [V2.label("deposit.rest.label".localized(), size: DS.TextSize.body, weight: .bold),
                                                     V2.label(String(format: "deposit.plan.restDetail".localized(), DepositUI.dayText(rest.dueDateKey)),
                                                              size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)])
            box.axis = .vertical
            box.spacing = 3
            stack.addArrangedSubview(pad(box))
        }
        totalLabel.text = ""
        okLabel.text = ""
        let totals = UIStackView(arrangedSubviews: [totalLabel, UIView(), okLabel])
        stack.addArrangedSubview(pad(totals))
        stack.addArrangedSubview(DepositUI.gap(24))
        refreshTotals()
    }

    private func pad(_ view: UIView) -> UIView {
        let holder = UIView()
        holder.addSubview(view)
        view.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 6, left: DS.Spacing.lg, bottom: 6, right: DS.Spacing.lg)) }
        return holder
    }

    private func card(_ index: Int, _ row: Row) -> UIView {
        let label = DepositUI.field(row.label, placeholder: "deposit.template.stage.label".localized())
        label.isEnabled = canEdit && !row.paid
        labelFields.append(label)
        label.accessibilityIdentifier = "deposit.plan.label.\(index)"
        let percent = DepositUI.field(DepositPlanMath.percentText(row.percent), placeholder: "%", keyboard: .decimalPad)
        percent.isEnabled = canEdit && !row.paid
        percent.snp.makeConstraints { make in make.width.equalTo(96) }
        percent.addTarget(self, action: #selector(percentChanged(_:)), for: .editingChanged)
        percent.tag = index
        percent.accessibilityIdentifier = "deposit.plan.percent.\(index)"
        percentFields.append(percent)
        let equals = V2.label("= " + MoneyFormatter.format(amount(row)), size: DS.TextSize.body, weight: .bold)
        equals.tag = 900 + index
        let percentLine = UIStackView(arrangedSubviews: [percent, V2.label("deposit.template.percentOfOrder".localized(), size: DS.TextSize.body, color: DS.Color.textMuted), UIView(), equals])
        percentLine.spacing = 8
        percentLine.alignment = .center

        var views: [UIView] = [label, percentLine]
        let picker = UIDatePicker()
        picker.datePickerMode = .date
        picker.preferredDatePickerStyle = .compact
        picker.timeZone = Date.shopTimeZone
        picker.date = Self.date(fromKey: row.dueKey)
        picker.isEnabled = canEdit && !row.paid
        picker.tag = index
        picker.addTarget(self, action: #selector(dueChanged(_:)), for: .valueChanged)
        picker.accessibilityIdentifier = "deposit.plan.due.\(index)"
        pickers.append(picker)
        let dueLine = UIStackView(arrangedSubviews: [V2.label("deposit.plan.due".localized(), size: DS.TextSize.body, color: DS.Color.textMuted), UIView(), picker])
        dueLine.alignment = .center
        views.append(dueLine)
        if row.paid {
            views.append(V2.label(String(format: "deposit.plan.locked".localized(), DepositUI.dayText(row.dueKey)), size: DS.TextSize.pill + 1,
                                   color: UIColor(hexString: "047857"), lines: 0))
        } else if canEdit && rows.count > 1 {
            let remove = UIButton(type: .system)
            remove.setTitle("deposit.template.removeStage".localized(), for: .normal)
            remove.setTitleColor(DS.Status.late.text, for: .normal)
            remove.titleLabel?.font = Utils.regularFont(size: DS.TextSize.secondary)
            remove.contentHorizontalAlignment = .trailing
            remove.addAction(UIAction { [weak self] _ in
                self?.captureFields()
                self?.rows.remove(at: index)
                self?.render()
            }, for: .touchUpInside)
            views.append(remove)
        }
        let box = UIStackView(arrangedSubviews: views)
        box.axis = .vertical
        box.spacing = 8
        box.isLayoutMarginsRelativeArrangement = true
        box.layoutMargins = UIEdgeInsets(top: 12, left: 12, bottom: 12, right: 12)
        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1
        box.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        box.backgroundColor = row.paid ? UIColor(hexString: "F8FAFC") : .white
        return box
    }

    static func date(fromKey key: String) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = Date.shopTimeZone
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return Date() }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2], hour: 12)) ?? Date()
    }

    private func captureFields() {
        for index in rows.indices where index < labelFields.count && !rows[index].paid {
            rows[index].label = labelFields[index].text ?? rows[index].label
        }
    }

    private func refreshTotals() {
        let explicit = rows.map { amount($0) }.reduce(0, +)
        let ok = explicit <= orderTotal + 0.000001
        // the automatic last stage is the rest: when the stages fit, the plan always adds up to 100%
        let percent = ok ? 100 : (orderTotal > 0 ? explicit / orderTotal * 100 : 0)
        totalLabel.text = String(format: "deposit.plan.total".localized(), DepositPlanMath.percentText((percent * 100).rounded() / 100), MoneyFormatter.format(ok ? orderTotal : explicit))
        okLabel.text = ok ? "✓ " + "deposit.plan.fits".localized() : "deposit.cart.exceeds.short".localized()
        okLabel.textColor = ok ? UIColor(hexString: "047857") : DS.Status.late.text
        saveButton.isEnabled = ok
        saveButton.alpha = ok ? 1 : 0.5
    }

    @objc private func percentChanged(_ sender: UITextField) {
        guard rows.indices.contains(sender.tag) else { return }
        rows[sender.tag].percent = Double((sender.text ?? "").replacingOccurrences(of: ",", with: ".")) ?? 0
        rows[sender.tag].keepAmount = nil
        if let label = view.viewWithTag(900 + sender.tag) as? UILabel {
            label.text = "= " + MoneyFormatter.format(amount(rows[sender.tag]))
        }
        refreshTotals()
    }

    @objc private func dueChanged(_ sender: UIDatePicker) {
        guard rows.indices.contains(sender.tag) else { return }
        rows[sender.tag].dueKey = DayFormatter.key(sender.date)
    }

    @objc private func addStage() {
        captureFields()
        let used = rows.reduce(0) { $0 + $1.percent }
        let next = DayFormatter.key(Date())
        rows.append(Row(key: nil, label: "deposit.stage.default2".localized(), percent: min(40, max(10, 100 - used - 10)), dueKey: next,
                        paid: false, plannedAmount: 0, keepAmount: nil, paidAmount: 0))
        render()
    }

    @objc private func saveTapped() {
        view.endEditing(true)
        captureFields()
        let items: [[String: Any]] = rows.map { row in
            var item: [String: Any] = ["label": row.label.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "—" : row.label,
                                       "type": "PERCENT", "value": row.percent, "dueDateKey": row.dueKey]
            if let key = row.key { item["key"] = key }
            if !row.paid, let keep = row.keepAmount { item["amountOverride"] = keep }
            return item
        }
        showProgressText(text: "Updating...".localized())
        DepositPlanAPIService.shared.editPlan(orderId: detail.id, items: items) { [weak self] ok, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if ok {
                    self.onSaved?()
                    self.navigationController?.popViewController(animated: true)
                } else if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
}
