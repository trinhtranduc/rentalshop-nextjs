//
//  CartV2ViewController.swift
//  POS ADBD
//
//  Redesigned cart (#373, flag `newProducts`, boards Gio-hang, Gio-hang-ban): one screen with a Thuê / Bán switch.
//  State lives in CartStore. "Tạo đơn" confirms a new order in a sheet on this screen and creates it with the
//  same request the review screen sends (#476); an edited order still opens the review screen.
//

import UIKit
import SnapKit

final class CartV2ViewController: BaseViewControler {
    private let typeToggle = V2Segmented(titles: ["products.cart.rent".localized(), "products.cart.sale".localized()], compact: false)
    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let collectTitle = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let collectAmount = V2.label(size: DS.TextSize.amount, weight: .bold)
    private let ctaButton = V2.primaryButton("products.cart.create".localized())
    private let availabilityDebouncer = DebounceManager(delay: 0.3)
    /// Bumped on each availability call; an older answer is dropped
    private var availabilityGeneration = 0
    /// Products whose prices this screen already reloaded (#473), once per screen
    private var pricingChecked = Set<Int>()
    /// One create at a time, one Idempotency-Key per checkout (#341, #476)
    private let submission = CreateOrderSubmission()

    private var cart: Cart { CartStore.shared.cart }
    private var isRent: Bool { cart.orderType == .rent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildLayout()
        NotificationCenter.default.addObserver(self, selector: #selector(cartChanged), name: .cartStoreDidChange, object: nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        render()
        loadAvailability()
        refreshStalePricing()
    }

    /// #473 — a rent line that does not offer "Theo lần / Theo ngày" may be stale (added before the product got its
    /// second price, restored from disk, or loaded from an edited order): reload that product once and let the line
    /// take its prices. A product with one price stays without the toggle.
    private func refreshStalePricing() {
        guard isRent else { return }
        let ids = Set(cart.items.filter { !CartV2Logic.offersBothModes($0) }.map { $0.productId }).subtracting(pricingChecked)
        for productId in ids where productId > 0 {
            pricingChecked.insert(productId)
            ProductService.shared.loadProduct(productId: productId) { product, _ in
                guard let product else { return }
                DispatchQueue.main.async { CartStore.shared.refreshPricing(from: product) }
            }
        }
    }

    // MARK: - Layout

    private func buildLayout() {
        let header = UIView()
        let back = UIButton(type: .system)
        back.setImage(DS.symbol("chevron.left", DS.Icon.lg, weight: .semibold), for: .normal)
        back.tintColor = DS.Color.text
        back.accessibilityLabel = "products.cart.back".localized()
        back.addTarget(self, action: #selector(goBack), for: .touchUpInside)
        let title = V2.label((cart.isEditMode ? "products.cart.editTitle" : "products.cart.title").localized(), size: 20, weight: .bold)
        typeToggle.addTarget(self, action: #selector(typeChanged), for: .valueChanged)
        typeToggle.accessibilityLabel = "products.cart.type".localized()
        [back, title, typeToggle].forEach(header.addSubview)
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(60)
        }
        back.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(8)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        title.snp.makeConstraints { make in
            make.leading.equalTo(back.snp.trailing).offset(4)
            make.centerY.equalToSuperview()
        }
        typeToggle.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }

        let bottom = UIView()
        bottom.backgroundColor = .white
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        let texts = UIStackView(arrangedSubviews: [collectTitle, collectAmount])
        texts.axis = .vertical
        ctaButton.addTarget(self, action: #selector(ctaTapped), for: .touchUpInside)
        [line, texts, ctaButton].forEach(bottom.addSubview)
        view.addSubview(bottom)
        bottom.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        line.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        texts.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.centerY.equalTo(ctaButton)
        }
        ctaButton.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.leading.greaterThanOrEqualTo(texts.snp.trailing).offset(12)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }

        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottom.snp.top)
        }
        content.axis = .vertical
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
    }

    // MARK: - Render

    @objc private func cartChanged() {
        guard isViewLoaded, view.window != nil else { return }
        render()
    }

    private func render() {
        typeToggle.select(isRent ? 0 : 1)
        typeToggle.isEnabled = !cart.isEditMode
        typeToggle.alpha = cart.isEditMode ? 0.6 : 1

        content.arrangedSubviews.forEach { $0.removeFromSuperview() }
        content.addArrangedSubview(band())
        content.addArrangedSubview(customerRow())
        if isRent {
            content.addArrangedSubview(V2.divider())
            content.addArrangedSubview(datesRow())
        }

        let add = UIButton(type: .system)
        add.setTitle("+ " + "products.cart.addMore".localized(), for: .normal)
        add.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        add.addTarget(self, action: #selector(addMoreTapped), for: .touchUpInside)
        add.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        content.addArrangedSubview(V2.sectionHeader(String(format: "products.cart.items".localized(), cart.itemCount), trailing: add))
        if cart.items.isEmpty {
            let empty = V2.label("products.cart.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
            content.addArrangedSubview(padded(empty, vertical: 20))
        }
        for (index, item) in cart.items.enumerated() {
            content.addArrangedSubview(itemRow(item, index: index))
        }

        content.addArrangedSubview(V2.sectionHeader("products.cart.money".localized()))
        let subtotal = V2ValueRow(title: (isRent ? "products.cart.rentSubtotal" : "products.cart.saleSubtotal").localized(), chevron: false)
        subtotal.valueLabel.text = MoneyFormatter.format(cart.subtotalAmount)
        subtotal.valueLabel.textColor = DS.Color.text
        subtotal.isUserInteractionEnabled = false
        content.addArrangedSubview(subtotal)
        content.addArrangedSubview(V2.divider())

        let discount = V2ValueRow(title: "products.cart.discount".localized())
        let discountValue = cart.discountAmount
        discount.valueLabel.text = discountValue > 0 ? MoneyFormatter.format(-discountValue) : MoneyFormatter.format(0)
        discount.valueLabel.textColor = discountValue > 0 ? V2.ok : DS.Color.textMuted
        discount.addTarget(self, action: #selector(editDiscount), for: .touchUpInside)
        content.addArrangedSubview(discount)
        content.addArrangedSubview(V2.divider())

        let total = V2ValueRow(title: "products.cart.total".localized(), chevron: false)
        total.titleLabel.font = Utils.boldFont(size: DS.TextSize.name)
        total.valueLabel.font = Utils.boldFont(size: 18)
        total.valueLabel.textColor = DS.Color.text
        total.valueLabel.text = MoneyFormatter.format(cart.totalAmount)
        total.isUserInteractionEnabled = false
        content.addArrangedSubview(total)
        content.addArrangedSubview(V2.divider())

        if isRent {
            let deposit = V2ValueRow(title: "products.cart.deposit".localized())
            deposit.valueLabel.text = MoneyFormatter.format(cart.depositAmount)
            deposit.valueLabel.textColor = DS.Color.primary
            deposit.valueLabel.font = Utils.boldFont(size: DS.TextSize.name)
            deposit.addTarget(self, action: #selector(editDeposit), for: .touchUpInside)
            content.addArrangedSubview(deposit)
            content.addArrangedSubview(V2.divider())
        }

        let note = V2ValueRow(title: "products.cart.note".localized())
        let noteText = (cart.notes ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        note.valueLabel.text = noteText.isEmpty ? "products.cart.addNote".localized() : noteText
        note.valueLabel.textColor = noteText.isEmpty ? DS.Color.primary : DS.Color.textMuted
        note.valueLabel.lineBreakMode = .byTruncatingTail
        note.addTarget(self, action: #selector(editNote), for: .touchUpInside)
        content.addArrangedSubview(note)
        content.addArrangedSubview(UIView.spacer(height: 24))

        collectTitle.text = (isRent ? "products.cart.collectDeposit" : "products.cart.customerPays").localized()
        collectAmount.text = MoneyFormatter.format(CartV2Logic.collectNow(cart))
        ctaButton.setTitle((isRent ? "products.cart.create" : "products.cart.sellAndCollect").localized(), for: .normal)
        ctaButton.alpha = cart.items.isEmpty ? 0.5 : 1
    }

    private func band() -> UIView {
        let view = UIView()
        view.backgroundColor = DS.Color.background
        view.snp.makeConstraints { make in make.height.equalTo(8) }
        return view
    }

    private func padded(_ view: UIView, vertical: CGFloat) -> UIView {
        let wrap = UIStackView(arrangedSubviews: [view])
        wrap.isLayoutMarginsRelativeArrangement = true
        wrap.layoutMargins = UIEdgeInsets(top: vertical, left: DS.Spacing.lg, bottom: vertical, right: DS.Spacing.lg)
        return wrap
    }

    private func customerRow() -> UIView {
        let row = UIControl()
        row.addTarget(self, action: #selector(pickCustomer), for: .touchUpInside)
        let customer = cart.customer
        let name = customerName(customer)
        let avatar = V2.label(initials(name), size: DS.TextSize.secondary, weight: .bold, color: UIColor(hexString: "1E40AF"))
        avatar.textAlignment = .center
        avatar.backgroundColor = UIColor(hexString: "DBEAFE")
        avatar.layer.cornerRadius = 20
        avatar.clipsToBounds = true
        let title = V2.label(name ?? "products.cart.pickCustomer".localized(), size: DS.TextSize.name, weight: .bold,
                             color: name == nil ? DS.Color.primary : DS.Color.text)
        let phone = V2.label(customer?.phone, size: DS.TextSize.secondary, color: DS.Color.textMuted)
        phone.isHidden = (customer?.phone ?? "").isEmpty
        let texts = UIStackView(arrangedSubviews: [title, phone])
        texts.axis = .vertical
        texts.isUserInteractionEnabled = false
        let change = V2.label(name == nil ? nil : "products.cart.change".localized(), size: DS.TextSize.body, weight: .bold, color: DS.Color.primary)
        [avatar, texts, change].forEach(row.addSubview)
        avatar.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(40)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalTo(avatar.snp.trailing).offset(12)
            make.centerY.equalToSuperview()
            make.trailing.lessThanOrEqualTo(change.snp.leading).offset(-8)
        }
        change.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(60) }
        row.isAccessibilityElement = true
        row.accessibilityTraits = UIAccessibilityTraitButton
        row.accessibilityLabel = [name ?? "products.cart.pickCustomer".localized(), customer?.phone].compactMap { $0 }.joined(separator: ", ")
        return row
    }

    private func datesRow() -> UIView {
        let row = UIControl()
        row.addTarget(self, action: #selector(pickDates), for: .touchUpInside)
        let text: String
        var days: Int?
        if let pickup = cart.pickupPlanAt, let ret = cart.returnPlanAt {
            text = DayFormatter.short(pickup) + " → " + DayFormatter.short(ret)
            days = CartV2Logic.rentalDays(pickup: pickup, return: ret)
        } else {
            text = "products.cart.pickDates".localized()
        }
        let label = V2.label(text, size: DS.TextSize.name, weight: .bold, color: days == nil ? DS.Color.primary : DS.Color.text)
        let pill = V2.label(days.map { " " + PluralText.format("products.cart.days", count: $0, $0) + " " }, size: DS.TextSize.secondary, weight: .bold,
                            color: UIColor(hexString: "1E40AF"))
        pill.backgroundColor = UIColor(hexString: "DBEAFE")
        pill.layer.cornerRadius = 11
        pill.clipsToBounds = true
        pill.isHidden = days == nil
        [label, pill].forEach(row.addSubview)
        label.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        pill.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
            make.height.equalTo(22)
        }
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(56) }
        row.isAccessibilityElement = true
        row.accessibilityTraits = UIAccessibilityTraitButton
        row.accessibilityLabel = [text, pill.text].compactMap { $0 }.joined(separator: ", ")
        return row
    }

    private func itemRow(_ item: CartItem, index: Int) -> UIView {
        let row = UIView()
        let thumb = V2.thumbnail(size: 56, radius: 10)
        thumb.image = V2.placeholder
        thumb.contentMode = .center
        if let url = item.imageUrl, let link = URL(string: url) {
            thumb.kf.setImage(with: link, placeholder: V2.placeholder) { [weak thumb] result in
                if case .success = result { thumb?.contentMode = .scaleAspectFill }
            }
        }
        let calc = CartV2Logic.calc(item, orderType: cart.orderType)
        let name = V2.label(item.productName, size: DS.TextSize.name, weight: .bold, lines: 2)
        name.setContentHuggingPriority(.defaultLow, for: .horizontal)
        name.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let total = V2.label(MoneyFormatter.format(calc.total), size: DS.TextSize.name, weight: .bold)
        total.textAlignment = .right
        total.setContentHuggingPriority(.required, for: .horizontal)
        total.setContentCompressionResistancePriority(.required, for: .horizontal)
        let top = UIStackView(arrangedSubviews: [name, total])
        top.alignment = .top
        top.spacing = 8
        let calcLabel = V2.label(calc.text, size: DS.TextSize.secondary,
                                 color: CartV2Logic.needsPrice(item, orderType: cart.orderType) ? V2.danger : DS.Color.textMuted, lines: 0)
        let column = UIStackView(arrangedSubviews: [top, calcLabel])
        column.axis = .vertical
        column.spacing = 6
        column.alignment = .fill

        if let left = CartV2Logic.shortage(item) {
            let key = isRent ? "products.cart.shortRent" : "products.cart.shortStock"
            let warn = V2.label(" " + String(format: key.localized(), left) + " ", size: DS.TextSize.pill, weight: .bold, color: UIColor(hexString: "991B1B"))
            warn.backgroundColor = UIColor(hexString: "FEE2E2")
            warn.layer.cornerRadius = 6
            warn.clipsToBounds = true
            let wrap = UIStackView(arrangedSubviews: [warn, UIView()])
            column.addArrangedSubview(wrap)
        }

        // #482 (board Gio-hang): one chip with the line's pricing; it opens the "Cách tính giá" sheet. The price is
        // for this order only, any role, any time (owner 2026-10-05); never the product's price.
        let chipRow = UIStackView(arrangedSubviews: [pricingChip(item, index: index), UIView()])
        column.addArrangedSubview(chipRow)

        let stepper = V2Stepper(compact: true)
        stepper.minimum = 0
        stepper.value = item.quantity
        stepper.onChange = { [weak self] value in self?.changeQuantity(index: index, quantity: value) }
        var leading: UIView = UIView()
        if !isRent, let available = item.availabilityStatus?.available {
            leading = V2.label(String(format: "products.cart.inStock".localized(), available), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        }
        let controls = UIStackView(arrangedSubviews: [leading, UIView(), stepper])
        controls.alignment = .center
        column.addArrangedSubview(controls)

        row.addSubview(thumb)
        row.addSubview(column)
        let line = V2.divider()
        row.addSubview(line)
        thumb.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.top.equalToSuperview().offset(12)
        }
        column.snp.makeConstraints { make in
            make.leading.equalTo(thumb.snp.trailing).offset(12)
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.top.equalToSuperview().offset(12)
            make.bottom.equalToSuperview().offset(-12)
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return row
    }

    /// "Theo ngày · 150.000đ/ngày" with a down chevron; "· Nhập giá" in blue while the line has no price
    private func pricingChip(_ item: CartItem, index: Int) -> UIButton {
        let chip = CartV2Logic.chip(item, orderType: cart.orderType)
        let button = UIButton(type: .system)
        let title = NSMutableAttributedString(string: chip.label, attributes: [
            NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.secondary),
            NSAttributedString.Key.foregroundColor: DS.Color.text,
        ])
        if let price = chip.price {
            title.append(NSAttributedString(string: " · " + price, attributes: [
                NSAttributedString.Key.font: UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.secondary, weight: .regular),
                NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
            ]))
        } else {
            title.append(NSAttributedString(string: " · " + "products.cart.pricing.enterPrice".localized(), attributes: [
                NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.secondary),
                NSAttributedString.Key.foregroundColor: DS.Color.primary,
            ]))
        }
        button.setAttributedTitle(title, for: .normal)
        button.setImage(DS.symbol("chevron.down", 14, weight: .semibold), for: .normal)
        button.tintColor = DS.Color.textMuted
        button.semanticContentAttribute = .forceRightToLeft
        button.imageEdgeInsets = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: -8)
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 18)
        button.layer.cornerRadius = 10
        button.layer.borderWidth = 1
        button.layer.borderColor = UIColor(hexString: "CBD5E1").cgColor
        button.backgroundColor = DS.Color.surface
        button.tag = index
        button.accessibilityLabel = String(format: "products.cart.pricing.change".localized(), item.productName ?? "")
        button.accessibilityValue = [chip.label, chip.price ?? "products.cart.pricing.enterPrice".localized()].joined(separator: ", ")
        button.addTarget(self, action: #selector(pricingChipTapped(_:)), for: .touchUpInside)
        button.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(36) }
        return button
    }

    private func customerName(_ customer: Customer?) -> String? {
        guard let customer else { return nil }
        let full = (customer.full_name ?? "").trimmingCharacters(in: .whitespaces)
        if !full.isEmpty { return full }
        let parts = [customer.firstName, customer.lastName].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " ")
    }

    private func initials(_ name: String?) -> String {
        guard let name else { return "+" }
        let words = name.split(separator: " ")
        let letters = [words.first, words.count > 1 ? words.last : nil].compactMap { $0?.first }
        return String(letters).uppercased()
    }

    // MARK: - Availability (same batch call as the old cart)

    private func loadAvailability() {
        availabilityDebouncer.debounce { [weak self] in self?.fetchAvailability() }
    }

    private func fetchAvailability() {
        let requests = Dictionary(grouping: cart.items, by: { $0.productId }).map { productId, items in
            BatchProductRequest(productId: productId, quantity: items.reduce(0) { $0 + $1.quantity })
        }
        guard !requests.isEmpty else { return }
        let start: Date
        let end: Date
        if isRent {
            guard let pickup = cart.pickupPlanAt, let ret = cart.returnPlanAt else { return }
            start = pickup
            end = ret
        } else {
            start = Date()
            end = start
        }
        availabilityGeneration += 1
        let token = availabilityGeneration
        let outletId = User.current()?.outlet?.id ?? User.current()?.outletId
        OrderService.shared.loadBatchProductAvailability(products: requests, startDate: start, endDate: end,
                                                         outletId: outletId, excludeOrderId: cart.orderId) { [weak self] response, _ in
            DispatchQueue.main.async {
                guard let self, token == self.availabilityGeneration, let results = response?.data?.results else { return }
                for result in results {
                    let available = result.availabilityByOutlet?.first?.effectivelyAvailable ?? result.totalAvailableStock ?? 0
                    let ok = result.isAvailable && available >= result.requestedQuantity
                    CartStore.shared.updateAvailabilityStatus(for: result.productId, status: AvailabilityStatus(isAvailable: ok, available: available))
                }
            }
        }
    }

    // MARK: - Actions

    @objc private func goBack() {
        navigationController?.popViewController(animated: true)
    }

    /// "+ Add" (#433): the product list. The cart keeps its customer and lines in CartStore.
    @objc private func addMoreTapped() {
        let stack = navigationController?.viewControllers ?? []
        let previous = stack.count >= 2 ? stack[stack.count - 2] : nil
        switch CartV2Logic.addMoreRoute(previousIsProductsHome: previous is ProductsHomeViewController) {
        case .pop:
            navigationController?.popViewController(animated: true)
        case .openHomeTab:
            let tabBar = tabBarController ?? (appDelegate.window?.rootViewController as? UITabBarController)
            navigationController?.popToRootViewController(animated: false)
            tabBar?.selectedIndex = 0
            (tabBar?.viewControllers?.first as? UINavigationController)?.popToRootViewController(animated: false)
        }
    }

    @objc private func typeChanged() {
        guard !cart.isEditMode else { return }
        CartStore.shared.setOrderType(typeToggle.selectedIndex == 0 ? .rent : .sale, syncPrices: true)
        loadAvailability()
        refreshStalePricing()
    }

    /// #482: the "Cách tính giá" sheet of a line (board Gio-hang-chon-gia)
    @objc private func pricingChipTapped(_ sender: UIButton) {
        let index = sender.tag
        guard index < cart.items.count, presentedViewController == nil else { return }
        let sheet = CartPricingSheetViewController(item: cart.items[index], orderType: cart.orderType, days: rentalDays)
        sheet.onApply = { type, price in
            CartStore.shared.applyLinePricing(at: index, type: type, price: price)
        }
        if let presentation = sheet.sheetPresentationController {
            presentation.detents = [.large()]
            presentation.prefersGrabberVisible = true
            presentation.preferredCornerRadius = 24
        }
        present(sheet, animated: true)
    }

    /// Rental days of the cart dates (1 without dates)
    private var rentalDays: Int {
        guard let pickup = cart.pickupPlanAt, let ret = cart.returnPlanAt else { return 1 }
        return CartV2Logic.rentalDays(pickup: pickup, return: ret)
    }

    private func changeQuantity(index: Int, quantity: Int) {
        guard index < cart.items.count else { return }
        if quantity <= 0 {
            let name = cart.items[index].productName ?? ""
            UIAlertController.alert(parent: self, title: "products.cart.removeTitle".localized(), message: name,
                                    okTitle: "products.cart.remove".localized(), cancelTitle: "Cancel".localized(),
                                    okAction: { _ in CartStore.shared.removeItem(at: index) },
                                    cancelAction: { [weak self] _ in self?.render() })
            return
        }
        CartStore.shared.updateQuantity(at: index, quantity: quantity)
        loadAvailability()
    }

    @objc private func pickCustomer() {
        // #387: redesigned picker behind `newCustomers`; it sets the customer the same way as the current one
        if FeatureFlags.shared.isOn(.newCustomers) {
            let picker = CustomersV2ListViewController(mode: .pick)
            picker.onPicked = { [weak picker] customer in
                CartStore.shared.setCustomer(customer)
                picker?.dismiss(animated: true)
            }
            presentWithHiddenNavigationBar(picker)
            return
        }
        let picker = SuggestionTextField()
        picker.delegate = self
        presentWithHiddenNavigationBar(picker)
    }

    @objc private func pickDates() {
        let picker = DatePickerViewController.instance()
        picker.delegate = self
        picker.tag = 3
        let today = Date()
        picker.configureForDateRange(startDate: cart.pickupPlanAt, endDate: cart.returnPlanAt,
                                     minimumDate: Calendar.current.date(byAdding: .year, value: -1, to: today),
                                     maximumDate: Calendar.current.date(byAdding: .year, value: 1, to: today))
        present(picker, animated: true)
    }

    @objc private func editDiscount() {
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        picker.amountChoiceTitle = "products.cart.discountAmount".localized()
        picker.configure(initialValue: cart.discount, mode: .discount(type: cart.discountType == .percentage ? .percentage : .amount))
        present(picker, animated: true)
    }

    @objc private func editDeposit() {
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        picker.configure(initialValue: cart.depositAmount, title: "Enter deposit price".localized())
        present(picker, animated: true)
    }

    @objc private func editNote() {
        OrderNotesEditorViewController.presentCartNote(from: self) // #477: note editor of board GC-ghi-chu
    }

    @objc private func ctaTapped() {
        // A double tap must not open two previews or sheets (#341)
        guard navigationController?.topViewController === self, presentedViewController == nil else { return }
        HapticFeedback.medium()
        var (valid, errors) = cart.validate()
        let missingPrices = CartV2Logic.missingPrices(cart)
        if !missingPrices.isEmpty {
            valid = false
            errors += missingPrices
        }
        guard valid else {
            UIAlertController.alert(parent: self, title: "Error".localized(), message: errors.joined(separator: "\n"))
            return
        }
        switch CartV2Logic.ctaRoute(isEditMode: cart.isEditMode) {
        case .preview:
            let preview = PreviewViewController(cart: cart)
            preview.hidesBottomBarWhenPushed = true
            preview.delegate = self
            navigationController?.pushViewController(preview, animated: true)
        case .confirmSheet:
            presentConfirmSheet()
        }
    }

    // MARK: - Create order sheets (#476)

    private func presentConfirmSheet() {
        let confirm = CreateOrderSheetLogic.confirm(cart)
        let sheet = CreateOrderConfirmSheet(confirm: confirm)
        sheet.onConfirm = { [weak self, weak sheet] in self?.submitOrder(confirm: confirm, sheet: sheet) }
        present(sheet, animated: true)
    }

    /// The request `CartViewModel.saveOrder` sends from the review screen, with this checkout's key
    private func submitOrder(confirm: CreateOrderConfirm, sheet: CreateOrderConfirmSheet?) {
        guard submission.begin() else { return }
        sheet?.setBusy(true)
        // #480: the cart note photos go with the create (no photos = the same request as before)
        OrderService.shared.createOrder(from: cart, notesImages: CartStore.shared.noteImageData, idempotencyKey: submission.idempotencyKey) { [weak self] order, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let error {
                    // The cart stays; the next confirm retries with the same key
                    self.submission.failed()
                    sheet?.setBusy(false)
                    UIAlertController.errorAlert(parent: sheet ?? self, error: error)
                    return
                }
                self.submission.succeeded()
                self.orderCreated(order, confirm: confirm, sheet: sheet)
            }
        }
    }

    /// Same clean-up as the review screen, then the "Đã tạo đơn" sheet
    private func orderCreated(_ order: Order?, confirm: CreateOrderConfirm, sheet: CreateOrderConfirmSheet?) {
        if let order {
            OrderListViewModel.shared.updateOrder(order)
        } else {
            OrderListViewModel.shared.setNeedsRefresh()
        }
        CartStore.shared.resetCart()
        ProductAvailabilityCache.shared.clearAll()
        HapticFeedback.success()

        let created = OrderCreatedSheet(summary: CreateOrderSheetLogic.created(orderNumber: order?.orderNumber ?? "", confirm: confirm))
        created.onNewOrder = { [weak self] in
            guard let self else { return }
            RatingManager.shared.requestRatingIfNeeded(from: self)
            self.addMoreTapped()
        }
        created.onViewOrder = { [weak self] in
            guard let self else { return }
            RatingManager.shared.requestRatingIfNeeded(from: self)
            if let order { self.openCreatedOrder(order) } else { self.addMoreTapped() }
        }
        let show: () -> Void = { [weak self] in self?.present(created, animated: true) }
        if let sheet, sheet.presentingViewController != nil {
            sheet.dismiss(animated: true, completion: show)
        } else {
            show()
        }
    }

    /// The new order's detail in place of the (now empty) cart
    private func openCreatedOrder(_ order: Order) {
        guard let navigationController else { return }
        let detail = OrderDetailRouter.detailController(for: order, delegate: nil)
        var stack = navigationController.viewControllers
        if stack.last === self { stack.removeLast() }
        stack.append(detail)
        navigationController.setViewControllers(stack, animated: true)
    }
}

