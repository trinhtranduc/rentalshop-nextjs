import Foundation
import UIKit
import GestureRecognizerClosures
import SnapKit

// Import enums and models
// OrderType and DiscountType are defined in Cart.swift

class InfoMainViewController: BaseViewControler {
    /// "Select customer" bar — short; card state is slightly taller (avatar + labels).
    private static let customerSelectRowHeight: CGFloat = 58
    private static let customerCardRowHeight: CGFloat = 76

    // MARK: - Properties
    // Debounce manager for batch availability API calls
    private lazy var availabilityDebouncer = DebounceManager(delay: 0.5) // 500ms debounce
    
    // MARK: - UI Components
    private lazy var selectedProductTableView: UITableView = {
        let table = UITableView()
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = UIColor.systemGray6.withAlphaComponent(0.3)
        table.separatorStyle = .none
        table.contentInset = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
        table.register(ProductSelectedCell.self, forCellReuseIdentifier: "ProductSelectedCell")
        table.tableHeaderView = UIView()
        table.tableFooterView = UIView()
        // Add spacing between cells
        table.sectionHeaderHeight = 0
        table.sectionFooterHeight = 0
        table.estimatedRowHeight = 160
        table.rowHeight = UITableViewAutomaticDimension
        table.layoutMargins = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        table.translatesAutoresizingMaskIntoConstraints = false
        return table
    }()
    
    private lazy var customerInfoView: InfoCustomerView = {
        let view = InfoCustomerView()
        view.delegate = self
        view.isHidden = true
        view.backgroundColor = UIColor(hexString: "EDF4F4")
        view.layer.cornerRadius = 8
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private lazy var customerInputView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemBackground
        view.layer.cornerRadius = 8
        view.layer.borderWidth = 0
        view.layer.shadowColor = UIColor.black.cgColor
        view.layer.shadowOpacity = 0.04
        view.layer.shadowRadius = 6
        view.layer.shadowOffset = CGSize(width: 0, height: 2)
        view.translatesAutoresizingMaskIntoConstraints = false
        return view
    }()
    
