//
//  CustomersV2ListViewController.swift
//  POS ADBD
//
//  Redesigned customer list (#387, flag `newCustomers`). Two modes:
//  - `.pick` (board KH-chon): sheet from the new cart; "Khách mới" row, "GẦN ĐÂY", tapping a row picks it.
//  - `.browse` (board KH-ds): from Settings; title with the total, +, rows open the customer detail.
//

import UIKit
import SnapKit

final class CustomersV2ListViewController: BaseViewControler {
    enum Mode { case pick, browse }

    private let mode: Mode
    private let viewModel: CustomersV2ListViewModel
    private let listView = UITableView(frame: .zero, style: .plain)
    private let searchField = UITextField()
    private let searchDebouncer = DebounceManager(delay: 0.3)
    private let titleLabel = V2.label(size: 20, weight: .bold)
    private let emptyLabel = V2.label(size: DS.TextSize.body, color: DS.Color.textMuted, lines: 0)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)

    /// `.pick`: the chosen customer (the caller sets the cart and closes the sheet)
    var onPicked: ((Customer) -> Void)?

    init(mode: Mode, viewModel: CustomersV2ListViewModel = CustomersV2ListViewModel()) {
        self.mode = mode
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        viewModel.onChange = { [weak self] in self?.render() }
        viewModel.onError = { [weak self] error in
            guard let self else { return }
            UIAlertController.errorAlert(parent: self, error: error)
        }
        spinner.startAnimating()
        viewModel.reload()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    override func setupUI() {
        view.backgroundColor = .white
        let header = UIStackView()
        header.alignment = .center
        header.spacing = 4
        switch mode {
        case .pick:
            titleLabel.text = "customers.v2.pickTitle".localized()
            let close = CustomersV2UI.textButton("customers.v2.close".localized())
            close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
            let lead = UIView()
            lead.snp.makeConstraints { make in make.width.equalTo(8) }
            [lead, titleLabel, UIView(), close].forEach(header.addArrangedSubview)
        case .browse:
            let back = CustomersV2UI.iconButton("chevron.left", label: "products.cart.back".localized(), size: DS.Icon.lg)
            back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
            [back, titleLabel].forEach(header.addArrangedSubview)
            if PermissionManager.shared.canManageCustomers() {
                let add = CustomersV2UI.iconButton("plus", label: "customers.v2.add".localized(), size: DS.Icon.sm)
                add.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
                header.addArrangedSubview(add)
            }
            titleLabel.setContentHuggingPriority(UILayoutPriority(1), for: .horizontal)
        }

        searchField.addTarget(self, action: #selector(searchChanged), for: .editingChanged)
        searchField.delegate = self
        let search = CustomersV2UI.searchBox(searchField, placeholder: "customers.v2.searchPlaceholder".localized())
        [header, search, listView].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(mode == .pick ? 12 : 8)
            make.leading.equalToSuperview().offset(8)
            make.trailing.equalToSuperview().offset(-8)
            make.height.equalTo(DS.touchTarget)
        }
        search.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        let line = V2.divider()
        line.backgroundColor = mode == .browse ? DS.Color.border : .clear
        view.addSubview(line)
        line.snp.makeConstraints { make in
            make.top.equalTo(search.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview()
        }

        listView.backgroundColor = .white
        listView.separatorStyle = .none
        listView.rowHeight = UITableViewAutomaticDimension
        listView.estimatedRowHeight = 64
        listView.sectionHeaderTopPadding = 0
        listView.keyboardDismissMode = .onDrag
        listView.dataSource = self
        listView.delegate = self
        listView.register(CustomerV2Cell.self, forCellReuseIdentifier: CustomerV2Cell.reuseId)
        listView.register(NewCustomerRowCell.self, forCellReuseIdentifier: NewCustomerRowCell.reuseId)
        listView.register(CustomersV2SectionLabel.self, forHeaderFooterViewReuseIdentifier: CustomersV2SectionLabel.reuseId)
        listView.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }

        emptyLabel.textAlignment = .center
        [emptyLabel, spinner].forEach(view.addSubview)
        emptyLabel.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom).offset(mode == .pick ? 180 : 48)
            make.leading.trailing.equalToSuperview().inset(32)
        }
        spinner.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.top.equalTo(emptyLabel)
        }
        render()
    }

    private func render() {
        if mode == .browse {
            let count = NSMutableAttributedString(string: "customers.v2.title".localized(), attributes: [
                NSAttributedString.Key.font: Utils.boldFont(size: 20),
                NSAttributedString.Key.foregroundColor: DS.Color.text,
            ])
            if !viewModel.customers.isEmpty || viewModel.total > 0 {
                count.append(NSAttributedString(string: " · \(viewModel.total)", attributes: [
                    NSAttributedString.Key.font: Utils.mediumFont(size: DS.TextSize.body),
                    NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
                ]))
            }
            titleLabel.attributedText = count
        }
        let loading = viewModel.isLoading && viewModel.customers.isEmpty
        loading ? spinner.startAnimating() : spinner.stopAnimating()
        emptyLabel.isHidden = loading || !viewModel.customers.isEmpty
        emptyLabel.text = viewModel.query == nil ? "customers.v2.empty".localized() : "customers.v2.noMatch".localized()
        listView.reloadData()
    }

    // MARK: - Actions

    @objc private func closeTapped() {
        dismiss(animated: true)
    }

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func addTapped() {
        openNewCustomer()
    }

    @objc private func searchChanged() {
        let text = searchField.text
        searchDebouncer.debounce { [weak self] in self?.viewModel.setQuery(text) }
    }

    private func openNewCustomer() {
        let typed = searchField.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let form = NewCustomerViewController(mode: mode == .pick ? .pick : .browse, prefill: typed)
        form.onDone = { [weak self] customer in
            guard let self else { return }
            switch self.mode {
            case .pick:
                self.onPicked?(customer)
            case .browse:
                self.navigationController?.popViewController(animated: false)
                self.viewModel.reload()
                self.openDetail(customer)
            }
        }
        navigationController?.pushViewController(form, animated: true)
    }

    private func openDetail(_ customer: Customer) {
        let detail = CustomerDetailV2ViewController(customer: customer)
        detail.hidesBottomBarWhenPushed = true
        navigationController?.pushViewController(detail, animated: true)
    }

    private var showsNewRow: Bool { mode == .pick }
}

