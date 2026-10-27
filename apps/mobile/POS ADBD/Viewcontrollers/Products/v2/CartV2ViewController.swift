//
//  CartV2ViewController.swift
//  POS ADBD
//
//  Redesigned cart (#373, flag `newProducts`, boards Gio-hang, Gio-hang-ban): one screen with a Thuê / Bán switch.
//  State lives in CartStore. "Tạo đơn" confirms a new order in a sheet on this screen and creates it with the
//  same request the review screen sends (#476); "Lưu thay đổi" saves an edited order from a sheet with the review
//  screen's update request (#676).
//

import UIKit
import SnapKit

final class CartV2ViewController: BaseViewControler {
    /// #973: shown beside the Home grid on iPad (no back button)
    var isPanel = false

    private let typeToggle = V2Segmented(titles: ["products.cart.rent".localized(), "products.cart.sale".localized()], compact: false)
    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let collectTitle = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let collectAmount = V2.label(size: DS.TextSize.amount, weight: .bold)
    private let ctaButton = V2.primaryButton("products.cart.create".localized())
    private let titleLabel = V2.label(size: 20, weight: .bold)
    /// #676: "Heather Robinson · Đơn thuê" under "Sửa đơn #482913"
    private let subtitleLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    /// #640: share the cart as a draft image (lines, and for a rental both dates)
    /// #677 (board gio-menu): ⋯ with "Chia sẻ báo giá" (#640 draft image) and "Xoá giỏ hàng"; none while editing
    private let moreButton = UIButton(type: .system)
    /// #677 (board huy-sua, option B): while editing, the bottom bar is "Tổng đơn" over "Huỷ sửa" + "Lưu thay đổi"
    private let editBar = UIStackView()
    private let editTotalAmount = V2.label(size: 18, weight: .bold)
    private let cancelEditButton = V2.secondaryButton("products.cart.edit.cancel".localized())
    private let editSaveButton = V2.primaryButton("products.cart.edit.save".localized())
    /// The create bar (amount to collect + "Tạo đơn"), hidden while editing
    private let ctaRow = UIView()
    /// Keeps the title left of the switch; off while editing (switch and ⋯ hidden)
    private var switchAfterTitle: Constraint?
    private let availabilityDebouncer = DebounceManager(delay: 0.3)
    /// Bumped on each availability call; an older answer is dropped
    private var availabilityGeneration = 0
    /// Products whose prices this screen already reloaded (#473), once per screen
    private var pricingChecked = Set<Int>()
    /// One create at a time, one Idempotency-Key per checkout (#341, #476)
    private let submission = CreateOrderSubmission()
    /// One save of an edited order at a time (#676)
    private let editSubmission = CreateOrderSubmission()
    /// #518: lines booked out for the chosen dates, by product (from the batch availability answer)
    private var conflicts: [Int: CartScheduleConflict] = [:]
    private lazy var blockedNotice: UIView = CartOverlapViews.notice("cart.overlap.blocked".localized(), style: .blocked)
    /// #1067: holds the red "Giảm giá không được lớn hơn tổng đơn (X)" notice while the saved discount is above the lines
    private let discountNoticeHost: UIStackView = {
        let host = UIStackView()
        host.axis = .vertical
        host.isHidden = true
        return host
    }()
    private var discountNoticeText: String?

    private var cart: Cart { CartStore.shared.cart }
    private var isRent: Bool { cart.orderType == .rent }
    /// #1199: the stage whose amount the number sheet is editing (nil = the old "Cọc" row)
    private var editingStageIndex: Int?

    /// Conflicts of the lines still in the cart, in cart order
    private var currentConflicts: [CartScheduleConflict] {
        guard isRent else { return [] }
        var seen = Set<Int>()
        return cart.items.compactMap { item in
            guard !seen.contains(item.productId), let conflict = conflicts[item.productId] else { return nil }
            seen.insert(item.productId)
            return conflict
        }
    }

    private var ctaState: ScheduleConflictLogic.CtaState {
        ScheduleConflictLogic.ctaState(isRent: isRent, conflicts: currentConflicts, allowOverlap: OverlapSetting.isAllowed)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        buildLayout()
        NotificationCenter.default.addObserver(self, selector: #selector(cartChanged), name: .cartStoreDidChange, object: nil)
    }

    /// #684: the cart tag "Trùng đơn ngày …" → Lịch trống of that product on the first clashing day
    private func openConflictDay(_ conflict: CartScheduleConflict) {
        openProductCalendar(productId: conflict.productId, focusDay: ScheduleConflictLogic.focusDay(conflict))
    }

    /// #1241 (owner): a tap on "Còn N" / "Hết" opens that product's Lịch trống, the screen the overlap tag opens
    private func openProductCalendar(productId: Int, focusDay: String?) {
        ProductService.shared.loadProduct(productId: productId) { [weak self] product, _ in
            DispatchQueue.main.async {
                guard let self, let product else { return }
                let calendar = ProductCalendarViewController(product: product, orders: nil, focusDay: focusDay)
                calendar.hidesBottomBarWhenPushed = true
                self.navigationController?.pushViewController(calendar, animated: true)
            }
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        render()
        loadAvailability()
        refreshStalePricing()
        // #518: the owner may have changed "Cho tạo đơn khi trùng lịch" since this user signed in.
        // #1056: redraw only when it did (each render rebuilds every row)
        let allowedBefore = OverlapSetting.isAllowed
        OverlapSetting.refresh { [weak self] allowed in
            if allowed != allowedBefore { self?.render() }
        }
        // #1199: a login payload without `depositMode` is fetched; the owner may also have switched the mode since
        let modeBefore = DepositModeStore.current
        DepositModeStore.refresh { [weak self] mode in
            if mode != modeBefore || self?.cart.depositStages == nil { self?.render() }
        }
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
        back.isHidden = isPanel
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.8
        let title = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
        title.axis = .vertical
        title.spacing = 1
        titleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        subtitleLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        typeToggle.addTarget(self, action: #selector(typeChanged), for: .valueChanged)
        typeToggle.accessibilityLabel = "products.cart.type".localized()
        moreButton.setImage(DS.symbol("ellipsis", DS.Icon.md, weight: .semibold), for: .normal)
        moreButton.tintColor = DS.Color.text
        moreButton.accessibilityLabel = "products.cart.more".localized()
        moreButton.accessibilityIdentifier = "cart.more"
        moreButton.showsMenuAsPrimaryAction = true
        [back, title, typeToggle, moreButton].forEach(header.addSubview)
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalTo(view.readableColumn()) // #973 centered column on iPad
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
        moreButton.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-4)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        typeToggle.snp.makeConstraints { make in
            make.trailing.equalTo(moreButton.snp.leading).offset(-2)
            switchAfterTitle = make.leading.greaterThanOrEqualTo(title.snp.trailing).offset(8).constraint
            make.centerY.equalToSuperview()
        }
        // #677: while editing, nothing sits right of the title (no switch, no ⋯): it may take the whole row
        title.snp.makeConstraints { make in
            make.trailing.lessThanOrEqualToSuperview().offset(-DS.Spacing.lg)
        }

        let bottom = UIView()
        bottom.backgroundColor = .white
        let line = V2.divider()
        line.backgroundColor = DS.Color.border
        let texts = UIStackView(arrangedSubviews: [collectTitle, collectAmount])
        texts.axis = .vertical
        ctaButton.addTarget(self, action: #selector(ctaTapped), for: .touchUpInside)
        // #518 (board GH-trung-tat): the "no overlapping orders" notice sits above the CTA row while it is blocked
        [texts, ctaButton].forEach(ctaRow.addSubview)
        buildEditBar()
        let bottomColumn = UIStackView(arrangedSubviews: [discountNoticeHost, blockedNotice, ctaRow, editBar])
        bottomColumn.axis = .vertical
        bottomColumn.spacing = 10
        blockedNotice.isHidden = true
        [line, bottomColumn].forEach(bottom.addSubview)
        view.addSubview(bottom)
        bottom.snp.makeConstraints { make in
            make.leading.trailing.equalTo(view.readableColumn())
            make.bottom.equalToSuperview()
        }
        line.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        bottomColumn.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-8)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.centerY.equalTo(ctaButton)
        }
        ctaButton.snp.makeConstraints { make in
            make.top.bottom.trailing.equalToSuperview()
            make.leading.greaterThanOrEqualTo(texts.snp.trailing).offset(12)
        }

        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.equalTo(view.readableColumn())
            make.bottom.equalTo(bottom.snp.top)
        }
        content.axis = .vertical
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
    }

