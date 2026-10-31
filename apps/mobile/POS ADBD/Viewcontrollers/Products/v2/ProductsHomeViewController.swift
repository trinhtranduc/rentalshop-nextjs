//
//  ProductsHomeViewController.swift
//  POS ADBD
//
//  Redesigned Home tab (#373, flag `newProducts`, board SP-dong): products with images, search with image search and
//  barcode scan inside the field, "+" (or the cart count) to the cart. The top-right cart button with its count is the
//  only way into the cart (#952 removed the floating cart bar).
//

import UIKit
import SnapKit
import QRCodeReader
import AVFoundation
import AudioToolbox

final class ProductsHomeViewController: BaseViewControler {
    private let viewModel = ProductsHomeViewModel()
    /// #677: an order changed (`OrdersChangeSignal`) while the list was off screen
    private var stockStale = false
    private let searchDebouncer = DebounceManager(delay: 0.3)

    private let header = UIView()
    /// #828: "🏬 <branch> ▾" for a merchant with several branches, else the branch name (replaces "shop · branch")
    private let outletButton = OutletHeaderButton()
    private let titleLabel = V2.label("products.home.title".localized(), size: DS.TextSize.title, weight: .bold)
    private let searchField = UITextField()
    private lazy var list: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.dataSource = self
        table.delegate = self
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = DS.Gap.productRowMinHeight
        table.keyboardDismissMode = .onDrag
        table.register(ProductRowV2Cell.self, forCellReuseIdentifier: ProductRowV2Cell.reuseId)
        table.register(ProductGridRowCell.self, forCellReuseIdentifier: ProductGridRowCell.reuseId)
        table.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 16, right: 0)
        return table
    }()
    private let emptyLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    /// #753: under the reason when the list could not load
    private let retryButton = UIButton(type: .system)
    /// #937: the cart (the bell moved to Cài đặt → Thông báo)
    private let cartButton = BadgeButton(frame: CGRect(x: 0, y: 0, width: 44, height: 44))
    /// #1079: with 2+ carts open, the cart in use above the tab bar
    private let cartBar = CartSwitchBar()
    /// #1393: "Bắt đầu: 3 việc", at the top of the list so it scrolls away with it
    private let guideHeader = UIView()
    private let guideCard = FirstRunGuideCardView()
    private var guideOnScreen: FirstRunGuideCard = .hidden
    private var guideHeaderWidth: CGFloat = 0
    private var emptyTop: Constraint?

    private lazy var reader: QRCodeReaderViewController = {
        let builder = QRCodeReaderViewControllerBuilder {
            $0.reader = QRCodeReader(metadataObjectTypes: [.code39, .code128], captureDevicePosition: .back)
        }
        return QRCodeReaderViewController(builder: builder)
    }()

    /// #973: products per row; 1 (the list) on iPhone, 2–4 on iPad by the list's width
    private var gridColumns = 1

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let columns = PadLayout.isPad ? HomeGrid.columns(width: list.bounds.width) : 1
        if columns != gridColumns {
            gridColumns = columns
            list.reloadData()
        }
        if guideOnScreen != .hidden, list.bounds.width != guideHeaderWidth { layoutGuideHeader() }
    }

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildHeader()
        buildList()
        bindViewModel()
        buildGuide()
        NotificationCenter.default.addObserver(self, selector: #selector(cartChanged), name: .cartStoreDidChange, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(ordersChanged), name: OrdersChangeSignal.name, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(outletChanged), name: .currentOutletDidChange, object: nil)
        // #1145: the owner changed the shop currency: money is redrawn
        NotificationCenter.default.addObserver(self, selector: #selector(currencyChanged), name: .shopCurrencyDidChange, object: nil)
        viewModel.reload()
    }

    /// #828: products and stock of the branch now in use
    @objc private func outletChanged() {
        updateCartBar()
        viewModel.reload()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        updateCartBar()
        outletButton.refresh()
        FirstRunGuideTracker.shared.refresh()
        applyGuide()
        // #677: an order was created or edited since the rows loaded: their stock is refreshed quietly
        if stockStale {
            stockStale = false
            viewModel.refreshQuietly()
        }
    }

    /// #677: "Còn N" / "Hết hôm nay" follow a created or edited order without a pull-to-refresh
    @objc private func ordersChanged() {
        guard isViewLoaded, view.window != nil else {
            stockStale = true
            return
        }
        viewModel.refreshQuietly()
    }

    override func startRefresh(_ sender: Any) {
        viewModel.reload()
        FirstRunGuideTracker.shared.refresh()
        CurrentOutlet.shared.refresh(onFallback: { [weak self] name in
            guard let self else { return }
            OutletSwitcher.showFallback(name, from: self)
        })
    }

    // MARK: - Layout

    private func buildHeader() {
        outletButton.presenter = self

        cartButton.setImage(DS.symbol(HomeCartButton.symbol, DS.Icon.lg), for: .normal)
        cartButton.tintColor = DS.Color.text
        cartButton.badgeBackgroundColor = DS.Color.primary
        cartButton.badgeTextColor = .white
        cartButton.badgeFont = Utils.mediumFont(size: DS.TextSize.pill)
        cartButton.badgeEdgeInsets = UIEdgeInsets(top: 18, left: 0, bottom: 0, right: 13)
        cartButton.accessibilityLabel = "Cart".localized()
        cartButton.addTarget(self, action: #selector(openCart), for: .touchUpInside)

        let addButton = iconButton("plus", size: DS.Icon.lg, label: "product.action.add.accessibility".localized(), action: #selector(addProduct))
        addButton.isHidden = !ProductAccess.canCreate(role: ProductAccess.currentRole, permissions: ProductAccess.currentPermissions)

        let titles = UIStackView(arrangedSubviews: [outletButton, titleLabel])
        titles.axis = .vertical
        titles.alignment = .leading
        // The button is 44 pt tall for touch; its pill is 32 pt, so the title sits right under it (board SP-dong)
        titles.setCustomSpacing(-4, after: outletButton)
        let topRow = UIStackView(arrangedSubviews: [titles, UIView(), addButton, cartButton])
        topRow.alignment = .center
        topRow.spacing = 4
        cartButton.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }

        let searchBox = UIView()
        searchBox.backgroundColor = V2.chipFill
        searchBox.layer.cornerRadius = 12
        let glass = UIImageView(image: DS.symbol("magnifyingglass", DS.Icon.sm))
        glass.tintColor = DS.Color.textMuted
        searchField.placeholder = "products.home.searchPlaceholder".localized()
        searchField.font = Utils.regularFont(size: DS.TextSize.body)
        searchField.clearButtonMode = .whileEditing
        searchField.returnKeyType = .search
        searchField.autocorrectionType = .no
        searchField.accessibilityLabel = "products.home.searchPlaceholder".localized()
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchField.delegate = self
        // Board SP-dong: barcode scan is an icon inside the field; #651: image search is the camera button at the end
        // so users see it (owner chose option B); #1384: gradient and sparkle
        let scanButton = iconButton("barcode.viewfinder", size: DS.Icon.md, label: "common.action.scanBarcode".localized(), action: #selector(scanBarcode))
        let photoButton = imageSearchButton()
        let fieldRow = UIStackView(arrangedSubviews: [glass, searchField, scanButton, photoButton])
        fieldRow.alignment = .center
        fieldRow.spacing = 0
        fieldRow.setCustomSpacing(8, after: glass)
        fieldRow.setCustomSpacing(4, after: searchField)
        searchField.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        searchBox.addSubview(fieldRow)
        glass.snp.makeConstraints { make in make.width.height.equalTo(18) }
        searchField.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        fieldRow.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-5)
            make.centerY.equalToSuperview()
        }
        searchBox.snp.makeConstraints { make in make.height.equalTo(48) }

        let column = UIStackView(arrangedSubviews: [topRow, searchBox])
        column.axis = .vertical
        column.spacing = 12
        header.backgroundColor = .white
        header.addSubview(column)
        let bottomLine = V2.divider()
        bottomLine.backgroundColor = DS.Color.border
        header.addSubview(bottomLine)
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
        }
        column.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        bottomLine.snp.makeConstraints { make in
            make.top.equalTo(column.snp.bottom).offset(12)
            make.leading.trailing.bottom.equalToSuperview()
        }
    }

    private func buildList() {
        view.addSubview(list)
        list.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        configPullToRefresh(tableview: list)
        view.addSubview(cartBar)
        cartBar.isHidden = true
        cartBar.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(10)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }
        cartBar.onSwitch = { [weak self] in self?.present(CartPickerSheet(), animated: true) }
        cartBar.onOpen = { [weak self] in self?.openCart() }
        emptyLabel.textAlignment = .center
        view.addSubview(emptyLabel)
        emptyLabel.snp.makeConstraints { make in
            emptyTop = make.top.equalTo(header.snp.bottom).offset(Self.emptyTopOffset).constraint
            make.leading.trailing.equalToSuperview().inset(32)
        }
        retryButton.setTitle("Retry".localized(), for: .normal)
        retryButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        retryButton.tintColor = DS.Color.primary
        retryButton.isHidden = true
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        view.addSubview(retryButton)
        retryButton.snp.makeConstraints { make in
            make.top.equalTo(emptyLabel.snp.bottom).offset(DS.Spacing.sm)
            make.centerX.equalToSuperview()
            make.height.equalTo(DS.touchTarget)
        }
    }

    @objc private func retryTapped() {
        viewModel.reload()
    }

    // MARK: - First-run guide (#1393)

    private static let emptyTopOffset: CGFloat = 48

    private func buildGuide() {
        guideHeader.addSubview(guideCard)
        guideCard.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.bottom.equalToSuperview().offset(-4)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        guideCard.onStep = { [weak self] step in self?.runGuide(step) }
        guideCard.onDismiss = { [weak self] in
            FirstRunGuideTracker.shared.skip()
            self?.showToast(message: "firstRunGuide.skipped".localized(), duration: 3)
        }
        guideCard.onCloseFinish = { FirstRunGuideTracker.shared.closeFinish() }
        NotificationCenter.default.addObserver(self, selector: #selector(guideChanged), name: FirstRunGuideTracker.didChange, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(guideRunStep(_:)), name: FirstRunGuideTracker.runStep, object: nil)
    }

    @objc private func guideChanged() {
        guard isViewLoaded else { return }
        applyGuide()
    }

    /// Cài đặt › Hướng dẫn bắt đầu: a row of the sheet was tapped and this tab is in front
    @objc private func guideRunStep(_ note: Notification) {
        guard let raw = note.userInfo?[FirstRunGuideTracker.stepKey] as? Int, let step = FirstRunGuideStep(rawValue: raw) else { return }
        runGuide(step)
    }

    /// The list is what ticks the product row: only while not searching and not on its way
    private func noteProductsForGuide() {
        guard viewModel.query == nil, !viewModel.isLoading else { return }
        let failed = viewModel.loadError != nil && viewModel.products.isEmpty
        FirstRunGuideTracker.shared.noteProducts(failed ? nil : !viewModel.products.isEmpty)
    }

    private func applyGuide() {
        let card = FirstRunGuideTracker.shared.card(searching: viewModel.query != nil)
        if case .steps = card { FirstRunGuideTracker.shared.noteCardShown() }
        guard card != guideOnScreen else { return }
        guideOnScreen = card
        if card == .hidden {
            list.tableHeaderView = nil
            emptyTop?.update(offset: Self.emptyTopOffset)
        } else {
            guideCard.show(card)
            layoutGuideHeader()
        }
    }

    private func layoutGuideHeader() {
        let width = list.bounds.width > 0 ? list.bounds.width : view.bounds.width
        guideHeaderWidth = list.bounds.width
        let size = guideHeader.systemLayoutSizeFitting(CGSize(width: width, height: UILayoutFittingCompressedSize.height),
                                                       withHorizontalFittingPriority: .required,
                                                       verticalFittingPriority: .fittingSizeLevel)
        guideHeader.frame = CGRect(x: 0, y: 0, width: width, height: size.height)
        list.tableHeaderView = guideHeader
        emptyTop?.update(offset: size.height + 44)
    }

    private func runGuide(_ step: FirstRunGuideStep) {
        let action = FirstRunGuide.action(for: step, hasProduct: FirstRunGuideTracker.shared.hasProduct,
                                          cartIsEmpty: CartStore.shared.cart.items.isEmpty)
        switch action {
        case .openProductForm:
            addProduct()
        case .openCart(let addFirstProduct):
            if addFirstProduct, let first = viewModel.products.first(where: listedHere) { addToCart(first) }
            openCart()
        }
    }

    /// #651, #1384: 38 pt gradient square with a white camera and sparkle; the touch area grows to 46 pt
    private func imageSearchButton() -> UIButton {
        let button = ImageSearchButton(type: .system)
        button.setImage(DS.aiScanIcon, for: .normal)
        button.tintColor = .white
        if let gradient = button.layer as? CAGradientLayer {
            gradient.colors = DS.Gradient.aiScan.map(\.cgColor)
            gradient.startPoint = CGPoint(x: 0, y: 0)
            gradient.endPoint = CGPoint(x: 1, y: 1)
        }
        button.layer.cornerRadius = 10
        button.accessibilityLabel = "products.home.imageSearch".localized()
        button.addTarget(self, action: #selector(imageSearch), for: .touchUpInside)
        button.snp.makeConstraints { make in make.width.height.equalTo(38) }
        return button
    }

    private func iconButton(_ symbol: String, size: CGFloat, label: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setImage(DS.symbol(symbol, size), for: .normal)
        button.tintColor = DS.Color.text
        button.accessibilityLabel = label
        button.addTarget(self, action: action, for: .touchUpInside)
        button.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        return button
    }

    // MARK: - Data

    private func bindViewModel() {
        viewModel.onChange = { [weak self] in
            guard let self else { return }
            self.endRefresh()
            self.list.reloadData()
            let state = ProductsHomeEmptyState.state(productCount: self.viewModel.products.count, isLoading: self.viewModel.isLoading,
                                                      hasQuery: self.viewModel.query != nil, error: self.viewModel.loadError)
            self.emptyLabel.isHidden = state == .none
            self.retryButton.isHidden = true
            switch state {
            case .none: break
            case .empty: self.emptyLabel.text = "products.empty".localized()
            case .searchEmpty: self.emptyLabel.text = "products.search.empty".localized()
            case .failed(let reason):
                self.emptyLabel.text = reason
                self.retryButton.isHidden = false
            }
            self.noteProductsForGuide()
            self.applyGuide()
        }
        viewModel.onError = { [weak self] error in
            guard let self else { return }
            self.endRefresh()
            // With no rows the reason is on the screen with Retry (#753); the alert is for a list that has rows
            if !self.viewModel.products.isEmpty {
                UIAlertController.errorAlert(parent: self, error: error)
            }
        }
    }

    private func updateCartBar() {
        let cart = CartStore.shared.cart
        let showsBar = CartSwitchBar.shouldShow(cartCount: CartStore.shared.carts.count, itemCount: cart.itemCount, isEditMode: cart.isEditMode)
        cartBar.isHidden = !showsBar
        if showsBar { cartBar.configure(cart: cart) }
        list.contentInset.bottom = showsBar ? 88 : 16
        cartButton.badge = HomeCartButton.badge(itemCount: cart.itemCount)
        cartButton.accessibilityValue = HomeCartButton.accessibilityValue(itemCount: cart.itemCount)
    }

    // MARK: - Actions

    @objc private func currencyChanged() {
        guard isViewLoaded else { return }
        cartChanged()
    }

    @objc private func cartChanged() {
        updateCartBar()
        list.reloadData() // the + buttons show the cart count
    }

    @objc private func searchChanged() {
        let text = searchField.text
        searchDebouncer.debounce { [weak self] in
            self?.viewModel.setQuery(text)
        }
    }

    @objc private func addProduct() {
        let form = ProductFormViewController(product: nil)
        form.onSaved = { [weak self] product in
            self?.viewModel.replace(product)
        }
        V2.presentForm(form, from: self)
    }

    @objc private func openCart() {
        let cart = CartV2ViewController()
        cart.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(cart, animated: true)
    }

    @objc private func imageSearch() {
        let search = ImageSearchViewController()
        // #672: "Tìm bằng tên" on empty results lands in this search field with the keyboard up
        search.onSearchByName = { [weak self] in self?.searchField.becomeFirstResponder() }
        let nav = UINavigationController(rootViewController: search)
        nav.modalPresentationStyle = .fullScreen
        present(nav, animated: true)
    }

    @objc private func scanBarcode() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                if granted { DispatchQueue.main.async { self.scanBarcode() } }
            }
        case .authorized:
            reader.delegate = self
            reader.modalPresentationStyle = .formSheet
            present(reader, animated: true)
        default:
            let alert = UIAlertController(title: "common.permission.camera.title".localized(),
                                          message: "common.permission.camera.settingsMessage".localized(), preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "common.action.settings".localized(), style: .default) { _ in
                if let url = URL(string: UIApplicationOpenSettingsURLString) { UIApplication.shared.open(url) }
            })
            alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
            present(alert, animated: true)
        }
    }

    /// The search API also matches names; only an exact barcode opens a product
    private func findByBarcode(_ code: String) {
        showProgressText(text: "Loading...".localized())
        LiveProductsHomeDataSource().loadProducts(query: code, page: 1, limit: 20) { [weak self] page, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else if let product = BarcodeMatch.exact(code, in: page?.products ?? []) {
                    self.openDetail(product)
                } else {
                    self.reportMissingBarcode(code)
                }
            }
        }
    }

    /// #1346: a branch role's list holds only the products ticked at its branch. A code that exists but is not ticked here
    /// says so ("Chi nhánh này chưa hiện món này") instead of "not found"; there is no button to turn it on.
    private func reportMissingBarcode(_ code: String) {
        let notFound = { [weak self] in
            self?.showToast(message: String(format: "products.scan.notFound".localized(), code),
                            icon: UIImage(systemName: "exclamationmark.triangle"))
        }
        guard BranchListing.sendsListed(role: ProductAccess.currentRole, activeOutletCount: CurrentOutlet.shared.outlets.count) else {
            notFound()
            return
        }
        LiveProductsHomeDataSource(applyBranchListing: false).loadProducts(query: code, page: 1, limit: 20) { [weak self] page, _ in
            DispatchQueue.main.async {
                if BarcodeMatch.exact(code, in: page?.products ?? []) != nil {
                    self?.showToast(message: "products.scan.notListed".localized(), icon: UIImage(systemName: "exclamationmark.triangle"))
                } else {
                    notFound()
                }
            }
        }
    }

    private func openDetail(_ product: Product) {
        let detail = ProductDetailViewController(product: product)
        detail.hidesBottomBarWhenPushed = true
        detail.onSaved = { [weak self] saved in self?.viewModel.replace(saved) }
        detail.onDeleted = { [weak self] id in self?.viewModel.remove(productId: id) }
        navigationController?.pushViewController(detail, animated: true)
    }

    /// #1346: false only for the owner of a shop with two or more branches, on a product the branch in use does not list
    fileprivate func listedHere(_ product: Product) -> Bool {
        BranchListing.listedForRow(product, role: ProductAccess.currentRole, activeOutletCount: CurrentOutlet.shared.outlets.count,
                                   outletId: CurrentOutlet.shared.id)
    }

    fileprivate func removeFromCart(_ product: Product) {
        ProductsCartBridge.removeOne(productId: ProductRowLogic.cartId(product))
        HapticFeedback.light()
    }

    fileprivate func addToCart(_ product: Product) {
        ProductsCartBridge.add(product)
        HapticFeedback.light()
        // #893 (owner): no "added to cart" toast; the + button's count already says it (errors still toast)
        if HomeCartButton.showsAddedToast {
            showToast(message: "Added to cart".localized(), icon: UIImage(systemName: "checkmark.circle.fill"))
        }
    }
}

