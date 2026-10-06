//
//  ProductDetailViewController.swift
//  POS ADBD
//
//  Redesigned product detail (#373, flag `newProducts`, board SP-chi-tiet): photos, prices per rental / per day /
//  sale, rented and free units, and the product's orders.
//  #388: 7-day free strip, order chips Sắp tới / Đang thuê / Đã xong, "Tất cả N", rows without a left bar.
//

import UIKit
import SnapKit

final class ProductDetailViewController: BaseViewControler {
    private var product: Product
    /// Rows and total per chip (Đã xong = RETURNED + COMPLETED)
    private var chipOrders: [ProductOrdersChip: [Order]] = [:]
    private var chipTotals: [ProductOrdersChip: Int] = [:]
    private var chip: ProductOrdersChip = .upcoming
    private var orders: [Order] { chipOrders[chip] ?? [] }
    private var ordersTotal = 0
    private var strip: [FreeStripDay] = []
    private var stripStock: Int?
    /// Bumped on each load; an older answer is dropped
    private var generation = 0
    var onSaved: ((Product) -> Void)?
    /// The product was deleted (#390): the list drops it
    var onDeleted: ((Int) -> Void)?
    private var deleteButton: UIButton?

    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let photos = UIScrollView()
    private let photoStack = UIStackView()
    private let pageLabel = V2.label(size: DS.TextSize.pill, weight: .bold, color: .white)
    private let nameLabel = V2.label(size: 22, weight: .bold, lines: 0)
    private let metaLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let tiles = UIStackView()
    private let stockLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let stripRow = UIStackView()
    private let stripCaption = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let ordersHeader = V2.label("products.detail.orders".localized(), size: DS.TextSize.name, weight: .bold)
    private let ordersCount = UIButton(type: .system)
    private let chipsRow = UIStackView()
    private let ordersStack = UIStackView()
    private let ordersEmpty = V2.label("products.detail.noOrders".localized(), size: DS.TextSize.body, color: DS.Color.textMuted)

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

