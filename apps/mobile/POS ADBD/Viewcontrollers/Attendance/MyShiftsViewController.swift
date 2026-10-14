//
//  MyShiftsViewController.swift
//  POS ADBD
//
//  Ca và công của tôi (#909, mockup "App (nhân viên)" 7): this week's shifts with in–out times (late in amber),
//  then the month's total hours and worked days. Also opened by a `SHIFT_CHANGED` notification.
//

import UIKit
import SnapKit

final class MyShiftsViewController: BaseViewControler {
    private let content = UIStackView()
    private let weekStack = UIStackView()
    private let monthTitle = V2.label(size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
    private let hoursValue = V2.label("—", size: DS.TextSize.body, weight: .bold)
    private let daysValue = V2.label("—", size: DS.TextSize.body, weight: .bold)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)

    private var schedule: [String: [AttendanceShift]] = [:]
    private var rowsByMonth: [String: [AttendanceMonthRow]] = [:]
    private var pending = 0
    private var outletsAsked = false

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        load()
    }

    override func setupUI() {
        view.backgroundColor = .white
        view.accessibilityIdentifier = "attendance.mine.screen"
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "attendance.mine.title".localized(), back: back)

        weekStack.axis = .vertical
        content.axis = .vertical
        content.spacing = 0
        content.addArrangedSubview(caption("attendance.mine.week".localized()))
        content.addArrangedSubview(weekStack)
        let monthCaption = monthTitle
        monthCaption.text = AttendanceLogic.monthTitle(Date()).uppercased()
        content.addArrangedSubview(spacer(20))
        content.addArrangedSubview(monthCaption)
        content.setCustomSpacing(6, after: monthCaption)
        content.addArrangedSubview(row(title: "attendance.mine.totalHours".localized(), value: hoursValue))
        content.addArrangedSubview(row(title: "attendance.mine.days".localized(), value: daysValue))

        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.lg)
            make.leading.trailing.equalTo(view.readableColumn()).inset(DS.Spacing.lg) // #973 centered column on iPad
            make.bottom.equalToSuperview().offset(-DS.Spacing.lg)
        }
        spinner.hidesWhenStopped = true
        view.addSubview(spinner)
        spinner.snp.makeConstraints { make in make.center.equalToSuperview() }
    }

    private func caption(_ text: String) -> UILabel {
        let label = V2.label(text.uppercased(), size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
        label.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(24) }
        return label
    }

    private func spacer(_ height: CGFloat) -> UIView {
        let view = UIView()
        view.snp.makeConstraints { make in make.height.equalTo(height) }
        return view
    }

    private func row(title: String, value: UILabel) -> UIView {
        let titleLabel = V2.label(title, size: DS.TextSize.body)
        value.textAlignment = .right
        return line(left: titleLabel, right: value)
    }

    private func line(left: UIView, right: UIView) -> UIView {
        let box = UIView()
        let divider = V2.divider()
        [left, right, divider].forEach(box.addSubview)
        left.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(11)
            make.bottom.equalToSuperview().offset(-11)
            make.leading.equalToSuperview()
        }
        right.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview()
            make.leading.greaterThanOrEqualTo(left.snp.trailing).offset(8)
        }
        divider.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return box
    }

    // MARK: - Data

    private func load() {
        guard let user = User.account(), pending == 0 else { return }
        // A shop owner who never picked a branch on this device: load the outlets first, then the default one is used
        if user.outletId == nil, user.role == .merchant, CurrentOutlet.shared.merchantFilterId == nil, !outletsAsked {
            outletsAsked = true
            spinner.startAnimating()
            CurrentOutlet.shared.refresh { [weak self] in self?.load() }
            return
        }
        let now = Date()
        let week = AttendanceLogic.weekDayKeys(containing: now)
        guard let first = week.first, let last = week.last else { return }
        let months = Array(Set([String(first.prefix(7)), String(last.prefix(7)), AttendanceLogic.monthKey(now)])).sorted()
        if schedule.isEmpty && rowsByMonth.isEmpty { spinner.startAnimating() }
        pending = 1 + months.count
        // Both routes need an outlet: the user's own, or a shop owner's chosen branch (default first, #828)
        let outletId = user.outletId ?? CurrentOutlet.shared.merchantFilterId

        AttendanceService.shared.shifts(outletId: outletId, from: first, to: last) { [weak self] result in
            if case .success(let body) = result {
                var days: [String: [AttendanceShift]] = [:]
                for day in body.days where day.userId == nil || day.userId == user.id {
                    guard let key = day.date else { continue }
                    days[String(key.prefix(10)), default: []] += day.shifts
                }
                self?.schedule = days
            }
            self?.done()
        }
        for month in months {
            AttendanceService.shared.month(userId: user.id, outletId: outletId, month: month) { [weak self] result in
                guard let self else { return }
                if case .success(let body) = result {
                    self.rowsByMonth[month] = body.rows
                    if month == AttendanceLogic.monthKey(now) {
                        self.hoursValue.text = String(format: "attendance.mine.hoursValue".localized(), AttendanceLogic.hours(body.hours ?? 0))
                        self.daysValue.text = String(body.days ?? 0)
                    }
                }
                self.done()
            }
        }
    }

    private func done() {
        pending -= 1
        guard pending <= 0 else { return }
        pending = 0
        spinner.stopAnimating()
        renderWeek()
    }

    private func renderWeek() {
        weekStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let week = AttendanceLogic.weekDayKeys(containing: Date())
        let pairs = AttendanceLogic.pairs(rowsByMonth.values.flatMap { $0 })
        let rows = AttendanceLogic.weekRows(dayKeys: week, schedule: schedule, pairs: pairs)
        if rows.isEmpty {
            let empty = V2.label("attendance.mine.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
            weekStack.addArrangedSubview(line(left: empty, right: UIView()))
            return
        }
        for row in rows {
            let day = V2.label(row.day, size: DS.TextSize.body)
            let shift = V2.label(row.shift, size: DS.TextSize.pill, color: UIColor(hexString: "64748B"), lines: 0)
            let left = UIStackView(arrangedSubviews: [day, shift])
            left.axis = .vertical
            left.spacing = 2
            shift.isHidden = row.shift.isEmpty
            let worked = V2.label(row.worked, size: DS.TextSize.body, color: DS.Color.text, lines: 0)
            worked.textAlignment = .right
            worked.attributedText = workedText(row, font: worked.font)
            // e2e #909: the day and its shift ("Tối 21–23:30") stay on one line each; the times wrap instead
            [day, shift].forEach { $0.setContentCompressionResistancePriority(.required, for: .horizontal) }
            left.setContentCompressionResistancePriority(.required, for: .horizontal)
            left.setContentHuggingPriority(.required, for: .horizontal)
            worked.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
            let view = line(left: left, right: worked)
            view.isAccessibilityElement = true
            view.accessibilityLabel = [row.day, row.shift, row.worked].filter { !$0.isEmpty }.joined(separator: ", ")
            view.accessibilityIdentifier = "attendance.week.\(row.dayKey)"
            weekStack.addArrangedSubview(view)
        }
    }

    /// #935 Times and hours in the normal colour, only "muộn N′" in amber
    private func workedText(_ row: AttendanceWeekRow, font: UIFont) -> NSAttributedString {
        let paragraph = NSMutableParagraphStyle()
        paragraph.alignment = .right
        let base: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: DS.Color.text, .paragraphStyle: paragraph]
        guard !row.lines.isEmpty else { return NSAttributedString(string: row.worked, attributes: base) }
        let text = NSMutableAttributedString()
        for (index, line) in row.lines.enumerated() {
            if index > 0 { text.append(NSAttributedString(string: "\n", attributes: base)) }
            text.append(NSAttributedString(string: line.main, attributes: base))
            if let late = line.late {
                text.append(NSAttributedString(string: " · ", attributes: base))
                var amber = base
                amber[.foregroundColor] = UIColor(hexString: "92400E")
                text.append(NSAttributedString(string: late, attributes: amber))
            }
        }
        return text
    }

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }
}
