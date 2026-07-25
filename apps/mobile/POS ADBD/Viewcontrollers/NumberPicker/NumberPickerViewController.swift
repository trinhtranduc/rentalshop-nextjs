import UIKit

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

class NumberPickerViewController: UIViewController {
    // MARK: - Properties
    weak var delegate: NumberPickerViewControllerDelegate?
    var tag: Int = 0
    var mode: NumberPickerMode = .normal
    private var currentValue: Double = 0
    private var result: String = "0" {
        didSet {
            // Format value based on discount type
            if case .discount(let type) = mode, type == .percentage {
                valueLabel.text = result.inDouble().formatStringInCommon() + "%"
            } else {
                valueLabel.text = result.inDouble().formatStringInCommon()
            }
            confirmButton.isEnabled = true
        }
    }
    private var discountType: DiscountPadType = .percentage
    
    // MARK: - UI Components
    private lazy var valueLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 48)
        label.textColor = .label
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.text = "Input price or quantity".localized()
        label.font = Utils.regularFont(size: 18)
        label.textColor = .secondaryLabel
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private lazy var numberPadStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 1
        stack.distribution = .fillEqually
        stack.backgroundColor = .systemGray5
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var buttonStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [cancelButton, confirmButton])
        stack.axis = .horizontal
        stack.spacing = 16
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()
    
    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel".localized(), for: .normal)
        button.setTitleColor(.gray, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 16)
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var confirmButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Confirm".localized(), for: .normal)
        button.setTitleColor(APP_BUTTON_BG_COLOR, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 16)
        button.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        button.isEnabled = false
        return button
    }()
    
    private lazy var discountTypeStack: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [percentButton, amountButton])
        stack.axis = .horizontal
        stack.spacing = 16
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.isHidden = true
        return stack
    }()
    
    private lazy var percentButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("%", for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 24)
        button.backgroundColor = APP_BUTTON_BG_COLOR
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = 5
        button.addTarget(self, action: #selector(percentTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var amountButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("đ", for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 24)
        button.backgroundColor = .white
        button.setTitleColor(APP_BUTTON_BG_COLOR, for: .normal)
        button.layer.cornerRadius = 5
        button.layer.borderWidth = 1
        button.layer.borderColor = APP_BUTTON_BG_COLOR.cgColor
        button.addTarget(self, action: #selector(amountTapped), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    // MARK: - Setup
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        view.addSubview(titleLabel)
        view.addSubview(valueLabel)
        view.addSubview(numberPadStackView)
        view.addSubview(discountTypeStack)
        view.addSubview(buttonStackView)
        
        setupNumberPad()
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            
            valueLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            valueLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            valueLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            valueLabel.heightAnchor.constraint(equalToConstant: 65),
            
            numberPadStackView.topAnchor.constraint(equalTo: valueLabel.bottomAnchor, constant: 16),
            numberPadStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            numberPadStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            numberPadStackView.heightAnchor.constraint(equalToConstant: 280),
            
            discountTypeStack.topAnchor.constraint(equalTo: numberPadStackView.bottomAnchor, constant: 16),
            discountTypeStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            discountTypeStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            discountTypeStack.heightAnchor.constraint(equalToConstant: 44),
            
            buttonStackView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            buttonStackView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            buttonStackView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            buttonStackView.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    private func setupNumberPad() {
        // Create rows
        let rows = [
            createNumberRow(numbers: ["1", "2", "3"]),
            createNumberRow(numbers: ["4", "5", "6"]),
            createNumberRow(numbers: ["7", "8", "9"]),
            createNumberRow(numbers: ["0", "000", "⌫"])
        ]
        
        rows.forEach { numberPadStackView.addArrangedSubview($0) }
    }
    
    private func createNumberRow(numbers: [String]) -> UIStackView {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 1
        stack.distribution = .fillEqually
        stack.backgroundColor = .systemGray5
        
        numbers.forEach { number in
            let button = createNumberButton(title: number)
            stack.addArrangedSubview(button)
        }
        
        return stack
    }
    
    private func createNumberButton(title: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 24)
        button.setTitleColor(.label, for: .normal)
        button.backgroundColor = .systemBackground
        button.heightAnchor.constraint(equalToConstant: 70).isActive = true
        
        if title == "⌫" {
            button.addTarget(self, action: #selector(deleteNumber), for: .touchUpInside)
        } else {
            button.addTarget(self, action: #selector(numberTapped(_:)), for: .touchUpInside)
        }
        
        return button
    }
    
    // MARK: - Public Methods
    func configure(
        initialValue: Double = 0,
        mode: NumberPickerMode = .normal,
        title: String? = nil
    ) {
        self.currentValue = initialValue
        self.mode = mode
        
        switch mode {
        case .normal:
            titleLabel.text = title ?? "Input price or quantity".localized()
            discountTypeStack.isHidden = true
            self.result = initialValue.inString()
            
        case .discount(let type):
            titleLabel.text = "Input discount".localized()
            discountTypeStack.isHidden = false
            discountType = type
            updateDiscountTypeButtons()
            // Format initial value based on type
            if type == .percentage {
                self.result = min(initialValue, 100).inString()
            } else {
                self.result = initialValue.inString()
            }
        }
    }
    
    // MARK: - Actions
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
    
    @objc private func cancelTapped() {
        dismiss(animated: true)
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
        // Convert current value to percentage if needed
        let currentValue = result.inDouble()
        result = min(currentValue, 100).inString()
        updateDiscountTypeButtons()
    }
    
    @objc private func amountTapped() {
        mode = .discount(type: .amount)
        discountType = .amount
        // Keep current value but remove % symbol
        let currentValue = result.inDouble()
        result = currentValue.inString()
        updateDiscountTypeButtons()
    }
    
    private func updateDiscountTypeButtons() {
        switch discountType {
        case .percentage:
            percentButton.backgroundColor = APP_BUTTON_BG_COLOR
            percentButton.setTitleColor(.white, for: .normal)
            amountButton.backgroundColor = .white
            amountButton.setTitleColor(APP_BUTTON_BG_COLOR, for: .normal)
        case .amount:
            amountButton.backgroundColor = APP_BUTTON_BG_COLOR
            amountButton.setTitleColor(.white, for: .normal)
            percentButton.backgroundColor = .white
            percentButton.setTitleColor(APP_BUTTON_BG_COLOR, for: .normal)
        }
    }
}

// MARK: - Instance Creation
extension NumberPickerViewController {
    static func instance() -> NumberPickerViewController {
        let controller = NumberPickerViewController()
        controller.modalPresentationStyle = .pageSheet
        
        if let sheet = controller.sheetPresentationController {
            // Calculate heights
            let normalHeight: CGFloat = {
                let titleHeight: CGFloat = 24 + 16 // Title + top spacing
                let valueHeight: CGFloat = 65 + 8  // Value display + spacing
                let numberPadHeight: CGFloat = 280 + 16 // Number pad + spacing
                let buttonHeight: CGFloat = 44 + 16 // Bottom buttons + spacing
                let safeAreaInset: CGFloat = 20 // Safe area padding
                
                return titleHeight + valueHeight + numberPadHeight + buttonHeight + safeAreaInset
            }()
            
            let discountHeight: CGFloat = {
                let normalComponentsHeight = normalHeight
                let discountTypeHeight: CGFloat = 44 + 16 // Discount type buttons + spacing
                
                return normalComponentsHeight + discountTypeHeight
            }()
            
            if #available(iOS 16.0, *) {
                sheet.detents = [
                    .custom { context in
                        if case .discount = controller.mode {
                            return discountHeight
                        } else {
                            return normalHeight
                        }
                    }
                ]
            } else {
                sheet.detents = [.large()]
                let height: CGFloat = {
                    if case .discount = controller.mode {
                        return discountHeight
                    } else {
                        return normalHeight
                    }
                }()
                controller.preferredContentSize = CGSize(
                    width: UIScreen.main.bounds.width,
                    height: height
                )
            }
            
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 12
            sheet.prefersEdgeAttachedInCompactHeight = true
        }
        
        return controller
    }
} 