/// #937 (owner): the Home top-right cart button; the badge counts the cart's items.
/// #952 (owner): it is the only entry to the cart (no floating cart bar)
enum HomeCartButton {
    static let symbol = "basket"
    /// #893 (owner): no "added to cart" toast; the badge already says it
    static let showsAddedToast = false

    static func badge(itemCount: Int) -> String? {
        itemCount > 0 ? "\(min(itemCount, 99))" : nil
    }

    /// VoiceOver (and the UI tests): "Giỏ hàng · 3 món"; nothing when the cart is empty
    static func accessibilityValue(itemCount: Int) -> String? {
        itemCount > 0 ? PluralText.format("products.cart.bar", count: itemCount, itemCount) : nil
    }
}

/// Adds a product the same way the old Home does (price by the cart's order type)
enum ProductsCartBridge {
    /// #1084: the − of the row stepper: one unit less on the product's last line; the line goes at 0
    static func removeOne(productId: Int) {
        let items = CartStore.shared.cart.items
        guard let index = items.lastIndex(where: { $0.productId == productId }) else { return }
        if items[index].quantity > 1 {
            CartStore.shared.updateQuantity(at: index, quantity: items[index].quantity - 1)
        } else {
            CartStore.shared.removeItem(at: index)
        }
    }

    static func add(_ product: Product) {
        let cart = CartStore.shared.cart
        let price = cart.orderType == .rent ? (product.rentPrice ?? product.rent) : (product.salePrice ?? product.sale)
        CartStore.shared.addItem(CartItem(from: product, quantity: 1, price: price))
        if cart.orderType == .sale {
            CartStore.shared.syncPricesWithOrderType()
        }
    }
}