    /// #677 (option B): "Tổng đơn ……… 730.000đ" over "Huỷ sửa" (outline, 1 part) + "Lưu thay đổi" (primary, 2 parts)
    private func buildEditBar() {
        let totalTitle = V2.label("products.cart.total".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted)
        let totalRow = UIStackView(arrangedSubviews: [totalTitle, UIView(), editTotalAmount])
        totalRow.alignment = .firstBaseline
        cancelEditButton.accessibilityIdentifier = "cart.edit.cancel"
        cancelEditButton.addTarget(self, action: #selector(cancelEditTapped), for: .touchUpInside)
        editSaveButton.accessibilityIdentifier = "cart.edit.cta"
        editSaveButton.addTarget(self, action: #selector(ctaTapped), for: .touchUpInside)
        editSaveButton.contentEdgeInsets = .zero
        for button in [cancelEditButton, editSaveButton] {
            button.layer.cornerRadius = 12
            button.snp.remakeConstraints { make in make.height.equalTo(48) }
        }
        let buttons = UIStackView(arrangedSubviews: [cancelEditButton, editSaveButton])
        buttons.spacing = 10
        cancelEditButton.snp.makeConstraints { make in make.width.equalTo(editSaveButton).multipliedBy(0.5) }
        editBar.addArrangedSubview(totalRow)
        editBar.addArrangedSubview(buttons)
        editBar.axis = .vertical
        editBar.spacing = 10
        editBar.isHidden = true
    }

    // MARK: - Render

    @objc private func switchCartTapped() {
        present(CartPickerSheet(), animated: true)
    }

    @objc private func cartChanged() {
        guard isViewLoaded, view.window != nil else { return }
        render()
    }

    private func render() {
        seedDepositStages()
        renderTitle()
        typeToggle.select(isRent ? 0 : 1)
        typeToggle.isEnabled = !cart.isEditMode
        // #677 (option B): while editing the header is back + "Sửa đơn #n" + subtitle only (no switch, no share);
        // the bottom bar carries "Huỷ sửa" next to "Lưu thay đổi"
        typeToggle.isHidden = cart.isEditMode
        if cart.isEditMode { switchAfterTitle?.deactivate() } else { switchAfterTitle?.activate() }
        ctaRow.isHidden = cart.isEditMode
        editBar.isHidden = !cart.isEditMode
        renderMoreMenu()

        content.arrangedSubviews.forEach { $0.removeFromSuperview() }
        // #1079: with 2+ carts open, "Giỏ · name · i/n · Đổi ⌄" opens the cart list
        let store = CartStore.shared
        if store.carts.count > 1, !cart.isEditMode {
            let row = CartSwitchRow(cart: cart, position: store.activeIndex + 1, total: store.carts.count)
            row.addTarget(self, action: #selector(switchCartTapped), for: .touchUpInside)
            content.addArrangedSubview(row)
        }
        content.addArrangedSubview(band())
        content.addArrangedSubview(customerRow())
        if isRent {
            content.addArrangedSubview(V2.divider())
            content.addArrangedSubview(datesRow())
        }

        // Owner (2026-10-19): no "Thêm" button in the cart; items are added from the home list
        content.addArrangedSubview(V2.sectionHeader(String(format: "products.cart.items".localized(), cart.itemCount)))
        if cart.items.isEmpty {
            let empty = V2.label("products.cart.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
            content.addArrangedSubview(padded(empty, vertical: 20))
        }
        for (index, item) in cart.items.enumerated() {
            // #893 (owner): swipe right-to-left reveals a red "Xoá"; a full swipe removes the line
            let swipe = SwipeDeleteRow(content: itemRow(item, index: index))
            let lineId = item.lineId
            swipe.onDelete = { CartStore.shared.removeItem(line: lineId) }
            content.addArrangedSubview(swipe)
        }

        content.addArrangedSubview(V2.sectionHeader("products.cart.money".localized()))
        let subtotal = V2ValueRow(title: (isRent ? "products.cart.rentSubtotal" : "products.cart.saleSubtotal").localized(), chevron: false)
        subtotal.valueLabel.text = MoneyFormatter.format(cart.subtotalAmount)
        subtotal.valueLabel.textColor = DS.Color.text
        subtotal.isUserInteractionEnabled = false
        content.addArrangedSubview(subtotal)
        content.addArrangedSubview(V2.divider())

        // #1056 (owner): blue value + pencil = the row opens a sheet; Tiền thuê / Tổng cộng stay black
        let discount = V2ValueRow(title: "products.cart.discount".localized(), editable: true)
        discount.valueLabel.text = MoneyFormatter.format(CartV2Logic.discountShown(cart.discountAmount))
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

        if isRent && cart.editHasDepositPlan {
            // #1199: the plan of this order is edited on the order itself; the cart has no "Cọc" of its own
        } else if isRent && cart.isStagedRental {
            content.addArrangedSubview(stagedSection())
        } else if isRent && !(DepositModeStore.current == .staged && !cart.isEditMode) {
            let deposit = V2ValueRow(title: "products.cart.deposit".localized(), editable: true)
            deposit.valueLabel.text = MoneyFormatter.format(cart.depositAmount)
            deposit.addTarget(self, action: #selector(editDeposit), for: .touchUpInside)
            content.addArrangedSubview(deposit)
            content.addArrangedSubview(V2.divider())
        }

        content.addArrangedSubview(orderNoteRow()) // #1043: opens the item note sheet; #1056: a TIỀN row like the others
        content.addArrangedSubview(UIView.spacer(height: 24))

        if cart.isEditMode {
            // #676 (board sua-don): nothing is collected on save; the bar shows the order total
            collectTitle.text = "products.cart.total".localized()
            collectAmount.text = MoneyFormatter.format(cart.totalAmount)
        } else {
            collectTitle.text = (isRent ? "products.cart.collectDeposit" : "products.cart.customerPays").localized()
            collectAmount.text = MoneyFormatter.format(CartV2Logic.collectNow(cart))
            if cart.isStagedRental {
                collectTitle.text = cart.stagedCollectNow > 0 ? "deposit.cart.collectNow".localized() : "deposit.cart.collectNone".localized()
            }
        }
        let stagedCollects = cart.isStagedRental && cart.stagedCollectNow > 0
        ctaButton.setTitle(stagedCollects ? "deposit.cart.createAndCollect".localized()
                           : CartV2Logic.ctaTitleKey(isEditMode: cart.isEditMode, isRent: isRent).localized(), for: .normal)
        ctaButton.titleLabel?.font = Utils.boldFont(size: stagedCollects ? DS.TextSize.body : DS.TextSize.input)
        ctaButton.titleLabel?.adjustsFontSizeToFitWidth = true
        ctaButton.titleLabel?.minimumScaleFactor = 0.8
        // #518 OFF: "Tạo đơn" is greyed and disabled with the notice; the API refuses the order too
        // #1067: a saved discount above the lines (items removed after it was set) blocks the same way, with its notice
        let discountProblem = CartV2Logic.cartDiscountError(cart)
        renderDiscountNotice(discountProblem)
        let stagesExceed = cart.isStagedRental && DepositPlanMath.exceedsTotal(cart.stagedPreview(), total: cart.totalAmount)
        let blocked = ctaState == .blocked || discountProblem != nil || stagesExceed
        blockedNotice.isHidden = ctaState != .blocked
        ctaButton.isEnabled = !blocked
        ctaButton.backgroundColor = blocked ? UIColor(hexString: "CBD5E1") : DS.Color.primary
        ctaButton.alpha = cart.items.isEmpty && !blocked ? 0.5 : 1
        editTotalAmount.text = MoneyFormatter.format(cart.totalAmount)
        editSaveButton.isEnabled = !blocked
        editSaveButton.backgroundColor = ctaButton.backgroundColor
        editSaveButton.alpha = ctaButton.alpha
    }

    /// #1067: the discount notice (same red box as the overlap block), rebuilt only when its text changes
    // MARK: - Thu cọc theo giai đoạn (#1199, mockup m5)

    /// A staged shop: the stages of the new order start from the shop's default template
    private func seedDepositStages() {
        guard isRent, !cart.isEditMode, DepositModeStore.current == .staged, cart.depositStages == nil,
              let template = DepositModeStore.latest?.startTemplate else { return }
        CartStore.shared.setDepositTemplate(template)
    }

    private func stagedSection() -> UIView {
        let column = UIStackView()
        column.axis = .vertical
        let settings = DepositModeStore.latest
        let choices = settings?.choices ?? []
        let selected = choices.first { $0.id == cart.depositTemplateId }
        let templateRow = V2ValueRow(title: "deposit.cart.title".localized(), chevron: false, wrapsValue: true)
        templateRow.valueLabel.text = (selected?.name ?? choices.first?.name ?? "") + (Cart.canEditStages && choices.count > 1 ? "  ⌄" : "")
        templateRow.valueLabel.textColor = DS.Color.primary
        templateRow.valueLabel.font = Utils.boldFont(size: DS.TextSize.body)
        templateRow.accessibilityIdentifier = "deposit.cart.template"
        if Cart.canEditStages && choices.count > 1 {
            templateRow.addTarget(self, action: #selector(pickDepositTemplate), for: .touchUpInside)
        } else {
            templateRow.isUserInteractionEnabled = false
        }
        column.addArrangedSubview(templateRow)
        column.addArrangedSubview(V2.divider())

        let preview = cart.stagedPreview()
        let today = DayFormatter.key(Date())
        for (index, stage) in preview.enumerated() {
            column.addArrangedSubview(stageRow(stage, index: index, today: today))
            column.addArrangedSubview(V2.divider())
        }
        if DepositPlanMath.exceedsTotal(preview, total: cart.totalAmount) {
            let warning = DepositUI.warningBox("deposit.cart.exceeds".localized())
            let holder = UIView()
            holder.addSubview(warning)
            warning.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: DS.Spacing.lg, bottom: 8, right: DS.Spacing.lg)) }
            column.addArrangedSubview(holder)
        }

        let first = preview.first
        let collect = V2ValueRow(title: String(format: "deposit.cart.collectFirst".localized(), 1), editable: true)
        if cart.stagedCollectNow > 0, let first {
            collect.valueLabel.text = MoneyFormatter.format(first.amount)
        } else {
            collect.valueLabel.text = "deposit.cart.collectNone.short".localized()
        }
        collect.addTarget(self, action: #selector(pickCollectFirst), for: .touchUpInside)
        collect.accessibilityIdentifier = "deposit.cart.collectFirst"
        column.addArrangedSubview(collect)
        column.addArrangedSubview(V2.divider())
        return column
    }

    private func stageRow(_ stage: DepositStagePreview, index: Int, today: String) -> UIView {
        let editable = Cart.canEditStages && !stage.isRest
        let name = DepositUI.wrapLabel(stage.label, size: DS.TextSize.body)
        let due = stage.dueDateKey == today ? "deposit.due.today".localized() : DepositUI.dayText(stage.dueDateKey)
        let detail = stage.isRest
            ? String(format: "deposit.cart.restDetail".localized(), due)
            : String(format: "deposit.cart.stageDetail".localized(), DepositPlanMath.percentText(stage.percent), due)
        let sub = DepositUI.wrapLabel(detail, size: DS.TextSize.pill + 1, color: DS.Color.textMuted)
        let texts = UIStackView(arrangedSubviews: [name, sub])
        texts.axis = .vertical
        texts.spacing = 3
        let amount = V2.label(MoneyFormatter.format(stage.amount), size: DS.TextSize.body, weight: editable ? .bold : .medium,
                              color: editable ? DS.Color.primary : DS.Color.text)
        amount.setContentCompressionResistancePriority(.required, for: .horizontal)
        amount.setContentHuggingPriority(.required, for: .horizontal)
        var right: [UIView] = [amount]
        if editable { right.append(V2.editPencil()) }
        let amountLine = UIStackView(arrangedSubviews: right)
        amountLine.spacing = 6
        amountLine.alignment = .center
        let line = UIStackView(arrangedSubviews: [texts, amountLine])
        line.spacing = DS.Spacing.md
        line.alignment = .center
        let row = UIControl()
        line.isUserInteractionEnabled = false
        row.addSubview(line)
        line.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: DS.Spacing.lg, bottom: 10, right: DS.Spacing.lg)) }
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(56) }
        row.accessibilityIdentifier = "deposit.cart.stage.\(index)"
        if editable {
            row.tag = index
            row.addTarget(self, action: #selector(editStageAmount(_:)), for: .touchUpInside)
        }
        return row
    }

    @objc private func pickDepositTemplate() {
        let choices = DepositModeStore.latest?.choices ?? []
        let sheet = UIAlertController(title: "deposit.cart.title".localized(), message: nil, preferredStyle: .actionSheet)
        for template in choices {
            sheet.addAction(UIAlertAction(title: template.name, style: .default) { _ in CartStore.shared.setDepositTemplate(template) })
        }
        sheet.addAction(UIAlertAction(title: "common.action.cancel".localized(), style: .cancel))
        sheet.popoverPresentationController?.sourceView = view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        present(sheet, animated: true)
    }

    @objc private func pickCollectFirst() {
        let sheet = UIAlertController(title: String(format: "deposit.cart.collectFirst".localized(), 1), message: nil, preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: String(format: "deposit.cart.collectFirst".localized(), 1), style: .default) { _ in
            CartStore.shared.setCollectFirstStage(method: "CASH")
        })
        sheet.addAction(UIAlertAction(title: "deposit.cart.collectNone.short".localized(), style: .default) { _ in
            CartStore.shared.setCollectFirstStage(method: nil)
        })
        sheet.addAction(UIAlertAction(title: "common.action.cancel".localized(), style: .cancel))
        sheet.popoverPresentationController?.sourceView = view
        sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
        present(sheet, animated: true)
    }

