//
//  OrdersViewController.swift
//  POS ADBD
//
//  Redesigned orders tab (#371), shown when the `newOrders` feature is on. Boards (#401):
//  Main ("Việc cần làm"), VL-tat-ca ("Tất cả đơn"), VL-ban ("Đơn bán", via the header button), VL-tim (search), Loc.
//

import UIKit
import SnapKit
import QRCodeReader
import AVFoundation
import AudioToolbox

final class OrdersViewController: BaseViewControler {
    private static let chipBorder = UIColor(hexString: "E2E8F0")
    private static let trackFill = UIColor(hexString: "F1F5F9")
    private static let statuses: [OrderStatus?] = [nil, .reserved, .pickuped, .returned, .cancelled]

    private let viewModel = OrdersHomeViewModel()
    private var isPullRefreshing = false
    /// Search mode (board VL-tim): the field has focus or holds a query
    private var isSearchMode = false
    /// The rent segment to go back to from "Đơn bán"
    private var rentSegment: OrdersSegment = .today

    private let headerStack = UIStackView()
    private let titleLabel = UILabel()
    private let modeButton = UIButton(type: .system)
    private let titleRow = UIStackView()
    private let searchBox = UIView()
    private let searchField = UITextField()
    private let scanButton = UIButton(type: .system)
    private let clearButton = UIButton(type: .system)
    private let cancelButton = UIButton(type: .system)
    private let segmentBar = UIStackView()
    private let todaySegment = OrdersSegmentPill()
    private let allSegment = OrdersSegmentPill()
    private let listControls = UIStackView()
    private var chipButtons: [UIButton] = []
    private let sortButton = UIButton(type: .system)
    private let countLabel = UILabel()
    private let searchSummary = UIView()
    private let searchSummaryLabel = UILabel()
    private let listView = UITableView(frame: .zero, style: .plain)
    private let stateView = OrdersStateView()

    private lazy var reader: QRCodeReaderViewController = {
        let builder = QRCodeReaderViewControllerBuilder {
            $0.reader = QRCodeReader(metadataObjectTypes: [.code39, .code128, .qr], captureDevicePosition: .back)
        }
        return QRCodeReaderViewController(builder: builder)
    }()