        // Photos with back / edit on top (in the hierarchy first: the buttons pin to the safe area)
        let photoBox = UIView()
        photoBox.backgroundColor = V2.chipFill
        content.addArrangedSubview(photoBox)
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
        // #472: a tap on the photo opens it full screen
        photos.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(openPhotoViewer)))
        let back = roundButton(symbol: "chevron.left", title: nil, label: "Back".localized(), action: #selector(goBack))
        photoBox.addSubview(back)
        back.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.width.height.equalTo(DS.touchTarget)
        }
        var trailingAnchorView: UIView?
        if ProductAccess.canEdit(role: ProductAccess.currentRole, permissions: ProductAccess.currentPermissions) {
            let edit = roundButton(symbol: nil, title: "products.detail.edit".localized(), label: "products.form.editTitle".localized(), action: #selector(editProduct))
            photoBox.addSubview(edit)
            edit.snp.makeConstraints { make in
                make.trailing.equalToSuperview().offset(-12)
                make.centerY.equalTo(back)
                make.height.equalTo(DS.touchTarget)
            }
            trailingAnchorView = edit
        }
        // #390: delete needs products.manage (never OUTLET_STAFF); the API refuses it too
        if ProductAccess.canDelete(role: ProductAccess.currentRole, permissions: ProductAccess.currentPermissions) {
            let delete = roundButton(symbol: nil, title: "Delete".localized(), label: "Delete product".localized(), action: #selector(deleteTapped))
            delete.setTitleColor(DS.Status.late.text, for: .normal)
            photoBox.addSubview(delete)
            delete.snp.makeConstraints { make in
                if let trailingAnchorView {
                    make.trailing.equalTo(trailingAnchorView.snp.leading).offset(-8)
                } else {
                    make.trailing.equalToSuperview().offset(-12)
                }
                make.centerY.equalTo(back)
                make.height.equalTo(DS.touchTarget)
            }
            deleteButton = delete
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
        photoBox.snp.makeConstraints { make in
            make.height.equalTo(view.snp.width).multipliedBy(0.62)
        }

        // Name, meta, prices, stock
        stripRow.axis = .horizontal
        stripRow.distribution = .fillEqually
        stripRow.spacing = 4
        stripRow.isHidden = true
        stripRow.isAccessibilityElement = true
        stripCaption.isHidden = true
        let info = UIStackView(arrangedSubviews: [nameLabel, metaLabel, tiles, stockLabel, stripRow, stripCaption])
        info.axis = .vertical
        info.spacing = 6
        info.setCustomSpacing(10, after: metaLabel)
        info.setCustomSpacing(10, after: tiles)
        info.setCustomSpacing(8, after: stockLabel)
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
        ordersCount.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        ordersCount.setTitleColor(DS.Color.primary, for: .normal)
        ordersCount.addTarget(self, action: #selector(openAllOrders), for: .touchUpInside)
        ordersCount.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(40) }
        let ordersTitle = UIStackView(arrangedSubviews: [ordersHeader, UIView(), ordersCount])
        ordersTitle.alignment = .center
        ordersTitle.isLayoutMarginsRelativeArrangement = true
        ordersTitle.layoutMargins = UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 0, right: DS.Spacing.lg)
        content.addArrangedSubview(ordersTitle)
        chipsRow.axis = .horizontal
        chipsRow.spacing = 8
        chipsRow.alignment = .center
        for chip in ProductOrdersChip.allCases {
            let button = UIButton(type: .custom)
            button.tag = chip.rawValue
            button.titleLabel?.font = Utils.mediumFont(size: DS.TextSize.secondary)
            button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
            button.layer.cornerRadius = 18
            button.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            button.snp.makeConstraints { make in make.height.equalTo(36) }
            chipsRow.addArrangedSubview(button)
        }
        let chipsWrap = UIStackView(arrangedSubviews: [chipsRow, UIView()])
        chipsWrap.isLayoutMarginsRelativeArrangement = true
        chipsWrap.layoutMargins = UIEdgeInsets(top: 4, left: DS.Spacing.lg, bottom: 6, right: DS.Spacing.lg)
        content.addArrangedSubview(chipsWrap)
        renderChips()
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
            button.setImage(DS.symbol(symbol, DS.Icon.md, weight: .semibold), for: .normal)
        }
        if let title {
            button.setTitle(title, for: .normal)
            button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
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

        // Outlet users see their outlet; a merchant without an outlet sees the totals
        let counts = ProductStock.counts(product, outletId: User.current()?.outlet?.id ?? User.current()?.outletId)
        stockLabel.text = String(format: "products.stock.summary".localized(), counts.rented, counts.free, counts.total)
        renderStrip()

        photoStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let urls = ProductImages.viewerUrls(product)
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
            image.accessibilityHint = "products.image.view.hint".localized()
            image.accessibilityTraits = UIAccessibilityTraitImage | UIAccessibilityTraitButton
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
        let t = V2.label(title, size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let v = V2.label(MoneyFormatter.format(value), size: DS.TextSize.name, weight: .bold)
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

    /// The 7-day strip once the calendar answered; the old stock line otherwise
    private func renderStrip() {
        stripRow.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let shown = !strip.isEmpty
        stripRow.isHidden = !shown
        stripCaption.isHidden = !shown
        stockLabel.isHidden = shown
        guard shown else { return }
        for day in strip {
            let (fill, text): (UIColor, UIColor)
            switch day.tone {
            case .none: (fill, text) = (UIColor(hexString: "FEE2E2"), UIColor(hexString: "991B1B"))
            case .low: (fill, text) = (UIColor(hexString: "FFEDD5"), UIColor(hexString: "9A3412"))
            case .ok: (fill, text) = (UIColor(hexString: "D1FAE5"), UIColor(hexString: "065F46"))
            }
            let dayLabel = V2.label(day.day, size: DS.TextSize.pill, color: text)
            let freeLabel = V2.label("\(day.free)", size: DS.TextSize.body, weight: .bold, color: text)
            [dayLabel, freeLabel].forEach { $0.textAlignment = .center }
            let cell = UIStackView(arrangedSubviews: [dayLabel, freeLabel])
            cell.axis = .vertical
            cell.isLayoutMarginsRelativeArrangement = true
            cell.layoutMargins = UIEdgeInsets(top: 5, left: 0, bottom: 5, right: 0)
            cell.backgroundColor = fill
            cell.layer.cornerRadius = 10
            if day.isToday {
                cell.layer.borderWidth = 2
                cell.layer.borderColor = DS.Color.text.cgColor
            }
            stripRow.addArrangedSubview(cell)
        }
        stripRow.accessibilityLabel = "products.detail.strip.accessibility".localized() + ": "
            + strip.map { "\($0.day): \($0.free)" }.joined(separator: ", ")
        stripCaption.text = String(format: "products.detail.strip.caption".localized(), stripStock ?? 0)
    }

    private func renderChips() {
        for case let button as UIButton in chipsRow.arrangedSubviews {
            guard let chip = ProductOrdersChip(rawValue: button.tag) else { continue }
            let selected = chip == self.chip
            let count = chipTotals[chip].map { " \($0)" } ?? ""
            button.setTitle(chip.titleKey.localized() + count, for: .normal)
            button.titleLabel?.font = selected ? Utils.boldFont(size: DS.TextSize.secondary) : Utils.regularFont(size: DS.TextSize.secondary)
            button.setTitleColor(selected ? .white : DS.Color.text, for: .normal)
            button.backgroundColor = selected ? DS.Color.text : .white
            button.layer.borderWidth = selected ? 0 : 1
            button.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
            button.accessibilityTraits = selected ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        }
    }

    private func renderOrders() {
        ordersStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (index, order) in orders.enumerated() {
            ordersStack.addArrangedSubview(orderRow(order, index: index))
        }
        ordersEmpty.isHidden = !orders.isEmpty
        ordersCount.setTitle(ordersTotal > 0 ? String(format: "products.detail.ordersCount".localized(), ordersTotal) : nil, for: .normal)
        ordersCount.isHidden = ordersTotal == 0
        renderChips()
    }

    private func orderRow(_ order: Order, index: Int) -> UIView {
        let row = UIControl()
        row.tag = index
        row.addTarget(self, action: #selector(orderTapped(_:)), for: .touchUpInside)
        let name = V2.label(order.customerName, size: DS.TextSize.name, weight: .bold)
        let meta = V2.label(ProductDetailV2Logic.meta(order), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [name, meta])
        texts.axis = .vertical
        texts.spacing = DS.Gap.lineTight
        texts.isUserInteractionEnabled = false
        let state = stateView(for: order)
        state.setContentCompressionResistancePriority(.required, for: .horizontal)
        state.setContentHuggingPriority(.required, for: .horizontal)
        [texts, state].forEach(row.addSubview)
        texts.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.top.bottom.equalToSuperview().inset(10)
            make.trailing.lessThanOrEqualTo(state.snp.leading).offset(-8)
        }
        state.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(64) }
        let line = V2.divider()
        row.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        row.isAccessibilityElement = true
        row.accessibilityTraits = UIAccessibilityTraitButton
        row.accessibilityLabel = [order.customerName, meta.text, (state as? UILabel)?.text].compactMap { $0 }.joined(separator: ", ")
        return row
    }

    /// "Giao hôm nay" / "Trả 05/10" / "Trễ 2 ngày", or the status pill for Đã xong
    private func stateView(for order: Order) -> UILabel {
        let text: String
        let color: UIColor
        switch ProductDetailV2Logic.rowState(order, chip: chip) {
        case .pickupToday: (text, color) = ("products.detail.state.pickupToday".localized(), DS.Status.handOver.text)
        case .pickupOn(let day): (text, color) = (String(format: "products.detail.state.pickupOn".localized(), day), DS.Color.textMuted)
        case .late(let days): (text, color) = (LateText.days(days), V2.danger)
        case .returnToday: (text, color) = ("products.detail.state.returnToday".localized(), DS.Status.handOver.text)
        case .returnOn(let day): (text, color) = (String(format: "products.detail.state.returnOn".localized(), day), DS.Color.textMuted)
        case .status:
            let pill = OrderStatusPillLabel()
            pill.apply(status: order.status); pill.font = Utils.boldFont(size: DS.TextSize.pill)
            return pill
        }
        return V2.label(text, size: DS.TextSize.secondary, weight: .bold, color: color)
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
        loadStrip(productId: id, token: token)
        // "Tất cả N": every order of the product
        OrderService.shared.loadOrders(productIds: nil, productId: id, keyword: nil, page: 1, limit: 1,
                                       sortBy: "createdAt", sortOrder: "desc") { [weak self] response, _ in
            DispatchQueue.main.async {
                guard let self, token == self.generation, let total = response?.data?.total else { return }
                self.ordersTotal = total
                self.renderOrders()
            }
        }
        // One call per status of each chip
        let group = DispatchGroup()
        var lists: [OrderStatus: [Order]] = [:]
        var totals: [OrderStatus: Int] = [:]
        var failure: NSError?
        for status in ProductOrdersChip.allCases.flatMap({ chip in chip.statuses.map { (chip, $0) } }) {
            group.enter()
            OrderService.shared.loadOrders(productIds: nil, productId: id, keyword: nil, page: 1, limit: 20,
                                           sortBy: status.0.sortBy, sortOrder: status.0.sortOrder, status: status.1) { response, error in
                DispatchQueue.main.async {
                    if let error { failure = error }
                    lists[status.1] = response?.data?.orders ?? []
                    totals[status.1] = response?.data?.total ?? response?.data?.orders.count ?? 0
                    group.leave()
                }
            }
        }
        group.notify(queue: .main) { [weak self] in
            guard let self, token == self.generation else { return }
            for chip in ProductOrdersChip.allCases {
                let rows = chip.statuses.map { lists[$0] ?? [] }
                self.chipOrders[chip] = chip == .done ? ProductDetailV2Logic.mergeDone(rows) : rows.flatMap { $0 }
                self.chipTotals[chip] = chip.statuses.reduce(0) { $0 + (totals[$1] ?? 0) }
            }
            self.ordersEmpty.text = failure?.localizedDescription ?? "products.detail.noOrders".localized()
            self.renderOrders()
        }
    }

    /// Free units for today and the next 6 days, in device-zone day keys
    private func loadStrip(productId: Int, token: Int) {
        let todayKey = DayFormatter.key(Date())
        let keys = ProductDetailV2Logic.weekKeys(from: todayKey)
        guard let from = keys.first, let to = keys.last else { return }
        var params: [String: Any] = ["from": from, "to": to]
        if let outletId = User.current()?.outlet?.id ?? User.current()?.outletId { params["outletId"] = outletId }
        OrderService.shared.performGET(path: "/api/products/\(productId)/availability-calendar", parameters: params,
                                       responseType: AvailabilityCalendarResponse.self,
                                       context: "ProductDetail.strip") { [weak self] response, _ in
            DispatchQueue.main.async {
                guard let self, token == self.generation, let data = response?.data, let days = data.days else { return }
                var available: [String: Int] = [:]
                days.forEach { available[$0.date] = $0.available }
                self.strip = ProductDetailV2Logic.strip(todayKey: todayKey, available: available)
                self.stripStock = data.stock
                self.renderStrip()
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
        V2.presentForm(form, from: self)
    }

    /// Confirm sheet, then DELETE /api/products/{id}. A 409 PRODUCT_HAS_OPEN_ORDERS arrives as a localized NSError.
    @objc private func deleteTapped() {
        let sheet = UIAlertController(title: "products.detail.deleteTitle".localized(),
                                      message: String(format: "products.detail.deleteMessage".localized(), product.name ?? ""),
                                      preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "Delete product".localized(), style: .destructive) { [weak self] _ in
            self?.performDelete()
        })
        sheet.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        if let popover = sheet.popoverPresentationController, let source = deleteButton {
            popover.sourceView = source
            popover.sourceRect = source.bounds
        }
        present(sheet, animated: true)
    }

    private func performDelete() {
        let id = productId
        showProgressText(text: "")
        ProductService.shared.deleteProduct(productId: id) { [weak self] error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                self.onDeleted?(id)
                let list = self.navigationController?.viewControllers.dropLast().last as? BaseViewControler
                self.navigationController?.popViewController(animated: true)
                list?.showToast(message: "products.detail.deleted".localized())
            }
        }
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

    @objc private func chipTapped(_ sender: UIButton) {
        guard let chip = ProductOrdersChip(rawValue: sender.tag), chip != self.chip else { return }
        self.chip = chip
        renderOrders()
    }

    @objc private func openAllOrders() {
        let list = OverviewRankingOrdersViewController(filter: .product(id: productId, name: product.name ?? ""),
                                                       startDate: nil, endDate: nil, periodSubtitle: "All time".localized())
        list.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(list, animated: true)
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
                let preview = OrderDetailRouter.detailController(for: Order.from(detail: detail), delegate: self)
                self.navigationController?.pushViewController(preview, animated: true)
            }
        }
    }
}

extension ProductDetailViewController {
    /// #472: the full-screen viewer at the photo on screen
    @objc fileprivate func openPhotoViewer() {
        let page = photos.bounds.width > 0 ? Int(round(photos.contentOffset.x / photos.bounds.width)) : 0
        guard let request = ProductImages.detailTap(product, page: page) else { return }
        present(ImageViewerViewController(request: request), animated: true)
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
