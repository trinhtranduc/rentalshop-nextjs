import UIKit
import SnapKit

protocol PaymentCollectionViewControllerDelegate: AnyObject {
    func didConfirmPayment(sender: PaymentCollectionViewController)
    func didCancelPayment(sender: PaymentCollectionViewController)
}

enum PaymentType {
    case deposit(amount: Double, collateralDetails: String?) // Thu tiền cọc khi tạo đơn
    case pickup(amount: Double, collateralDetails: String?) // Thu tiền còn lại khi pickup
    case returnRefund(amount: Double, collateralDetails: String?) // Trả lại tiền khi return
    case sale(amount: Double) // Thu tiền đầy đủ khi tạo đơn sale
}

class PaymentCollectionViewController: UIViewController {
    // MARK: - Properties
    weak var delegate: PaymentCollectionViewControllerDelegate?
    private var orderViewModel: OrderViewModel?
    private var paymentType: PaymentType?
    private var amount: Double = 0
    private var collateralDetails: String?
    
    // MARK: - UI Components
    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 18)
        label.textColor = .secondaryLabel
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    // Amount section container
    private lazy var amountContainerView: UIView = {
        let view = UIView()
        view.backgroundColor = APP_BUTTON_BG_COLOR.withAlphaComponent(0.1)
        view.layer.cornerRadius = 12
        view.layer.borderWidth = 2
        view.layer.borderColor = APP_BUTTON_BG_COLOR.withAlphaComponent(0.3).cgColor
        return view
    }()
    
    private lazy var amountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 48)
        label.textColor = APP_BUTTON_BG_COLOR
        label.textAlignment = .center
        return label
    }()
    
    private lazy var amountDescriptionLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textColor = .secondaryLabel
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    // Collateral section container
    private lazy var collateralContainerView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.systemOrange.withAlphaComponent(0.1)
        view.layer.cornerRadius = 12
        view.layer.borderWidth = 2
        view.layer.borderColor = UIColor.systemOrange.withAlphaComponent(0.3).cgColor
        return view
    }()
    
    private lazy var collateralTitleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .label
        label.textAlignment = .center
        return label
    }()
    
    private lazy var collateralDetailsLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 15)
        label.textColor = .label
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    private lazy var buttonStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [cancelButton, confirmButton])
        stack.axis = .horizontal
        stack.spacing = 16
        stack.distribution = .fillEqually
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
        return button
    }()
    
    // MARK: - Initialization
    init(orderViewModel: OrderViewModel) {
        self.orderViewModel = orderViewModel
        super.init(nibName: nil, bundle: nil)
        setupPaymentType()
    }
    
    // Convenience initializer for direct payment type (used for new orders from Cart)
    init(paymentType: PaymentType) {
        self.orderViewModel = nil
        self.paymentType = paymentType
        super.init(nibName: nil, bundle: nil)
        setupPaymentTypeFromDirect()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    // Note: Payment amounts are calculated using OrderViewModel's shared calculation methods
    // This ensures consistency across the app. Uses toCollectAmount and getPaymentType() from OrderViewModel
    private func setupPaymentType() {
        guard let viewModel = orderViewModel else {
            return
        }
        
        // Get payment type from OrderViewModel (uses shared calculation methods)
        guard let paymentType = viewModel.getPaymentType() else {
            return
        }
        
        self.paymentType = paymentType
        
        switch paymentType {
        case .deposit(let amount, let collateralDetails):
            // Amount is already calculated in PreviewViewController: depositAmount
            self.amount = amount
            self.collateralDetails = collateralDetails
            titleLabel.text = "Collect Deposit".localized()
            amountDescriptionLabel.text = "Please collect the deposit amount from the customer.".localized()
            
            if let collateral = collateralDetails, !collateral.isEmpty {
                collateralTitleLabel.text = "Collect Collateral Documents".localized()
                collateralDetailsLabel.text = collateral
                collateralContainerView.isHidden = false
            } else {
                collateralContainerView.isHidden = true
            }
            
        case .pickup(let amount, let collateralDetails):
            // Amount is already calculated in PreviewViewController:
            // - With collateral: totalAmount - depositAmount
            // - Without collateral: totalAmount + bailAmount - depositAmount
            self.amount = amount
            self.collateralDetails = collateralDetails
            titleLabel.text = "Collect Remaining Payment".localized()
            amountDescriptionLabel.text = "Please collect the remaining payment from the customer.".localized()
            
            if let collateral = collateralDetails, !collateral.isEmpty {
                collateralTitleLabel.text = "Collect Collateral Documents".localized()
                collateralDetailsLabel.text = collateral
                collateralContainerView.isHidden = false
            } else {
                collateralContainerView.isHidden = true
            }
            
        case .returnRefund(let amount, let collateralDetails):
            // Amount calculation: damageFee - securityDeposit
            // If negative: refund to customer (trả lại tiền)
            // If positive: collect from customer (thu tiền)
            // Always display as positive value, but show appropriate title based on sign
            self.amount = abs(amount)
            self.collateralDetails = collateralDetails
            titleLabel.text = amount < 0 ? "Refund Payment".localized() : "Collect Payment".localized()
            if amount < 0 {
                amountDescriptionLabel.text = "Please refund the amount to the customer.".localized()
            } else {
                amountDescriptionLabel.text = "Please collect the amount from the customer.".localized()
            }
            
            if let collateral = collateralDetails, !collateral.isEmpty {
                collateralTitleLabel.text = "Return Collateral Documents".localized()
                collateralDetailsLabel.text = collateral
                collateralContainerView.isHidden = false
            } else {
                collateralContainerView.isHidden = true
            }
            
        case .sale(let amount):
            self.amount = amount
            self.collateralDetails = nil
            titleLabel.text = "Collect Payment".localized()
            amountDescriptionLabel.text = "Please collect the full payment amount from the customer.".localized()
            collateralContainerView.isHidden = true
        }
        
        amountLabel.text = self.amount.formatStringInCommon()
    }
    
    // Setup payment type from direct PaymentType (for new orders from Cart)
    private func setupPaymentTypeFromDirect() {
        guard let paymentType = self.paymentType else {
            return
        }
        
        switch paymentType {
        case .deposit(let amount, let collateralDetails):
            self.amount = amount
            self.collateralDetails = collateralDetails
            titleLabel.text = "Collect Deposit".localized()
            amountDescriptionLabel.text = "Please collect the deposit amount from the customer.".localized()
            
            if let collateral = collateralDetails, !collateral.isEmpty {
                collateralTitleLabel.text = "Collect Collateral Documents".localized()
                collateralDetailsLabel.text = collateral
                collateralContainerView.isHidden = false
            } else {
                collateralContainerView.isHidden = true
            }
            
        case .pickup(let amount, let collateralDetails):
            self.amount = amount
            self.collateralDetails = collateralDetails
            titleLabel.text = "Collect Remaining Payment".localized()
            amountDescriptionLabel.text = "Please collect the remaining payment from the customer.".localized()
            
            if let collateral = collateralDetails, !collateral.isEmpty {
                collateralTitleLabel.text = "Collect Collateral Documents".localized()
                collateralDetailsLabel.text = collateral
                collateralContainerView.isHidden = false
            } else {
                collateralContainerView.isHidden = true
            }
            
        case .returnRefund(let amount, let collateralDetails):
            // Amount calculation: damageFee - securityDeposit
            // If negative: refund to customer (trả lại tiền)
            // If positive: collect from customer (thu tiền)
            // Always display as positive value, but show appropriate title based on sign
            self.amount = abs(amount)
            self.collateralDetails = collateralDetails
            titleLabel.text = amount < 0 ? "Refund Payment".localized() : "Collect Payment".localized()
            if amount < 0 {
                amountDescriptionLabel.text = "Please refund the amount to the customer.".localized()
            } else {
                amountDescriptionLabel.text = "Please collect the amount from the customer.".localized()
            }
            
            if let collateral = collateralDetails, !collateral.isEmpty {
                collateralTitleLabel.text = "Return Collateral Documents".localized()
                collateralDetailsLabel.text = collateral
                collateralContainerView.isHidden = false
            } else {
                collateralContainerView.isHidden = true
            }
            
        case .sale(let amount):
            self.amount = amount
            self.collateralDetails = nil
            titleLabel.text = "Collect Payment".localized()
            amountDescriptionLabel.text = "Please collect the full payment amount from the customer.".localized()
            collateralContainerView.isHidden = true
        }
        
        amountLabel.text = self.amount.formatStringInCommon()
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }
    
    private func setupUI() {
        view.backgroundColor = .systemBackground
        
        // Add main content to view (not containerView)
        view.addSubview(titleLabel)
        view.addSubview(amountContainerView)
        view.addSubview(collateralContainerView)
        view.addSubview(buttonStackView)
        
        // Add subviews to amount container
        amountContainerView.addSubview(amountLabel)
        amountContainerView.addSubview(amountDescriptionLabel)
        
        // Add subviews to collateral container
        collateralContainerView.addSubview(collateralTitleLabel)
        collateralContainerView.addSubview(collateralDetailsLabel)
        
        // Title label
        titleLabel.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(24)
            make.leading.trailing.equalToSuperview().inset(24)
        }
        
        // Amount container - highlighted section
        amountContainerView.snp.makeConstraints { make in
            make.top.equalTo(titleLabel.snp.bottom).offset(24)
            make.leading.trailing.equalToSuperview().inset(24)
        }
        
        // Amount label inside container
        amountLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(20)
            make.leading.trailing.equalToSuperview().inset(16)
        }
        
        // Amount description inside container
        amountDescriptionLabel.snp.makeConstraints { make in
            make.top.equalTo(amountLabel.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalToSuperview().offset(-20)
        }
        
        // Collateral container - highlighted section
        collateralContainerView.snp.makeConstraints { make in
            make.top.equalTo(amountContainerView.snp.bottom).offset(20)
            make.leading.trailing.equalToSuperview().inset(24)
        }
        
        // Collateral title inside container
        collateralTitleLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.trailing.equalToSuperview().inset(16)
        }
        
        // Collateral details label inside container
        collateralDetailsLabel.snp.makeConstraints { make in
            make.top.equalTo(collateralTitleLabel.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalToSuperview().offset(-16)
        }
        
        // Button stack view at bottom (like DatePickerViewController)
        buttonStackView.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-16)
            make.height.equalTo(44)
        }
        
        // Add background tap gesture
        let backgroundTap = UITapGestureRecognizer(target: self, action: #selector(backgroundTapped))
        view.addGestureRecognizer(backgroundTap)
        
        // Add pan gesture for slide to dismiss
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePanGesture(_:)))
        view.addGestureRecognizer(panGesture)
    }
    
    // MARK: - Actions
    @objc private func cancelTapped() {
        dismiss(animated: true) {
            self.delegate?.didCancelPayment(sender: self)
        }
    }
    
    @objc private func confirmTapped() {
        dismiss(animated: true) {
            self.delegate?.didConfirmPayment(sender: self)
        }
    }
    
    @objc private func backgroundTapped() {
        dismiss(animated: true)
    }
    
    // Add slide to dismiss functionality
    @objc private func handlePanGesture(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: view)
        let isDraggingDown = translation.y > 0
        
        switch gesture.state {
        case .changed:
            if isDraggingDown {
                view.transform = CGAffineTransform(translationX: 0, y: translation.y)
            }
        case .ended:
            let velocity = gesture.velocity(in: view)
            if velocity.y >= 1500 || translation.y >= 200 {
                dismiss(animated: true)
            } else {
                UIView.animate(withDuration: 0.3) {
                    self.view.transform = .identity
                }
            }
        default:
            break
        }
    }
    
    // MARK: - Public Methods
    func getAmount() -> Double {
        return amount
    }
    
    func getCollateralDetails() -> String? {
        return collateralDetails
    }
    
    // MARK: - Static Instance Methods
    static func instance(orderViewModel: OrderViewModel) -> PaymentCollectionViewController {
        let controller = PaymentCollectionViewController(orderViewModel: orderViewModel)
        
        // Use sheet presentation like DatePickerViewController
        if #available(iOS 15.0, *) {
            if let sheet = controller.sheetPresentationController {
                sheet.detents = [.medium()]
                sheet.preferredCornerRadius = 16
                sheet.prefersGrabberVisible = true
            }
        } else {
            controller.modalPresentationStyle = .pageSheet
        }
        
        return controller
    }
    
    static func instance(paymentType: PaymentType) -> PaymentCollectionViewController {
        let controller = PaymentCollectionViewController(paymentType: paymentType)
        
        // Use sheet presentation like DatePickerViewController
        if #available(iOS 15.0, *) {
            if let sheet = controller.sheetPresentationController {
                sheet.detents = [.medium()]
                sheet.preferredCornerRadius = 16
                sheet.prefersGrabberVisible = true
            }
        } else {
            controller.modalPresentationStyle = .pageSheet
        }
        
        return controller
    }
}