    private var hidesMoney: Bool {
        OrdersHomeLogic.hidesMoney(role: User.current()?.role, hideForStaff: Utils.shouldHideFinancialDataForStaff())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        navigationController?.setNavigationBarHidden(true, animated: false)
        setupUI()
        viewModel.onChange = { [weak self] in self?.render() }
        NotificationCenter.default.addObserver(self, selector: #selector(ordersChanged), name: OrdersChangeSignal.name, object: nil)
        viewModel.reload()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        // #674: back from a detail or the tab again: a quiet refresh only when an order changed or the list is old
        viewModel.refreshIfNeeded()
    }

    /// #674: an order was created or changed somewhere; refresh now when on screen, else on the next appear
    @objc private func ordersChanged() {
        viewModel.markDirty()
        if isViewLoaded, view.window != nil { viewModel.refreshIfNeeded() }
    }

    // MARK: - Layout

    override func setupUI() {
        view.backgroundColor = DS.Color.surface
        let header = buildHeader()
        buildListControls()
        buildSearchSummary()

        listView.backgroundColor = DS.Color.surface
        listView.separatorStyle = .none
        listView.rowHeight = UITableViewAutomaticDimension
        listView.estimatedRowHeight = 110
        listView.sectionHeaderHeight = UITableViewAutomaticDimension
        listView.estimatedSectionHeaderHeight = 36
        listView.sectionFooterHeight = 0
        if #available(iOS 15.0, *) { listView.sectionHeaderTopPadding = 0 }
        listView.keyboardDismissMode = .onDrag
        listView.dataSource = self
        listView.delegate = self
        listView.register(OrderRowCell.self, forCellReuseIdentifier: OrderRowCell.reuseId)
        listView.register(OrdersSectionHeaderView.self, forHeaderFooterViewReuseIdentifier: OrdersSectionHeaderView.reuseId)
        listView.contentInset.bottom = DS.Spacing.lg
        stateView.onRetry = { [weak self] in self?.viewModel.reload() }

        let column = UIStackView(arrangedSubviews: [header, listControls, searchSummary])
        column.axis = .vertical
        view.addSubview(column)
        view.addSubview(listView)
        column.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
        }
        listView.snp.makeConstraints { make in
            make.top.equalTo(column.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        configPullToRefresh(tableview: listView)
        updateHeader()
    }

    private func buildHeader() -> UIView {
        titleLabel.font = Utils.boldFont(size: DS.TextSize.title)
        titleLabel.textColor = DS.Color.text
        modeButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        modeButton.setTitleColor(DS.Color.text, for: .normal)
        modeButton.layer.cornerRadius = 10
        modeButton.layer.borderWidth = 1
        modeButton.layer.borderColor = Self.chipBorder.cgColor
        modeButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
        modeButton.addTarget(self, action: #selector(modeTapped), for: .touchUpInside)
        modeButton.snp.makeConstraints { make in make.height.equalTo(40) }
        titleRow.addArrangedSubview(titleLabel)
        titleRow.addArrangedSubview(UIView())
        titleRow.addArrangedSubview(modeButton)
        titleRow.alignment = .center

        // Search field with the scan button inside (board Main); clear button while searching (VL-tim)
        searchBox.layer.cornerRadius = 12
        searchBox.layer.borderColor = DS.Color.primary.cgColor
        let glass = UIImageView(image: DS.symbol("magnifyingglass", DS.Icon.sm))
        glass.tintColor = DS.Color.textMuted
        glass.contentMode = .center
        searchField.font = Utils.regularFont(size: DS.TextSize.body)
        searchField.textColor = DS.Color.text
        searchField.attributedPlaceholder = NSAttributedString(string: "orders.v2.search.placeholder".localized(), attributes: [
            NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
            NSAttributedString.Key.font: Utils.regularFont(size: DS.TextSize.body),
        ])
        searchField.accessibilityLabel = "orders.v2.search.placeholder".localized()
        searchField.autocorrectionType = .no
        searchField.autocapitalizationType = .none
        searchField.returnKeyType = .search
        searchField.delegate = self
        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchField.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        scanButton.setImage(DS.symbol("barcode.viewfinder", DS.Icon.sm), for: .normal)
        scanButton.tintColor = DS.Color.text
        scanButton.accessibilityLabel = "common.action.scanBarcode".localized()
        scanButton.addTarget(self, action: #selector(scanTapped), for: .touchUpInside)
        clearButton.setImage(DS.symbol("xmark", 14, weight: .semibold), for: .normal)
        clearButton.tintColor = DS.Color.text
        clearButton.backgroundColor = Self.chipBorder
        clearButton.layer.cornerRadius = 18
        clearButton.accessibilityLabel = "orders.v2.search.clear".localized()
        clearButton.addTarget(self, action: #selector(clearTapped), for: .touchUpInside)
        let fieldRow = UIStackView(arrangedSubviews: [glass, searchField, scanButton, clearButton])
        fieldRow.alignment = .center
        fieldRow.spacing = DS.Spacing.sm
        searchBox.addSubview(fieldRow)
        glass.snp.makeConstraints { make in make.size.equalTo(DS.Icon.sm) }
        searchField.snp.makeConstraints { make in make.height.equalTo(40) }
        scanButton.snp.makeConstraints { make in make.size.equalTo(40) }
        clearButton.snp.makeConstraints { make in make.size.equalTo(36) }
        fieldRow.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(12)
            make.trailing.equalToSuperview().offset(-2)
            make.centerY.equalToSuperview()
        }
        searchBox.snp.makeConstraints { make in make.height.equalTo(44) }
        cancelButton.setTitle("orders.v2.search.cancel".localized(), for: .normal)
        cancelButton.setTitleColor(DS.Color.primary, for: .normal)
        cancelButton.titleLabel?.font = Utils.mediumFont(size: DS.TextSize.body)
        cancelButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: 4)
        cancelButton.addTarget(self, action: #selector(cancelSearchTapped), for: .touchUpInside)
        cancelButton.setContentCompressionResistancePriority(.required, for: .horizontal)
        cancelButton.snp.makeConstraints { make in make.height.equalTo(44) }
        let searchRow = UIStackView(arrangedSubviews: [searchBox, cancelButton])
        searchRow.spacing = DS.Spacing.sm
        searchRow.alignment = .center

        // Two pill segments (board Main): "Việc cần làm" with its red badge, "Tất cả đơn"
        todaySegment.title = "To do".localized()
        allSegment.title = "All orders".localized()
        todaySegment.addTarget(self, action: #selector(todayTapped), for: .touchUpInside)
        allSegment.addTarget(self, action: #selector(allTapped), for: .touchUpInside)
        segmentBar.addArrangedSubview(todaySegment)
        segmentBar.addArrangedSubview(allSegment)
        segmentBar.distribution = .fillEqually
        segmentBar.backgroundColor = Self.trackFill
        segmentBar.layer.cornerRadius = 12
        segmentBar.isLayoutMarginsRelativeArrangement = true
        segmentBar.layoutMargins = UIEdgeInsets(top: 4, left: 4, bottom: 4, right: 4)

        headerStack.axis = .vertical
        headerStack.spacing = 10
        headerStack.isLayoutMarginsRelativeArrangement = true
        headerStack.layoutMargins = UIEdgeInsets(top: DS.Spacing.lg, left: DS.Spacing.lg, bottom: DS.Spacing.md, right: DS.Spacing.lg)
        [titleRow, searchRow, segmentBar].forEach { headerStack.addArrangedSubview($0) }

        let header = UIView()
        header.backgroundColor = DS.Color.surface
        header.addSubview(headerStack)
        let line = UIView()
        line.backgroundColor = DS.Color.border
        header.addSubview(line)
        headerStack.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        line.snp.makeConstraints { make in
            make.top.equalTo(headerStack.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(1)
        }
        return header
    }

    /// Status chips, the sort selector and the order count of "Tất cả đơn" (board VL-tat-ca)
    private func buildListControls() {
        chipButtons = Self.statuses.enumerated().map { index, status in
            let chip = UIButton(type: .system)
            chip.tag = index
            chip.setTitle(Self.chipTitle(status), for: .normal)
            chip.layer.cornerRadius = 18
            chip.contentEdgeInsets = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
            chip.addTarget(self, action: #selector(chipTapped(_:)), for: .touchUpInside)
            chip.snp.makeConstraints { make in make.height.equalTo(36) }
            return chip
        }
        let chips = UIStackView(arrangedSubviews: chipButtons)
        chips.spacing = DS.Spacing.sm
        let scroll = UIScrollView()
        scroll.showsHorizontalScrollIndicator = false
        scroll.addSubview(chips)
        chips.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 0, left: DS.Spacing.lg, bottom: 0, right: DS.Spacing.lg))
            make.height.equalToSuperview()
        }
        scroll.snp.makeConstraints { make in make.height.equalTo(36) }

        sortButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.secondary)
        sortButton.setTitleColor(DS.Color.primary, for: .normal)
        sortButton.tintColor = DS.Color.primary
        sortButton.setImage(DS.symbol("chevron.down", 14, weight: .semibold), for: .normal)
        sortButton.semanticContentAttribute = .forceRightToLeft
        sortButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: -4)
        sortButton.contentEdgeInsets = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 4)
        sortButton.addTarget(self, action: #selector(filterTapped), for: .touchUpInside)
        sortButton.snp.makeConstraints { make in make.height.equalTo(36) }
        countLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        countLabel.textColor = DS.Color.textMuted
        let sortRow = UIStackView(arrangedSubviews: [sortButton, UIView(), countLabel])
        sortRow.alignment = .center
        sortRow.isLayoutMarginsRelativeArrangement = true
        sortRow.layoutMargins = UIEdgeInsets(top: 6, left: DS.Spacing.lg, bottom: 6, right: DS.Spacing.lg)

        let divider = UIView()
        divider.backgroundColor = DS.Color.divider
        divider.snp.makeConstraints { make in make.height.equalTo(1) }

        let chipsWrap = UIView()
        chipsWrap.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.leading.trailing.bottom.equalToSuperview()
        }
        listControls.axis = .vertical
        [chipsWrap, sortRow, divider].forEach { listControls.addArrangedSubview($0) }
        listControls.backgroundColor = DS.Color.surface
    }

    private func buildSearchSummary() {
        searchSummaryLabel.font = Utils.regularFont(size: DS.TextSize.secondary)
        searchSummaryLabel.textColor = DS.Color.textMuted
        searchSummaryLabel.numberOfLines = 2
        searchSummary.addSubview(searchSummaryLabel)
        searchSummaryLabel.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(10)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-6)
        }
        let divider = UIView()
        divider.backgroundColor = DS.Color.divider
        searchSummary.addSubview(divider)
        divider.snp.makeConstraints { make in
            make.leading.trailing.bottom.equalToSuperview()
            make.height.equalTo(1)
        }
    }