    private lazy var customerSelectButton: UIButton = {
        let button = UIButton(type: .system)
        var config = UIButton.Configuration.plain()
        config.contentInsets = NSDirectionalEdgeInsets(
            top: 7,
            leading: 12,
            bottom: 7,
            trailing: 52
        )
        config.imagePlacement = .leading
        config.imagePadding = 12
        config.titleAlignment = .leading
        button.configuration = config
        button.contentHorizontalAlignment = .leading
        button.titleLabel?.adjustsFontForContentSizeCategory = true
        button.translatesAutoresizingMaskIntoConstraints = false
        button.accessibilityLabel = "Select customer".localized()
        button.addTarget(self, action: #selector(customerSelectTapped), for: .touchUpInside)
        button.addTarget(self, action: #selector(customerSelectTouchDown), for: .touchDown)
        button.addTarget(self, action: #selector(customerSelectTouchUp), for: [.touchUpOutside, .touchCancel, .touchDragExit, .touchUpInside])
        return button
    }()
    
    private lazy var dateStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 0
        stack.backgroundColor = .white
        stack.translatesAutoresizingMaskIntoConstraints = false
        
        // Create and add views
        let pickupDateView = createDateView(title: "Pickup date".localized(), action: #selector(getDateTapped))
        let returnDateView = createDateView(title: "Return date".localized(), action: #selector(returnDateTapped))
        let downPaymentView = createPaymentView(title: "Deposit".localized(), value: "0")
        let discountView = createPaymentView(title: "Discount".localized(), value: "0")
        
        // Store references
        self.pickupDateView = pickupDateView
        self.returnDateView = returnDateView
        self.downPaymentView = downPaymentView
        self.discountView = discountView
        
        // Add views to stack
        stack.addArrangedSubview(pickupDateView)
        stack.addArrangedSubview(returnDateView)
        stack.addArrangedSubview(downPaymentView)
        stack.addArrangedSubview(discountView)
        
        return stack
    }()
    
    private lazy var totalLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .white
        label.textAlignment = .right
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private lazy var previewContainer: UIButton = {
        let button = UIButton(type: .custom)
        button.backgroundColor = .systemGreen
        button.layer.cornerRadius = 5
        button.clipsToBounds = true
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(previewTapped), for: .touchUpInside)
        button.addTarget(self, action: #selector(previewTouchDown), for: .touchDown)
        button.addTarget(self, action: #selector(previewTouchUp), for: [.touchUpInside, .touchUpOutside, .touchCancel, .touchDragExit])
        button.isAccessibilityElement = true
        button.accessibilityLabel = "Preview".localized()
        button.accessibilityTraits = UIAccessibilityTraitButton
        return button
    }()
    
    private lazy var previewStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [
            previewTitleLabel,
            rightStackView
        ])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.distribution = .equalSpacing
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.isUserInteractionEnabled = false
        return stack
    }()
    
    private lazy var rightStackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [
            previewCountLabel,
            totalLabel
        ])
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.isUserInteractionEnabled = false
        return stack
    }()
    
    private lazy var previewTitleLabel: UILabel = {
        let label = UILabel()
        label.text = "Preview".localized().uppercased()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .white
        label.isUserInteractionEnabled = false
        return label
    }()
    
    // Add subtitle label for count
    private lazy var previewCountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 16)
        label.textColor = .white
        label.textAlignment = .right
        label.translatesAutoresizingMaskIntoConstraints = false
        label.isUserInteractionEnabled = false
        return label
    }()
    
    // Add segmented control for header
    private lazy var methodSegmentControl: UISegmentedControl = {
        // Create segmented control with text items
        let items = ["Rent Order".localized().uppercased(), "Sale Order".localized().uppercased()]
        let control = UISegmentedControl(items: items)
        
        // Set initial selection
        control.selectedSegmentIndex = 0
        
        // Customize appearance
        control.backgroundColor = .clear
        control.selectedSegmentTintColor = .white
        
        // Set text attributes for different states
        let selectedAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: APP_TONE_NAV_BLACK_COLOR,
            .font: Utils.boldFont(size: UIDevice.current.userInterfaceIdiom == .pad ? 16 : 13)
        ]
        
        let normalAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.secondaryLabel,
            .font: Utils.boldFont(size: UIDevice.current.userInterfaceIdiom == .pad ? 16 : 13)
        ]
        
        control.setTitleTextAttributes(selectedAttributes, for: .selected)
        control.setTitleTextAttributes(normalAttributes, for: .normal)
        
        // Set height based on device
        if UIDevice.current.userInterfaceIdiom == .pad {
            control.heightAnchor.constraint(equalToConstant: 44).isActive = true
        }
        
        // Set width
        control.widthAnchor.constraint(equalToConstant: 200).isActive = true
        
        control.addTarget(self, action: #selector(methodChanged(_:)), for: .valueChanged)
        return control
    }()

    /// Holds overlaid customer card + "Select customer"; height toggles so hidden views do not force a tall bar.
    private lazy var customerHeaderContainer: UIView = {
        let v = UIView()
        v.backgroundColor = .clear
        v.addSubview(customerInfoView)
        v.addSubview(customerInputView)
        customerInfoView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        customerInputView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        v.snp.makeConstraints { make in
            make.height.equalTo(InfoMainViewController.customerSelectRowHeight)
        }
        return v
    }()
    
    private lazy var headerView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        
        // Create a stack view to manage all header content
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 10
        stackView.distribution = .fill
        view.addSubview(stackView)
        
        // Add segment control first only for iPad
        if UIDevice.current.userInterfaceIdiom == .pad {
            stackView.addArrangedSubview(methodSegmentControl)
        }

        stackView.addArrangedSubview(customerHeaderContainer)
        
        // Set up constraints for the stack view
        stackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(8)
            make.leading.equalToSuperview().offset(8)
            make.trailing.equalToSuperview().offset(-8)
            make.bottom.equalToSuperview().offset(-8)
        }
        
        return view
    }()

    // MARK: - Properties
    /// Set to true only right before a user-driven rent/sale switch so the
    /// fields animate. Programmatic sets (reloadOrder on appear, reset, initial
    /// setup) leave it false so entering the cart applies state without animating.
    private var animateNextMethodChange = false
    private var methodSelect: OrderType = .rent {
        didSet {
            updateMethodSelection(animated: animateNextMethodChange)
            animateNextMethodChange = false
        }
    }
    
    private var getDate: Date? {
        didSet {
            // Set pickup date to start of day (00:00:00)
            CartStore.shared.setPickupDate(getDate?.startOfDay())
            updateGetDateLabel()
        }
    }
    
    private var returnDate: Date? {
        didSet {
            CartStore.shared.setReturnDate(returnDate?.endOfDay())
            updateReturnDateLabel()
        }
    }
    
    private var customer: Customer? {
        didSet {
            CartStore.shared.setCustomer(customer)
            updateCustomerViews()
        }
    }

    private var customerSelectionShowsError = false
    
    // Additional Properties
    private var discountType: DiscountPadType = .percentage {
        didSet {
            // Update cart's discount type when view type changes
            CartStore.shared.setDiscountType(discountType == .percentage ? .percentage : .amount)
            updateDiscountLabel()
        }
    }
    
    private var discountAmount: Double = 0 {
        didSet {
            CartStore.shared.setDiscount(discountAmount)
            updateDiscountLabel()
        }
    }
    
    private var deposit_amount: Double = 0 {
        didSet {
            // Deposit is calculated from cart items, not stored separately
            updateDepositLabel()
        }
    }
    
    // Add properties for labels
    private lazy var pickupDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .black
        label.textAlignment = .right
        return label
    }()
    
    private lazy var returnDateLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .black
        label.textAlignment = .right
        return label
    }()
    
    private lazy var downPaymentLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .black
        label.textAlignment = .right
        return label
    }()
    
    private lazy var discountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        label.textColor = .black
        label.textAlignment = .right
        return label
    }()
    
    // Add constraint properties to animate
    private var tableViewBottomToDateStack: NSLayoutConstraint?
    private var tableViewBottomToPreview: NSLayoutConstraint?
    
    private var pickupDateView: UIView?
    private var returnDateView: UIView?
    private var downPaymentView: UIView?
    private var discountView: UIView?
    private var pickupDateHeightConstraint: Constraint?
    private var returnDateHeightConstraint: Constraint?
    private var downPaymentHeightConstraint: Constraint?
    private weak var currentSuggestionTextField: SuggestionTextField?
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Setup navigation bar first
        setupNavigationBar()
        
        // Do any additional setup after loading the view.
        setupUI()
        
        // Setup Gesture
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        view.addGestureRecognizer(tapGesture)
        
        updateCartBadge() // Update cart badge when view is loaded
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
        
        // On iPad, hide custom navigation bar since it's in split view
        if UIDevice.current.userInterfaceIdiom == .pad {
            customNavBar?.isHidden = true
        }
        
        // Hide tab bar when pushed
        if let tabBar = self.tabBarController?.tabBar {
            tabBar.isHidden = true
        }
        
        reloadOrder()
        updateSegmentedControlState() // Update segmented control state when view appears
        updateCartBadge() // Update cart badge when view appears
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        reloadSelectionTable()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Show tab bar when leaving
        if let tabBar = self.tabBarController?.tabBar {
            tabBar.isHidden = false
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        layoutCartTableHeaderView()
    }
    
    // MARK: - Setup
    override func setupUI() {
        // Set basic view properties
        view.backgroundColor = .backgroundPrimary
        title = "Cart".localized()
        updateCustomerSelectButton()
        
        // Setup subviews first (add to view hierarchy)
        setupSubviews()
        
        // Setup constraints after all views are added
        setupConstraints()
        
        // Configure table header view (height from fitting — avoid oversized fixed frame)
        selectedProductTableView.tableHeaderView = headerView
        layoutCartTableHeaderView()
        
        // Initialize dateStackView state based on current method
        if methodSelect == .sale {
            dateStackView.alpha = 0
            dateStackView.isHidden = true
        } else {
            dateStackView.alpha = 1
            dateStackView.isHidden = false
        }
        
        // Update method selection to set initial state
        updateMethodSelection()
        
        // Add tap gesture to dismiss keyboard
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false
        view.addGestureRecognizer(tapGesture)
    }
    
    private func setupSubviews() {
        // Add subviews to the view hierarchy
        [selectedProductTableView, dateStackView].forEach {
            view.addSubview($0)
        }
        
        customerInputView.addSubview(customerSelectButton)
        
        // Add previewStackView to dateStackView instead of previewContainer
        // Wrap previewStackView in previewContainer to keep background and tap gesture
        previewContainer.addSubview(previewStackView)
        dateStackView.addArrangedSubview(previewContainer)
    }
    
    private func setupConstraints() {
        // Setup constraints for customerSelectButton
        customerSelectButton.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Setup constraints for previewStackView with 16px leading and trailing padding
        previewStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 16))
        }
        
        // Setup constraints for previewContainer
        // Setup constraints for previewContainer (now inside dateStackView)
        previewContainer.snp.makeConstraints { make in
            make.height.equalTo(50)
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
        }
        
        // Setup constraints for dateStackView
        dateStackView.snp.makeConstraints { make in
            make.bottom.equalTo(view.safeAreaLayoutGuide)
            make.leading.equalToSuperview()
            make.trailing.equalToSuperview()
        }
        
        // Setup constraints for selectedProductTableView based on current mode
        if UIDevice.current.userInterfaceIdiom == .phone {
            // On iPhone, use navigation bar
            guard let customNavBar = customNavBar else { return }
        selectedProductTableView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(dateStackView.snp.top).offset(-16)
            }
        } else {
            // On iPad, container view already starts from below navigation bar
            // Table view starts from top of its view
            selectedProductTableView.snp.makeConstraints { make in
                make.top.equalTo(view.safeAreaLayoutGuide)
                make.leading.trailing.equalToSuperview()
                make.bottom.equalTo(dateStackView.snp.top).offset(-16)
            }
        }
        
    }
    
    // MARK: - Helper Methods
    private func updateMethodSelection(animated: Bool = false) {
        // Store current discount values before mode change
        let currentDiscount = CartStore.shared.cart.discount
        let currentDiscountType = CartStore.shared.cart.discountType

        let shouldShowRentalFields = methodSelect == .rent

        if shouldShowRentalFields {
            pickupDateView?.isHidden = false
            returnDateView?.isHidden = false
            downPaymentView?.isHidden = false
        }

        pickupDateHeightConstraint?.update(offset: shouldShowRentalFields ? 44 : 0)
        returnDateHeightConstraint?.update(offset: shouldShowRentalFields ? 44 : 0)
        downPaymentHeightConstraint?.update(offset: shouldShowRentalFields ? 44 : 0)

        let applyLayout = {
            self.pickupDateView?.alpha = shouldShowRentalFields ? 1 : 0
            self.returnDateView?.alpha = shouldShowRentalFields ? 1 : 0
            self.downPaymentView?.alpha = shouldShowRentalFields ? 1 : 0
            self.view.layoutIfNeeded()
        }

        let finalize: (Bool) -> Void = { _ in
            self.pickupDateView?.isHidden = !shouldShowRentalFields
            self.returnDateView?.isHidden = !shouldShowRentalFields
            self.downPaymentView?.isHidden = !shouldShowRentalFields

            if !shouldShowRentalFields {
                CartStore.shared.setDiscount(currentDiscount)
                CartStore.shared.setDiscountType(currentDiscountType)
                self.discountType = currentDiscountType == .percentage ? .percentage : .amount
                self.discountAmount = currentDiscount
            } else {
                if self.getDate == nil {
                    self.getDate = CartStore.shared.cart.pickupPlanAt
                }
                if self.returnDate == nil {
                    self.returnDate = CartStore.shared.cart.returnPlanAt
                }
            }
            
            CartStore.shared.setOrderType(self.methodSelect == .rent ? .rent : .sale)
            self.updateCartPricesForOrderType()
            self.reloadSelectionTable()
            self.updatePreviewTotal()
        }

        // Animate only on a user-driven switch; entering the cart applies the
        // final state instantly so the UI stays put (no fade/reflow flicker).
        if animated {
            UIView.animate(withDuration: 0.28, delay: 0, options: [.curveEaseInOut, .beginFromCurrentState], animations: applyLayout, completion: finalize)
        } else {
            applyLayout()
            finalize(true)
        }
    }

    /// Update prices for all cart items based on current order type (rent/sale)
    /// Uses custom price if user has manually changed it, otherwise uses original price
    private func updateCartPricesForOrderType() {
        CartStore.shared.syncPricesWithOrderType()

        for cartItem in CartStore.shared.cart.items {
            let newPrice = cartItem.price
            print("✅ Updated price for product \(cartItem.productId) (\(cartItem.productName ?? "Unknown")): \(newPrice) (orderType: \(methodSelect == .rent ? "rent" : "sale"), custom: \(methodSelect == .rent ? (cartItem.customRentPrice != nil) : (cartItem.customSalePrice != nil)))")
        }
    }

    private func markAvailabilityStatusAsLoadingForAllItems() {
        let uniqueProductIds = Set(CartStore.shared.cart.items.map(\.productId))
        for productId in uniqueProductIds {
            CartStore.shared.updateAvailabilityStatus(for: productId, status: nil)
        }
    }
    
    private func updateCustomerViews() {
        if customer != nil {
            customerSelectionShowsError = false
        }
        customerHeaderContainer.snp.updateConstraints { make in
            make.height.equalTo(customer != nil ? Self.customerCardRowHeight : Self.customerSelectRowHeight)
        }
        if let customer = customer {
            // Show customer info view and hide input view
            customerInfoView.isHidden = false
            customerInputView.isHidden = true
            customerInfoView.bind(customer: customer)
            // Setup menu for more button
            let menu = createCustomerMenu()
            customerInfoView.setupMoreButtonMenu(menu: menu)
        } else {
            // Show input view and hide info view
            customerInfoView.isHidden = true
            customerInputView.isHidden = false
            updateCustomerSelectButton()
        }
        layoutCartTableHeaderView()
    }

    /// `UITableView.tableHeaderView` does not size from constraints alone; fit height from Auto Layout.
    private func layoutCartTableHeaderView() {
        guard let header = selectedProductTableView.tableHeaderView else { return }
        let width = max(selectedProductTableView.bounds.width, view.bounds.width)
        guard width > 0 else { return }
        header.layoutIfNeeded()
        let target = CGSize(width: width, height: 0)
        let h = header.systemLayoutSizeFitting(
            target,
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel
        ).height
        let newHeight = max(h, 1)
        if abs(header.frame.size.width - width) < 0.5 && abs(header.frame.size.height - newHeight) < 0.5 {
            return
        }
        var frame = header.frame
        frame.size.width = width
        frame.size.height = newHeight
        header.frame = frame
        selectedProductTableView.tableHeaderView = header
    }

    private func updateCustomerSelectButton() {
        var config = customerSelectButton.configuration ?? UIButton.Configuration.plain()

        config.title = "Customer".localized()
        config.subtitle = "Select customer".localized()
        let avatarConfiguration = UIImage.SymbolConfiguration(
            pointSize: 28,
            weight: .regular
        ).applying(
            UIImage.SymbolConfiguration(
                paletteColors: [.systemGray3, .systemGray6]
            )
        )
        config.image = UIImage(
            systemName: "person.crop.circle.fill",
            withConfiguration: avatarConfiguration
        )
        config.preferredSymbolConfigurationForImage = avatarConfiguration
        config.baseForegroundColor = .secondaryLabel
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.regularFont(size: 11)
            outgoing.foregroundColor = UIColor.textPrimary
            return outgoing
        }
        config.subtitleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.mediumFont(size: 15)
            outgoing.foregroundColor = UIColor.textPrimary
            return outgoing
        }

        let chevronImage = UIImage(systemName: "chevron.right")?.withRenderingMode(.alwaysTemplate)
        let accessoryImageView = UIImageView(image: chevronImage)
        accessoryImageView.contentMode = .scaleAspectFit
        let accessoryView = UIView()
        accessoryView.backgroundColor = .tertiarySystemFill
        accessoryView.layer.cornerRadius = 14
        accessoryView.isUserInteractionEnabled = false
        accessoryView.addSubview(accessoryImageView)

        customerSelectButton.configuration = config
        customerSelectButton.subviews.filter { $0.tag == 999 }.forEach { $0.removeFromSuperview() }
        accessoryView.tag = 999
        customerSelectButton.addSubview(accessoryView)
        accessoryView.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview().offset(-12)
            make.width.height.equalTo(28)
        }
        accessoryImageView.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.width.equalTo(7)
            make.height.equalTo(12)
        }
        applyCustomerSelectionStyle(
            accessoryView: accessoryView,
            accessoryImageView: accessoryImageView
        )
    }

    private func setCustomerSelectionError(_ showsError: Bool) {
        customerSelectionShowsError = showsError
        updateCustomerSelectButton()
    }

    private func applyCustomerSelectionStyle(
        accessoryView: UIView,
        accessoryImageView: UIImageView
    ) {
        customerInputView.backgroundColor = .systemBackground
        customerInputView.layer.borderWidth = 0
        customerInputView.layer.shadowOpacity = 0.04
        accessoryView.backgroundColor = .tertiarySystemFill
        accessoryImageView.tintColor = .secondaryLabel
        customerSelectButton.accessibilityHint = customerSelectionShowsError
            ? "Input customer info".localized()
            : nil
    }
    
    private func updateDiscountLabel() {
        let value = CartStore.shared.cart.discount
        if discountType == .percentage {
            discountLabel.text = value.formatStringInCommon() + "%"
        } else {
            discountLabel.text = value.formatStringInCommon()
        }
    }
    
    private func updateDepositLabel() {
        downPaymentLabel.text = CartStore.shared.cart.depositAmount.formatStringInCommon()
    }
    
    private func updateGetDateLabel() {
        if let date = getDate {
            // Display with date format: dd/MM/yyyy (no time)
            pickupDateLabel.text = date.dateInString()
            pickupDateLabel.textColor = .label
        } else {
            pickupDateLabel.text = "__/__/__"
            pickupDateLabel.textColor = .secondaryLabel
        }
    }
    
    private func updateReturnDateLabel() {
        if let date = returnDate {
            // Display with date format: dd/MM/yyyy (no time)
            returnDateLabel.text = date.dateInString()
            returnDateLabel.textColor = .label
        } else {
            returnDateLabel.text = "__/__/__"
            returnDateLabel.textColor = .secondaryLabel
        }
    }
    
    private func reloadSelectionTable() {
        selectedProductTableView.reloadData()
        updatePreviewTotal() // Update total whenever table reloads
        updateDepositLabel() // Update deposit label whenever table reloads
        updateCartBadge() // Update cart badge whenever table reloads
    }
    
    internal func reloadTotalOrder() {
        let itemCount = CartStore.shared.cart.itemCount
        let totalCount = CartStore.shared.cart.items.count
        previewCountLabel.text = "(\(itemCount))"
        totalLabel.text = CartStore.shared.cart.totalAmount.formatStringInCommon()
        updateCartBadge() // Update cart badge whenever total is recalculated
    }
    
    func reloadOrder() {
        getDate = CartStore.shared.cart.pickupPlanAt
        returnDate = CartStore.shared.cart.returnPlanAt
        
        // Set discount type based on cart's type
        discountType = CartStore.shared.cart.discountType == .percentage ? .percentage : .amount
        
        discountAmount = CartStore.shared.cart.discount
        customer = CartStore.shared.cart.customer
        
        // Update method selection based on cart order type
        if CartStore.shared.cart.orderType == .rent {
            methodSelect = .rent
        } else {
            methodSelect = .sale
        }
        
        // Update segmented control state based on edit mode
        updateSegmentedControlState()
        
        reloadSelectionTable()
        updateDepositLabel() // Update deposit label when reloading order
        updatePreviewTotal() // Update preview total when reloading order
        
        // Load batch availability for all products when editing order (both rent and sale)
        if !CartStore.shared.cart.items.isEmpty {
            loadBatchAvailabilityWithDebounce()
        }
    }
    
    func reset() {
        CartStore.shared.resetCart()
        
        // MARK: - Cache clear commented out
        // ProductAvailabilityCache.shared.clearAll()
        
        // Update UI first before triggering methodSelect change (which triggers animation)
        previewCountLabel.text = "(0)"
        totalLabel.text = "0"
        getDate = nil
        returnDate = nil
        customer = nil
        discountAmount = 0
        CartStore.shared.setDiscountType(.amount)
        discountType = .percentage
        
        // Reload table immediately to prevent race condition
        // This ensures table view knows cart is empty before any animation triggers layout
        reloadSelectionTable()
        
        // Set methodSelect after reload to avoid race condition during animation
        methodSelect = .rent
        
        // Re-enable segmented control when resetting (not in edit mode anymore)
        updateSegmentedControlState()
        
        updateCartBadge() // Update cart badge when cart is reset
        
        // If we're on a phone, navigate back to the root view controller
        if UIDevice.current.userInterfaceIdiom == .phone {
            navigationController?.popToRootViewController(animated: true)
        }
    }
    
    // Method to update cart badge in parent MainViewController
    private func updateCartBadge() {
        // Find the MainViewController in the navigation hierarchy or as parent
        if let mainVC = findMainViewController() {
            // Update the badge on the cart button
            mainVC.updateCartBadge()
        }
    }
    
    // Helper method to find the MainViewController
    private func findMainViewController() -> MainViewController? {
        // Check if we're in a split view on iPad
        if UIDevice.current.userInterfaceIdiom == .pad {
            return parent as? MainViewController
        }
        
        // Check navigation hierarchy for iPhone
        if let navigationController = self.navigationController {
            for viewController in navigationController.viewControllers {
                if let mainVC = viewController as? MainViewController {
                    return mainVC
                }
            }
        }
        
        return nil
    }
    
    // MARK: - Actions
    @objc private func methodChanged(_ sender: UISegmentedControl) {
        // Prevent changing order type when in edit mode
        if CartStore.shared.cart.isEditMode {
            // Revert to original selection
            sender.selectedSegmentIndex = methodSelect == .rent ? 0 : 1
            return
        }
        // User-initiated switch → animate the rental fields in/out.
        animateNextMethodChange = true
        methodSelect = sender.selectedSegmentIndex == 0 ? .rent : .sale
    }
    
    /// Update segmented control enabled state based on edit mode
    /// Disables the rent/sale switch when editing an existing order
    private func updateSegmentedControlState() {
        let isEditMode = CartStore.shared.cart.isEditMode
        methodSegmentControl.isEnabled = !isEditMode
        
        // Update visual appearance when disabled
        if isEditMode {
            methodSegmentControl.alpha = 0.6
        } else {
            methodSegmentControl.alpha = 1.0
        }
    }
    
    @objc private func getDateTapped() {
        let controller = DatePickerViewController.instance()
        controller.delegate = self
        controller.tag = 1 // Tag for pickup date
        
        // Allow selecting dates in the past (1 year ago) and future (1 year from now)
        let calendar = Calendar.current
        let today = Date()
        let minDate = calendar.date(byAdding: .year, value: -1, to: today)! // Allow 1 year in the past
        let maxDate = calendar.date(byAdding: .year, value: 1, to: today)! // Allow 1 year in the future
        
        // Configure the date picker with proper bounds
        controller.configureForDateRange(
            startDate: getDate,
            endDate: returnDate == nil ? nil : (returnDate! > maxDate ? maxDate : returnDate!),
            minimumDate: minDate,
            maximumDate: maxDate
        )
        
        
        
        present(controller, animated: true)
    }
    
    @objc private func returnDateTapped() {
        let controller = DatePickerViewController.instance()
        controller.delegate = self
        controller.tag = 2 // Tag for return date
        
        let calendar = Calendar.current
        let today = Date()
        
        // If pickup date is set, return date must be >= pickup date
        // Otherwise, allow selecting dates in the past (1 year ago) and future (1 year from now)
        let minDate: Date
        if let pickupDate = getDate {
            // Return date must be >= pickup date
            minDate = pickupDate
        } else {
            // Allow 1 year in the past if no pickup date is set
            minDate = calendar.date(byAdding: .year, value: -1, to: today)!
        }
        
        // Set maximum date to 1 year from minimum date
        let maxDate = calendar.date(byAdding: .year, value: 1, to: minDate)!
        
        // Configure the date picker with proper bounds
        controller.configureForDateRange(
            startDate: getDate,
            endDate: returnDate == nil ? nil : (returnDate! > maxDate ? maxDate : returnDate!),
            minimumDate: minDate,
            maximumDate: maxDate
        )
        
        
        present(controller, animated: true)
    }
    
    @objc private func previewTapped() {
        HapticFeedback.medium()
        setCustomerSelectionError(customer == nil)
        
        // Update cart with current form data
        CartStore.shared.setCustomer(customer)
        CartStore.shared.setOrderType(methodSelect == .rent ? .rent : .sale)
        CartStore.shared.setPickupDate(getDate)
        CartStore.shared.setReturnDate(returnDate)
        
        // Validate cart
        let (isValid, errors) = CartStore.shared.cart.validate()
        guard isValid else {
            UIAlertController.alert(parent: self,
                                    title: "Error".localized(),
                                    message: errors.joined(separator: "\n"))
            return
        }
        
        // For rent orders, check additional validations
        if methodSelect == .rent {
            guard let customer = customer else {
                UIAlertController.alert(parent: self,
                                        title: "Error".localized(),
                                        message: "Input customer info".localized())
                return
            }
            
            guard let getDate = getDate else {
                UIAlertController.alert(parent: self,
                                        title: "Error".localized(),
                                        message: "Input pickup date".localized())
                return
            }
            
            guard let returnDate = returnDate else {
                UIAlertController.alert(parent: self,
                                        title: "Error".localized(),
                                        message: "Input return date".localized())
                return
            }
        } else { // Sale
            guard let customer = customer else {
                UIAlertController.alert(parent: self,
                                        title: "Error".localized(),
                                        message: "Input customer info".localized())
                return
            }
        }
        
        // Show PreviewController with current Cart
        showPreviewController(cart: CartStore.shared.cart, edit: false)
    }

    @objc private func previewTouchDown() {
        UIView.animate(withDuration: 0.12) {
            self.previewContainer.transform = CGAffineTransform(scaleX: 0.985, y: 0.985)
            self.previewContainer.alpha = 0.92
        }
    }

    @objc private func previewTouchUp() {
        UIView.animate(withDuration: 0.12) {
            self.previewContainer.transform = .identity
            self.previewContainer.alpha = 1
        }
    }
    
    private func showPreviewController(cart: Cart, edit: Bool) {
        let orderViewController = PreviewViewController(cart: cart)
        orderViewController.hidesBottomBarWhenPushed = true
        orderViewController.delegate = self // Set delegate
        if  UIDevice.current.userInterfaceIdiom == .pad {
            if let tabbar = appDelegate.window?.rootViewController as? UITabBarController,
               let mainViewController = tabbar.viewControllers?.first as? UINavigationController {
                mainViewController.pushViewController(orderViewController, animated: true)
            }
        }else{
            navigationController?.pushViewController(orderViewController, animated: true)
        }
    }
    
    private func updatePreviewTotal() {
        let cartItems = CartStore.shared.cart.items
        
        // Calculate total items
        let totalItems = cartItems.reduce(0) { $0 + $1.quantity }
        previewCountLabel.text = "(\(totalItems))"
        
        // Use cart's total amount which already includes discount
        let total = CartStore.shared.cart.totalAmount.formatStringInCommon()
        totalLabel.text = total
        previewContainer.accessibilityValue = "\(totalItems), \(total)"
    }
    
    // MARK: - Clear Cart Button
    private lazy var clearCartButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 16, weight: .medium)
        let trashImage = UIImage(systemName: "trash", withConfiguration: config)
        button.setImage(trashImage, for: .normal)
        button.tintColor = .black
        button.addTarget(self, action: #selector(clearCartTapped), for: .touchUpInside)
        return button
    }()
    
    @objc private func clearCartTapped() {
        HapticFeedback.medium()
        
        // Show confirmation alert before clearing cart
        UIAlertController.alert(
            parent: self,
            title: "Clear Cart".localized(),
            message: "Are you sure you want to clear the cart? All items will be removed.".localized(),
            okTitle: "Yes, clear".localized(),
            cancelTitle: "Cancel".localized(),
            okAction: { [weak self] _ in
                self?.reset()
            },
            cancelAction: nil
        )
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        // Set segment control as custom title view for iPhone (centered)
        if UIDevice.current.userInterfaceIdiom == .phone {
            // Show back button and center segment control
            // Create navBar first when using customTitleView
            let navBar = RCCustomNavigationBar()
            setupCustomNavigationBar(
                navBar,
                title: "",
                statusBarBackgroundColor: .white,
                titleCentered: true,
                customTitleView: methodSegmentControl,
                hideBackButton: false,
                backAction: .pop
            )
            
            // Add clear cart button to right side
            navBar.addRightButton(clearCartButton, size: CGSize(width: 44, height: 44))
        } else {
            // For iPad, don't show navigation bar (it's in split view, no need for separate nav bar)
            // Navigation bar will be hidden and table view will start from top
        }
    }
    
    // MARK: - Keyboard Handling
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    /// Add product to cart directly from Product model
    /// - Parameters:
    ///   - product: The Product to add
    ///   - quantity: Quantity to add (default: 1)
    ///   - price: Price to use (will be determined from orderType if nil)
    func addProduct(product: Product, quantity: Int = 1, price: Double? = nil) {
        // Determine price based on current order type if not provided
        let finalPrice: Double
        if let providedPrice = price {
            finalPrice = providedPrice
        } else {
            // Use price based on current order type
            if methodSelect == .rent {
                finalPrice = product.rentPrice ?? product.rent
            } else {
                finalPrice = product.salePrice ?? product.sale
            }
        }
        
        // Create CartItem directly from Product
        let cartItem = CartItem(
            from: product,
            quantity: quantity,
            price: finalPrice
        )
        
        print("🛒 Adding product to cart:")
        print("   Product ID: \(cartItem.productId)")
        print("   Product Name: \(cartItem.productName ?? "nil")")
        print("   Quantity: \(cartItem.quantity)")
        print("   Price: \(cartItem.price)")
        print("   Cart items count before: \(CartStore.shared.cart.items.count)")
        
        // Debug date formatting
        if let pickupDate = CartStore.shared.cart.pickupPlanAt {
            let isoString = pickupDate.dateServerISOString()
            print("   📅 Pickup Date (ISO): \(isoString ?? "nil")")
            print("   📅 Pickup Date (Display): \(pickupDate.dateInString() ?? "nil")")
            
            // Test ISO validation
            let formatter = ISO8601DateFormatter()
            let isValid = formatter.date(from: isoString ?? "") != nil
            print("   📅 Pickup Date ISO Valid: \(isValid)")
        }
        if let returnDate = CartStore.shared.cart.returnPlanAt {
            let isoString = returnDate.dateServerISOString()
            print("   📅 Return Date (ISO): \(isoString ?? "nil")")
            print("   📅 Return Date (Display): \(returnDate.dateInString() ?? "nil")")
            
            // Test ISO validation
            let formatter = ISO8601DateFormatter()
            let isValid = formatter.date(from: isoString ?? "") != nil
            print("   📅 Return Date ISO Valid: \(isValid)")
        }
        
        CartStore.shared.addItem(cartItem)
        
        print("   Cart items count after: \(CartStore.shared.cart.items.count)")
        print("   Cart itemCount: \(CartStore.shared.cart.itemCount)")
        
        reloadSelectionTable()
        updatePreviewTotal() // Update total after adding product
        updateDepositLabel() // Update deposit label (will use manual if set, otherwise calculate from items)
        updateCartBadge() // Update cart badge after adding product
        
        // Load batch availability for all products in cart (with debounce)
        // Supports both rent and sale orders
        loadBatchAvailabilityWithDebounce()
    }
    
    // MARK: - Product Availability Checking
    
    /// Load batch availability for all products in cart with debounce
    private func loadBatchAvailabilityWithDebounce() {
        availabilityDebouncer.debounce { [weak self] in
            self?.loadBatchAvailability()
        }
    }
    
    /// Load batch availability for all products in cart
    /// Supports both rent (with date range) and sale (current date) orders
    private func loadBatchAvailability() {
        // Get unique products with their total quantities
        let productQuantities = Dictionary(grouping: CartStore.shared.cart.items) { $0.productId }
            .map { (productId, items) -> BatchProductRequest in
                let totalQuantity = items.reduce(0) { $0 + $1.quantity }
                return BatchProductRequest(productId: productId, quantity: totalQuantity)
            }
        
        guard !productQuantities.isEmpty else {
            return
        }
        
        // Determine date range based on order type
        let startDate: Date
        let endDate: Date
        
        if methodSelect == .rent {
            // Rent orders: use pickup and return dates
            guard let pickupDate = getDate,
                  let returnDate = returnDate else {
                return
            }
            startDate = pickupDate
            endDate = returnDate
        } else {
            // Sale orders: use current date (same day for start and end)
            let today = Date()
            startDate = today
            endDate = today
        }
        
        let outletId = User.current()?.outlet?.id ?? User.current()?.outletId
        
        // When editing an existing order, exclude it from conflict check
        let excludeOrderId = CartStore.shared.cart.orderId
        
        OrderService.shared.loadBatchProductAvailability(
            products: productQuantities,
            startDate: startDate,
            endDate: endDate,
            outletId: outletId,
            excludeOrderId: excludeOrderId
        ) { [weak self] response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("❌ Error loading batch availability: \(error.localizedDescription)")
                return
            }
            
            guard let response = response,
                  let data = response.data else {
                return
            }
            
            // Update availability status for all products
            for result in data.results {
                // Use effectivelyAvailable from best outlet (accounts for date-based conflicts)
                // Fallback to totalAvailableStock for backward compatibility
                let available: Int
                if let bestOutlet = result.availabilityByOutlet?.first {
                    available = bestOutlet.effectivelyAvailable ?? result.totalAvailableStock ?? 0
                } else {
                    available = result.totalAvailableStock ?? 0
                }
                let isAvailable = result.isAvailable && (available >= result.requestedQuantity)
                
                let status = AvailabilityStatus(isAvailable: isAvailable, available: available)
                CartStore.shared.updateAvailabilityStatus(for: result.productId, status: status)
            }
            
            print("📊 Batch Availability Loaded:")
            print("   Order Type: \(methodSelect == .rent ? "Rent" : "Sale")")
            print("   Total Products: \(data.summary.totalProducts)")
            print("   Available: \(data.summary.availableProducts)")
            print("   Unavailable: \(data.summary.unavailableProducts)")
            
            // Reload table to update cell status
                DispatchQueue.main.async {
                self.reloadSelectionTable()
                }
            }
        }
    
    /// Load and cache product availability for date range (called once when adding product)
    /// Checks all days from pickup to return date and caches each day
    /// MARK: - Deprecated - Use loadBatchAvailability instead
    private func loadAndCacheProductAvailability(for productId: Int, completion: ((Bool, Int) -> Void)? = nil) {
        // Only check for rent orders with valid dates
        guard methodSelect == .rent,
              let pickupDate = getDate,
              let returnDate = returnDate else {
            completion?(false, 0)
            return
        }
        
        // Check if all dates in range are cached
//        if let cachedResult = ProductAvailabilityCache.shared.checkAvailability(
//            productId: productId,
//            startDate: pickupDate,
//            endDate: returnDate,
//            requestedQuantity: 0 // Just check if cached, quantity check will be done separately
//        ) {
//            print("📦 Using cached availability for product \(productId) in date range")
//            // Re-check with actual quantity
//            if let result = ProductAvailabilityCache.shared.checkAvailability(
//                productId: productId,
//                startDate: pickupDate,
//                endDate: returnDate,
//                requestedQuantity: CartStore.shared.cart.items
//                    .filter { $0.productId == productId }
//                    .reduce(0) { $0 + $1.quantity }
//            ) {
//                completion?(result.isAvailable, result.available)
//                return
//            }
//        }
        
        // Load availability for all days in the range
        loadAvailabilityForDateRange(
            productId: productId,
            startDate: pickupDate,
            endDate: returnDate,
            completion: completion
        )
    }
    
    /// Load availability for all days in date range and cache them
    private func loadAvailabilityForDateRange(
        productId: Int,
        startDate: Date,
        endDate: Date,
        completion: ((Bool, Int) -> Void)?
    ) {
        let calendar = Calendar.current
        var currentDate = startDate.startOfDay()
        let end = endDate.startOfDay()
        var datesToLoad: [Date] = []
        
        // MARK: - Cache logic commented out - always call API
        // Cache check removed - always call API directly
        
        // OLD CACHE LOGIC (COMMENTED):
        // Collect dates that need to be loaded (not in cache)
        // while currentDate <= end {
        //     if ProductAvailabilityCache.shared.getAvailability(productId: productId, date: currentDate) == nil {
        //         datesToLoad.append(currentDate)
        //     }
        //     guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else {
        //         break
        //     }
        //     currentDate = nextDate
        // }
        //
        // // If all dates are cached, check availability
        // if datesToLoad.isEmpty {
        //     let requestedQuantity = CartStore.shared.cart.items
        //         .filter { $0.productId == productId }
        //         .reduce(0) { $0 + $1.quantity }
        //
        //     if let result = ProductAvailabilityCache.shared.checkAvailability(
        //         productId: productId,
        //         startDate: startDate,
        //         endDate: endDate,
        //         requestedQuantity: requestedQuantity
        //     ) {
        //         completion?(result.isAvailable, result.available)
        //         return
        //     }
        // }
        
        // Load availability for date range using new API
        let outletId = User.current()?.outlet?.id ?? User.current()?.outletId
        
        OrderService.shared.loadProductAvailabilityForDateRange(
                productId: productId,
            pickupDate: startDate,
            returnDate: endDate,
                outletId: outletId
        ) { [weak self] response, error in
            guard let self = self else { return }
                
                if let error = error {
                print("❌ Error loading availability for date range: \(error.localizedDescription)")
                completion?(false, 0)
                    return
                }
                
                guard let response = response,
                      let data = response.data,
                      let summary = data.summary else {
                completion?(false, 0)
                    return
                }
                
            // MARK: - Cache logic commented out - calculate directly from API response
            // Cache removed - calculate availability directly from API response
            
            // OLD CACHE LOGIC (COMMENTED):
            // Cache the result for all dates in the range
            // let calendar = Calendar.current
            // var currentDate = startDate.startOfDay()
            // let end = endDate.startOfDay()
            // while currentDate <= end {
            //     ProductAvailabilityCache.shared.setAvailability(
            //         productId: productId,
            //         date: currentDate,
            //         summary: summary
            //     )
            //     guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else {
            //         break
            //     }
            //     currentDate = nextDate
            // }
            
            // Calculate availability directly from API response
            let requestedQuantity = CartStore.shared.cart.items
                .filter { $0.productId == productId }
                .reduce(0) { $0 + $1.quantity }
            
            let available = summary.totalAvailable ?? 0
            let isAvailable = (summary.isAvailable ?? false) && (available >= requestedQuantity)
            
            // Store availability status in cart items
            let status = AvailabilityStatus(isAvailable: isAvailable, available: available)
            CartStore.shared.updateAvailabilityStatus(for: productId, status: status)
                
                print("📊 Product Availability Loaded for Date Range:")
                print("   Product ID: \(productId)")
                print("   Date Range: \(startDate.dateInString() ?? "") to \(endDate.dateInString() ?? "")")
            print("   Available: \(available)")
            print("   Requested: \(requestedQuantity)")
                print("   Is Available: \(isAvailable)")
                
                completion?(isAvailable, available)
        }
    }
    
    /// Check availability locally from cache for date range (no API call)
    /// Updates cell status instead of showing alert
    // MARK: - checkProductAvailabilityLocally removed
    // Function removed - now directly call loadAvailabilityForDateRange when quantity changes
    
    /// Check availability for all products in cart (from cache) - removed, use reloadAvailabilityForAllProducts instead
    
    /// Reload availability for all products when date changes (invalidate old cache and load new date range)
    private func reloadAvailabilityForAllProducts() {
        // Only check for rent orders with valid dates
        guard methodSelect == .rent,
              getDate != nil,
              returnDate != nil else {
            return
        }
        
        markAvailabilityStatusAsLoadingForAllItems()
        reloadSelectionTable()
        
        // MARK: - Cache invalidation commented out - just reload via API
        // Reload batch availability for all products with new date range
        loadBatchAvailabilityWithDebounce()
    }
}

