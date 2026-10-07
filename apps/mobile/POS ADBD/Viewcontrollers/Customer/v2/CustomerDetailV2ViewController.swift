//
//  CustomerDetailV2ViewController.swift
//  POS ADBD
//
//  Customer detail (#387, board KH-chi-tiet): header with tier and call, three tiles (Số đơn, Tổng chi, Đang thuê),
//  recent orders, and "Tạo đơn cho khách này".
//

import UIKit
import SnapKit

final class CustomerDetailV2ViewController: BaseViewControler {
    private var customer: Customer
    private let dataSource: CustomersV2DataSource
    private var orders: CustomerOrdersV2?
    private var renting: Int?
    private var loadGeneration = 0

    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let avatar = CustomersV2UI.avatar(size: 56, fontSize: 18)
    private let nameLabel = V2.label(size: 20, weight: .bold, lines: 2)
    private let tierPill = CustomersV2UI.tierPill()
    private let phoneLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted)
    private let callButton = UIButton(type: .system)
    private let tiles = UIStackView()
    private let ordersStack = UIStackView()
    private let ordersMessage = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)

    private var customerId: Int { customer.id ?? customer.customer_id }
    private var hidesMoney: Bool {
        OrdersHomeLogic.hidesMoney(role: User.current()?.role, hideForStaff: Utils.shouldHideFinancialDataForStaff())
    }

    init(customer: Customer, dataSource: CustomersV2DataSource = LiveCustomersV2DataSource()) {
        self.customer = customer
        self.dataSource = dataSource
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        renderHeader()
        renderTiles()
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.background

        let top = UIView()
        top.backgroundColor = .white
        let back = CustomersV2UI.iconButton("chevron.left", label: "products.cart.back".localized(), size: DS.Icon.lg)
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let bar = UIStackView(arrangedSubviews: [back, UIView()])
        bar.alignment = .center
        if PermissionManager.shared.canManageCustomers() {
            let edit = CustomersV2UI.textButton("customers.v2.edit".localized(), color: DS.Color.primary)
            edit.addTarget(self, action: #selector(editTapped), for: .touchUpInside)
            bar.addArrangedSubview(edit)
        }

        callButton.setImage(DS.symbol("phone", DS.Icon.sm), for: .normal)
        callButton.tintColor = DS.Color.primary
        callButton.backgroundColor = CustomersV2UI.avatarFill
        callButton.layer.cornerRadius = DS.touchTarget / 2
        callButton.accessibilityLabel = "customers.v2.call".localized()
        callButton.addTarget(self, action: #selector(callTapped), for: .touchUpInside)
        callButton.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }

        let nameRow = UIStackView(arrangedSubviews: [nameLabel, tierPill])
        nameRow.spacing = 6
        nameRow.alignment = .center
        let texts = UIStackView(arrangedSubviews: [nameRow, phoneLabel])
        texts.axis = .vertical
        texts.spacing = DS.Gap.lineTight
        texts.alignment = .leading
        let who = UIStackView(arrangedSubviews: [avatar, texts, callButton])
        who.spacing = 12
        who.alignment = .center
        texts.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)

        tiles.axis = .horizontal
        tiles.distribution = .fillEqually
        tiles.spacing = 8

        let topStack = UIStackView(arrangedSubviews: [bar, who, tiles])
        topStack.axis = .vertical
        topStack.spacing = 4
        topStack.setCustomSpacing(16, after: who)
        top.addSubview(topStack)
        topStack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(8)
            make.leading.trailing.equalToSuperview().inset(8)
            make.bottom.equalToSuperview().offset(-16)
        }
        who.isLayoutMarginsRelativeArrangement = true
        who.layoutMargins = UIEdgeInsets(top: 4, left: 8, bottom: 0, right: 8)
        tiles.isLayoutMarginsRelativeArrangement = true
        tiles.layoutMargins = UIEdgeInsets(top: 0, left: 8, bottom: 0, right: 8)

        let ordersTitle = V2.label("customers.v2.recentOrders".localized().uppercased(), size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
        let titleWrap = UIView()
        titleWrap.addSubview(ordersTitle)
        ordersTitle.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.top.equalToSuperview().offset(16)
            make.bottom.equalToSuperview().offset(-6)
        }

        ordersStack.axis = .vertical
        ordersStack.backgroundColor = .white
        ordersMessage.textAlignment = .center
        let messageWrap = UIView()
        messageWrap.backgroundColor = .white
        [ordersMessage, spinner].forEach(messageWrap.addSubview)
        ordersMessage.snp.makeConstraints { make in make.edges.equalToSuperview().inset(24) }
        spinner.snp.makeConstraints { make in make.center.equalToSuperview() }

        content.axis = .vertical
        [top, titleWrap, ordersStack, messageWrap].forEach(content.addArrangedSubview)
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }

        let bottom = UIView()
        bottom.backgroundColor = .white
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        let cta = V2.primaryButton("customers.v2.createOrder".localized())
        cta.addTarget(self, action: #selector(createOrderTapped), for: .touchUpInside)
        [line, cta].forEach(bottom.addSubview)
        let statusFill = UIView()
        statusFill.backgroundColor = .white
        [statusFill, scroll, bottom].forEach(view.addSubview)
        line.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        cta.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }
        statusFill.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide.snp.top)
        }
        bottom.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        scroll.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottom.snp.top)
        }
    }

    // MARK: - Data

    private func load() {
        loadGeneration += 1
        let token = loadGeneration
        guard customerId > 0 else { return }
        spinner.startAnimating()
        ordersMessage.text = nil
        dataSource.loadOrders(customerId: customerId, limit: CustomersV2Logic.pageSize) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, token == self.loadGeneration else { return }
                self.spinner.stopAnimating()
                if let error {
                    self.ordersMessage.text = error.localizedDescription
                    return
                }
                self.orders = result
                if let snapshot = result?.customer {
                    // The snapshot has the current tier; keep fields it does not carry
                    self.customer.loyalty = snapshot.loyalty
                    self.customer.loyaltyStatus = snapshot.loyaltyStatus
                    self.customer.phone = snapshot.phone
                    if let first = snapshot.firstName {
                        self.customer.firstName = first
                        self.customer.lastName = snapshot.lastName
                        self.customer.full_name = nil
                    }
                }
                self.renderHeader()
                self.renderTiles()
                self.renderOrders()
            }
        }
        dataSource.countRenting(customerId: customerId) { [weak self] count in
            DispatchQueue.main.async {
                guard let self, token == self.loadGeneration else { return }
                self.renting = count
                self.renderTiles()
            }
        }
    }

    // MARK: - Render

    private func renderHeader() {
        let name = CustomersV2Logic.displayName(customer)
        avatar.text = CustomersV2Logic.initials(name)
        nameLabel.text = name
        CustomersV2UI.setTier(tierPill, CustomersV2Logic.tierName(customer))
        let phone = customer.phone?.nilIfEmpty
        phoneLabel.text = phone
        phoneLabel.isHidden = phone == nil
        callButton.isHidden = CustomersV2Logic.phoneDigits(phone).isEmpty
    }

    private func renderTiles() {
        tiles.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let values = CustomersV2Logic.tiles(totalOrders: orders?.totalOrders ?? customer.orderCount,
                                            totalAmount: orders?.totalAmount ?? 0,
                                            renting: renting, hidesMoney: hidesMoney || orders == nil)
        for tile in values {
            let box = UIView()
            box.layer.borderWidth = 1
            box.layer.borderColor = UIColor(hexString: "EEF0F3").cgColor
            box.layer.cornerRadius = DS.Radius.card
            let title = V2.label(tile.title, size: DS.TextSize.secondary, color: DS.Color.textMuted)
            let value = V2.label(tile.value, size: DS.TextSize.name, weight: .bold)
            value.adjustsFontSizeToFitWidth = true
            value.minimumScaleFactor = 0.7
            let stack = UIStackView(arrangedSubviews: [title, value])
            stack.axis = .vertical
            stack.spacing = DS.Gap.lineTight
            box.addSubview(stack)
            stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(10) }
            box.isAccessibilityElement = true
            box.accessibilityLabel = "\(tile.title): \(tile.value)"
            tiles.addArrangedSubview(box)
        }
    }

    private func renderOrders() {
        ordersStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let rows = orders?.orders ?? []
        ordersMessage.text = rows.isEmpty ? "customers.v2.noOrders".localized() : nil
        ordersMessage.superview?.isHidden = !rows.isEmpty
        for (index, row) in rows.enumerated() {
            ordersStack.addArrangedSubview(orderRow(row, index: index))
        }
    }

    private func orderRow(_ row: CustomerOrderRow, index: Int) -> UIView {
        let control = UIControl()
        control.tag = index
        control.addTarget(self, action: #selector(orderTapped(_:)), for: .touchUpInside)
        let title = V2.label(CustomersV2Logic.orderTitle(row), size: DS.TextSize.name, weight: .bold)
        let dates = V2.label(CustomersV2Logic.orderDates(row), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [title, dates])
        texts.axis = .vertical
        texts.spacing = DS.Gap.lineTight
        texts.isUserInteractionEnabled = false
        let pill = OrderStatusPillLabel()
        pill.apply(status: row.status)
        // Board pill colors: reserved blue, out purple, done green, cancelled grey
        let colors: DS.Pill
        switch row.status {
        case .reserved, .draft: colors = DS.Status.handOver
        case .pickuped: colors = DS.Status.returning
        case .returned, .completed: colors = DS.Status.done
        case .cancelled, .unknown: colors = DS.Status.cancelled
        }
        pill.textColor = colors.text
        pill.backgroundColor = colors.fill
        pill.font = Utils.boldFont(size: DS.TextSize.pill)
        // Sentence case as on the board ("Đang thuê", not "ĐANG THUÊ")
        let lower = (pill.text ?? "").lowercased()
        pill.text = lower.prefix(1).uppercased() + lower.dropFirst()
        let amount = V2.label(hidesMoney ? nil : MoneyFormatter.format(row.totalAmount), size: DS.TextSize.body, weight: .bold)
        let right = UIStackView(arrangedSubviews: [pill, amount])
        right.axis = .vertical
        right.alignment = .trailing
        right.spacing = 4
        right.isUserInteractionEnabled = false
        let line = V2.divider()
        [texts, right, line].forEach(control.addSubview)
        texts.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.centerY.equalToSuperview()
            make.trailing.lessThanOrEqualTo(right.snp.leading).offset(-12)
        }
        right.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        control.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(64) }
        control.isAccessibilityElement = true
        control.accessibilityTraits = UIAccessibilityTraitButton
        control.accessibilityLabel = [title.text, dates.text, pill.text, amount.text].compactMap { $0 }.joined(separator: ", ")
        return control
    }

    // MARK: - Actions

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func callTapped() {
        let digits = CustomersV2Logic.phoneDigits(customer.phone)
        guard !digits.isEmpty, let url = URL(string: "tel://\(digits)") else { return }
        UIApplication.shared.open(url)
    }

    @objc private func editTapped() {
        let edit = EditCustomerViewController(customerId: customerId, dataSource: dataSource)
        edit.hidesBottomBarWhenPushed = true
        edit.onSaved = { [weak self] in self?.load() }
        navigationController?.pushViewController(edit, animated: true)
    }

    @objc private func orderTapped(_ sender: UIControl) {
        guard let rows = orders?.orders, rows.indices.contains(sender.tag) else { return }
        let row = rows[sender.tag]
        OrderDetailRouter.open(orderId: row.id, from: self)
    }

    /// The cart gets this customer (an order being edited is dropped first), then the cart opens
    @objc private func createOrderTapped() {
        if CartStore.shared.cart.isEditMode {
            CartStore.shared.resetCart()
        }
        CartStore.shared.setCustomer(customer)
        if FeatureFlags.shared.isOn(.newProducts) {
            let cart = CartV2ViewController()
            cart.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(cart, animated: true)
            return
        }
        // Current Home: the cart lives on the first tab
        navigationController?.popToRootViewController(animated: false)
        (appDelegate.window?.rootViewController as? UITabBarController)?.selectedIndex = 0
    }
}
