//
//  CalendarV2ViewController.swift
//  POS ADBD
//
//  Redesigned calendar tab (#374, board Lich), shown when `newCalendar` is on: month grid with hand-over dots,
//  return rings and late-return squares, and the hand-overs and returns of the selected day.
//

import UIKit
import SnapKit
import Alamofire

final class CalendarV2ViewController: BaseViewControler {
    private enum DayState: Equatable {
        case loading, loaded, failed(String)
    }

    private var year: Int
    private var month: Int
    private var selectedKey: String
    private var counts: CalendarMonthCounts?
    private var rows: [CalendarDayRow] = []
    private var dayState: DayState = .loading
    private var monthGeneration = 0
    private var dayGeneration = 0
    private var monthRequest: DataRequest?
    private var dayRequests: [DataRequest] = []
    /// #674: reload on appear only when an order changed or the data is 5 minutes old
    private var freshness = RefreshTracker()

    private let listView = UITableView(frame: .zero, style: .plain)
    private let headerContainer = UIView()
    private let monthLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    private let gridStack = UIStackView()

    private var todayKey: String { DayFormatter.key(Date()) }

    private var hidesMoney: Bool {
        OrdersHomeLogic.hidesMoney(role: User.current()?.role, hideForStaff: Utils.shouldHideFinancialDataForStaff())
    }

    override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        let today = DayFormatter.key(Date())
        let parts = CalendarV2Logic.parts(of: today)!
        year = parts.year
        month = parts.month
        selectedKey = today
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        NotificationCenter.default.addObserver(self, selector: #selector(ordersChanged), name: OrdersChangeSignal.name, object: nil)
        loadMonth()
        loadDay()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        refreshIfNeeded()
    }

    /// #674: quiet (the day's rows stay, no spinner) and only when dirty or stale
    private func refreshIfNeeded() {
        guard dayState != .loading, freshness.shouldReload(now: Date(), ttl: RefreshPolicy.listTTL) else { return }
        loadMonth()
        loadDay(quiet: true)
    }

    @objc private func ordersChanged() {
        freshness.markDirty()
        if isViewLoaded, view.window != nil { refreshIfNeeded() }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        sizeHeaderToFit()
    }

    override func setupUI() {
        view.backgroundColor = DS.Color.surface

        let title = V2.label("calendar.v2.title".localized(), size: DS.TextSize.title, weight: .bold)
        let previous = arrowButton("chevron.left", label: "calendar.v2.prevMonth".localized(), action: #selector(previousMonth))
        let next = arrowButton("chevron.right", label: "calendar.v2.nextMonth".localized(), action: #selector(nextMonth))
        monthLabel.textAlignment = .center
        monthLabel.snp.makeConstraints { make in make.width.greaterThanOrEqualTo(108) }
        let titleRow = UIStackView(arrangedSubviews: [title, UIView(), previous, monthLabel, next])
        titleRow.alignment = .center
        titleRow.spacing = 4

        let weekdays = UIStackView(arrangedSubviews: "calendar.v2.weekdays".localized().split(separator: ",").map {
            let label = V2.label(String($0), size: DS.TextSize.pill, color: DS.Color.textMuted) // board Lich: weekday header 12
            label.textAlignment = .center
            return label
        })
        weekdays.distribution = .fillEqually

        gridStack.axis = .vertical
        gridStack.spacing = 2

        let legend = UIStackView(arrangedSubviews: [
            legendItem(MarkView(kind: .handOver), "calendar.v2.legend.handOver".localized()),
            legendItem(MarkView(kind: .returning), "calendar.v2.legend.return".localized()),
            legendItem(MarkView(kind: .late), "calendar.v2.legend.late".localized()),
        ])
        legend.spacing = DS.Spacing.lg
        let legendRow = UIStackView(arrangedSubviews: [UIView(), legend, UIView()])
        legendRow.distribution = .equalCentering

        let calendarStack = UIStackView(arrangedSubviews: [weekdays, gridStack, legendRow])
        calendarStack.axis = .vertical
        calendarStack.spacing = 4
        calendarStack.setCustomSpacing(6, after: gridStack)

        let band = UIView()
        band.backgroundColor = DS.Color.background

        headerContainer.addSubview(titleRow)
        headerContainer.addSubview(calendarStack)
        headerContainer.addSubview(band)
        titleRow.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.lg)
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.trailing.equalToSuperview().offset(-DS.Spacing.sm)
        }
        calendarStack.snp.makeConstraints { make in
            make.top.equalTo(titleRow.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview().inset(10)
        }
        band.snp.makeConstraints { make in
            make.top.equalTo(calendarStack.snp.bottom).offset(DS.Spacing.sm)
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(8)
        }

        listView.backgroundColor = DS.Color.surface
        listView.separatorStyle = .none
        listView.rowHeight = UITableViewAutomaticDimension
        listView.estimatedRowHeight = 68
        listView.sectionHeaderTopPadding = 0
        listView.sectionHeaderHeight = UITableViewAutomaticDimension
        listView.estimatedSectionHeaderHeight = 40
        listView.dataSource = self
        listView.delegate = self
        listView.register(CalendarDayRowCell.self, forCellReuseIdentifier: CalendarDayRowCell.reuseId)
        listView.register(CalendarDayStateCell.self, forCellReuseIdentifier: CalendarDayStateCell.reuseId)
        listView.tableHeaderView = headerContainer
        view.addSubview(listView)
        listView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.bottom.equalToSuperview()
        }
        configPullToRefresh(tableview: listView)
        renderMonth()
    }