// MARK: - UITableViewDataSource
extension InfoMainViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        let count = CartStore.shared.cart.items.count
        tableView.backgroundView = count == 0 ? createEmptyView() : nil
        return count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "ProductSelectedCell", for: indexPath) as! ProductSelectedCell
        
        // Safety check: Ensure index is within bounds to prevent crash
        guard indexPath.row < CartStore.shared.cart.items.count else {
            // Return empty cell if index is out of bounds (can happen during cart clear/reset)
            return cell
        }
        
        let cartItem = CartStore.shared.cart.items[indexPath.row]
        cell.delegate = self
        // Availability status is now stored in cartItem itself
        cell.configureCell(
            cartItem: cartItem,
            at: indexPath.row,
            getDate: getDate,
            returnDate: returnDate,
            availabilityStatus: cartItem.availabilityStatus,
            orderType: methodSelect,
            layout: .default
        )
        return cell
    }
    
    private func createEmptyView() -> UIView {
        let view = UIView()
        let label = UILabel()
        label.text = "No products added".localized()
        label.textColor = .gray
        label.textAlignment = .center
        label.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        
        view.addSubview(label)
        
        label.snp.makeConstraints { make in
            make.center.equalToSuperview()
        }
        
        return view
    }
}

// MARK: - UITableViewDelegate
extension InfoMainViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, heightForRowAt indexPath: IndexPath) -> CGFloat {
        return UITableViewAutomaticDimension // Use automatic height
    }
    
    //    func tableView(_ tableView: UITableView, estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat {
    //        return 160 // Estimated height for performance
    //    }
    
    func tableView(_ tableView: UITableView, canEditRowAt indexPath: IndexPath) -> Bool {
        return true
    }
    
    func tableView(_ tableView: UITableView, commit editingStyle: UITableViewCell.EditingStyle, forRowAt indexPath: IndexPath) {
        if editingStyle == .delete {
            CartStore.shared.removeItem(at: indexPath.row)
            tableView.deleteRows(at: [indexPath], with: .fade)
            reloadSelectionTable()
            updatePreviewTotal() // Update total after row deletion
            updateDepositLabel() // Update deposit label (will use manual if set, otherwise calculate from items)
            updateCartBadge() // Update cart badge after row deletion
        }
    }
    
    func tableView(_ tableView: UITableView, titleForDeleteConfirmationButtonForRowAt indexPath: IndexPath) -> String? {
        return "Remove".localized()
    }
}