    private static func chipTitle(_ status: OrderStatus?) -> String {
        switch status {
        case .none: return "orders.v2.status.all".localized()
        case .some(.reserved): return "orders.v2.status.reserved".localized()
        case .some(.pickuped): return "orders.v2.status.renting".localized()
        case .some(.returned): return "orders.v2.status.returned".localized()
        case .some(.cancelled): return "orders.v2.status.cancelled".localized()
        case .some(let other): return other.localizedDisplayName()
        }
    }

    override func startRefresh(_ sender: Any) {
        isPullRefreshing = true
        viewModel.reload(quiet: true) // #674: the rows stay under the pull spinner
    }

    // MARK: - Render

    private var isSaleMode: Bool { viewModel.segment == .sale }

    /// Title, mode button, segments and chips for the current mode
    private func updateHeader() {
        titleLabel.text = isSaleMode ? "orders.v2.title.sale".localized() : "orders.v2.title.rent".localized()
        modeButton.setTitle(isSaleMode ? "orders.v2.title.rent".localized() : "orders.v2.title.sale".localized(), for: .normal)
        titleRow.isHidden = isSearchMode
        segmentBar.isHidden = isSearchMode || isSaleMode || !viewModel.todayAvailable
        listControls.isHidden = isSearchMode || viewModel.segment != .rent
        searchSummary.isHidden = !isSearchMode || !viewModel.isSearching || viewModel.total == nil
        cancelButton.isHidden = !isSearchMode
        scanButton.isHidden = isSearchMode
        clearButton.isHidden = !isSearchMode || (searchField.text ?? "").isEmpty
        searchBox.backgroundColor = isSearchMode ? DS.Color.surface : Self.trackFill
        searchBox.layer.borderWidth = isSearchMode ? 2 : 0
        searchField.font = Utils.regularFont(size: isSearchMode ? 16 : 15)
        headerStack.layoutMargins.bottom = isSearchMode ? 10 : DS.Spacing.md

        todaySegment.isSelected = viewModel.segment == .today
        allSegment.isSelected = viewModel.segment == .rent
        todaySegment.badge = viewModel.todayBadge > 0 ? "\(viewModel.todayBadge)" : nil

        for (index, chip) in chipButtons.enumerated() {
            let selected = Self.statuses[index] == viewModel.filter.status
            chip.backgroundColor = selected ? DS.Color.text : DS.Color.surface
            chip.layer.borderWidth = selected ? 0 : 1
            chip.layer.borderColor = Self.chipBorder.cgColor
            chip.setTitleColor(selected ? .white : DS.Color.text, for: .normal)
            chip.titleLabel?.font = selected ? Utils.boldFont(size: DS.TextSize.secondary) : Utils.regularFont(size: DS.TextSize.secondary)
            chip.accessibilityTraits = selected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
        }
        sortButton.setTitle(OrdersFilterSheet.sortTitle(viewModel.filter.sort), for: .normal)
        countLabel.text = viewModel.total.map { PluralText.format("orders.v2.count", count: $0, $0) }
        if let total = viewModel.total {
            searchSummaryLabel.text = PluralText.format("orders.v2.search.summary", count: total, total, viewModel.searchText)
        }
    }