    @objc private func editStageAmount(_ sender: UIControl) {
        let preview = cart.stagedPreview()
        guard sender.tag < preview.count else { return }
        editingStageIndex = sender.tag
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        picker.configure(initialValue: preview[sender.tag].amount, title: preview[sender.tag].label)
        present(picker, animated: true)
    }

    private func renderDiscountNotice(_ text: String?) {
        discountNoticeHost.isHidden = text == nil
        guard text != discountNoticeText else { return }
        discountNoticeText = text
        discountNoticeHost.arrangedSubviews.forEach { $0.removeFromSuperview() }
        guard let text else { return }
        let notice = CartOverlapViews.notice(text, style: .blocked)
        notice.accessibilityIdentifier = "cart.discount.notice"
        discountNoticeHost.addArrangedSubview(notice)
    }

    /// "Giỏ hàng", or "Sửa đơn #482913" over "Heather Robinson · Đơn thuê" while editing an order (#676)
    private func renderTitle() {
        guard let header = EditOrderSheetLogic.header(cart) else {
            titleLabel.text = "products.cart.title".localized()
            subtitleLabel.isHidden = true
            return
        }
        titleLabel.text = header.number.map { String(format: "products.cart.edit.title".localized(), $0) } ?? "products.cart.editTitle".localized()
        subtitleLabel.text = header.subtitle
        subtitleLabel.isHidden = false
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
        let title = V2.label(name ?? "products.cart.pickCustomer".localized(), size: DS.TextSize.name, weight: .medium,
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
        row.accessibilityIdentifier = "cart.datesRow"
        row.addTarget(self, action: #selector(pickDates), for: .touchUpInside)
        // #952 (owner): calendar icon in a light-blue circle, same size and margin as the customer avatar
        let state = CartDateRowLogic.state(pickup: cart.pickupPlanAt, return: cart.returnPlanAt)
        let text = state.text
        let days = state.days
        let icon = UIImageView(image: DS.symbol(CartDateRowLogic.iconSymbol, DS.Icon.sm))
        icon.tintColor = UIColor(hexString: "1E40AF")
        icon.contentMode = .center
        icon.backgroundColor = UIColor(hexString: "DBEAFE")
        icon.layer.cornerRadius = CartDateRowLogic.iconSize / 2
        icon.clipsToBounds = true
        let label = V2.label(text, size: DS.TextSize.name, weight: days == nil ? .medium : .regular, color: days == nil ? DS.Color.primary : DS.Color.text)
        // #893 (owner): room inside the pill (10pt left/right, 4pt top/bottom), one line
        let pill = InsetLabel()
        pill.insets = UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10)
        pill.text = days.map { PluralText.format("products.cart.days", count: $0, $0) }
        pill.font = Utils.boldFont(size: DS.TextSize.secondary)
        pill.textColor = UIColor(hexString: "1E40AF")
        pill.numberOfLines = 1
        pill.backgroundColor = UIColor(hexString: "DBEAFE")
        pill.layer.cornerRadius = 13
        pill.clipsToBounds = true
        pill.setContentCompressionResistancePriority(.required, for: .horizontal)
        pill.isHidden = days == nil
        label.numberOfLines = 1
        label.adjustsFontSizeToFitWidth = true
        label.minimumScaleFactor = 0.8
        [icon, label, pill].forEach(row.addSubview)
        icon.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(CartDateRowLogic.iconSize)
        }
        label.snp.makeConstraints { make in
            make.leading.equalTo(icon.snp.trailing).offset(12)
            make.centerY.equalToSuperview()
            make.trailing.lessThanOrEqualTo(pill.snp.leading).offset(-DS.Spacing.sm)
        }
        pill.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.centerY.equalToSuperview()
        }
        row.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(60) }
        row.isAccessibilityElement = true
        row.accessibilityTraits = UIAccessibilityTraitButton
        row.accessibilityLabel = [text, pill.text].compactMap { $0 }.joined(separator: ", ")
        return row
    }

    private func itemRow(_ item: CartItem, index: Int) -> UIView {
        let row = UIView()
        let thumb = V2.thumbnail(size: 64, radius: 12)
        thumb.image = V2.placeholder
        thumb.contentMode = .center
        if let url = item.imageUrl, let link = URL(string: url) {
            thumb.kf.setImage(with: link, placeholder: V2.placeholder) { [weak thumb] result in
                if case .success = result { thumb?.contentMode = .scaleAspectFill }
            }
        }
        let calc = CartV2Logic.calc(item, orderType: cart.orderType)
        let name = V2.label(item.productName, size: DS.TextSize.name, weight: .medium, lines: 2)
        name.setContentHuggingPriority(.defaultLow, for: .horizontal)
        name.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let total = V2.label(MoneyFormatter.format(calc.total), size: DS.TextSize.name, weight: .medium)
        total.textAlignment = .left
        total.setContentHuggingPriority(.required, for: .horizontal)
        total.setContentCompressionResistancePriority(.required, for: .horizontal)
        // #684 (owner 2026-10-09): name; the blue pricing link; the "Hết hàng …" tag; last row the total and −/+.
        // No card, and no separate "450.000/lần × 1" line: its numbers are in the link
        let stepper = V2Stepper(compact: true)
        stepper.minimum = 0
        stepper.value = item.quantity
        stepper.onChange = { [weak self] value in self?.changeQuantity(index: index, quantity: value) }
        stepper.setContentHuggingPriority(.required, for: .horizontal)
        stepper.setContentCompressionResistancePriority(.required, for: .horizontal)
        let link = pricingChip(item, index: index)
        link.titleLabel?.lineBreakMode = .byTruncatingTail
        // #518 / #684: "Hết 09/10 → 11/10 ›" beside the name (owner) when other rentals hold the item on those days;
        // a tap opens Lịch trống on the first clashing day (the orders of that day)
        let nameRow = UIStackView(arrangedSubviews: [name])
        nameRow.alignment = .top
        nameRow.spacing = 8
        let column = UIStackView(arrangedSubviews: [nameRow, UIStackView(arrangedSubviews: [link, UIView()])])
        // #1189: "Khối 3 ngày + 2 ngày thêm · 160.000đ" and under it the sum "120.000 (3 ngày) + 2 × 20.000 = 160.000"
        if cart.orderType == .rent, let detail = item.blockDetail, detail.extraDays > 0 {
            let formula = V2.label(BlockPricing.formula(detail), size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
            formula.accessibilityIdentifier = "cart.blockFormula"
            column.addArrangedSubview(formula)
        }
        column.axis = .vertical
        column.spacing = 6
        column.alignment = .fill


        if isRent, let conflict = conflicts[item.productId] {
            // #1132 (owner, mockup A): the same soft red pill as "Hết", still tappable, with "›"
            let tag = Self.stockPill(text: ScheduleConflictLogic.tagText(conflict) + " ›", tone: .none)
            tag.accessibilityLabel = String(format: "cart.overlap.tagHint".localized(), ScheduleConflictLogic.dayRange(conflict.dayKeys))
            tag.accessibilityTraits = UIAccessibilityTraitButton
            tag.addAction(UIAction { [weak self] _ in self?.openConflictDay(conflict) }, for: .touchUpInside)
            nameRow.addArrangedSubview(tag)
        }
        // #1064: one pill per line once availability is loaded: green "Còn N" (2+ and enough), amber "Còn 1" /
        // "Chỉ còn N" (#1054), red "Hết đồ" / "Hết hàng" at 0. Hidden behind the overlap tag
        if !(isRent && conflicts[item.productId] != nil),
           let note = CartV2Logic.availabilityNote(item, in: cart.items, isRent: isRent) {
            // #1132 (owner, mockup A): a soft pill in the tone's fill, a dot in the text colour, then the text
            let status = Self.stockPill(text: note.text, tone: note.tone)
            status.accessibilityLabel = note.spoken // #1064: the text is short; VoiceOver says which days / the stock
            status.addAction(UIAction { [weak self] _ in self?.openProductCalendar(productId: item.productId, focusDay: nil) }, for: .touchUpInside)
            // #1241 (owner): stays on the right; the pill is exactly as wide as its text, the name takes the rest
            nameRow.addArrangedSubview(status)
        }

        // #482: the link opens the "Cách tính giá" sheet; the price is for this order only. #1064: a sale line's
        // "Còn N" is now the pill beside the name (one count per line)
        let bottom = UIStackView(arrangedSubviews: [total, UIView(), stepper])
        bottom.alignment = .center
        bottom.spacing = 8
        column.setCustomSpacing(10, after: column.arrangedSubviews.last ?? link)
        column.addArrangedSubview(bottom)
        // #684 (canvas N1), #1024: pencil + "Ghi chú", or pencil + the line's note; either opens the "Ghi chú món" sheet.
        // #891 (owner): the note is the last line of the item
        column.setCustomSpacing(8, after: bottom)
        column.addArrangedSubview(UIStackView(arrangedSubviews: [itemNoteButton(item, index: index), UIView()]))

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

    /// #684 (canvas N1), #1024 (option A): "Ghi chú" when the line has no note, else the note in a light box.
    /// #1056 (owner): the whole note, on as many lines as it needs. #1061: blue "Ghi chú" / the note, then the cart's one
    /// blue edit icon
    private func itemNoteButton(_ item: CartItem, index: Int) -> UIControl {
        let spoken = CartV2Logic.itemNoteSpoken(productName: item.productName, note: item.note)
        let entry = CartNoteEntry(note: item.note, emptyTitle: "cart.itemNote.label".localized())
        entry.accessibilityLabel = spoken.label
        entry.accessibilityValue = spoken.value
        entry.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        entry.addAction(UIAction { [weak self] _ in self?.openItemNote(index: index) }, for: .touchUpInside)
        return entry
    }

    /// #1043: the order note in TIỀN; opens the "Ghi chú đơn" sheet. #1056 (owner): a row like the others — "Ghi chú",
    /// then the blue "Thêm" or the whole note on the right, wrapped on as many lines as it needs (#334155), a grey
    /// camera + count on a new order with photos, and the blue pencil
    private func orderNoteRow() -> UIView {
        let photoCount = cart.isEditMode ? 0 : CartStore.shared.noteImageData.count
        let row = V2ValueRow(title: "products.cart.note".localized(), editable: true, wrapsValue: true)
        row.valueLabel.text = CartV2Logic.noteShown(cart.notes) ?? "products.cart.addNote".localized()
        if CartV2Logic.moneyRowTone(.note, note: cart.notes) == .noteText {
            row.valueLabel.textColor = UIColor(hexString: "334155")
            row.valueLabel.font = Utils.regularFont(size: DS.TextSize.body)
        }
        if photoCount > 0 {
            let camera = UIImageView(image: DS.symbol("camera", 14, weight: .medium))
            camera.tintColor = UIColor(hexString: "64748B")
            let count = V2.label("\(photoCount)", size: DS.TextSize.secondary, weight: .bold, color: UIColor(hexString: "64748B"))
            row.accessories.addArrangedSubview(camera)
            row.accessories.addArrangedSubview(count)
            row.spokenExtra = String(format: "cart.orderNote.photos".localized(), photoCount)
        }
        row.addAction(UIAction { [weak self] _ in self?.editNote() }, for: .touchUpInside)
        return row
    }

    /// #684 (canvas N2): the separate "Ghi chú món" sheet; an empty text clears the note
    private func openItemNote(index: Int) {
        guard index < cart.items.count else { return }
        let item = cart.items[index]
        let sheet = CartItemNoteSheet(productName: item.productName ?? "", note: item.note)
        let lineId = item.lineId
        sheet.onSave = { note in CartStore.shared.updateNote(line: lineId, note: CartV2Logic.noteText(note)) }
        present(sheet, animated: true)
    }

    /// #684: blue link, price first — "200.000đ / theo lần ⌄", "400.000đ / theo ngày × 3 ngày ⌄" (15pt, no border);
    /// "Nhập giá / theo lần" while the line has no price
    private func pricingChip(_ item: CartItem, index: Int) -> UIButton {
        let chip = CartV2Logic.chip(item, orderType: cart.orderType)
        let link = CartV2Logic.link(item, orderType: cart.orderType)
        let button: UIButton
        if cart.orderType == .rent, let detail = item.blockDetail {
            button = Self.pricingLinkButton(amount: BlockPricing.summary(detail), unit: CartV2Logic.money(item.price), separator: " · ")
        } else {
            button = Self.pricingLinkButton(amount: link.amount, unit: link.unit)
        }
        button.tag = index
        button.accessibilityLabel = String(format: "products.cart.pricing.change".localized(), item.productName ?? "")
        button.accessibilityValue = [chip.label, chip.price ?? "products.cart.pricing.enterPrice".localized()].joined(separator: ", ")
        button.addTarget(self, action: #selector(pricingChipTapped(_:)), for: .touchUpInside)
        button.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(32) }
        return button
    }

    /// #1056: the blue link of a cart line. A `.custom` button: a `.system` one fades a new attributed title in, and
    /// the cart builds a new link on every render, so the price blanked and came back each time the cart opened or
    /// updated. Pressed, the text dims as the `.system` button did.
    static func pricingLinkButton(amount: String?, unit: String, separator: String = " / ") -> UIButton {
        let button = UIButton(type: .custom)
        func title(alpha: CGFloat) -> NSAttributedString {
            let color = DS.Color.primary.withAlphaComponent(alpha)
            let text = NSMutableAttributedString(string: amount ?? "products.cart.pricing.enterPrice".localized(), attributes: [
                NSAttributedString.Key.font: amount == nil ? Utils.mediumFont(size: DS.TextSize.body)
                    : UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.body, weight: .medium),
                NSAttributedString.Key.foregroundColor: color,
            ])
            text.append(NSAttributedString(string: separator + unit, attributes: [
                NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.body),
                NSAttributedString.Key.foregroundColor: color,
            ]))
            return text
        }
        button.setAttributedTitle(title(alpha: 1), for: .normal)
        button.setAttributedTitle(title(alpha: 0.4), for: .highlighted)
        button.setImage(DS.symbol("chevron.down", 13, weight: .semibold), for: .normal)
        button.tintColor = DS.Color.primary
        button.semanticContentAttribute = .forceRightToLeft
        button.imageEdgeInsets = UIEdgeInsets(top: 0, left: 6, bottom: 0, right: -6)
        button.contentEdgeInsets = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 8)
        button.contentHorizontalAlignment = .leading
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
        let start: Date
        let end: Date
        if isRent {
            guard !requests.isEmpty, let pickup = cart.pickupPlanAt, let ret = cart.returnPlanAt else {
                clearConflicts()
                return
            }
            start = pickup
            end = ret
        } else {
            clearConflicts()
            guard !requests.isEmpty else { return }
            start = Date()
            end = start
        }
        availabilityGeneration += 1
        let token = availabilityGeneration
        let outletId = CurrentOutlet.shared.id
        let rent = isRent
        let names = Dictionary(cart.items.map { ($0.productId, $0.productName ?? "") }, uniquingKeysWith: { first, _ in first })
        OrderService.shared.loadBatchProductAvailability(products: requests, startDate: start, endDate: end,
                                                         outletId: outletId, excludeOrderId: cart.orderId) { [weak self] response, _ in
            DispatchQueue.main.async {
                guard let self, token == self.availabilityGeneration, let results = response?.data?.results else { return }
                // #518: which lines are booked out on which days, from the same answer (no extra call)
                var found: [Int: CartScheduleConflict] = [:]
                if rent {
                    for result in results {
                        if let conflict = ScheduleConflictLogic.conflict(from: result, productName: names[result.productId],
                                                                         pickup: start, returnDate: end) {
                            found[result.productId] = conflict
                        }
                    }
                }
                let conflictsChanged = found != self.conflicts
                self.conflicts = found
                var posted = false
                for result in results {
                    let available = result.availabilityByOutlet?.first?.effectivelyAvailable ?? result.totalAvailableStock ?? 0
                    let ok = result.isAvailable && available >= result.requestedQuantity
                    if CartStore.shared.updateAvailabilityStatus(for: result.productId,
                                                                 status: AvailabilityStatus(isAvailable: ok, available: available)) {
                        posted = true
                    }
                }
                // The store posts (and the cart redraws) only for lines it changed: draw new conflicts when it did not.
                // #1056: nothing new = no redraw
                if conflictsChanged && !posted { self.render() }
            }
        }
    }

    private func clearConflicts() {
        guard !conflicts.isEmpty else { return }
        conflicts = [:]
        render()
    }

    // MARK: - Actions

    /// #677: the ⋯ menu for this cart state; hidden while editing an order
    private func renderMoreMenu() {
        guard let state = CartV2Logic.moreMenu(cart) else {
            moreButton.isHidden = true
            return
        }
        moreButton.isHidden = false
        let share = UIAction(title: "products.cart.menu.shareQuote".localized(), image: UIImage(systemName: "square.and.arrow.up"),
                             attributes: state.shareEnabled ? [] : .disabled) { [weak self] _ in self?.shareTapped() }
        let clear = UIAction(title: "products.cart.clear.title".localized(), image: UIImage(systemName: "trash"),
                             attributes: state.clearEnabled ? .destructive : [.destructive, .disabled]) { [weak self] _ in
            self?.confirmClearCart()
        }
        moreButton.menu = UIMenu(children: [share, UIMenu(options: .displayInline, children: [clear])])
    }

    private func shareTapped() {
        guard DraftShareRule.canShare(itemCount: cart.items.count, orderType: cart.orderType,
                                      pickup: cart.pickupPlanAt, returnDate: cart.returnPlanAt) else { return }
        OrderSharePresenter.share(OrderShareSource(cart: cart, shop: ShareShop.current()), from: self, sourceView: moreButton)
    }

    /// "Xoá giỏ hàng": the cart and its saved draft are cleared; this screen stays, empty, as after a create (#677)
    private func confirmClearCart() {
        guard presentedViewController == nil, !cart.isEditMode else { return }
        let alert = UIAlertController(title: "products.cart.clear.title".localized(),
                                      message: "products.cart.clear.message".localized(), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "products.cart.clear.confirm".localized(), style: .destructive) { _ in
            CartStore.shared.resetCart()
            ProductAvailabilityCache.shared.clearAll()
        })
        present(alert, animated: true)
    }

    @objc private func goBack() {
        navigationController?.popViewController(animated: true)
    }

    /// "+ Add" (#433): the product list. The cart keeps its customer and lines in CartStore.
    @objc private func addMoreTapped() {
        let stack = navigationController?.viewControllers ?? []
        let previous = stack.count >= 2 ? stack[stack.count - 2] : nil
        switch CartV2Logic.addMoreRoute(previousIsProductsHome: PadSplit.unwrap(previous) is ProductsHomeViewController) {
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
        let lineId = cart.items[index].lineId
        sheet.onApply = { type, price in
            CartStore.shared.applyLinePricing(line: lineId, type: type, price: price)
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
            let lineId = cart.items[index].lineId
            UIAlertController.alert(parent: self, title: "products.cart.removeTitle".localized(), message: name,
                                    okTitle: "products.cart.remove".localized(), cancelTitle: "Cancel".localized(),
                                    okAction: { _ in CartStore.shared.removeItem(line: lineId) },
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
            // #952: a customer edited from the picker's pencil: the cart shows the new info when it is that customer
            picker.onEdited = { customerId, form in
                if let updated = CustomerPickerEditLogic.cartCustomer(afterSaving: form, customerId: customerId,
                                                                      cartCustomer: CartStore.shared.cart.customer) {
                    CartStore.shared.setCustomer(updated)
                }
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
        // FSCalendar draws the phone's days: select the cart's shop days there (#596)
        picker.configureForDateRange(startDate: cart.pickupPlanAt?.devicePickFromShopDay(),
                                     endDate: cart.returnPlanAt?.devicePickFromShopDay(),
                                     minimumDate: Calendar.current.date(byAdding: .year, value: -1, to: today),
                                     maximumDate: Calendar.current.date(byAdding: .year, value: 1, to: today))
        present(picker, animated: true)
    }

    @objc private func editDiscount() {
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        picker.amountChoiceTitle = "products.cart.discountAmount".localized()
        picker.discountSubtotal = cart.subtotalAmount // #1067: the sheet refuses more than this (or 100%)
        picker.configure(initialValue: cart.discount, mode: .discount(type: cart.discountType == .percentage ? .percentage : .amount))
        present(picker, animated: true)
    }

    @objc private func editDeposit() {
        let picker = NumberPickerViewController.instance()
        picker.delegate = self
        picker.configure(initialValue: cart.depositAmount, title: "Enter deposit price".localized())
        present(picker, animated: true)
    }

    /// #1043: the "Ghi chú đơn" sheet — the item note sheet with the order's note (prefilled while editing an order).
    /// #480: on a new order it also holds the note photos, kept by the cart (memory only) and sent on create; editing
    /// an existing order stays text only (its photos live on the order detail).
    private func editNote() {
        let store = CartStore.shared
        let editMode = store.cart.isEditMode
        // Photos already kept by the cart keep their compressed bytes; only new picks are compressed
        let kept = editMode ? [] : store.noteImageData.compactMap { data in UIImage(data: data).map { ($0, data) } }
        var keptData: [ObjectIdentifier: Data] = [:]
        kept.forEach { keptData[ObjectIdentifier($0.0)] = $0.1 }
        let sheet = CartItemNoteSheet.orderNote(note: store.cart.notes, photos: kept.map { $0.0 }, editMode: editMode)
        sheet.onSaveWithPhotos = { text, images in
            store.setNotes(CartV2Logic.noteText(text))
            guard !editMode else { return }
            store.setNoteImageData(images.compactMap { keptData[ObjectIdentifier($0)] ?? NoteEditorLogic.compressedJPEG($0) })
        }
        present(sheet, animated: true)
    }

    @objc private func ctaTapped() {
        // A double tap must not open two previews or sheets (#341)
        guard PadSplit.cartIsInFront(self, top: navigationController?.topViewController), presentedViewController == nil else { return }
        // #518 OFF: blocked until the dates, quantities or lines change (the button is disabled too)
        guard ctaState != .blocked, CartV2Logic.cartDiscountError(cart) == nil else { return }
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
        case .editSheet:
            presentEditSheet()
        case .confirmSheet:
            presentConfirmSheet()
        }
    }

    // MARK: - Save an edited order (#676, board sua-don)

    private func presentEditSheet() {
        let sheet = EditOrderConfirmSheet(confirm: EditOrderSheetLogic.confirm(cart))
        sheet.onConfirm = { [weak self, weak sheet] in self?.saveEditedOrder(sheet: sheet) }
        present(sheet, animated: true)
    }

    /// The review screen's update request (`CartOrderUpdate`, same body as `CartViewModel.saveOrder`). The cart already
    /// ran the same checks the review screen relied on: `validate()`, missing prices and the overlap block.
    private func saveEditedOrder(sheet: EditOrderConfirmSheet?) {
        guard let orderId = cart.orderId, editSubmission.begin() else { return }
        sheet?.setBusy(true)
        let number = EditOrderSheetLogic.number(cart)
        CartOrderUpdate.send(cart) { [weak self] order, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let error {
                    // The sheet and the cart stay; the next tap retries
                    self.editSubmission.failed()
                    sheet?.setBusy(false)
                    UIAlertController.errorAlert(parent: sheet ?? self, error: error)
                    self.reloadBlockTablesIfNeeded(after: error)
                    return
                }
                self.editSubmission.succeeded()
                self.orderSaved(order, orderId: orderId, number: number, sheet: sheet)
            }
        }
    }

    /// Same clean-up as the review screen, then the order's detail (loaded fresh) with "Đã lưu đơn #…"
    private func orderSaved(_ order: Order?, orderId: Int, number: String?, sheet: EditOrderConfirmSheet?) {
        if let order {
            OrderListViewModel.shared.updateOrder(order)
        } else {
            OrderListViewModel.shared.setNeedsRefresh()
        }
        OrdersChangeSignal.post() // #674
        ProductAvailabilityCache.shared.clearAll()
        HapticFeedback.success()
        // #677: the cart is emptied once the order's detail has replaced it, so an empty "Tạo đơn" cart never shows
        let open: () -> Void = { [weak self] in
            guard let self else { return CartStore.shared.resetCart() }
            self.openSavedOrder(order, orderId: orderId, number: number)
            self.resetCartAfterTransition()
        }
        if let sheet, sheet.presentingViewController != nil {
            sheet.dismiss(animated: true, completion: open)
        } else {
            open()
        }
    }

    /// The edited order's detail in place of the cart; the detail loads the saved order itself
    private func openSavedOrder(_ order: Order?, orderId: Int, number: String?) {
        guard let detail = replaceWithOrderDetail(order, orderId: orderId) else { return }
        let message = number.map { String(format: "products.cart.edit.saved".localized(), $0) } ?? "products.cart.edit.savedNoNumber".localized()
        (detail as? BaseViewControler)?.showToast(message: message, duration: 2.5)
    }

    /// The order's detail in place of this cart (loaded fresh), or the stack root without the new detail and no order
    @discardableResult
    private func replaceWithOrderDetail(_ order: Order?, orderId: Int) -> UIViewController? {
        guard let navigationController else { return nil }
        let detail: UIViewController
        if OrderDetailRouter.usesNewDetail {
            let controller = OrderDetailViewController(orderId: orderId)
            controller.hidesBottomBarWhenPushed = true
            detail = controller
        } else if let order {
            detail = OrderDetailRouter.detailController(for: order, delegate: nil)
        } else {
            navigationController.popToRootViewController(animated: true)
            return nil
        }
        var stack = navigationController.viewControllers
        if stack.last === self { stack.removeLast() }
        stack.append(detail)
        navigationController.setViewControllers(stack, animated: true)
        return detail
    }

    /// #677: empty the cart once the navigation away has finished (this screen no longer draws it)
    private func resetCartAfterTransition() {
        if let coordinator = navigationController?.transitionCoordinator {
            coordinator.animate(alongsideTransition: nil) { _ in CartStore.shared.resetCart() }
        } else {
            CartStore.shared.resetCart()
        }
    }

    // MARK: - Leave edit mode (#677)

    /// "Huỷ sửa": confirm, then leave edit mode with an empty cart (and draft) and show the order again
    @objc private func cancelEditTapped() {
        guard presentedViewController == nil, let orderId = EditOrderSheetLogic.cancelEdit(cart) else { return }
        let alert = UIAlertController(title: EditOrderSheetLogic.cancelTitle(number: EditOrderSheetLogic.number(cart)),
                                      message: "products.cart.edit.cancelMessage".localized(), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "products.cart.edit.keepEditing".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "products.cart.edit.cancel".localized(), style: .destructive) { [weak self] _ in
            guard let self else { return }
            ProductAvailabilityCache.shared.clearAll()
            if self.replaceWithOrderDetail(nil, orderId: orderId) == nil, !OrderDetailRouter.usesNewDetail {
                // The old detail needs the order first: open it from the screen under the cart
                if let previous = self.navigationController?.topViewController as? BaseViewControler {
                    OrderDetailRouter.open(orderId: orderId, from: previous)
                }
            }
            self.resetCartAfterTransition()
        })
        present(alert, animated: true)
    }

    // MARK: - Create order sheets (#476)

    private func presentConfirmSheet() {
        let confirm = CreateOrderSheetLogic.confirm(cart)
        // #518 ON (board GH-trung-bat): an orange "Trùng lịch" block and "Vẫn tạo đơn"
        let warnings = ctaState == .warnBeforeCreate ? currentConflicts.map(ScheduleConflictLogic.warningLine) : []
        let sheet = CreateOrderConfirmSheet(confirm: confirm, overlapWarnings: warnings)
        sheet.onConfirm = { [weak self, weak sheet] in self?.submitOrder(confirm: confirm, sheet: sheet) }
        present(sheet, animated: true)
    }

    /// #1189: 400 BLOCK_PRICE_MISMATCH = a product's day table changed after the line was added. Load the products of
    /// the block lines again; the lines take the new table and the next confirm sends the new price.
    private func reloadBlockTablesIfNeeded(after error: Error) {
        guard BlockPricingError.isPriceMismatch(error) else { return }
        let ids = Set(cart.items.filter { $0.pricingType?.uppercased() == "BLOCK" }.map { $0.productId })
        for id in ids {
            ProductService.shared.loadProduct(productId: id) { product, _ in
                guard let product else { return }
                DispatchQueue.main.async { CartStore.shared.refreshBlockTable(from: product) }
            }
        }
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
                    self.reloadBlockTablesIfNeeded(after: error)
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
        OrdersChangeSignal.post() // #674
        // #973 iPad panel: the empty cart closes its panel, so Home (still on screen) shows "Đã tạo đơn"
        if isPanel, let home = parent, let navigationController {
            CartStore.shared.resetCart()
            ProductAvailabilityCache.shared.clearAll()
            HapticFeedback.success()
            if let orderId = order?.id { CreatedOrderAutoPrint.run(orderId: orderId) }
            let created = OrderCreatedSheet(summary: CreateOrderSheetLogic.created(orderNumber: order?.orderNumber ?? "", confirm: confirm))
            created.onNewOrder = { [weak home] in
                if let home { RatingManager.shared.requestRatingIfNeeded(from: home) }
            }
            created.onViewOrder = { [weak home, weak navigationController] in
                if let home { RatingManager.shared.requestRatingIfNeeded(from: home) }
                guard let order else { return }
                navigationController?.pushViewController(OrderDetailRouter.detailController(for: order, delegate: nil), animated: true)
            }
            let show: () -> Void = { [weak home] in home?.present(created, animated: true) }
            if let sheet, sheet.presentingViewController != nil {
                sheet.dismiss(animated: true, completion: show)
            } else {
                show()
            }
            return
        }
        CartStore.shared.resetCart()
        ProductAvailabilityCache.shared.clearAll()
        HapticFeedback.success()
        if let orderId = order?.id { CreatedOrderAutoPrint.run(orderId: orderId) }

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

extension CartV2ViewController {
    /// #1054 (owner): the shortage pill: the amber "Chưa soạn đồ" palette (#1032, `DS.Status.waiting`) in medium while
    /// some units are free; the booked-out red in bold when none are
    static func shortageStyle(_ tone: CartV2Logic.ShortageTone) -> (colors: DS.Pill, weight: UIFont.Weight) {
        switch tone {
        // #1132 (mockup A): soft fills, semibold text
        case .ok: return (DS.Pill(text: UIColor(hexString: "166534"), fill: UIColor(hexString: "DCFCE7")), .semibold) // #1064: 2+ free and enough
        case .low: return (DS.Status.waiting, .semibold)
        case .none: return (DS.Pill(text: UIColor(hexString: "991B1B"), fill: UIColor(hexString: "FEE2E2")), .semibold)
        }
    }

    /// #1132 (owner, mockup A): the cart line's stock status (and the overlap tag): a capsule in the tone's fill with a
    /// 7 pt dot in the text colour before the text. A UIControl so the overlap tag can take a tap.
    static func stockPill(text: String, tone: CartV2Logic.ShortageTone) -> UIControl {
        let style = shortageStyle(tone)
        let pill = PillControl()
        pill.backgroundColor = style.colors.fill
        pill.isAccessibilityElement = true
        pill.accessibilityLabel = text
        let dot = UIView()
        dot.accessibilityIdentifier = "cart.stockPill.dot"
        dot.backgroundColor = style.colors.text
        dot.layer.cornerRadius = 3.5
        dot.snp.makeConstraints { make in make.size.equalTo(7) }
        let label = V2.label(text, size: DS.TextSize.pill, weight: style.weight, color: style.colors.text)
        label.numberOfLines = 1
        let row = UIStackView(arrangedSubviews: [dot, label])
        row.spacing = 5
        row.alignment = .center
        row.isUserInteractionEnabled = false
        pill.addSubview(row)
        row.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 9)) }
        pill.setContentHuggingPriority(.required, for: .horizontal)
        pill.setContentCompressionResistancePriority(.required, for: .horizontal)
        pill.layer.cornerRadius = (ceil(label.font.lineHeight) + 6) / 2
        pill.clipsToBounds = true
        return pill
    }
}

