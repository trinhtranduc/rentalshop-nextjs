//
//  ChangeHistoryViewController.swift
//  POS ADBD
//
//  "Lịch sử thay đổi" of an order or a product (#519, boards LS-don, LS-san-pham): read only, newest first,
//  grouped by Vietnam civil day, 50 rows a page while scrolling. Texts come from `ChangeHistoryLogic`.
//

import UIKit
import SnapKit

final class ChangeHistoryViewController: BaseViewControler {
    private let subject: ChangeHistorySubject
    private var entries: [ChangeHistoryEntry] = []
    private var days: [ChangeDay] = []
    private var total = 0
    /// Rows the API returned so far (the next offset)
    private var fetched = 0
    private var lastPageCount = 0
    private var loading = false
    private var generation = 0

    private let listView = UITableView(frame: .zero, style: .plain)
    private let stateView = OrdersStateView()
    private let pullRefresh = UIRefreshControl()
    private let footerSpinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)

    init(subject: ChangeHistorySubject) {
        self.subject = subject
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        buildLayout()
        load(reset: true)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    // MARK: - Layout

    private func buildLayout() {
        let header = UIView()
        let back = UIButton(type: .system)
        back.setImage(DS.symbol("chevron.left", DS.Icon.lg, weight: .semibold), for: .normal)
        back.tintColor = DS.Color.text
        back.accessibilityLabel = "Back".localized()
        back.addTarget(self, action: #selector(goBack), for: .touchUpInside)
        let title = V2.label("history.title".localized(), size: 18, weight: .bold)
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let subtitle = V2.label(subject.subtitle, size: DS.TextSize.secondary, color: UIColor(hexString: "475569"))
        subtitle.lineBreakMode = .byTruncatingTail
        let texts = UIStackView(arrangedSubviews: [title, subtitle])
        texts.axis = .vertical
        [back, texts].forEach(header.addSubview)
        let line = V2.divider()
        line.backgroundColor = UIColor(hexString: "E5E7EB")
        header.addSubview(line)
        view.addSubview(header)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
            make.height.greaterThanOrEqualTo(60)
        }
        back.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(8)
            make.centerY.equalToSuperview()
            make.width.height.equalTo(DS.touchTarget)
        }
        texts.snp.makeConstraints { make in
            make.leading.equalTo(back.snp.trailing).offset(4)
            make.trailing.equalToSuperview().offset(-DS.Spacing.lg)
            make.top.bottom.equalToSuperview().inset(8)
        }
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }

        listView.backgroundColor = DS.Color.surface
        listView.separatorStyle = .none
        listView.rowHeight = UITableViewAutomaticDimension
        listView.estimatedRowHeight = 88
        listView.sectionHeaderTopPadding = 0
        listView.sectionHeaderHeight = UITableViewAutomaticDimension
        listView.estimatedSectionHeaderHeight = 36
        listView.sectionFooterHeight = 0
        listView.dataSource = self
        listView.delegate = self
        listView.allowsSelection = false
        listView.register(ChangeHistoryCell.self, forCellReuseIdentifier: ChangeHistoryCell.reuseId)
        listView.refreshControl = pullRefresh
        pullRefresh.addTarget(self, action: #selector(pulled), for: .valueChanged)
        footerSpinner.hidesWhenStopped = true
        footerSpinner.frame = CGRect(x: 0, y: 0, width: 44, height: 56)
        listView.tableFooterView = footerSpinner
        view.addSubview(listView)
        listView.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        view.addSubview(stateView)
        stateView.snp.makeConstraints { make in make.edges.equalTo(listView) }
        stateView.onRetry = { [weak self] in self?.load(reset: true) }
    }

    // MARK: - Loading

    @objc private func pulled() {
        load(reset: true)
    }

    private func load(reset: Bool) {
        if reset {
            generation += 1
            loading = false
        }
        guard !loading else { return }
        loading = true
        let token = generation
        let offset = reset ? 0 : fetched
        if reset && entries.isEmpty {
            stateView.isHidden = false
            stateView.show(.loading)
        } else if !reset {
            footerSpinner.startAnimating()
        }
        let completion: (ChangeHistoryPage?, NSError?) -> Void = { [weak self] page, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                self.loading = false
                self.pullRefresh.endRefreshing()
                self.footerSpinner.stopAnimating()
                guard let page else {
                    if self.entries.isEmpty {
                        self.stateView.isHidden = false
                        self.stateView.show(.error(error?.localizedDescription ?? ""))
                    } else if let error {
                        UIAlertController.errorAlert(parent: self, error: error)
                    }
                    return
                }
                self.apply(page, reset: reset)
            }
        }
        switch subject {
        case .order(let id, _, _):
            TabsV2APIService.shared.orderChanges(orderId: id, offset: offset, completion: completion)
        case .product(let id, _, _):
            TabsV2APIService.shared.productChanges(productId: id, offset: offset, completion: completion)
        }
    }

    private func apply(_ page: ChangeHistoryPage, reset: Bool) {
        entries = reset ? page.entries : ChangeHistoryLogic.merge(entries, page.entries)
        fetched = (reset ? 0 : fetched) + page.entries.count
        lastPageCount = page.entries.count
        total = page.total
        days = ChangeHistoryLogic.days(entries)
        if entries.isEmpty {
            stateView.isHidden = false
            stateView.show(.empty("history.empty".localized()))
        } else {
            stateView.isHidden = true
        }
        listView.reloadData()
    }

    private var hasMore: Bool {
        ChangeHistoryLogic.hasMore(loaded: fetched, total: total, lastPageCount: lastPageCount)
    }

    @objc private func goBack() {
        navigationController?.popViewController(animated: true)
    }
}