extension CartV2ViewController: SuggestionTextFieldDelegate {
    func didSelectCustomer(customer: Customer, sender: SuggestionTextField) {
        CartStore.shared.setCustomer(customer)
    }

    func didAddNewCustomer(sender: SuggestionTextField) {
        let controller = CustomerViewController()
        controller.delegate = sender
        sender.presentWithHiddenNavigationBar(controller)
    }

    func didCreateCustomer(customer: Customer, sender: SuggestionTextField) {}
}

extension CartV2ViewController: DatePickerViewControllerDelegate {
    func didSelectDate(_ date: Date, sender: DatePickerViewController) {
        setDates(start: date, end: date)
    }

    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController) {
        setDates(start: start, end: end)
    }

    /// Same day bounds as the old cart: pickup at the start of its day, return at the end of its day
    private func setDates(start: Date, end: Date) {
        CartStore.shared.setPickupDate(start.startOfDay())
        CartStore.shared.setReturnDate(max(start, end).endOfDay())
        loadAvailability()
    }
}

extension CartV2ViewController: NumberPickerViewControllerDelegate {
    func didSelectNumber(_ value: Double, sender: NumberPickerViewController) {
        switch sender.mode {
        case .discount(let type):
            CartStore.shared.setDiscountType(type == .percentage ? .percentage : .amount)
            CartStore.shared.setDiscount(value)
        case .normal:
            CartStore.shared.setManualDepositAmount(value)
        }
    }
}