    override func startRefresh(_ sender: Any) {
        loadMonth()
        loadDay(quiet: true)
    }

    private func sizeHeaderToFit() {
        let width = listView.bounds.width
        guard width > 0 else { return }
        let height = headerContainer.systemLayoutSizeFitting(CGSize(width: width, height: UILayoutFittingCompressedSize.height),
                                                             withHorizontalFittingPriority: .required,
                                                             verticalFittingPriority: .fittingSizeLevel).height
        if headerContainer.frame.height != height || headerContainer.frame.width != width {
            headerContainer.frame = CGRect(x: 0, y: 0, width: width, height: height)
            listView.tableHeaderView = headerContainer
        }
    }

    private func arrowButton(_ symbol: String, label: String, action: Selector) -> UIButton {
        let button = UIButton(type: .system)
        button.setImage(DS.symbol(symbol, DS.Icon.md, weight: .semibold), for: .normal)
        button.tintColor = DS.Color.text
        button.accessibilityLabel = label
        button.addTarget(self, action: action, for: .touchUpInside)
        button.snp.makeConstraints { make in make.width.height.equalTo(DS.touchTarget) }
        return button
    }

    private func legendItem(_ mark: UIView, _ text: String) -> UIView {
        let stack = UIStackView(arrangedSubviews: [mark, V2.label(text, size: DS.TextSize.pill, color: DS.Color.textMuted)]) // board Lich: legend 12
        stack.spacing = 5
        stack.alignment = .center
        return stack
    }

    // MARK: - Data

    private func loadMonth() {
        monthRequest?.cancel()
        monthGeneration += 1
        let generation = monthGeneration
        monthRequest = TabsV2APIService.shared.calendarMonth(year: year, month: month) { [weak self] counts, error in
            DispatchQueue.main.async {
                guard let self, generation == self.monthGeneration else { return }
                self.endRefresh()
                if let counts {
                    self.counts = counts
                } else if let error, (error as NSError).code != NSURLErrorCancelled {
                    // Marks stay empty; the day list shows its own error
                    NSLog("[CalendarV2] month failed: \(error.localizedDescription)")
                }
                self.renderMonth()
                self.listView.reloadData()
            }
        }
    }

    /// `quiet` (#674, same day only): the rows on screen stay until the answer replaces them; a failure keeps them
    private func loadDay(quiet: Bool = false) {
        dayRequests.forEach { $0.cancel() }
        dayGeneration += 1
        let generation = dayGeneration
        let dayKey = selectedKey
        let version = freshness.begin()
        let keepRows = quiet && dayState == .loaded
        if !keepRows {
            dayState = .loading
            rows = []
            listView.reloadData()
        }

        var pickups: [CalendarDayOrder]?
        var returns: [CalendarDayOrder]?
        var failure: NSError?
        let group = DispatchGroup()
        group.enter()
        let pickupRequest = TabsV2APIService.shared.calendarDay(dayKey, returns: false) { orders, error in
            pickups = orders
            if failure == nil { failure = error }
            group.leave()
        }
        group.enter()
        let returnRequest = TabsV2APIService.shared.calendarDay(dayKey, returns: true) { orders, error in
            returns = orders
            if failure == nil { failure = error }
            group.leave()
        }
        dayRequests = [pickupRequest, returnRequest]
        group.notify(queue: .main) { [weak self] in
            guard let self, generation == self.dayGeneration else { return }
            self.endRefresh()
            if let pickups, let returns {
                self.rows = CalendarV2Logic.rows(dayKey: dayKey, todayKey: self.todayKey, pickups: pickups, returns: returns)
                self.dayState = .loaded
                self.freshness.loaded(version: version, at: Date())
            } else if !keepRows {
                self.dayState = .failed(failure?.localizedDescription ?? "")
            }
            self.listView.reloadData()
        }
    }

