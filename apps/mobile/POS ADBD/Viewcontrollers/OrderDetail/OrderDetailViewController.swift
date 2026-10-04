//
//  OrderDetailViewController.swift
//  POS ADBD
//
//  Redesigned order detail behind `newOrderDetail` (#372, boards CT-gon, CT-qua-han, CT-ban).
//  Actions reuse OrderViewModel (status, cancel, delete, print, notes); edit reuses the cart flow.
//

import UIKit
import SnapKit
import Kingfisher

final class OrderDetailViewController: BaseViewControler {
    private let orderId: Int
    private var detail: OrderDetail?
    private var orderViewModel: OrderViewModel?
    private var loadGeneration = 0

    private let scrollView = UIScrollView()
    private let contentStack = UIStackView()
    private let bottomBar = UIView()
    private let bottomStack = UIStackView()
    private let stateView = OrdersStateView()
    private let printButton = UIButton(type: .system)
    private let moreButton = UIButton(type: .system)
    private let pullRefresh = UIRefreshControl()

    init(orderId: Int) {
        self.orderId = orderId
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        let navBar = setupCustomNavigationBar(title: "", hideBackButton: false)
        printButton.setImage(DS.symbol("printer", DS.Icon.md), for: .normal)
        printButton.tintColor = DS.Color.text
        printButton.accessibilityLabel = "Print receipt".localized()
        printButton.addTarget(self, action: #selector(printTapped), for: .touchUpInside)
        moreButton.setImage(DS.symbol("ellipsis", DS.Icon.md), for: .normal)
        moreButton.tintColor = DS.Color.text
        moreButton.accessibilityLabel = "More actions".localized()
        moreButton.showsMenuAsPrimaryAction = true
        navBar.addRightButton(printButton)
        navBar.addRightButton(moreButton)
        buildLayout()
        load()
    }

    private func buildLayout() {
        view.backgroundColor = DS.Color.surface
        view.addSubview(scrollView)
        view.addSubview(bottomBar)
        view.addSubview(stateView)
        contentStack.axis = .vertical
        contentStack.spacing = 0
        scrollView.alwaysBounceVertical = true
        scrollView.refreshControl = pullRefresh
        pullRefresh.addTarget(self, action: #selector(pulled), for: .valueChanged)
        scrollView.addSubview(contentStack)
        contentStack.snp.makeConstraints { make in
            make.top.bottom.equalTo(scrollView.contentLayoutGuide)
            make.leading.trailing.equalTo(scrollView.frameLayoutGuide)
        }

        bottomBar.backgroundColor = DS.Color.surface
        let topLine = UIView()
        topLine.backgroundColor = DS.Color.border
        bottomBar.addSubview(topLine)
        topLine.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(1)
        }
        bottomStack.axis = .horizontal
        bottomStack.spacing = 10
        bottomBar.addSubview(bottomStack)
        bottomStack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-DS.Spacing.sm)
        }

