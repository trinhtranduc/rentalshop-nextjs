//
//  CountryPickerV2ViewController.swift
//  POS ADBD
//
//  #1539 (app): "Quốc gia" of create-store step 1. A search box (any case, no accents), Việt Nam first, then every
//  country by its name in the app language (`SignupCountries`). Picking a row calls `onSelect` and goes back.
//

import UIKit
import SnapKit

final class CountryPickerV2ViewController: BaseViewControler {
    private let countries = SignupCountries.list()
    private var shown: [SignupCountry] = []
    private let selectedCode: String
    private let onSelect: (String) -> Void

    private let searchBar = UISearchBar()
    private let table = UITableView(frame: .zero, style: .plain)
    private let emptyLabel = UILabel()

    init(selected: String, onSelect: @escaping (String) -> Void) {
        selectedCode = selected
        self.onSelect = onSelect
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        shown = countries
        setupUI()
        setStatusBarStyle(.darkContent)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: animated)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        if let row = shown.firstIndex(where: { $0.code == selectedCode }), searchBar.text?.isEmpty ?? true {
            table.scrollToRow(at: IndexPath(row: row, section: 0), at: .middle, animated: false)
        }
    }

    override func setupUI() {
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "authv2.country".localized(), back: back)

        searchBar.searchBarStyle = .minimal
        searchBar.placeholder = "authv2.country.search".localized()
        searchBar.delegate = self
        searchBar.searchTextField.font = Utils.regularFont(size: DS.TextSize.input)
        searchBar.searchTextField.autocorrectionType = .no
        searchBar.searchTextField.spellCheckingType = .no
        searchBar.searchTextField.returnKeyType = .done
        searchBar.searchTextField.accessibilityIdentifier = "countrySearch"

        table.dataSource = self
        table.delegate = self
        table.rowHeight = AuthV2Style.fieldHeight
        table.separatorInset = UIEdgeInsets(top: 0, left: AuthV2Style.sideInset, bottom: 0, right: 0)
        table.keyboardDismissMode = .onDrag
        table.tableFooterView = UIView()
        table.register(UITableViewCell.self, forCellReuseIdentifier: "country")

        emptyLabel.text = "authv2.country.empty".localized()
        emptyLabel.font = Utils.regularFont(size: DS.TextSize.body)
        emptyLabel.textColor = AuthV2Style.textMuted
        emptyLabel.textAlignment = .center
        emptyLabel.numberOfLines = 0
        emptyLabel.isHidden = true

        [searchBar, table, emptyLabel].forEach(view.addSubview)
        searchBar.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom).offset(4)
            make.leading.trailing.equalTo(view.readableColumn()).inset(AuthV2Style.sideInset - 8)
        }
        table.snp.makeConstraints { make in
            make.top.equalTo(searchBar.snp.bottom).offset(4)
            make.leading.trailing.equalTo(view.readableColumn())
            make.bottom.equalToSuperview()
        }
        emptyLabel.snp.makeConstraints { make in
            make.top.equalTo(table).offset(32)
            make.leading.trailing.equalTo(view.readableColumn()).inset(AuthV2Style.sideInset)
        }
    }

    @objc private func backTapped() {
        view.endEditing(true)
        navigationController?.popViewController(animated: true)
    }

    private func filter(_ query: String) {
        shown = SignupCountries.search(query, in: countries)
        emptyLabel.isHidden = !shown.isEmpty
        table.reloadData()
    }
}

extension CountryPickerV2ViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        filter(searchText)
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}

extension CountryPickerV2ViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        shown.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "country", for: indexPath)
        let country = shown[indexPath.row]
        let selected = country.code == selectedCode
        var content = cell.defaultContentConfiguration()
        content.text = country.name
        content.textProperties.font = selected ? Utils.boldFont(size: DS.TextSize.input) : Utils.regularFont(size: DS.TextSize.input)
        content.textProperties.color = AuthV2Style.text
        content.directionalLayoutMargins.leading = AuthV2Style.sideInset
        cell.contentConfiguration = content
        cell.tintColor = AuthV2Style.primary
        cell.accessoryType = selected ? .checkmark : .none
        cell.accessibilityIdentifier = "country-\(country.code)"
        cell.accessibilityTraits = selected ? UIAccessibilityTraitButton | UIAccessibilityTraitSelected : UIAccessibilityTraitButton
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        view.endEditing(true)
        onSelect(shown[indexPath.row].code)
        navigationController?.popViewController(animated: true)
    }
}
