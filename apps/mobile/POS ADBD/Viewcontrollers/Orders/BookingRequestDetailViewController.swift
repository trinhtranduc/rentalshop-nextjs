//
//  BookingRequestDetailViewController.swift
//  POS ADBD
//
//  #1124 one online booking request (mockup screen 6): customer (tap to call), returning-customer hint, branch, days,
//  items with what is free, note. "Xác nhận" opens a new cart filled from the request (the order is created there,
//  carrying `bookingRequestId`); "Từ chối" opens a sheet that asks a reason (#1137).
//

import UIKit
import SnapKit
import IQKeyboardManagerSwift

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
        navigationItem.titleView = BookingNavTitle.label(title)
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

    /// #1137: a bottom sheet with a title, a line saying the customer sees the reason, the reasons, a note and send
    @objc private func rejectTapped() {
        let sheet = BookingRejectSheetViewController()
        sheet.onSend = { [weak self, weak sheet] reason, note in
            sheet?.dismiss(animated: true) { self?.reject(reason, note: note) }
        }
        if let presentation = sheet.sheetPresentationController {
            presentation.detents = [.medium(), .large()]
            presentation.prefersGrabberVisible = true
            presentation.preferredCornerRadius = 24
        }
        present(sheet, animated: true)
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

/// #1137 "Từ chối đơn online": title, a description, one row per reason (tap picks it), a note for the customer
/// (needed for "Khác"), then "Từ chối". Same reasons and API call as before.
final class BookingRejectSheetViewController: UIViewController, UITextFieldDelegate {
    var onSend: ((BookingRejectReason, String?) -> Void)?

    private var selected: BookingRejectReason?
    private var rows: [(BookingRejectReason, UIButton)] = []
    private let noteField = UITextField()
    private let send = V2.primaryButton("booking.action.reject".localized())
    private let scroll = UIScrollView()
    private var keyboardManagerWasEnabled = true

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let title = V2.label("booking.reject.sheetTitle".localized(), size: 20, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        title.accessibilityIdentifier = "booking.reject.sheet"
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", 16, weight: .bold), for: .normal)
        close.tintColor = DS.Color.textMuted
        close.backgroundColor = DS.Color.divider
        close.layer.cornerRadius = 18
        close.accessibilityLabel = "booking.cancel".localized()
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        close.snp.makeConstraints { make in make.size.equalTo(36) }
        let header = UIStackView(arrangedSubviews: [title, close])
        header.alignment = .center
        header.spacing = DS.Spacing.md

        let description = V2.label("booking.reject.sheetDescription".localized(), size: DS.TextSize.secondary,
                                   color: DS.Color.textMuted, lines: 0)

        let options = UIStackView()
        options.axis = .vertical
        options.layer.cornerRadius = DS.Radius.card
        options.layer.borderWidth = 1
        options.layer.borderColor = DS.Color.border.cgColor
        options.clipsToBounds = true
        for (index, reason) in BookingRejectReason.allCases.enumerated() {
            if index > 0 { options.addArrangedSubview(V2.divider()) }
            let row = reasonRow(reason)
            rows.append((reason, row))
            options.addArrangedSubview(row)
        }

        noteField.font = Utils.regularFont(size: DS.TextSize.input)
        noteField.textColor = DS.Color.text
        noteField.placeholder = "booking.reject.notePlaceholder".localized()
        noteField.accessibilityIdentifier = "booking.reject.note"
        noteField.layer.cornerRadius = DS.Radius.card
        noteField.layer.borderWidth = 1
        noteField.layer.borderColor = DS.Color.border.cgColor
        noteField.leftView = UIView(frame: CGRect(x: 0, y: 0, width: 14, height: 48))
        noteField.leftViewMode = .always
        noteField.returnKeyType = .done
        noteField.delegate = self
        noteField.addTarget(self, action: #selector(noteChanged), for: .editingChanged)
        noteField.snp.makeConstraints { make in make.height.equalTo(48) }

        send.backgroundColor = UIColor(hexString: "DC2626")
        send.accessibilityIdentifier = "booking.reject.send"
        send.addTarget(self, action: #selector(sendTapped), for: .touchUpInside)

        let content = UIStackView(arrangedSubviews: [header, description, options, noteField, send])
        content.axis = .vertical
        content.spacing = DS.Spacing.md
        content.setCustomSpacing(DS.Spacing.lg, after: description)
        content.setCustomSpacing(DS.Spacing.lg, after: noteField)

        scroll.keyboardDismissMode = .interactive
        scroll.alwaysBounceVertical = true
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in make.edges.equalTo(view.safeAreaLayoutGuide) }
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.xl)
            make.leading.trailing.equalTo(view).inset(20)
            make.bottom.equalToSuperview().offset(-20)
        }
        render()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // #532: IQKeyboardManager scrolls a sheet's title away; the sheet lifts itself above the keyboard
        keyboardManagerWasEnabled = IQKeyboardManager.shared.enable
        IQKeyboardManager.shared.enable = false
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        IQKeyboardManager.shared.enable = keyboardManagerWasEnabled
    }

    private func reasonRow(_ reason: BookingRejectReason) -> UIButton {
        let row = UIButton(type: .system)
        row.contentHorizontalAlignment = .leading
        row.setTitle(reason.titleKey.localized(), for: .normal)
        row.setTitleColor(DS.Color.text, for: .normal)
        row.titleLabel?.font = Utils.regularFont(size: DS.TextSize.body)
        row.contentEdgeInsets = UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 0, right: 44)
        row.accessibilityIdentifier = "booking.reject.\(reason.rawValue)"
        row.addTarget(self, action: #selector(reasonTapped(_:)), for: .touchUpInside)
        row.snp.makeConstraints { make in make.height.equalTo(52) }
        let check = UIImageView(image: DS.symbol("checkmark", 16, weight: .bold))
        check.tintColor = DS.Color.primary
        check.tag = 1
        row.addSubview(check)
        check.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
        }
        return row
    }

    private var note: String { noteField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? "" }

    private func render() {
        for (reason, row) in rows {
            let on = reason == selected
            row.viewWithTag(1)?.isHidden = !on
            row.titleLabel?.font = on ? Utils.boldFont(size: DS.TextSize.body) : Utils.regularFont(size: DS.TextSize.body)
            row.accessibilityTraits = on ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        }
        // "Khác" needs a few words the customer will read
        noteField.placeholder = (selected == .other ? "booking.reject.otherPlaceholder" : "booking.reject.notePlaceholder").localized()
        let ready = selected != nil && (selected != .other || !note.isEmpty)
        send.isEnabled = ready
        send.alpha = ready ? 1 : 0.4
    }

    @objc private func reasonTapped(_ sender: UIButton) {
        selected = rows.first(where: { $0.1 === sender })?.0
        render()
        if selected == .other { noteField.becomeFirstResponder() }
    }

    @objc private func noteChanged() { render() }

    func textFieldShouldBeginEditing(_ textField: UITextField) -> Bool {
        if let sheet = sheetPresentationController { sheet.animateChanges { sheet.selectedDetentIdentifier = .large } }
        return true
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }

    @objc private func sendTapped() {
        guard let selected else { return }
        view.endEditing(true)
        onSend?(selected, note.isEmpty ? nil : note)
    }

    @objc private func closeTapped() { dismiss(animated: true) }
}
