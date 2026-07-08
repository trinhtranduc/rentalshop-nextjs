import UIKit
import PDFKit
import SnapKit

// MARK: - Receipt Style (full style for entire receipt)
/// Full typography and layout for the whole receipt. Use one style for consistency.
/// - original: classic centered header (store, title, order #).
/// - unified: same layout, order # smaller than title.
/// - alternate: document-style with accent bar, left-aligned header (order # + date, store, receipt type).
enum ReceiptStyle {
    /// Original layout: order # same size as title (20pt), centered header.
    case original
    /// Unified style: clear hierarchy (title 18pt, order # 14pt), same centered layout.
    case unified
    /// Alternate layout: full-width accent bar, left-aligned header (order # + date on one line, store, small receipt type), document-style.
    case alternate

    var largeTitleSize: CGFloat {
        switch self {
        case .original: return 24
        case .unified:  return 22
        case .alternate: return 16
        }
    }
    var receiptTitleSize: CGFloat {
        switch self {
        case .original: return 18
        case .unified:  return 18
        case .alternate: return 10
        }
    }
    var orderNumberSize: CGFloat {
        switch self {
        case .original: return 20
        case .unified:  return 14
        case .alternate: return 14
        }
    }
    var sectionTitleSize: CGFloat {
        switch self {
        case .original: return 14
        case .unified:  return 14
        case .alternate: return 14
        }
    }
    var bodySize: CGFloat {
        switch self {
        case .original: return 12
        case .unified:  return 12
        case .alternate: return 12
        }
    }
    var bodyBoldSize: CGFloat {
        switch self {
        case .original: return 12
        case .unified:  return 12
        case .alternate: return 12
        }
    }
    var smallSize: CGFloat {
        switch self {
        case .original: return 10
        case .unified:  return 10
        case .alternate: return 10
        }
    }
    var tinySize: CGFloat {
        switch self {
        case .original: return 8
        case .unified:  return 8
        case .alternate: return 8
        }
    }
    var rowSpacing: CGFloat {
        switch self {
        case .original: return 6
        case .unified:  return 6
        case .alternate: return 6
        }
    }
    var sectionSpacing: CGFloat {
        switch self {
        case .original: return 24
        case .unified:  return 20
        case .alternate: return 18
        }
    }
    var spacingAfterReceiptTitle: CGFloat {
        switch self {
        case .original: return 15
        case .unified:  return 10
        case .alternate: return 8
        }
    }
    var spacingAfterOrderNumber: CGFloat {
        switch self {
        case .original: return 24
        case .unified:  return 16
        case .alternate: return 14
        }
    }
}

// Add delegate protocol for PreviewViewController
protocol PreviewViewControllerDelegate: AnyObject {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?)
}

class PreviewViewController: BaseViewControler {
    // MARK: - Properties
    private var viewModel: PreviewViewModelProtocol
    private var noteImages: [UIImage] = []
    
    // Add delegate property
    weak var delegate: PreviewViewControllerDelegate?
    
    // MARK: - Helper Methods for Notifying Updates
    /// Notify both delegate and OrderListViewModel about order updates
    private func notifyOrderUpdate(_ order: Order?) {
        // Notify delegate (existing pattern)
        self.delegate?.didCompleteOrder(sender: self, updatedOrder: order)
        
        // Notify OrderListViewModel for cross-screen updates
        if let order = order {
            OrderListViewModel.shared.updateOrder(order)
        } else {
            // Set flag for refresh when no order object provided
            OrderListViewModel.shared.setNeedsRefresh()
        }
    }
    
    // MARK: - UI Components
    private lazy var rightBarView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()
    
    private lazy var customerNameLabel: UILabel = {
        let label = UILabel()
        label.font = .titleSmall()
        label.textColor = .navTint
        label.textAlignment = .right
        label.minimumScaleFactor = 0.5
        label.allowsDefaultTighteningForTruncation = true
        return label
    }()
    
