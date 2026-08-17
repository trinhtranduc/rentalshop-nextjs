import Foundation
import UIKit
import QRCodeReader
import AudioToolbox
import AVFoundation
import SnapKit

class MainViewController: BaseViewControler {
    // MARK: - ViewModel
    private let viewModel = MainViewModel()
    
    // MARK: - UI Components
    private lazy var searchSectionView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        return view
    }()

    private lazy var productTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.separatorStyle = .none // Bỏ separator giữa các cells để card style nổi bật
        table.register(ProductCell.self, forCellReuseIdentifier: String(describing: ProductCell.self))
        table.tableHeaderView = UIView()
        table.tableFooterView = UIView()
        table.translatesAutoresizingMaskIntoConstraints = false
        table.rowHeight = UITableViewAutomaticDimension // Tự động điều chỉnh height
        table.estimatedRowHeight = 132
        table.contentInset = UIEdgeInsets(top: 8, left: 0, bottom: 88, right: 0)
        table.scrollIndicatorInsets = UIEdgeInsets(top: 0, left: 0, bottom: 88, right: 0)
        table.allowsSelection = true
        table.selectionFollowsFocus = true
        table.isUserInteractionEnabled = true
        table.keyboardDismissMode = .onDrag
        table.showsVerticalScrollIndicator = false
        return table
    }()
    
    override var tableView: UITableView? {
        get { return productTableView }
        set { /* Ignore setting since we're using productTableView */ }
    }
    
    private lazy var searchBar: UISearchBar = {
        let searchBar = UISearchBar()
        searchBar.delegate = self
        searchBar.backgroundColor = .clear
        searchBar.searchBarStyle = .minimal
        searchBar.setBackgroundImage(UIImage(), for: .any, barMetrics: .default)
        searchBar.placeholder = "Product name...".localized()
        searchBar.placeholderLabel?.font = Utils.regularFont(size: 16)
        searchBar.placeholderLabel?.textColor = .textTertiary
        searchBar.textField?.textColor = .textPrimary
        searchBar.textField?.font = Utils.boldFont(size: 16)
        searchBar.tintColor = .brandPrimary

        let searchTextField = searchBar.searchTextField
        searchTextField.backgroundColor = .backgroundCard
        searchTextField.layer.cornerRadius = 12
        searchTextField.layer.masksToBounds = true
        searchTextField.layer.borderWidth = 1
        searchTextField.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.9).cgColor
        searchTextField.leftView?.tintColor = .textSecondary
        searchTextField.clearButtonMode = .whileEditing
        
        // Configure text input traits
        searchBar.searchTextField.autocorrectionType = .no
        searchBar.searchTextField.autocapitalizationType = .none
        searchBar.searchTextField.spellCheckingType = .no
        searchBar.searchTextField.smartDashesType = .no
        searchBar.searchTextField.smartQuotesType = .no
        searchBar.searchTextField.smartInsertDeleteType = .no

        return searchBar
    }()
    
    private lazy var addButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 23, weight: .regular)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "plus"), for: .normal)
        button.tintColor = .textPrimary
        button.addTarget(self, action: #selector(addNewProduct), for: .touchUpInside)
        button.accessibilityLabel = "product.action.add.accessibility".localized()
        return button
    }()
    
    private lazy var barcodeScanButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 22, weight: .regular)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "barcode.viewfinder"), for: .normal)
        button.tintColor = .textPrimary
        button.addTarget(self, action: #selector(barcodeScanTapped), for: .touchUpInside)
        button.accessibilityLabel = "common.action.scanBarcode".localized()
        return button
    }()
    
    private lazy var floatingAISearchButton: UIButton = {
        let button = UIButton(type: .custom)
        let symbolConfig = UIImage.SymbolConfiguration(pointSize: 22, weight: .semibold)
        // Sparkle + magnifier reads as AI search, not a camera/barcode capture.
        let icon = UIImage(systemName: "sparkle.magnifyingglass", withConfiguration: symbolConfig)
            ?? UIImage(systemName: "sparkles", withConfiguration: symbolConfig)
            ?? UIImage(systemName: "wand.and.stars", withConfiguration: symbolConfig)
            ?? UIImage(systemName: "magnifyingglass", withConfiguration: symbolConfig)
        button.setImage(icon, for: .normal)
        button.tintColor = .white
        button.backgroundColor = .brandPrimary
        button.layer.cornerRadius = 28
        button.layer.shadowColor = UIColor.black.cgColor
        button.layer.shadowOpacity = 0.22
        button.layer.shadowOffset = CGSize(width: 0, height: 4)
        button.layer.shadowRadius = 8
        button.accessibilityLabel = "AI Image Search".localized()
        button.addTarget(self, action: #selector(aiSearchTapped), for: .touchUpInside)
        return button
    }()
    
    internal lazy var cartButton: BadgeButton = {
        let button = BadgeButton(frame: CGRect(x: 0, y: 0, width: 44, height: 44))
        let config = UIImage.SymbolConfiguration(pointSize: 22, weight: .regular)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "cart"), for: .normal)
        button.tintColor = .textPrimary
        button.badgeBackgroundColor = .brandPrimary
        button.badgeTextColor = .white
        button.badgeFont = Utils.mediumFont(size: 11)
        button.badgeEdgeInsets = UIEdgeInsets(top: 18, left: 0, bottom: 0, right: 13)
        button.addTarget(self, action: #selector(cartButtonTapped), for: .touchUpInside)
        button.accessibilityLabel = "Cart".localized()
        return button
    }()

    internal lazy var notificationButton: BadgeButton = {
        let button = BadgeButton(frame: CGRect(x: 0, y: 0, width: 44, height: 44))
        let config = UIImage.SymbolConfiguration(pointSize: 20, weight: .regular)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "bell"), for: .normal)
        button.tintColor = .textPrimary
        button.badgeBackgroundColor = .brandPrimary
        button.badgeTextColor = .white
        button.badgeFont = Utils.mediumFont(size: 11)
        button.badgeEdgeInsets = UIEdgeInsets(top: 18, left: 0, bottom: 0, right: 13)
        button.addTarget(self, action: #selector(notificationButtonTapped), for: .touchUpInside)
        button.accessibilityLabel = "Notifications".localized()
        return button
    }()
    
    private lazy var trashButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 16, weight: .medium)
        let clearImage = UIImage(systemName: "broom.fill", withConfiguration: config)
            ?? UIImage(systemName: "paintbrush.fill", withConfiguration: config)
        button.setImage(clearImage, for: .normal)
        button.tintColor = .black
        button.accessibilityLabel = "Clear Cart".localized()
        button.addTarget(self, action: #selector(trashButtonTapped), for: .touchUpInside)
        return button
    }()
    
    
    // MARK: - Properties
    private var products: [Product] = []
    
    /// Get product by productId (for InfoMainViewController to access prices)
    func getProduct(by productId: Int) -> Product? {
        return products.first { ($0.product_id ?? $0.id ?? 0) == productId }
    }
    
    private var isSearchMode = false {
        didSet {
            if isSearchMode == false {
                searchBar.text = nil
                searchBar.showsCancelButton = false
                setupPullToRefresh()
                
                // Reset search and load all products when not searching
                viewModel.clearSearch()
                
                // Clear AI search mode when exiting search
                isAISearchMode = false
            } else {
                tableView?.refreshControl = nil
                searchBar.showsCancelButton = true
                tableView?.reloadData()
            }
        }
    }
    
    private var isAISearchMode = false {
        didSet {
            if isAISearchMode {
                // Update search bar placeholder when in AI mode
                searchBar.placeholder = "🤖 AI Search Results - Tap cancel to go back".localized()
                searchBar.text = "AI Image Search".localized()
                searchBar.isUserInteractionEnabled = false
                searchBar.showsCancelButton = true
                isSearchMode = true
            } else {
                // Reset search bar
                searchBar.placeholder = "Product name...".localized()
                searchBar.isUserInteractionEnabled = true
            }
        }
    }
    private var infoViewController: InfoMainViewController?
    
    /// Get InfoMainViewController (for adding products to cart from other view controllers)
    var cartViewController: InfoMainViewController? {
        return infoViewController
    }
    private lazy var readerVC: QRCodeReaderViewController = {
        let builder = QRCodeReaderViewControllerBuilder {
            $0.reader = QRCodeReader(metadataObjectTypes: [.code39, .code128], captureDevicePosition: .back)
        }
        return QRCodeReaderViewController(builder: builder)
    }()
    private var controller: NewProductViewController?
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupData()
        setupViewModel()
        observeInboxUnreadCount()
        refreshNotificationBadge()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
        // Set status bar style for white background
        setStatusBarStyle(.darkContent)

        refreshNotificationBadge()
        
        // On iPad, reload cart in InfoMainViewController when view appears
        // This ensures cart is reloaded when switching back to home tab
        if UIDevice.current.userInterfaceIdiom == .pad {
            infoViewController?.reloadOrder()
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopImageSearchFabSparkle()
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        tableView?.reloadData()
        view.bringSubview(toFront: floatingAISearchButton)
        floatingAISearchButton.layoutIfNeeded()
        startImageSearchFabSparkle()
    }
    
    // MARK: - Setup
    override func setupUI() {
        super.setupUI()
       
        view.backgroundColor = .backgroundPrimary
        
        // Setup custom navigation bar
        setupNavigationBar()
        
        // Configure table view
        if #available(iOS 15.0, *) {
            productTableView.sectionHeaderTopPadding = 0
        }

        // Add subviews in order: custom nav bar, search bar section, then table view
        view.addSubview(searchSectionView)
        searchSectionView.addSubview(searchBar)
        view.addSubview(productTableView)
        view.addSubview(floatingAISearchButton)
        
        // Adjust content inset to account for navigation bar
        productTableView.contentInsetAdjustmentBehavior = .automatic
        
        // Configure pull-to-refresh using the BaseViewControler implementation
        configPullToRefresh(tableview: productTableView)
        
        setupConstraints()
        setupInfoViewController()
        view.bringSubview(toFront: floatingAISearchButton)
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Home".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: true,
            backAction: .pop
        )
        
        // Add left buttons
        // Only show add button if user has canManageProducts permission
        if PermissionManager.shared.canManageProducts() {
            navBar.addLeftButton(addButton, size: CGSize(width: 44, height: 44))
        }
        navBar.addLeftButton(barcodeScanButton, size: CGSize(width: 44, height: 44))
        // AI search button moved to floating button - removed from navigation bar
        
        // Right: notifications, then cart (iPhone) / trash (iPad)
        navBar.addRightButton(notificationButton, size: CGSize(width: 44, height: 44))
        if UIDevice.current.userInterfaceIdiom == .pad {
            navBar.addRightButton(trashButton, size: CGSize(width: 44, height: 44))
        } else {
            navBar.addRightButton(cartButton, size: CGSize(width: 44, height: 44))
        }
    }
    
    private func setupConstraints() {
        // Remove table view from constraints if it exists
        productTableView.snp.removeConstraints()
        
        // Note: searchBar and productTableView constraints are set up in setupInfoViewController()
        // to handle both iPad and iPhone layouts differently. Pin the FAB to the product list
        // (not the full screen) so it stays on the left pane on iPad.
        floatingAISearchButton.snp.makeConstraints { make in
            make.width.height.equalTo(56)
            make.trailing.equalTo(productTableView.snp.trailing).offset(-16)
            make.bottom.equalTo(view.safeAreaLayoutGuide.snp.bottom).offset(-16)
        }
    }
    
    override func setupData() {
        super.setupData()
        viewModel.loadProducts()
    }
    
    private func setupViewModel() {
        viewModel.delegate = self
    }
    
    // MARK: - Helper Methods
    private func searchProducts(with text: String) {
        // Direct search when user taps button - no debounce
        viewModel.searchProducts(with: text)
    }
    
    // MARK: - Actions
    @objc private func addNewProduct() {
        controller = NewProductViewController()
        controller?.delegate = self
        // Hide system nav BEFORE present so the sheet doesn't reserve a blank safe-area gap
        presentWithHiddenNavigationBar(controller!, fullScreen: true)
    }
    
    @objc private func cartButtonTapped() {
        if UIDevice.current.userInterfaceIdiom == .phone {
            guard let info = infoViewController else {
                print("❌ infoViewController is nil on iPhone")
                return
            }
            self.navigationController?.pushViewController(info, animated: true)
        }
    }

    @objc private func notificationButtonTapped() {
        let inbox = NotificationsViewController()
        inbox.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(inbox, animated: true)
    }

    private func observeInboxUnreadCount() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInboxUnreadCountDidChange(_:)),
            name: .inboxUnreadCountDidChange,
            object: nil
        )
    }

    @objc private func handleInboxUnreadCountDidChange(_ notification: Notification) {
        if let count = notification.userInfo?["count"] as? Int {
            applyNotificationBadge(count: count)
        } else {
            refreshNotificationBadge()
        }
    }

    private func refreshNotificationBadge() {
        guard User.account() != nil else {
            applyNotificationBadge(count: 0)
            return
        }
        NotificationService.shared.getUnreadCount { [weak self] count, _ in
            self?.applyNotificationBadge(count: count ?? 0)
        }
    }

    private func applyNotificationBadge(count: Int) {
        notificationButton.badge = count > 0 ? "\(min(count, 99))" : nil
        let bellName = count > 0 ? "bell.badge" : "bell"
        notificationButton.setImage(UIImage(systemName: bellName), for: .normal)
    }
    
    @objc private func trashButtonTapped() {
        HapticFeedback.medium()
        
        // Show confirmation alert before clearing cart
        UIAlertController.alert(
            parent: self,
            title: "Clear Cart".localized(),
            message: "Are you sure you want to clear the cart? All items will be removed.".localized(),
            okTitle: "Yes, clear".localized(),
            cancelTitle: "Cancel".localized(),
            okAction: { [weak self] _ in
                self?.clean()
            },
            cancelAction: nil
        )
    }
    
    @objc private func barcodeScanTapped() {
        guard checkCameraPermission() else { return }
        
        readerVC.delegate = self
        readerVC.modalPresentationStyle = .formSheet
        present(readerVC, animated: true)
    }
    
    @objc private func aiSearchTapped() {
        HapticFeedback.medium()
        let imageSearchVC = ImageSearchViewController()
        let navController = UINavigationController(rootViewController: imageSearchVC)
        navController.modalPresentationStyle = .fullScreen
        present(navController, animated: true)
    }

    /// Sparkle twinkle on the AI icon only — the FAB stays still so the tap target is stable.
    private func startImageSearchFabSparkle() {
        guard let iconLayer = floatingAISearchButton.imageView?.layer else { return }
        guard iconLayer.animation(forKey: "aiSparkle") == nil else { return }
        if UIAccessibilityIsReduceMotionEnabled() { return }

        let scale = CAKeyframeAnimation(keyPath: "transform.scale")
        scale.values = [1.0, 1.16, 1.0]
        scale.keyTimes = [0, 0.45, 1]
        scale.duration = 1.5
        scale.repeatCount = .infinity
        scale.timingFunctions = [
            CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseOut),
            CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseInEaseOut),
        ]

        let tilt = CAKeyframeAnimation(keyPath: "transform.rotation.z")
        tilt.values = [0, 0.12, -0.1, 0]
        tilt.keyTimes = [0, 0.35, 0.7, 1]
        tilt.duration = 1.5
        tilt.repeatCount = .infinity

        let group = CAAnimationGroup()
        group.animations = [scale, tilt]
        group.duration = 1.5
        group.repeatCount = .infinity
        iconLayer.add(group, forKey: "aiSparkle")
    }

    private func stopImageSearchFabSparkle() {
        floatingAISearchButton.imageView?.layer.removeAnimation(forKey: "aiSparkle")
        floatingAISearchButton.imageView?.layer.transform = CATransform3DIdentity
    }
    
    private func checkCameraPermission() -> Bool {
        let authStatus = AVCaptureDevice.authorizationStatus(for: AVMediaType.video)
        switch authStatus {
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: AVMediaType.video) { [weak self] (granted: Bool) in
                if granted {
                    DispatchQueue.main.async {
                        self?.barcodeScanTapped()
                    }
                }
            }
            return false
        case .restricted, .denied:
            let alert = UIAlertController(
                title: "common.permission.camera.title".localized(),
                message: "common.permission.camera.settingsMessage".localized(),
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "common.action.settings".localized(), style: .default) { _ in
                if let url = URL(string: UIApplicationOpenSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            })
            alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
            present(alert, animated: true)
            return false
        case .authorized:
            return true
        @unknown default:
            return false
        }
    }
    
    private func setupPullToRefresh() {
        // If we're not in search mode, use the BaseViewControler's pull-to-refresh
        if !isSearchMode {
            configPullToRefresh(tableview: productTableView)
        } else {
            stopPullToRefresh()
        }
    }
    
    @objc private func refreshData() {
        startRefresh(self)
    }
    
    func previewOrders(sender: ProductCell, product: Product) {
        let controller = OrderCheckViewController()
        controller.delegate = self
        controller.loadProduct(product)
        self.navigationController?.present(UINavigationController(rootViewController: controller), animated: true, completion: {
        })
    }
    
    func viewImage(sender product: Product) {
        let controller = ImageProductViewController.instance(imageUrl: product.image_url ?? "")
        let nav = UINavigationController(rootViewController: controller)
        present(nav, animated: true)
    }
    
    private func presentProductView(product: Product) {
        let productId = product.id ?? product.product_id
        guard productId > 0 else {
            showProductEditor(product: product)
            return
        }

        // The list endpoint can contain a stale product object. Fetch the
        // detail record so pricingOptions (including DAILY) is always present
        // before the edit form is created.
        showProgressText(text: "Loading...".localized())
        ProductService.shared.loadProduct(productId: productId) { [weak self] latestProduct, error in
            DispatchQueue.main.async {
                guard let self = self else { return }
                self.hideProgress()

                if let error = error {
                    print("⚠️ Failed to load product detail for edit: \(error.localizedDescription)")
                }

                self.showProductEditor(product: latestProduct ?? product)
            }
        }
    }

    private func showProductEditor(product: Product) {
        let productController = NewProductViewController()
        productController.delegate = self

        // Embed first so loadProduct() can safely trigger viewDidLoad while
        // the child already has a navigationController. This lets the custom
        // navigation bar hide the system UINavigationBar instead of stacking
        // two bars with an extra top gap.
        let productNavigationController = UINavigationController(rootViewController: productController)
        productNavigationController.setNavigationBarHidden(true, animated: false)
        controller = productController
        productController.loadProduct(product: product)

        presentWithHiddenNavigationBar(productNavigationController, fullScreen: true)
    }
    
    private func setupInfoViewController() {
        infoViewController = InfoMainViewController()
        // Cart is a pushed workflow on iPhone and must keep the tab bar hidden,
        // including when returning from Order Detail.
        infoViewController?.hidesBottomBarWhenPushed = true
        
        if UIDevice.current.userInterfaceIdiom == .pad {
            if let infoVC = infoViewController {
                // Create a container view for the info view controller
                let containerView = UIView()
                containerView.backgroundColor = .systemBackground
                view.addSubview(containerView)
                
                // Add container view constraints
                // Start from below navigation bar (44pt height) to avoid overlap
                containerView.snp.makeConstraints { make in
                    make.top.equalTo(view.safeAreaLayoutGuide).offset(44)
                    make.leading.equalTo(view.snp.centerX)
                    make.trailing.equalToSuperview()
                    make.bottom.equalTo(view.safeAreaLayoutGuide)
                }
                
                // Add info view controller to container
                infoVC.view.frame = containerView.bounds
                containerView.addSubview(infoVC.view)
                
                // Add info view controller constraints
                infoVC.view.snp.makeConstraints { make in
                    make.edges.equalToSuperview()
                }
                
                // Adjust search bar and table view width for iPad
                guard let customNavBar = customNavBar else { return }
                searchSectionView.snp.remakeConstraints { make in
                    make.top.equalTo(customNavBar.snp.bottom)
                    make.leading.equalToSuperview()
                    make.trailing.equalTo(containerView.snp.leading)
                    make.height.equalTo(72)
                }

                searchBar.snp.remakeConstraints { make in
                    make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 20, bottom: 10, right: 20))
                }
                
                productTableView.snp.remakeConstraints { make in
                    make.top.equalTo(searchSectionView.snp.bottom)
                    make.leading.equalToSuperview()
                    make.trailing.equalTo(containerView.snp.leading)
                    make.bottom.equalToSuperview()
                }
                
                // Cart button is already in custom navigation bar
            }
        } else {
            // iPhone layout - use original constraints
            guard let customNavBar = customNavBar else { return }
            searchSectionView.snp.makeConstraints { make in
                make.top.equalTo(customNavBar.snp.bottom)
                make.leading.trailing.equalToSuperview()
                make.height.equalTo(72)
            }

            searchBar.snp.makeConstraints { make in
                make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 16, bottom: 10, right: 16))
            }
            
            productTableView.snp.makeConstraints { make in
                make.top.equalTo(searchSectionView.snp.bottom)
                make.leading.trailing.equalToSuperview()
                make.bottom.equalToSuperview()
            }
            
            // For iPhone, infoViewController is still needed for cart functionality
            // It will be presented modally when cart button is tapped
        }
    }
    
    private func clean() {
        // Clear cart completely
        CartStore.shared.resetCart()
        
        // Clear availability cache when clearing cart
        ProductAvailabilityCache.shared.clearAll()
        
        // Update cart badge
        updateCartBadge()
        
        // On iPad, reset InfoMainViewController to reflect cart changes
        // reset() will reload UI and update all labels/table
        if UIDevice.current.userInterfaceIdiom == .pad {
            infoViewController?.reset()
        }
        
        print("✅ Cart cleared completely")
    }
    
    public func updateCartBadge() {
        let itemCount = CartStore.shared.cart.itemCount
        cartButton.badge = itemCount == 0 ? nil : "\(itemCount)"
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        print("Table view frame: \(tableView?.frame ?? .zero)")
        print("Number of rows: \(tableView?.numberOfRows(inSection: 0) ?? 0)")
    }
    
    // Override startRefresh from BaseViewControler
    override func startRefresh(_ sender: Any) {
        viewModel.refreshProducts()
    }
}

