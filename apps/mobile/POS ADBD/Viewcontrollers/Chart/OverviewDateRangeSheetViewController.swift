//
//  OverviewDateRangeSheetViewController.swift
//  POS ADBD
//

import UIKit
import SnapKit

final class OverviewDateRangeSheetViewController: UIViewController {

    var onConfirm: ((ReportPeriod, Date?, Date?) -> Void)?

    private let periods: [ReportPeriod]
    private var draftPeriod: ReportPeriod
    private var draftStart: Date?
    private var draftEnd: Date?
    private var presetButtons: [UIButton] = []

    private let headerView = RCSheetHeaderView()
    private let gridStack = UIStackView()
    private let fromField = OverviewDateFieldView(title: "Report_DateRange_From".localized())
    private let toField = OverviewDateFieldView(title: "Report_DateRange_To".localized())
    private lazy var customRow: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [fromField, toField])
        stack.axis = .horizontal
        stack.spacing = 12
        stack.distribution = .fillEqually
        return stack
    }()
    private lazy var confirmButton: RCPrimaryButton = {
        RCPrimaryButton(title: "Confirm".localized(), backgroundColor: APP_TONE_COLOR)
    }()

    init(periods: [ReportPeriod], selected: ReportPeriod, customStart: Date?, customEnd: Date?) {
        self.periods = periods
        self.draftPeriod = selected
        self.draftStart = customStart
        self.draftEnd = customEnd
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        buildLayout()
        refreshPresetSelection()
        refreshCustomRow()
        refreshConfirm()
    }

    private func buildLayout() {
        headerView.title = "Report_DateRange_Title".localized()
        confirmButton.addTarget(self, action: #selector(confirmTapped), for: .touchUpInside)

        gridStack.axis = .vertical
        gridStack.spacing = 10
        buildPresetGrid()

        fromField.onTap = { [weak self] in self?.pickCustomRange() }
        toField.onTap = { [weak self] in self?.pickCustomRange() }

        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .vertical)
        let stack = UIStackView(arrangedSubviews: [gridStack, customRow, spacer, confirmButton])
        stack.axis = .vertical
        stack.spacing = 16
        view.addSubview(headerView)
        view.addSubview(stack)
        headerView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        stack.snp.makeConstraints { make in
            make.top.equalTo(headerView.snp.bottom).offset(16)
            make.leading.trailing.equalToSuperview().inset(16)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-12)
        }
        confirmButton.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
    }

    private func buildPresetGrid() {
        let columns = 2
        var row: [UIView] = []
        for period in periods {
            let button = makePresetButton(period)
            presetButtons.append(button)
            row.append(button)
            if row.count == columns {
                gridStack.addArrangedSubview(makeRow(row))
                row.removeAll()
            }
        }
        if !row.isEmpty {
            while row.count < columns {
                row.append(UIView())
            }
            gridStack.addArrangedSubview(makeRow(row))
        }
    }

    private func makeRow(_ views: [UIView]) -> UIStackView {
        let row = UIStackView(arrangedSubviews: views)
        row.axis = .horizontal
        row.spacing = 10
        row.distribution = .fillEqually
        row.snp.makeConstraints { make in
            make.height.equalTo(44)
        }
        return row
    }

    private func makePresetButton(_ period: ReportPeriod) -> UIButton {
        let button = UIButton(type: .system)
        button.tag = period.rawValue
        button.setTitle(period.title, for: .normal)
        button.titleLabel?.font = Utils.mediumFont(size: 14)
        button.setTitleColor(.textPrimary, for: .normal)
        button.backgroundColor = UIColor.systemGray6
        button.layer.cornerRadius = 10
        button.layer.borderWidth = 1.5
        button.layer.borderColor = UIColor.clear.cgColor
        button.addTarget(self, action: #selector(presetTapped(_:)), for: .touchUpInside)
        return button
    }

    private func refreshPresetSelection() {
        for button in presetButtons {
            let selected = button.tag == draftPeriod.rawValue
            button.backgroundColor = selected ? .systemBackground : UIColor.systemGray6
            button.layer.borderColor = selected ? UIColor.label.cgColor : UIColor.clear.cgColor
        }
    }

    private func refreshCustomRow() {
        let showCustom = draftPeriod == .custom
        customRow.isHidden = !showCustom
        fromField.setValue(
            formatted(draftStart),
            active: showCustom && draftStart == nil,
            emptyPlaceholder: "Select date".localized()
        )
        toField.setValue(
            formatted(draftEnd),
            active: showCustom && draftStart != nil && draftEnd == nil,
            emptyPlaceholder: "--"
        )
    }

    private func refreshConfirm() {
        if draftPeriod == .custom {
            confirmButton.isEnabled = draftStart != nil && draftEnd != nil
        } else {
            confirmButton.isEnabled = true
        }
    }

    private func formatted(_ date: Date?) -> String? {
        guard let date else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy"
        return formatter.string(from: date)
    }

    @objc private func presetTapped(_ sender: UIButton) {
        guard let period = ReportPeriod(rawValue: sender.tag) else { return }
        draftPeriod = period
        refreshPresetSelection()
        refreshCustomRow()
        refreshConfirm()
        if period == .custom {
            pickCustomRange()
        }
    }

    private func pickCustomRange() {
        let picker = DatePickerViewController.instance()
        picker.delegate = self
        let calendar = Calendar.current
        let minDate = calendar.date(byAdding: .year, value: -10, to: Date()) ?? Date()
        picker.configureForDateRange(
            startDate: draftStart,
            endDate: draftEnd,
            minimumDate: minDate,
            maximumDate: Date()
        )
        present(picker, animated: true)
    }

    @objc private func confirmTapped() {
        onConfirm?(draftPeriod, draftStart, draftEnd)
        dismiss(animated: true)
    }
}

extension OverviewDateRangeSheetViewController: DatePickerViewControllerDelegate {
    func didSelectDate(_ date: Date, sender: DatePickerViewController) {
        draftStart = date
        draftEnd = date
        refreshCustomRow()
        refreshConfirm()
    }

    func didSelectDateRange(start: Date, end: Date, sender: DatePickerViewController) {
        draftStart = start
        draftEnd = end
        refreshCustomRow()
        refreshConfirm()
    }
}

private final class OverviewDateFieldView: UIControl {
    var onTap: (() -> Void)?
    private let titleLabel = UILabel()
    private let valueLabel = UILabel()

    init(title: String) {
        super.init(frame: .zero)
        titleLabel.text = title
        titleLabel.font = Utils.mediumFont(size: 12)
        titleLabel.textColor = .textSecondary
        valueLabel.font = Utils.mediumFont(size: 15)
        valueLabel.textColor = .textPrimary
        backgroundColor = UIColor.systemGray6
        layer.cornerRadius = 10
        layer.borderWidth = 1.5
        let stack = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stack.axis = .vertical
        stack.spacing = 2
        stack.isUserInteractionEnabled = false
        addSubview(stack)
        stack.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12))
        }
        snp.makeConstraints { make in
            make.height.equalTo(56)
        }
        addTarget(self, action: #selector(tapped), for: .touchUpInside)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func setValue(_ text: String?, active: Bool, emptyPlaceholder: String = "Select date".localized()) {
        valueLabel.text = text ?? emptyPlaceholder
        valueLabel.textColor = text == nil ? .textSecondary : .textPrimary
        backgroundColor = active ? .systemBackground : UIColor.systemGray6
        layer.borderColor = active ? UIColor.label.cgColor : UIColor.clear.cgColor
    }

    @objc private func tapped() {
        onTap?()
    }
}