    private func render() {
        updateHeader()
        listView.reloadData()
        switch viewModel.state {
        case .loading where !isPullRefreshing:
            stateView.show(.loading)
            listView.backgroundView = stateView
        case .failed(let message):
            stopPullRefresh()
            stateView.show(.error(message))
            listView.backgroundView = stateView
        case .loaded where viewModel.sections.isEmpty:
            stopPullRefresh()
            let empty = viewModel.isSearching || viewModel.segment != .today ? "No orders found" : "Nothing to do today"
            stateView.show(.empty(empty.localized()))
            listView.backgroundView = stateView
        case .loading:
            break
        default:
            stopPullRefresh()
            listView.backgroundView = nil
        }
    }

    private func stopPullRefresh() {
        isPullRefreshing = false
        endRefresh()
    }

    // MARK: - Actions

    @objc private func modeTapped() {
        if isSaleMode {
            viewModel.select(viewModel.todayAvailable ? rentSegment : .rent)
        } else {
            rentSegment = viewModel.segment
            viewModel.select(.sale)
        }
        listView.setContentOffset(.zero, animated: false)
        updateHeader()
    }

    @objc private func todayTapped() {
        viewModel.select(.today)
        listView.setContentOffset(.zero, animated: false)
    }

    @objc private func allTapped() {
        viewModel.select(.rent)
        listView.setContentOffset(.zero, animated: false)
    }