// MARK: - ProductSelectedCellDelegate
extension InfoMainViewController: ProductSelectedCellDelegate {
    func didEndEditing(value: Double, isQuantity: Bool, at index: Int) {
        if isQuantity {
            CartStore.shared.updateQuantity(at: index, quantity: Int(value))
            
            if methodSelect == .rent, getDate != nil, returnDate != nil {
                markAvailabilityStatusAsLoadingForAllItems()
            reloadSelectionTable()
            loadBatchAvailabilityWithDebounce()
        } else {
                reloadSelectionTable()
            }
        } else {
            CartStore.shared.updatePrice(at: index, price: value)
            updatePreviewTotal()
            updateDepositLabel()
            updateCartBadge()
        }
    }

    func didUpdateRentalDays(_ days: Int, at index: Int) {
        CartStore.shared.updateRentalDays(at: index, days: days)
        reloadSelectionTable()
        updatePreviewTotal()
        updateDepositLabel()
        updateCartBadge()
    }

    func didSelectPricingOption(optionId: Int, at index: Int) {
        CartStore.shared.selectPricingOption(at: index, optionId: optionId)
        CartStore.shared.syncRentalDaysFromDates()
        reloadSelectionTable()
        updatePreviewTotal()
        updateDepositLabel()
        updateCartBadge()
    }