    // MARK: - Render

    private func renderMonth() {
        monthLabel.text = String(format: "calendar.v2.month".localized(), month, year)
        gridStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let today = todayKey
        let cells = CalendarV2Logic.monthGrid(year: year, month: month, todayKey: today)
        stride(from: 0, to: cells.count, by: 7).forEach { start in
            let week = UIStackView(arrangedSubviews: cells[start..<min(start + 7, cells.count)].map { cell in
                let button = CalendarDayButton()
                button.configure(cell: cell, marks: CalendarV2Logic.marks(for: cell.key, counts: counts, todayKey: today),
                                 selected: cell.key == selectedKey)
                button.addTarget(self, action: #selector(dayTapped(_:)), for: .touchUpInside)
                return button
            })
            week.distribution = .fillEqually
            gridStack.addArrangedSubview(week)
        }
        view.setNeedsLayout()
    }

    // MARK: - Actions

    @objc private func dayTapped(_ sender: CalendarDayButton) {
        guard let key = sender.key, sender.isInMonth, key != selectedKey else { return }
        selectedKey = key
        renderMonth()
        loadDay()
    }

    @objc private func previousMonth() { moveMonth(by: -1) }
    @objc private func nextMonth() { moveMonth(by: 1) }

    private func moveMonth(by delta: Int) {
        let moved = CalendarV2Logic.addMonths(year: year, month: month, delta: delta)
        year = moved.year
        month = moved.month
        selectedKey = CalendarV2Logic.defaultSelection(year: year, month: month, todayKey: todayKey)
        counts = nil
        renderMonth()
        loadMonth()
        loadDay()
    }

    private func dayHeaderTexts() -> (title: String, summary: NSAttributedString) {
        let isToday = selectedKey == todayKey
        let label = OverviewLogic.date(of: selectedKey).map { DayFormatter.short($0) } ?? selectedKey
        let title = isToday ? "\("calendar.v2.today".localized().uppercased()) · \(label)" : label.uppercased()
        let day = counts?.byDate[selectedKey]
        let parts = CalendarV2Logic.headerSummary(isToday: isToday, lateReturns: counts?.lateReturns ?? 0,
                                                  pickups: day?.pickups ?? 0, returns: day?.returns ?? 0)
        let summary = NSMutableAttributedString()
        if let late = parts.late {
            summary.append(NSAttributedString(string: late + " · ", attributes: [
                NSAttributedString.Key.font: Utils.boldFont(size: DS.TextSize.secondary),
                NSAttributedString.Key.foregroundColor: V2.danger,
            ]))
        }
        summary.append(NSAttributedString(string: parts.rest, attributes: [
            NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.secondary),
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
        ]))
        return (title, summary)
    }
}

// MARK: - Table

extension CalendarV2ViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        dayState == .loaded && !rows.isEmpty ? rows.count : 1
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        guard dayState == .loaded, !rows.isEmpty else {
            let cell = tableView.dequeueReusableCell(withIdentifier: CalendarDayStateCell.reuseId, for: indexPath) as! CalendarDayStateCell
            switch dayState {
            case .loading: cell.show(loading: true, text: nil)
            case .failed(let message):
                cell.show(loading: false, text: (message.isEmpty ? "Something went wrong".localized() : message) + "\n" + "Retry".localized())
            case .loaded: cell.show(loading: false, text: "calendar.v2.empty".localized())
            }
            return cell
        }
        let cell = tableView.dequeueReusableCell(withIdentifier: CalendarDayRowCell.reuseId, for: indexPath) as! CalendarDayRowCell
        cell.configure(rows[indexPath.row], hidesMoney: hidesMoney)
        return cell
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let texts = dayHeaderTexts()
        let view = UIView()
        view.backgroundColor = V2.sectionFill
        let title = V2.label(texts.title, size: DS.TextSize.secondary, weight: .bold, color: UIColor(hexString: "334155"))
        let summary = UILabel()
        summary.attributedText = texts.summary
        summary.textAlignment = .right
        view.addSubview(title)
        view.addSubview(summary)
        title.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
            make.top.equalToSuperview().offset(10)
            make.bottom.equalToSuperview().offset(-6)
        }
        summary.snp.makeConstraints { make in
            make.firstBaseline.equalTo(title)
            make.leading.greaterThanOrEqualTo(title.snp.trailing).offset(DS.Spacing.sm)
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
        }
        let line = V2.divider()
        view.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return view
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        if case .failed = dayState {
            loadDay()
            return
        }
        guard dayState == .loaded, rows.indices.contains(indexPath.row) else { return }
        OrderDetailRouter.open(orderId: rows[indexPath.row].order.id, from: self)
    }
}