// MARK: - UITableViewDataSource
extension MainViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return products.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(
            withIdentifier: String(describing: ProductCell.self),
            for: indexPath
        ) as! ProductCell
        cell.isUserInteractionEnabled = true
        cell.contentView.isUserInteractionEnabled = true
        cell.delegate = self
        
        let product = products[indexPath.row]
        cell.bind(product: product, searchWords: viewModel.searchWords)
        
        // Setup menu for more button
        cell.setupMoreButtonMenu(menu: createProductMenu(for: product, cell: cell))
        return cell
    }
}

// MARK: - UITableViewDelegate
extension MainViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        guard let infoVC = infoViewController else { return }
        
        let product = products[indexPath.row]
        
        // Determine price based on current cart order type
        let price: Double
        if CartStore.shared.cart.orderType == .rent {
            price = product.rentPrice ?? product.rent
        } else {
            price = product.salePrice ?? product.sale
        }
        
        // Add product directly to cart
        infoVC.addProduct(product: product, quantity: 1, price: price)
        updateCartBadge()
        
        // Show toast notification
        showToast(message: "Added to cart".localized(), icon: UIImage(systemName: "checkmark.circle.fill"))
    }
    
    // Removed heightForRowAt to allow automatic dimension
    // Cell height will adjust automatically based on content
    
    // MARK: - Scroll Detection for Pagination
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        let offsetY = scrollView.contentOffset.y
        let contentHeight = scrollView.contentSize.height
        let height = scrollView.frame.size.height
        
        // Trigger load more when user scrolls near the bottom (about 100 points from bottom)
        if offsetY > contentHeight - height - 100 {
            loadMoreProductsIfNeeded()
        }
    }
    
    private func loadMoreProductsIfNeeded() {
        viewModel.loadMoreProducts()
    }
}