// MARK: - Table

extension ProductsHomeViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        gridColumns > 1 ? HomeGrid.rows(count: viewModel.products.count, columns: gridColumns) : viewModel.products.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if gridColumns > 1 { return gridCell(tableView, row: indexPath.row) }
        let cell = tableView.dequeueReusableCell(withIdentifier: ProductRowV2Cell.reuseId, for: indexPath) as! ProductRowV2Cell
        let product = viewModel.products[indexPath.row]
        let inCart = ProductRowLogic.cartCount(productId: ProductRowLogic.cartId(product), in: CartStore.shared.cart.items)
        cell.bind(product, inCart: inCart, listed: listedHere(product))
        cell.onAdd = { [weak self] in self?.addToCart(product) }
        cell.onRemove = { [weak self] in self?.removeFromCart(product) }
        // #472: the thumbnail opens the photo full screen; without a photo it opens detail like the row
        cell.onImage = { [weak self] in
            guard let self else { return }
            if let request = ProductImages.thumbnailTap(product) {
                self.present(ImageViewerViewController(request: request), animated: true)
            } else {
                self.openDetail(product)
            }
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard gridColumns == 1 else { return } // grid tiles open their own product
        openDetail(viewModel.products[indexPath.row])
    }

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        let shown = gridColumns > 1 ? HomeGrid.indices(row: indexPath.row, columns: gridColumns, count: viewModel.products.count).upperBound : indexPath.row
        if shown >= viewModel.products.count - 4 { viewModel.loadMore() }
    }

    /// #973 iPad: one grid row of up to `gridColumns` product tiles (the list row's design)
    private func gridCell(_ tableView: UITableView, row: Int) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ProductGridRowCell.reuseId) as! ProductGridRowCell
        cell.selectionStyle = .none
        let products = HomeGrid.indices(row: row, columns: gridColumns, count: viewModel.products.count).map { viewModel.products[$0] }
        cell.configure(columns: gridColumns, count: products.count) { [weak self] tile, index in
            guard let self else { return }
            let product = products[index]
            let inCart = ProductRowLogic.cartCount(productId: ProductRowLogic.cartId(product), in: CartStore.shared.cart.items)
            tile.bind(product, inCart: inCart, listed: listedHere(product))
            tile.onAdd = { [weak self] in self?.addToCart(product) }
            tile.onRemove = { [weak self] in self?.removeFromCart(product) }
            tile.onImage = { [weak self] in
                guard let self else { return }
                if let request = ProductImages.thumbnailTap(product) {
                    self.present(ImageViewerViewController(request: request), animated: true)
                } else {
                    self.openDetail(product)
                }
            }
        } onOpen: { [weak self] index in
            self?.openDetail(products[index])
        }
        return cell
    }
}