/// #1241: the cart's stock chip is about 20 pt high; the touch area grows to 44 pt without changing the look
final class PillControl: UIControl {
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        let dy = max(0, (44 - bounds.height) / 2), dx = max(0, (44 - bounds.width) / 2)
        return bounds.insetBy(dx: -dx, dy: -dy).contains(point)
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

    /// Pickup at the start of its shop day, return at the end of its shop day, whatever the phone zone (#596)
    private func setDates(start: Date, end: Date) {
        let bounds = CartV2Logic.rentalBounds(pickedStart: start, pickedEnd: end)
        CartStore.shared.setPickupDate(bounds.pickup)
        CartStore.shared.setReturnDate(bounds.return)
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
            if let index = editingStageIndex {
                editingStageIndex = nil
                CartStore.shared.setDepositStageAmount(index: index, amount: value)
            } else {
                CartStore.shared.setManualDepositAmount(value)
            }
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
    /// pricing type (nil on a sale line) and the unit price for this order (#951: nil = the box left empty, 0 = free)
    var onApply: ((String?, Double?) -> Void)?

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
    private let fieldStack = UIStackView()

    /// #1189: the day-block table the sheet previews (the line's own, else the product's BLOCK option)
    private var blockTable: BlockTable? {
        item.blockTable ?? (item.pricingOptions ?? []).first { $0.isActive != false && $0.blockTable != nil }?.blockTable
    }

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
        let field = fieldStack
        field.addArrangedSubview(fieldTitle)
        field.addArrangedSubview(priceField)
        field.addArrangedSubview(note)
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

        setPrice(orderType == .sale ? item.price : CartV2Logic.startPrice(item, type: selectedType))
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
            var priceText = choice.catalogPrice.map { CartV2Logic.priceText($0, type: choice.type, orderType: orderType) }
            if choice.type == ProductPricingMode.block.rawValue, let table = blockTable { priceText = BlockPricing.rowSummary(table) }
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

    /// #951: nil while the box is empty; "0" is a price (a free line)
    private var price: Double? {
        Double(String((priceField.text ?? "").filter { $0.isNumber }))
    }

    private func setPrice(_ value: Double?) {
        priceField.text = value.map { MoneyFormatter.plain($0) } ?? ""
        priceField.placeholder = "0"
        let daily = orderType == .rent && selectedType == ProductPricingMode.perDay.rawValue
        unitLabel.text = MoneyFormatter.unitLabel(daily: daily)
        fieldStack.isHidden = selectedType == ProductPricingMode.block.rawValue
        updatePreview()
    }

    @objc private func priceChanged() {
        let digits = String((priceField.text ?? "").filter { $0.isNumber }.prefix(12))
        priceField.text = digits.isEmpty ? "" : MoneyFormatter.plain(Double(digits) ?? 0)
        updatePreview()
    }

    private func updatePreview() {
        // #1189: a block line has no price box; the preview is the table's answer for the cart's days
        if orderType == .rent, selectedType == ProductPricingMode.block.rawValue, let table = blockTable,
           let detail = BlockPricing.detail(table, days: days, minorUnit: BlockPricing.minorUnit(currency: ShopCurrencyStore.current.rawValue)) {
            previewText.text = BlockPricing.summary(detail) + (detail.extraDays > 0 ? "\n" + BlockPricing.formula(detail) : "")
            previewTotal.text = CartV2Logic.money(detail.total * Double(item.quantity))
            return
        }
        let preview = CartV2Logic.pricePreview(type: selectedType, price: price ?? 0, days: days, quantity: item.quantity, orderType: orderType)
        previewText.text = preview.text
        previewTotal.text = CartV2Logic.money(preview.total)
    }

    @objc private func applyTapped() {
        let isBlock = orderType == .rent && selectedType == ProductPricingMode.block.rawValue
        onApply?(orderType == .rent ? selectedType : nil, isBlock ? nil : price)
        dismiss(animated: true)
    }
}

/// #684 (canvas N2): "Ghi chú món" — title + ✕, the product name, a text area, "Xoá ghi chú" / "Lưu".
/// #1043: the same sheet is the cart's "Ghi chú đơn" (no subtitle; on a new order a row of up to 5 note photos, #480).
final class CartItemNoteSheet: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    /// The item note: the text (nil = cleared)
    var onSave: ((String?) -> Void)?
    /// #1043 order note: the text (nil = cleared) and the photos
    var onSaveWithPhotos: ((String?, [UIImage]) -> Void)?
    let titleText: String
    private let subtitle: String?
    private let note: String?
    private let hintText: String
    /// 0 = no photo row (an item note, or the order note while editing an order)
    let maxPhotos: Int
    private var photos: [UIImage]
    private let textView = UITextView()
    private let placeholder: UILabel
    private let photoTiles = UIStackView()
    private let photoCount = V2.label(size: DS.TextSize.secondary, color: UIColor(hexString: "64748B"))