// MARK: - UISearchBarDelegate
extension MainViewController: UISearchBarDelegate {
    func searchBarTextDidBeginEditing(_ searchBar: UISearchBar) {
        isSearchMode = true
    }
    
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        // Just update text when typing, don't trigger search yet
        // Search will only be triggered when user taps search button
    }
    
    func searchBarCancelButtonClicked(_ searchBar: UISearchBar) {
        // If exiting AI search mode, reload original products
        if isAISearchMode {
            isAISearchMode = false
            viewModel.refreshProducts()
        }
        
        isSearchMode = false
        searchBar.resignFirstResponder()
        viewModel.clearSearch()
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
        // Trigger search when user taps search button
        if let searchText = searchBar.text {
            searchProducts(with: searchText)
        }
    }
}

// MARK: - ProductCellDelegate
extension MainViewController: ProductCellDelegate {
    func more(product: Product, sender: ProductCell) {
        // This method is no longer used - menu is set directly on the button
        // Keeping for backward compatibility if needed
    }
    
    // MARK: - Product Menu
    private func createProductMenu(for product: Product, cell: ProductCell) -> UIMenu {
        var menuActions: [UIMenuElement] = []
        
        // Product check action
        let checkAction = UIAction(
            title: "product.action.viewOrderHistory".localized(),
            image: UIImage(systemName: "list.bullet.rectangle")
        ) { [weak self] _ in
            self?.previewOrders(sender: cell, product: product)
        }
        menuActions.append(checkAction)
        
        // Update and delete actions (only if user has permission)
        if PermissionManager.shared.canManageProducts() {
            let updateAction = UIAction(
                title: "product.action.update".localized(),
                image: UIImage(systemName: "pencil")
            ) { [weak self] _ in
                self?.presentProductView(product: product)
            }
            menuActions.append(updateAction)

            var syncAttributes: UIAction.Attributes = []
            if (product.image_url ?? "").isEmpty {
                syncAttributes.insert(.disabled)
            }
            let syncImageSearchAction = UIAction(
                title: "product.action.updateImageSearch".localized(),
                image: UIImage(systemName: "photo.on.rectangle.angled"),
                attributes: syncAttributes
            ) { [weak self] _ in
                self?.syncProductImageSearch(product)
            }
            menuActions.append(syncImageSearchAction)
            
            let deleteAction = UIAction(
                title: "product.action.delete".localized(),
                image: UIImage(systemName: "trash"),
                attributes: .destructive
            ) { [weak self] _ in
                self?.handleProductDeletion(product)
            }
            menuActions.append(deleteAction)
        }
        
        return UIMenu(children: menuActions)
    }
    
