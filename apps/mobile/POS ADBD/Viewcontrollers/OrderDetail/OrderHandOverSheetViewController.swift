//
//  OrderHandOverSheetViewController.swift
//  POS ADBD
//
//  Hand-over (Giao đồ) and return (Nhận trả) sheets of the redesigned order detail (#372, boards Giao-do,
//  Nhan-tra). Money follows the API rule (OrderDetailLogic). The detail screen does the API calls.
//

import UIKit
import SnapKit
import Kingfisher

final class OrderHandOverSheetViewController: UIViewController, UITextFieldDelegate {
    enum Mode {
        case handOver
        case takeReturn
    }

    /// lateFee, damageFee (return sheet)
    var onConfirm: ((Double, Double) -> Void)?
    /// papers, security deposit (hand-over sheet); both may be empty (#427)
    var onHandOver: ((String, Double) -> Void)?

    private let mode: Mode
    private let detail: OrderDetail
    private let payments: [OrderPaymentLine]
    private let lateDays: Int
    private let lateFeeField = UITextField()
    private let damageFeeField = UITextField()
    private let papersField = UITextField()
    private let securityDepositField = UITextField()
    private let moneyStack = UIStackView()
    private let confirmButton = UIButton(type: .system)

    init(mode: Mode, detail: OrderDetail, lateDays: Int) {
        self.mode = mode
        self.detail = detail
        self.lateDays = lateDays
        payments = detail.payments.map { OrderPaymentLine(amount: $0.amount, status: $0.status, notes: $0.notes) }
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let titleLabel = UILabel()
        titleLabel.text = mode == .handOver ? "Hand over items".localized() : "Take back items".localized()
        titleLabel.font = Utils.boldFont(size: 20)
        titleLabel.textColor = DS.Color.text

        let subtitle = UILabel()
        subtitle.font = Utils.regularFont(size: 14)
        subtitle.textColor = DS.Color.textMuted
        subtitle.numberOfLines = 2
        subtitle.text = subtitleText()

        let content = UIStackView(arrangedSubviews: [titleLabel, subtitle])
        content.axis = .vertical
        content.spacing = DS.Spacing.xs
        content.setCustomSpacing(DS.Spacing.md, after: subtitle)

        for item in detail.orderItems {
            content.addArrangedSubview(itemRow(item))
        }

        if mode == .handOver {
            // Optional papers and security deposit, prefilled from the order (#427)
            let papers = feeField(papersField, title: "order.handOver.papers".localized(), value: 0)
            papersField.keyboardType = .default
            papersField.autocapitalizationType = .allCharacters
            papersField.returnKeyType = .done
            papersField.text = detail.collateralDetails
            papersField.placeholder = "order.handOver.papersHint".localized()
            papersField.removeTarget(self, action: #selector(feeChanged(_:)), for: .editingChanged)
            papersField.accessibilityIdentifier = "handOver.papers"
            securityDepositField.accessibilityIdentifier = "handOver.securityDeposit"
            let deposit = feeField(securityDepositField, title: "order.handOver.deposit".localized(), value: detail.securityDeposit)
            content.addArrangedSubview(papers)
            content.setCustomSpacing(DS.Spacing.md, after: content.arrangedSubviews[content.arrangedSubviews.count - 2])
            content.addArrangedSubview(deposit)
            content.setCustomSpacing(DS.Spacing.md, after: papers)
        }

        if mode == .takeReturn {
            let fees = UIStackView(arrangedSubviews: [
                feeField(lateFeeField, title: lateDays > 0 ? PluralText.format("Late fee (%d days)", count: lateDays, lateDays) : "Late fee".localized(), value: detail.lateFee),
                feeField(damageFeeField, title: "Damage fee".localized(), value: detail.damageFee),
            ])
            fees.axis = .horizontal
            fees.spacing = DS.Spacing.md
            fees.distribution = .fillEqually
            content.addArrangedSubview(fees)
            content.setCustomSpacing(DS.Spacing.md, after: content.arrangedSubviews[content.arrangedSubviews.count - 2])
        }

        moneyStack.axis = .vertical
        moneyStack.spacing = 6
        moneyStack.isLayoutMarginsRelativeArrangement = true
        moneyStack.layoutMargins = UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)
        let moneyBox = UIView()
        moneyBox.backgroundColor = UIColor(hexString: "F8FAFC")
        moneyBox.layer.cornerRadius = 14
        moneyBox.addSubview(moneyStack)
        moneyStack.snp.makeConstraints { make in make.edges.equalToSuperview() }
        content.addArrangedSubview(moneyBox)
        content.setCustomSpacing(DS.Spacing.md, after: content.arrangedSubviews[content.arrangedSubviews.count - 2])

        let cancelButton = UIButton(type: .system)
        cancelButton.setTitle("Cancel".localized(), for: .normal)
        cancelButton.titleLabel?.font = Utils.boldFont(size: 15)
        cancelButton.tintColor = DS.Color.text
        cancelButton.layer.cornerRadius = 14
        cancelButton.layer.borderWidth = 1
        cancelButton.layer.borderColor = UIColor(hexString: "CBD5E1").cgColor
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

        confirmButton.titleLabel?.font = Utils.boldFont(size: 16)
        confirmButton.titleLabel?.adjustsFontSizeToFitWidth = true
        confirmButton.titleLabel?.minimumScaleFactor = 0.8
        confirmButton.tintColor = .white
        confirmButton.backgroundColor = DS.Color.primary
        confirmButton.layer.cornerRadius = 14
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)

