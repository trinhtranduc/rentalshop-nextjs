//
//  ProductsHomeViewController.swift
//  POS ADBD
//
//  Redesigned Home tab (#373, flag `newProducts`, board SP-dong): products with images, search with image search and
//  barcode scan inside the field, "+" (or the cart count) to the cart and a floating cart bar (#383).
//

import UIKit
import SnapKit
import QRCodeReader
import AVFoundation
import AudioToolbox

final class ProductsHomeViewController: BaseViewControler {
    private let viewModel = ProductsHomeViewModel()
    private let searchDebouncer = DebounceManager(delay: 0.3)

    private let header = UIView()
    private let shopLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
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
        table.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 96, right: 0)
        return table
    }()
    private let emptyLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let cartBar = UIControl()
    private let cartCountLabel = V2.label(size: DS.TextSize.secondary, color: UIColor.white.withAlphaComponent(0.85))
    private let cartTotalLabel = V2.label(size: DS.TextSize.name, weight: .bold, color: .white)
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
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        updateCartBar()
        refreshNotificationBadge()
    }

    override func startRefresh(_ sender: Any) {
        viewModel.reload()
    }

    // MARK: - Layout

    private func buildHeader() {
        let user = User.current()
        shopLabel.text = [user?.merchant?.name, user?.outlet?.name].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " · ")

        notificationButton.setImage(DS.symbol("bell", DS.Icon.lg), for: .normal)
        notificationButton.tintColor = DS.Color.text
        notificationButton.badgeBackgroundColor = DS.Color.primary
        notificationButton.badgeTextColor = .white
        notificationButton.badgeFont = Utils.mediumFont(size: DS.TextSize.pill)
        notificationButton.badgeEdgeInsets = UIEdgeInsets(top: 18, left: 0, bottom: 0, right: 13)
        notificationButton.accessibilityLabel = "Notifications".localized()
        notificationButton.addTarget(self, action: #selector(openInbox), for: .touchUpInside)

        let addButton = iconButton("plus", size: DS.Icon.lg, label: "product.action.add.accessibility".localized(), action: #selector(addProduct))
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
        let glass = UIImageView(image: DS.symbol("magnifyingglass", DS.Icon.sm))
        glass.tintColor = DS.Color.textMuted
        searchField.placeholder = "products.search.placeholder".localized()
        searchField.font = Utils.regularFont(size: DS.TextSize.body)
        searchField.clearButtonMode = .whileEditing
        searchField.returnKeyType = .search
        searchField.autocorrectionType = .no
        searchField.accessibilityLabel = "products.search.placeholder".localized()
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchField.delegate = self
        // Board SP-dong: image search and barcode scan are icon buttons at the trailing end inside the field
        let photoButton = iconButton("camera", size: DS.Icon.md, label: "AI Image Search".localized(), action: #selector(imageSearch))
        let scanButton = iconButton("barcode.viewfinder", size: DS.Icon.md, label: "common.action.scanBarcode".localized(), action: #selector(scanBarcode))
        let fieldRow = UIStackView(arrangedSubviews: [glass, searchField, photoButton, scanButton])
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
            make.trailing.equalToSuperview().offset(-2)
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
        emptyLabel.textAlignment = .center
        view.addSubview(emptyLabel)
        emptyLabel.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(48)
            make.leading.trailing.equalToSuperview().inset(32)
        }
    }

    private func buildCartBar() {
        cartBar.backgroundColor = DS.Color.primary
        cartBar.layer.cornerRadius = 16
        cartBar.layer.shadowColor = DS.Color.primary.cgColor
        cartBar.layer.shadowOpacity = 0.28
        cartBar.layer.shadowRadius = 8
        cartBar.layer.shadowOffset = CGSize(width: 0, height: 6)
        cartBar.addTarget(self, action: #selector(openCart), for: .touchUpInside)
        cartBar.isAccessibilityElement = true
        cartBar.accessibilityTraits = UIAccessibilityTraitButton
        let texts = UIStackView(arrangedSubviews: [cartCountLabel, cartTotalLabel])
        texts.axis = .vertical
        texts.isUserInteractionEnabled = false
        let go = V2.label("products.cart.create".localized() + " ›", size: DS.TextSize.name, weight: .bold, color: .white)
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
            let empty = self.viewModel.products.isEmpty && !self.viewModel.isLoading
            self.emptyLabel.isHidden = !empty
            self.emptyLabel.text = self.viewModel.query == nil ? "products.empty".localized() : "products.search.empty".localized()
        }
        viewModel.onError = { [weak self] error in
            self?.endRefresh()
            UIAlertController.errorAlert(parent: self, error: error)
        }
    }

    private func updateCartBar() {
        let cart = CartStore.shared.cart
        cartBar.isHidden = cart.items.isEmpty
        cartCountLabel.text = PluralText.format("products.cart.bar", count: cart.itemCount, cart.itemCount)
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
        notificationButton.setImage(DS.symbol(count > 0 ? "bell.badge" : "bell", DS.Icon.lg), for: .normal)
    }

    // MARK: - Actions

    @objc private func inboxCountChanged(_ note: Notification) {
        if let count = note.userInfo?["count"] as? Int { applyBadge(count) } else { refreshNotificationBadge() }
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
        V2.presentForm(form, from: self)
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
        LiveProductsHomeDataSource().loadProducts(query: code, page: 1, limit: 20) { [weak self] page, error in
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
        detail.onDeleted = { [weak self] id in self?.viewModel.remove(productId: id) }
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
        let inCart = ProductRowLogic.cartCount(productId: ProductRowLogic.cartId(product), in: CartStore.shared.cart.items)
        cell.bind(product, inCart: inCart)
        cell.onAdd = { [weak self] in self?.addToCart(product) }
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
    private let nameLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    private let metaLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted)
    /// "● Còn N" / "● Hết hôm nay": 14pt regular, the colour carries the state (#468)
    private let stockLabel = V2.label(size: DS.TextSize.secondary)
    private let priceLabel = V2.label(size: DS.TextSize.body, lines: 2)
    private let addButton = UIButton(type: .system)
    private let plusImage = DS.symbol("plus", DS.Icon.sm, weight: .semibold)
    /// The + of a product already in the cart: the count on a darker blue (board SP-dong)
    private static let inCartFill = UIColor(hexString: "1E3A8A")
    var onAdd: (() -> Void)?
    /// A tap on the thumbnail (#472)
    var onImage: (() -> Void)?
    private lazy var photoTap = UITapGestureRecognizer(target: self, action: #selector(photoTapped))

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .default
        photo.isUserInteractionEnabled = true
        photo.addGestureRecognizer(photoTap)
        let spacer = UIView()
        spacer.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        spacer.setContentCompressionResistancePriority(UILayoutPriority(1), for: .horizontal)
        let metaRow = UIStackView(arrangedSubviews: [metaLabel, stockLabel, spacer])
        metaRow.spacing = 8
        metaLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        stockLabel.setContentCompressionResistancePriority(.defaultHigh, for: .horizontal)
        stockLabel.setContentHuggingPriority(.required, for: .horizontal)
        metaLabel.setContentHuggingPriority(.required, for: .horizontal)
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        priceLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let texts = UIStackView(arrangedSubviews: [nameLabel, metaRow, priceLabel])
        texts.axis = .vertical
        texts.spacing = DS.Gap.line
        texts.alignment = .fill
        texts.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        texts.setContentCompressionResistancePriority(UILayoutPriority(1), for: .horizontal)
        addButton.setImage(plusImage, for: .normal)
        addButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        addButton.setTitleColor(.white, for: .normal)
        addButton.layer.cornerRadius = 12
        addButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        addButton.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        let row = UIStackView(arrangedSubviews: [photo, texts, addButton])
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

    func bind(_ product: Product, inCart: Int) {
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
        let subtitle = ProductRowLogic.subtitle(product)
        metaLabel.text = subtitle.code
        metaLabel.isHidden = subtitle.code == nil
        let free = subtitle.free
        if free > 0 {
            stockLabel.text = "● " + String(format: "products.stock.free".localized(), free)
            stockLabel.textColor = free == 1 ? V2.warn : V2.ok
        } else {
            stockLabel.text = "● " + "products.stock.noneToday".localized()
            stockLabel.textColor = V2.danger
        }

        let text = NSMutableAttributedString()
        let strong: [NSAttributedString.Key: Any] = [NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.name), NSAttributedString.Key.foregroundColor: DS.Color.text]
        let muted: [NSAttributedString.Key: Any] = [NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.secondary), NSAttributedString.Key.foregroundColor: DS.Color.textMuted]
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

        let name = product.name ?? ""
        addButton.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        switch ProductRowLogic.addState(free: free, inCart: inCart) {
        case .add, .out:
            let available = free > 0
            addButton.setImage(plusImage, for: .normal)
            addButton.setTitle(nil, for: .normal)
            addButton.backgroundColor = available ? DS.Color.primary : V2.sectionFill
            addButton.tintColor = available ? .white : DS.Color.textMuted
            addButton.layer.borderWidth = available ? 0 : 1
            addButton.accessibilityLabel = String(format: "products.add.accessibility".localized(), name)
        case .inCart(let count):
            addButton.setImage(nil, for: .normal)
            addButton.setTitle("\(count)", for: .normal)
            addButton.backgroundColor = Self.inCartFill
            addButton.tintColor = .white
            addButton.layer.borderWidth = 0
            addButton.accessibilityLabel = String(format: "products.add.inCart.accessibility".localized(), name, count)
        }
    }

    @objc private func addTapped() {
        onAdd?()
    }

    @objc private func photoTapped() {
        onImage?()
    }
}
