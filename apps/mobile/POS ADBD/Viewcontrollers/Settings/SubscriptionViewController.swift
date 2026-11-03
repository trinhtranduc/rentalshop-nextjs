//
//  SubscriptionViewController.swift
//  POS ADBD
//
//  #1459 Gói dịch vụ (approved "Thiết kế đơn giản", 2026-11-02): plan status first, then Chọn gói, Chọn kỳ gia hạn and one
//  button with the auto-renew disclosure under it; links to manage / cancel, restore, terms and privacy. No icons; the
//  brand colour only on the radio dots, the button, links and the "Phổ biến" pill. The same screen is the expired gate
//  (`Context.expired`): no back, "Gói của shop đã hết hạn", Đăng xuất; staff get "Nhờ chủ shop gia hạn." and Thử lại.
//  What may be bought is the server's answer (`purchasablePlanIds`); prices are the store's.
//

import SafariServices
import SnapKit
import UIKit

final class SubscriptionViewController: BaseViewControler {
    enum Context { case settings, expired }

    private enum Phase: Equatable { case idle, busy, confirming, slow }

    private let context: Context
    private let isOwner: Bool

    private var status: PlanStatus?
    private var plans: [PlanOption] = []
    private var products: [String: PlanStoreProduct] = [:]
    private var selectedPlanId: Int?
    private var selectedMonths = 12
    private var phase: Phase = .idle
    private var loadFailed = false
    private var loading = false
    /// The answer before a purchase or restore; the server confirmed once it moved (`PlanRenewalLogic.confirmed`)
    private var statusBeforePayment: PlanStatus?
    /// #1464: the last purchase left this Apple ID's plan in place until its renewal (the slow state says so)
    private var storeKeptPlan = false
    private var renewedThisVisit = false
    /// A1: RevenueCat is logged in as this shop (false: the screen asks to try again)
    private var storeAccountReady = true