    private static let tileSize: CGFloat = 56

    convenience init(productName: String, note: String?) {
        self.init(title: "cart.itemNote.title".localized(), subtitle: productName, note: note,
                  placeholder: "cart.itemNote.placeholder".localized(), hint: "cart.itemNote.hint".localized())
    }

    /// #1043 "Ghi chú đơn": the same sheet as an item note (#1056, owner: one look for both); the photo row only on a
    /// new order
    static func orderNote(note: String?, photos: [UIImage], editMode: Bool) -> CartItemNoteSheet {
        CartItemNoteSheet(title: "cart.orderNote.title".localized(), subtitle: nil, note: note,
                          placeholder: "cart.orderNote.placeholder".localized(), hint: "cart.orderNote.hint".localized(),
                          photos: photos, maxPhotos: CartV2Logic.orderNoteMaxPhotos(editMode: editMode))
    }

    /// `maxPhotos` 0 = no photo row
    init(title: String, subtitle: String?, note: String?, placeholder: String, hint: String,
         photos: [UIImage] = [], maxPhotos: Int = 0) {
        titleText = title
        self.subtitle = subtitle
        self.note = note
        hintText = hint
        self.maxPhotos = maxPhotos
        self.photos = Array(photos.prefix(maxPhotos))
        self.placeholder = V2.label(placeholder, size: DS.TextSize.input, color: UIColor(hexString: "94A3B8"))
        super.init(nibName: nil, bundle: nil)
        if let sheet = sheetPresentationController {
            sheet.detents = [.large()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 24
        }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        let title = V2.label(titleText, size: 20, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", 16, weight: .bold), for: .normal)
        close.tintColor = UIColor(hexString: "475569")
        close.backgroundColor = UIColor(hexString: "F1F5F9")
        close.layer.cornerRadius = 18
        close.accessibilityLabel = "Close".localized()
        close.addAction(UIAction { [weak self] _ in self?.dismiss(animated: true) }, for: .touchUpInside)
        close.snp.makeConstraints { make in make.size.equalTo(36) }
        let header = UIStackView(arrangedSubviews: [title, close])
        header.alignment = .center
        header.spacing = DS.Spacing.md

        textView.text = note
        textView.font = Utils.regularFont(size: DS.TextSize.input)
        textView.textColor = DS.Color.text
        textView.layer.borderWidth = 1
        textView.layer.borderColor = DS.Color.primary.cgColor
        textView.layer.cornerRadius = 12
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 10, bottom: 12, right: 10)
        textView.accessibilityLabel = titleText
        textView.delegate = self
        textView.snp.makeConstraints { make in make.height.equalTo(140) }
        textView.addSubview(placeholder)
        placeholder.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(12)
            make.leading.equalToSuperview().offset(15)
        }
        placeholder.isHidden = !(note ?? "").isEmpty
        let hint = V2.label(hintText, size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)

        let clear = UIButton(type: .system)
        clear.setTitle("cart.itemNote.clear".localized(), for: .normal)
        clear.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        clear.setTitleColor(V2.danger, for: .normal)
        clear.layer.borderWidth = 1
        clear.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        clear.layer.cornerRadius = 14
        clear.isHidden = (note ?? "").isEmpty
        clear.addAction(UIAction { [weak self] _ in self?.finish(nil) }, for: .touchUpInside)
        let save = V2.primaryButton("cart.itemNote.save".localized())
        save.addAction(UIAction { [weak self] _ in self?.finish(self?.textView.text) }, for: .touchUpInside)
        let buttons = UIStackView(arrangedSubviews: [clear, save])
        buttons.spacing = 10
        buttons.distribution = .fillEqually
        buttons.snp.makeConstraints { make in make.height.equalTo(50) }

        var rows: [UIView] = [header]
        if let subtitle {
            rows.append(V2.label(subtitle, size: DS.TextSize.body, color: DS.Color.textMuted, lines: 2))
        }
        rows += [textView, hint]
        if maxPhotos > 0 {
            rows.append(photoRow())
        }
        rows.append(buttons)
        let stack = UIStackView(arrangedSubviews: rows)
        stack.axis = .vertical
        stack.spacing = 12
        stack.setCustomSpacing(16, after: subtitle == nil ? header : rows[1])
        stack.setCustomSpacing(22, after: rows[rows.count - 2])
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(28)
            make.leading.trailing.equalToSuperview().inset(20)
        }
        renderPhotos()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // Not again after the photo picker closes
        guard presentedViewController == nil, !isBeingDismissed, !didFocus else { return }
        didFocus = true
        textView.becomeFirstResponder()
    }

    private var didFocus = false

    private func finish(_ text: String?) {
        let onSave = self.onSave
        let onSaveWithPhotos = self.onSaveWithPhotos
        let photos = self.photos
        view.endEditing(true)
        dismiss(animated: true) {
            onSave?(text)
            onSaveWithPhotos?(text, photos)
        }
    }

    // MARK: - Photos (#1043, order note on a new order)

    /// "Ảnh" + "2/5", then 56pt tiles with a × and a "+" tile while there is room
    private func photoRow() -> UIView {
        let title = V2.label("Photos".localized(), size: DS.TextSize.body, weight: .bold)
        let titleRow = UIStackView(arrangedSubviews: [title, UIView(), photoCount])
        titleRow.alignment = .firstBaseline
        photoTiles.axis = .horizontal
        photoTiles.spacing = 10
        photoTiles.alignment = .center
        let tilesRow = UIStackView(arrangedSubviews: [photoTiles, UIView()])
        let stack = UIStackView(arrangedSubviews: [titleRow, tilesRow])
        stack.axis = .vertical
        stack.spacing = 8
        return stack
    }

    private func renderPhotos() {
        guard maxPhotos > 0 else { return }
        photoTiles.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (index, image) in photos.enumerated() {
            photoTiles.addArrangedSubview(photoTile(image, index: index))
        }
        if NoteEditorLogic.canAdd(count: photos.count, max: maxPhotos) {
            let add = UIButton(type: .system)
            add.setImage(DS.symbol("camera", 18, weight: .medium), for: .normal)
            add.tintColor = DS.Color.primary
            add.backgroundColor = V2.sectionFill
            add.layer.cornerRadius = 10
            add.layer.borderWidth = 1
            add.layer.borderColor = UIColor(hexString: "CBD5E1").cgColor
            add.accessibilityLabel = "Add photos".localized()
            add.addAction(UIAction { [weak self, weak add] _ in self?.addPhoto(from: add) }, for: .touchUpInside)
            add.snp.makeConstraints { make in make.size.equalTo(Self.tileSize) }
            photoTiles.addArrangedSubview(add)
        }
        photoCount.text = NoteEditorLogic.countLabel(count: photos.count, max: maxPhotos)
    }

    private func photoTile(_ image: UIImage, index: Int) -> UIView {
        let open = UIButton(type: .custom)
        open.setImage(image, for: .normal)
        open.imageView?.contentMode = .scaleAspectFill
        open.contentHorizontalAlignment = .fill
        open.contentVerticalAlignment = .fill
        open.clipsToBounds = true
        open.layer.cornerRadius = 10
        open.accessibilityLabel = "Note photo".localized()
        open.addAction(UIAction { [weak self] _ in
            let viewer = NoteImagePreviewViewController(image: image)
            viewer.modalPresentationStyle = .fullScreen
            self?.present(viewer, animated: true)
        }, for: .touchUpInside)
        let remove = UIButton(type: .system)
        remove.setImage(DS.symbol("xmark", 10, weight: .bold), for: .normal)
        remove.tintColor = .white
        remove.backgroundColor = DS.Color.text.withAlphaComponent(0.85)
        remove.layer.cornerRadius = 11
        remove.accessibilityLabel = "Remove photo".localized()
        remove.addAction(UIAction { [weak self] _ in
            guard let self, self.photos.indices.contains(index) else { return }
            self.photos.remove(at: index)
            self.renderPhotos()
        }, for: .touchUpInside)
        let tile = UIView()
        tile.addSubview(open)
        tile.addSubview(remove)
        tile.snp.makeConstraints { make in make.size.equalTo(Self.tileSize) }
        open.snp.makeConstraints { make in make.edges.equalToSuperview() }
        remove.snp.makeConstraints { make in
            make.size.equalTo(22)
            make.top.trailing.equalToSuperview().inset(3)
        }
        return tile
    }

    private func addPhoto(from source: UIView?) {
        guard NoteEditorLogic.canAdd(count: photos.count, max: maxPhotos) else { return }
        view.endEditing(true)
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Photo Library".localized(), style: .default) { [weak self] _ in
            self?.presentPicker(.photoLibrary)
        })
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            alert.addAction(UIAlertAction(title: "Camera".localized(), style: .default) { [weak self] _ in
                self?.presentPicker(.camera)
            })
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        if let popover = alert.popoverPresentationController, let source {
            popover.sourceView = source
            popover.sourceRect = source.bounds
        }
        present(alert, animated: true)
    }

    private func presentPicker(_ source: UIImagePickerController.SourceType) {
        let picker = UIImagePickerController()
        picker.sourceType = source
        picker.delegate = self
        present(picker, animated: true)
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [String: Any]) {
        picker.dismiss(animated: true)
        guard let image = info[UIImagePickerControllerOriginalImage] as? UIImage,
              NoteEditorLogic.canAdd(count: photos.count, max: maxPhotos) else { return }
        photos.append(image)
        renderPhotos()
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}

