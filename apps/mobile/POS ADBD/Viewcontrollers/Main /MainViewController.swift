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
        table.contentInset = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
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
        button.accessibilityLabel = "Add product".localized()
        return button
    }()
    
    private lazy var barcodeScanButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 22, weight: .regular)
        button.setPreferredSymbolConfiguration(config, forImageIn: .normal)
        button.setImage(UIImage(systemName: "barcode.viewfinder"), for: .normal)
        button.tintColor = .textPrimary
        button.addTarget(self, action: #selector(barcodeScanTapped), for: .touchUpInside)
        button.accessibilityLabel = "Scan barcode".localized()
        return button
    }()
    
    // Floating Action Button for AI Image Search (DISABLED - feature WIP)
    private lazy var floatingAISearchButton: UIButton = {
        let button = UIButton(type: .custom)
        button.isHidden = true // Feature disabled - python embedding service removed
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
    
    private lazy var trashButton: UIButton = {
        let button = UIButton(type: .system)
        let config = UIImage.SymbolConfiguration(pointSize: 18, weight: .medium)
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
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
        // Set status bar style for white background
        setStatusBarStyle(.darkContent)
        
        // On iPad, reload cart in InfoMainViewController when view appears
        // This ensures cart is reloaded when switching back to home tab
        if UIDevice.current.userInterfaceIdiom == .pad {
            infoViewController?.reloadOrder()
        }
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Search debounce is now handled by ViewModel
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        tableView?.reloadData()
        // Ensure floating button is always on top after view appears
//        view.bringSubview(toFront: floatingAISearchButton)
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
        
        // Ensure floating button is always on top
//        view.bringSubview(toFront: floatingAISearchButton)
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
        
        // Add right button - cart for iPhone, trash for iPad
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
        // to handle both iPad and iPhone layouts differently
        
        // Setup floating AI search button - bottom right corner
        floatingAISearchButton.snp.makeConstraints { make in
            make.width.height.equalTo(64)
            make.trailing.equalToSuperview().offset(-20)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-20)
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
    
    private func performAISearch(with image: UIImage) {
        // Show loading
        showProgressText(text: "🤖 AI is searching for products...".localized())
        
        // Call image search API
        ProductService.shared.searchProductsByImage(
            image: image,
            limit: 50,
            minSimilarity: 0.6,
            categoryId: nil
        ) { [weak self] products, total, message, error in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                // Hide loading
                self.hideProgress()
                
                // Handle error
                if let error = error {
                    self.isAISearchMode = false
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                
                // Update products with AI search results
                if let products = products, !products.isEmpty {
                    self.products = products
                    self.isAISearchMode = true
                    self.tableView?.reloadData()
                    
                    // Show success message with count
                    let resultMessage = message ?? String(format: "Found %d similar products".localized(), total ?? products.count)
                    self.showSuccessAlert(message: resultMessage)
                } else {
                    // No results found
                    self.isAISearchMode = false
                    self.showNoResultsAlert()
                }
            }
        }
    }
    
    private func showSuccessAlert(message: String) {
        let alert = UIAlertController(
            title: "✅ Found products!".localized(),
            message: message,
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
    
    private func showNoResultsAlert() {
        let alert = UIAlertController(
            title: "No results found".localized(),
            message: "No similar products found. Try taking another photo or adjusting the angle.".localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - Actions
    @objc private func addNewProduct() {
        controller = NewProductViewController()
        controller?.delegate = self
        let nav = UINavigationController(rootViewController: controller!)
        present(nav, animated: true)
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
        // Open ImageSearchViewController for AI image search
//        let imageSearchVC = ImageSearchViewController()
//        let navController = UINavigationController(rootViewController: imageSearchVC)
//        navController.modalPresentationStyle = .fullScreen
//        present(navController, animated: true)
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
                title: "Camera Access".localized(),
                message: "Please enable camera access in Settings".localized(),
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "Settings".localized(), style: .default) { _ in
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
        controller = NewProductViewController()
        controller?.delegate = self
        controller?.loadProduct(product: product)
        if let controller = controller {
            self.navigationController?.present(UINavigationController(rootViewController: controller), animated: true, completion: {
            })
        }
    }
    
    private func setupInfoViewController() {
        infoViewController = InfoMainViewController()
        
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
            title: "Product check".localized(),
            image: UIImage(systemName: "list.bullet.rectangle")
        ) { [weak self] _ in
            self?.previewOrders(sender: cell, product: product)
        }
        menuActions.append(checkAction)
        
        // Update and delete actions (only if user has permission)
        if PermissionManager.shared.canManageProducts() {
            let updateAction = UIAction(
                title: "Update product".localized(),
                image: UIImage(systemName: "pencil")
            ) { [weak self] _ in
                self?.presentProductView(product: product)
            }
            menuActions.append(updateAction)
            
            let deleteAction = UIAction(
                title: "Delete product".localized(),
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

// MARK: - UIImagePickerControllerDelegate & UINavigationControllerDelegate
extension MainViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    func imagePickerController(
        _ picker: UIImagePickerController,
        didFinishPickingMediaWithInfo info: [String : Any]
    ) {
        picker.dismiss(animated: true)
        
        // Get captured image
        let image = (info[UIImagePickerControllerEditedImage] as? UIImage) ?? (info[UIImagePickerControllerOriginalImage] as? UIImage)
        
        guard let capturedImage = image else {
            let alert = UIAlertController(
                title: "Error".localized(),
                message: "Unable to load image. Please try again.".localized(),
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
            present(alert, animated: true)
            return
        }
        
        // Perform AI search with captured image
        performAISearch(with: capturedImage)
    }
    
    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}