extension CartV2ViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        if let order = updatedOrder {
            OrderListViewModel.shared.updateOrder(order)
        } else {
            OrderListViewModel.shared.setNeedsRefresh()
        }
        DispatchQueue.main.async {
            self.navigationController?.popToRootViewController(animated: true)
        }
    }
}

private extension UIView {
    static func spacer(height: CGFloat) -> UIView {
        let view = UIView()
        view.snp.makeConstraints { make in make.height.equalTo(height) }
        return view
    }
}

// MARK: - Cách tính giá (#482, board Gio-hang-chon-gia)

/// Bottom sheet of one cart line: the pricing options as radio rows, the price for this order, a live preview and
/// "Áp dụng". Only the cart line changes, never the product's price.
final class CartPricingSheetViewController: UIViewController, UITextFieldDelegate {
    /// pricing type (nil on a sale line) and the unit price for this order
    var onApply: ((String?, Double) -> Void)?

    private let item: CartItem
    private let orderType: OrderType
    private let days: Int
    private let choices: [CartPricingChoice]
    private var selectedType: String
    private let radioStack = UIStackView()
    private let priceField = UITextField()
    private let unitLabel = V2.label(size: DS.TextSize.body, weight: .medium, color: UIColor(hexString: "64748B"))
    private let previewText = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let previewTotal = V2.label(size: 18, weight: .bold)
    private let scroll = UIScrollView()