    @objc private func chipTapped(_ sender: UIButton) {
        viewModel.selectStatus(Self.statuses[sender.tag])
        listView.setContentOffset(.zero, animated: false)
    }

    @objc private func filterTapped() {
        let sheet = OrdersFilterSheet(filter: viewModel.filter)
        sheet.onApply = { [weak self] filter in self?.viewModel.applyFilter(filter) }
        sheet.countProvider = { [weak self] filter, completion in self?.viewModel.count(for: filter, completion: completion) }
        present(sheet, animated: true)
    }

    @objc private func searchChanged() {
        viewModel.updateSearch(searchField.text ?? "")
        updateHeader()
    }

    @objc private func clearTapped() {
        searchField.text = ""
        searchChanged()
        searchField.becomeFirstResponder()
    }

    @objc private func cancelSearchTapped() {
        searchField.text = ""
        searchField.resignFirstResponder()
        isSearchMode = false
        viewModel.updateSearch("")
        updateHeader()
    }

    private func enterSearchMode() {
        guard !isSearchMode else { return }
        isSearchMode = true
        updateHeader()
    }

    @objc private func scanTapped() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                if granted { DispatchQueue.main.async { self.scanTapped() } }
            }
        case .authorized:
            reader.delegate = self
            reader.modalPresentationStyle = .formSheet
            present(reader, animated: true)
        default:
            let alert = UIAlertController(title: "common.permission.camera.title".localized(),
                                          message: "common.permission.camera.settingsMessage".localized(), preferredStyle: .alert)
            alert.addAction(UIAlertAction(title: "common.action.settings".localized(), style: .default) { _ in
                if let url = URL(string: UIApplicationOpenSettingsURLString) { UIApplication.shared.open(url) }
            })
            alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
            present(alert, animated: true)
        }
    }

    /// A scanned code becomes the search (rent and sale, every status)
    private func search(code: String) {
        isSearchMode = true
        searchField.text = code
        viewModel.updateSearch(code)
        updateHeader()
    }

    private func call(_ phone: String) {
        guard let url = URL(string: "tel://\(phone)"), UIApplication.shared.canOpenURL(url) else { return }
        UIApplication.shared.open(url)
    }

    /// Same flow as a push notification: load the detail by numeric id, then the current detail screen
    private func openOrder(id: Int) {
        if OrderDetailRouter.usesNewDetail {
            // The new detail loads the order itself; its actions post the orders-changed signal (#674)
            let detail = OrderDetailViewController(orderId: id)
            detail.hidesBottomBarWhenPushed = true
            navigationController?.pushViewController(detail, animated: true)
            return
        }
        showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: id) { [weak self] detail, error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                guard let detail else { return }
                let preview = OrderDetailRouter.detailController(for: Order.from(detail: detail), delegate: self)
                self.navigationController?.pushViewController(preview, animated: true)
            }
        }
    }

    private func context(for section: OrdersSection) -> OrderRowContext {
        if viewModel.isSearching { return .search }
        switch section.kind {
        case .late: return .work(isLate: true)
        case .today, .tomorrow: return .work(isLate: false)
        case .day: return .sale
        case .plain: return .list
        }
    }

    /// "giao 1 · trả 2" on a work band, "3 đơn · 1.630.000" on a sale day
    private func summary(for section: OrdersSection) -> String? {
        switch section.kind {
        case .late, .today, .tomorrow:
            let counts = OrdersHomeLogic.bandCounts(section.rows)
            return String(format: "orders.v2.band.work".localized(), counts.handOver, counts.takeBack)
        case .day:
            let sum = OrdersHomeLogic.saleDaySummary(section.rows)
            let count = PluralText.format("orders.v2.count", count: sum.count, sum.count)
            return hidesMoney ? count : "\(count) · \(MoneyFormatter.format(sum.amount))"
        case .plain:
            return nil
        }
    }
}