extension CustomersV2ListViewController: UITableViewDataSource, UITableViewDelegate {
    private var customerSection: Int { showsNewRow ? 1 : 0 }

    func numberOfSections(in tableView: UITableView) -> Int {
        showsNewRow ? 2 : 1
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        section == customerSection ? viewModel.customers.count : 1
    }

    func tableView(_ tableView: UITableView, viewForHeaderInSection section: Int) -> UIView? {
        guard mode == .pick, section == customerSection, viewModel.query == nil, !viewModel.customers.isEmpty else { return nil }
        let header = tableView.dequeueReusableHeaderFooterView(withIdentifier: CustomersV2SectionLabel.reuseId) as! CustomersV2SectionLabel
        header.titleLabel.text = "customers.v2.recent".localized()
        return header
    }

    func tableView(_ tableView: UITableView, heightForHeaderInSection section: Int) -> CGFloat {
        guard mode == .pick, section == customerSection, viewModel.query == nil, !viewModel.customers.isEmpty else { return 0 }
        return UITableViewAutomaticDimension
    }

    func tableView(_ tableView: UITableView, estimatedHeightForHeaderInSection section: Int) -> CGFloat {
        36
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if indexPath.section != customerSection {
            return tableView.dequeueReusableCell(withIdentifier: NewCustomerRowCell.reuseId, for: indexPath)
        }
        let cell = tableView.dequeueReusableCell(withIdentifier: CustomerV2Cell.reuseId, for: indexPath) as! CustomerV2Cell
        cell.configure(viewModel.customers[indexPath.row], showsChevron: mode == .browse)
        return cell
    }

    func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
        if indexPath.section == customerSection, indexPath.row >= viewModel.customers.count - 3 {
            viewModel.loadMore()
        }
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard indexPath.section == customerSection else {
            openNewCustomer()
            return
        }
        let customer = viewModel.customers[indexPath.row]
        switch mode {
        case .pick: onPicked?(customer)
        case .browse: openDetail(customer)
        }
    }
}

extension CustomersV2ListViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        searchDebouncer.cancel()
        viewModel.setQuery(textField.text)
        textField.resignFirstResponder()
        return true
    }
}