    private func handleProductDeletion(_ product: Product) {
        showDeleteConfirmation(for: product) { [weak self] in
            self?.deleteProduct(product)
        }
    }

    private func syncProductImageSearch(_ product: Product) {
        guard let productId = product.id else { return }
        if (product.image_url ?? "").isEmpty {
            showToast(
                message: "product.imageSearch.noPhotos".localized(),
                duration: 3.5,
                icon: UIImage(systemName: "exclamationmark.triangle")
            )
            return
        }

        showProgressText(text: "Loading...".localized())
        ProductService.shared.syncProductEmbeddings(productId: productId) { [weak self] error in
            self?.hideProgress()
            if let error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else {
                self?.showToast(
                    message: "product.imageSearch.queued".localized(),
                    duration: 3.5,
                    icon: UIImage(systemName: "checkmark.circle.fill")
                )
            }
        }
    }
    
    private func deleteProduct(_ product: Product) {
        viewModel.deleteProduct(product) { [weak self] success, error in
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if success {
                self?.tableView?.reloadData()
            }
        }
    }
}

extension MainViewController: QRCodeReaderViewControllerDelegate {
    func readerDidCancel(_ reader: QRCodeReaderViewController) {
        dismiss(animated: true)
    }
    
    func reader(_ reader: QRCodeReaderViewController, didScanResult result: QRCodeReaderResult) {
        reader.stopScanning()
        
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
        AudioServicesPlaySystemSound(1016)
        
        dismiss(animated: true) {
            if result.value.count >= 2 {
                self.searchBar.text = String(result.value.suffix(5))
                self.isSearchMode = true
                self.searchProducts(with: self.searchBar.text!)
            }
        }
    }
}

