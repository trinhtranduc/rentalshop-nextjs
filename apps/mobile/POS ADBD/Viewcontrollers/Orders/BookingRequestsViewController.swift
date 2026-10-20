//
//  BookingRequestsViewController.swift
//  POS ADBD
//
//  #1124 "Đặt online": the shop's online booking requests (mockup screen 5). Tabs per status with counts, newest
//  first; a row opens the request (screen 6).
//

import UIKit
import SnapKit

final class BookingRequestsViewController: BaseViewControler {
    private static let tabs: [BookingStatus] = [.pending, .confirmed, .rejected, .expired]

    private var status: BookingStatus = .pending
    private var rows: [BookingRequest] = []
    private var counts: [String: Int] = [:]
    private var loading = false
    private let chips = UIStackView()
    private var chipButtons: [UIButton] = []
    private let listView = UITableView(frame: .zero, style: .plain)
    private let emptyLabel = V2.label(nil, size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "booking.title".localized()
        view.backgroundColor = DS.Color.surface
        setupUI()
        NotificationCenter.default.addObserver(self, selector: #selector(reload), name: OrdersChangeSignal.name, object: nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(false, animated: animated)
        reload()
    }

    override func setupUI() {
        chipButtons = Self.tabs.enumerated().map { index, _ in
            let chip = UIButton(type: .system)
            chip.tag = index
            chip.layer.cornerRadius = 18
            chip.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            chip.snp.makeConstraints { make in make.height.equalTo(36) }
            chip.accessibilityIdentifier = "booking.tab.\(Self.tabs[index].rawValue)"
            return chip
        }
        chipButtons.forEach(chips.addArrangedSubview)
        chips.spacing = DS.Spacing.sm
        let scroll = UIScrollView()
        scroll.showsHorizontalScrollIndicator = false
        scroll.addSubview(chips)
        chips.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 0, right: DS.Spacing.lg))
            make.height.equalToSuperview()
        }

        listView.backgroundColor = DS.Color.surface
        listView.separatorStyle = .none
        listView.rowHeight = UITableViewAutomaticDimension
        listView.estimatedRowHeight = 88
        listView.dataSource = self
        listView.delegate = self
        listView.register(BookingRequestCell.self, forCellReuseIdentifier: BookingRequestCell.reuseId)
        listView.accessibilityIdentifier = "booking.list"
        emptyLabel.textAlignment = .center

        view.addSubview(scroll)
        view.addSubview(listView)
        view.addSubview(emptyLabel)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.sm)
            make.leading.trailing.equalTo(view.readableColumn())
            make.height.equalTo(36)
        }
        listView.snp.makeConstraints { make in
            make.top.equalTo(scroll.snp.bottom).offset(DS.Spacing.sm)
            make.leading.trailing.equalTo(view.readableColumn())
            make.bottom.equalToSuperview()
        }
        emptyLabel.snp.makeConstraints { make in
            make.top.equalTo(scroll.snp.bottom).offset(48)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg * 2)
        }
        configPullToRefresh(tableview: listView)
        renderChips()
    }

    override func startRefresh(_ sender: Any) {
        reload()
    }

    @objc private func reload() {
        guard !loading else { return }
        loading = true
        TabsV2APIService.shared.bookingRequests(status: status) { [weak self] list, error in
            guard let self else { return }
            self.loading = false
            self.endRefresh()
            if let error {
                if self.rows.isEmpty { UIAlertController.errorAlert(parent: self, error: error) }
                return
            }
            self.rows = list?.requests ?? []
            self.counts = list?.counts ?? [:]
            self.renderChips()
            self.listView.reloadData()
            self.emptyLabel.text = "booking.empty".localized()
            self.emptyLabel.isHidden = !self.rows.isEmpty
        }
    }

    private func renderChips() {
        for (index, chip) in chipButtons.enumerated() {
            let tab = Self.tabs[index]
            let count = counts[tab.rawValue] ?? 0
            chip.setTitle(tab.titleKey.localized() + (count > 0 ? " \(count)" : ""), for: .normal)
            let selected = tab == status
            chip.backgroundColor = selected ? DS.Color.text : DS.Color.surface
            chip.layer.borderWidth = selected ? 0 : 1
            chip.layer.borderColor = DS.Color.border.cgColor
            chip.setTitleColor(selected ? .white : DS.Color.text, for: .normal)
            chip.titleLabel?.font = selected ? Utils.boldFont(size: DS.TextSize.secondary) : Utils.regularFont(size: DS.TextSize.secondary)
        }
    }

    @objc private func chipTapped(_ sender: UIButton) {
        status = Self.tabs[sender.tag]
        rows = []
        listView.reloadData()
        renderChips()
        reload()
    }

    func openRequest(id: Int) {
        let detail = BookingRequestDetailViewController(requestId: id)
        navigationController?.pushViewController(detail, animated: true)
    }
}

