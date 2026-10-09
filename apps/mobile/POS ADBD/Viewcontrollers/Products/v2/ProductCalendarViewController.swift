//
//  ProductCalendarViewController.swift
//  POS ADBD
//
//  #642 "Lịch trống" of a product (mockups/lich-trong.png): month grid of free units per Vietnam civil day, a
//  pickup → return range, the orders holding the product on the tapped day, and "Thêm vào giỏ với ngày này".
//  Opened from the calendar tile at the end of the product detail's day strip. No money on this screen (staff too).
//

import UIKit
import SnapKit

final class ProductCalendarViewController: BaseViewControler {
    private let product: Product
    private let productId: Int
    /// RESERVED / PICKUPED orders of the product (the list the detail already loaded); nil → loaded here
    private var orders: [Order]?
    private let todayKey = DayFormatter.key(Date())
    private var year: Int
    private var month: Int
    private var available: [String: Int] = [:]
    private var stock: Int?
    private var range = ProductCalendarRange.empty
    /// Day whose orders are listed
    private var focusKey: String
    private var loadingMonths = Set<String>()
    private var loadedMonths = Set<String>()
    private var overlapAllowed = OverlapSetting.isAllowed
    /// The product went into the cart with the chosen days
    var onAdded: (() -> Void)?

    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let thumb = V2.thumbnail(size: 52, radius: 12)
    private let nameLabel = V2.label(size: DS.TextSize.name, weight: .bold, lines: 2)
    private let subLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let monthLabel = V2.label(size: 18, weight: .bold)
    private let previousButton = CustomersV2UI.iconButton("chevron.left", label: "calendar.v2.prevMonth".localized(), size: DS.Icon.lg)
    private let nextButton = CustomersV2UI.iconButton("chevron.right", label: "calendar.v2.nextMonth".localized(), size: DS.Icon.lg)
    private let gridStack = UIStackView()
    private let ordersHeader = V2.label(size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted, lines: 0)
    private let ordersStack = UIStackView()
    private let summaryLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.text, lines: 0)
    private let noteLabel = V2.label(size: DS.TextSize.secondary, color: V2.warn, lines: 0)
    private let addButton = V2.primaryButton("products.calendar.add".localized())

    private enum Palette {
        static let fullFill = UIColor(hexString: "ECFDF5"), fullText = UIColor(hexString: "065F46")
        static let lowFill = UIColor(hexString: "FFF7ED"), lowText = UIColor(hexString: "7C2D12")
        static let outFill = UIColor(hexString: "FEE2E2"), outText = UIColor(hexString: "7F1D1D")
        static let pastFill = UIColor(hexString: "F8FAFC"), pastText = UIColor(hexString: "94A3B8")
        static let betweenFill = UIColor(hexString: "DBEAFE")
        static let fullMark = UIColor(hexString: "A7F3D0"), lowMark = UIColor(hexString: "FED7AA"), outMark = UIColor(hexString: "FECACA")
    }

    /// `focusDay` (`yyyy-MM-dd`, #684): open on that day and month (the cart's "Trùng đơn ngày …"); today otherwise
    init(product: Product, orders: [Order]?, focusDay: String? = nil) {
        self.product = product
        productId = product.id ?? product.product_id
        self.orders = orders
        let key = focusDay.flatMap { CalendarV2Logic.parts(of: $0) != nil ? $0 : nil } ?? DayFormatter.key(Date())
        let parts = CalendarV2Logic.parts(of: key)!
        year = parts.year
        month = parts.month
        focusKey = key
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildLayout()
        renderProduct()
        render()
        loadMonth()
        if orders == nil { loadOrders() }
        OverlapSetting.refresh { [weak self] allowed in
            self?.overlapAllowed = allowed
            self?.renderSummary()
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    // MARK: - Layout

    private func buildLayout() {
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(goBack), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "products.detail.freeCalendar".localized(), back: back)
        line.isHidden = true

        // Bottom: range summary, overlap note, add
        let bottom = UIView()
        bottom.backgroundColor = .white
        let topLine = V2.divider()
        topLine.backgroundColor = DS.Color.border
        noteLabel.isHidden = true
        addButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        addButton.accessibilityIdentifier = "product.calendar.add"
        let bottomStack = UIStackView(arrangedSubviews: [summaryLabel, noteLabel, addButton])
        bottomStack.axis = .vertical
        bottomStack.spacing = 10
        [topLine, bottomStack].forEach(bottom.addSubview)
        view.addSubview(bottom)
        bottom.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        topLine.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        bottomStack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }

        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottom.snp.top)
        }
        content.axis = .vertical
        content.isLayoutMarginsRelativeArrangement = true
        content.layoutMargins = UIEdgeInsets(top: 8, left: 12, bottom: 24, right: 12)
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }

        // Product row
        thumb.contentMode = .center
        let texts = UIStackView(arrangedSubviews: [nameLabel, subLabel])
        texts.axis = .vertical
        texts.spacing = 2
        let productRow = UIStackView(arrangedSubviews: [thumb, texts])
        productRow.spacing = 12
        productRow.alignment = .center
        productRow.isLayoutMarginsRelativeArrangement = true
        productRow.layoutMargins = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: 4)
        content.addArrangedSubview(productRow)
        content.setCustomSpacing(14, after: productRow)

        // Month ‹ title ›
        monthLabel.textAlignment = .center
        previousButton.addTarget(self, action: #selector(previousMonth), for: .touchUpInside)
        nextButton.addTarget(self, action: #selector(nextMonth), for: .touchUpInside)
        let monthRow = UIStackView(arrangedSubviews: [previousButton, monthLabel, nextButton])
        monthRow.alignment = .center
        content.addArrangedSubview(monthRow)
        content.setCustomSpacing(6, after: monthRow)

        let weekdays = UIStackView(arrangedSubviews: "calendar.v2.weekdays".localized().split(separator: ",").map {
            let label = V2.label(String($0), size: DS.TextSize.secondary, weight: .medium, color: DS.Color.textMuted)
            label.textAlignment = .center
            return label
        })
        weekdays.distribution = .fillEqually
        content.addArrangedSubview(weekdays)
        content.setCustomSpacing(8, after: weekdays)

        gridStack.axis = .vertical
        gridStack.spacing = 5
        content.addArrangedSubview(gridStack)
        content.setCustomSpacing(12, after: gridStack)

        let legend = UIStackView(arrangedSubviews: [
            legendItem(Palette.fullMark, "products.calendar.legend.full".localized()),
            legendItem(Palette.lowMark, "products.calendar.legend.low".localized()),
            legendItem(Palette.outMark, "products.calendar.legend.out".localized()),
            legendItem(DS.Color.primary, "products.calendar.legend.selected".localized()),
        ])
        legend.spacing = 14
        let legendRow = UIStackView(arrangedSubviews: [legend, UIView()])
        legendRow.isLayoutMarginsRelativeArrangement = true
        legendRow.layoutMargins = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: 4)
        content.addArrangedSubview(legendRow)
        content.setCustomSpacing(14, after: legendRow)

        let divider = V2.divider()
        divider.backgroundColor = DS.Color.border
        let dividerWrap = UIStackView(arrangedSubviews: [divider])
        dividerWrap.isLayoutMarginsRelativeArrangement = true
        dividerWrap.layoutMargins = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: 4)
        content.addArrangedSubview(dividerWrap)
        content.setCustomSpacing(14, after: dividerWrap)

        // Orders of the tapped day
        let headerWrap = UIStackView(arrangedSubviews: [ordersHeader])
        headerWrap.isLayoutMarginsRelativeArrangement = true
        headerWrap.layoutMargins = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: 4)
        content.addArrangedSubview(headerWrap)
        content.setCustomSpacing(4, after: headerWrap)
        ordersStack.axis = .vertical
        content.addArrangedSubview(ordersStack)
    }

    private func legendItem(_ color: UIColor, _ title: String) -> UIView {
        let mark = UIView()
        mark.backgroundColor = color
        mark.layer.cornerRadius = 4
        mark.snp.makeConstraints { make in make.width.height.equalTo(12) }
        let label = V2.label(title, size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let stack = UIStackView(arrangedSubviews: [mark, label])
        stack.spacing = 5
        stack.alignment = .center
        return stack
    }

    // MARK: - Render

    private func renderProduct() {
        nameLabel.text = product.name
        if let url = ProductImages.thumbnailUrl(product) {
            thumb.contentMode = .scaleAspectFill
            V2.setImage(thumb, url: url)
        } else {
            thumb.contentMode = .center
            thumb.image = DS.symbol("tshirt", 26)
        }
        let total = stock ?? ProductStock.counts(product, outletId: User.current()?.outlet?.id ?? User.current()?.outletId).total
        let code = (product.barcode ?? "").trimmingCharacters(in: .whitespaces)
        let totalText = String(format: "products.calendar.total".localized(), total)
        subLabel.text = code.isEmpty ? totalText : "\(code) · \(totalText)"
    }

    private func render() {
        renderMonth()
        renderOrders()
        renderSummary()
    }

    private func renderMonth() {
        monthLabel.text = monthTitle()
        let canGoBack = ProductCalendarLogic.canGoBack(year: year, month: month, todayKey: todayKey)
        previousButton.isEnabled = canGoBack
        previousButton.alpha = canGoBack ? 1 : 0.3

        gridStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let cells = ProductCalendarLogic.monthCells(year: year, month: month)
        for week in stride(from: 0, to: cells.count, by: 7) {
            let row = UIStackView(arrangedSubviews: cells[week..<min(week + 7, cells.count)].map { dayCell($0) })
            row.distribution = .fillEqually
            row.spacing = 5
            row.snp.makeConstraints { make in make.height.equalTo(52) }
            gridStack.addArrangedSubview(row)
        }
    }

    private func dayCell(_ key: String?) -> UIView {
        guard let key, let day = CalendarV2Logic.parts(of: key)?.day else { return UIView() }
        let cell = UIControl()
        cell.accessibilityIdentifier = "product.calendar.day.\(key)"
        cell.layer.cornerRadius = 10
        let past = ProductCalendarLogic.isPast(key, todayKey: todayKey)
        let free = available[key]
        let total = stock ?? 0
        let tone = ProductCalendarLogic.tone(available: free, stock: total, isPast: past)
        let selection = ProductCalendarLogic.selection(key, range: range)

        var (fill, color): (UIColor, UIColor)
        switch tone {
        case .full: (fill, color) = (Palette.fullFill, Palette.fullText)
        case .low: (fill, color) = (Palette.lowFill, Palette.lowText)
        case .out: (fill, color) = (Palette.outFill, Palette.outText)
        case .past: (fill, color) = (Palette.pastFill, Palette.pastText)
        case .unknown: (fill, color) = (V2.sectionFill, DS.Color.textMuted)
        }
        switch selection {
        case .start, .end: (fill, color) = (DS.Color.primary, .white)
        case .between: (fill, color) = (Palette.betweenFill, DS.Color.primary)
        case .none: break
        }
        cell.backgroundColor = fill
        if key == todayKey {
            cell.layer.borderWidth = 2
            cell.layer.borderColor = DS.Color.text.cgColor
        }

        let number = V2.label("\(day)", size: 17, weight: .bold, color: color)
        number.textAlignment = .center
        var countText: String?
        if !past, let free {
            countText = free > 0 ? String(format: "products.calendar.free".localized(), free) : "products.calendar.out".localized()
        }
        let count = V2.label(countText, size: DS.TextSize.pill, weight: .medium, color: color)
        count.textAlignment = .center
        count.adjustsFontSizeToFitWidth = true
        count.minimumScaleFactor = 0.7
        count.isHidden = countText == nil
        let stack = UIStackView(arrangedSubviews: [number, count])
        stack.axis = .vertical
        stack.spacing = 0
        stack.isUserInteractionEnabled = false
        cell.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.leading.trailing.equalToSuperview().inset(2)
        }
        cell.isAccessibilityElement = true
        cell.accessibilityTraits = selection == .none ? UIAccessibilityTraitButton : UIAccessibilityTraitButton | UIAccessibilityTraitSelected
        cell.accessibilityLabel = [dayLabel(key), countText].compactMap { $0 }.joined(separator: ", ")
        cell.addAction(UIAction { [weak self] _ in self?.dayTapped(key) }, for: .touchUpInside)
        return cell
    }

    private func renderOrders() {
        ordersStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let rows = ProductCalendarLogic.orders(orders ?? [], covering: focusKey)
        ordersHeader.text = (dayLabel(focusKey) + " · " + String(format: "products.calendar.dayOrders".localized(), rows.count)).uppercased()
        guard orders != nil else { return }
        if rows.isEmpty {
            let empty = V2.label("products.calendar.noOrders".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
            let wrap = UIStackView(arrangedSubviews: [empty])
            wrap.isLayoutMarginsRelativeArrangement = true
            wrap.layoutMargins = UIEdgeInsets(top: 8, left: 4, bottom: 8, right: 4)
            ordersStack.addArrangedSubview(wrap)
            return
        }
        for order in rows { ordersStack.addArrangedSubview(orderRow(order)) }
    }

    private func orderRow(_ order: Order) -> UIView {
        let row = UIControl()
        let name = NSMutableAttributedString(string: order.customerName + " ",
                                             attributes: [.font: Utils.boldFont(size: DS.TextSize.name), .foregroundColor: DS.Color.text])
        name.append(NSAttributedString(string: "#\(order.orderNumber)",
                                       attributes: [.font: Utils.boldFont(size: DS.TextSize.name), .foregroundColor: DS.Color.textMuted]))
        let nameLabel = UILabel()
        nameLabel.attributedText = name
        let pickup = order.pickupPlanAt.map { OrdersHomeLogic.rowDay($0) } ?? "–"
        let ret = order.returnPlanAt.map { OrdersHomeLogic.rowDay($0) } ?? "–"
        let days = V2.label(String(format: "products.calendar.orderDays".localized(), pickup, ret),
                            size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [nameLabel, days])
        texts.axis = .vertical
        texts.spacing = 2
        texts.isUserInteractionEnabled = false
        let qty = V2.label(String(format: "products.calendar.qty".localized(), ProductCalendarLogic.quantity(order, productId: productId)),
                           size: DS.TextSize.body, weight: .bold)
        qty.setContentCompressionResistancePriority(.required, for: .horizontal)
        qty.setContentHuggingPriority(.required, for: .horizontal)
        [texts, qty].forEach(row.addSubview)
        texts.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(4)
            make.top.bottom.equalToSuperview().inset(8)
            make.trailing.lessThanOrEqualTo(qty.snp.leading).offset(-8)
        }
        qty.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-4)
            make.centerY.equalToSuperview()
        }
        row.isAccessibilityElement = true
        row.accessibilityTraits = UIAccessibilityTraitButton
        row.accessibilityLabel = [order.customerName, "#\(order.orderNumber)", days.text, qty.text].compactMap { $0 }.joined(separator: ", ")
        let id = order.id
        row.addAction(UIAction { [weak self] _ in self?.openOrder(id) }, for: .touchUpInside)
        return row
    }

    private func renderSummary() {
        let minimum = ProductCalendarLogic.minAvailable(range, available: available)
        let canAdd = ProductCalendarLogic.canAdd(range: range, minAvailable: minimum, overlapAllowed: overlapAllowed)
        addButton.isEnabled = canAdd
        addButton.alpha = canAdd ? 1 : 0.4
        noteLabel.isHidden = !(canAdd && minimum == 0)
        noteLabel.text = "products.calendar.overlapNote".localized()

        let regular: [NSAttributedString.Key: Any] = [.font: Utils.regularFont(size: DS.TextSize.secondary), .foregroundColor: DS.Color.text]
        let bold: [NSAttributedString.Key: Any] = [.font: Utils.boldFont(size: DS.TextSize.secondary), .foregroundColor: DS.Color.text]
        guard let start = range.start else {
            summaryLabel.attributedText = NSAttributedString(string: "products.calendar.pickStart".localized(),
                                                             attributes: [.font: Utils.regularFont(size: DS.TextSize.secondary), .foregroundColor: DS.Color.textMuted])
            return
        }
        guard let end = range.end else {
            let text = NSMutableAttributedString(string: dayLabel(start) + " → ", attributes: regular)
            text.append(NSAttributedString(string: "products.calendar.pickEnd".localized(),
                                           attributes: [.font: Utils.regularFont(size: DS.TextSize.secondary), .foregroundColor: DS.Color.textMuted]))
            summaryLabel.attributedText = text
            return
        }
        let count = ProductCalendarLogic.dayCount(range)
        let text = NSMutableAttributedString(string: "\(dayLabel(start)) → \(dayLabel(end)) · "
                                             + PluralText.format("products.calendar.days", count: count, count), attributes: regular)
        if let minimum {
            text.append(NSAttributedString(string: " · ", attributes: regular))
            if minimum > 0 {
                text.append(NSAttributedString(string: String(format: "products.calendar.minFree".localized(), minimum), attributes: bold))
            } else {
                var red = bold
                red[.foregroundColor] = V2.danger
                text.append(NSAttributedString(string: "products.calendar.out".localized(), attributes: red))
            }
        }
        summaryLabel.attributedText = text
    }

    /// "T4 07/10" of a key
    private func dayLabel(_ key: String) -> String {
        guard let date = ProductCalendarLogic.date(of: key) else { return key }
        return OrdersHomeLogic.rowDay(date)
    }

    /// "Tháng 10, 2026" / "October 2026"
    private func monthTitle() -> String {
        let locale = OrdersHomeLogic.appLocale
        if locale.languageCode == "vi" {
            return String(format: "products.calendar.month".localized(), month, year)
        }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.dateFormat = "LLLL yyyy"
        let date = CalendarV2Logic.gregorian(TimeZone(identifier: "UTC")!).date(from: DateComponents(year: year, month: month, day: 1))
        return date.map { formatter.string(from: $0) } ?? "\(month)/\(year)"
    }

    // MARK: - Data

    private var monthId: String { String(format: "%04d-%02d", year, month) }

    private func loadMonth() {
        let id = monthId
        guard !loadedMonths.contains(id), !loadingMonths.contains(id) else { return }
        loadingMonths.insert(id)
        let bounds = ProductCalendarLogic.monthBounds(year: year, month: month)
        loadAvailability(from: bounds.from, to: bounds.to) { [weak self] ok in
            self?.loadingMonths.remove(id)
            if ok { self?.loadedMonths.insert(id) }
        }
    }

    /// GET /api/products/{id}/availability-calendar?from&to (the detail strip's call), merged into `available`
    private func loadAvailability(from: String, to: String, done: @escaping (Bool) -> Void) {
        var params: [String: Any] = ["from": from, "to": to]
        if let outletId = User.current()?.outlet?.id ?? User.current()?.outletId { params["outletId"] = outletId }
        OrderService.shared.performGET(path: "/api/products/\(productId)/availability-calendar", parameters: params,
                                       responseType: AvailabilityCalendarResponse.self,
                                       context: "ProductCalendar.month") { [weak self] response, _ in
            DispatchQueue.main.async {
                guard let self else { return }
                guard let data = response?.data, let days = data.days else { done(false); return }
                days.forEach { self.available[$0.date] = $0.available }
                if let stock = data.stock {
                    self.stock = stock
                    self.renderProduct()
                }
                done(true)
                self.render()
            }
        }
    }

    /// A range through a month never shown: load the days it misses so "còn ít nhất" is right
    private func loadMissingRangeDays() {
        let missing = ProductCalendarLogic.missingKeys(range, available: available)
        guard let first = missing.first, let last = missing.last else { return }
        loadAvailability(from: first, to: last) { _ in }
    }

    private func loadOrders() {
        let group = DispatchGroup()
        var found: [Order] = []
        for status in [OrderStatus.reserved, .pickuped] {
            group.enter()
            OrderService.shared.loadOrders(productIds: nil, productId: productId, keyword: nil, page: 1, limit: 50,
                                           sortBy: "pickupPlanAt", sortOrder: "asc", status: status) { response, _ in
                DispatchQueue.main.async {
                    found += response?.data?.orders ?? []
                    group.leave()
                }
            }
        }
        group.notify(queue: .main) { [weak self] in
            self?.orders = found
            self?.renderOrders()
        }
    }

    // MARK: - Actions

    private func dayTapped(_ key: String) {
        focusKey = key
        range = ProductCalendarLogic.tap(key, range: range, todayKey: todayKey)
        HapticFeedback.light()
        render()
        if range.isComplete { loadMissingRangeDays() }
    }

    @objc private func previousMonth() {
        guard ProductCalendarLogic.canGoBack(year: year, month: month, todayKey: todayKey) else { return }
        (year, month) = CalendarV2Logic.addMonths(year: year, month: month, delta: -1)
        renderMonth()
        loadMonth()
    }

    @objc private func nextMonth() {
        (year, month) = CalendarV2Logic.addMonths(year: year, month: month, delta: 1)
        renderMonth()
        loadMonth()
    }

    @objc private func goBack() {
        navigationController?.popViewController(animated: true)
    }

    /// Same path as the detail's add plus the cart's date pick: a rental line, pickup at the start of the first
    /// shop day, return at the end of the last one
    @objc private func addTapped() {
        guard let bounds = ProductCalendarLogic.cartBounds(range) else { return }
        if CartStore.shared.cart.orderType != .rent {
            CartStore.shared.setOrderType(.rent, syncPrices: true)
        }
        ProductsCartBridge.add(product)
        CartStore.shared.setPickupDate(bounds.pickup)
        CartStore.shared.setReturnDate(bounds.return)
        HapticFeedback.light()
        onAdded?()
        navigationController?.popViewController(animated: true)
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

extension ProductCalendarViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        // An order changed: refresh the free counts and the orders of the day
        loadedMonths.removeAll()
        available.removeAll()
        loadMonth()
        orders = nil
        loadOrders()
    }
}