    init(item: CartItem, orderType: OrderType, days: Int) {
        self.item = item
        self.orderType = orderType
        self.days = max(1, days)
        choices = orderType == .rent ? CartV2Logic.pricingChoices(item) : []
        selectedType = CartV2Logic.currentType(item)
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let title = V2.label("products.cart.pricingMode".localized(), size: 20, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let name = item.productName ?? ""
        let subtitleText = orderType == .rent ? name + " · " + PluralText.format("products.cart.days", count: days, days) : name
        let subtitle = V2.label(subtitleText, size: DS.TextSize.body, color: DS.Color.textMuted, lines: 2)
        let header = UIStackView(arrangedSubviews: [title, subtitle])
        header.axis = .vertical
        header.spacing = 2

        let content = UIStackView(arrangedSubviews: [header])
        content.axis = .vertical
        content.spacing = 14

        if !choices.isEmpty {
            radioStack.axis = .vertical
            radioStack.spacing = DS.Spacing.sm
            radioStack.accessibilityLabel = "products.cart.pricingMode".localized()
            content.addArrangedSubview(radioStack)
            renderChoices()
        }

        let fieldTitle = V2.label("products.cart.pricing.priceField".localized(), size: DS.TextSize.body, weight: .bold)
        priceField.font = UIFont.monospacedDigitSystemFont(ofSize: 18, weight: .semibold)
        priceField.textColor = DS.Color.text
        priceField.keyboardType = .numberPad
        priceField.delegate = self
        priceField.layer.cornerRadius = 12
        priceField.layer.borderWidth = 1.5
        priceField.layer.borderColor = DS.Color.primary.cgColor
        priceField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 1))
        priceField.leftViewMode = .always
        let unitWrap = UIView(frame: CGRect(x: 0, y: 0, width: 64, height: 52))
        unitWrap.addSubview(unitLabel)
        unitLabel.textAlignment = .right
        unitLabel.frame = CGRect(x: 0, y: 0, width: 50, height: 52)
        priceField.rightView = unitWrap
        priceField.rightViewMode = .always
        priceField.accessibilityLabel = "products.cart.pricing.priceField".localized()
        priceField.addTarget(self, action: #selector(priceChanged), for: .editingChanged)
        priceField.snp.makeConstraints { make in make.height.equalTo(52) }
        let note = V2.label("products.cart.pricing.note".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
        let field = UIStackView(arrangedSubviews: [fieldTitle, priceField, note])
        field.axis = .vertical
        field.spacing = 6
        content.addArrangedSubview(field)

        let preview = UIStackView(arrangedSubviews: [previewText, previewTotal])
        preview.alignment = .firstBaseline
        preview.spacing = DS.Spacing.sm
        previewText.font = UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.body, weight: .regular)
        previewTotal.font = UIFont.monospacedDigitSystemFont(ofSize: 18, weight: .bold)
        previewTotal.setContentHuggingPriority(.required, for: .horizontal)
        previewTotal.setContentCompressionResistancePriority(.required, for: .horizontal)
        let previewBox = UIView()
        previewBox.backgroundColor = V2.sectionFill
        previewBox.layer.cornerRadius = 12
        previewBox.addSubview(preview)
        preview.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: 14, bottom: 10, right: 14)) }
        content.addArrangedSubview(previewBox)

        let apply = UIButton(type: .system)
        apply.setTitle("products.cart.pricing.apply".localized(), for: .normal)
        apply.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        apply.setTitleColor(.white, for: .normal)
        apply.backgroundColor = DS.Color.primary
        apply.layer.cornerRadius = 14
        apply.addTarget(self, action: #selector(applyTapped), for: .touchUpInside)
        apply.snp.makeConstraints { make in make.height.equalTo(54) }
        content.addArrangedSubview(apply)

        scroll.keyboardDismissMode = .interactive
        scroll.alwaysBounceVertical = true
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in make.edges.equalTo(view.safeAreaLayoutGuide) }
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(24)
            make.leading.trailing.equalTo(view).inset(20)
            make.bottom.equalToSuperview().offset(-20)
        }

        setPrice(CartV2Logic.startPrice(item, type: selectedType))
    }

    // MARK: Rows

    private func renderChoices() {
        radioStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (index, choice) in choices.enumerated() {
            let selected = choice.type == selectedType
            let row = UIControl()
            row.tag = index
            row.layer.cornerRadius = 12
            row.layer.borderWidth = selected ? 1.5 : 1
            row.layer.borderColor = UIColor(hexString: selected ? "1D4ED8" : "E2E8F0").cgColor
            row.backgroundColor = selected ? UIColor(hexString: "EFF6FF") : DS.Color.surface
            row.addTarget(self, action: #selector(choiceTapped(_:)), for: .touchUpInside)
            let dot = UIView()
            dot.backgroundColor = .white
            dot.layer.cornerRadius = 10
            dot.layer.borderWidth = selected ? 6 : 1.5
            dot.layer.borderColor = UIColor(hexString: selected ? "1D4ED8" : "94A3B8").cgColor
            dot.snp.makeConstraints { make in make.size.equalTo(20) }
            let label = V2.label(CartV2Logic.pricingLabel(choice.type), size: DS.TextSize.input, weight: .bold)
            label.setContentHuggingPriority(.defaultLow, for: .horizontal)
            let priceText = choice.catalogPrice.map { CartV2Logic.priceText($0, type: choice.type, orderType: orderType) }
            let price = V2.label(priceText ?? "products.cart.pricing.enterPrice".localized(), size: DS.TextSize.body,
                                 weight: priceText == nil ? .bold : .regular,
                                 color: priceText == nil ? DS.Color.primary : DS.Color.textMuted)
            if priceText != nil { price.font = UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.body, weight: .regular) }
            price.setContentCompressionResistancePriority(.required, for: .horizontal)
            let line = UIStackView(arrangedSubviews: [dot, label, price])
            line.spacing = DS.Spacing.md
            line.alignment = .center
            line.isUserInteractionEnabled = false
            row.addSubview(line)
            line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 14, bottom: 8, right: 14)) }
            row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(56) }
            row.isAccessibilityElement = true
            row.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
            row.accessibilityLabel = [label.text, price.text].compactMap { $0 }.joined(separator: ", ")
            radioStack.addArrangedSubview(row)
        }
    }

    @objc private func choiceTapped(_ sender: UIControl) {
        guard sender.tag < choices.count else { return }
        selectedType = choices[sender.tag].type
        renderChoices()
        setPrice(CartV2Logic.startPrice(item, type: selectedType))
    }

    // MARK: Price

    private var price: Double {
        Double(String((priceField.text ?? "").filter { $0.isNumber })) ?? 0
    }

    private func setPrice(_ value: Double) {
        priceField.text = value > 0 ? MoneyFormatter.format(value) : ""
        priceField.placeholder = "0"
        let daily = orderType == .rent && selectedType == ProductPricingMode.perDay.rawValue
        unitLabel.text = (daily ? "products.cart.pricing.unitDaily" : "products.cart.pricing.unit").localized()
        updatePreview()
    }

    @objc private func priceChanged() {
        let digits = String((priceField.text ?? "").filter { $0.isNumber }.prefix(12))
        priceField.text = digits.isEmpty ? "" : MoneyFormatter.format(Double(digits) ?? 0)
        updatePreview()
    }

    private func updatePreview() {
        let preview = CartV2Logic.pricePreview(type: selectedType, price: price, days: days, quantity: item.quantity, orderType: orderType)
        previewText.text = preview.text
        previewTotal.text = CartV2Logic.money(preview.total)
    }

    @objc private func applyTapped() {
        onApply?(orderType == .rent ? selectedType : nil, price)
        dismiss(animated: true)
    }
}