    func didSelectPricingType(_ type: String, at index: Int) {
        CartStore.shared.selectPricingType(at: index, type: type)
        reloadSelectionTable()
        updatePreviewTotal()
        updateDepositLabel()
        updateCartBadge()
    }

    func didUpdateNote(_ note: String?, at index: Int) {
        CartStore.shared.updateNote(at: index, note: note)
    }
    
    func didTapDelete(at index: Int) {
        CartStore.shared.removeItem(at: index)
        reloadSelectionTable()
        updatePreviewTotal() // Update total after product deletion
        updateDepositLabel() // Update deposit label (will use manual if set, otherwise calculate from items)
        updateCartBadge() // Update cart badge after product deletion
    }
    
    func didTapStatus(at index: Int) {
        guard index < CartStore.shared.cart.items.count else { return }
        let cartItem = CartStore.shared.cart.items[index]
        
        // Reload cache for this product when user taps status
        if methodSelect == .rent,
           let pickupDate = getDate,
           let returnDate = returnDate {
            // Invalidate old cache
            // MARK: - Cache invalidation commented out
            // ProductAvailabilityCache.shared.invalidateProduct(productId: cartItem.productId)
            
            // Reload batch availability for all products
            loadBatchAvailability()
        }
        
        // Convert CartItem to Product for OrderCheckViewController
        var productToCheck = Product()
        productToCheck.product_id = cartItem.productId
        productToCheck.name = cartItem.productName
        productToCheck.quantity = cartItem.quantity
        
        let controller = OrderCheckViewController()
        controller.delegate = self
        controller.loadProduct(productToCheck)
        
        // Present modally on iPad, push on iPhone
        let nav = UINavigationController(rootViewController: controller)
        present(nav, animated: true)
    }
}

