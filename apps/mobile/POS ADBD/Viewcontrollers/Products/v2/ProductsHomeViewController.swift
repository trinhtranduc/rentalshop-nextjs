//
//  ProductsHomeViewController.swift
//  POS ADBD
//
//  Redesigned Home tab (#373, flag `newProducts`, board SP-dong): products with images, search, barcode scan,
//  category chips, "+" to the cart and a floating cart bar.
//

import UIKit
import SnapKit
import QRCodeReader
import AVFoundation
import AudioToolbox

final class ProductsHomeViewController: BaseViewControler {
    private let viewModel = ProductsHomeViewModel()
    private var categories: [Category] = []
    private let searchDebouncer = DebounceManager(delay: 0.3)

    private let header = UIView()
    private let shopLabel = V2.label(size: 13, color: DS.Color.textMuted)
    private let titleLabel = V2.label("products.home.title".localized(), size: 24, weight: .bold)
    private let searchField = UITextField()
    private let chipsScroll = UIScrollView()
    private let chipsStack = UIStackView()
    private lazy var list: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.dataSource = self
        table.delegate = self
        table.separatorStyle = .none
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 92
        table.keyboardDismissMode = .onDrag
        table.register(ProductRowV2Cell.self, forCellReuseIdentifier: ProductRowV2Cell.reuseId)
        table.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 96, right: 0)
        return table
    }()
    private let emptyLabel = V2.label(size: 15, color: DS.Color.textMuted, lines: 0)
    private let cartBar = UIControl()
    private let cartCountLabel = V2.label(size: 13, color: UIColor.white.withAlphaComponent(0.85))
    private let cartTotalLabel = V2.label(size: 16, weight: .bold, color: .white)
    private let notificationButton = BadgeButton(frame: CGRect(x: 0, y: 0, width: 44, height: 44))

    private lazy var reader: QRCodeReaderViewController = {
        let builder = QRCodeReaderViewControllerBuilder {
            $0.reader = QRCodeReader(metadataObjectTypes: [.code39, .code128], captureDevicePosition: .back)
        }
        return QRCodeReaderViewController(builder: builder)
    }()

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildHeader()
        buildList()
        buildCartBar()
        bindViewModel()
        NotificationCenter.default.addObserver(self, selector: #selector(cartChanged), name: .cartStoreDidChange, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(inboxCountChanged(_:)), name: .inboxUnreadCountDidChange, object: nil)
        viewModel.reload()
        loadCategories()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        updateCartBar()
        refreshNotificationBadge()
    }

    override func startRefresh(_ sender: Any) {
        viewModel.reload()
        loadCategories()
    }

    // MARK: - Layout

    private func buildHeader() {
        let user = User.current()
        shopLabel.text = [user?.merchant?.name, user?.outlet?.name].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")

        notificationButton.setImage(UIImage(systemName: "bell"), for: .normal)
        notificationButton.tintColor = DS.Color.text
        notificationButton.badgeBackgroundColor = DS.Color.primary
        notificationButton.badgeTextColor = .white
        notificationButton.badgeFont = Utils.mediumFont(size: 11)
        notificationButton.badgeEdgeInsets = UIEdgeInsets(top: 18, left: 0, bottom: 0, right: 13)
        notificationButton.accessibilityLabel = "Notifications".localized()
        notificationButton.addTarget(self, action: #selector(openInbox), for: .touchUpInside)

        let addButton = iconButton("plus", label: "product.action.add.accessibility".localized(), action: #selector(addProduct))
        addButton.isHidden = !ProductAccess.canCreate(role: ProductAccess.currentRole, permissions: ProductAccess.currentPermissions)

        let titles = UIStackView(arrangedSubviews: [shopLabel, titleLabel])
        titles.axis = .vertical
        let topRow = UIStackView(arrangedSubviews: [titles, UIView(), addButton, notificationButton])
        topRow.alignment = .center
        topRow.spacing = 4
        notificationButton.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }

        let searchBox = UIView()
        searchBox.backgroundColor = V2.chipFill
        searchBox.layer.cornerRadius = 12
        let glass = UIImageView(image: UIImage(systemName: "magnifyingglass"))
        glass.tintColor = DS.Color.textMuted
        searchField.placeholder = "products.search.placeholder".localized()
        searchField.font = Utils.regularFont(size: 15)
        searchField.clearButtonMode = .whileEditing
        searchField.returnKeyType = .search
        searchField.autocorrectionType = .no
        searchField.accessibilityLabel = "products.search.placeholder".localized()
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchField.delegate = self
        searchBox.addSubview(glass)
        searchBox.addSubview(searchField)
        glass.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(18)
        }
        searchField.snp.makeConstraints { make in
            make.leading.equalTo(glass.snp.trailing).offset(8)
            make.trailing.equalToSuperview().offset(-8)
            make.top.bottom.equalToSuperview()
        }
        let photoButton = squareButton("camera", label: "AI Image Search".localized(), action: #selector(imageSearch))
        let scanButton = squareButton("barcode.viewfinder", label: "common.action.scanBarcode".localized(), action: #selector(scanBarcode))
        let searchRow = UIStackView(arrangedSubviews: [searchBox, photoButton, scanButton])
        searchRow.spacing = 8
        searchBox.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }

        chipsStack.axis = .horizontal
        chipsStack.spacing = 8
        chipsScroll.showsHorizontalScrollIndicator = false
        chipsScroll.addSubview(chipsStack)
        chipsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 0, right: DS.Spacing.lg))
            make.height.equalToSuperview()
        }

        let column = UIStackView(arrangedSubviews: [topRow, searchRow])
        column.axis = .vertical
        column.spacing = 12
        header.backgroundColor = .white
        header.addSubview(column)
        header.addSubview(chipsScroll)
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
        chipsScroll.snp.makeConstraints { make in
            make.top.equalTo(column.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(40)
        }
        bottomLine.snp.makeConstraints { make in
            make.top.equalTo(chipsScroll.snp.bottom).offset(12)
            make.leading.trailing.bottom.equalToSuperview()
        }
        renderChips()
    }

    private func buildList() {
        view.addSubview(list)
        list.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        configPullToRefresh(tableview: list)
        emptyLabel.textAlignment = .center
        view.addSubview(emptyLabel)
        emptyLabel.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(48)
            make.leading.trailing.equalToSuperview().inset(32)
        }
    }

    private func buildCartBar() {
        cartBar.backgroundColor = DS.Color.text
        cartBar.layer.cornerRadius = 16
        cartBar.layer.shadowColor = UIColor.black.cgColor
        cartBar.layer.shadowOpacity = 0.25
        cartBar.layer.shadowRadius = 10
        cartBar.layer.shadowOffset = CGSize(width: 0, height: 8)
        cartBar.addTarget(self, action: #selector(openCart), for: .touchUpInside)
        cartBar.isAccessibilityElement = true
        cartBar.accessibilityTraits = UIAccessibilityTraitButton
        let texts = UIStackView(arrangedSubviews: [cartCountLabel, cartTotalLabel])
        texts.axis = .vertical
        texts.isUserInteractionEnabled = false
        let go = V2.label("products.cart.create".localized() + " ›", size: 15, weight: .bold, color: .white)
        cartBar.addSubview(texts)
        cartBar.addSubview(go)
        view.addSubview(cartBar)
        cartBar.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(12)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-12)
            make.height.equalTo(56)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.centerY.equalToSuperview()
        }
        go.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-16)
            make.centerY.equalToSuperview()
        }
        updateCartBar()
    }

    private func iconButton(_ symbol: String, label: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 20, weight: .regular)), for: .normal)
        button.tintColor = DS.Color.text
        button.accessibilityLabel = label
        button.addTarget(self, action: action, for: .touchUpInside)
        button.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        return button
    }

    private func squareButton(_ symbol: String, label: String, action: Selector) -> UIButton {
        let button = iconButton(symbol, label: label, action: action)
        button.backgroundColor = V2.chipFill
        button.layer.cornerRadius = 12
        return button
    }

    // MARK: - Data

    private func bindViewModel() {
        viewModel.onChange = { [weak self] in
            guard let self else { return }
            self.endRefresh()
            self.list.reloadData()
            let empty = self.viewModel.products.isEmpty && !self.viewModel.isLoading
            self.emptyLabel.isHidden = !empty
            self.emptyLabel.text = self.viewModel.query == nil ? "products.empty".localized() : "products.search.empty".localized()
        }
        viewModel.onError = { [weak self] error in
            self?.endRefresh()
            UIAlertController.errorAlert(parent: self, error: error)
        }
    }

    private func loadCategories() {
        CategoryService.shared.loadCategories(keyword: nil, page: 1, limit: 100) { [weak self] response, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                self.categories = (response?.categories ?? []).filter { $0.isActive != false && $0.id != nil }
                self.renderChips()
            }
        }
    }

    private func renderChips() {
        chipsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let items: [(Int?, String)] = [(nil, "products.category.all".localized())] + categories.map { ($0.id, $0.name ?? "") }
        for (id, name) in items {
            let chip = UIButton(type: .custom)
            let on = id == viewModel.categoryId
            chip.setTitle(name, for: .normal)
            chip.titleLabel?.font = on ? Utils.boldFont(size: 14) : Utils.regularFont(size: 14)
            chip.setTitleColor(on ? .white : DS.Color.text, for: .normal)
            chip.backgroundColor = on ? DS.Color.text : .white
            chip.layer.cornerRadius = 20
            chip.layer.borderWidth = on ? 0 : 1
            chip.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
            chip.contentEdgeInsets = UIEdgeInsets(top: 0, left: 14, bottom: 0, right: 14)
            chip.tag = id ?? -1
            chip.accessibilityTraits = on ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            chipsStack.addArrangedSubview(chip)
        }
        chipsScroll.isHidden = categories.isEmpty
    }

    private func updateCartBar() {
        let cart = CartStore.shared.cart
        cartBar.isHidden = cart.items.isEmpty
        cartCountLabel.text = String(format: "products.cart.bar".localized(), cart.itemCount)
        cartTotalLabel.text = MoneyFormatter.format(cart.totalAmount)
        cartBar.accessibilityLabel = [cartCountLabel.text, cartTotalLabel.text, "products.cart.create".localized()]
            .compactMap { $0 }.joined(separator: ", ")
        list.contentInset.bottom = cart.items.isEmpty ? 16 : 96
    }

    private func refreshNotificationBadge() {
        guard User.account() != nil else { return }
        NotificationService.shared.getUnreadCount { [weak self] count, _ in
            self?.applyBadge(count ?? 0)
        }
    }

    private func applyBadge(_ count: Int) {
        notificationButton.badge = count > 0 ? "\(min(count, 99))" : nil
        notificationButton.setImage(UIImage(systemName: count > 0 ? "bell.badge" : "bell"), for: .normal)
    }

    // MARK: - Actions

    @objc private func inboxCountChanged(_ note: Notification) {
        if let count = note.userInfo?["count"] as? Int { applyBadge(count) } else { refreshNotificationBadge() }
    }

    @objc private func cartChanged() {
        updateCartBar()
    }

    @objc private func searchChanged() {
        let text = searchField.text
        searchDebouncer.debounce { [weak self] in
            self?.viewModel.setQuery(text)
        }
    }

    @objc private func chipTapped(_ sender: UIButton) {
        viewModel.setCategory(sender.tag < 0 ? nil : sender.tag)
        renderChips()
    }

    @objc private func openInbox() {
        let inbox = NotificationsViewController()
        inbox.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(inbox, animated: true)
    }

    @objc private func addProduct() {
        let form = ProductFormViewController(product: nil)
        form.onSaved = { [weak self] product in
            self?.viewModel.replace(product)
        }
        presentWithHiddenNavigationBar(form, fullScreen: true)
    }

    @objc private func openCart() {
        let cart = CartV2ViewController()
        cart.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(cart, animated: true)
    }

    @objc private func imageSearch() {
        let search = ImageSearchViewController()
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
        LiveProductsHomeDataSource().loadProducts(query: code, categoryId: nil, page: 1, limit: 20) { [weak self] page, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else if let product = BarcodeMatch.exact(code, in: page?.products ?? []) {
                    self.openDetail(product)
                } else {
                    self.showToast(message: String(format: "products.scan.notFound".localized(), code),
                                   icon: UIImage(systemName: "exclamationmark.triangle"))
                }
            }
        }
    }

    private func openDetail(_ product: Product) {
        let detail = ProductDetailViewController(product: product)
        detail.hidesBottomBarWhenPushed = true
        detail.onSaved = { [weak self] saved in self?.viewModel.replace(saved) }
        navigationController?.pushViewController(detail, animated: true)
    }

    fileprivate func addToCart(_ product: Product) {
        ProductsCartBridge.add(product)
        HapticFeedback.light()
        showToast(message: "Added to cart".localized(), icon: UIImage(systemName: "checkmark.circle.fill"))
    }
}