    private lazy var phoneLabel: UILabel = {
        let label = UILabel()
        label.font = .bodySmall()
        label.textColor = .navTint
        label.textAlignment = .right
        // Add tap gesture for phone call
        label.isUserInteractionEnabled = true
        label.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(phonePress)))
        return label
    }()
    
    private lazy var qrCodeButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "qrcode"), for: .normal)
        button.tintColor = APP_TONE_COLOR
        button.addTarget(self, action: #selector(showQRCode), for: .touchUpInside)
        return button
    }()
    
    private lazy var shareButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "square.and.arrow.up"), for: .normal)
        button.tintColor = .black
        button.addTarget(self, action: #selector(shareReceiptTapped), for: .touchUpInside)
        return button
    }()
    
    lazy var previewTableView: UITableView = {
        // Use insetGrouped style like AccountViewController
        let table = UITableView(frame: .zero, style: .insetGrouped)
        table.delegate = self
        table.dataSource = self
        // Register cells
        table.register(ProductPreviewCell.self, forCellReuseIdentifier: "ProductPreviewCell")
        table.register(PreviewNotesCell.self, forCellReuseIdentifier: PreviewNotesCell.reuseId)
        table.backgroundColor = .backgroundPrimary
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 44
        return table
    }()
    
    private lazy var headerView: UIView = {
        let view = UIView(frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 150))
        view.backgroundColor = .backgroundCard
        return view
    }()
    
    private lazy var dateStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.spacing = 8
        stack.alignment = .fill
        return stack
    }()
    
    // Date components
    private lazy var createDateLabel = createDateLabel(title: "Create date".localized())
    private lazy var pickupDateLabel = createDateLabel(title: "Pickup date".localized())
    private lazy var returnDateLabel = createDateLabel(title: "Return date".localized())
    
    // Store reference to checkbox for state updates
    private var readyDeliverCheckbox: UIButton?
    
    private lazy var readyDeliverView: UIView = {
        let view = UIView()
        
        let titleLabel = UILabel()
        titleLabel.text = "Ready deliver".localized()
        titleLabel.font = .captionMedium()
        titleLabel.textColor = .textTertiary
        titleLabel.textAlignment = .center
        
        let checkbox = UIButton(type: .custom)
        // Use SF Symbols for checkbox - make it larger and more visible
        let uncheckedImage = UIImage(systemName: "square")
        let checkedImage = UIImage(systemName: "checkmark.square.fill")
        checkbox.setImage(uncheckedImage, for: .normal)
        checkbox.setImage(checkedImage, for: .selected)
        checkbox.tintColor = APP_TONE_COLOR // Use tone color (blue) for checkbox
        
        // Make checkbox larger and easier to tap
        checkbox.contentMode = .scaleAspectFit
        checkbox.imageView?.contentMode = .scaleAspectFit
        checkbox.addTarget(self, action: #selector(readyDeliverTapped), for: .touchUpInside)
        
        // Store reference for state updates
        self.readyDeliverCheckbox = checkbox
        
        view.addSubview(titleLabel)
        view.addSubview(checkbox)
        
        titleLabel.snp.makeConstraints { make in
            make.top.equalToSuperview()
            make.centerX.equalToSuperview()
            make.height.equalTo(20)
        }
        
        checkbox.snp.makeConstraints { make in
            make.top.equalTo(titleLabel.snp.bottom).offset(4)
            make.centerX.equalToSuperview()
            make.width.height.equalTo(28) // Larger size for easier tapping
        }
        
        return view
    }()
    
    // Add new UI components
    private lazy var depositInfoView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        return view
    }()
    
    private lazy var materialTextField: UITextField = {
        let textField = UITextField()
        textField.font = .bodyMedium()
        textField.placeholder = "Enter ID card, driver's license...".localized()
        textField.borderStyle = .roundedRect
        textField.returnKeyType = .done
        textField.clearButtonMode = .whileEditing
        textField.delegate = self
        return textField
    }()
    
    private lazy var bailButton: UIButton = {
        let button = UIButton(type: .system)
        button.titleLabel?.font = .bodyMedium()
        button.setTitle("0", for: .normal)
        button.setTitleColor(.actionPrimary, for: .normal)
        button.contentHorizontalAlignment = .center
        button.layer.borderWidth = 1
        button.layer.borderColor = UIColor.borderColor.cgColor
        button.layer.cornerRadius = 4
        button.addTarget(self, action: #selector(bailButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var extraChargeButton: UIButton = {
        let button = UIButton(type: .system)
        button.titleLabel?.font = .bodyMedium()
        button.setTitle("0", for: .normal)
        button.setTitleColor(.actionPrimary, for: .normal)
        button.contentHorizontalAlignment = .center
        button.layer.borderWidth = 1
        button.layer.borderColor = UIColor.borderColor.cgColor
        button.layer.cornerRadius = 4
        button.addTarget(self, action: #selector(extraChargeButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // Labels for descriptions
    private lazy var materialDescriptionLabel: UILabel = {
        let label = UILabel()
        label.text = "Document".localized()
        label.font = .captionMedium()
        label.textColor = .textTertiary
        return label
    }()
    
    private lazy var bailDescriptionLabel: UILabel = {
        let label = UILabel()
        label.text = "Security Deposit".localized()
        label.font = .captionMedium()
        label.textColor = .textTertiary
        return label
    }()
    
    private lazy var extraChargeDescriptionLabel: UILabel = {
        let label = UILabel()
        label.text = "Damage Fee".localized()
        label.font = .captionMedium()
        label.textColor = .textTertiary
        return label
    }()
    
    // Add separator view property
    private lazy var headerSeparatorView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundTertiary // Light gray color for separator
        return view
    }()
    
    // Add footer components
    private lazy var footerView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        // Add shadow
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOffset = CGSize(width: 0, height: -2)
        view.layer.shadowOpacity = 0.05
        view.layer.shadowRadius = 2
        return view
    }()
    
    // Add scroll view for note text view
    private lazy var noteScrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.showsVerticalScrollIndicator = true
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.alwaysBounceVertical = true
        scrollView.backgroundColor = .backgroundSecondary
        scrollView.layer.borderWidth = 0.5
        scrollView.layer.borderColor = UIColor.borderColor.cgColor
        scrollView.layer.cornerRadius = 8
        
        // Add shadow for depth
        scrollView.layer.shadowColor = UIColor.black.cgColor
        scrollView.layer.shadowOffset = CGSize(width: 0, height: 1)
        scrollView.layer.shadowOpacity = 0.05
        scrollView.layer.shadowRadius = 2
        return scrollView
    }()
    
    private lazy var noteTextView: PlaceholderTextView = {
        let textView = PlaceholderTextView()
        textView.font = .bodySmall()
        textView.textColor = .textPrimary
        textView.backgroundColor = .clear
        textView.isScrollEnabled = false // Disable text view's own scrolling
        textView.isEditable = false
        textView.isUserInteractionEnabled = true
        textView.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        textView.placeholder = "Add notes here...".localized()
        let tap = UITapGestureRecognizer(target: self, action: #selector(showNoteView))
        textView.addGestureRecognizer(tap)
        return textView
    }()
    
    private lazy var noteTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Notes".localized()
        label.font = .titleSmall()
        label.textColor = .textSecondary
        return label
    }()
    
    private lazy var summaryStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 12 // Increased spacing
        stack.layoutMargins = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
        stack.isLayoutMarginsRelativeArrangement = true
        return stack
    }()
    
    // Footer action buttons. Visual hierarchy (all share the same frame in the
    // fillEqually stack, so weight is conveyed by fill vs outline vs tint):
    //   - Primary state action (save/pickup/return/update) -> solid brand fill
    //   - Print -> secondary, outline (was a competing solid green)
    //   - Cancel/Delete -> destructive, soft red tint (was heavy solid red next to primary)
    private lazy var saveButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle(viewModel.saveButtonTitle.uppercased(), for: .normal)
        button.titleLabel?.font = .titleSmall()
        button.backgroundColor = .brandPrimary
        button.setTitleColor(.textInverted, for: .normal)
        button.layer.cornerRadius = 8
        button.addTarget(self, action: #selector(saveOrder), for: .touchUpInside)
        return button
    }()

    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel".localized().uppercased(), for: .normal)
        button.titleLabel?.font = .titleSmall()
        button.backgroundColor = .statusCancelledFill
        button.setTitleColor(.statusCancelledText, for: .normal)
        button.layer.cornerRadius = 8
        button.addTarget(self, action: #selector(cancelOrder), for: .touchUpInside)
        return button
    }()

    // Add more buttons to footer
    private lazy var printButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Print".localized().uppercased(), for: .normal)
        button.titleLabel?.font = .titleSmall()
        button.backgroundColor = .clear
        button.setTitleColor(.brandPrimary, for: .normal)
        button.layer.cornerRadius = 8
        button.layer.borderWidth = 1
        button.layer.borderColor = UIColor.brandPrimary.cgColor
        button.addTarget(self, action: #selector(printOrder), for: .touchUpInside)
        return button
    }()

    private lazy var updateButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Update".localized().uppercased(), for: .normal)
        button.titleLabel?.font = .titleSmall()
        button.backgroundColor = .brandPrimary
        button.setTitleColor(.textInverted, for: .normal)
        button.layer.cornerRadius = 8
        button.addTarget(self, action: #selector(updateOrder), for: .touchUpInside)
        return button
    }()

    private lazy var deleteButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Delete".localized().uppercased(), for: .normal)
        button.titleLabel?.font = .titleSmall()
        button.backgroundColor = .statusCancelledFill
        button.setTitleColor(.statusCancelledText, for: .normal)
        button.layer.cornerRadius = 8
        button.addTarget(self, action: #selector(deleteOrder), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Initialization
    init(viewModel: PreviewViewModelProtocol) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }
    
    // Convenience initializers
    convenience init(cart: Cart) {
        let viewModel = CartViewModel(cart: cart)
        self.init(viewModel: viewModel)
    }
    
    convenience init(order: Order) {
        let viewModel = OrderViewModel(order: order)
        self.init(viewModel: viewModel)
    }
    
    convenience init(editOrder: Order) {
        let viewModel = OrderViewModel(order: editOrder)
        self.init(viewModel: viewModel)
    }
    
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        self.view.backgroundColor = .backgroundPrimary  // Match AccountViewController
        
        // Ensure tabbar is hidden
        self.hidesBottomBarWhenPushed = true
        
        // Add views to the main view first
        view.addSubview(previewTableView)
        view.addSubview(footerView)
        
        // Setup tap gesture to dismiss keyboard
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false
        view.addGestureRecognizer(tapGesture)
        
        // Setup components
        setupNavigationBar()
        // setupHeaderView() - Disabled: Using table view sections instead
        // setupDepositInfoView() - Disabled: Using table view sections instead
        setupFooterView()
        setupUI()
        
        // Update UI based on current mode
        updateUI()
    }
    
    /// Full URL list for order note images (cell loads via UIImageView + Kingfisher).
    private var noteImageURLs: [String]? {
        guard let orderViewModel = viewModel as? OrderViewModel,
              let paths = orderViewModel.currentOrder.notesImages, !paths.isEmpty else { return nil }
        let base = APIEndpoint.currentBaseURL
        return paths.map { path in
            path.hasPrefix("http") ? path : (base.hasSuffix("/") ? base + path : base + "/" + path)
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Update summary with calculations
        updateSummaryValues()
        
        // Ensure tabbar is hidden
        self.tabBarController?.tabBar.isHidden = true
    }
    
    // MARK: - Pull to Refresh
    override func startRefresh(_ sender: Any) {
        reloadOrderDetail()
    }
    
    // MARK: - Reload Order Detail
    private func reloadOrderDetail() {
        // Only reload if this is an OrderViewModel (not CartViewModel)
        guard let orderViewModel = viewModel as? OrderViewModel else {
            endRefresh()
            return
        }
        
        orderViewModel.reloadOrderDetail { [weak self] result in
            DispatchQueue.main.async {
                self?.endRefresh()
                
                switch result {
                case .success:
                    // Reload UI with updated order data
                    self?.updateUI()
                case .failure(let error):
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Show tabbar when leaving
        self.tabBarController?.tabBar.isHidden = false
    }
    
    // MARK: - Helper Methods
    private func updateUI() {
        updateTitle()
        updateActions()
        // updateCustomerInfo() - Disabled: Using table view sections instead
        // updateDates() - Disabled: Using table view sections instead
        updateSummaryValues()
        updateInputFields()
        updateReadyDeliverCheckbox()
        previewTableView.reloadData()
    }
    
    private func updateReadyDeliverCheckbox() {
        // Update checkbox state from viewModel
        if viewModel.orderType == .rent {
            readyDeliverCheckbox?.isSelected = viewModel.isReadyToDeliver
        }
    }
    
    
    // MARK: - Setup
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: viewModel.title,
                statusBarBackgroundColor: .white,
                titleCentered: true,
                hideBackButton: false,
                backAction: .pop
            )
            // QR code button removed - hidden as per requirement
        // navBar.addRightButton(qrCodeButton)
            
            // Add share button to right side
        navBar.addRightButton(shareButton)
        
        // Update title when viewModel is available
        updateTitle()
    }
    
    private func setupHeaderView() {
        headerView.addSubview(dateStackView)
        headerView.addSubview(headerSeparatorView) // Add separator to header
        
        // Always add the basic date labels
        dateStackView.addArrangedSubview(createDateLabel)
        dateStackView.addArrangedSubview(pickupDateLabel)
        dateStackView.addArrangedSubview(returnDateLabel)
        
        // Only add readyDeliverView for rent orders
        let isRentOrder = viewModel.orderType == .rent
        
        if isRentOrder {
            dateStackView.addArrangedSubview(readyDeliverView)
        }
        
        dateStackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(16)
            make.leading.trailing.equalToSuperview().inset(16)
            make.height.equalTo(44)
        }
        
        // Add separator constraints
        headerSeparatorView.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(1)
        }
        
        // Adjust header height based on order type
        if isRentOrder {
            // For rent orders, keep original height and show deposit info
            headerView.frame.size.height = 150
            setupDepositInfoView()
        } else {
            // For sale orders, set header height to just fit the date stack
            headerView.frame.size.height = 80 // Reduced height for sale orders
            depositInfoView.isHidden = true
        }
    }
    
    private func setupDepositInfoView() {
        headerView.addSubview(depositInfoView)
        
        // Add subviews
        [materialDescriptionLabel, materialTextField,
         bailDescriptionLabel, bailButton,
         extraChargeDescriptionLabel, extraChargeButton].forEach { depositInfoView.addSubview($0) }
        
        // Setup constraints
        depositInfoView.snp.makeConstraints { make in
            make.top.equalTo(dateStackView.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(headerSeparatorView.snp.top).offset(-16)
        }

        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        if isIPad {
            // iPad Layout - Centered distribution with equal widths
            
            // Create container stacks for each section
            let materialStack = UIStackView()
            materialStack.axis = .vertical
            materialStack.alignment = .center
            materialStack.spacing = 8
            
            let bailStack = UIStackView()
            bailStack.axis = .vertical
            bailStack.alignment = .center
            bailStack.spacing = 8
            
            let extraChargeStack = UIStackView()
            extraChargeStack.axis = .vertical
            extraChargeStack.alignment = .center
            extraChargeStack.spacing = 8
            
            // Add views to their respective stacks
            materialStack.addArrangedSubview(materialDescriptionLabel)
            materialStack.addArrangedSubview(materialTextField)
            
            bailStack.addArrangedSubview(bailDescriptionLabel)
            bailStack.addArrangedSubview(bailButton)
            
            extraChargeStack.addArrangedSubview(extraChargeDescriptionLabel)
            extraChargeStack.addArrangedSubview(extraChargeButton)
            
            // Add stacks to deposit info view
            [materialStack, bailStack, extraChargeStack].forEach { depositInfoView.addSubview($0) }
            
            // Position stacks with equal widths and spacing
            materialStack.snp.makeConstraints { make in
                make.leading.equalToSuperview().offset(16)
                make.top.equalToSuperview().offset(8)
                make.width.equalTo(bailStack)
            }
            
            bailStack.snp.makeConstraints { make in
                make.centerX.equalToSuperview()
                make.top.equalToSuperview().offset(8)
                make.width.equalTo(materialStack)
            }
            
            extraChargeStack.snp.makeConstraints { make in
                make.trailing.equalToSuperview().offset(-16)
                make.top.equalToSuperview().offset(8)
                make.width.equalTo(bailStack)
            }
            
            // Configure input fields with equal widths
            [materialTextField, bailButton, extraChargeButton].forEach { view in
                view.snp.makeConstraints { make in
                    make.width.equalTo(120)
                    make.height.equalTo(36)
                }
            }
            
            // Set larger font sizes for iPad
            [materialDescriptionLabel, bailDescriptionLabel, extraChargeDescriptionLabel].forEach {
                $0.font = .bodyMedium(size: 15)
            }
            
            [materialTextField, bailButton, extraChargeButton].forEach {
                if let button = $0 as? UIButton {
                    button.titleLabel?.font = .bodyMedium(size: 15)
                } else if let textField = $0 as? UITextField {
                    textField.font = .bodyMedium(size: 15)
                }
            }
            
        } else {
            // iPhone Layout - Original layout
            materialDescriptionLabel.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(8)
                make.leading.equalToSuperview().offset(16)
            }
            
            materialTextField.snp.makeConstraints { make in
                make.top.equalTo(materialDescriptionLabel.snp.bottom).offset(8)
                make.leading.equalToSuperview().offset(16)
                make.width.equalTo(120)
                make.height.equalTo(36)
            }
            
            bailDescriptionLabel.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(8)
                make.centerX.equalToSuperview()
            }
            
            bailButton.snp.makeConstraints { make in
                make.top.equalTo(bailDescriptionLabel.snp.bottom).offset(8)
                make.centerX.equalTo(bailDescriptionLabel)
                make.width.equalTo(80)
                make.height.equalTo(36)
            }
            
            extraChargeDescriptionLabel.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(8)
                make.trailing.equalToSuperview().offset(-16)
            }
            
            extraChargeButton.snp.makeConstraints { make in
                make.top.equalTo(extraChargeDescriptionLabel.snp.bottom).offset(8)
                make.centerX.equalTo(extraChargeDescriptionLabel)
                make.width.equalTo(80)
                make.height.equalTo(36)
            }
        }
    }
    
    private func createDateLabel(title: String) -> UIView {
        let container = UIView()
        container.backgroundColor = .backgroundCard
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .captionMedium()
        titleLabel.textColor = .textTertiary
        titleLabel.textAlignment = .center
        
        let dateLabel = UILabel()
        dateLabel.font = .bodyMedium()
        dateLabel.textColor = .textPrimary
        dateLabel.textAlignment = .center
        
        container.addSubview(titleLabel)
        container.addSubview(dateLabel)
        
        titleLabel.snp.makeConstraints { make in
            make.top.equalToSuperview()
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(20)
        }
        
        dateLabel.snp.makeConstraints { make in
            make.top.equalTo(titleLabel.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(20)
            make.bottom.equalToSuperview()
        }
        
        // Add iPad-specific font size adjustments
        let isIPad = traitCollection.horizontalSizeClass == .regular
        if isIPad {
            titleLabel.font = .captionMedium(size: 16)
            dateLabel.font = .captionMedium(size: 16)
            materialTextField.font = .captionMedium(size: 16)
            bailButton.titleLabel?.font = .captionMedium(size: 16)
            extraChargeButton.titleLabel?.font = .captionMedium(size: 16)
            materialDescriptionLabel.font = .captionMedium(size: 16)
            bailDescriptionLabel.font = .captionMedium(size: 16)
            extraChargeDescriptionLabel.font = .captionMedium(size: 16)
            (readyDeliverView.subviews.first as? UILabel)?.font = .captionMedium(size: 16)
        }
        
        return container
    }
    
    private func updateDates() {
        // Disabled: Dates are now in table view sections
        // (createDateLabel.subviews.last as? UILabel)?.text = viewModel.createDate?.dateInString()
        // (pickupDateLabel.subviews.last as? UILabel)?.text = viewModel.pickupDate?.dateInString()
        // (returnDateLabel.subviews.last as? UILabel)?.text = viewModel.returnDate?.dateInString()
        
        // Only update ready deliver view if it exists (for rent orders)
        // if viewModel.orderType == .rent {
        //     (readyDeliverView.subviews.last as? UIButton)?.isSelected = viewModel.isReadyToDeliver
        // }
    }
    
    // MARK: - Helper Methods
    
    // MARK: - Public Methods
    
    private func updateCustomerInfo() {
        // Disabled: Customer info is now in table view sections
        // customerNameLabel.text = viewModel.customerName
        // phoneLabel.text = viewModel.customerPhone
    }
    
    // Update title based on viewModel
    private func updateTitle() {
        customNavBar?.title = viewModel.title
    }
    
    // Update actions based on viewModel
    private func updateActions() {
        let actions = viewModel.availableActions
        
        // Reset all buttons to hidden first
        saveButton.isHidden = true
        cancelButton.isHidden = true
        printButton.isHidden = true
        updateButton.isHidden = true
        deleteButton.isHidden = true
        
        // Show buttons based on available actions
        for action in actions {
            switch action {
            case .save:
                saveButton.isHidden = false
                saveButton.setTitle(viewModel.saveButtonTitle.uppercased(), for: .normal)
            case .cancel:
                cancelButton.isHidden = false
            case .print:
                printButton.isHidden = false
            case .update:
                // Show update button when update action is available
                updateButton.isHidden = false
            case .delete:
                deleteButton.isHidden = false
            }
        }
        
        // Show deposit info based on viewModel
        // depositInfoView.isHidden = !viewModel.shouldShowDepositInfo - Disabled: Using table view sections
    }
    
    // Update input fields based on viewModel
    private func updateInputFields() {
        // For grouped style, cells are updated via table view reload
        // Reload relevant sections to update cell values
        previewTableView.reloadData()
    }
    
    // MARK: - Actions
    @objc private func phonePress() {
        let phone = viewModel.customerPhone
        if !phone.isEmpty {
            let phoneNumber = "tel://\(phone)"
            if let url = URL(string: phoneNumber), !url.absoluteString.isEmpty {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
    }
    
    @objc private func showQRCode() {
        guard let orderViewModel = viewModel as? OrderViewModel else { return }
        let order = orderViewModel.currentOrder
        
        // Only show QR code for orders that have an ID (not draft/new orders)
        guard order.id > 0 else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Please save the order first".localized()
            )
            return
        }
        
        let qrCodeVC = PaymentQRCodeViewController(orderId: order.id)
        let navController = BaseNavigationController(rootViewController: qrCodeVC)
        present(navController, animated: true)
    }
    
    @objc private func shareReceiptTapped() {
        // Show progress
        showProgressText(text: "Generating image...".localized())
        
        // Generate JPG on background queue
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            // Convert viewModel to Order structure
            let orderForPDF = self.createOrderForPDF(from: self.viewModel)
            
            if let jpgURL = self.generateJPGReceipt(for: orderForPDF, viewModel: self.viewModel) {
                DispatchQueue.main.async {
                    self.hideProgress()
                    self.shareImage(url: jpgURL) // Share JPG image (not PDF)
                }
            } else {
                DispatchQueue.main.async {
                    self.hideProgress()
                    UIAlertController.alert(
                        parent: self,
                        title: "Error".localized(),
                        message: "Failed to generate image".localized()
                    )
                }
            }
        }
    }
    
    
    // MARK: - PDF Data Structures
    private struct OrderForPDF {
        let orderNumber: String
        let orderType: OrderType
        let customerName: String
        let customerPhone: String?
        let createdAt: Date
        let pickupDate: Date?
        let returnDate: Date?
        let orderItems: [OrderItemForPDF]
        let subtotal: Double
        let discountType: String?
        let discountValue: Double
        let discountAmount: Double
        let totalAmount: Double
        let depositAmount: Double
        let securityDeposit: Double
        let collateralType: String?
        let collateralDetails: String?
        let damageFee: Double
        let outletName: String
        let merchantName: String?
        let notes: String?
    }
    
    private struct OrderItemForPDF {
        let productName: String
        let quantity: Int
        let unitPrice: Double
        let totalPrice: Double
        let notes: String?
    }
    
    // MARK: - Helper: Convert ViewModel to Order for PDF
    private func createOrderForPDF(from viewModel: PreviewViewModelProtocol) -> OrderForPDF {
        if let orderViewModel = viewModel as? OrderViewModel {
            let order = orderViewModel.currentOrder
            return OrderForPDF(
                orderNumber: order.orderNumber,
                orderType: order.orderType,
                customerName: order.customerName,
                customerPhone: order.customerPhone,
                createdAt: order.createdAt,
                pickupDate: order.pickupDate,
                returnDate: order.returnDate,
                orderItems: order.orderItems.map { item in
                    OrderItemForPDF(
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        notes: item.notes
                    )
                },
                subtotal: order.orderItems.reduce(0.0) { $0 + $1.totalPrice },
                discountType: order.discountType,
                discountValue: order.discountValue,
                discountAmount: order.discountAmount,
                totalAmount: order.totalAmount,
                depositAmount: order.depositAmount,
                securityDeposit: order.securityDeposit,
                collateralType: order.collateralType,
                collateralDetails: order.collateralDetails,
                damageFee: order.damageFee,
                outletName: order.outletName,
                merchantName: order.merchantName,
                notes: order.notes
            )
        } else if let cartViewModel = viewModel as? CartViewModel {
            // Convert CartViewModel to Order structure
            let items = (0..<cartViewModel.itemsCount).compactMap { index -> OrderItemForPDF? in
                guard let cartItem = cartViewModel.item(at: index) as? CartItem else { return nil }
                return OrderItemForPDF(
                    productName: cartItem.productName ?? "",
                    quantity: cartItem.quantity,
                    unitPrice: cartItem.price,
                    totalPrice: cartItem.subTotal,
                    notes: cartItem.note
                )
            }
            
            // Get discount value correctly - discountValue should be % if percentage, amount if amount
            let discountType: String = cartViewModel.discountText.contains("%") ? "percentage" : "amount"
            
            return OrderForPDF(
                orderNumber: "DRAFT",
                orderType: cartViewModel.orderType,
                customerName: cartViewModel.customerName,
                customerPhone: cartViewModel.customerPhone,
                createdAt: cartViewModel.createDate ?? Date(),
                pickupDate: cartViewModel.pickupDate,
                returnDate: cartViewModel.returnDate,
                orderItems: items,
                subtotal: cartViewModel.subtotal,
                discountType: discountType,
                discountValue: cartViewModel.discountValue, // Use discountValue property which returns correct value
                discountAmount: cartViewModel.discountAmount,
                totalAmount: cartViewModel.totalAmount,
                depositAmount: cartViewModel.depositAmount,
                securityDeposit: cartViewModel.bailAmount,
                collateralType: nil, // Cart doesn't have collateralType, only details
                collateralDetails: cartViewModel.materialText.isEmpty ? nil : cartViewModel.materialText,
                damageFee: cartViewModel.damageFee,
                outletName: cartViewModel.outletName,
                merchantName: cartViewModel.merchantName,
                notes: cartViewModel.notes.isEmpty ? nil : cartViewModel.notes
            )
        } else {
            // Fallback - should not happen
            return OrderForPDF(
                orderNumber: "UNKNOWN",
                orderType: .rent,
                customerName: "",
                customerPhone: nil,
                createdAt: Date(),
                pickupDate: nil,
                returnDate: nil,
                orderItems: [],
                subtotal: 0,
                discountType: nil,
                discountValue: 0,
                discountAmount: 0,
                totalAmount: 0,
                depositAmount: 0,
                securityDeposit: 0,
                collateralType: nil,
                collateralDetails: nil,
                damageFee: 0,
                outletName: "",
                merchantName: nil,
                notes: nil
            )
        }
    }
    
    /// Generates JPG receipt with one full style for the entire receipt (fonts + spacing). Default: `.alternate` (document-style with accent bar). Use `.unified` or `.original` for classic centered layout.
    private func generateJPGReceipt(for order: OrderForPDF, viewModel: PreviewViewModelProtocol? = nil, style: ReceiptStyle = .alternate) -> URL? {
        let imageWidth: CGFloat = 595.2
        let margin: CGFloat = 50
        let topPadding: CGFloat = 50
        let bottomPadding: CGFloat = 80
        let contentWidth = imageWidth - (margin * 2)
        let rowSpacing = style.rowSpacing
        let sectionSpacing = style.sectionSpacing
        let separatorSpacing: CGFloat = 14
        let labelColumnWidth: CGFloat = 175
        let valueColumnWidth: CGFloat = 145
        
        let largeTitleFont = UIFont.boldSystemFont(ofSize: style.largeTitleSize)
        let titleFont = UIFont.boldSystemFont(ofSize: style.receiptTitleSize)
        let orderNumberFont = UIFont.boldSystemFont(ofSize: style.orderNumberSize)
        let sectionFont = UIFont.boldSystemFont(ofSize: style.sectionTitleSize)
        let bodyFont = UIFont.systemFont(ofSize: style.bodySize)
        let bodyBoldFont = UIFont.boldSystemFont(ofSize: style.bodyBoldSize)
        let smallFont = UIFont.systemFont(ofSize: style.smallSize)
        let tinyFont = UIFont.systemFont(ofSize: style.tinySize)
        
        let primaryColor = UIColor.black
        let secondaryColor = UIColor.darkGray
        let accentColor = UIColor(red: 0.2, green: 0.4, blue: 0.8, alpha: 1.0)
        
        var outletAddress: String?
        var outletPhone: String?
        if let viewModel = viewModel {
            outletAddress = viewModel.outletAddress
            outletPhone = viewModel.outletPhone
        }

        func italicFont(from font: UIFont) -> UIFont {
            UIFont(
                descriptor: font.fontDescriptor.withSymbolicTraits(.traitItalic) ?? font.fontDescriptor,
                size: font.pointSize
            )
        }

        func makePlainAttributedText(_ text: String, font: UIFont, color: UIColor) -> NSAttributedString {
            NSAttributedString(string: text, attributes: [
                .font: font,
                .foregroundColor: color
            ])
        }

        func makeBilingualAttributedText(
            vietnamese: String,
            english: String,
            mainFont: UIFont,
            englishFont: UIFont,
            color: UIColor,
            includeColon: Bool
        ) -> NSAttributedString {
            let suffix = includeColon ? ": " : ""
            let text = "\(vietnamese)/\(english)\(suffix)"
            let attributed = NSMutableAttributedString(string: text, attributes: [
                .font: mainFont,
                .foregroundColor: color
            ])
            let englishStart = vietnamese.count + 1
            attributed.addAttributes([
                .font: italicFont(from: englishFont),
                .foregroundColor: color
            ], range: NSRange(location: englishStart, length: english.count))
            return attributed
        }

        func drawAttributedText(
            _ attributedText: NSAttributedString,
            x: CGFloat,
            y: CGFloat,
            width: CGFloat,
            alignment: NSTextAlignment = .left,
            in context: CGContext?
        ) -> CGFloat {
            let mutable = NSMutableAttributedString(attributedString: attributedText)
            let fullRange = NSRange(location: 0, length: mutable.length)
            let paragraphStyle = NSMutableParagraphStyle()
            paragraphStyle.alignment = alignment
            paragraphStyle.lineBreakMode = .byWordWrapping
            mutable.addAttribute(.paragraphStyle, value: paragraphStyle, range: fullRange)

            let measuredRect = mutable.boundingRect(
                with: CGSize(width: width, height: CGFloat.greatestFiniteMagnitude),
                options: [.usesLineFragmentOrigin, .usesFontLeading],
                context: nil
            )
            let height = max(ceil(measuredRect.height), 1)

            if context != nil {
                mutable.draw(
                    with: CGRect(x: x, y: y, width: width, height: height),
                    options: [.usesLineFragmentOrigin, .usesFontLeading],
                    context: nil
                )
            }

            return height
        }

        func drawText(
            _ text: String,
            font: UIFont,
            color: UIColor,
            x: CGFloat,
            y: CGFloat,
            width: CGFloat,
            alignment: NSTextAlignment = .left,
            in context: CGContext?
        ) -> CGFloat {
            drawAttributedText(
                makePlainAttributedText(text, font: font, color: color),
                x: x,
                y: y,
                width: width,
                alignment: alignment,
                in: context
            )
        }

        func drawSeparator(at y: CGFloat, in context: CGContext?) {
            guard let context = context else { return }
            context.saveGState()
            context.setStrokeColor(primaryColor.cgColor)
            context.setLineWidth(0.5)
            context.move(to: CGPoint(x: margin, y: y))
            context.addLine(to: CGPoint(x: imageWidth - margin, y: y))
            context.strokePath()
            context.restoreGState()
        }

        /// Alternate style: accent bar + left-aligned order # and date, store, receipt type. Returns y after separator.
        func drawAlternateHeader(in context: CGContext?) -> CGFloat {
            let accentBarHeight: CGFloat = 28
            if let ctx = context {
                ctx.saveGState()
                ctx.setFillColor(accentColor.cgColor)
                ctx.fill(CGRect(x: 0, y: 0, width: imageWidth, height: accentBarHeight))
                ctx.restoreGState()
            }
            var y = topPadding + accentBarHeight + 14

            let orderTitle = order.orderNumber == "DRAFT" ? "ORDER" : "ORDER #\(order.orderNumber)"
            let orderTitleColor = order.orderNumber == "DRAFT" ? UIColor.orange : accentColor
            let dateStr = order.createdAt.dateTimeInString() ?? "N/A"
            let leftHalf = contentWidth * 0.55
            let rightHalf = contentWidth - leftHalf
            let orderH = drawText(orderTitle, font: orderNumberFont, color: orderTitleColor, x: margin, y: y, width: leftHalf, alignment: .left, in: context)
            drawText(dateStr, font: smallFont, color: secondaryColor, x: margin + leftHalf, y: y, width: rightHalf, alignment: .right, in: context)
            y += max(orderH, 14) + 10

            let storeName = order.outletName.trimmingCharacters(in: .whitespacesAndNewlines)
            if !storeName.isEmpty {
                y += drawText(storeName, font: largeTitleFont, color: primaryColor, x: margin, y: y, width: contentWidth, alignment: .left, in: context) + 4
            }
            if let phone = outletPhone?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
                y += drawText(phone, font: bodyFont, color: secondaryColor, x: margin, y: y, width: contentWidth, alignment: .left, in: context) + 4
            }
            if let address = outletAddress?.trimmingCharacters(in: .whitespacesAndNewlines), !address.isEmpty {
                y += drawText(address, font: smallFont, color: secondaryColor, x: margin, y: y, width: contentWidth, alignment: .left, in: context) + 6
            }
            let receiptType = order.orderType == .rent ? "RENTAL RECEIPT" : "SALE RECEIPT"
            y += drawText(receiptType, font: UIFont.boldSystemFont(ofSize: style.receiptTitleSize), color: secondaryColor, x: margin, y: y, width: contentWidth, alignment: .left, in: context) + 12
            drawSeparator(at: y, in: context)
            return y
        }

        func drawLabelValueRow(
            label: NSAttributedString,
            value: NSAttributedString,
            y: CGFloat,
            labelWidth: CGFloat = labelColumnWidth,
            valueAlignment: NSTextAlignment = .left,
            in context: CGContext?
        ) -> CGFloat {
            let valueX = margin + labelWidth + 10
            let valueWidth = contentWidth - labelWidth - 10
            let labelHeight = drawAttributedText(label, x: margin, y: y, width: labelWidth, in: context)
            let valueHeight = drawAttributedText(value, x: valueX, y: y, width: valueWidth, alignment: valueAlignment, in: context)
            return max(labelHeight, valueHeight)
        }

        func drawSummaryRow(
            label: NSAttributedString,
            value: NSAttributedString,
            y: CGFloat,
            in context: CGContext?
        ) -> CGFloat {
            let summaryLabelWidth = contentWidth - valueColumnWidth - 12
            let valueX = margin + summaryLabelWidth + 12
            let labelHeight = drawAttributedText(label, x: margin, y: y, width: summaryLabelWidth, in: context)
            let valueHeight = drawAttributedText(value, x: valueX, y: y, width: valueColumnWidth, alignment: .right, in: context)
            return max(labelHeight, valueHeight)
        }

        func renderReceipt(in context: CGContext?) -> CGFloat {
            var yPosition: CGFloat
            if style == .alternate {
                yPosition = drawAlternateHeader(in: context)
                yPosition += sectionSpacing
            } else {
                yPosition = topPadding
                let storeName = order.outletName.trimmingCharacters(in: .whitespacesAndNewlines)
                if !storeName.isEmpty {
                    yPosition += drawText(
                        storeName,
                        font: largeTitleFont,
                        color: accentColor,
                        x: margin,
                        y: yPosition,
                        width: contentWidth,
                        alignment: .center,
                        in: context
                    ) + 5
                }
                if let phone = outletPhone?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
                    yPosition += drawText(
                        phone,
                        font: bodyFont,
                        color: secondaryColor,
                        x: margin,
                        y: yPosition,
                        width: contentWidth,
                        alignment: .center,
                        in: context
                    ) + 4
                }
                if let address = outletAddress?.trimmingCharacters(in: .whitespacesAndNewlines), !address.isEmpty {
                    yPosition += drawText(
                        address,
                        font: bodyFont,
                        color: secondaryColor,
                        x: margin,
                        y: yPosition,
                        width: contentWidth,
                        alignment: .center,
                        in: context
                    ) + 10
                } else {
                    yPosition += 5
                }
                let receiptTitle = order.orderType == .rent ? "RENTAL RECEIPT" : "SALE RECEIPT"
                yPosition += drawText(
                    receiptTitle,
                    font: titleFont,
                    color: primaryColor,
                    x: margin,
                    y: yPosition,
                    width: contentWidth,
                    alignment: .center,
                    in: context
                ) + style.spacingAfterReceiptTitle
                let orderTitle = order.orderNumber == "DRAFT" ? "ORDER" : "ORDER #\(order.orderNumber)"
                let orderTitleColor = order.orderNumber == "DRAFT" ? UIColor.orange : accentColor
                yPosition += drawText(
                    orderTitle,
                    font: orderNumberFont,
                    color: orderTitleColor,
                    x: margin,
                    y: yPosition,
                    width: contentWidth,
                    alignment: .center,
                    in: context
                ) + style.spacingAfterOrderNumber
                drawSeparator(at: yPosition, in: context)
                yPosition += sectionSpacing
            }

            let customerHeader = makeBilingualAttributedText(
                vietnamese: "Thông Tin Khách Hàng",
                english: "Customer Information",
                mainFont: sectionFont,
                englishFont: smallFont,
                color: primaryColor,
                includeColon: false
            )
            yPosition += drawAttributedText(customerHeader, x: margin, y: yPosition, width: contentWidth, in: context) + 8
            
            let customerName = order.customerName.trimmingCharacters(in: .whitespacesAndNewlines)
            if !customerName.isEmpty {
                let label = makeBilingualAttributedText(vietnamese: "Tên", english: "Name", mainFont: bodyBoldFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                let value = makePlainAttributedText(customerName, font: bodyFont, color: primaryColor)
                yPosition += drawLabelValueRow(label: label, value: value, y: yPosition, in: context) + rowSpacing
            }
            
            if let phone = order.customerPhone?.trimmingCharacters(in: .whitespacesAndNewlines), !phone.isEmpty {
                let label = makeBilingualAttributedText(vietnamese: "Điện Thoại", english: "Phone", mainFont: bodyBoldFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                let value = makePlainAttributedText(phone, font: bodyFont, color: primaryColor)
                yPosition += drawLabelValueRow(label: label, value: value, y: yPosition, in: context) + rowSpacing
            }

            yPosition += 4
            drawSeparator(at: yPosition, in: context)
            yPosition += sectionSpacing
            
            let dateHeader = makeBilingualAttributedText(
                vietnamese: order.orderType == .rent ? "Thời Gian Thuê" : "Thông Tin Đơn Hàng",
                english: order.orderType == .rent ? "Rental Period" : "Order Information",
                mainFont: sectionFont,
                englishFont: smallFont,
                color: primaryColor,
                includeColon: false
            )
            yPosition += drawAttributedText(dateHeader, x: margin, y: yPosition, width: contentWidth, in: context) + 8

            let createLabel = makeBilingualAttributedText(vietnamese: "Ngày Tạo", english: "Create Date", mainFont: bodyBoldFont, englishFont: smallFont, color: primaryColor, includeColon: true)
            let createValue = makePlainAttributedText(order.createdAt.dateTimeInString() ?? "N/A", font: bodyFont, color: primaryColor)
            yPosition += drawLabelValueRow(label: createLabel, value: createValue, y: yPosition, in: context) + rowSpacing

            if order.orderType == .rent {
                if let pickupDate = order.pickupDate {
                    let label = makeBilingualAttributedText(vietnamese: "Ngày Lấy", english: "Pickup Date", mainFont: bodyBoldFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                    let value = makePlainAttributedText(pickupDate.dateInString() ?? "N/A", font: bodyFont, color: primaryColor)
                    yPosition += drawLabelValueRow(label: label, value: value, y: yPosition, in: context) + rowSpacing
                }
                
                if let returnDate = order.returnDate {
                    let label = makeBilingualAttributedText(vietnamese: "Ngày Trả", english: "Return Date", mainFont: bodyBoldFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                    let value = makePlainAttributedText(returnDate.dateInString() ?? "N/A", font: bodyFont, color: primaryColor)
                    yPosition += drawLabelValueRow(label: label, value: value, y: yPosition, in: context) + rowSpacing
                }
            }
            
            yPosition += 4
            drawSeparator(at: yPosition, in: context)
            yPosition += sectionSpacing
            
            let itemsHeader = makeBilingualAttributedText(
                vietnamese: "Sản Phẩm",
                english: "Items",
                mainFont: sectionFont,
                englishFont: smallFont,
                color: primaryColor,
                includeColon: false
            )
            yPosition += drawAttributedText(itemsHeader, x: margin, y: yPosition, width: contentWidth, in: context) + 10

            let sttColWidth: CGFloat = 30
            let sttColX = margin
            let itemColX = sttColX + sttColWidth + 10
            let qtyColWidth: CGFloat = 50
            let priceColWidth: CGFloat = 120
            let totalColWidth: CGFloat = 120
            let totalColX = imageWidth - margin - totalColWidth
            let priceColX = totalColX - priceColWidth - 10
            let qtyColX = priceColX - qtyColWidth - 10
            let itemColWidth = max(80, qtyColX - itemColX - 10)

            let tableHeaderHeight = max(
                drawText("#", font: bodyBoldFont, color: secondaryColor, x: sttColX, y: yPosition, width: sttColWidth, in: context),
                drawAttributedText(makeBilingualAttributedText(vietnamese: "Tên", english: "Item", mainFont: bodyBoldFont, englishFont: smallFont, color: secondaryColor, includeColon: false), x: itemColX, y: yPosition, width: itemColWidth, in: context),
                drawAttributedText(makeBilingualAttributedText(vietnamese: "SL", english: "Quantity", mainFont: bodyBoldFont, englishFont: smallFont, color: secondaryColor, includeColon: false), x: qtyColX, y: yPosition, width: qtyColWidth, alignment: .right, in: context),
                drawAttributedText(makeBilingualAttributedText(vietnamese: "Giá", english: "Price", mainFont: bodyBoldFont, englishFont: smallFont, color: secondaryColor, includeColon: false), x: priceColX, y: yPosition, width: priceColWidth, alignment: .right, in: context),
                drawAttributedText(makeBilingualAttributedText(vietnamese: "Tổng", english: "Total", mainFont: bodyBoldFont, englishFont: smallFont, color: secondaryColor, includeColon: false), x: totalColX, y: yPosition, width: totalColWidth, alignment: .right, in: context)
            )
            yPosition += tableHeaderHeight + 6
            drawSeparator(at: yPosition, in: context)
            yPosition += 8
            
            for (index, item) in order.orderItems.enumerated() {
                let rowTop = yPosition
                let nameHeight = drawText(
                    item.productName,
                    font: bodyFont,
                    color: primaryColor,
                    x: itemColX,
                    y: rowTop,
                    width: itemColWidth,
                    in: context
                )

                let numberText = "\(index + 1)"
                let quantityText = "\(item.quantity)"
                let unitPriceText = item.unitPrice.formatStringInCommon()
                let totalPriceText = item.totalPrice.formatStringInCommon()

                let metricHeight = max(
                    drawText(numberText, font: bodyFont, color: primaryColor, x: sttColX, y: rowTop, width: sttColWidth, in: context),
                    drawText(quantityText, font: bodyFont, color: primaryColor, x: qtyColX, y: rowTop, width: qtyColWidth, alignment: .right, in: context),
                    drawText(unitPriceText, font: bodyFont, color: primaryColor, x: priceColX, y: rowTop, width: priceColWidth, alignment: .right, in: context),
                    drawText(totalPriceText, font: bodyBoldFont, color: primaryColor, x: totalColX, y: rowTop, width: totalColWidth, alignment: .right, in: context)
                )
                
                yPosition = rowTop + max(nameHeight, metricHeight) + 4

                if let notes = item.notes?.trimmingCharacters(in: .whitespacesAndNewlines), !notes.isEmpty {
                    let label = makeBilingualAttributedText(vietnamese: "Ghi Chú", english: "Note", mainFont: smallFont, englishFont: tinyFont, color: secondaryColor, includeColon: true)
                    let value = makePlainAttributedText(notes, font: smallFont, color: secondaryColor)
                    yPosition += drawLabelValueRow(label: label, value: value, y: yPosition, labelWidth: 75, in: context) + 4
                } else {
                    yPosition += 4
                }
            }
            
            drawSeparator(at: yPosition, in: context)
            yPosition += sectionSpacing
            
            let summaryHeader = makeBilingualAttributedText(
                vietnamese: "Tóm Tắt Thanh Toán",
                english: "Payment Summary",
                mainFont: sectionFont,
                englishFont: smallFont,
                color: primaryColor,
                includeColon: false
            )
            yPosition += drawAttributedText(summaryHeader, x: margin, y: yPosition, width: contentWidth, in: context) + 10
            
            let subtotalLabel = makeBilingualAttributedText(vietnamese: "Tạm Tính", english: "Subtotal", mainFont: bodyFont, englishFont: smallFont, color: primaryColor, includeColon: true)
            let subtotalValue = makePlainAttributedText(order.subtotal.formatStringInCommon(), font: bodyFont, color: primaryColor)
            yPosition += drawSummaryRow(label: subtotalLabel, value: subtotalValue, y: yPosition, in: context) + rowSpacing

            if order.discountAmount > 0 {
                let discountLabel: NSAttributedString
                if let discountType = order.discountType, discountType.lowercased() == "percentage" {
                    discountLabel = makeBilingualAttributedText(
                        vietnamese: String(format: "Giảm Giá (%d%%)", Int(order.discountValue)),
                        english: String(format: "Discount (%d%%)", Int(order.discountValue)),
                        mainFont: bodyFont,
                        englishFont: smallFont,
                        color: primaryColor,
                        includeColon: true
                    )
                } else {
                    discountLabel = makeBilingualAttributedText(vietnamese: "Giảm Giá", english: "Discount", mainFont: bodyFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                }
                let discountValue = makePlainAttributedText(order.discountAmount.formatStringInCommon(), font: bodyFont, color: .red)
                yPosition += drawSummaryRow(label: discountLabel, value: discountValue, y: yPosition, in: context) + rowSpacing
            }

            drawSeparator(at: yPosition + 2, in: context)
            yPosition += separatorSpacing
            
            let totalLabel = makeBilingualAttributedText(vietnamese: "Tổng Cộng", english: "Total", mainFont: bodyBoldFont, englishFont: smallFont, color: primaryColor, includeColon: true)
            let totalValue = makePlainAttributedText(order.totalAmount.formatStringInCommon(), font: bodyBoldFont, color: accentColor)
            yPosition += drawSummaryRow(label: totalLabel, value: totalValue, y: yPosition, in: context) + sectionSpacing

            if order.orderType == .rent {
                let depositLabel = makeBilingualAttributedText(vietnamese: "Cọc", english: "Deposit", mainFont: bodyFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                let depositValue = makePlainAttributedText(order.depositAmount.formatStringInCommon(), font: bodyFont, color: primaryColor)
                yPosition += drawSummaryRow(label: depositLabel, value: depositValue, y: yPosition, in: context) + rowSpacing

                if order.securityDeposit > 0 {
                    let securityLabel = makeBilingualAttributedText(vietnamese: "Tiền Thế Chân", english: "Security Deposit", mainFont: bodyFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                    let securityValue = makePlainAttributedText(order.securityDeposit.formatStringInCommon(), font: bodyFont, color: primaryColor)
                    yPosition += drawSummaryRow(label: securityLabel, value: securityValue, y: yPosition, in: context) + rowSpacing
                }

                if let collateral = order.collateralDetails?.trimmingCharacters(in: .whitespacesAndNewlines), !collateral.isEmpty {
                    let label = makeBilingualAttributedText(vietnamese: "Giấy Tờ Thế Chân", english: "Collateral", mainFont: bodyFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                    let value = makePlainAttributedText(collateral, font: bodyFont, color: primaryColor)
                    yPosition += drawLabelValueRow(label: label, value: value, y: yPosition, in: context) + rowSpacing
                }
                
                if order.damageFee > 0 {
                    let damageLabel = makeBilingualAttributedText(vietnamese: "Phí Hư Hại", english: "Damage Fee", mainFont: bodyFont, englishFont: smallFont, color: primaryColor, includeColon: true)
                    let damageValue = makePlainAttributedText(order.damageFee.formatStringInCommon(), font: bodyFont, color: primaryColor)
                    yPosition += drawSummaryRow(label: damageLabel, value: damageValue, y: yPosition, in: context) + rowSpacing
                }
            }
            
            
            yPosition += 4
            drawSeparator(at: yPosition, in: context)
            yPosition += sectionSpacing
            
            let footerText = order.orderType == .rent ? "Thank you for your business!".localized() : "Thank you for your purchase!".localized()
            yPosition += drawText(footerText, font: bodyBoldFont, color: accentColor, x: margin, y: yPosition, width: contentWidth, alignment: .center, in: context) + 10
            
            // Use receipt/order creation time (not export time)
            let generatedDateTime = order.createdAt.dateTimeInString() ?? ""
            let generatedText = String(format: "Generated on %@".localized(), generatedDateTime)
            yPosition += drawText(generatedText, font: smallFont, color: secondaryColor, x: margin, y: yPosition, width: contentWidth, alignment: .center, in: context) + 5
            
            let softwareText = "Receipt generated by AnyRent software".localized()
            yPosition += drawText(softwareText, font: smallFont, color: secondaryColor, x: margin, y: yPosition, width: contentWidth, alignment: .center, in: context)

            return yPosition + bottomPadding
        }

        let finalHeight = max(renderReceipt(in: nil), topPadding + bottomPadding + 200)
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: imageWidth, height: finalHeight))
        let finalImage = renderer.image { rendererContext in
            UIColor.white.setFill()
            rendererContext.fill(CGRect(x: 0, y: 0, width: imageWidth, height: finalHeight))
            _ = renderReceipt(in: rendererContext.cgContext)
        }
        
        // Save JPG to temporary file
        let fileName = order.orderNumber == "DRAFT" ? "Draft_Order_\(Date().timeIntervalSince1970).jpg" : "Order_\(order.orderNumber).jpg"
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        
        // Convert to JPG data with high quality
        guard let jpgData = finalImage.jpeg(.high) ?? UIImageJPEGRepresentation(finalImage, 0.9) else {
            return nil
        }
        
        do {
            try jpgData.write(to: tempURL)
            return tempURL
        } catch {
            print("Failed to write JPG: \(error)")
        return nil
        }
    }
    
    /// Backup: generates JPG receipt with original style (ORDER # same size as before). Use when you need the old layout.
    private func generateJPGReceiptLegacy(for order: OrderForPDF, viewModel: PreviewViewModelProtocol? = nil) -> URL? {
        return generateJPGReceipt(for: order, viewModel: viewModel, style: .original)
    }
    
    private func shareImage(url: URL) {
        // Ensure file is JPG image (not PDF)
        guard url.pathExtension.lowercased() == "jpg" || url.pathExtension.lowercased() == "jpeg" else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Invalid image format. Only JPG images are supported.".localized()
            )
            return
        }
        
        // Load UIImage from JPG file - use UIImage only (not URL) to avoid duplicate saves
        // UIImage enables "Save to Photos" option and prevents duplicate saves
        guard let imageData = try? Data(contentsOf: url),
              let image = UIImage(data: imageData) else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Failed to load image".localized()
            )
            return
        }
        
        let activityViewController = UIActivityViewController(
            activityItems: [image],
            applicationActivities: nil
        )
        
        // For iPad
        if let popover = activityViewController.popoverPresentationController {
            popover.sourceView = shareButton
            popover.sourceRect = shareButton.bounds
            popover.permittedArrowDirections = .any
        }
        
        // Clean up file after sharing
        activityViewController.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: url)
        }
        
        present(activityViewController, animated: true)
    }
    
    
    @objc private func readyDeliverTapped(_ sender: UIButton) {
        // Toggle the button state
        sender.isSelected.toggle()
        
        // Update viewModel
        viewModel.updateReadyToDeliver(sender.isSelected)
        
        // Show progress
        self.showProgressText(text: "Updating order...".localized())
        
        // Use specific update method for ready to deliver
        if let orderViewModel = viewModel as? OrderViewModel {
            orderViewModel.updateReadyToDeliverStatus(sender.isSelected) { [weak self] result in
                DispatchQueue.main.async {
                    self?.hideProgress()
                    
                    switch result {
                                case .success:
                                    // Clear cart when order is updated successfully
                                    CartStore.shared.resetCart()
                                    ProductAvailabilityCache.shared.clearAll()
                                    
                                    // Update UI with response data (order already updated in viewModel)
                                    self?.updateUI()
                                    // Notify delegate and ViewModel with updated order
                                    let updatedOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(updatedOrder)
                    case .failure(let error):
                        // Revert button state on failure
                        sender.isSelected.toggle()
                        UIAlertController.errorAlert(parent: self, error: error)
                    }
                }
            }
        } else {
            // Fallback to general update for cart
            viewModel.updateOrder { [weak self] result in
                DispatchQueue.main.async {
                    self?.hideProgress()
                    
                    switch result {
                    case .success:
                        break
                    case .failure(let error):
                        sender.isSelected.toggle()
                        UIAlertController.errorAlert(parent: self, error: error)
                    }
                }
            }
        }
    }
    
    @objc private func bailButtonTapped() {
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        
        let initialValue = viewModel.bailAmount
        
        picker.configure(initialValue: initialValue)
        picker.tag = 1 // To identify bail amount in delegate
        present(picker, animated: true)
    }
    
    @objc private func extraChargeButtonTapped() {
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        
        let initialValue = viewModel.damageFee
        
        picker.configure(initialValue: initialValue)
        picker.tag = 2 // To identify damage fee in delegate
        present(picker, animated: true)
    }
    
    @objc private func depositButtonTapped() {
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        
        let initialValue = viewModel.depositAmount
        
        picker.configure(initialValue: initialValue)
        picker.tag = 3 // To identify deposit amount in delegate
        present(picker, animated: true)
    }
    
    @objc private func showNoteView() {
        let controller = NoteViewController.instance()
        controller.delegate = self
        controller.setNote(viewModel.notes.isEmpty ? nil : viewModel.notes)
        controller.setImages(noteImages)
        if let urls = noteImageURLs, !urls.isEmpty {
            controller.setImageURLs(urls)
        }
        present(UINavigationController(rootViewController: controller), animated: true)
    }
    
    @objc private func saveOrder() {
        HapticFeedback.medium()
        
        // For existing orders (OrderViewModel), show payment dialog for rent orders
        if viewModel.orderType == .rent, let orderViewModel = viewModel as? OrderViewModel {
            showPaymentDialog(for: orderViewModel)
        } 
        // For new orders (CartViewModel), show payment dialog to collect amount
        else if let cartViewModel = viewModel as? CartViewModel {
            showPaymentDialogForNewOrder(cartViewModel: cartViewModel)
        } 
        // For other cases, proceed directly
        else {
            proceedWithSave()
        }
    }
    
    private func showPaymentDialogForNewOrder(cartViewModel: CartViewModel) {
        // Use PaymentCollectionViewController for both rent and sale orders
        let paymentType: PaymentType
        if cartViewModel.orderType == .rent {
            // For rent orders, use deposit payment type
            paymentType = .deposit(amount: cartViewModel.depositAmount, collateralDetails: cartViewModel.materialText.isEmpty ? nil : cartViewModel.materialText)
        } else {
            // For sale orders, use sale payment type with grand total
            paymentType = .sale(amount: cartViewModel.toCollectAmount)
        }
        
        let paymentController = PaymentCollectionViewController.instance(paymentType: paymentType)
        paymentController.delegate = self
        present(paymentController, animated: true)
    }
    
    private func showPaymentDialog(for orderViewModel: OrderViewModel) {
        // PaymentCollectionViewController now uses OrderViewModel directly
        // It will use toCollectAmount and getPaymentType() internally for consistency
        let paymentController = PaymentCollectionViewController.instance(orderViewModel: orderViewModel)
        paymentController.delegate = self
        present(paymentController, animated: true)
    }
    
    private func proceedWithSave() {
        let noteImageData = noteImages.compactMap { image in
            UIImageJPEGRepresentation(image, 0.8)
        }

        if let cartViewModel = viewModel as? CartViewModel, !noteImageData.isEmpty {
            OrderService.shared.createOrder(from: CartStore.shared.cart, notesImages: noteImageData) { [weak self] order, error in
                DispatchQueue.main.async {
                    if let error = error {
                        UIAlertController.errorAlert(parent: self, error: error)
                        return
                    }

                    self?.completeOrder(updatedOrder: order)
                }
            }
            return
        }

        viewModel.saveOrder { [weak self] result in
            switch result {
            case .success:
                // For CartViewModel, we need to get the created order
                // Since CartViewModel.saveOrder doesn't return order directly,
                // we'll complete with nil and SaleViewController will handle reload
                self?.completeOrder()
            case .failure(let error):
                UIAlertController.errorAlert(parent: self, error: error)
            }
        }
    }
    
    
    @objc private func cancelOrder() {
        HapticFeedback.medium()
        
        // Show confirmation alert before canceling order
        UIAlertController.alert(
            parent: self,
            title: "Cancel Order".localized(),
            message: "You are cancel the order. Are you sure?".localized(),
            okTitle: "Yes, sure!".localized(),
            cancelTitle: "Cancel".localized(),
            okAction: { [weak self] _ in
                self?.proceedWithCancelOrder()
            },
            cancelAction: nil
        )
    }
    
    private func proceedWithCancelOrder() {
        viewModel.cancelOrder { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    // Reload order detail after cancel and notify delegate
                    if let orderViewModel = self?.viewModel as? OrderViewModel {
                        orderViewModel.reloadOrderDetail { [weak self] reloadResult in
                            DispatchQueue.main.async {
                                switch reloadResult {
                                case .success(let updatedOrder):
                                    // Notify delegate and ViewModel with updated order (status changed to cancelled)
                                    self?.notifyOrderUpdate(updatedOrder)
                                case .failure:
                                    // Even if reload fails, notify delegate and ViewModel with current order
                                    let currentOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(currentOrder)
                                }
                                self?.navigationController?.popViewController(animated: true)
                            }
                        }
                    } else {
                        // For cart, just pop
                        self?.navigationController?.popViewController(animated: true)
                    }
                case .failure(let error):
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
    
    @objc private func printOrder() {
        viewModel.printOrder { [weak self] result in
            switch result {
            case .success:
                // Print successful
                break
            case .failure(let error):
                UIAlertController.errorAlert(parent: self, error: error)
            }
        }
    }
    
    @objc private func updateOrder() {
        HapticFeedback.medium()
        
        self.showProgressText(text: "Updating order...".localized())
        
        viewModel.updateOrder { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success:
                    // Reload order detail from API to get latest data
                    self?.reloadOrderDetailAfterUpdate()
                case .failure(let error):
                    self?.hideProgress()
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
    
    @objc private func deleteOrder() {
        HapticFeedback.medium()
        
        // Show confirmation alert before deleting order
        UIAlertController.alert(
            parent: self,
            title: "Delete Order".localized(),
            message: "Are you sure you want to delete this order? This action cannot be undone.".localized(),
            okTitle: "Delete".localized(),
            cancelTitle: "Cancel".localized(),
            okAction: { [weak self] _ in
                self?.proceedWithDeleteOrder()
            },
            cancelAction: nil
        )
    }
    
    private func proceedWithDeleteOrder() {
        showProgressText(text: "Deleting order...".localized())
        
        viewModel.deleteOrder { [weak self] result in
            DispatchQueue.main.async {
                self?.hideProgress()
                
                switch result {
                case .success:
                    // Notify delegate that order was deleted (pass nil to indicate deletion)
                    self?.notifyOrderUpdate(nil)
                    
                    // Pop back to previous screen
                    self?.navigationController?.popViewController(animated: true)
                case .failure(let error):
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
    
    // Reload order detail after update and notify delegate
    private func reloadOrderDetailAfterUpdate() {
        // Only reload if this is an OrderViewModel (not CartViewModel)
        guard let orderViewModel = viewModel as? OrderViewModel else {
            hideProgress()
            completeOrder()
            return
        }
        
        orderViewModel.reloadOrderDetail { [weak self] result in
            DispatchQueue.main.async {
                self?.hideProgress()
                
                switch result {
                case .success(let updatedOrder):
                    // Clear cart when order is updated successfully
                    CartStore.shared.resetCart()
                    ProductAvailabilityCache.shared.clearAll()
                    
                    // Reload UI with updated order data
                    self?.updateUI()
                    
                    // Notify delegate and ViewModel with updated order
                    self?.notifyOrderUpdate(updatedOrder)
                case .failure(let error):
                    // Even if reload fails, still notify delegate and ViewModel with current order
                    let currentOrder = orderViewModel.currentOrder
                    self?.notifyOrderUpdate(currentOrder)
                    
                    // Show error but don't block the flow
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
    
    
    private func completeOrder(updatedOrder: Order? = nil){
        // Clear cart when order is created or updated successfully
        // This ensures cart is cleared immediately after successful order creation/update
        // Clear cart for both new orders (CartViewModel) and edited orders (OrderViewModel)
        CartStore.shared.resetCart()
        // Clear availability cache when clearing cart
        ProductAvailabilityCache.shared.clearAll()
        
        // Check if this is a new order (CartViewModel) - only show rating for new orders
        let isNewOrder = viewModel is CartViewModel
        
        // Notify delegate with updated order data
        var finalUpdatedOrder = updatedOrder
        if finalUpdatedOrder == nil, let orderViewModel = viewModel as? OrderViewModel {
            finalUpdatedOrder = orderViewModel.currentOrder
        }
        
        notifyOrderUpdate(finalUpdatedOrder)
        
        // Request rating if this is the first order created
        // Note: Request rating before popping view controller to ensure view controller is still available
        if isNewOrder {
            RatingManager.shared.requestRatingIfNeeded(from: self)
        }
        
        self.navigationController?.popViewController(animated: true)
    }
    
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    // Setup UI components
    override func setupUI() {
        // Configure table view - no header/footer views, everything is in sections
        previewTableView.tableHeaderView = UIView(frame: CGRect(x: 0, y: 0, width: 0, height: CGFloat.leastNormalMagnitude))
        previewTableView.tableFooterView = UIView(frame: CGRect(x: 0, y: 0, width: 0, height: CGFloat.leastNormalMagnitude))
        
        // Setup pull to refresh - only for OrderViewModel (not CartViewModel)
        if viewModel is OrderViewModel {
            configPullToRefresh(tableview: previewTableView)
        }
        
        guard let customNavBar = customNavBar else { return }
        
        // Setup constraints
        previewTableView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(footerView.snp.top)
        }
        
        footerView.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view)
        }
        
        // Update actions to set button visibility and input field states
        updateActions()
    }
}

// MARK: - UITableViewDelegate, UITableViewDataSource
extension PreviewViewController: UITableViewDelegate, UITableViewDataSource {
    // Helper function to map section index to PreviewSection
    // This handles the case where depositInfo section may not be shown
    private func previewSection(for sectionIndex: Int) -> PreviewSection? {
        let hasDeposit = viewModel.shouldShowDepositInfo
        
        // Order: customerInfo → dates → products → depositInfo → notes → summary
        switch sectionIndex {
        case 0:
            return .customerInfo
        case 1:
            return .dates
        case 2:
            return .products
        case 3:
            return hasDeposit ? .depositInfo : .notes
        case 4:
            return hasDeposit ? .notes : .summary
        case 5:
            return hasDeposit ? .summary : nil
        default:
            return nil
        }
    }
    
    // Helper function to get section index from PreviewSection
    // This handles the case where depositInfo section may not be shown
    private func sectionIndex(for previewSection: PreviewSection) -> Int? {
        let hasDeposit = viewModel.shouldShowDepositInfo
        
        switch previewSection {
        case .customerInfo:
            return 0
        case .dates:
            return 1
        case .products:
            return 2
        case .depositInfo:
            return hasDeposit ? 3 : nil
        case .notes:
            return hasDeposit ? 4 : 3
        case .summary:
            return hasDeposit ? 5 : 4
        }
    }
    
    func numberOfSections(in tableView: UITableView) -> Int {
        // Customer (merged with outlet), dates, products, deposit (if rent), notes, summary
        var count = 5 // customer (merged), dates, products, notes, summary
        if viewModel.shouldShowDepositInfo {
            count += 1 // deposit section
        }
        return count
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        guard let previewSection = previewSection(for: section) else { return 0 }
        
        switch previewSection {
        case .customerInfo:
            return 3 // Name, Phone, Creator Name
        case .dates:
            return viewModel.orderType == .rent ? 5 : 3 // Create, Pickup, Return, Ready deliver, Deposit (if rent)
        case .products:
        return viewModel.itemsCount
        case .depositInfo:
            return viewModel.shouldShowDepositInfo ? 3 : 0 // Document, Security Deposit, Damage Fee
        case .notes:
            return 1 // Notes
        case .summary:
            return 3 // Subtotal, Discount, Grand Total (Deposit moved to dates section)
        }
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard let previewSection = previewSection(for: indexPath.section) else {
            return UITableViewCell()
        }
        
        switch previewSection {
        case .customerInfo:
            let cell = UITableViewCell(style: .value1, reuseIdentifier: "CustomerCell")
            var config = cell.defaultContentConfiguration()
            
            switch indexPath.row {
            case 0:
                config.text = "Name".localized()
                config.secondaryText = viewModel.customerName
                config.secondaryTextProperties.color = .black
                config.secondaryTextProperties.font = Utils.boldFont(size: 16)
                cell.selectionStyle = .none
            case 1:
                config.text = "Phone".localized()
                config.secondaryText = viewModel.customerPhone
                // Make phone number blue and tappable
                config.secondaryTextProperties.color = .systemBlue
                cell.selectionStyle = .default
            case 2:
                config.text = "Created By".localized()
                config.secondaryText = viewModel.staffName
                cell.selectionStyle = .none
            default:
                cell.selectionStyle = .none
                break
            }
            
            config.textProperties.font = Utils.regularFont(size: 16) // Title font: regular (same as AccountViewController)
            if indexPath.row != 0 && indexPath.row != 1 {
                config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14 (same as AccountViewController)
                config.secondaryTextProperties.color = .secondaryLabel // Value color: secondaryLabel (same as AccountViewController)
            }
            cell.contentConfiguration = config
            return cell
            
        case .dates:
            let cell = UITableViewCell(style: .value1, reuseIdentifier: "DateCell")
            var config = cell.defaultContentConfiguration()
            
            switch indexPath.row {
            case 0:
                config.text = "Create Date".localized()
                config.secondaryText = viewModel.createDate?.dateTimeInString() ?? "-"
                config.secondaryTextProperties.font = Utils.regularFont(size: 15) // Regular font for create date
                config.secondaryTextProperties.color = .actionSuccess
            case 1:
                config.text = "Pickup Date".localized()
                config.secondaryText = viewModel.pickupDate?.dateInString() ?? "-"
                config.secondaryTextProperties.font = Utils.mediumFont(size: 15) // Medium font to highlight pickup date
                config.secondaryTextProperties.color = .actionSuccess

            case 2:
                config.text = "Return Date".localized()
                config.secondaryText = viewModel.returnDate?.dateInString() ?? "-"
                config.secondaryTextProperties.font = Utils.mediumFont(size: 15) // Medium font to highlight return date
                config.secondaryTextProperties.color = .actionSuccess

            case 3:
                if viewModel.orderType == .rent {
                    config.text = "Ready Deliver".localized()
                    // Remove secondary text for ready deliver - we'll use checkbox instead
                    config.secondaryText = nil
                    
                    // Reuse existing checkbox or create new one
                    let checkbox: UIButton
                    if let existingCheckbox = cell.accessoryView as? UIButton {
                        checkbox = existingCheckbox
                    } else {
                        checkbox = UIButton(type: .custom)
                        let uncheckedImage = UIImage(systemName: "square")
                        let checkedImage = UIImage(systemName: "checkmark.square.fill")
                        checkbox.setImage(uncheckedImage, for: .normal)
                        checkbox.setImage(checkedImage, for: .selected)
                        checkbox.tintColor = APP_TONE_COLOR // Use tone color (blue) for checkbox
                        checkbox.frame = CGRect(x: 0, y: 0, width: 28, height: 28)
                        checkbox.contentMode = .scaleAspectFit
                        checkbox.imageView?.contentMode = .scaleAspectFit
                        checkbox.addTarget(self, action: #selector(readyDeliverTapped), for: .touchUpInside)
                        cell.accessoryView = checkbox
                    }
                    
                    // Update checkbox state
                    checkbox.isSelected = viewModel.isReadyToDeliver
                    
                    // Store reference for state updates (will be updated each time cell is configured)
                    self.readyDeliverCheckbox = checkbox
                } else {
                    // Clear accessory view if not rent order
                    cell.accessoryView = nil
                }
            case 4:
                // Deposit amount row (only for rent orders)
                config.text = "Deposit".localized()
                config.secondaryText = viewModel.depositAmount.formatStringInCommon()
                config.secondaryTextProperties.font = Utils.boldFont(size: 15)
                config.secondaryTextProperties.color = .systemOrange
                cell.accessoryView = nil
            default:
                break
            }
            
            config.textProperties.font = Utils.regularFont(size: 16) // Title font: regular (same as AccountViewController)
            if indexPath.row != 4 { // Don't override deposit row styling
                config.secondaryTextProperties.font = Utils.regularFont(size: 14)
                config.secondaryTextProperties.color = .secondaryLabel
            }
            cell.contentConfiguration = config
            return cell
            
        case .depositInfo:
            let cell = UITableViewCell(style: .value1, reuseIdentifier: "DepositCell")
            var config = cell.defaultContentConfiguration()
            
            switch indexPath.row {
            case 0:
                config.text = "Document".localized()
                let isEditable = viewModel.isMaterialTextFieldEnabled
                if viewModel.materialText.isEmpty {
                    config.secondaryText = isEditable ? "Tap to add".localized() : "-"
                } else {
                    config.secondaryText = viewModel.materialText
                }
                cell.accessoryType = isEditable ? .disclosureIndicator : .none
            case 1:
                config.text = "Security Deposit".localized()
                let isEditable = viewModel.isBailButtonEnabled
                let amount = viewModel.bailAmount
                if amount == 0 {
                    config.secondaryText = isEditable ? "Tap to edit".localized() : "0"
                } else {
                    config.secondaryText = amount.formatStringInCommon()
                }
                cell.accessoryType = isEditable ? .disclosureIndicator : .none
            case 2:
                config.text = "Damage Fee".localized()
                let isEditable = viewModel.isExtraChargeButtonEnabled
                let amount = viewModel.damageFee
                if amount == 0 {
                    config.secondaryText = isEditable ? "Tap to edit".localized() : "0"
                } else {
                    config.secondaryText = amount.formatStringInCommon()
                }
                cell.accessoryType = isEditable ? .disclosureIndicator : .none
            default:
                break
            }
            
            config.textProperties.font = Utils.regularFont(size: 16) // Title font: regular (same as AccountViewController)
            
            // Apply highlight based on row and editability
            switch indexPath.row {
            case 0: // Document
                if viewModel.isMaterialTextFieldEnabled {
                    config.secondaryTextProperties.color = APP_TONE_COLOR
                    config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14
                } else {
                    config.secondaryTextProperties.color = .secondaryLabel
                    config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14
                }
            case 1: // Security Deposit
                if viewModel.isBailButtonEnabled {
                    config.secondaryTextProperties.color = APP_TONE_COLOR
                    config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14
                } else {
                    config.secondaryTextProperties.color = .secondaryLabel
                    config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14
                }
            case 2: // Damage Fee
                if viewModel.isExtraChargeButtonEnabled {
                    config.secondaryTextProperties.color = APP_TONE_COLOR
                    config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14
                } else {
                    config.secondaryTextProperties.color = .secondaryLabel
                    config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14
                }
            default:
                config.secondaryTextProperties.color = .secondaryLabel
                config.secondaryTextProperties.font = Utils.regularFont(size: 14) // Value font: regular size 14
            }
            
            cell.contentConfiguration = config
            return cell
            
        case .notes:
            let cell = tableView.dequeueReusableCell(withIdentifier: PreviewNotesCell.reuseId, for: indexPath) as! PreviewNotesCell
            cell.delegate = self
            let noteText = viewModel.notes.isEmpty ? nil : viewModel.notes
            cell.bind(noteText: noteText, images: noteImages, imageURLs: noteImageURLs)
            return cell
            
        case .products:
            let cell = tableView.dequeueReusableCell(withIdentifier: "ProductPreviewCell", for: indexPath) as! ProductPreviewCell
            let item = viewModel.item(at: indexPath.row)
            
            if let cartItem = item as? CartItem {
                cell.bind(
                    cartItem: cartItem,
                    index: indexPath.row,
                    pickupDate: viewModel.pickupDate,
                    returnDate: viewModel.returnDate,
                    orderType: viewModel.orderType
                )
            } else if let orderItem = item as? OrderItem {
                cell.bind(
                    orderItem: orderItem,
                    index: indexPath.row,
                    pickupDate: viewModel.pickupDate,
                    returnDate: viewModel.returnDate,
                    orderType: viewModel.orderType
                )
            } else {
                // Fallback: create empty cart item to prevent crash
                let emptyCartItem = CartItem(
                    productId: 0,
                    productName: "",
                    barcode: nil,
                    quantity: 0,
                    price: 0,
                    deposit: 0,
                    note: nil,
                    imageUrl: nil,
                    originalRentPrice: 0,
                    originalSalePrice: 0
                )
                cell.bind(
                    cartItem: emptyCartItem,
                    index: indexPath.row,
                    pickupDate: viewModel.pickupDate,
                    returnDate: viewModel.returnDate,
                    orderType: viewModel.orderType
                )
            }
            return cell
            
        case .summary:
            let cell = UITableViewCell(style: .value1, reuseIdentifier: "SummaryCell")
            var config = cell.defaultContentConfiguration()
            
            // Build rows array (Deposit moved to dates section)
            var rows: [(title: String, value: String, isHighlighted: Bool)] = []
            rows.append(("Subtotal".localized(), viewModel.subtotal.formatStringInCommon(), false))
            rows.append(("Discount".localized(), viewModel.discountText, false))
            rows.append(("Grand Total".localized(), viewModel.totalAmount.formatStringInCommon(), false))
            
            // To Collect row is hidden
            // rows.append(("To Collect".localized(), viewModel.toCollectAmount.formatStringInCommon(), true))
            
            // Get row data
            if indexPath.row < rows.count {
                let row = rows[indexPath.row]
                config.text = row.title
                config.secondaryText = row.value
                
                // All summary values should be bold and highlighted
                config.textProperties.font = Utils.regularFont(size: 16) // Title font: regular
                
                // Check if this is deposit row and if it's editable
                let isDepositRow = viewModel.shouldShowDepositInfo && indexPath.row == 3
                let isDepositEditable = isDepositRow && viewModel.isDepositButtonEnabled
                
                // Check if deposit is manually overridden (for CartViewModel)
                var isDepositManual = false
                if isDepositRow {
                    if let cartViewModel = viewModel as? CartViewModel {
                        isDepositManual = cartViewModel.isDepositManuallyOverridden
                        if isDepositManual {
                            print("✅ Deposit is manually overridden: \(cartViewModel.depositAmount)")
                        }
                    }
                }
                
                if row.isHighlighted {
                    // Highlighted row (To Collect) - bold and success color
                    config.secondaryTextProperties.font = Utils.boldFont(size: 16) // Value font: bold
                    config.secondaryTextProperties.color = .actionSuccess // Success color for highlighted row
                    cell.accessoryType = .none
                } else if isDepositEditable {
                    // Deposit row (editable) - show disclosure indicator
                    config.secondaryTextProperties.font = Utils.boldFont(size: 16) // Value font: bold
                    // If deposit is manually overridden, show blue color to indicate it's been changed
                    if isDepositManual {
                        config.secondaryTextProperties.color = .actionPrimary // Blue color (#008AE8) when manually edited
                        print("🔵 Deposit is manually overridden - showing blue color")
                    } else {
                        config.secondaryTextProperties.color = .label // Default black color
                        print("⚫ Deposit is auto-calculated - showing default color")
                    }
                    cell.accessoryType = .disclosureIndicator
                } else {
                    // Other summary values - bold and primary color for emphasis
                    config.secondaryTextProperties.font = Utils.boldFont(size: 16) // Value font: bold
                    config.secondaryTextProperties.color = .label // Primary label color for emphasis
                    cell.accessoryType = .none
                }
            }
            
            cell.contentConfiguration = config
        return cell
        }
    }
    
    // MARK: - Section Headers (InsetGrouped Style)
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        guard let previewSection = previewSection(for: section) else { return nil }
        return previewSection.title
    }
    
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return UITableViewAutomaticDimension
    }
    
    func tableView(_ tableView: UITableView, estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat {
        return 44 // Standard cell height
    }
    
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        guard let previewSection = previewSection(for: indexPath.section) else { return }
        
        // Handle customer info section - Phone row tap to make call
        if previewSection == .customerInfo && indexPath.row == 1 {
            // Make phone call when phone number row is tapped
            if let orderViewModel = viewModel as? OrderViewModel {
                let phone = orderViewModel.currentOrder.customerPhone
                // Check if phone exists and is not empty
                if let phoneNumber = phone, !phoneNumber.isEmpty, phoneNumber != "N/A" {
                    let phoneNumberClean = phoneNumber.removeWhiteSpace()
                    let phoneURL = "tel://\(phoneNumberClean)"
                    if let url = URL(string: phoneURL), !url.absoluteString.isEmpty {
                        UIApplication.shared.open(url, options: [:], completionHandler: nil)
                    }
                }
            }
            return
        }
        
        // Handle dates section - Ready Deliver row tap
        if previewSection == .dates && indexPath.row == 3 && viewModel.orderType == .rent {
            // Trigger checkbox action when row is tapped
            if let checkbox = readyDeliverCheckbox {
                readyDeliverTapped(checkbox)
            }
            return
        }
        
        // Handle deposit info row taps
        if previewSection == .depositInfo {
            switch indexPath.row {
            case 0: // Document
                if viewModel.isMaterialTextFieldEnabled {
                    showDocumentInput()
                }
            case 1: // Security Deposit
                if viewModel.isBailButtonEnabled {
                    bailButtonTapped()
                }
            case 2: // Damage Fee
                if viewModel.isExtraChargeButtonEnabled {
                    extraChargeButtonTapped()
                }
            default:
                break
            }
        }
        
        // Handle notes row tap
        if previewSection == .notes {
            showNoteView()
        }
        
        // Handle summary section - Deposit row tap
        if previewSection == .summary {
            // Deposit row is at index 3 (if shouldShowDepositInfo is true)
            // Row indices: 0=Subtotal, 1=Discount, 2=Grand Total, 3=Deposit (if rent) - To Collect hidden
            let depositRowIndex = viewModel.shouldShowDepositInfo ? 3 : -1
            if indexPath.row == depositRowIndex && viewModel.isDepositButtonEnabled {
                depositButtonTapped()
            }
        }
    }
    
    private func showDocumentInput() {
        let alert = UIAlertController(title: "Document".localized(), message: "Enter ID card, driver's license...".localized(), preferredStyle: .alert)
        
        alert.addTextField { textField in
            textField.text = self.viewModel.materialText
            textField.placeholder = "Enter document info...".localized()
            textField.clearButtonMode = .whileEditing
        }
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Save".localized(), style: .default) { [weak self] _ in
            guard let textField = alert.textFields?.first else { return }
            // Allow empty string to clear the collateral details
            let text = textField.text ?? ""
            self?.viewModel.updateMaterial(text)
            self?.updateSummaryValues()
            
            // Reload deposit section to update display
            if let depositSection = self?.sectionIndex(for: .depositInfo) {
                self?.previewTableView.reloadSections(IndexSet(integer: depositSection), with: .none)
            }
            
            // Use specific update method for collateral details
            if let orderViewModel = self?.viewModel as? OrderViewModel {
                self?.triggerSpecificOrderUpdate {
                    orderViewModel.updateCollateralDetails(text) { [weak self] result in
                        DispatchQueue.main.async {
                            switch result {
                                case .success:
                                    // Clear cart when order is updated successfully
                                    CartStore.shared.resetCart()
                                    ProductAvailabilityCache.shared.clearAll()
                                    
                                    // Update UI with response data (order already updated in viewModel)
                                    self?.updateUI()
                                    // Notify delegate and ViewModel with updated order
                                    let updatedOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(updatedOrder)
                            case .failure(let error):
                                UIAlertController.errorAlert(parent: self, error: error)
                            }
                        }
                    }
                }
            }
        })
        
        present(alert, animated: true)
    }
}

// Add NumberPickerViewControllerDelegate
extension PreviewViewController: NumberPickerViewControllerDelegate {
    func didSelectNumber(_ value: Double, sender: NumberPickerViewController) {
        switch sender.tag {
        case 1: // Bail amount
            viewModel.updateBailAmount(value)
            updateSummaryValues()
            
            // Use specific update method for security deposit
            if let orderViewModel = viewModel as? OrderViewModel {
                triggerSpecificOrderUpdate {
                    orderViewModel.updateSecurityDeposit(value) { [weak self] result in
                        DispatchQueue.main.async {
                            switch result {
                            case .success:
                                // Clear cart when order is updated successfully
                                CartStore.shared.resetCart()
                                ProductAvailabilityCache.shared.clearAll()
                                
                                // Update UI with response data (order already updated in viewModel)
                                self?.updateUI()
                                // Notify delegate and ViewModel with updated order
                                if let orderViewModel = self?.viewModel as? OrderViewModel {
                                    let updatedOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(updatedOrder)
                                }
                            case .failure(let error):
                                UIAlertController.errorAlert(parent: self, error: error)
                            }
                        }
                    }
                }
            }
            
        case 2: // Extra charge/Damage fee
            viewModel.updateDamageFee(value)
            updateSummaryValues()
            
            // Use specific update method for damage fee
            if let orderViewModel = viewModel as? OrderViewModel {
                triggerSpecificOrderUpdate {
                    orderViewModel.updateDamageFee(value) { [weak self] result in
                        DispatchQueue.main.async {
                            switch result {
                            case .success:
                                // Clear cart when order is updated successfully
                                CartStore.shared.resetCart()
                                ProductAvailabilityCache.shared.clearAll()
                                
                                // Update UI with response data (order already updated in viewModel)
                                self?.updateUI()
                                // Notify delegate and ViewModel with updated order
                                if let orderViewModel = self?.viewModel as? OrderViewModel {
                                    let updatedOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(updatedOrder)
                                }
                            case .failure(let error):
                                UIAlertController.errorAlert(parent: self, error: error)
                            }
                        }
                    }
                }
            }
            
        case 3: // Deposit amount
            print("📝 Updating deposit amount to: \(value)")
            viewModel.updateDepositAmount(value)
            
            // Check if it's CartViewModel and verify manual override
            if let cartViewModel = viewModel as? CartViewModel {
                print("🔍 isDepositManuallyOverridden: \(cartViewModel.isDepositManuallyOverridden)")
            }
            
            // Force reload summary section to update display with blue color when manually changed
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                if let summarySection = self.sectionIndex(for: .summary) {
                    print("🔄 Reloading summary section: \(summarySection)")
                    self.previewTableView.reloadSections(IndexSet(integer: summarySection), with: .none)
                }
            }
            
        default:
            break
        }
    }
}
extension PreviewViewController{
    // Helper method to create summary row
    private func createSummaryRow(title: String, value: String = "0", isHighlighted: Bool = false) -> UIView {
        let container = UIView()
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        // Create horizontal stack view with different distribution
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.alignment = .center
        stackView.distribution = .fill
        stackView.spacing = isIPad ? 8 : 5 // Increased spacing for iPad
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = isHighlighted ? 
            .bodyBold(size: isIPad ? 18 : 14) :
            .bodyMedium(size: isIPad ? 18 : 14)
        titleLabel.textColor = .textPrimary
        titleLabel.textAlignment = .right
        
        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = isHighlighted ?
            .bodyBold(size: isIPad ? 18 : 14) :
            .bodyMedium(size: isIPad ? 18 : 14)
        valueLabel.textColor = isHighlighted ? .actionPrimary : .textPrimary
        valueLabel.textAlignment = .right
        valueLabel.minimumScaleFactor = 0.5
        valueLabel.adjustsFontSizeToFitWidth = true
        // Set content hugging and compression resistance priorities
        titleLabel.setContentHuggingPriority(.defaultLow, for: .horizontal)
        valueLabel.setContentHuggingPriority(.defaultHigh, for: .horizontal)
        valueLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        
        stackView.addArrangedSubview(titleLabel)
        stackView.addArrangedSubview(valueLabel)
        
        container.addSubview(stackView)
        
        stackView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(isIPad ? 24 : 16)
            make.trailing.equalToSuperview().offset(isIPad ? -24 : -16)
            make.top.bottom.equalToSuperview()
        }
        
        // Set a fixed width for the value label to ensure consistent alignment
        valueLabel.snp.makeConstraints { make in
            make.width.equalTo(isIPad ? 160 : 90)
        }
        
        return container
    }
    
    // Add method to update summary values
    private func updateSummaryValues() {
        // Disabled: Summary is now in table view sections, reload table view instead
        if let summarySection = sectionIndex(for: .summary) {
            previewTableView.reloadSections(IndexSet(integer: summarySection), with: .none)
        }
    }
    
    
    private func updateSummaryUI(subtotal: Double, discountText: String, grandTotal: Double, downPayment: Double, toCollect: Double) {
        // Disabled: Summary UI is now in table view sections
        // This method is kept for compatibility but does nothing
    }
    
    // Setup footer view
    private func setupFooterView() {
        // Add separator at the top of footer
        let separatorView = UIView()
        separatorView.backgroundColor = .backgroundTertiary
        footerView.addSubview(separatorView)
        
        // Create a horizontal stack view for buttons only
        let buttonStackView = UIStackView(arrangedSubviews: [saveButton, cancelButton, printButton, updateButton, deleteButton])
        buttonStackView.axis = .horizontal
        buttonStackView.alignment = .fill
        buttonStackView.distribution = .fillEqually
        buttonStackView.spacing = 16
        footerView.addSubview(buttonStackView)
        
        // Layout constraints for subviews within footerView
        separatorView.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(1)
        }
        
        buttonStackView.snp.makeConstraints { make in
            make.top.equalTo(separatorView.snp.bottom).offset(16)
            make.leading.trailing.equalToSuperview().inset(20)
            make.height.equalTo(44)
            make.bottom.equalToSuperview().offset(-20)
        }
    }
}

// MARK: - PaymentCollectionViewControllerDelegate
extension PreviewViewController: PaymentCollectionViewControllerDelegate {
    func didConfirmPayment(sender: PaymentCollectionViewController) {
        // After confirming payment, proceed with saving the order
        proceedWithSave()
    }
    
    func didCancelPayment(sender: PaymentCollectionViewController) {
        // User cancelled payment, do nothing
    }
}

// Add NoteViewControllerDelegate
extension PreviewViewController: NoteViewControllerDelegate {
    func didSave(note: String, images: [UIImage], imageURLs: [String?], sender: NoteViewController) {
        // Update UI
        noteTextView.text = note
        noteImages = images

        viewModel.updateNotes(note)

        if let orderViewModel = viewModel as? OrderViewModel {
            // API: delete/set list via JSON, add new files via FormData; both = 2 requests (see API_ORDER_NOTES_IMAGES.md)
            let keptURLs = imageURLs.compactMap { $0 }
            let newImageData = images.enumerated().compactMap { index, img -> Data? in
                guard index < imageURLs.count, imageURLs[index] == nil else { return nil }
                return UIImageJPEGRepresentation(img, 0.8)
            }
            // When editing: send kept URLs (JSON) and/or new files (FormData) per API_ORDER_NOTES_IMAGES.md
            let keptNoteImageURLs: [String]? = keptURLs

            showProgressText(text: "Updating...".localized())
            orderViewModel.updateNotes(note, keptNoteImageURLs: keptNoteImageURLs, newNoteImageData: newImageData.isEmpty ? nil : newImageData) { [weak self] result in
                DispatchQueue.main.async {
                    self?.hideProgress()
                    switch result {
                    case .success:
                        CartStore.shared.resetCart()
                        ProductAvailabilityCache.shared.clearAll()
                        self?.updateUI()
                        let updatedOrder = orderViewModel.currentOrder
                        self?.notifyOrderUpdate(updatedOrder)
                    case .failure(let error):
                        UIAlertController.errorAlert(parent: self, error: error)
                    }
                }
            }
        }
    }
}

// NOTE: PlaceholderTextView is now defined in PreviewCardCells.swift
// This class was moved to avoid code duplication

// MARK: - UITextFieldDelegate
extension PreviewViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        
        // Update the material property if it's the material text field
        // Allow empty string to clear the collateral details
        if textField == materialTextField {
            let material = textField.text ?? ""
            viewModel.updateMaterial(material)
            updateSummaryValues()
            
            // Use specific update method for collateral details
            if let orderViewModel = viewModel as? OrderViewModel {
                triggerSpecificOrderUpdate {
                    orderViewModel.updateCollateralDetails(material) { [weak self] result in
                        DispatchQueue.main.async {
                            switch result {
                            case .success:
                                // Clear cart when order is updated successfully
                                CartStore.shared.resetCart()
                                ProductAvailabilityCache.shared.clearAll()
                                
                                // Update UI with response data (order already updated in viewModel)
                                self?.updateUI()
                                // Notify delegate and ViewModel with updated order
                                if let orderViewModel = self?.viewModel as? OrderViewModel {
                                    let updatedOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(updatedOrder)
                                }
                            case .failure(let error):
                                UIAlertController.errorAlert(parent: self, error: error)
                            }
                        }
                    }
                }
            }
        }
        
        return true
    }
    
    func textFieldDidEndEditing(_ textField: UITextField) {
        // Update the material property if it's the material text field
        // Allow empty string to clear the collateral details
        if textField == materialTextField {
            let material = textField.text ?? ""
            viewModel.updateMaterial(material)
            updateSummaryValues()
            
            // Use specific update method for collateral details
            if let orderViewModel = viewModel as? OrderViewModel {
                triggerSpecificOrderUpdate {
                    orderViewModel.updateCollateralDetails(material) { [weak self] result in
                        DispatchQueue.main.async {
                            switch result {
                            case .success:
                                // Clear cart when order is updated successfully
                                CartStore.shared.resetCart()
                                ProductAvailabilityCache.shared.clearAll()
                                
                                // Update UI with response data (order already updated in viewModel)
                                self?.updateUI()
                                // Notify delegate and ViewModel with updated order
                                if let orderViewModel = self?.viewModel as? OrderViewModel {
                                    let updatedOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(updatedOrder)
                                }
                            case .failure(let error):
                                UIAlertController.errorAlert(parent: self, error: error)
                            }
                        }
                    }
                }
            }
        }
    }
    
    private func triggerOrderUpdate() {
        // Show subtle progress indicator
        self.showProgressText(text: "Updating...".localized())
        
        viewModel.updateOrder { [weak self] result in
            DispatchQueue.main.async {
                self?.hideProgress()
                
                switch result {
                case .success:
                    // Clear cart when order is updated successfully
                    CartStore.shared.resetCart()
                    ProductAvailabilityCache.shared.clearAll()
                    
                    // Reload order detail after update and notify delegate
                    if let orderViewModel = self?.viewModel as? OrderViewModel {
                        orderViewModel.reloadOrderDetail { [weak self] reloadResult in
                            DispatchQueue.main.async {
                                switch reloadResult {
                                case .success(let updatedOrder):
                                    self?.updateUI()
                                    // Notify delegate and ViewModel with updated order
                                    self?.notifyOrderUpdate(updatedOrder)
                                case .failure:
                                    // Even if reload fails, notify delegate and ViewModel with current order
                                    let currentOrder = orderViewModel.currentOrder
                                    self?.notifyOrderUpdate(currentOrder)
                                }
                            }
                        }
                    }
                case .failure(let error):
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }
    
    private func triggerSpecificOrderUpdate(updateAction: @escaping () -> Void) {
        // Show subtle progress indicator
        self.showProgressText(text: "Updating...".localized())
        
        // Execute the specific update action
        updateAction()
        
        // Hide progress after a short delay (since specific updates handle their own completion)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.hideProgress()
        }
    }
}

// MARK: - PreviewNotesCellDelegate (tap note image to preview)
extension PreviewViewController: PreviewNotesCellDelegate {
    func previewNotesCell(_ cell: PreviewNotesCell, didTapImage image: UIImage?, imageURL: String?) {
        if let urlString = imageURL, !urlString.isEmpty {
            let vc = ImageProductViewController.instance(imageUrl: urlString)
            present(vc, animated: true)
            return
        }
        if let image = image {
            present(FullScreenNoteImagePreviewViewController(image: image), animated: true)
        }
    }
}

private final class FullScreenNoteImagePreviewViewController: UIViewController {
    private let image: UIImage

    init(image: UIImage) {
        self.image = image
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let imageView = UIImageView(image: image)
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false

        let closeButton = UIButton(type: .system)
        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = .white
        closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.35)
        closeButton.layer.cornerRadius = 22
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(closeTapped)))
        view.addSubview(imageView)
        view.addSubview(closeButton)

        NSLayoutConstraint.activate([
            imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            imageView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            imageView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),
            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeButton.widthAnchor.constraint(equalToConstant: 44),
            closeButton.heightAnchor.constraint(equalToConstant: 44)
        ])
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }
}