    private let scrollView = UIScrollView()
    private let stack = UIStackView()
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)

    init(context: Context = .settings) {
        self.context = context
        self.isOwner = User.account()?.role == .merchant
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        reload()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.background
        setupCustomNavigationBar(
            title: "plan.title".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: context == .expired,
            backAction: .pop
        )
        guard let navBar = customNavBar else { return }
        scrollView.alwaysBounceVertical = true
        view.addSubview(scrollView)
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(navBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        stack.axis = .vertical
        stack.spacing = 0
        scrollView.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalTo(scrollView.contentLayoutGuide).offset(4)
            make.bottom.equalTo(scrollView.contentLayoutGuide).offset(-24)
            make.centerX.equalTo(scrollView.frameLayoutGuide)
            if PadLayout.isPad {
                make.width.equalTo(560)
            } else {
                make.width.equalTo(scrollView.frameLayoutGuide).offset(-2 * DS.Spacing.lg)
            }
        }
        spinner.hidesWhenStopped = true
        view.addSubview(spinner)
        spinner.snp.makeConstraints { make in make.center.equalTo(scrollView) }
    }

    // MARK: - Loading

    private func reload() {
        guard !loading else { return }
        loading = true
        loadFailed = false
        if status == nil { spinner.startAnimating() }
        let group = DispatchGroup()
        var newStatus: PlanStatus?
        var newPlans: [PlanOption]?
        group.enter()
        SubscriptionAPIService.shared.planStatus { status, _ in
            newStatus = status
            group.leave()
        }
        if isOwner {
            group.enter()
            SubscriptionAPIService.shared.plans { plans, _ in
                newPlans = plans
                group.leave()
            }
        }
        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            self.loading = false
            self.loadFailed = newStatus == nil
            if let newStatus { self.status = newStatus }
            if let newPlans {
                self.plans = newPlans.filter { $0.storeProductIds != nil }.sorted { ($0.sortOrder, $0.id) < ($1.sortOrder, $1.id) }
            }
            let ids = self.plans.compactMap(\.storeProductIds).flatMap { [$0.semiAnnual, $0.annual] }
            guard self.isOwner, !ids.isEmpty, let status = self.status, !status.purchasable.isEmpty || status.autoRenew == true else {
                self.finishLoading()
                return
            }
            PurchasesManager.products(ids: ids) { [weak self] list, accountReady in
                guard let self else { return }
                self.storeAccountReady = accountReady
                self.products = Dictionary(list.map { ($0.productId, $0) }, uniquingKeysWith: { first, _ in first })
                self.finishLoading()
            }
        }
    }

    private func finishLoading() {
        spinner.stopAnimating()
        // The gate is up but the period runs again (paid on another device, or the admin extended it)
        if context == .expired, let status, !status.isBlocked {
            appDelegate.leaveExpiredPlan(banner: nil)
            return
        }
        if let status, selectedPlanId == nil || !status.purchasable.contains(selectedPlanId ?? -1) {
            selectedPlanId = PlanRenewalLogic.defaultPlanId(plans: plans, status: status)
        }
        if let current = status?.storeProductId, current.contains("semi") { selectedMonths = 6 }
        render()
    }

    private var currentPlan: PlanOption? { plans.first { $0.id == status?.planId } }
    private var selectedPlan: PlanOption? { plans.first { $0.id == selectedPlanId } }

    private func product(for plan: PlanOption?, months: Int) -> PlanStoreProduct? {
        guard let id = plan?.storeProductIds?.id(months: months) else { return nil }
        return products[id]
    }

    private var storeHasProducts: Bool {
        plans.contains { plan in product(for: plan, months: 6) != nil || product(for: plan, months: 12) != nil }
    }

    // MARK: - Render

    private func render() {
        stack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        guard let status else {
            if loadFailed {
                if context == .expired { addExpiredHeader(nil) }
                addMessage("plan.loadError".localized())
                addRetryButton()
                addFooterLinks(manage: false, restore: false)
                if context == .expired { addLogout() }
            }
            return
        }
        // A payment problem the API blocks on (PAST_DUE, Lemon / Stripe) is not an ended period: no plan to buy here
        let modeStatus = !status.isPastDue && (context == .expired || status.isExpired) ? PlanStatus.expired(from: status) : status
        let mode = PlanRenewalLogic.mode(isOwner: isOwner, status: modeStatus, storeHasProducts: storeHasProducts)

        if status.isPastDue {
            addExpiredHeader(status, title: "plan.paymentIssue.title")
        } else if context == .expired || status.isExpired {
            addExpiredHeader(status)
        } else {
            addStatusCard(status, includes: mode != .purchase)
            // A6: auto-renew is off on this device's store: turn it back on in the store, never rebuy the same product
            if status.reenableAutoRenew == true { addReenable(status) }
        }

        // #1464: "Quản lý / huỷ gói · Khôi phục" only for a plan the App Store bills, else "Khôi phục giao dịch"
        let links = PlanRenewalLogic.footerLinks(status)
        switch mode {
        case .purchase, .expiredOwner:
            // A5: an auto-renewing shop upgrading through its store sees its renewal first
            if status.autoRenew == true && !status.isExpired { addAutoRenew(status) }
            addPlanChooser(status)
            addPeriodChooser()
            addBuyButton(status)
            addFooterLinks(links)
        case .autoRenewing:
            addAutoRenew(status)
            addFooterLinks(links)
        case .nothingToBuy:
            addMessage(String(format: "plan.renewLater".localized(), status.window))
            addFooterLinks(links)
        case .reenableOnly:
            addFooterLinks(links)
        case .storeUnavailable:
            addMessage((storeAccountReady ? "plan.storeUnavailable" : "plan.accountNotReady").localized())
            addRetryButton()
            addFooterLinks(manage: false, restore: false)
        case .paymentIssueOwner:
            addRetryButton()
            addFooterLinks(manage: true, restore: false)
        case .expiredStaff:
            addMessage("plan.expired.askOwner".localized())
            addRetryButton()
        }
        if context == .expired { addLogout() }
    }

    /// "Basic · Đang dùng" / "Hết hạn 15/11/2026 · còn 13 ngày" (+ "Gồm: …", + billing issue)
    private func addStatusCard(_ status: PlanStatus, includes: Bool) {
        let card = Self.card()
        let name = PlanRenewalLogic.displayPlanName(status.planName, isTrial: status.isTrial)
        let title = NSMutableAttributedString(string: name, attributes: [.font: Utils.boldFont(size: DS.TextSize.name), .foregroundColor: DS.Color.text])
        title.append(NSAttributedString(string: " · " + "plan.current".localized(),
                                        attributes: [.font: Utils.regularFont(size: DS.TextSize.name), .foregroundColor: DS.Color.textMuted]))
        let titleLabel = UILabel()
        titleLabel.attributedText = title
        titleLabel.numberOfLines = 0
        var lines: [UIView] = [titleLabel]
        if let text = PlanRenewalLogic.text(PlanRenewalLogic.statusLine(status, renewed: renewedThisVisit)) {
            lines.append(Self.label(text, size: DS.TextSize.body, color: DS.Color.textMuted, id: "plan.status"))
        }
        if includes {
            let limits = currentPlan?.limits ?? status.limits
            let features = currentPlan?.features ?? status.features
            let text = String(format: "plan.includes".localized(),
                              PlanRenewalLogic.includes(limits: limits, features: features, withOutlets: true))
            lines.append(Self.label(text, size: DS.TextSize.secondary, color: DS.Color.text))
        }
        if status.billingIssue == true {
            lines.append(Self.label("plan.billingIssue".localized(), size: DS.TextSize.secondary, color: DS.Color.text, id: "plan.billingIssue"))
        }
        card.addRows(lines)
        stack.addArrangedSubview(spacer(16))
        stack.addArrangedSubview(card)
    }

    /// "Gói của shop đã hết hạn" (black), "Basic · hết hạn 31/10/2026. Dữ liệu của shop vẫn được giữ."
    /// "Gói của shop đã hết hạn" (or "Chưa thu được tiền gói" when the API blocks a payment problem), the plan line, and the
    /// payment line when the store or Lemon Squeezy could not charge
    private func addExpiredHeader(_ status: PlanStatus?, title key: String = "plan.expired.title") {
        let card = Self.card()
        let title = Self.label(key.localized(), size: DS.TextSize.name, color: DS.Color.text, weight: .bold, id: "plan.expired.title")
        var lines: [UIView] = [title]
        if let status, status.isPastDue {
            let name = PlanRenewalLogic.displayPlanName(status.planName, isTrial: status.isTrial)
            if let text = PlanRenewalLogic.text(PlanRenewalLogic.statusLine(status)) {
                lines.append(Self.label("\(name) · \(text)", size: DS.TextSize.body, color: DS.Color.textMuted))
            }
        } else if let status, let end = status.periodEnd {
            let name = PlanRenewalLogic.displayPlanName(status.planName, isTrial: status.isTrial)
            lines.append(Self.label(String(format: "plan.expired.line".localized(), name, PlanRenewalLogic.day(end)),
                                    size: DS.TextSize.body, color: DS.Color.textMuted))
        }
        if status?.billingIssue == true || status?.isPastDue == true {
            lines.append(Self.label("plan.billingIssue".localized(), size: DS.TextSize.secondary, color: DS.Color.text, id: "plan.billingIssue"))
        }
        card.addRows(lines)
        stack.addArrangedSubview(spacer(16))
        stack.addArrangedSubview(card)
    }

    private func addPlanChooser(_ status: PlanStatus) {
        let visible = plans.filter { status.purchasable.contains($0.id) || $0.id == status.planId }
        guard !visible.isEmpty else { return }
        addSectionHeader("plan.section.plan".localized())
        let card = Self.card(padded: false)
        var rows: [UIView] = []
        for plan in visible {
            let enabled = status.purchasable.contains(plan.id)
            let subtitle = enabled
                ? PlanRenewalLogic.includes(limits: plan.limits, features: plan.features, withOutlets: false)
                : status.autoRenew == true
                    ? String(format: "plan.currentAutoRenew".localized(), PlanRenewalLogic.autoRenewDate(status).map(PlanRenewalLogic.day) ?? "—")
                    : String(format: "plan.currentRenewLater".localized(), status.window)
            let row = ChoiceRow(title: plan.name, pill: plan.isPopular ? "plan.popular".localized() : nil, subtitle: subtitle,
                                amount: nil, selected: enabled && plan.id == selectedPlanId, enabled: enabled)
            row.accessibilityIdentifier = "plan.row.\(plan.storeProductIds.map { PlanRenewalLogic.tierRank(storeProducts: $0) == 2 ? "professional" : "basic" } ?? "\(plan.id)")"
            row.onTap = { [weak self] in
                guard let self, self.phase != .confirming else { return }
                self.selectedPlanId = plan.id
                self.render()
            }
            rows.append(row)
        }
        card.addRows(rows, separators: true)
        stack.addArrangedSubview(card)
    }

    private func addPeriodChooser() {
        guard let plan = selectedPlan else { return }
        let semi = product(for: plan, months: 6)
        let annual = product(for: plan, months: 12)
        let options = [(6, semi), (12, annual)].compactMap { months, product in product.map { (months, $0) } }
        guard !options.isEmpty else {
            addMessage("plan.storeUnavailable".localized())
            return
        }
        if !options.contains(where: { $0.0 == selectedMonths }) { selectedMonths = options.last!.0 }
        addSectionHeader("plan.section.period".localized())
        let card = Self.card(padded: false)
        var rows: [UIView] = []
        for (months, product) in options {
            let monthly = PlanRenewalLogic.monthly(total: product.price, months: months, currencyCode: product.currencyCode)
            let monthlyText = String(format: (monthly.approximate ? "plan.perMonthApprox" : "plan.perMonth").localized(), product.format(monthly.amount))
            var subtitle = monthlyText
            if months == 12, let semi, let percent = PlanRenewalLogic.savingsPercent(semiAnnual: semi.price, annual: product.price) {
                subtitle += " · " + String(format: "plan.savings".localized(), percent)
            }
            let row = ChoiceRow(title: PlanRenewalLogic.periodLabel(months: months), pill: nil, subtitle: subtitle,
                                amount: product.priceText, selected: months == selectedMonths, enabled: true)
            row.accessibilityIdentifier = "plan.period.\(months)"
            row.onTap = { [weak self] in
                guard let self, self.phase != .confirming else { return }
                self.selectedMonths = months
                self.render()
            }
            rows.append(row)
        }
        card.addRows(rows, separators: true)
        stack.addArrangedSubview(card)
    }

    private func addBuyButton(_ status: PlanStatus) {
        guard let plan = selectedPlan, let product = product(for: plan, months: selectedMonths) else { return }
        let kind = PlanRenewalLogic.purchaseKind(selectedPlanId: plan.id, selectedRank: plan.tierRank, currentPlanId: status.planId,
                                                 currentRank: max(currentPlan?.tierRank ?? 0, PlanRenewalLogic.tierRank(planTier: status.planTier)),
                                                 isTrial: status.isTrial)
        let title = phase == .confirming
            ? "plan.confirming".localized()
            : PlanRenewalLogic.buttonTitle(kind: kind, planName: plan.name, months: selectedMonths, amount: product.priceText)
        let button = Self.primaryButton(title, id: "plan.buy")
        button.isEnabled = phase == .idle || phase == .slow
        button.alpha = phase == .confirming || phase == .busy ? 0.75 : 1
        if phase == .confirming {
            let wheel = UIActivityIndicatorView(activityIndicatorStyle: .medium)
            wheel.color = .white
            wheel.startAnimating()
            button.addSubview(wheel)
            wheel.snp.makeConstraints { make in
                make.centerY.equalToSuperview()
                make.leading.equalToSuperview().offset(16)
            }
        }
        button.addTarget(self, action: #selector(buyTapped), for: .touchUpInside)
        stack.addArrangedSubview(spacer(16))
        stack.addArrangedSubview(button)
        // A13: the days left continue after the new period; the expired screen starts today
        let disclosureText = PlanRenewalLogic.disclosure(now: Date(), months: selectedMonths, amount: product.priceText,
                                                         status: context == .expired ? nil : status)
        let disclosure = Self.label(disclosureText,
                                    size: DS.TextSize.secondary, color: DS.Color.text, id: "plan.disclosure")
        stack.addArrangedSubview(spacer(10))
        stack.addArrangedSubview(Self.inset(disclosure, by: 4))
        if phase == .confirming {
            // A12: the store's confirmation can take up to a minute
            stack.addArrangedSubview(spacer(8))
            stack.addArrangedSubview(Self.inset(Self.label("plan.confirmingHint".localized(), size: DS.TextSize.secondary, color: DS.Color.textMuted,
                                                           id: "plan.confirmingHint"), by: 4))
        }
        if phase == .slow {
            // #1464: after a purchase Apple kept for the next renewal, a calm line instead of "Chưa nhận được xác nhận."
            stack.addArrangedSubview(spacer(12))
            stack.addArrangedSubview(Self.inset(Self.label(PlanRenewalLogic.slowMessage(storeKeptPlan: storeKeptPlan), size: DS.TextSize.body,
                                                           color: DS.Color.text, weight: storeKeptPlan ? .regular : .bold,
                                                           id: storeKeptPlan ? "plan.storeHasPlan" : "plan.notConfirmed"), by: 4))
            addRetryButton(action: #selector(retryConfirmation))
        }
    }

    /// A6: "Tự gia hạn đang tắt. Gói dùng đến …" and "Bật lại tự gia hạn" (Apple's manage sheet)
    private func addReenable(_ status: PlanStatus) {
        let card = Self.card(padded: false)
        let text = String(format: "plan.reenable.line".localized(), status.periodEnd.map(PlanRenewalLogic.day) ?? "—")
        let line = Self.inset(Self.label(text, size: DS.TextSize.body, color: DS.Color.text, id: "plan.reenable"), by: 16, vertical: 13)
        let button = Self.linkButton("plan.reenable.button".localized(), id: "plan.reenable.button")
        button.contentHorizontalAlignment = .leading
        button.addTarget(self, action: #selector(manageTapped), for: .touchUpInside)
        card.addRows([line, Self.inset(button, by: 16, vertical: 4)], separators: true)
        stack.addArrangedSubview(spacer(16))
        stack.addArrangedSubview(card)
    }

    /// "TỰ GIA HẠN": "Tự gia hạn ngày 02/11/2027 · 1.799.000 ₫". A13: the store's charge date; "Dùng đến" above stays the
    /// period end (later when the shop had days left). #1464: Quản lý / huỷ gói is in the bottom links, once
    private func addAutoRenew(_ status: PlanStatus) {
        addSectionHeader("plan.section.autoRenew".localized())
        let card = Self.card(padded: false)
        let date = PlanRenewalLogic.autoRenewDate(status).map(PlanRenewalLogic.day) ?? "—"
        let amount = autoRenewAmount(status)
        let text = amount.map { String(format: "plan.autoRenewOn".localized(), date, $0) }
            ?? String(format: "plan.autoRenewOnDate".localized(), date)
        let line = Self.inset(Self.label(text, size: DS.TextSize.body, color: DS.Color.text, id: "plan.autoRenew"), by: 16, vertical: 13)
        card.addRows([line], separators: true)
        stack.addArrangedSubview(card)
    }

    private func autoRenewAmount(_ status: PlanStatus) -> String? {
        if let id = PlanRenewalLogic.baseProductId(status.storeProductId), let product = products[id] { return product.priceText }
        guard let amount = status.billingAmount, amount > 0 else { return nil }
        if (status.billingCurrency ?? "VND").uppercased() == "VND" { return PlanRenewalLogic.groupThousands(Int(amount.rounded())) + " ₫" }
        return String(format: "%.2f %@", amount, status.billingCurrency ?? "")
    }

    private func addMessage(_ text: String) {
        stack.addArrangedSubview(spacer(16))
        stack.addArrangedSubview(Self.inset(Self.label(text, size: DS.TextSize.body, color: DS.Color.text, id: "plan.message"), by: 4))
    }

    private func addRetryButton(action: Selector = #selector(retryTapped)) {
        let button = Self.secondaryButton("plan.retry".localized(), id: "plan.retry")
        button.addTarget(self, action: action, for: .touchUpInside)
        stack.addArrangedSubview(spacer(12))
        stack.addArrangedSubview(button)
    }

    /// #1464 at most two small lines: "Quản lý / huỷ gói · Khôi phục" (a plan the App Store bills) or "Khôi phục giao dịch"
    private func addFooterLinks(_ links: PlanRenewalLogic.FooterLinks) {
        addFooterLinks(manage: links == .manageAndRestore, restore: true)
    }

    /// "Quản lý / huỷ gói · Khôi phục" (or one of them), then "Điều khoản · Bảo mật"
    private func addFooterLinks(manage: Bool, restore: Bool) {
        var first: [UIButton] = []
        if manage {
            let button = Self.linkButton("plan.manage".localized(), id: "plan.manage")
            button.addTarget(self, action: #selector(manageTapped), for: .touchUpInside)
            first.append(button)
        }
        if restore {
            let button = Self.linkButton(PlanRenewalLogic.restoreTitle(manage ? .manageAndRestore : .restoreOnly), id: "plan.restore")
            button.addTarget(self, action: #selector(restoreTapped), for: .touchUpInside)
            first.append(button)
        }
        if !first.isEmpty {
            stack.addArrangedSubview(spacer(14))
            stack.addArrangedSubview(Self.linkLine(first))
        }
        let terms = Self.linkButton("plan.terms".localized(), id: "plan.terms", size: DS.TextSize.secondary)
        terms.addTarget(self, action: #selector(termsTapped), for: .touchUpInside)
        let privacy = Self.linkButton("plan.privacy".localized(), id: "plan.privacy", size: DS.TextSize.secondary)
        privacy.addTarget(self, action: #selector(privacyTapped), for: .touchUpInside)
        stack.addArrangedSubview(spacer(first.isEmpty ? 14 : 2))
        stack.addArrangedSubview(Self.linkLine([terms, privacy]))
    }

    private func addLogout() {
        let button = UIButton(type: .system)
        button.setTitle("plan.logout".localized(), for: .normal)
        button.setTitleColor(DS.Color.text, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: DS.TextSize.body)
        button.accessibilityIdentifier = "plan.logout"
        button.addTarget(self, action: #selector(logoutTapped), for: .touchUpInside)
        button.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        stack.addArrangedSubview(spacer(18))
        stack.addArrangedSubview(button)
    }

    private func addSectionHeader(_ text: String) {
        let label = Self.label(text.uppercased(), size: DS.TextSize.pill, color: DS.Color.textMuted, weight: .medium)
        stack.addArrangedSubview(spacer(22))
        stack.addArrangedSubview(Self.inset(label, by: 16))
        stack.addArrangedSubview(spacer(7))
    }

    private func spacer(_ height: CGFloat) -> UIView {
        let view = UIView()
        view.snp.makeConstraints { make in make.height.equalTo(height) }
        return view
    }

    // MARK: - Actions

    @objc private func buyTapped() {
        guard phase == .idle || phase == .slow, let plan = selectedPlan,
              let product = product(for: plan, months: selectedMonths) else { return }
        statusBeforePayment = status
        storeKeptPlan = false
        phase = .busy
        render()
        PurchasesManager.purchase(productId: product.productId) { [weak self] result in
            guard let self else { return }
            switch result {
            case .purchased:
                self.startConfirming()
            case .storeKeptPlan:
                // #1464: same wait (the server may still move); the slow state then names the Apple ID's plan
                self.storeKeptPlan = true
                self.startConfirming()
            case .cancelled:
                self.phase = .idle
                self.render()
            case .failed(let message):
                self.phase = .idle
                self.render()
                UIAlertController.alert(parent: self, title: "plan.title".localized(), message: message)
            }
        }
    }

    @objc private func restoreTapped() {
        guard phase != .confirming else { return }
        statusBeforePayment = status
        storeKeptPlan = false
        phase = .busy
        render()
        PurchasesManager.restore { [weak self] result in
            guard let self else { return }
            switch result {
            case .purchased, .storeKeptPlan:
                // The store has an active AnyRent subscription; the server may already know it, or learn it from the webhook
                SubscriptionAPIService.shared.planStatus { [weak self] fresh, _ in
                    guard let self else { return }
                    guard let fresh, !fresh.isExpired else { return self.startConfirming() }
                    if self.context == .expired { return self.finishConfirmed(fresh) }
                    self.status = fresh
                    self.phase = .idle
                    self.render()
                    PlanBanner.show("plan.restored".localized())
                }
            case .cancelled:
                self.phase = .idle
                self.render()
                UIAlertController.alert(parent: self, title: "plan.restore".localized(), message: "plan.nothingToRestore".localized())
            case .failed(let message):
                self.phase = .idle
                self.render()
                UIAlertController.alert(parent: self, title: "plan.restore".localized(), message: message)
            }
        }
    }

    /// The store took the payment; the server learns it from the RevenueCat webhook: poll for 20 s
    private func startConfirming() {
        phase = .confirming
        render()
        poll(until: Date().addingTimeInterval(PlanConfirmation.timeout))
    }

    private func poll(until deadline: Date) {
        SubscriptionAPIService.shared.planStatus { [weak self] fresh, _ in
            guard let self, self.phase == .confirming else { return }
            if let fresh, PlanRenewalLogic.confirmed(before: self.statusBeforePayment, after: fresh) {
                self.finishConfirmed(fresh)
            } else if Date() < deadline {
                DispatchQueue.main.asyncAfter(deadline: .now() + PlanConfirmation.interval) { self.poll(until: deadline) }
            } else {
                self.phase = .slow
                self.render()
            }
        }
    }

    @objc private func retryConfirmation() {
        startConfirming()
    }

    private func finishConfirmed(_ fresh: PlanStatus) {
        status = fresh
        phase = .idle
        renewedThisVisit = true
        let text = String(format: "plan.renewedUntil".localized(), fresh.periodEnd.map(PlanRenewalLogic.day) ?? "—")
        NotificationCenter.default.post(name: SubscriptionGate.planDidChange, object: nil)
        if context == .expired {
            appDelegate.leaveExpiredPlan(banner: text)
            return
        }
        reload()
        PlanBanner.show(text)
    }

    @objc private func retryTapped() {
        guard !loading else { return }
        if context == .expired {
            SubscriptionAPIService.shared.planStatus { [weak self] fresh, _ in
                guard let self else { return }
                if let fresh, !fresh.isBlocked {
                    appDelegate.leaveExpiredPlan(banner: nil)
                } else {
                    if let fresh { self.status = fresh }
                    self.reload()
                }
            }
            return
        }
        reload()
    }

    @objc private func manageTapped() {
        PurchasesManager.showManageSubscriptions(from: self)
    }

    @objc private func termsTapped() { open(AppLegalLinks.termsURL) }
    @objc private func privacyTapped() { open(AppLegalLinks.privacyURL) }

    private func open(_ link: String) {
        guard let url = URL(string: link) else { return }
        present(SFSafariViewController(url: url), animated: true)
    }

    @objc private func logoutTapped() {
        let alert = UIAlertController(title: "Logout".localized(), message: "Are you sure you want to logout?".localized(), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "plan.logout".localized(), style: .destructive) { _ in
            AuthenticationService.shared.logout { _, _ in appDelegate.logout() }
        })
        present(alert, animated: true)
    }

    // MARK: - Building blocks

    private static func card(padded: Bool = true) -> PlanCard { PlanCard(padded: padded) }

    static func label(_ text: String, size: CGFloat, color: UIColor, weight: UIFont.Weight = .regular, id: String? = nil) -> UILabel {
        let label = UILabel()
        label.text = text
        label.numberOfLines = 0
        label.textColor = color
        switch weight {
        case .bold, .semibold, .heavy: label.font = Utils.boldFont(size: size)
        case .medium: label.font = Utils.mediumFont(size: size)
        default: label.font = Utils.regularFont(size: size)
        }
        label.accessibilityIdentifier = id
        return label
    }

    private static func inset(_ view: UIView, by horizontal: CGFloat, vertical: CGFloat = 0) -> UIView {
        let box = UIView()
        box.addSubview(view)
        view.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(horizontal)
            make.top.bottom.equalToSuperview().inset(vertical)
        }
        return box
    }

    private static func primaryButton(_ title: String, id: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitle(title, for: .disabled)
        button.setTitleColor(.white, for: .normal)
        button.setTitleColor(.white, for: .disabled)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        button.titleLabel?.numberOfLines = 2
        button.titleLabel?.textAlignment = .center
        button.backgroundColor = DS.Color.primary
        button.layer.cornerRadius = DS.Radius.card
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 36, bottom: 12, right: 36)
        button.accessibilityIdentifier = id
        button.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(50) }
        return button
    }

    private static func secondaryButton(_ title: String, id: String) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(DS.Color.primary, for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: DS.TextSize.input)
        button.backgroundColor = .white
        button.layer.cornerRadius = DS.Radius.card
        button.layer.borderWidth = 1
        button.layer.borderColor = DS.Color.border.cgColor
        button.accessibilityIdentifier = id
        button.snp.makeConstraints { make in make.height.equalTo(48) }
        return button
    }

    private static func linkButton(_ title: String, id: String, size: CGFloat = DS.TextSize.body) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.setTitleColor(DS.Color.primary, for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: size)
        button.accessibilityIdentifier = id
        button.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        return button
    }

    /// Links on one centred line, "·" between them
    private static func linkLine(_ buttons: [UIButton]) -> UIView {
        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = 6
        row.alignment = .center
        for (index, button) in buttons.enumerated() {
            if index > 0 { row.addArrangedSubview(label("·", size: DS.TextSize.body, color: DS.Color.textMuted)) }
            row.addArrangedSubview(button)
        }
        let box = UIView()
        box.addSubview(row)
        row.snp.makeConstraints { make in
            make.top.bottom.centerX.equalToSuperview()
            make.leading.greaterThanOrEqualToSuperview()
            make.trailing.lessThanOrEqualToSuperview()
        }
        return box
    }
}

/// Polling of the server after a payment
enum PlanConfirmation {
    static let interval: TimeInterval = 2
    /// A12: the RevenueCat webhook usually lands in seconds; give it about a minute before the slow state
    static let timeout: TimeInterval = 60
}

extension PlanStatus {
    /// The same answer read as expired (the gate opened on a 403 before a status read said so)
    static func expired(from status: PlanStatus) -> PlanStatus {
        var copy = status
        copy.status = "EXPIRED"
        if copy.purchasablePlanIds == nil { copy.purchasablePlanIds = [] }
        return copy
    }
}

// MARK: - Views

/// White grouped card (12 pt corners); rows with an inset separator like a settings list
final class PlanCard: UIView {
    private let column = UIStackView()
    private let padded: Bool

    init(padded: Bool) {
        self.padded = padded
        super.init(frame: .zero)
        backgroundColor = .white
        layer.cornerRadius = DS.Radius.card
        clipsToBounds = true
        column.axis = .vertical
        column.spacing = padded ? 4 : 0
        addSubview(column)
        column.snp.makeConstraints { make in make.edges.equalToSuperview().inset(padded ? UIEdgeInsets(top: 13, left: 16, bottom: 13, right: 16) : .zero) }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func addRows(_ rows: [UIView], separators: Bool = false) {
        for (index, row) in rows.enumerated() {
            if separators && index > 0 {
                let line = UIView()
                line.backgroundColor = DS.Color.border
                let holder = UIView()
                holder.addSubview(line)
                line.snp.makeConstraints { make in
                    make.leading.equalToSuperview().offset(16)
                    make.trailing.top.bottom.equalToSuperview()
                    make.height.equalTo(1 / UIScreen.main.scale)
                }
                column.addArrangedSubview(holder)
            }
            column.addArrangedSubview(row)
        }
    }
}

/// A radio row: dot, title (+ "Phổ biến" pill), grey subtitle, bold amount on the right
final class ChoiceRow: UIControl {
    var onTap: (() -> Void)?

    init(title: String, pill: String?, subtitle: String?, amount: String?, selected: Bool, enabled: Bool) {
        super.init(frame: .zero)
        isAccessibilityElement = true
        accessibilityTraits = UIAccessibilityTraitButton
            | (enabled ? UIAccessibilityTraitNone : UIAccessibilityTraitNotEnabled)
            | (selected ? UIAccessibilityTraitSelected : UIAccessibilityTraitNone)
        accessibilityLabel = [title, pill, subtitle, amount].compactMap { $0 }.joined(separator: ", ")
        isEnabled = enabled

        let dot = RadioDot(selected: selected, enabled: enabled)
        let titleLabel = SubscriptionViewController.label(title, size: DS.TextSize.name, color: enabled ? DS.Color.text : DS.Color.textMuted)
        let titleRow = UIStackView(arrangedSubviews: [titleLabel])
        titleRow.spacing = 6
        titleRow.alignment = .center
        if let pill {
            let tag = PlanPillLabel()
            tag.text = pill
            tag.font = Utils.boldFont(size: DS.TextSize.pill)
            tag.textColor = DS.Color.primary
            tag.backgroundColor = UIColor(hexString: "E8EEFF")
            tag.layer.cornerRadius = 9
            tag.clipsToBounds = true
            titleRow.addArrangedSubview(tag)
        }
        titleRow.addArrangedSubview(UIView())
        let texts = UIStackView(arrangedSubviews: [titleRow])
        texts.axis = .vertical
        texts.spacing = 2
        if let subtitle {
            texts.addArrangedSubview(SubscriptionViewController.label(subtitle, size: DS.TextSize.secondary, color: DS.Color.textMuted))
        }
        let row = UIStackView(arrangedSubviews: [dot, texts])
        row.spacing = 12
        row.alignment = .center
        if let amount {
            let amountLabel = SubscriptionViewController.label(amount, size: DS.TextSize.name, color: DS.Color.text, weight: .bold)
            amountLabel.numberOfLines = 1
            amountLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
            amountLabel.setContentHuggingPriority(.required, for: .horizontal)
            row.addArrangedSubview(amountLabel)
        }
        row.isUserInteractionEnabled = false
        addSubview(row)
        row.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 11, left: 16, bottom: 11, right: 16)) }
        snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        addTarget(self, action: #selector(tapped), for: .touchUpInside)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    @objc private func tapped() { onTap?() }
}

private final class RadioDot: UIView {
    init(selected: Bool, enabled: Bool) {
        super.init(frame: .zero)
        layer.cornerRadius = 11
        layer.borderWidth = selected ? 2 : 1.5
        layer.borderColor = (selected ? DS.Color.primary : UIColor(hexString: enabled ? "C7C7CC" : "E5E7EB")).cgColor
        snp.makeConstraints { make in make.width.height.equalTo(22) }
        if selected {
            let inner = UIView()
            inner.backgroundColor = DS.Color.primary
            inner.layer.cornerRadius = 7
            addSubview(inner)
            inner.snp.makeConstraints { make in
                make.center.equalToSuperview()
                make.width.height.equalTo(14)
            }
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

private final class PlanPillLabel: UILabel {
    override func drawText(in rect: CGRect) {
        super.drawText(in: UIEdgeInsetsInsetRect(rect, UIEdgeInsets(top: 1, left: 8, bottom: 1, right: 8)))
    }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + 16, height: size.height + 2)
    }
}

/// The short line after a payment ("Đã gia hạn đến 02/11/2027."): a white banner at the top that goes away by itself
enum PlanBanner {
    static func show(_ text: String, in window: UIWindow? = appDelegate.window) {
        guard let window else { return }
        window.subviews.filter { $0.accessibilityIdentifier == "plan.banner" }.forEach { $0.removeFromSuperview() }
        let banner = UIView()
        banner.backgroundColor = .white
        banner.layer.cornerRadius = 14
        banner.layer.shadowColor = UIColor.black.cgColor
        banner.layer.shadowOpacity = 0.16
        banner.layer.shadowRadius = 12
        banner.layer.shadowOffset = CGSize(width: 0, height: 6)
        banner.accessibilityIdentifier = "plan.banner"
        let label = SubscriptionViewController.label(text, size: DS.TextSize.body, color: DS.Color.text, weight: .bold, id: "plan.banner.text")
        banner.addSubview(label)
        label.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)) }
        window.addSubview(banner)
        banner.snp.makeConstraints { make in
            make.top.equalTo(window.safeAreaLayoutGuide).offset(6)
            make.leading.trailing.equalToSuperview().inset(12)
        }
        banner.alpha = 0
        banner.transform = CGAffineTransform(translationX: 0, y: -12)
        UIView.animate(withDuration: 0.25, animations: {
            banner.alpha = 1
            banner.transform = .identity
        }, completion: { _ in
            UIView.animate(withDuration: 0.25, delay: 4, options: [], animations: { banner.alpha = 0 }, completion: { _ in
                banner.removeFromSuperview()
            })
        })
    }
}