        scrollView.snp.makeConstraints { make in
            if let navBar = customNavBar {
                make.top.equalTo(navBar.snp.bottom)
            } else {
                make.top.equalTo(view.safeAreaLayoutGuide)
            }
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottomBar.snp.top)
        }
        bottomBar.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
        }
        stateView.snp.makeConstraints { make in make.edges.equalTo(scrollView) }
        stateView.onRetry = { [weak self] in self?.load() }
    }

    // MARK: - Loading

    @objc private func pulled() {
        load()
    }

    private func load() {
        loadGeneration += 1
        let generation = loadGeneration
        if detail == nil {
            stateView.isHidden = false
            stateView.show(.loading)
        }
        OrderService.shared.loadOrderDetail(orderId: orderId) { [weak self] detail, error in
            DispatchQueue.main.async {
                guard let self, generation == self.loadGeneration else { return }
                self.pullRefresh.endRefreshing()
                if let detail {
                    self.detail = detail
                    self.orderViewModel = OrderViewModel(order: Order.from(detail: detail))
                    self.stateView.isHidden = true
                    self.render()
                } else if self.detail == nil {
                    self.stateView.show(.error(error?.localizedDescription.localized() ?? ""))
                } else if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }

    private var payments: [OrderPaymentLine] {
        detail?.payments.map { OrderPaymentLine(amount: $0.amount, status: $0.status, notes: $0.notes) } ?? []
    }

    private func actions(for detail: OrderDetail) -> OrderDetailActions {
        let role = User.account()?.role
        return OrderDetailLogic.actions(
            orderType: detail.orderType,
            status: detail.status,
            canManageOrders: PermissionManager.shared.canManageOrders(),
            canDeleteCancelled: role == .outletAdmin || role == .merchant
        )
    }

    /// #390: "Gia hạn" for open rentals with `orders.update` (OUTLET_STAFF included; the API checks the outlet)
    private func canExtend(_ detail: OrderDetail) -> Bool {
        detail.returnPlanAt != nil && RentalExtension.canExtend(orderType: detail.orderType, status: detail.status,
                                                                canUpdateOrders: PermissionManager.shared.hasPermission("orders.update"))
    }

    private func lateDays(for detail: OrderDetail) -> Int {
        OrdersHomeLogic.lateDays(orderType: detail.orderType, status: detail.status,
                                 pickupPlanAt: detail.pickupPlanAt, returnPlanAt: detail.returnPlanAt)
    }

    // MARK: - Render

    private func render() {
        guard let detail, let order = orderViewModel?.currentOrder else { return }
        customNavBar?.title = "#\(detail.orderNumber)"
        contentStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        contentStack.addArrangedSubview(headerView(detail, order: order))
        contentStack.addArrangedSubview(infoRows(detail, order: order))
        contentStack.addArrangedSubview(sectionTitle(String(format: "ITEMS · %d".localized(), detail.orderItems.count)))
        for item in detail.orderItems {
            contentStack.addArrangedSubview(itemRow(item, orderType: detail.orderType))
        }
        contentStack.addArrangedSubview(sectionTitle("MONEY".localized()))
        contentStack.addArrangedSubview(moneyRows(detail))
        contentStack.addArrangedSubview(notesSection(detail))
        let spacer = UIView()
        spacer.snp.makeConstraints { make in make.height.equalTo(DS.Spacing.xl) }
        contentStack.addArrangedSubview(spacer)
        renderActions(detail)
    }

    private func headerView(_ detail: OrderDetail, order: Order) -> UIView {
        let name = UILabel()
        name.font = Utils.boldFont(size: 22)
        name.textColor = DS.Color.text
        name.numberOfLines = 2
        name.text = order.customerName.isEmpty ? "N/A" : order.customerName
        let pill = OrderStatusPillLabel()
        pill.apply(status: detail.status)
        pill.setContentCompressionResistancePriority(.required, for: .horizontal)
        pill.setContentHuggingPriority(.required, for: .horizontal)
        name.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let nameRow = UIStackView(arrangedSubviews: [name, pill])
        nameRow.axis = .horizontal
        nameRow.alignment = .center
        nameRow.spacing = DS.Spacing.sm

        let stack = UIStackView(arrangedSubviews: [nameRow])
        stack.axis = .vertical
        stack.spacing = 10

        let late = lateDays(for: detail)
        if late > 0 {
            stack.addArrangedSubview(lateBanner(detail, days: late))
        }
        if let phone = detail.customer.phone?.removeWhiteSpace(), !phone.isEmpty {
            let call = makeButton(title: phone, style: .tinted, symbol: "phone")
            call.addAction(UIAction { _ in
                if let url = URL(string: "tel://\(phone)") { UIApplication.shared.open(url) }
            }, for: .touchUpInside)
            call.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
            stack.addArrangedSubview(call)
        }
        if detail.orderType == .rent && detail.status != .cancelled {
            stack.addArrangedSubview(progressView(detail))
        }
        return padded(stack, top: DS.Spacing.xs, bottom: DS.Spacing.lg, thickBottom: true)
    }

    private func lateBanner(_ detail: OrderDetail, days: Int) -> UIView {
        let icon = UIImageView(image: DS.symbol("exclamationmark.triangle", DS.Icon.md))
        icon.tintColor = DS.Status.late.text
        icon.setContentHuggingPriority(.required, for: .horizontal)
        let title = UILabel()
        title.font = Utils.boldFont(size: 14)
        title.textColor = UIColor(hexString: "991B1B")
        let subtitle = UILabel()
        subtitle.font = Utils.regularFont(size: 13)
        subtitle.textColor = UIColor(hexString: "991B1B")
        if detail.status == .pickuped {
            title.text = String(format: "Return late %d days".localized(), days)
            subtitle.text = detail.returnPlanAt.map { String(format: "Due back %@".localized(), OrderDetailLogic.dayMonth($0)) }
        } else {
            title.text = String(format: "Hand-over late %d days".localized(), days)
            subtitle.text = detail.pickupPlanAt.map { String(format: "Planned hand-over %@".localized(), OrderDetailLogic.dayMonth($0)) }
        }
        let texts = UIStackView(arrangedSubviews: [title, subtitle])
        texts.axis = .vertical
        let row = UIStackView(arrangedSubviews: [icon, texts])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = 10
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)
        row.backgroundColor = UIColor(hexString: "FEF2F2")
        row.layer.cornerRadius = DS.Radius.card
        row.layer.borderWidth = 1
        row.layer.borderColor = UIColor(hexString: "FECACA").cgColor
        row.accessibilityElements = [texts]
        return row
    }

    private func progressView(_ detail: OrderDetail) -> UIView {
        let reached: Int
        switch detail.status {
        case .reserved: reached = 1
        case .pickuped: reached = 2
        case .returned: reached = 3
        default: reached = 0
        }
        let steps: [(String, Date?)] = [
            ("Booked".localized(), detail.createdAt),
            ("Hand over".localized(), detail.pickedUpAt ?? detail.pickupPlanAt),
            ("Return step".localized(), detail.returnedAt ?? detail.returnPlanAt),
        ]
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 6
        row.distribution = .fillEqually
        for (index, step) in steps.enumerated() {
            let done = index < reached
            let bar = UIView()
            bar.layer.cornerRadius = 2
            bar.backgroundColor = done ? DS.Color.primary : UIColor(hexString: "E2E8F0")
            bar.snp.makeConstraints { make in make.height.equalTo(4) }
            let label = UILabel()
            label.font = done ? Utils.boldFont(size: 12) : Utils.regularFont(size: 12)
            label.textColor = done ? DS.Color.primary : DS.Color.textMuted
            label.text = [step.0, step.1.map { OrderDetailLogic.dayMonth($0) }].compactMap { $0 }.joined(separator: " ")
            label.adjustsFontSizeToFitWidth = true
            label.minimumScaleFactor = 0.8
            let column = UIStackView(arrangedSubviews: [bar, label])
            column.axis = .vertical
            column.spacing = 5
            row.addArrangedSubview(column)
        }
        return row
    }

    private func infoRows(_ detail: OrderDetail, order: Order) -> UIView {
        let stack = UIStackView()
        stack.axis = .vertical
        if detail.orderType == .rent {
            if let from = detail.pickupPlanAt, let to = detail.returnPlanAt {
                let days = detail.rentalDuration ?? OrderDetailLogic.rentalDays(pickup: from, return: to) ?? 1
                stack.addArrangedSubview(keyValue("Rental dates".localized(),
                    "\(OrderDetailLogic.dayMonth(from)) → \(OrderDetailLogic.dayMonth(to)) · " + String(format: "%d days".localized(), days),
                    bold: true))
            }
            if let picked = detail.pickedUpAt, detail.status == .pickuped || detail.status == .returned {
                stack.addArrangedSubview(keyValue("Handed over".localized(), DayFormatter.short(picked)))
            }
            if let papers = detail.collateralDetails?.trimmingCharacters(in: .whitespacesAndNewlines), !papers.isEmpty {
                stack.addArrangedSubview(keyValue("Collateral".localized(), papers))
            }
        } else {
            let by = order.createdByName.trimmingCharacters(in: .whitespaces)
            stack.addArrangedSubview(keyValue("Sale date".localized(),
                DayFormatter.short(detail.createdAt) + (by.isEmpty ? "" : " · \(by)")))
        }
        return padded(stack, top: 0, bottom: 0)
    }

    private func itemRow(_ item: OrderItem, orderType: OrderType) -> UIView {
        let image = UIImageView()
        image.contentMode = .scaleAspectFill
        image.clipsToBounds = true
        image.layer.cornerRadius = 10
        image.layer.borderWidth = 1
        image.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        image.backgroundColor = UIColor(hexString: "E2E8F0")
        image.tintColor = DS.Color.textMuted
        image.kf.setImage(with: item.productImages?.first.flatMap { URL(string: $0) }, placeholder: UIImage(systemName: "tshirt"))
        image.snp.makeConstraints { make in make.size.equalTo(48) }

        let title = NSMutableAttributedString(string: item.productName, attributes: [
            NSAttributedString.Key.font: Utils.mediumFont(size: 15),
            NSAttributedString.Key.foregroundColor: DS.Color.text,
        ])
        title.append(NSAttributedString(string: " × \(item.quantity)", attributes: [
            NSAttributedString.Key.font: Utils.mediumFont(size: 15),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
        ]))
        let name = UILabel()
        name.attributedText = title
        name.numberOfLines = 2
        let calc = UILabel()
        calc.font = Utils.regularFont(size: 13)
        calc.textColor = DS.Color.textMuted
        let price = MoneyFormatter.format(item.unitPrice)
        if orderType == .sale {
            calc.text = String(format: "Sale price %@".localized(), price)
        } else if item.pricingType == "DAILY", let days = item.rentalDays {
            calc.text = String(format: "%@/day × %d days".localized(), price, days)
        } else {
            calc.text = "\(price) × \(item.quantity)"
        }
        let texts = UIStackView(arrangedSubviews: [name, calc])
        texts.axis = .vertical
        texts.spacing = 2
        let total = UILabel()
        total.font = Utils.boldFont(size: 15)
        total.textColor = DS.Color.text
        total.text = MoneyFormatter.format(item.totalPrice)
        total.setContentCompressionResistancePriority(.required, for: .horizontal)
        total.setContentHuggingPriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [image, texts, total])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = DS.Spacing.md
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 8, left: 0, bottom: 8, right: 0)
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(64) }
        return padded(row, top: 0, bottom: 0, divider: true)
    }

    private func moneyRows(_ detail: OrderDetail) -> UIView {
        let stack = UIStackView()
        stack.axis = .vertical
        let discount = detail.discountAmount
        if detail.orderType == .sale {
            let goods = detail.orderItems.reduce(0) { $0 + $1.totalPrice }
            stack.addArrangedSubview(keyValue("Goods total".localized(), MoneyFormatter.format(goods), divider: false))
            if discount > 0 {
                stack.addArrangedSubview(keyValue("Discount".localized(), MoneyFormatter.format(-discount), divider: false))
            }
            switch detail.status {
            case .completed:
                stack.addArrangedSubview(totalRow("Collected".localized(), MoneyFormatter.format(detail.totalAmount)))
            case .cancelled:
                stack.addArrangedSubview(totalRow("Order total".localized(), MoneyFormatter.format(detail.totalAmount)))
            default:
                let balance = OrderDetailLogic.balance(orderType: .sale, status: detail.status, total: detail.totalAmount,
                    deposit: 0, securityDeposit: 0, lateFee: 0, damageFee: 0, payments: payments)
                stack.addArrangedSubview(totalRow("To collect".localized(), MoneyFormatter.format(balance.amountDue)))
            }
            return padded(stack, top: 0, bottom: 0)
        }

        let totalTitle = discount > 0
            ? String(format: "Total (discount %@)".localized(), MoneyFormatter.format(discount))
            : "Order total".localized()
        stack.addArrangedSubview(keyValue(totalTitle, MoneyFormatter.format(detail.totalAmount), divider: false))
        if detail.depositAmount > 0 {
            stack.addArrangedSubview(keyValue("Deposit paid at booking".localized(), MoneyFormatter.format(-detail.depositAmount), divider: false))
        }
        if detail.securityDeposit > 0 {
            stack.addArrangedSubview(keyValue("Collateral money".localized(), "+" + MoneyFormatter.format(detail.securityDeposit), divider: false))
        }
        switch detail.status {
        case .reserved:
            let money = OrderDetailLogic.handOver(total: detail.totalAmount, deposit: detail.depositAmount,
                                                  securityDeposit: detail.securityDeposit, payments: payments)
            if money.paidBefore > 0 {
                stack.addArrangedSubview(keyValue("Already collected".localized(), MoneyFormatter.format(-money.paidBefore), divider: false))
            }
            stack.addArrangedSubview(totalRow("Collect at hand-over".localized(), MoneyFormatter.format(money.due)))
        case .pickuped:
            let money = OrderDetailLogic.returnMoney(lateFee: detail.lateFee, damageFee: detail.damageFee,
                                                     securityDeposit: detail.securityDeposit, payments: payments)
            if detail.lateFee > 0 {
                stack.addArrangedSubview(keyValue("Late fee".localized(), "+" + MoneyFormatter.format(detail.lateFee), divider: false))
            }
            if detail.damageFee > 0 {
                stack.addArrangedSubview(keyValue("Damage fee".localized(), "+" + MoneyFormatter.format(detail.damageFee), divider: false))
            }
            if money.refund > 0 {
                stack.addArrangedSubview(totalRow("At return: give back".localized(), MoneyFormatter.format(money.refund)))
            } else if money.collect > 0 {
                stack.addArrangedSubview(totalRow("At return: collect".localized(), MoneyFormatter.format(money.collect)))
            }
        default:
            if detail.lateFee > 0 {
                stack.addArrangedSubview(keyValue("Late fee".localized(), MoneyFormatter.format(detail.lateFee), divider: false))
            }
            if detail.damageFee > 0 {
                stack.addArrangedSubview(keyValue("Damage fee".localized(), MoneyFormatter.format(detail.damageFee), divider: false))
            }
        }
        return padded(stack, top: 0, bottom: 0)
    }

    private func notesSection(_ detail: OrderDetail) -> UIView {
        let title = UILabel()
        title.font = Utils.boldFont(size: 13)
        title.textColor = DS.Color.textMuted
        title.text = "NOTES".localized()
        let edit = UIButton(type: .system)
        edit.setTitle("Edit".localized(), for: .normal)
        edit.titleLabel?.font = Utils.boldFont(size: 14)
        edit.tintColor = DS.Color.primary
        edit.addTarget(self, action: #selector(editNotesTapped), for: .touchUpInside)
        edit.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        let header = UIStackView(arrangedSubviews: [title, UIView(), edit])
        header.axis = .horizontal
        header.alignment = .center

        let stack = UIStackView(arrangedSubviews: [header])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.xs

        let text = detail.notes?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let urls = noteImageURLs(detail)
        if !text.isEmpty || !urls.isEmpty {
            let box = UIStackView()
            box.axis = .vertical
            box.spacing = DS.Spacing.sm
            box.isLayoutMarginsRelativeArrangement = true
            box.layoutMargins = UIEdgeInsets(top: 10, left: 12, bottom: 10, right: 12)
            box.backgroundColor = UIColor(hexString: "FFFBEB")
            box.layer.cornerRadius = 10
            if !text.isEmpty {
                let label = UILabel()
                label.numberOfLines = 0
                label.font = Utils.regularFont(size: 14)
                label.textColor = UIColor(hexString: "78350F")
                label.text = text
                box.addArrangedSubview(label)
            }
            if !urls.isEmpty {
                let thumbs = UIStackView()
                thumbs.axis = .horizontal
                thumbs.spacing = DS.Spacing.sm
                for url in urls {
                    let thumb = UIButton(type: .custom)
                    thumb.imageView?.contentMode = .scaleAspectFill
                    thumb.clipsToBounds = true
                    thumb.layer.cornerRadius = 10
                    thumb.backgroundColor = UIColor(hexString: "E2E8F0")
                    thumb.kf.setImage(with: URL(string: url), for: .normal, placeholder: UIImage(systemName: "photo"))
                    thumb.accessibilityLabel = "Note photo".localized()
                    thumb.addAction(UIAction { [weak self, weak thumb] _ in
                        guard let image = thumb?.image(for: .normal) else { return }
                        self?.showFullScreen(image)
                    }, for: .touchUpInside)
                    thumb.snp.makeConstraints { make in make.size.equalTo(48) }
                    thumbs.addArrangedSubview(thumb)
                }
                thumbs.addArrangedSubview(UIView())
                box.addArrangedSubview(thumbs)
            }
            stack.addArrangedSubview(box)
        }
        return padded(stack, top: DS.Spacing.md, bottom: 0)
    }

    // MARK: - Bottom bar and menu

    private func renderActions(_ detail: OrderDetail) {
        let actions = actions(for: detail)
        bottomStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        var buttons: [UIButton] = []
        switch actions.primary {
        case .handOver:
            if actions.canEdit {
                let edit = makeButton(title: "Edit order".localized(), style: .outline)
                edit.addTarget(self, action: #selector(editOrderTapped), for: .touchUpInside)
                buttons.append(edit)
            }
            let due = OrderDetailLogic.handOver(total: detail.totalAmount, deposit: detail.depositAmount,
                                                securityDeposit: detail.securityDeposit, payments: payments).due
            let title = due > 0
                ? String(format: "Hand over · collect %@".localized(), MoneyFormatter.format(due))
                : "Hand over items".localized()
            let primary = makeButton(title: title, style: .primary)
            primary.addTarget(self, action: #selector(handOverTapped), for: .touchUpInside)
            buttons.append(primary)
        case .takeReturn:
            if canExtend(detail) {
                let extend = makeButton(title: "order.extend".localized(), style: .outline)
                extend.addTarget(self, action: #selector(extendTapped), for: .touchUpInside)
                buttons.append(extend)
            }
            let primary = makeButton(title: "Take back items".localized(), style: .primary)
            primary.addTarget(self, action: #selector(takeReturnTapped), for: .touchUpInside)
            buttons.append(primary)
        case .none:
            if detail.orderType == .sale && actions.canCancel {
                let cancel = makeButton(title: "Cancel order".localized(), style: .destructive)
                cancel.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
                buttons.append(cancel)
            }
            let print = makeButton(title: "Print receipt".localized(), style: buttons.isEmpty ? .outline : .primary)
            print.addTarget(self, action: #selector(printTapped), for: .touchUpInside)
            buttons.append(print)
        }
        for button in buttons {
            bottomStack.addArrangedSubview(button)
            button.snp.makeConstraints { make in make.height.equalTo(52) }
        }
        if buttons.count == 2 {
            buttons[1].snp.makeConstraints { make in make.width.equalTo(buttons[0]).multipliedBy(2) }
        }

        var menu: [UIMenuElement] = []
        if actions.canEdit {
            menu.append(UIAction(title: "Edit order".localized(), image: UIImage(systemName: "square.and.pencil")) { [weak self] _ in
                self?.editOrderTapped()
            })
        }
        if canExtend(detail) {
            menu.append(UIAction(title: "order.extend".localized(), image: UIImage(systemName: "calendar.badge.plus")) { [weak self] _ in
                self?.extendTapped()
            })
        }
        menu.append(UIAction(title: "Notes".localized(), image: UIImage(systemName: "note.text")) { [weak self] _ in
            self?.editNotesTapped()
        })
        menu.append(UIAction(title: "Print receipt".localized(), image: UIImage(systemName: "printer")) { [weak self] _ in
            self?.printTapped()
        })
        if actions.canCancel {
            menu.append(UIAction(title: "Cancel order".localized(), image: UIImage(systemName: "xmark"), attributes: .destructive) { [weak self] _ in
                self?.cancelTapped()
            })
        }
        if actions.canDelete {
            menu.append(UIAction(title: "Delete Order".localized(), image: UIImage(systemName: "trash"), attributes: .destructive) { [weak self] _ in
                self?.deleteTapped()
            })
        }
        moreButton.menu = UIMenu(children: menu)
    }

    // MARK: - Actions

    @objc private func printTapped() {
        orderViewModel?.printOrder { [weak self] result in
            DispatchQueue.main.async {
                if case .failure(let error) = result {
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }

    @objc private func editOrderTapped() {
        guard let order = orderViewModel?.currentOrder else { return }
        navigationController?.popViewController(animated: false)
        OrderEditLauncher.startEditing(order)
    }

    @objc private func extendTapped() {
        guard let detail, let currentReturn = detail.returnPlanAt else { return }
        let sheet = OrderExtendSheetViewController(detail: detail, currentReturn: currentReturn)
        sheet.onExtended = { [weak self] day in
            guard let self else { return }
            self.showToast(message: String(format: "order.extend.done".localized(), DayFormatter.short(day)))
            OrderListViewModel.shared.setNeedsRefresh()
            self.load()
        }
        present(sheet, animated: true)
    }

    @objc private func handOverTapped() {
        presentSheet(.handOver)
    }

    @objc private func takeReturnTapped() {
        presentSheet(.takeReturn)
    }

    private func presentSheet(_ mode: OrderHandOverSheetViewController.Mode) {
        guard let detail else { return }
        let sheet = OrderHandOverSheetViewController(mode: mode, detail: detail, lateDays: lateDays(for: detail))
        sheet.onConfirm = { [weak self] lateFee, damageFee in
            self?.confirm(mode, lateFee: lateFee, damageFee: damageFee)
        }
        sheet.onHandOver = { [weak self] papers, securityDeposit in
            self?.confirmHandOver(papers: papers, securityDeposit: securityDeposit)
        }
        if let presentation = sheet.sheetPresentationController {
            presentation.detents = [.large()]
            presentation.prefersGrabberVisible = true
            presentation.preferredCornerRadius = 24
        }
        present(sheet, animated: true)
    }

    private func confirm(_ mode: OrderHandOverSheetViewController.Mode, lateFee: Double, damageFee: Double) {
        guard let detail, let viewModel = orderViewModel else { return }
        showProgressText(text: "Updating...".localized())
        let feesChanged = mode == .takeReturn && (lateFee != detail.lateFee || damageFee != detail.damageFee)
        guard feesChanged else {
            changeStatus(with: viewModel)
            return
        }
        let request = UpdateOrderRequest(damageFee: damageFee, lateFee: lateFee)
        OrderService.shared.updateOrder(orderId: detail.id, request: request) { [weak self] updated, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let error {
                    self.hideProgress()
                    self.handleStatusError(error)
                    return
                }
                self.changeStatus(with: updated.map { OrderViewModel(order: $0) } ?? viewModel)
            }
        }
    }

    /// RESERVED → PICKUPED with the optional papers / security deposit of the sheet (#427)
    private func confirmHandOver(papers: String, securityDeposit: Double) {
        guard let viewModel = orderViewModel else { return }
        showProgressText(text: "Updating...".localized())
        viewModel.handOver(papers: papers, securityDeposit: securityDeposit) { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                switch result {
                case .success:
                    self.didChangeOrder(viewModel.currentOrder)
                case .failure(let error):
                    self.handleStatusError(error as NSError)
                }
            }
        }
    }

    /// PICKUPED → RETURNED through the current OrderViewModel rules
    private func changeStatus(with viewModel: OrderViewModel) {
        viewModel.saveOrder { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                switch result {
                case .success:
                    self.didChangeOrder(viewModel.currentOrder)
                case .failure(let error):
                    self.handleStatusError(error as NSError)
                }
            }
        }
    }

    @objc private func cancelTapped() {
        UIAlertController.alert(
            parent: self,
            title: "order.cancel.title".localized(),
            message: "order.cancel.confirmation".localized(),
            okTitle: "common.action.confirm".localized(),
            cancelTitle: "common.action.cancel".localized(),
            okAction: { [weak self] _ in self?.performCancel() },
            cancelAction: nil
        )
    }

    private func performCancel() {
        guard let viewModel = orderViewModel else { return }
        showProgressText(text: "Updating...".localized())
        viewModel.cancelOrder { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                switch result {
                case .success:
                    self.didChangeOrder(viewModel.currentOrder)
                case .failure(let error):
                    self.handleStatusError(error as NSError)
                }
            }
        }
    }

    private func deleteTapped() {
        UIAlertController.alert(
            parent: self,
            title: "Delete Order".localized(),
            message: "Are you sure you want to delete this order? This action cannot be undone.".localized(),
            okTitle: "Delete".localized(),
            cancelTitle: "Cancel".localized(),
            okAction: { [weak self] _ in self?.performDelete() },
            cancelAction: nil
        )
    }

    private func performDelete() {
        guard let viewModel = orderViewModel else { return }
        showProgressText(text: "Deleting order...".localized())
        viewModel.deleteOrder { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                switch result {
                case .success:
                    OrderListViewModel.shared.setNeedsRefresh()
                    self.navigationController?.popViewController(animated: true)
                case .failure(let error):
                    UIAlertController.errorAlert(parent: self, error: error)
                }
            }
        }
    }

    @objc private func editNotesTapped() {
        guard let detail else { return }
        let original = noteImageURLs(detail)
        let editor = OrderNotesEditorViewController(text: detail.notes ?? "", savedURLs: original)
        editor.onSave = { [weak self] text, kept, added in
            self?.saveNotes(text: text, original: original, kept: kept, added: added)
        }
        if let presentation = editor.sheetPresentationController {
            presentation.detents = [.medium(), .large()]
            presentation.prefersGrabberVisible = true
        }
        present(editor, animated: true)
    }

    private func saveNotes(text: String, original: [String], kept: [String], added: [UIImage]) {
        guard let viewModel = orderViewModel else { return }
        guard let plan = OrderDetailLogic.notesPlan(original: original, kept: kept, newCount: added.count) else {
            UIAlertController.alert(parent: self, title: "Limit reached".localized(),
                                    message: String(format: "You can attach up to %d images.".localized(), OrderDetailLogic.maxNotePhotos))
            return
        }
        let data = added.compactMap { UIImageJPEGRepresentation($0, 0.8) }
        showProgressText(text: "Updating...".localized())
        viewModel.updateNotes(text, keptNoteImageURLs: plan.keptURLs, newNoteImageData: data.isEmpty ? nil : data) { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                switch result {
                case .success:
                    self.didChangeOrder(viewModel.currentOrder)
                case .failure(let error):
                    UIAlertController.errorAlert(parent: self, error: error)
                    self.load()
                }
            }
        }
    }

    private func didChangeOrder(_ order: Order) {
        OrderListViewModel.shared.updateOrder(order)
        OrderListViewModel.shared.setNeedsRefresh()
        load()
    }

    /// 4xx (e.g. INVALID_ORDER_STATUS): show the message and reload the order
    private func handleStatusError(_ error: NSError) {
        let outcome = OrderDetailLogic.statusErrorOutcome(error)
        UIAlertController.alert(parent: self, title: "Error".localized(), message: outcome.message) { [weak self] _ in
            if outcome.reload { self?.load() }
        }
    }

    // MARK: - Helpers

    private func noteImageURLs(_ detail: OrderDetail) -> [String] {
        let base = APIEndpoint.currentBaseURL
        return (detail.notesImages ?? []).map { path in
            path.hasPrefix("http") ? path : (base.hasSuffix("/") ? base + path : base + "/" + path)
        }
    }

    private func showFullScreen(_ image: UIImage) {
        let viewer = UIViewController()
        viewer.view.backgroundColor = .black
        let imageView = UIImageView(image: image)
        imageView.contentMode = .scaleAspectFit
        viewer.view.addSubview(imageView)
        imageView.snp.makeConstraints { make in make.edges.equalTo(viewer.view.safeAreaLayoutGuide) }
        let close = UIButton(type: .system)
        close.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        close.tintColor = .white
        close.accessibilityLabel = "Close".localized()
        close.addAction(UIAction { [weak viewer] _ in viewer?.dismiss(animated: true) }, for: .touchUpInside)
        viewer.view.addSubview(close)
        close.snp.makeConstraints { make in
            make.top.trailing.equalTo(viewer.view.safeAreaLayoutGuide).inset(DS.Spacing.md)
            make.size.equalTo(DS.touchTarget)
        }
        viewer.modalPresentationStyle = .fullScreen
        present(viewer, animated: true)
    }

    private enum ButtonStyle { case primary, outline, destructive, tinted }

    private func makeButton(title: String, style: ButtonStyle, symbol: String? = nil) -> UIButton {
        var config: UIButton.Configuration
        switch style {
        case .primary:
            config = .filled()
            config.baseBackgroundColor = DS.Color.primary
            config.baseForegroundColor = .white
        case .outline:
            config = .plain()
            config.baseForegroundColor = DS.Color.text
            config.background.strokeColor = UIColor(hexString: "CBD5E1")
            config.background.strokeWidth = 1
        case .destructive:
            config = .plain()
            config.baseForegroundColor = DS.Status.late.text
            config.background.strokeColor = UIColor(hexString: "FECACA")
            config.background.strokeWidth = 1
        case .tinted:
            config = .filled()
            config.baseBackgroundColor = UIColor(hexString: "F1F5F9")
            config.baseForegroundColor = DS.Color.text
        }
        config.background.cornerRadius = style == .tinted ? 10 : 14
        config.cornerStyle = .fixed
        config.title = title
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { attributes in
            var updated = attributes
            updated.font = Utils.boldFont(size: style == .primary ? 16 : 15)
            return updated
        }
        config.titleLineBreakMode = .byTruncatingTail
        if let symbol {
            // Board CT-gon: the call glyph is a 16px outline
            config.image = DS.symbol(symbol, 16)
            config.imagePadding = 6
        }
        return UIButton(configuration: config)
    }

    private func sectionTitle(_ text: String) -> UIView {
        let label = UILabel()
        label.font = Utils.boldFont(size: 13)
        label.textColor = DS.Color.textMuted
        label.text = text
        return padded(label, top: 18, bottom: 4)
    }

    private func keyValue(_ title: String, _ value: String, bold: Bool = false, divider: Bool = true) -> UIView {
        let left = UILabel()
        left.font = Utils.regularFont(size: 14)
        left.textColor = DS.Color.textMuted
        left.text = title
        let right = UILabel()
        right.font = bold ? Utils.boldFont(size: 15) : Utils.regularFont(size: 15)
        right.textColor = DS.Color.text
        right.text = value
        right.numberOfLines = 2
        right.textAlignment = .right
        left.setContentCompressionResistancePriority(.required, for: .horizontal)
        left.setContentHuggingPriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [left, right])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = DS.Spacing.md
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(divider ? 48 : 36) }
        guard divider else { return row }
        return withDivider(row)
    }

    private func totalRow(_ title: String, _ value: String) -> UIView {
        let left = UILabel()
        left.font = Utils.boldFont(size: 15)
        left.textColor = DS.Color.text
        left.text = title
        left.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let right = UILabel()
        right.font = Utils.boldFont(size: 20)
        right.textColor = DS.Color.text
        right.text = value
        right.textAlignment = .right
        right.setContentCompressionResistancePriority(.required, for: .horizontal)
        right.setContentHuggingPriority(.required, for: .horizontal)
        let row = UIStackView(arrangedSubviews: [left, right])
        row.axis = .horizontal
        row.alignment = .center
        row.spacing = DS.Spacing.md
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(48) }
        let line = UIView()
        line.backgroundColor = UIColor(hexString: "E2E8F0")
        line.snp.makeConstraints { make in make.height.equalTo(1) }
        let stack = UIStackView(arrangedSubviews: [line, row])
        stack.axis = .vertical
        return stack
    }

    private func withDivider(_ content: UIView) -> UIView {
        let line = UIView()
        line.backgroundColor = DS.Color.divider
        line.snp.makeConstraints { make in make.height.equalTo(1) }
        let stack = UIStackView(arrangedSubviews: [content, line])
        stack.axis = .vertical
        return stack
    }

    /// Side gutters; `thickBottom` draws the 8pt band between the header and the body
    private func padded(_ content: UIView, top: CGFloat, bottom: CGFloat, divider: Bool = false, thickBottom: Bool = false) -> UIView {
        let container = UIView()
        let inner = divider ? withDivider(content) : content
        container.addSubview(inner)
        inner.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(top)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-(bottom + (thickBottom ? 8 : 0)))
        }
        if thickBottom {
            let band = UIView()
            band.backgroundColor = DS.Color.background
            container.addSubview(band)
            band.snp.makeConstraints { make in
                make.leading.trailing.bottom.equalToSuperview()
                make.height.equalTo(8)
            }
        }
        return container
    }
}