        let buttons = UIStackView(arrangedSubviews: [cancelButton, confirmButton])
        buttons.axis = .horizontal
        buttons.spacing = 10
        cancelButton.snp.makeConstraints { make in make.height.equalTo(52) }
        confirmButton.snp.makeConstraints { make in
            make.height.equalTo(52)
            make.width.equalTo(cancelButton).multipliedBy(2)
        }

        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        scroll.keyboardDismissMode = .interactive
        scroll.addSubview(content)
        view.addSubview(scroll)
        view.addSubview(buttons)
        content.snp.makeConstraints { make in
            make.top.bottom.equalTo(scroll.contentLayoutGuide).inset(DS.Spacing.lg)
            make.leading.trailing.equalTo(scroll.frameLayoutGuide).inset(DS.Spacing.lg)
        }
        scroll.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.sm)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(buttons.snp.top).offset(-DS.Spacing.sm)
        }
        buttons.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.keyboardLayoutGuide.snp.top).offset(-DS.Spacing.md)
        }
        renderMoney()
    }

    // MARK: - Money

    private var enteredLateFee: Double { Self.amount(from: lateFeeField.text) }
    private var enteredDamageFee: Double { Self.amount(from: damageFeeField.text) }
    private var enteredSecurityDeposit: Double { Self.amount(from: securityDepositField.text) }

    static func amount(from text: String?) -> Double {
        Double((text ?? "").filter { $0.isNumber }) ?? 0
    }

    private func renderMoney() {
        moneyStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        switch mode {
        case .handOver:
            let money = OrderDetailLogic.handOver(total: detail.totalAmount, deposit: detail.depositAmount,
                                                  securityDeposit: enteredSecurityDeposit, payments: payments)
            moneyStack.addArrangedSubview(row("Order total".localized(), MoneyFormatter.format(money.total)))
            if money.deposit > 0 {
                moneyStack.addArrangedSubview(row("Deposit paid at booking".localized(), MoneyFormatter.format(-money.deposit)))
            }
            if money.collateralMoney > 0 {
                moneyStack.addArrangedSubview(row("Collateral money".localized(), "+" + MoneyFormatter.format(money.collateralMoney)))
            }
            if money.paidBefore > 0 {
                moneyStack.addArrangedSubview(row("Already collected".localized(), MoneyFormatter.format(-money.paidBefore)))
            }
            moneyStack.addArrangedSubview(totalRow("Collect now".localized(), MoneyFormatter.format(money.due), color: DS.Color.text))
            let title = money.due > 0
                ? String(format: "Handed over · collect %@".localized(), MoneyFormatter.format(money.due))
                : "Handed over".localized()
            confirmButton.setTitle(title, for: .normal)
        case .takeReturn:
            let money = OrderDetailLogic.returnMoney(lateFee: enteredLateFee, damageFee: enteredDamageFee,
                                                     securityDeposit: detail.securityDeposit, payments: payments)
            moneyStack.addArrangedSubview(row("Late + damage fees".localized(), MoneyFormatter.format(money.fees)))
            if money.collateralMoney > 0 {
                moneyStack.addArrangedSubview(row("Collateral money held".localized(), MoneyFormatter.format(-money.collateralMoney)))
            }
            if money.settledBefore > 0 {
                moneyStack.addArrangedSubview(row("Already settled".localized(), MoneyFormatter.format(-money.settledBefore)))
            }
            let title: String
            if money.refund > 0 {
                moneyStack.addArrangedSubview(totalRow("Give back to customer".localized(), MoneyFormatter.format(money.refund), color: DS.Status.done.text))
                title = String(format: "Taken back · give back %@".localized(), MoneyFormatter.format(money.refund))
            } else if money.collect > 0 {
                moneyStack.addArrangedSubview(totalRow("Collect more".localized(), MoneyFormatter.format(money.collect), color: DS.Color.text))
                title = String(format: "Taken back · collect %@".localized(), MoneyFormatter.format(money.collect))
            } else {
                moneyStack.addArrangedSubview(totalRow("Nothing to settle".localized(), MoneyFormatter.format(0), color: DS.Color.text))
                title = "Taken back".localized()
            }
            confirmButton.setTitle(title, for: .normal)
        }
    }

    // MARK: - Views

    private func subtitleText() -> String {
        let name = [detail.customer.firstName, detail.customer.lastName ?? ""]
            .map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " ")
        var parts = [name, "#\(detail.orderNumber)"]
        if mode == .takeReturn && lateDays > 0 {
            parts.append(LateText.returned(lateDays))
        } else if let from = detail.pickupPlanAt, let to = detail.returnPlanAt {
            parts.append("\(OrderDetailLogic.dayMonth(from)) → \(OrderDetailLogic.dayMonth(to))")
        }
        return parts.filter { !$0.isEmpty }.joined(separator: " · ")
    }

    private func itemRow(_ item: OrderItem) -> UIView {
        let image = UIImageView()
        image.contentMode = .scaleAspectFill
        image.clipsToBounds = true
        image.layer.cornerRadius = 10
        image.backgroundColor = DS.Color.background
        image.tintColor = DS.Color.textMuted
        image.kf.setImage(with: item.productImages?.first.flatMap { URL(string: $0) }, placeholder: UIImage(systemName: "tshirt"))
        image.snp.makeConstraints { make in make.size.equalTo(40) }
        let name = UILabel()
        name.font = Utils.regularFont(size: 15)
        name.textColor = DS.Color.text
        name.numberOfLines = 2
        name.text = item.productName
        let qty = UILabel()
        qty.font = Utils.regularFont(size: 14)
        qty.textColor = DS.Color.textMuted
        qty.text = "× \(item.quantity)"
        qty.setContentCompressionResistancePriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [image, name, qty])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = DS.Spacing.md
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(52) }
        return row
    }

    private func feeField(_ field: UITextField, title: String, value: Double) -> UIView {
        let label = UILabel()
        label.font = Utils.boldFont(size: 13)
        label.textColor = DS.Color.textMuted
        label.text = title
        field.keyboardType = .numberPad
        field.font = Utils.regularFont(size: 16)
        field.text = value > 0 ? MoneyFormatter.format(value) : ""
        field.placeholder = "0"
        field.borderStyle = .none
        field.layer.cornerRadius = 12
        field.layer.borderWidth = 1
        field.layer.borderColor = UIColor(hexString: "CBD5E1").cgColor
        field.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 1))
        field.leftViewMode = .always
        field.delegate = self
        field.addTarget(self, action: #selector(feeChanged(_:)), for: .editingChanged)
        field.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        let stack = UIStackView(arrangedSubviews: [label, field])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.xs
        return stack
    }

    private func row(_ title: String, _ value: String) -> UIView {
        let left = UILabel()
        left.font = Utils.regularFont(size: 14)
        left.textColor = DS.Color.textMuted
        left.text = title
        left.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let right = UILabel()
        right.font = Utils.regularFont(size: 14)
        right.textColor = DS.Color.text
        right.text = value
        right.textAlignment = .right
        right.setContentCompressionResistancePriority(.required, for: .horizontal)
        right.setContentHuggingPriority(.required, for: .horizontal)
        let stack = UIStackView(arrangedSubviews: [left, right])
        stack.axis = .horizontal
        stack.spacing = DS.Spacing.sm
        return stack
    }

    private func totalRow(_ title: String, _ value: String, color: UIColor) -> UIView {
        let left = UILabel()
        left.font = Utils.boldFont(size: 15)
        left.textColor = DS.Color.text
        left.text = title
        left.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let right = UILabel()
        right.font = Utils.boldFont(size: 22)
        right.textColor = color
        right.text = value
        right.textAlignment = .right
        right.setContentCompressionResistancePriority(.required, for: .horizontal)
        right.setContentHuggingPriority(.required, for: .horizontal)
        let stack = UIStackView(arrangedSubviews: [left, right])
        stack.axis = .horizontal
        stack.alignment = .firstBaseline
        stack.spacing = DS.Spacing.sm
        let separator = UIView()
        separator.backgroundColor = UIColor(hexString: "E2E8F0")
        separator.snp.makeConstraints { make in make.height.equalTo(1) }
        let wrapper = UIStackView(arrangedSubviews: [separator, stack])
        wrapper.axis = .vertical
        wrapper.spacing = 4
        return wrapper
    }

    // MARK: - Actions

    @objc private func feeChanged(_ field: UITextField) {
        let amount = Self.amount(from: field.text)
        field.text = amount > 0 ? MoneyFormatter.format(amount) : ""
        renderMoney()
    }

    @objc private func cancelTapped() {
        dismiss(animated: true)
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }

    @objc private func confirmTapped() {
        view.endEditing(true)
        if mode == .handOver {
            let papers = papersField.text ?? ""
            let deposit = enteredSecurityDeposit
            dismiss(animated: true) { [onHandOver] in
                onHandOver?(papers, deposit)
            }
            return
        }
        let late = enteredLateFee
        let damage = enteredDamageFee
        dismiss(animated: true) { [onConfirm] in
            onConfirm?(late, damage)
        }
    }
}
