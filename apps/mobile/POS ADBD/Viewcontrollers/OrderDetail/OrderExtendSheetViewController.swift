//
//  OrderExtendSheetViewController.swift
//  POS ADBD
//
//  "Gia hạn" of a rental (#390): pick a later return day, check the added days with the batch availability call at
//  the order's outlet, then PUT /api/orders/{id} with the new `returnPlanAt`. Nothing is saved when an item is short.
//

import UIKit
import SnapKit

final class OrderExtendSheetViewController: UIViewController {
    /// Called after the order was saved with the new return day
    var onExtended: ((Date) -> Void)?

    private let detail: OrderDetail
    private let currentReturn: Date
    private let picker = UIDatePicker()
    private let extraLabel = V2.label(size: 14, weight: .bold)
    private let errorLabel = V2.label(size: 14, color: DS.Status.late.text, lines: 0)
    private let confirmButton = V2.primaryButton("")
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .white)
    private var busy = false

    init(detail: OrderDetail, currentReturn: Date) {
        self.detail = detail
        self.currentReturn = currentReturn
        super.init(nibName: nil, bundle: nil)
        if let sheet = sheetPresentationController {
            sheet.detents = [.large()]
            sheet.prefersGrabberVisible = true
            sheet.preferredCornerRadius = 24
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let title = V2.label("order.extend.title".localized(), size: 20, weight: .bold)
        let current = V2.label(String(format: "order.extend.current".localized(), DayFormatter.short(currentReturn)),
                               size: 14, color: DS.Color.textMuted, lines: 0)

        let first = RentalExtension.firstSelectableDay(after: currentReturn)
        picker.datePickerMode = .date
        picker.preferredDatePickerStyle = .inline
        picker.timeZone = .current
        picker.minimumDate = first
        picker.date = first
        picker.tintColor = DS.Color.primary
        picker.addTarget(self, action: #selector(dateChanged), for: .valueChanged)

        errorLabel.isHidden = true
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)
        confirmButton.addSubview(spinner)
        spinner.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }

        let stack = UIStackView(arrangedSubviews: [title, current, picker, extraLabel, errorLabel, confirmButton])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.sm
        stack.setCustomSpacing(DS.Spacing.lg, after: errorLabel)
        let scroll = UIScrollView()
        view.addSubview(scroll)
        scroll.addSubview(stack)
        scroll.snp.makeConstraints { make in make.edges.equalTo(view.safeAreaLayoutGuide) }
        stack.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.xl)
            make.leading.trailing.equalTo(view).inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-28)
        }
        refresh()
    }

    private var window: (start: Date, end: Date)? {
        RentalExtension.window(currentReturn: currentReturn, newDay: picker.date)
    }

    private func refresh() {
        let extra = RentalExtension.extraDays(currentReturn: currentReturn, newDay: picker.date)
        extraLabel.text = extra == 1 ? "order.extend.extraDay".localized()
            : String(format: "order.extend.extraDays".localized(), extra)
        extraLabel.isHidden = extra == 0
        let title = window == nil ? "order.extend.pick".localized()
            : String(format: "order.extend.confirm".localized(), DayFormatter.short(picker.date))
        confirmButton.setTitle(title, for: .normal)
        confirmButton.isEnabled = window != nil && !busy
        confirmButton.alpha = confirmButton.isEnabled ? 1 : 0.5
        busy ? spinner.startAnimating() : spinner.stopAnimating()
    }

    private func setBusy(_ value: Bool) {
        busy = value
        isModalInPresentation = value
        picker.isEnabled = !value
        refresh()
    }

    private func showError(_ text: String) {
        errorLabel.text = text
        errorLabel.isHidden = false
        setBusy(false)
    }

    @objc private func dateChanged() {
        errorLabel.isHidden = true
        refresh()
    }

    @objc private func confirmTapped() {
        guard !busy, let window else { return }
        let newDay = picker.date
        let items = detail.orderItems
        setBusy(true)
        errorLabel.isHidden = true
        OrderService.shared.loadBatchProductAvailability(products: RentalExtension.requests(items),
                                                         startDate: window.start, endDate: window.end,
                                                         outletId: detail.outletId, excludeOrderId: detail.id) { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self else { return }
                guard let results = response?.data?.results else {
                    self.showError(error?.localizedDescription.localized() ?? "Error".localized())
                    return
                }
                let short = RentalExtension.unavailableNames(results, items: items)
                guard short.isEmpty else {
                    self.showError(String(format: "order.extend.unavailable".localized(), short.joined(separator: ", ")))
                    return
                }
                self.save(newDay)
            }
        }
    }

    private func save(_ newDay: Date) {
        let request = UpdateOrderRequest(returnPlanAt: RentalExtension.returnPlanAt(newDay).dateServerISOString())
        OrderService.shared.updateOrder(orderId: detail.id, request: request) { [weak self] _, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let error {
                    self.showError(error.localizedDescription.localized())
                    return
                }
                self.setBusy(false)
                self.dismiss(animated: true) { self.onExtended?(newDay) }
            }
        }
    }
}