extension CartItemNoteSheet: UITextViewDelegate {
    func textViewDidChange(_ textView: UITextView) {
        placeholder.isHidden = !textView.text.isEmpty
    }
}


// MARK: - Swipe to delete (#893)

/// #893 (owner): what a right-to-left swipe on a cart line does when the finger lifts
enum SwipeDeleteLogic {
    enum Outcome: Equatable { case close, open, delete }

    /// Width of the red "Xoá" action
    static let actionWidth: CGFloat = 88

    static func outcome(offset: CGFloat, width: CGFloat, velocity: CGFloat) -> Outcome {
        guard offset < 0 else { return .close }
        if -offset > width * 0.6 || (velocity < -1200 && -offset > actionWidth / 2) { return .delete }
        if -offset > actionWidth / 2 { return .open }
        return .close
    }

    /// The content never moves right, nor further than the row
    static func clamped(_ offset: CGFloat, width: CGFloat) -> CGFloat {
        min(0, max(offset, -width))
    }
}

/// A row that slides left to reveal a red "Xoá"; a full swipe or a tap on "Xoá" calls `onDelete` (#893)
final class SwipeDeleteRow: UIView, UIGestureRecognizerDelegate {
    let content: UIView
    var onDelete: (() -> Void)?
    private let action = UIButton(type: .system)
    private var start: CGFloat = 0

