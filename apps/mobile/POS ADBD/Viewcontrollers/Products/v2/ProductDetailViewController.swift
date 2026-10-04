//
//  ProductDetailViewController.swift
//  POS ADBD
//
//  Redesigned product detail (#373, flag `newProducts`, board SP-chi-tiet): photos, prices per rental / per day /
//  sale, rented and free units, and the product's orders.
//

import UIKit
import SnapKit

final class ProductDetailViewController: BaseViewControler {
    private var product: Product
    private var orders: [Order] = []
    private var ordersTotal = 0
    /// Bumped on each load; an older answer is dropped
    private var generation = 0
    var onSaved: ((Product) -> Void)?

    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let photos = UIScrollView()
    private let photoStack = UIStackView()
    private let pageLabel = V2.label(size: 12, weight: .bold, color: .white)
    private let nameLabel = V2.label(size: 22, weight: .bold, lines: 0)
    private let metaLabel = V2.label(size: 13, color: DS.Color.textMuted, lines: 0)
    private let tiles = UIStackView()
    private let stockLabel = V2.label(size: 14, color: DS.Color.textMuted, lines: 0)
    private let ordersHeader = V2.label("products.detail.orders".localized(), size: 16, weight: .bold)
    private let ordersCount = V2.label(size: 14, weight: .bold, color: DS.Color.primary)
    private let ordersStack = UIStackView()
    private let ordersEmpty = V2.label("products.detail.noOrders".localized(), size: 14, color: DS.Color.textMuted)

    private var productId: Int { product.id ?? product.product_id }