// MARK: - Views

/// One mark of the grid and the legend: filled dot, ring, red square
final class MarkView: UIView {
    enum Kind { case handOver, returning, late }

    init(kind: Kind) {
        super.init(frame: .zero)
        snp.makeConstraints { make in make.width.height.equalTo(7) }
        switch kind {
        case .handOver:
            backgroundColor = DS.Color.primary
            layer.cornerRadius = 3.5
        case .returning:
            layer.borderWidth = 2
            layer.borderColor = UIColor(hexString: "6D28D9").cgColor
            layer.cornerRadius = 3.5
        case .late:
            backgroundColor = V2.danger
            layer.cornerRadius = 2
        }
        isAccessibilityElement = false
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}

final class CalendarDayButton: UIControl {
    private(set) var key: String?
    private(set) var isInMonth = false
    private let background = UIView()
    private let numberLabel = UILabel()
    private let marks = UIStackView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        background.isUserInteractionEnabled = false
        background.layer.cornerRadius = 12
        addSubview(background)
        background.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 1, left: 2, bottom: 1, right: 2))
            make.height.equalTo(46)
        }
        numberLabel.textAlignment = .center
        marks.spacing = 3
        marks.alignment = .center
        let stack = UIStackView(arrangedSubviews: [numberLabel, marks])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 3
        stack.isUserInteractionEnabled = false
        background.addSubview(stack)
        stack.snp.makeConstraints { make in make.center.equalToSuperview() }
        marks.snp.makeConstraints { make in make.height.equalTo(7) }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(cell: CalendarCell, marks dayMarks: CalendarDayMarks, selected: Bool) {
        key = cell.key
        isInMonth = cell.inMonth
        numberLabel.text = "\(cell.day)"
        marks.arrangedSubviews.forEach { $0.removeFromSuperview() }
        if cell.inMonth {
            if dayMarks.handOver { marks.addArrangedSubview(MarkView(kind: .handOver)) }
            if dayMarks.returning { marks.addArrangedSubview(MarkView(kind: .returning)) }
            if dayMarks.lateReturn { marks.addArrangedSubview(MarkView(kind: .late)) }
        }
        if cell.isToday && cell.inMonth {
            background.backgroundColor = DS.Color.text
            numberLabel.textColor = .white
            numberLabel.font = Utils.boldFont(size: DS.TextSize.body)
        } else if selected && cell.inMonth {
            background.backgroundColor = DS.Status.handOver.fill
            numberLabel.textColor = DS.Status.handOver.text
            numberLabel.font = Utils.boldFont(size: DS.TextSize.body)
        } else {
            background.backgroundColor = .clear
            numberLabel.textColor = cell.inMonth ? DS.Color.text : UIColor(hexString: "94A3B8")
            numberLabel.font = Utils.regularFont(size: DS.TextSize.body)
        }
        if selected && cell.inMonth && cell.isToday {
            background.layer.borderWidth = 0
        }
        isEnabled = cell.inMonth
        isAccessibilityElement = true
        accessibilityLabel = OverviewLogic.date(of: cell.key).map { DayFormatter.short($0) } ?? cell.key
        accessibilityTraits = selected ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
    }
}

final class CalendarDayRowCell: UITableViewCell {
    static let reuseId = "CalendarDayRowCell"
    private let tagLabel = PaddedLabel()
    private let nameLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    /// #496: "#0053 · tạo T7 03/10" and the status line, as on the order list rows
    private let metaLabel = V2.label(size: 13, color: OrderRowCell.metaColor)
    private let taskLabel = V2.label(size: DS.TextSize.body, weight: .medium, lines: 2)
    private let totalLabel = V2.label(size: DS.TextSize.name, weight: .bold)
    private let noteLabel = V2.label(size: DS.TextSize.secondary, weight: .bold, color: V2.danger)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        tagLabel.font = Utils.boldFont(size: DS.TextSize.pill)
        tagLabel.layer.cornerRadius = 6
        tagLabel.layer.masksToBounds = true
        tagLabel.setContentHuggingPriority(.required, for: .horizontal)
        tagLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        nameLabel.lineBreakMode = .byTruncatingTail
        totalLabel.textAlignment = .right
        noteLabel.textAlignment = .right
        totalLabel.setContentCompressionResistancePriority(.required, for: .horizontal)
        noteLabel.setContentCompressionResistancePriority(.required, for: .horizontal)