// MARK: - Table

extension OrdersViewController: UITableViewDataSource, UITableViewDelegate {
    func numberOfSections(in tableView: UITableView) -> Int {
        viewModel.sections.count
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        viewModel.sections[section].rows.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = listView.dequeueReusableCell(withIdentifier: OrderRowCell.reuseId, for: indexPath) as! OrderRowCell
        let section = viewModel.sections[indexPath.section]
        cell.configure(section.rows[indexPath.row], context: context(for: section), hidesMoney: hidesMoney)
        cell.onCall = { [weak self] phone in self?.call(phone) }
        return cell
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        let data = viewModel.sections[section]
        guard !viewModel.isSearching, let title = OrdersHomeLogic.sectionTitle(data) else { return nil }
        let header = listView.dequeueReusableHeaderFooterView(withIdentifier: OrdersSectionHeaderView.reuseId) as? OrdersSectionHeaderView
        header?.configure(title: title, summary: summary(for: data), style: data.style)
        return header
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        let data = viewModel.sections[section]
        return viewModel.isSearching || data.kind == .plain ? 0 : UITableViewAutomaticDimension
    }

    func tableView(_ tableView: UITableView, viewForFooterInSection section: Int) -> UIView? {
        nil
    }

    func tableView(_ tableView: UITableView, heightForFooterInSection section: Int) -> CGFloat {
        0
    }

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        let before = viewModel.sections[..<indexPath.section].reduce(0) { $0 + $1.rows.count }
        let total = viewModel.sections.reduce(0) { $0 + $1.rows.count }
        viewModel.loadMoreIfNeeded(displayedIndex: before + indexPath.row, total: total)
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        openOrder(id: viewModel.sections[indexPath.section].rows[indexPath.row].orderId)
    }
}

// MARK: - Search

extension OrdersViewController: UITextFieldDelegate {
    func textFieldDidBeginEditing(_ textField: UITextField) {
        enterSearchMode()
    }

    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
}

extension OrdersViewController: QRCodeReaderViewControllerDelegate {
    func readerDidCancel(_ reader: QRCodeReaderViewController) {
        dismiss(animated: true)
    }

    func reader(_ reader: QRCodeReaderViewController, didScanResult result: QRCodeReaderResult) {
        reader.stopScanning()
        AudioServicesPlaySystemSound(1016)
        let code = result.value.trimmingCharacters(in: .whitespacesAndNewlines)
        dismiss(animated: true) { [weak self] in
            guard !code.isEmpty else { return }
            self?.search(code: code)
        }
    }
}

// MARK: - Detail

extension OrdersViewController: PreviewViewControllerDelegate {
    func didCompleteOrder(sender: PreviewViewController, updatedOrder: Order?) {
        viewModel.markDirty()
    }
}

// MARK: - Segment pill

/// One segment of the pill control (board Main): white with a soft shadow when selected, optional red badge
final class OrdersSegmentPill: UIControl {
    private static let badgeFill = UIColor(hexString: "B91C1C")
    private let label = UILabel()
    private let badgeLabel = UILabel()