extension ProductsHomeViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        searchDebouncer.cancel()
        viewModel.setQuery(textField.text)
        return true
    }
}

extension ProductsHomeViewController: QRCodeReaderViewControllerDelegate {
    func readerDidCancel(_ reader: QRCodeReaderViewController) {
        dismiss(animated: true)
    }

    func reader(_ reader: QRCodeReaderViewController, didScanResult result: QRCodeReaderResult) {
        reader.stopScanning()
        AudioServicesPlaySystemSound(1016)
        let code = result.value.trimmingCharacters(in: .whitespacesAndNewlines)
        dismiss(animated: true) { [weak self] in
            guard !code.isEmpty else { return }
            self?.findByBarcode(code)
        }
    }
}

// MARK: - Row

final class ProductRowV2Cell: UITableViewCell {
    static let reuseId = "ProductRowV2Cell"
    private let photo = V2.thumbnail(size: 68, radius: 12)
    /// #937: up to two lines, then "…" (Home only)
    private let nameLabel: UILabel = {
        let label = V2.label(size: DS.TextSize.name, weight: .medium, lines: 2)
        label.lineBreakMode = .byTruncatingTail
        return label
    }()
    /// "● Còn N hôm nay" / "● Hết hôm nay": the colour carries the state (#468); 13pt semibold (#681)
    private let stockLabel = V2.label(size: 13, weight: .regular)
    private let priceLabel = V2.label(size: DS.TextSize.body, lines: 2)
    private let addButton = UIButton(type: .system)
    private let plusImage = DS.symbol("plus", DS.Icon.sm, weight: .semibold)
    /// #681: the + stays light until the product is in the cart
    private static let addFill = UIColor(hexString: "EFF4FF")
    var onAdd: (() -> Void)?
    /// #1084: the − of the stepper shown once the product is in the cart
    var onRemove: (() -> Void)?
    private let minusButton = UIButton(type: .system)
    private let plusButton = UIButton(type: .system)
    private let countLabel = V2.label(size: DS.TextSize.name, weight: .medium, color: DS.Color.text)
    private let stepper = UIStackView()
    /// A tap on the thumbnail (#472)
    var onImage: (() -> Void)?
    private lazy var photoTap = UITapGestureRecognizer(target: self, action: #selector(photoTapped))

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .default
        photo.isUserInteractionEnabled = true
        photo.addGestureRecognizer(photoTap)
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        priceLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        // #681: name, price, stock — one fact per line, 8 pt apart
        let texts = UIStackView(arrangedSubviews: [nameLabel, priceLabel, stockLabel])
        texts.axis = .vertical
        texts.spacing = DS.Spacing.sm
        texts.alignment = .fill
        texts.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        texts.setContentCompressionResistancePriority(UILayoutPriority(1), for: .horizontal)
        addButton.setImage(plusImage, for: .normal)
        addButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        addButton.setTitleColor(.white, for: .normal)
        addButton.layer.cornerRadius = DS.touchTarget / 2 // #671: round
        addButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        addButton.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        // #1084: − n + once the product is in the cart. Mockup A (owner 2026-10-19): a thin grey outline on white, blue
        // − and +, like the quantity box in the cart
        for (button, symbol) in [(minusButton, "minus"), (plusButton, "plus")] {
            button.setImage(DS.symbol(symbol, DS.Icon.sm, weight: .semibold), for: .normal)
            button.tintColor = DS.Color.primary
            button.snp.makeConstraints { make in make.width.equalTo(40); make.height.equalTo(DS.touchTarget) }
        }
        minusButton.addTarget(self, action: #selector(removeTapped), for: .touchUpInside)
        plusButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        countLabel.textAlignment = .center
        countLabel.setContentHuggingPriority(.required, for: .horizontal)
        countLabel.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(22) }
        stepper.axis = .horizontal
        stepper.alignment = .center
        stepper.addArrangedSubview(minusButton)
        stepper.addArrangedSubview(countLabel)
        stepper.addArrangedSubview(plusButton)
        stepper.backgroundColor = .white
        stepper.layer.borderWidth = 1
        stepper.layer.borderColor = UIColor(hexString: "CBD5E1").cgColor
        stepper.layer.cornerRadius = DS.touchTarget / 2
        stepper.isHidden = true
        stepper.setContentHuggingPriority(.required, for: .horizontal)
        stepper.setContentCompressionResistancePriority(.required, for: .horizontal)
        let trailing = UIStackView(arrangedSubviews: [addButton, stepper])
        trailing.alignment = .center
        let row = UIStackView(arrangedSubviews: [photo, texts, trailing])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 12
        contentView.addSubview(row)
        let line = V2.divider()
        contentView.addSubview(line)
        row.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.top.equalToSuperview().offset(DS.Gap.productRow)
            make.bottom.equalToSuperview().offset(-DS.Gap.productRow).priority(999)
            make.height.greaterThanOrEqualTo(DS.Gap.productRowMinHeight - 2 * DS.Gap.productRow)
        }
        line.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func bind(_ product: Product, inCart: Int, listed: Bool = true) {
        nameLabel.text = product.name
        photo.image = V2.placeholder
        photo.contentMode = .center
        // #472: with a photo the thumbnail is its own button; the placeholder leaves the tap to the row
        let thumbUrl = ProductImages.thumbnailUrl(product)
        photoTap.isEnabled = thumbUrl != nil
        photo.isAccessibilityElement = thumbUrl != nil
        photo.accessibilityTraits = UIAccessibilityTraitButton
        photo.accessibilityLabel = String(format: "products.image.view.accessibility".localized(), product.name ?? "")
        if let url = thumbUrl, let link = URL(string: url) {
            photo.kf.setImage(with: link, placeholder: V2.placeholder, options: [.transition(.fade(0.1))]) { [weak photo] result in
                if case .success = result { photo?.contentMode = .scaleAspectFill }
            }
        }
        let free = ProductRowLogic.subtitle(product).free
        if !listed {
            // #1346: the owner sees it, the branch in use does not list it (only the owner ticks it back, in the form)
            stockLabel.text = "● " + "products.listing.notShown".localized()
            stockLabel.textColor = DS.Color.textMuted
        } else if free > 0 {
            stockLabel.text = "● " + String(format: "products.stock.free".localized(), free)
            stockLabel.textColor = free == 1 ? V2.warn : V2.ok
        } else {
            stockLabel.text = "● " + "products.stock.noneToday".localized()
            stockLabel.textColor = V2.danger
        }

        let text = NSMutableAttributedString()
        let strong: [NSAttributedString.Key: Any] = [NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.name), NSAttributedString.Key.foregroundColor: DS.Color.text]
        let muted: [NSAttributedString.Key: Any] = [NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.secondary), NSAttributedString.Key.foregroundColor: DS.Color.textMuted]
        let unit: (ProductPricingMode) -> String = {
            switch $0 {
            case .perDay: return "products.unit.perDay".localized()
            case .block: return "products.unit.block".localized()
            case .perRental: return "products.unit.perRental".localized()
            }
        }
        if let price = ProductRowLogic.price(product) {
            if let mode = price.mainMode {
                text.append(NSAttributedString(string: MoneyFormatter.format(price.main), attributes: strong))
                text.append(NSAttributedString(string: unit(mode), attributes: muted))
                if let second = price.second, let secondMode = price.secondMode {
                    text.append(NSAttributedString(string: " · " + MoneyFormatter.format(second) + unit(secondMode), attributes: muted))
                }
                // #887: a product that also sells keeps its sale price last (board SP-dong)
                if let sale = price.sale {
                    text.append(NSAttributedString(string: " · " + String(format: "products.price.saleShort".localized(), MoneyFormatter.format(sale)), attributes: muted))
                }
            } else {
                text.append(NSAttributedString(string: String(format: "products.price.saleShort".localized(), MoneyFormatter.format(price.main)), attributes: muted))
            }
        }
        priceLabel.attributedText = text

        let name = product.name ?? ""
        addButton.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        switch ProductRowLogic.addState(free: free, inCart: inCart, listed: listed) {
        case .notListed:
            // #1346: nothing to add; the row still opens the product
            addButton.isHidden = true
            stepper.isHidden = true
        case .add, .out:
            addButton.isHidden = false
            stepper.isHidden = true
            // #671: out today still adds (another day can be rented), so the button keeps its colour.
            // #681: light until the product is in the cart
            addButton.setImage(plusImage, for: .normal)
            addButton.setTitle(nil, for: .normal)
            addButton.backgroundColor = Self.addFill
            addButton.tintColor = DS.Color.primary
            addButton.layer.borderWidth = 0
            addButton.accessibilityLabel = String(format: "products.add.accessibility".localized(), name)
        case .inCart(let count):
            // #1084 / #1090: the outlined − n + replaces the + once the product is in the cart
            addButton.isHidden = true
            stepper.isHidden = false
            countLabel.text = "\(count)"
            minusButton.accessibilityLabel = String(format: "products.stepper.minus".localized())
            plusButton.accessibilityLabel = String(format: "products.add.accessibility".localized(), name)
            countLabel.accessibilityLabel = String(format: "products.add.inCart.accessibility".localized(), name, count)
        }
    }

    @objc private func addTapped() {
        onAdd?()
    }

    @objc private func removeTapped() {
        onRemove?()
    }

    @objc private func photoTapped() {
        onImage?()
    }
}

