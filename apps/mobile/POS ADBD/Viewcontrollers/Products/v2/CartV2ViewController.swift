//
//  CartV2ViewController.swift
//  POS ADBD
//
//  Redesigned cart (#373, flag `newProducts`, boards Gio-hang, Gio-hang-ban): one screen with a Thuê / Bán switch.
//  State lives in CartStore; the button opens the existing order preview, which creates the order and collects
//  payment (no new business rule here).
//

import UIKit
import SnapKit

final class CartV2ViewController: BaseViewControler {
    private let typeToggle = V2Segmented(titles: ["products.cart.rent".localized(), "products.cart.sale".localized()], compact: false)
    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let collectTitle = V2.label(size: 13, color: DS.Color.textMuted)
    private let collectAmount = V2.label(size: 20, weight: .bold)
    private let ctaButton = V2.primaryButton("products.cart.create".localized())
    private let availabilityDebouncer = DebounceManager(delay: 0.3)
    /// Bumped on each availability call; an older answer is dropped
    private var availabilityGeneration = 0

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
        add.titleLabel?.font = Utils.boldFont(size: 14)
        add.addTarget(self, action: #selector(addMoreTapped), for: .touchUpInside)
        add.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        content.addArrangedSubview(V2.sectionHeader(String(format: "products.cart.items".localized(), cart.itemCount), trailing: add))
        if cart.items.isEmpty {
            let empty = V2.label("products.cart.empty".localized(), size: 15, color: DS.Color.textMuted, lines: 0)
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
        total.titleLabel.font = Utils.boldFont(size: 15)
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
            deposit.valueLabel.font = Utils.boldFont(size: 15)
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
        let avatar = V2.label(initials(name), size: 13, weight: .bold, color: UIColor(hexString: "1E40AF"))
        avatar.textAlignment = .center
        avatar.backgroundColor = UIColor(hexString: "DBEAFE")
        avatar.layer.cornerRadius = 20
        avatar.clipsToBounds = true
        let title = V2.label(name ?? "products.cart.pickCustomer".localized(), size: 15, weight: .bold,
                             color: name == nil ? DS.Color.primary : DS.Color.text)
        let phone = V2.label(customer?.phone, size: 13, color: DS.Color.textMuted)
        phone.isHidden = (customer?.phone ?? "").isEmpty
        let texts = UIStackView(arrangedSubviews: [title, phone])
        texts.axis = .vertical
        texts.isUserInteractionEnabled = false
        let change = V2.label(name == nil ? nil : "products.cart.change".localized(), size: 14, weight: .bold, color: DS.Color.primary)
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
        let label = V2.label(text, size: 15, weight: .bold, color: days == nil ? DS.Color.primary : DS.Color.text)
        let pill = V2.label(days.map { " " + PluralText.format("products.cart.days", count: $0, $0) + " " }, size: 13, weight: .bold,
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
        let name = V2.label(item.productName, size: 15, weight: .bold, lines: 2)
        name.setContentHuggingPriority(.defaultLow, for: .horizontal)
        name.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let total = V2.label(MoneyFormatter.format(calc.total), size: 15, weight: .bold)
        total.textAlignment = .right
        total.setContentHuggingPriority(.required, for: .horizontal)
        total.setContentCompressionResistancePriority(.required, for: .horizontal)
        let top = UIStackView(arrangedSubviews: [name, total])
        top.alignment = .top
        top.spacing = 8
        let calcLabel = V2.label(calc.text, size: 13, color: DS.Color.textMuted, lines: 0)
        let column = UIStackView(arrangedSubviews: [top, calcLabel])
        column.axis = .vertical
        column.spacing = 6
        column.alignment = .fill

        if let left = CartV2Logic.shortage(item) {
            let key = isRent ? "products.cart.shortRent" : "products.cart.shortStock"
            let warn = V2.label(" " + String(format: key.localized(), left) + " ", size: 12, weight: .bold, color: UIColor(hexString: "991B1B"))
            warn.backgroundColor = UIColor(hexString: "FEE2E2")
            warn.layer.cornerRadius = 6
            warn.clipsToBounds = true
            let wrap = UIStackView(arrangedSubviews: [warn, UIView()])
            column.addArrangedSubview(wrap)
        }

        let stepper = V2Stepper(compact: true)
        stepper.minimum = 0
        stepper.value = item.quantity
        stepper.onChange = { [weak self] value in self?.changeQuantity(index: index, quantity: value) }
        var leading: UIView = UIView()
        if isRent && CartV2Logic.offersBothModes(item) {
            let toggle = V2Segmented(titles: ["products.price.perRental".localized(), "products.price.perDay".localized()], compact: true)
            toggle.select(item.isDailyPricing ? 1 : 0)
            toggle.tag = index
            toggle.accessibilityLabel = "products.cart.pricingMode".localized()
            toggle.addTarget(self, action: #selector(pricingChanged(_:)), for: .valueChanged)
            leading = toggle
        } else if !isRent, let available = item.availabilityStatus?.available {
            leading = V2.label(String(format: "products.cart.inStock".localized(), available), size: 13, color: DS.Color.textMuted)
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
    }

    @objc private func pricingChanged(_ sender: V2Segmented) {
        CartStore.shared.selectPricingType(at: sender.tag, type: sender.selectedIndex == 1 ? ProductPricingMode.perDay.rawValue : ProductPricingMode.perRental.rawValue)
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
        let alert = UIAlertController(title: "products.cart.note".localized(), message: nil, preferredStyle: .alert)
        alert.addTextField { [weak self] field in
            field.text = self?.cart.notes
            field.autocapitalizationType = .sentences
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default) { _ in
            let text = alert.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            CartStore.shared.setNotes(text.isEmpty ? nil : text)
        })
        present(alert, animated: true)
    }

    @objc private func ctaTapped() {
        HapticFeedback.medium()
        let (valid, errors) = cart.validate()
        guard valid else {
            UIAlertController.alert(parent: self, title: "Error".localized(), message: errors.joined(separator: "\n"))
            return
        }
        let preview = PreviewViewController(cart: cart)
        preview.hidesBottomBarWhenPushed = true
        preview.delegate = self
        navigationController?.pushViewController(preview, animated: true)
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