/// Adds a product the same way the old Home does (price by the cart's order type)
enum ProductsCartBridge {
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
        viewModel.products.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ProductRowV2Cell.reuseId, for: indexPath) as! ProductRowV2Cell
        let product = viewModel.products[indexPath.row]
        cell.bind(product)
        cell.onAdd = { [weak self] in self?.addToCart(product) }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        openDetail(viewModel.products[indexPath.row])
    }

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        if indexPath.row >= viewModel.products.count - 4 { viewModel.loadMore() }
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
    private let nameLabel = V2.label(size: 15, weight: .bold)
    private let metaLabel = V2.label(size: 13, color: DS.Color.textMuted)
    private let stockLabel = V2.label(size: 12, weight: .bold)
    private let priceLabel = V2.label(size: 15, lines: 2)
    private let addButton = UIButton(type: .system)
    var onAdd: (() -> Void)?

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .default
        let metaRow = UIStackView(arrangedSubviews: [metaLabel, stockLabel])
        metaRow.spacing = 8
        metaLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        stockLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        let texts = UIStackView(arrangedSubviews: [nameLabel, metaRow, priceLabel])
        texts.axis = .vertical
        texts.spacing = 3
        texts.alignment = .leading
        addButton.setImage(UIImage(systemName: "plus", withConfiguration: UIImage.SymbolConfiguration(pointSize: 16, weight: .bold)), for: .normal)
        addButton.layer.cornerRadius = 12
        addButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        contentView.addSubview(photo)
        contentView.addSubview(texts)
        contentView.addSubview(addButton)
        let line = V2.divider()
        contentView.addSubview(line)
        photo.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.top.greaterThanOrEqualToSuperview().offset(10)
            make.centerY.equalToSuperview()
        }
        addButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalTo(photo.snp.trailing).offset(12)
            make.trailing.equalTo(addButton.snp.leading).offset(-12)
            make.top.equalToSuperview().offset(10)
            make.bottom.equalToSuperview().offset(-10)
        }
        contentView.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(88) }
        line.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func bind(_ product: Product) {
        nameLabel.text = product.name
        photo.image = V2.placeholder
        photo.contentMode = .center
        if let url = product.image_url ?? product.images?.first, let link = URL(string: url) {
            photo.kf.setImage(with: link, placeholder: V2.placeholder, options: [.transition(.fade(0.1))]) { [weak photo] result in
                if case .success = result { photo?.contentMode = .scaleAspectFill }
            }
        }
        let meta = [product.category?.name, product.barcode].compactMap { $0 }.filter { !$0.isEmpty }
        metaLabel.text = meta.joined(separator: " · ")
        let free = ProductStock.freeToday(product)
        if free > 0 {
            stockLabel.text = "● " + String(format: "products.stock.free".localized(), free)
            stockLabel.textColor = free == 1 ? V2.warn : V2.ok
        } else {
            stockLabel.text = "● " + "products.stock.noneToday".localized()
            stockLabel.textColor = V2.danger
        }

        let text = NSMutableAttributedString()
        let strong: [NSAttributedString.Key: Any] = [NSAttributedString.Key.font: Utils.boldFont(size: 15), NSAttributedString.Key.foregroundColor: DS.Color.text]
        let muted: [NSAttributedString.Key: Any] = [NSAttributedString.Key.font: Utils.regularFont(size: 13), NSAttributedString.Key.foregroundColor: DS.Color.textMuted]
        var parts: [String] = []
        if let perRental = ProductPricing.perRental(product) {
            text.append(NSAttributedString(string: MoneyFormatter.format(perRental), attributes: strong))
            text.append(NSAttributedString(string: "products.unit.perRental".localized(), attributes: muted))
            if let perDay = ProductPricing.perDay(product) {
                parts.append(MoneyFormatter.format(perDay) + "products.unit.perDay".localized())
            }
        } else if let perDay = ProductPricing.perDay(product) {
            text.append(NSAttributedString(string: MoneyFormatter.format(perDay), attributes: strong))
            text.append(NSAttributedString(string: "products.unit.perDay".localized(), attributes: muted))
        }
        if let sale = ProductPricing.sale(product) {
            parts.append(String(format: "products.price.saleShort".localized(), MoneyFormatter.format(sale)))
        }
        if !parts.isEmpty {
            text.append(NSAttributedString(string: (text.length > 0 ? " · " : "") + parts.joined(separator: " · "), attributes: muted))
        }
        priceLabel.attributedText = text

        let available = free > 0
        addButton.backgroundColor = available ? DS.Color.primary : V2.sectionFill
        addButton.tintColor = available ? .white : DS.Color.textMuted
        addButton.layer.borderWidth = available ? 0 : 1
        addButton.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        addButton.accessibilityLabel = String(format: "products.add.accessibility".localized(), product.name ?? "")
    }

    @objc private func addTapped() {
        onAdd?()
    }
}