    init(product: Product) {
        self.product = product
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildLayout()
        render()
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    // MARK: - Layout

    private func buildLayout() {
        let bottom = UIView()
        bottom.backgroundColor = .white
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        bottom.addSubview(line)
        let calendarButton = V2.secondaryButton("products.detail.freeCalendar".localized())
        calendarButton.addTarget(self, action: #selector(openCalendar), for: .touchUpInside)
        let addButton = V2.primaryButton("products.detail.addToCart".localized())
        addButton.addTarget(self, action: #selector(addToCart), for: .touchUpInside)
        let buttons = UIStackView(arrangedSubviews: [calendarButton, addButton])
        buttons.spacing = 10
        bottom.addSubview(buttons)
        view.addSubview(bottom)
        bottom.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
        }
        line.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        buttons.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }
        calendarButton.snp.makeConstraints { make in make.width.equalTo(addButton).multipliedBy(0.5) }

        view.addSubview(scroll)
        scroll.contentInsetAdjustmentBehavior = .never
        scroll.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottom.snp.top)
        }
        content.axis = .vertical
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }

        // Photos with back / edit on top
        let photoBox = UIView()
        photoBox.backgroundColor = V2.chipFill
        photos.isPagingEnabled = true
        photos.showsHorizontalScrollIndicator = false
        photos.delegate = self
        photoStack.axis = .horizontal
        photos.addSubview(photoStack)
        photoBox.addSubview(photos)
        photoStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalToSuperview()
        }
        photos.snp.makeConstraints { make in make.edges.equalToSuperview() }
        let back = roundButton(symbol: "chevron.left", title: nil, label: "Back".localized(), action: #selector(goBack))
        photoBox.addSubview(back)
        back.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.width.height.equalTo(DS.touchTarget)
        }
        if ProductAccess.canEdit(role: ProductAccess.currentRole, permissions: ProductAccess.currentPermissions) {
            let edit = roundButton(symbol: nil, title: "products.detail.edit".localized(), label: "products.form.editTitle".localized(), action: #selector(editProduct))
            photoBox.addSubview(edit)
            edit.snp.makeConstraints { make in
                make.trailing.equalToSuperview().offset(-12)
                make.centerY.equalTo(back)
                make.height.equalTo(DS.touchTarget)
            }
        }
        pageLabel.backgroundColor = DS.Color.text.withAlphaComponent(0.6)
        pageLabel.layer.cornerRadius = 9
        pageLabel.clipsToBounds = true
        pageLabel.textAlignment = .center
        photoBox.addSubview(pageLabel)
        pageLabel.snp.makeConstraints { make in
            make.trailing.bottom.equalToSuperview().inset(10)
            make.height.equalTo(18)
            make.width.greaterThanOrEqualTo(36)
        }
        content.addArrangedSubview(photoBox)
        photoBox.snp.makeConstraints { make in
            make.height.equalTo(view.snp.width).multipliedBy(0.62)
        }

        // Name, meta, prices, stock
        let info = UIStackView(arrangedSubviews: [nameLabel, metaLabel, tiles, stockLabel])
        info.axis = .vertical
        info.spacing = 6
        info.setCustomSpacing(10, after: metaLabel)
        info.setCustomSpacing(10, after: tiles)
        tiles.axis = .horizontal
        tiles.distribution = .fillEqually
        tiles.spacing = 8
        info.isLayoutMarginsRelativeArrangement = true
        info.layoutMargins = UIEdgeInsets(top: 14, left: DS.Spacing.lg, bottom: 14, right: DS.Spacing.lg)
        content.addArrangedSubview(info)
        let band = UIView()
        band.backgroundColor = DS.Color.background
        band.snp.makeConstraints { make in make.height.equalTo(8) }
        content.addArrangedSubview(band)

        // Orders
        let ordersTitle = UIStackView(arrangedSubviews: [ordersHeader, UIView(), ordersCount])
        ordersTitle.alignment = .center
        ordersTitle.isLayoutMarginsRelativeArrangement = true
        ordersTitle.layoutMargins = UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 4, right: DS.Spacing.lg)
        content.addArrangedSubview(ordersTitle)
        ordersStack.axis = .vertical
        content.addArrangedSubview(ordersStack)
        ordersEmpty.isHidden = true
        let emptyWrap = UIStackView(arrangedSubviews: [ordersEmpty])
        emptyWrap.isLayoutMarginsRelativeArrangement = true
        emptyWrap.layoutMargins = UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 24, right: DS.Spacing.lg)
        content.addArrangedSubview(emptyWrap)
    }

    private func roundButton(symbol: String?, title: String?, label: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        if let symbol {
            button.setImage(UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(pointSize: 17, weight: .bold)), for: .normal)
        }
        if let title {
            button.setTitle(title, for: .normal)
            button.titleLabel?.font = Utils.boldFont(size: 14)
            button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 16)
        }
        button.tintColor = DS.Color.text
        button.setTitleColor(DS.Color.text, for: .normal)
        button.backgroundColor = UIColor.white.withAlphaComponent(0.92)
        button.layer.cornerRadius = DS.touchTarget / 2
        button.accessibilityLabel = label
        button.addTarget(self, action: action, for: .touchUpInside)
        return button
    }

    // MARK: - Render

    private func render() {
        nameLabel.text = product.name
        var meta = [product.category?.name, product.barcode].compactMap { $0 }.filter { !$0.isEmpty }
        if let deposit = product.deposit, deposit > 0 {
            meta.append(String(format: "products.detail.deposit".localized(), MoneyFormatter.format(deposit)))
        }
        metaLabel.text = meta.joined(separator: " · ")
        metaLabel.isHidden = meta.isEmpty

        tiles.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let prices: [(String, Double?)] = [
            ("products.price.perRental".localized(), ProductPricing.perRental(product)),
            ("products.price.perDay".localized(), ProductPricing.perDay(product)),
            ("products.price.sale".localized(), ProductPricing.sale(product)),
        ]
        for (title, value) in prices {
            guard let value else { continue }
            tiles.addArrangedSubview(priceTile(title: title, value: value))
        }
        tiles.isHidden = tiles.arrangedSubviews.isEmpty

        let counts = ProductStock.counts(product)
        stockLabel.text = String(format: "products.stock.summary".localized(), counts.rented, counts.free, counts.total)

        photoStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let urls = (product.images?.isEmpty == false ? product.images! : [product.image_url].compactMap { $0 }).filter { !$0.isEmpty }
        if urls.isEmpty {
            let empty = UIImageView(image: UIImage(systemName: "tshirt", withConfiguration: UIImage.SymbolConfiguration(pointSize: 56, weight: .light)))
            empty.tintColor = DS.Color.textMuted
            empty.contentMode = .center
            photoStack.addArrangedSubview(empty)
            empty.snp.makeConstraints { make in make.width.equalTo(photos) }
        }
        for url in urls {
            let image = UIImageView()
            image.contentMode = .scaleAspectFill
            image.clipsToBounds = true
            image.isAccessibilityElement = true
            image.accessibilityLabel = product.name
            V2.setImage(image, url: url)
            photoStack.addArrangedSubview(image)
            image.snp.makeConstraints { make in make.width.equalTo(photos) }
        }
        pageLabel.isHidden = urls.count < 2
        pageLabel.text = " 1/\(urls.count) "
    }

    private func priceTile(title: String, value: Double) -> UIView {
        let box = UIView()
        box.layer.cornerRadius = 12
        box.layer.borderWidth = 1
        box.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        let t = V2.label(title, size: 12, color: DS.Color.textMuted)
        let v = V2.label(MoneyFormatter.format(value), size: 16, weight: .bold)
        v.adjustsFontSizeToFitWidth = true
        v.minimumScaleFactor = 0.7
        let stack = UIStackView(arrangedSubviews: [t, v])
        stack.axis = .vertical
        box.addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)) }
        box.isAccessibilityElement = true
        box.accessibilityLabel = "\(title), \(v.text ?? "")"
        return box
    }

    private func renderOrders() {
        ordersStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (index, order) in orders.enumerated() {
            ordersStack.addArrangedSubview(orderRow(order, index: index))
        }
        ordersEmpty.isHidden = !orders.isEmpty
        ordersCount.text = ordersTotal > 0 ? String(format: "products.detail.ordersCount".localized(), ordersTotal) : nil
    }

    private func orderRow(_ order: Order, index: Int) -> UIView {
        let row = UIControl()
        row.tag = index
        row.addTarget(self, action: #selector(orderTapped(_:)), for: .touchUpInside)
        let mark = UIView()
        mark.layer.cornerRadius = 2
        mark.backgroundColor = order.status.badgeTextColor
        let name = V2.label(order.customerName, size: 15, weight: .bold)
        let dates: String
        if order.orderType == .rent, let pickup = order.pickupPlanAt, let ret = order.returnPlanAt {
            dates = DayFormatter.short(pickup) + " → " + DayFormatter.short(ret)
        } else {
            dates = DayFormatter.short(order.createdAt)
        }
        let meta = V2.label("\(dates) · #\(order.orderNumber)", size: 13, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [name, meta])
        texts.axis = .vertical
        texts.spacing = 2
        texts.isUserInteractionEnabled = false
        let pill = OrderStatusPillLabel()
        pill.apply(status: order.status)
        pill.setContentCompressionResistancePriority(.required, for: .horizontal)
        [mark, texts, pill].forEach(row.addSubview)
        mark.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.top.bottom.equalToSuperview().inset(10)
            make.width.equalTo(4)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalTo(mark.snp.trailing).offset(12)
            make.top.bottom.equalToSuperview().inset(10)
            make.trailing.lessThanOrEqualTo(pill.snp.leading).offset(-8)
        }
        pill.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(64) }
        let line = V2.divider()
        row.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        row.isAccessibilityElement = true
        row.accessibilityTraits = UIAccessibilityTraitButton
        row.accessibilityLabel = [order.customerName, meta.text, pill.text].compactMap { $0 }.joined(separator: ", ")
        return row
    }

    // MARK: - Data

    private func load() {
        generation += 1
        let token = generation
        let id = productId
        guard id > 0 else { return }
        ProductService.shared.loadProduct(productId: id) { [weak self] latest, _ in
            DispatchQueue.main.async {
                guard let self, token == self.generation, let latest else { return }
                self.product = latest
                self.render()
            }
        }
        OrderService.shared.loadOrders(productIds: nil, productId: id, keyword: nil, page: 1, limit: 20,
                                       sortBy: "createdAt", sortOrder: "desc") { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                if let error {
                    self.ordersEmpty.text = error.localizedDescription
                    self.ordersEmpty.isHidden = false
                    return
                }
                self.orders = response?.data?.orders ?? []
                self.ordersTotal = response?.data?.total ?? self.orders.count
                self.renderOrders()
            }
        }
    }

    // MARK: - Actions

    @objc private func goBack() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func editProduct() {
        let form = ProductFormViewController(product: product)
        form.onSaved = { [weak self] saved in
            guard let self else { return }
            self.product = saved
            self.render()
            self.load()
            self.onSaved?(saved)
        }
        presentWithHiddenNavigationBar(form, fullScreen: true)
    }

    @objc private func addToCart() {
        ProductsCartBridge.add(product)
        HapticFeedback.light()
        showToast(message: "Added to cart".localized(), icon: UIImage(systemName: "checkmark.circle.fill"))
    }

    @objc private func openCalendar() {
        let controller = OrderCheckViewController()
        controller.delegate = self
        controller.loadProduct(product)
        present(UINavigationController(rootViewController: controller), animated: true)
    }

    @objc private func orderTapped(_ sender: UIControl) {
        guard sender.tag < orders.count else { return }
        openOrder(orders[sender.tag].id)
    }

    private func openOrder(_ orderId: Int) {
        showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: orderId) { [weak self] detail, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let detail else { return }
                let preview = PreviewViewController(order: Order.from(detail: detail))
                preview.hidesBottomBarWhenPushed = true
                preview.delegate = self
                self.navigationController?.pushViewController(preview, animated: true)
            }
        }
    }
}

extension ProductDetailViewController: UIScrollViewDelegate {
    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        guard scrollView === photos, scrollView.bounds.width > 0 else { return }
        let page = Int(round(scrollView.contentOffset.x / scrollView.bounds.width)) + 1
        pageLabel.text = " \(page)/\(photoStack.arrangedSubviews.count) "
    }
}

extension ProductDetailViewController: OrderCheckViewControllerDelegate {
    func didSelectOrder(order: Order, sender: OrderCheckViewController) {
        sender.dismiss(animated: true) { [weak self] in
            self?.openOrder(order.id)
        }
    }
}

extension ProductDetailViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        load()
    }
}