//// MARK: - PreviewViewControllerDelegate
//extension InfoMainViewController: PreviewViewControllerDelegate {
//    func complete(sender: PreviewViewController) {
//        reset() // This already calls updateCartBadge()
//        
//        // Explicitly update cart badge to ensure it's updated
//        updateCartBadge()
//        
//        // Navigate back to the root view controller
//        DispatchQueue.main.async {
//            self.navigationController?.popToRootViewController(animated: true)
//        }
//    }
//}

// MARK: - PreviewViewControllerNewDelegate
extension InfoMainViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        // Notify OrderListViewModel for cross-screen updates
        if let order = updatedOrder {
            OrderListViewModel.shared.updateOrder(order)
        } else {
            // Set flag for refresh when no order object provided
            OrderListViewModel.shared.setNeedsRefresh()
        }
        
        // Store customer from order before reset (if editing order)
        var customerToRestore: Customer? = nil
        if let order = updatedOrder {
            // Create Customer object from Order's customer data
            var customer = Customer()
            customer.customer_id = order.customerId
            customer.id = order.customerId
            customer.full_name = order.customerName
            customer.phone = order.customerPhone
            
            // Parse customerName to firstName and lastName if possible
            let nameParts = order.customerName.components(separatedBy: " ").filter { !$0.isEmpty }
            if nameParts.count > 0 {
                customer.firstName = nameParts[0]
                if nameParts.count > 1 {
                    customer.lastName = nameParts.dropFirst().joined(separator: " ")
                }
            }
            
            customerToRestore = customer
        }
        
        reset() // This already calls updateCartBadge() and clears customer
        
        // Restore customer after reset to display in InfoCustomerView
        if let customer = customerToRestore {
            self.customer = customer
        }
        
        // Explicitly update cart badge to ensure it's updated
        updateCartBadge()
        
        // Navigate back to the root view controller
        DispatchQueue.main.async {
            self.navigationController?.popToRootViewController(animated: true)
        }
    }
}