    init(content: UIView) {
        self.content = content
        super.init(frame: .zero)
        clipsToBounds = true
        backgroundColor = UIColor(hexString: "DC2626")
        action.setTitle("cart.swipe.delete".localized(), for: .normal)
        action.setTitleColor(.white, for: .normal)
        action.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        action.accessibilityIdentifier = "cart.swipe.delete"
        action.addTarget(self, action: #selector(deleteTapped), for: .touchUpInside)
        addSubview(action)
        addSubview(content)
        content.backgroundColor = content.backgroundColor ?? DS.Color.surface
        content.snp.makeConstraints { make in make.edges.equalToSuperview() }
        action.snp.makeConstraints { make in
            make.top.bottom.trailing.equalToSuperview()
            make.width.equalTo(SwipeDeleteLogic.actionWidth)
        }
        let pan = UIPanGestureRecognizer(target: self, action: #selector(panned(_:)))
        pan.delegate = self
        addGestureRecognizer(pan)
        // VoiceOver: the same as a full swipe
        accessibilityCustomActions = [UIAccessibilityCustomAction(name: "cart.swipe.delete".localized(), target: self,
                                                                 selector: #selector(accessibilityDelete))]
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Only a mostly horizontal drag starts the swipe, so the cart still scrolls vertically
    override func gestureRecognizerShouldBegin(_ gestureRecognizer: UIGestureRecognizer) -> Bool {
        guard let pan = gestureRecognizer as? UIPanGestureRecognizer else { return true }
        let velocity = pan.velocity(in: self)
        return abs(velocity.x) > abs(velocity.y)
    }

    @objc private func panned(_ pan: UIPanGestureRecognizer) {
        let width = bounds.width
        switch pan.state {
        case .began:
            start = content.transform.tx
        case .changed:
            content.transform = CGAffineTransform(translationX: SwipeDeleteLogic.clamped(start + pan.translation(in: self).x, width: width), y: 0)
        case .ended, .cancelled:
            let offset = content.transform.tx
            switch SwipeDeleteLogic.outcome(offset: offset, width: width, velocity: pan.velocity(in: self).x) {
            case .delete: slideOutAndDelete()
            case .open: settle(-SwipeDeleteLogic.actionWidth)
            case .close: settle(0)
            }
        default:
            break
        }
    }

    private func settle(_ x: CGFloat) {
        UIView.animate(withDuration: 0.2) { self.content.transform = CGAffineTransform(translationX: x, y: 0) }
    }

    private func slideOutAndDelete() {
        UIView.animate(withDuration: 0.2, animations: {
            self.content.transform = CGAffineTransform(translationX: -self.bounds.width, y: 0)
        }, completion: { _ in self.onDelete?() })
    }

    @objc private func deleteTapped() {
        slideOutAndDelete()
    }

    @objc private func accessibilityDelete() -> Bool {
        onDelete?()
        return true
    }
}
