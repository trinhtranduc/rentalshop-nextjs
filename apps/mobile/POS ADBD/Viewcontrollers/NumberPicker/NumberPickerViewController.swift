import UIKit
import SnapKit

protocol NumberPickerViewControllerDelegate: AnyObject {
    func didSelectNumber(_ value: Double, sender: NumberPickerViewController)
}

enum NumberPickerMode {
    case normal
    case discount(type: DiscountPadType)
}

enum DiscountPadType {
    case percentage
    case amount
}

/// Price / deposit / discount keypad as a filter-style sheet:
/// centered title, no Cancel, one blue Confirm. Dismiss with the grabber.
class NumberPickerViewController: UIViewController {
    weak var delegate: NumberPickerViewControllerDelegate?
    var tag: Int = 0
    var mode: NumberPickerMode = .normal
    private var currentValue: Double = 0
    private var result: String = "0" {
        didSet { refreshValueLabel() }
    }
    private var discountType: DiscountPadType = .percentage

    private let headerView = RCSheetHeaderView()

    private lazy var valueLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 48)
        label.textColor = .textPrimary
        label.textAlignment = .center
        return label
    }()

    private lazy var numberPadStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 1
        stack.distribution = .fillEqually
        stack.backgroundColor = .systemGray5
        return stack
    }()

    private lazy var confirmButton: RCPrimaryButton = {
        RCPrimaryButton(title: "Confirm".localized(), backgroundColor: APP_TONE_COLOR)
    }()

    private lazy var discountTypeStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [percentButton, amountButton])
        stack.axis = .horizontal
        stack.spacing = 10
        stack.distribution = .fillEqually
        stack.isHidden = true
        return stack
    }()

    private lazy var percentButton: UIButton = {
        makeFilterChoiceButton(title: "%", action: #selector(percentTapped))
    }()

    private lazy var amountButton: UIButton = {
        makeFilterChoiceButton(title: "đ", action: #selector(amountTapped))
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        refreshValueLabel()
    }

    private func setupUI() {
        view.backgroundColor = .systemBackground
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)

        let footerStack = UIStackView(arrangedSubviews: [discountTypeStack, confirmButton])
        footerStack.axis = .vertical
        footerStack.spacing = 16

        view.addSubview(headerView)
        view.addSubview(valueLabel)
        view.addSubview(numberPadStackView)
        view.addSubview(footerStack)

        setupNumberPad()

        headerView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        valueLabel.snp.makeConstraints { make in
            make.top.equalTo(headerView.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview().inset(16)
            make.height.equalTo(65)
        }
        numberPadStackView.snp.makeConstraints { make in
            make.top.equalTo(valueLabel.snp.bottom).offset(16)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(232)
        }
        discountTypeStack.snp.makeConstraints { make in
            make.height.equalTo(44)
        }
        footerStack.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-12)
            make.top.greaterThanOrEqualTo(numberPadStackView.snp.bottom).offset(16)
        }
    }

    private func setupNumberPad() {
        [
            createNumberRow(numbers: ["1", "2", "3"]),
            createNumberRow(numbers: ["4", "5", "6"]),
            createNumberRow(numbers: ["7", "8", "9"]),
            createNumberRow(numbers: ["0", "000", "⌫"]),
        ].forEach { numberPadStackView.addArrangedSubview($0) }
    }

    private func createNumberRow(numbers: [String]) -> UIStackView {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 1
        stack.distribution = .fillEqually
        stack.backgroundColor = .systemGray5

        numbers.forEach { number in
            stack.addArrangedSubview(createNumberButton(title: number))
        }
        return stack
    }

    private func createNumberButton(title: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 24)
        button.setTitleColor(.label, for: .normal)
        button.backgroundColor = .systemBackground
        if title == "⌫" {
            button.addTarget(self, action: #selector(deleteNumber), for: .touchUpInside)
        } else {
            button.addTarget(self, action: #selector(numberTapped(_:)), for: .touchUpInside)
        }
        return button
    }

    func configure(
        initialValue: Double = 0,
        mode: NumberPickerMode = .normal,
        title: String? = nil
    ) {
        self.currentValue = initialValue
        self.mode = mode

        switch mode {
        case .normal:
            headerView.title = title ?? "Input price or quantity".localized()
            discountTypeStack.isHidden = true
            result = initialValue.inString()

        case .discount(let type):
            headerView.title = title ?? "Input discount".localized()
            discountTypeStack.isHidden = false
            discountType = type
            updateDiscountTypeButtons()
            if type == .percentage {
                result = min(initialValue, 100).inString()
            } else {
                result = initialValue.inString()
            }
        }
        refreshValueLabel()
    }

    private func refreshValueLabel() {
        if case .discount(let type) = mode, type == .percentage {
            valueLabel.text = result.inDouble().formatStringInCommon() + "%"
        } else {
            valueLabel.text = result.inDouble().formatStringInCommon()
        }
    }

    @objc private func numberTapped(_ sender: UIButton) {
        guard let number = sender.title(for: .normal) else { return }
        if result == "0" {
            result = number
        } else {
            result.append(number)
        }
    }

    @objc private func deleteNumber() {
        result = String(result.dropLast())
        if result.isEmpty {
            result = "0"
        }
    }

    @objc private func confirmTapped() {
        let value = result.inDouble()
        switch mode {
        case .discount(let type):
            if type == .percentage {
                delegate?.didSelectNumber(min(value, 100), sender: self)
            } else {
                delegate?.didSelectNumber(value, sender: self)
            }
        case .normal:
            delegate?.didSelectNumber(value, sender: self)
        }
        dismiss(animated: true)
    }

    @objc private func percentTapped() {
        mode = .discount(type: .percentage)
        discountType = .percentage
        result = min(result.inDouble(), 100).inString()
        updateDiscountTypeButtons()
    }

    @objc private func amountTapped() {
        mode = .discount(type: .amount)
        discountType = .amount
        result = result.inDouble().inString()
        updateDiscountTypeButtons()
    }

    private func makeFilterChoiceButton(title: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 14)
        button.setTitleColor(.textPrimary, for: .normal)
        button.backgroundColor = UIColor.systemGray6
        button.layer.cornerRadius = 10
        button.layer.borderWidth = 1.5
        button.layer.borderColor = UIColor.clear.cgColor
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    private func applyFilterChoice(_ button: UIButton, selected: Bool) {
        button.backgroundColor = selected ? .systemBackground : UIColor.systemGray6
        button.layer.borderColor = selected ? UIColor.label.cgColor : UIColor.clear.cgColor
        button.setTitleColor(.textPrimary, for: .normal)
    }

    private func updateDiscountTypeButtons() {
        applyFilterChoice(percentButton, selected: discountType == .percentage)
        applyFilterChoice(amountButton, selected: discountType == .amount)
    }
}

extension NumberPickerViewController {
    static func instance() -> NumberPickerViewController {
        let controller = NumberPickerViewController()
        controller.modalPresentationStyle = .pageSheet

        if let sheet = controller.sheetPresentationController {
            // Custom height fits keypad + Confirm. Filter-style: grabber, 16pt corners, no expand to large.
            let keypadHeight: CGFloat = {
                let header: CGFloat = 56
                let value: CGFloat = 8 + 65
                let pad: CGFloat = 16 + 232
                let confirm: CGFloat = 16 + 50 + 12
                let grabber: CGFloat = 20
                return header + value + pad + confirm + grabber
            }()
            let discountHeight = keypadHeight + 16 + 44

            if #available(iOS 16.0, *) {
                sheet.detents = [
                    .custom { _ in
                        if case .discount = controller.mode {
                            return discountHeight
                        }
                        return keypadHeight
                    },
                ]
            } else {
                sheet.detents = [.medium()]
                sheet.selectedDetentIdentifier = .medium
            }
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 16
            sheet.prefersScrollingExpandsWhenScrolledToEdge = false
        }

        return controller
    }
}