        let nameRow = UIStackView(arrangedSubviews: [tagLabel, nameLabel])
        nameRow.spacing = 6
        nameRow.alignment = .center
        let left = UIStackView(arrangedSubviews: [nameRow, metaLabel, taskLabel])
        left.axis = .vertical
        left.spacing = DS.Gap.lineTight
        left.alignment = .leading
        let right = UIStackView(arrangedSubviews: [totalLabel, noteLabel])
        right.axis = .vertical
        right.alignment = .trailing
        let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))
        chevron.tintColor = UIColor(hexString: "94A3B8")
        chevron.contentMode = .center
        chevron.snp.makeConstraints { make in make.width.height.equalTo(DS.Icon.sm) }
        let row = UIStackView(arrangedSubviews: [left, right, chevron])
        row.spacing = DS.Spacing.md
        row.alignment = .center
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 10, left: DS.Spacing.lg, bottom: 10, right: DS.Spacing.lg))
            make.height.greaterThanOrEqualTo(DS.touchTarget)
        }
        let line = V2.divider()
        contentView.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        accessoryType = .none
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(_ row: CalendarDayRow, hidesMoney: Bool) {
        let pill = row.kind == .handOver ? DS.Status.handOver : DS.Status.returning
        tagLabel.text = row.kind == .handOver ? "Hand over".localized() : "calendar.v2.tag.return".localized()
        tagLabel.textColor = pill.text
        tagLabel.backgroundColor = pill.fill
        let name = row.order.customerName?.trimmingCharacters(in: .whitespaces) ?? ""
        nameLabel.text = name.isEmpty ? row.order.orderNumber : name
        let order = row.order
        let status = OrderStatus.from(apiString: order.status) ?? (row.kind == .handOver ? .reserved : .pickuped)
        let lines = OrdersHomeLogic.rowLines(
            code: OrdersHomeLogic.shortNumber(order.orderNumber),
            orderType: (order.orderType ?? "").uppercased() == "SALE" ? .sale : .rent, status: status,
            createdAt: order.createdAt, pickupPlanAt: order.pickupPlanAt, returnPlanAt: order.returnPlanAt,
            returnedAt: nil, updatedAt: nil, isLate: row.lateDays > 0)
        metaLabel.text = lines.meta
        taskLabel.text = lines.task
        taskLabel.isHidden = lines.task.isEmpty
        totalLabel.text = hidesMoney ? nil : MoneyFormatter.format(row.order.totalAmount)
        totalLabel.isHidden = hidesMoney
        // Board Lich: late days (+ stored fee), else what to give back or still to collect (#390)
        switch CalendarV2Logic.note(row, hidesMoney: hidesMoney) {
        case .late(let days, let fee):
            let late = LateText.days(days)
            noteLabel.text = fee.map { late + " · " + String(format: "calendar.v2.fee".localized(), MoneyFormatter.format($0)) } ?? late
            noteLabel.textColor = V2.danger
        case .refund(let amount):
            noteLabel.text = String(format: "orders.v2.pay.refund".localized(), MoneyFormatter.format(amount))
            noteLabel.textColor = DS.Status.returning.text
        case .due(let amount):
            noteLabel.text = String(format: "orders.v2.pay.due".localized(), MoneyFormatter.format(amount))
            noteLabel.textColor = DS.Status.waiting.text
        case .none:
            noteLabel.text = nil
        }
        noteLabel.isHidden = noteLabel.text == nil
    }
}

/// Insets around a label (tags)
final class PaddedLabel: UILabel {
    var insets = UIEdgeInsets(top: 2, left: 6, bottom: 2, right: 6)

    override func drawText(in rect: CGRect) {
        super.drawText(in: UIEdgeInsetsInsetRect(rect, insets))
    }

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(width: size.width + insets.left + insets.right, height: size.height + insets.top + insets.bottom)
    }
}

final class CalendarDayStateCell: UITableViewCell {
    static let reuseId = "CalendarDayStateCell"
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let messageLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        messageLabel.textAlignment = .center
        contentView.addSubview(spinner)
        contentView.addSubview(messageLabel)
        spinner.snp.makeConstraints { make in make.center.equalToSuperview() }
        messageLabel.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 28, left: DS.Spacing.xl, bottom: 28, right: DS.Spacing.xl))
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func show(loading: Bool, text: String?) {
        if loading { spinner.startAnimating() } else { spinner.stopAnimating() }
        messageLabel.text = loading ? " " : text
    }
}