// MARK: - UIPopoverPresentationControllerDelegate
extension InfoMainViewController: UIPopoverPresentationControllerDelegate {
    func adaptivePresentationStyle(for controller: UIPresentationController, traitCollection: UITraitCollection) -> UIModalPresentationStyle {
        return .none
    }
}

// MARK: - InfoCustomerViewDelegate
extension InfoMainViewController: InfoCustomerViewDelegate {
    func infoView(sender: InfoCustomerView) {
        // Fallback if menu is not set (backward compatibility)
        // This should not be called if menu is properly set
    }
    
    // MARK: - Customer Menu
    private func createCustomerMenu() -> UIMenu {
        var menuActions: [UIMenuElement] = []
        
        // Change customer action
        let changeCustomerAction = UIAction(
            title: "Change Customer".localized(),
            image: UIImage(systemName: "person.circle")
        ) { [weak self] _ in
            self?.showCustomerView(searchText: "")
        }
        menuActions.append(changeCustomerAction)
        
        // Remove customer action
        let removeAction = UIAction(
            title: "Remove Customer".localized(),
            image: UIImage(systemName: "trash"),
            attributes: .destructive
        ) { [weak self] _ in
            self?.customer = nil
            self?.updateCustomerViews()
        }
        menuActions.append(removeAction)
        
        return UIMenu(children: menuActions)
    }
}

// MARK: - OrderCheckViewControllerDelegate
extension InfoMainViewController: OrderCheckViewControllerDelegate {
    func didSelectOrder(order: Order, sender: OrderCheckViewController) {
        // Product-availability API returns orders scoped to one line item; load full detail for cart + preview.
        showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: order.id) { [weak self] orderDetail, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress()
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let detail = orderDetail else {
                    let err = NSError.errorWithOwnMessage(message: "No order detail received".localized(), domain: "POS")
                    UIAlertController.errorAlert(parent: self, error: err)
                    return
                }
                
                let fullOrder = Order.from(detail: detail)
                let cart = Cart.fromOrderDetail(detail)
                
                CartStore.shared.replaceCart(with: cart)
                
                // Set customer from full order for InfoCustomerView
                var customer = Customer()
                customer.customer_id = fullOrder.customerId
                customer.id = fullOrder.customerId
                customer.full_name = fullOrder.customerName
                customer.phone = fullOrder.customerPhone
                
                let nameParts = fullOrder.customerName.components(separatedBy: " ").filter { !$0.isEmpty }
                if nameParts.count > 0 {
                    customer.firstName = nameParts[0]
                    if nameParts.count > 1 {
                        customer.lastName = nameParts.dropFirst().joined(separator: " ")
                    }
                }
                
                self.customer = customer
                
                if UIDevice.current.userInterfaceIdiom == .pad {
                    self.reloadOrder()
                    self.customer = customer
                }
                
                if let tabbarController = appDelegate.window?.rootViewController as? TabbarViewController {
                    if let navigationController = tabbarController.viewControllers?.first as? UINavigationController {
                        for viewController in navigationController.viewControllers {
                            if let mainVC = viewController as? MainViewController {
                                mainVC.updateCartBadge()
                                break
                            }
                        }
                    }
                }
                
                let orderViewController = PreviewViewController(editOrder: fullOrder)
                orderViewController.delegate = self
                self.navigationController?.pushViewController(orderViewController, animated: true)
            }
        }
    }
}

