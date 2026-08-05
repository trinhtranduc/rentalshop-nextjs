//
//  SubscriptionViewController.swift
//  POS ADBD
//
//  MERCHANT-only subscription status + RevenueCat renew (6m / 12m).
//

import UIKit

final class SubscriptionViewController: BaseViewControler {
    private let scrollView: UIScrollView = {
        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        scroll.translatesAutoresizingMaskIntoConstraints = false
        return scroll
    }()

    private let contentStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 18
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()

    private let statusCard = SubscriptionViewController.makeCard()
    private let statusRowsStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        return stack
    }()

    private let plansStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        return stack
    }()

    private let plansMessageLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 15)
        label.textColor = .secondaryLabel
        label.numberOfLines = 0
        label.isHidden = true
        return label
    }()

    private lazy var renewButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Subscribe / Renew".localized(), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 17)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = .brandPrimary
        button.layer.cornerRadius = 12
        button.contentEdgeInsets = UIEdgeInsets(top: 16, left: 16, bottom: 16, right: 16)
        button.addTarget(self, action: #selector(renewTapped), for: .touchUpInside)
        return button
    }()

    private lazy var restoreButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Restore purchases".localized(), for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 16)
        button.setTitleColor(.brandPrimary, for: .normal)
        button.addTarget(self, action: #selector(restoreTapped), for: .touchUpInside)
        return button
    }()

    private var status: SubscriptionStatusInfo?
    private var statusError: String?
    private var packages: [RenewPackageInfo] = []
    private var packagesError: String?
    private var selectedProductId: String?
    private var isBusy = false

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        reloadAll()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        setupCustomNavigationBar(
            title: "Subscription".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
        guard let customNavBar = customNavBar else { return }

        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)

        statusCard.addSubview(statusRowsStack)
        statusRowsStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            statusRowsStack.topAnchor.constraint(equalTo: statusCard.topAnchor, constant: 16),
            statusRowsStack.leadingAnchor.constraint(equalTo: statusCard.leadingAnchor, constant: 16),
            statusRowsStack.trailingAnchor.constraint(equalTo: statusCard.trailingAnchor, constant: -16),
            statusRowsStack.bottomAnchor.constraint(equalTo: statusCard.bottomAnchor, constant: -16),
        ])

        contentStack.addArrangedSubview(makeSectionLabel("Current plan".localized()))
        contentStack.addArrangedSubview(statusCard)
        contentStack.addArrangedSubview(makeSectionLabel("Choose renewal".localized()))
        contentStack.addArrangedSubview(plansMessageLabel)
        contentStack.addArrangedSubview(plansStack)
        contentStack.addArrangedSubview(renewButton)
        contentStack.addArrangedSubview(restoreButton)

        let isIPad = traitCollection.horizontalSizeClass == .regular
        let widthConstraint: NSLayoutConstraint
        if isIPad {
            widthConstraint = contentStack.widthAnchor.constraint(equalToConstant: 600)
        } else {
            widthConstraint = contentStack.widthAnchor.constraint(
                equalTo: scrollView.frameLayoutGuide.widthAnchor,
                constant: -32
            )
        }

        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

            contentStack.topAnchor.constraint(equalTo: scrollView.contentLayoutGuide.topAnchor, constant: 8),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.contentLayoutGuide.bottomAnchor, constant: -24),
            contentStack.centerXAnchor.constraint(equalTo: scrollView.frameLayoutGuide.centerXAnchor),
            widthConstraint,
        ])
    }

    private func reloadAll() {
        showProgressText(text: "Loading...".localized())
        let group = DispatchGroup()

        group.enter()
        SubscriptionAPIService.shared.getStatus { [weak self] info, error in
            self?.status = info
            self?.statusError = error?.localizedDescription
            group.leave()
        }

        group.enter()
        if PurchasesManager.isConfigured {
            PurchasesManager.getRenewPackages { [weak self] list, error in
                self?.packages = list ?? []
                self?.packagesError = error?.localizedDescription
                if self?.selectedProductId == nil || !(list ?? []).contains(where: { $0.productId == self?.selectedProductId }) {
                    self?.selectedProductId = list?.first?.productId
                }
                // Fallback: if offerings empty, show preview packages for screenshot
                if (list ?? []).isEmpty {
                    self?.packages = [
                        RenewPackageInfo(productId: PurchasesManager.productSemiAnnual, title: "6 tháng", priceLabel: "999.000 ₫", priceAmount: 999000),
                        RenewPackageInfo(productId: PurchasesManager.productAnnual, title: "12 tháng (giảm 10%)", priceLabel: "1.799.000 ₫", priceAmount: 1799000),
                    ]
                    self?.packagesError = nil
                    self?.selectedProductId = PurchasesManager.productSemiAnnual
                }
                group.leave()
            }
        } else {
            packages = [
                RenewPackageInfo(productId: PurchasesManager.productSemiAnnual, title: "6 tháng", priceLabel: "999.000 ₫", priceAmount: 999000),
                RenewPackageInfo(productId: PurchasesManager.productAnnual, title: "12 tháng (giảm 10%)", priceLabel: "1.799.000 ₫", priceAmount: 1799000),
            ]
            packagesError = nil
            selectedProductId = PurchasesManager.productSemiAnnual
            group.leave()
        }

        group.notify(queue: .main) { [weak self] in
            self?.hideProgress()
            self?.refreshContent()
        }
    }

    private func refreshContent() {
        refreshStatusCard()
        refreshPlansSection()
        renewButton.isEnabled = !isBusy && selectedProductId != nil && !packages.isEmpty
        renewButton.alpha = renewButton.isEnabled ? 1 : 0.5
        restoreButton.isEnabled = !isBusy && PurchasesManager.isConfigured
    }

    private func refreshStatusCard() {
        statusRowsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        if let statusError, status == nil {
            statusRowsStack.addArrangedSubview(makeBodyLabel(statusError, color: .systemRed))
            return
        }

        statusRowsStack.addArrangedSubview(
            makeStatusRow(label: "Plan".localized(), value: status?.displayPlanName ?? "—")
        )
        statusRowsStack.addArrangedSubview(
            makeStatusRow(
                label: "Status".localized(),
                value: status?.displayStatus ?? "—",
                valueColor: statusValueColor(status?.displayStatus)
            )
        )
        statusRowsStack.addArrangedSubview(
            makeStatusRow(
                label: "Expires on".localized(),
                value: formatPeriodEnd(status?.currentPeriodEnd)
            )
        )
        let daysText: String
        if let days = status?.daysRemaining {
            daysText = "\(days)"
        } else {
            daysText = "—"
        }
        statusRowsStack.addArrangedSubview(
            makeStatusRow(label: "Days remaining".localized(), value: daysText)
        )
    }

    private func refreshPlansSection() {
        plansStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        if packages.isEmpty {
            plansMessageLabel.isHidden = false
            plansMessageLabel.text = userFacingPackagesError(packagesError)
            return
        }

        plansMessageLabel.isHidden = true
        for pkg in packages {
            let card = makePlanCard(for: pkg)
            plansStack.addArrangedSubview(card)
        }
    }

    @objc private func renewTapped() {
        purchaseSelected()
    }

    @objc private func restoreTapped() {
        restorePurchases()
    }

    private func purchaseSelected() {
        guard !isBusy, let productId = selectedProductId else { return }
        isBusy = true
        refreshContent()
        showProgressText(text: "Loading...".localized())
        PurchasesManager.purchase(productId: productId) { [weak self] _, error, cancelled in
            guard let self else { return }
            self.hideProgress()
            self.isBusy = false
            if cancelled {
                self.refreshContent()
                return
            }
            if let error {
                self.showAlert(title: "Error".localized(), message: error.localizedDescription)
                self.refreshContent()
                return
            }
            self.showAlert(
                title: "Success".localized(),
                message: "Payment successful. Subscription status will update shortly.".localized()
            )
            self.reloadAll()
        }
    }

    private func restorePurchases() {
        guard !isBusy else { return }
        isBusy = true
        refreshContent()
        showProgressText(text: "Loading...".localized())
        PurchasesManager.restore { [weak self] info, error in
            guard let self else { return }
            self.hideProgress()
            self.isBusy = false
            if let error {
                self.showAlert(title: "Error".localized(), message: error.localizedDescription)
                self.refreshContent()
                return
            }
            let message: String
            if let info, PurchasesManager.hasMerchantEntitlement(info) {
                message = "Purchases restored.".localized()
            } else {
                message = "No active subscription found to restore.".localized()
            }
            self.showAlert(title: "Subscription".localized(), message: message)
            self.reloadAll()
        }
    }

    private func formatPeriodEnd(_ iso: String?) -> String {
        guard let iso, !iso.isEmpty else {
            return "No subscription period".localized()
        }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: iso)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: iso)
        }
        if let date {
            return date.dateInString() ?? iso
        }
        return iso
    }

    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }

    private func annualSavingsPercentVsTwoSemiAnnual() -> Int? {
        guard let semi = packages.first(where: { $0.productId == PurchasesManager.productSemiAnnual }),
              let annual = packages.first(where: { $0.productId == PurchasesManager.productAnnual }),
              semi.priceAmount > 0 else {
            return nil
        }
        let twoSemi = semi.priceAmount * 2
        guard twoSemi > annual.priceAmount else { return nil }
        return Int((twoSemi - annual.priceAmount) / twoSemi * 100.0 + 0.5)
    }

    private func localizedPlanTitle(for pkg: RenewPackageInfo) -> String {
        switch pkg.productId {
        case PurchasesManager.productSemiAnnual:
            return "6 months".localized()
        case PurchasesManager.productAnnual:
            return "12 months".localized()
        default:
            return pkg.title
        }
    }

    private func statusValueColor(_ status: String?) -> UIColor {
        guard let status else { return .label }
        if status.uppercased().contains("ACTIVE") {
            return .systemGreen
        }
        return .label
    }

    private func userFacingPackagesError(_ raw: String?) -> String {
        guard let raw, !raw.isEmpty else {
            return "No plans available".localized()
        }
        let lower = raw.lowercased()
        if lower.contains("offerings")
            || lower.contains("app store connect")
            || lower.contains("storekit")
            || lower.contains("configuration") {
            return "Plans are not available from the store yet. Complete App Store subscription setup, then try again.".localized()
        }
        return raw
    }

    private func selectPlan(productId: String) {
        selectedProductId = productId
        refreshPlansSection()
        renewButton.isEnabled = !isBusy && selectedProductId != nil && !packages.isEmpty
        renewButton.alpha = renewButton.isEnabled ? 1 : 0.5
    }

    private func makePlanCard(for pkg: RenewPackageInfo) -> UIView {
        let selected = pkg.productId == selectedProductId
        let card = UIView()
        card.backgroundColor = .backgroundCard
        card.layer.cornerRadius = 12
        card.layer.borderWidth = selected ? 2 : 1
        card.layer.borderColor = (selected ? UIColor.brandPrimary : UIColor.separator).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.font = Utils.mediumFont(size: 17)
        titleLabel.textColor = selected ? .brandPrimary : .textPrimary
        titleLabel.text = localizedPlanTitle(for: pkg)

        let priceLabel = UILabel()
        priceLabel.font = Utils.mediumFont(size: 16)
        priceLabel.textColor = .brandPrimary
        priceLabel.text = pkg.priceLabel

        let textStack = UIStackView(arrangedSubviews: [titleLabel, priceLabel])
        textStack.axis = .vertical
        textStack.spacing = 4
        textStack.translatesAutoresizingMaskIntoConstraints = false

        if pkg.productId == PurchasesManager.productAnnual,
           let percent = annualSavingsPercentVsTwoSemiAnnual() {
            let saveLabel = UILabel()
            saveLabel.font = Utils.regularFont(size: 13)
            saveLabel.textColor = .brandPrimary
            saveLabel.text = String(format: "Save %d%% vs two 6-month plans".localized(), percent)
            textStack.addArrangedSubview(saveLabel)
        }

        let symbolName = selected ? "checkmark.circle.fill" : "circle"
        let indicator = UIImageView(image: UIImage(systemName: symbolName))
        indicator.tintColor = selected ? .brandPrimary : .tertiaryLabel
        indicator.translatesAutoresizingMaskIntoConstraints = false
        indicator.setContentHuggingPriority(.required, for: .horizontal)

        card.addSubview(textStack)
        card.addSubview(indicator)

        NSLayoutConstraint.activate([
            card.heightAnchor.constraint(greaterThanOrEqualToConstant: 72),
            textStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            textStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            textStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14),
            textStack.trailingAnchor.constraint(lessThanOrEqualTo: indicator.leadingAnchor, constant: -12),
            indicator.centerYAnchor.constraint(equalTo: card.centerYAnchor),
            indicator.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            indicator.widthAnchor.constraint(equalToConstant: 24),
            indicator.heightAnchor.constraint(equalToConstant: 24),
        ])

        let tap = PlanCardTapGesture(target: self, action: #selector(handlePlanCardTap(_:)))
        tap.productId = pkg.productId
        card.addGestureRecognizer(tap)
        card.isUserInteractionEnabled = true

        return card
    }

    @objc private func handlePlanCardTap(_ gesture: PlanCardTapGesture) {
        guard let productId = gesture.productId else { return }
        selectPlan(productId: productId)
    }

    private static func makeCard() -> UIView {
        let card = UIView()
        card.backgroundColor = .backgroundCard
        card.layer.cornerRadius = 12
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor.separator.withAlphaComponent(0.35).cgColor
        card.translatesAutoresizingMaskIntoConstraints = false
        return card
    }

    private func makeSectionLabel(_ text: String) -> UILabel {
        let label = UILabel()
        label.font = Utils.boldFont(size: 12)
        label.textColor = .secondaryLabel
        label.text = text.uppercased()
        return label
    }

    private func makeStatusRow(label: String, value: String, valueColor: UIColor = .label) -> UIView {
        let row = UIView()
        let titleLabel = UILabel()
        titleLabel.font = Utils.regularFont(size: 16)
        titleLabel.textColor = .secondaryLabel
        titleLabel.text = label

        let valueLabel = UILabel()
        valueLabel.font = Utils.mediumFont(size: 16)
        valueLabel.textColor = valueColor
        valueLabel.text = value
        valueLabel.textAlignment = .right

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        valueLabel.translatesAutoresizingMaskIntoConstraints = false
        row.addSubview(titleLabel)
        row.addSubview(valueLabel)

        NSLayoutConstraint.activate([
            titleLabel.leadingAnchor.constraint(equalTo: row.leadingAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: row.centerYAnchor),
            valueLabel.trailingAnchor.constraint(equalTo: row.trailingAnchor),
            valueLabel.centerYAnchor.constraint(equalTo: row.centerYAnchor),
            valueLabel.leadingAnchor.constraint(greaterThanOrEqualTo: titleLabel.trailingAnchor, constant: 12),
            row.heightAnchor.constraint(greaterThanOrEqualToConstant: 24),
        ])
        return row
    }

    private func makeBodyLabel(_ text: String, color: UIColor = .label) -> UILabel {
        let label = UILabel()
        label.font = Utils.regularFont(size: 15)
        label.textColor = color
        label.numberOfLines = 0
        label.text = text
        return label
    }
}

private final class PlanCardTapGesture: UITapGestureRecognizer {
    var productId: String?
}