// MARK: - Table

extension ChangeHistoryViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        days.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        days[section].rows.count
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let view = UIView()
        view.backgroundColor = V2.sectionFill
        let label = V2.label(days[section].title, size: DS.TextSize.secondary, weight: .bold, color: UIColor(hexString: "475569"))
        label.accessibilityTraits = UIAccessibilityTraitHeader
        view.addSubview(label)
        label.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.bottom.equalToSuperview().offset(-6)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        let line = V2.divider()
        line.backgroundColor = UIColor(hexString: "F1F5F9")
        view.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        return view
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: ChangeHistoryCell.reuseId, for: indexPath) as! ChangeHistoryCell
        cell.configure(days[indexPath.section].rows[indexPath.row])
        return cell
    }

    /// Next page when the last rows come into view
    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        guard hasMore, !loading, indexPath.section == days.count - 1,
              indexPath.row >= days[indexPath.section].rows.count - 3 else { return }
        load(reset: false)
    }
}

// MARK: - Row

/// Initials avatar, kind title, "Label: old (struck) → new" lines and "15:10 · Nguyễn An (nhân viên)"
final class ChangeHistoryCell: UITableViewCell {
    static let reuseId = "ChangeHistoryCell"
    private let avatar = V2.label(size: 13, weight: .bold)
    private let titleLabel = V2.label(size: DS.TextSize.body, weight: .semibold, lines: 0)
    private let linesStack = UIStackView()
    private let footerLabel = V2.label(size: 13, color: UIColor(hexString: "64748B"), lines: 0)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        avatar.textAlignment = .center
        avatar.layer.cornerRadius = 18
        avatar.layer.masksToBounds = true
        avatar.isAccessibilityElement = false
        avatar.snp.makeConstraints { make in make.size.equalTo(36) }
        linesStack.axis = .vertical
        linesStack.spacing = 3
        let column = UIStackView(arrangedSubviews: [titleLabel, linesStack, footerLabel])
        column.axis = .vertical
        column.spacing = 3
        let row = UIStackView(arrangedSubviews: [avatar, column])
        row.alignment = .top
        row.spacing = 12
        contentView.addSubview(row)
        row.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg))
        }
        let line = V2.divider()
        line.backgroundColor = UIColor(hexString: "F1F5F9")
        contentView.addSubview(line)
        line.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        isAccessibilityElement = true
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    func configure(_ row: ChangeRow) {
        avatar.text = row.initials
        let colors = ChangeHistoryCell.colors(row.tone)
        avatar.backgroundColor = colors.fill
        avatar.textColor = colors.text
        titleLabel.text = row.title
        linesStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for line in row.lines {
            let label = UILabel()
            label.numberOfLines = 0
            label.attributedText = ChangeHistoryCell.attributed(line)
            linesStack.addArrangedSubview(label)
        }
        linesStack.isHidden = row.lines.isEmpty
        footerLabel.text = row.footer
        accessibilityLabel = ([row.title] + row.lines.map(ChangeHistoryCell.spoken) + [row.footer]).joined(separator: ". ")
    }

    private static func colors(_ tone: ChangeTone) -> (fill: UIColor, text: UIColor) {
        switch tone {
        case .created: return (UIColor(hexString: "D1FAE5"), UIColor(hexString: "047857"))
        case .note: return (UIColor(hexString: "FEF3C7"), UIColor(hexString: "92400E"))
        case .danger: return (UIColor(hexString: "FEE2E2"), UIColor(hexString: "991B1B"))
        case .staff: return (UIColor(hexString: "EDE9FE"), UIColor(hexString: "5B21B6"))
        case .owner: return (UIColor(hexString: "DBEAFE"), UIColor(hexString: "1E40AF"))
        }
    }

    /// "Ngày trả: 05/10 → 07/10" with the old value grey and struck through, the new one bold
    static func attributed(_ line: ChangeLine) -> NSAttributedString {
        let font = UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.secondary, weight: .regular)
        let base: [NSAttributedStringKey: Any] = [
            NSAttributedStringKey.font: font,
            NSAttributedStringKey.foregroundColor: UIColor(hexString: "334155"),
        ]
        guard let label = line.label else {
            return NSAttributedString(string: line.to, attributes: base)
        }
        let text = NSMutableAttributedString(string: label + ": ", attributes: base)
        if let from = line.from {
            text.append(NSAttributedString(string: from, attributes: [
                NSAttributedStringKey.font: font,
                NSAttributedStringKey.foregroundColor: UIColor(hexString: "94A3B8"),
                NSAttributedStringKey.strikethroughStyle: NSUnderlineStyle.styleSingle.rawValue,
            ]))
            text.append(NSAttributedString(string: " → ", attributes: base))
        }
        text.append(NSAttributedString(string: line.to, attributes: [
            NSAttributedStringKey.font: UIFont.monospacedDigitSystemFont(ofSize: DS.TextSize.secondary, weight: .semibold),
            NSAttributedStringKey.foregroundColor: DS.Color.text,
        ]))
        return text
    }

    /// VoiceOver: "Ngày trả: 05/10 → 07/10" reads the arrow as a word
    private static func spoken(_ line: ChangeLine) -> String {
        guard let label = line.label else { return line.to }
        guard let from = line.from else { return "\(label): \(line.to)" }
        return "\(label): \(from) \("history.spoken.to".localized()) \(line.to)"
    }
}