    var title: String? {
        get { label.text }
        set { label.text = newValue; accessibilityLabel = newValue }
    }

    var badge: String? {
        didSet {
            badgeLabel.text = badge
            badgeLabel.isHidden = badge == nil
        }
    }

    override var isSelected: Bool {
        didSet { applyState() }
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        layer.cornerRadius = 9
        label.font = Utils.mediumFont(size: DS.TextSize.body)
        badgeLabel.font = Utils.boldFont(size: DS.TextSize.pill)
        badgeLabel.textColor = .white
        badgeLabel.backgroundColor = Self.badgeFill
        badgeLabel.textAlignment = .center
        badgeLabel.layer.cornerRadius = 10
        badgeLabel.layer.masksToBounds = true
        badgeLabel.isHidden = true
        let stack = UIStackView(arrangedSubviews: [label, badgeLabel])
        stack.spacing = 6
        stack.alignment = .center
        stack.isUserInteractionEnabled = false
        addSubview(stack)
        stack.snp.makeConstraints { make in
            make.center.equalToSuperview()
            make.leading.greaterThanOrEqualToSuperview().offset(4)
        }
        badgeLabel.snp.makeConstraints { make in
            make.height.equalTo(20)
            make.width.greaterThanOrEqualTo(22)
        }
        snp.makeConstraints { make in make.height.equalTo(40) }
        isAccessibilityElement = true
        applyState()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        // Badge text gets 6pt side padding
        if let text = badgeLabel.text {
            let width = (text as NSString).size(withAttributes: [NSAttributedString.Key.font: badgeLabel.font as Any]).width + 12
            badgeLabel.snp.updateConstraints { make in make.width.greaterThanOrEqualTo(max(22, width)) }
        }
    }

    private func applyState() {
        backgroundColor = isSelected ? DS.Color.surface : .clear
        label.textColor = isSelected ? DS.Color.text : DS.Color.textMuted
        label.font = isSelected ? Utils.boldFont(size: DS.TextSize.body) : Utils.mediumFont(size: DS.TextSize.body)
        layer.shadowColor = DS.Color.text.cgColor
        layer.shadowOpacity = isSelected ? 0.1 : 0
        layer.shadowRadius = 1
        layer.shadowOffset = CGSize(width: 0, height: 1)
        accessibilityTraits = isSelected ? (UIAccessibilityTraitButton | UIAccessibilityTraitSelected) : UIAccessibilityTraitButton
    }
}

// MARK: - Loading / empty / error

final class OrdersStateView: UIView {
    enum State {
        case loading
        case empty(String)
        case error(String)
    }

    var onRetry: (() -> Void)?
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let messageLabel = UILabel()
    private let retryButton = UIButton(type: .system)

    override init(frame: CGRect) {
        super.init(frame: frame)
        messageLabel.font = Utils.regularFont(size: DS.TextSize.body)
        messageLabel.textColor = DS.Color.textMuted
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0
        retryButton.setTitle("Retry".localized(), for: .normal)
        retryButton.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        retryButton.tintColor = DS.Color.primary
        retryButton.addTarget(self, action: #selector(retryTapped), for: .touchUpInside)
        retryButton.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }
        let stack = UIStackView(arrangedSubviews: [spinner, messageLabel, retryButton])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = DS.Spacing.sm
        addSubview(stack)
        stack.snp.makeConstraints { make in
            make.centerY.equalToSuperview().offset(-60)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.xl)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func show(_ state: State) {
        switch state {
        case .loading:
            spinner.startAnimating()
            messageLabel.isHidden = true
            retryButton.isHidden = true
        case .empty(let message):
            spinner.stopAnimating()
            messageLabel.text = message
            messageLabel.isHidden = false
            retryButton.isHidden = true
        case .error(let message):
            spinner.stopAnimating()
            messageLabel.text = message.isEmpty ? "Something went wrong".localized() : message
            messageLabel.isHidden = false
            retryButton.isHidden = false
        }
    }

    @objc private func retryTapped() {
        onRetry?()
    }
}