extension BookingRequestsViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int { rows.count }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: BookingRequestCell.reuseId, for: indexPath) as! BookingRequestCell
        cell.configure(rows[indexPath.row])
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        openRequest(id: rows[indexPath.row].id)
    }
}

/// Status pill colours of a request
enum BookingStatusStyle {
    static func pill(_ status: BookingStatus) -> DS.Pill {
        switch status {
        case .pending: return DS.Status.waiting
        case .confirmed: return DS.Status.done
        case .rejected: return DS.Status.late
        case .expired, .cancelled, .unknown: return DS.Status.cancelled
        }
    }

    static func pillLabel(_ status: BookingStatus) -> UILabel {
        let style = pill(status)
        let label = InsetLabel()
        label.insets = UIEdgeInsets(top: 3, left: 8, bottom: 3, right: 8)
        label.text = status.titleKey.localized()
        label.font = Utils.boldFont(size: DS.TextSize.pill)
        label.textColor = style.text
        label.backgroundColor = style.fill
        label.layer.cornerRadius = 6
        label.clipsToBounds = true
        label.setContentHuggingPriority(.required, for: .horizontal)
        label.setContentCompressionResistancePriority(.required, for: .horizontal)
        return label
    }
}

final class BookingRequestCell: UITableViewCell {
    static let reuseId = "BookingRequestCell"
    private let nameLabel = V2.label(size: DS.TextSize.name, weight: .medium)
    private let pillHolder = UIStackView()
    private let infoLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 2)
    private let timeLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        nameLabel.lineBreakMode = .byTruncatingTail
        nameLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        let top = UIStackView(arrangedSubviews: [nameLabel, UIView(), pillHolder])
        top.alignment = .center
        top.spacing = DS.Spacing.sm
        let column = UIStackView(arrangedSubviews: [top, infoLabel, timeLabel])
        column.axis = .vertical
        column.spacing = 4
        contentView.addSubview(column)
        let line = V2.divider()
        contentView.addSubview(line)
        column.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg))
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        accessibilityIdentifier = "booking.row"
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(_ row: BookingRequest) {
        nameLabel.text = row.customerName
        pillHolder.arrangedSubviews.forEach { $0.removeFromSuperview() }
        pillHolder.addArrangedSubview(BookingStatusStyle.pillLabel(row.bookingStatus))
        let parts = [row.code, String(format: "booking.items".localized(), row.itemCount), row.outlet.name,
                     BookingLogic.dateRange(pickup: row.pickupDate, return: row.returnDate)].compactMap { $0 }
        infoLabel.text = parts.joined(separator: " · ")
        if row.bookingStatus == .pending, let expires = row.expiresAtDate {
            timeLabel.text = String(format: "booking.hoursLeft".localized(), BookingLogic.hoursLeft(expiresAt: expires))
            timeLabel.isHidden = false
        } else {
            timeLabel.isHidden = true
        }
        let closed = row.bookingStatus == .expired || row.bookingStatus == .rejected || row.bookingStatus == .cancelled
        contentView.alpha = closed ? 0.6 : 1
        accessibilityLabel = "\(row.customerName), \(row.bookingStatus.titleKey.localized())"
    }
}