// MARK: - NewProductViewControllerDelegate
extension MainViewController: NewProductViewControllerDelegate {
    func didAddNewProduct(product: Product) {
        controller?.dismiss(animated: true) {
            self.viewModel.refreshProducts()
        }
    }
    
    func didUpdateProduct(product: Product) {
        controller?.dismiss(animated: true) {
            self.viewModel.refreshProducts()
        }
    }
}

// MARK: - OrderCheckViewControllerDelegate
extension MainViewController: OrderCheckViewControllerDelegate {
    func didSelectOrder(order: Order, sender: OrderCheckViewController) {
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
                let orderViewController = PreviewViewController(order: fullOrder)
                orderViewController.hidesBottomBarWhenPushed = true
                orderViewController.delegate = self
                self.navigationController?.pushViewController(orderViewController, animated: true)
            }
        }
    }
}

// MARK: - PreviewViewControllerDelegate
extension MainViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        clean()
    }
}

// MARK: - InfoCustomerViewDelegate
extension MainViewController: InfoCustomerViewDelegate {
    func infoView(sender: InfoCustomerView) {
        // Handle customer info view actions if needed
    }
}

// MARK: - MainViewModelDelegate
extension MainViewController: MainViewModelDelegate {
    func didUpdateProducts(_ products: [Product]) {
        self.products = products
        tableView?.reloadData()
    }
    
    func didUpdateLoadingState(_ isLoading: Bool) {
        if isLoading {
            showProgressText(text: "Loading...".localized())
        } else {
            hideProgress()
            endRefresh()
        }
    }
    
    func didShowError(_ error: Error) {
        UIAlertController.errorAlert(parent: self, error: error)
    }
    
    func didUpdatePagination(hasMore: Bool, currentPage: Int) {
        // Handle pagination updates if needed
        print("📦 Pagination updated - Page: \(currentPage), HasMore: \(hasMore)")
    }
}

// MARK: - Alert Helper
extension MainViewController {
    private func showDeleteConfirmation(for product: Product, completion: @escaping () -> Void) {
        let message = (product.name ?? "")
        UIAlertController.alertConfirmWithStyle(
            parent: self,
            title: "You're deleting this product:".localized(),
            message: message,
            specialMessage: "",
            okAction: { _ in completion() },
            cancelAction: nil
        )
    }
}