// MARK: - Public Methods
extension InfoMainViewController {
    func alreadySetupDate() -> Bool {
        return getDate != nil && returnDate != nil
    }

    @objc private func customerSelectTapped() {
        showCustomerView(searchText: "")
    }

    @objc private func customerSelectTouchDown() {
        UIView.animate(withDuration: 0.12) {
            self.customerInputView.transform = CGAffineTransform(scaleX: 0.98, y: 0.98)
            self.customerInputView.alpha = 0.92
        }
    }

    @objc private func customerSelectTouchUp() {
        UIView.animate(withDuration: 0.12) {
            self.customerInputView.transform = .identity
            self.customerInputView.alpha = 1
        }
    }
    
    private func showCustomerView(searchText: String) {
        let vc = SuggestionTextField()
        vc.delegate = self
        currentSuggestionTextField = vc // Store reference
        if UIDevice.current.userInterfaceIdiom == .pad {
            // iPad: present view (modal)
            if let tabBarController = appDelegate.window?.rootViewController as? TabbarViewController,  let nav = tabBarController.viewControllers?.first{
                nav.present(UINavigationController(rootViewController: vc), animated: true)
            }
        } else {
            // iPhone: push navigation
            navigationController?.pushViewController(vc, animated: true)
        }
    }
    
    // Update date view creation
    private func createDateView(title: String, action: Selector) -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        titleLabel.textColor = .systemBlue
        
        let valueLabel: UILabel
        if title == "Pickup date".localized() {
            valueLabel = pickupDateLabel
            valueLabel.text = "Select date".localized()
        } else if title == "Return date".localized() {
            valueLabel = returnDateLabel
            valueLabel.text = "Select date".localized()
        } else {
            valueLabel = UILabel()
            valueLabel.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
            valueLabel.textColor = .black
            valueLabel.textAlignment = .right
        }
        
        container.isUserInteractionEnabled = true
        
        // Create horizontal stack view for labels
        let labelsStack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        labelsStack.axis = .horizontal
        labelsStack.distribution = .equalSpacing
        labelsStack.alignment = .center
        
        container.addSubview(labelsStack)
        
        // Set up constraints for the stack view with 16px leading and trailing padding
        labelsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16))
        }
        
        // Set fixed height for container
        container.snp.makeConstraints { make in
            let heightConstraint = make.height.equalTo(44).constraint
            if title == "Pickup date".localized() {
                self.pickupDateHeightConstraint = heightConstraint
            } else if title == "Return date".localized() {
                self.returnDateHeightConstraint = heightConstraint
            }
        }
        
        let tapGesture = UITapGestureRecognizer(target: self, action: action)
        container.addGestureRecognizer(tapGesture)
        container.isUserInteractionEnabled = true
        
        return container
    }
    
    // Update payment view creation
    private func createPaymentView(title: String, value: String) -> UIView {
        let container = UIView()
        container.backgroundColor = .white
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
        titleLabel.textColor = .systemBlue
        
        let valueLabel: UILabel
        if title == "Deposit".localized() {
            valueLabel = downPaymentLabel
            valueLabel.text = value
            // Add tap gesture for Deposit
            let tapGesture = UITapGestureRecognizer(target: self, action: #selector(downPayment))
            container.addGestureRecognizer(tapGesture)
        } else if title == "Discount".localized() {
            valueLabel = discountLabel
            valueLabel.text = value
            // Add tap gesture for discount
            let tapGesture = UITapGestureRecognizer(target: self, action: #selector(discount))
            container.addGestureRecognizer(tapGesture)
        } else {
            valueLabel = UILabel()
            valueLabel.font = Utils.regularFont(size: 16) // Match AccountViewController text chính
            valueLabel.textColor = .black
            valueLabel.textAlignment = .right
            valueLabel.text = value
        }
        
        container.isUserInteractionEnabled = true
        
        // Create horizontal stack view for labels
        let labelsStack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        labelsStack.axis = .horizontal
        labelsStack.distribution = .equalSpacing
        labelsStack.alignment = .center
        
        container.addSubview(labelsStack)
        
        // Set up constraints for the stack view with 16px leading and trailing padding
        labelsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16))
        }
        
        // Set fixed height for container
        container.snp.makeConstraints { make in
            let heightConstraint = make.height.equalTo(44).constraint
            if title == "Deposit".localized() {
                self.downPaymentHeightConstraint = heightConstraint
            }
        }
        
        return container
    }
}

// MARK: - Additional Actions
extension InfoMainViewController {
    @objc private func discount(_ sender: Any) {
        let controller = NumberPickerViewController.instance()
        controller.delegate = self
        controller.configure(
            initialValue: CartStore.shared.cart.discount,
            mode: .discount(type: discountType) // Use current discount type
        )
        present(controller, animated: true)
    }
    
    @objc private func downPayment(_ sender: Any) {
        let controller = NumberPickerViewController.instance()
        controller.delegate = self
        controller.configure(initialValue: CartStore.shared.cart.depositAmount)
        present(controller, animated: true)
    }
}

// MARK: - SuggestionTextFieldDelegate
extension InfoMainViewController: SuggestionTextFieldDelegate {
    func didSelectCustomer(customer: Customer, sender: SuggestionTextField) {
        self.customer = customer
        updateCustomerViews()
    }
    
    func didAddNewCustomer(sender: SuggestionTextField) {
        let controller = CustomerViewController()
        // Set delegate to SuggestionTextField so it can update the customer list
        controller.delegate = sender
        self.navigationController?.present(controller, animated: true)
//        presentController(size: CGSize(width: 800, height: 400),
    }
    
    func didCreateCustomer(customer: Customer, sender: SuggestionTextField) {
        // Customer is already added to the list by SuggestionTextField
        // This method is called to notify parent view controller if needed
        // No action needed here as SuggestionTextField handles the list update
//                          controller: controller) { [weak self] in
            // Handle new customer creation if needed
//        }
    }
}

// MARK: - DatePickerViewControllerDelegate
extension InfoMainViewController: DatePickerViewControllerDelegate {
    func didSelectDate(_ date: Date, sender: DatePickerViewController) {
        if sender.tag == 1 { // Pickup date
            getDate = date
            
            // If return date is earlier than the new pickup date, update return date
            if let returnDate = returnDate, returnDate < date {
                self.returnDate = date
            }
        } else { // Return date
            returnDate = date
        }
        
        // Reload the table to update product availability in cells
        if methodSelect == .rent && getDate != nil && returnDate != nil {
            reloadSelectionTable()
            // When date changes, we need to reload availability for all products
            // Invalidate old cache and reload for new date
            reloadAvailabilityForAllProducts()
        }
    }
    
    // Implement the date range selection delegate method
    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController) {
        // Clear any previous selections to avoid keeping old alpha blue colors
        // Always set pickup date to start and return date to end
        getDate = start
        returnDate = end
        
        // Reload the table to update product availability
        if methodSelect == .rent {
            reloadSelectionTable()
            // When date changes, we need to reload availability for all products
            // Invalidate old cache and reload for new date
            reloadAvailabilityForAllProducts()
        }
    }
}

// MARK: - NumberPickerViewControllerDelegate
extension InfoMainViewController: NumberPickerViewControllerDelegate {
    func didSelectNumber(_ value: Double, sender: NumberPickerViewController) {
        switch sender.mode {
        case .discount(let type):
            CartStore.shared.setDiscount(value)
            discountType = type // Store the discount type
            if type == .percentage {
                discountLabel.text = value.formatStringInCommon() + "%"
            } else {
                discountLabel.text = value.formatStringInCommon()
            }
            updatePreviewTotal()
            
        case .normal:
            // For deposit amount - set manual deposit amount
            // Accept 0 as a valid manual value (user can set deposit to 0)
            CartStore.shared.setManualDepositAmount(value)
            updateDepositLabel()
            updatePreviewTotal()
        }
    }
}
