//
//  BookingRequestDetailViewController.swift
//  POS ADBD
//
//  #1124 one online booking request (mockup screen 6): customer (tap to call), returning-customer hint, branch, days,
//  items with what is free, note. "Xác nhận" opens a new cart filled from the request (the order is created there,
//  carrying `bookingRequestId`); "Từ chối" asks a reason.
//

import UIKit
import SnapKit

final class BookingRequestDetailViewController: BaseViewControler {
    private let requestId: Int
    private var request: BookingRequest?
    private let scroll = UIScrollView()
    private let content = UIStackView()
    private let actions = UIStackView()
    private let rejectButton = V2.secondaryButton("booking.action.reject".localized())
    private let confirmButton = V2.primaryButton("booking.action.confirm".localized())

    init(requestId: Int) {
        self.requestId = requestId
        super.init(nibName: nil, bundle: nil)
        hidesBottomBarWhenPushed = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "booking.detail.title".localized()
        view.backgroundColor = DS.Color.surface
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(false, animated: animated)
        load()
    }

    override func setupUI() {
        content.axis = .vertical
        content.spacing = 0
        scroll.addSubview(content)
        view.addSubview(scroll)
        actions.axis = .horizontal
        actions.spacing = DS.Spacing.md
        actions.distribution = .fillEqually
        actions.addArrangedSubview(rejectButton)
        actions.addArrangedSubview(confirmButton)
        actions.isHidden = true
        view.addSubview(actions)
        rejectButton.accessibilityIdentifier = "booking.reject"
        confirmButton.accessibilityIdentifier = "booking.confirm"
        rejectButton.addTarget(self, action: #selector(rejectTapped), for: .touchUpInside)
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)

        actions.snp.makeConstraints { make in
            make.leading.trailing.equalTo(view.readableColumn()).inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-DS.Spacing.md)
        }
        scroll.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalTo(view.readableColumn())
            make.bottom.equalTo(actions.snp.top).offset(-DS.Spacing.sm)
        }
        content.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
    }

    private func load() {
        TabsV2APIService.shared.bookingRequest(id: requestId) { [weak self] request, error in
            guard let self else { return }
            if let error, self.request == nil {
                UIAlertController.errorAlert(parent: self, error: error)
                return
            }
            guard let request else { return }
            self.request = request
            self.render(request)
        }
    }

    // MARK: - Content

    private func render(_ request: BookingRequest) {
        content.arrangedSubviews.forEach { $0.removeFromSuperview() }

        let head = UIStackView()
        head.axis = .vertical
        head.spacing = 6
        let titleRow = UIStackView(arrangedSubviews: [
            V2.label(request.code, size: DS.TextSize.name, weight: .bold), UIView(),
            BookingStatusStyle.pillLabel(request.bookingStatus),
        ])
        titleRow.alignment = .center
        head.addArrangedSubview(titleRow)
        if request.bookingStatus == .pending, let expires = request.expiresAtDate {
            head.addArrangedSubview(V2.label(String(format: "booking.hoursLeft".localized(),
                                                    BookingLogic.hoursLeft(expiresAt: expires)),
                                             size: DS.TextSize.secondary, color: DS.Color.textMuted))
        }
        if request.bookingStatus == .rejected, let reason = request.rejectReason.flatMap(BookingRejectReason.init) {
            let text = [reason.titleKey.localized(), request.rejectNote].compactMap { $0 }.filter { !$0.isEmpty }
            head.addArrangedSubview(V2.label(text.joined(separator: ": "), size: DS.TextSize.secondary,
                                             color: DS.Color.textMuted, lines: 0))
        }
        content.addArrangedSubview(padded(head))

        content.addArrangedSubview(V2.sectionHeader("booking.section.customer".localized()))
        content.addArrangedSubview(padded(customerBlock(request)))

        content.addArrangedSubview(V2.sectionHeader("booking.section.rental".localized()))
        let rental = UIStackView(arrangedSubviews: [
            keyValue("booking.outlet".localized(), request.outlet.name ?? "—"),
            keyValue("booking.dates".localized(), BookingLogic.dateRange(pickup: request.pickupDate, return: request.returnDate)),
        ])
        rental.axis = .vertical
        rental.spacing = 8
        content.addArrangedSubview(padded(rental))

        content.addArrangedSubview(V2.sectionHeader(String(format: "booking.items".localized(), request.itemCount)))
        let items = UIStackView()
        items.axis = .vertical
        items.spacing = 10
        if BookingLogic.hasShortItem(request.items), request.bookingStatus == .pending {
            let warning = InsetLabel()
            warning.insets = UIEdgeInsets(top: 8, left: 10, bottom: 8, right: 10)
            warning.numberOfLines = 0
            warning.text = "booking.shortWarning".localized()
            warning.font = Utils.regularFont(size: DS.TextSize.secondary)
            warning.textColor = DS.Status.late.text
            warning.backgroundColor = DS.Status.late.fill
            warning.layer.cornerRadius = 8
            warning.clipsToBounds = true
            items.addArrangedSubview(warning)
        }
        request.items.forEach { items.addArrangedSubview(itemRow($0, pending: request.bookingStatus == .pending)) }
        content.addArrangedSubview(padded(items))

        if let note = request.note, !note.isEmpty {
            content.addArrangedSubview(V2.sectionHeader("booking.section.note".localized()))
            content.addArrangedSubview(padded(V2.label(note, size: DS.TextSize.body, lines: 0)))
        }

        let user = User.current()
        actions.isHidden = !(request.bookingStatus == .pending && BookingLogic.canManage(permissions: user?.permissions ?? []))
    }

    private func customerBlock(_ request: BookingRequest) -> UIView {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 8
        stack.addArrangedSubview(V2.label(request.customerName, size: DS.TextSize.body, weight: .medium))
        let phone = UIButton(type: .system)
        phone.setTitle("📞 " + request.customerPhone, for: .normal)
        phone.titleLabel?.font = Utils.mediumFont(size: DS.TextSize.body)
        phone.contentHorizontalAlignment = .leading
        phone.addTarget(self, action: #selector(callTapped), for: .touchUpInside)
        phone.accessibilityIdentifier = "booking.call"
        stack.addArrangedSubview(phone)
        if let known = request.customer {
            let name = known.fullName.isEmpty ? request.customerName : known.fullName
            stack.addArrangedSubview(V2.label(String(format: "booking.returningCustomer".localized(), name),
                                              size: DS.TextSize.secondary, color: DS.Status.done.text, lines: 0))
        } else {
            stack.addArrangedSubview(V2.label("booking.newCustomer".localized(), size: DS.TextSize.secondary,
                                              color: DS.Color.textMuted, lines: 0))
        }
        return stack
    }

    private func itemRow(_ item: BookingRequestItem, pending: Bool) -> UIView {
        let name = V2.label("\(item.productName ?? "#\(item.productId)") × \(item.quantity)", size: DS.TextSize.body, lines: 0)
        let column = UIStackView(arrangedSubviews: [name])
        column.axis = .vertical
        column.spacing = 2
        if pending {
            if let short = item.shortDay {
                column.addArrangedSubview(V2.label(String(format: "booking.item.short".localized(), BookingLogic.dayMonth(short)),
                                                   size: DS.TextSize.secondary, color: DS.Status.late.text))
            } else {
                column.addArrangedSubview(V2.label("booking.item.free".localized(), size: DS.TextSize.secondary,
                                                   color: DS.Status.done.text))
            }
        }
        return column
    }

    private func keyValue(_ key: String, _ value: String) -> UIView {
        let keyLabel = V2.label(key, size: DS.TextSize.body, color: DS.Color.textMuted)
        let valueLabel = V2.label(value, size: DS.TextSize.body, weight: .medium, lines: 0)
        valueLabel.textAlignment = .right
        let row = UIStackView(arrangedSubviews: [keyLabel, valueLabel])
        row.spacing = DS.Spacing.md
        keyLabel.setContentHuggingPriority(.required, for: .horizontal)
        return row
    }

    private func padded(_ inner: UIView) -> UIView {
        let wrap = UIView()
        wrap.addSubview(inner)
        inner.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg))
        }
        return wrap
    }

    // MARK: - Actions

    @objc private func callTapped() {
        let digits = (request?.customerPhone ?? "").filter { $0.isNumber || $0 == "+" }
        guard !digits.isEmpty, let url = URL(string: "tel://\(digits)") else { return }
        UIApplication.shared.open(url)
    }

    /// prepare → the products' prices → a new cart beside any draft → the cart screen
    @objc private func confirmTapped() {
        showProgressText(text: nil)
        TabsV2APIService.shared.prepareBookingRequest(id: requestId) { [weak self] prepare, error in
            guard let self else { return }
            guard let prepare else {
                self.hideProgress()
                if let error { UIAlertController.errorAlert(parent: self, error: error) }
                self.load()
                return
            }
            var products: [Int: Product] = [:]
            let group = DispatchGroup()
            for id in Set(prepare.items.map(\.productId)) {
                group.enter()
                ProductService.shared.loadProduct(productId: id) { product, _ in
                    if let product { products[id] = product }
                    group.leave()
                }
            }
            group.notify(queue: .main) { [weak self] in
                guard let self else { return }
                self.hideProgress()
                let cart = BookingCartBuilder.cart(from: prepare, products: products)
                guard CartStore.shared.startBookingCart(cart) else {
                    let alert = UIAlertController(title: nil, message: "cart.multi.limit".localized(), preferredStyle: .alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .default))
                    self.present(alert, animated: true)
                    return
                }
                let cartScreen = CartV2ViewController()
                cartScreen.hidesBottomBarWhenPushed = true
                self.navigationController?.pushViewController(cartScreen, animated: true)
            }
        }
    }

    @objc private func rejectTapped() {
        let sheet = UIAlertController(title: "booking.reject.title".localized(), message: nil, preferredStyle: .actionSheet)
        for reason in BookingRejectReason.allCases {
            sheet.addAction(UIAlertAction(title: reason.titleKey.localized(), style: .default) { [weak self] _ in
                if reason == .other {
                    self?.askOtherReason()
                } else {
                    self?.reject(reason, note: nil)
                }
            })
        }
        sheet.addAction(UIAlertAction(title: "booking.cancel".localized(), style: .cancel))
        sheet.popoverPresentationController?.sourceView = rejectButton
        sheet.popoverPresentationController?.sourceRect = rejectButton.bounds
        present(sheet, animated: true)
    }

    /// "Khác" needs a few words the customer will read
    private func askOtherReason() {
        let alert = UIAlertController(title: "booking.reject.other".localized(), message: nil, preferredStyle: .alert)
        alert.addTextField { field in
            field.placeholder = "booking.reject.otherPlaceholder".localized()
            field.accessibilityIdentifier = "booking.reject.note"
        }
        let send = UIAlertAction(title: "booking.action.reject".localized(), style: .destructive) { [weak self, weak alert] _ in
            let note = alert?.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            self?.reject(.other, note: note)
        }
        send.isEnabled = false
        alert.addAction(UIAlertAction(title: "booking.cancel".localized(), style: .cancel))
        alert.addAction(send)
        NotificationCenter.default.addObserver(forName: .UITextFieldTextDidChange,
                                               object: alert.textFields?.first, queue: .main) { [weak alert] _ in
            let text = alert?.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            send.isEnabled = !text.isEmpty
        }
        present(alert, animated: true)
    }

    private func reject(_ reason: BookingRejectReason, note: String?) {
        showProgressText(text: nil)
        TabsV2APIService.shared.rejectBookingRequest(id: requestId, reason: reason, note: note) { [weak self] ok, error in
            guard let self else { return }
            self.hideProgress()
            if !ok, let error { UIAlertController.errorAlert(parent: self, error: error) }
            OrdersChangeSignal.post()
            self.load()
        }
    }
}