/// #973 iPad: a row of product tiles. Each tile is the list row (`ProductRowV2Cell`) so it looks and acts the same:
/// + adds, the photo opens the photo, a tap elsewhere opens the product.
final class ProductGridRowCell: UITableViewCell {
    static let reuseId = "ProductGridRowCell"
    private let stack = UIStackView()
    private var tiles: [ProductRowV2Cell] = []
    private var onOpen: ((Int) -> Void)?
    private let tapFilter = TileTapFilter()

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.alignment = .fill
        contentView.addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview() }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(columns: Int, count: Int, bind: (ProductRowV2Cell, Int) -> Void, onOpen: @escaping (Int) -> Void) {
        self.onOpen = onOpen
        if tiles.count != columns {
            tiles.forEach { $0.removeFromSuperview() }
            tiles = (0..<columns).map { index in
                let tile = ProductRowV2Cell(style: .default, reuseIdentifier: nil)
                tile.selectionStyle = .none
                tile.tag = index
                // The tile is used as a view: its content decides its height
                tile.contentView.translatesAutoresizingMaskIntoConstraints = false
                tile.contentView.snp.makeConstraints { make in make.edges.equalToSuperview() }
                let tap = UITapGestureRecognizer(target: self, action: #selector(tileTapped(_:)))
                tap.delegate = tapFilter
                tile.addGestureRecognizer(tap)
                stack.addArrangedSubview(tile)
                return tile
            }
        }
        for (index, tile) in tiles.enumerated() {
            let used = index < count
            tile.alpha = used ? 1 : 0
            tile.isUserInteractionEnabled = used
            tile.accessibilityElementsHidden = !used
            if used { bind(tile, index) }
        }
    }

    @objc private func tileTapped(_ gesture: UITapGestureRecognizer) {
        guard let index = gesture.view?.tag else { return }
        onOpen?(index)
    }

}

/// The + button and a photo with its own tap keep their touches (#973 grid tiles)
private final class TileTapFilter: NSObject, UIGestureRecognizerDelegate {
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        var view = touch.view
        while let current = view, current !== gestureRecognizer.view {
            if current is UIControl { return false }
            if current.gestureRecognizers?.contains(where: { $0 !== gestureRecognizer && $0.isEnabled && $0 is UITapGestureRecognizer }) == true {
                return false
            }
            view = current.superview
        }
        return true
    }
}

/// A button whose touch area reaches 4 pt past its visible bounds (#651: 38 pt button, 46 pt target)
private final class ImageSearchButton: UIButton {
    /// The gradient is the button's own layer, so it always matches the bounds and stays under the icon
    override class var layerClass: AnyClass { CAGradientLayer.self }

    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        bounds.insetBy(dx: -4, dy: -4).contains(point)
    }
}
