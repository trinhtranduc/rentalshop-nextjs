//
//  CategoryManageViewController.swift
//  POS ADBD
//
//  #632: "Quản lý danh mục" opened from the product form's category picker (MERCHANT). Lists the shop's categories;
//  tap a row to rename it or delete it (never the default one). Add uses the same name prompt as the picker.
//  The API is the real gate (PUT/DELETE /api/categories/{id} accept MERCHANT and ADMIN only).
//

import UIKit
import SnapKit

final class CategoryManageViewController: BaseViewControler {
    /// Called with the fresh list after every change, so the product form can update its choice
    var onChange: (([Category]) -> Void)?

    private var categories: [Category] = []
    private let table = UITableView(frame: .zero, style: .plain)
    private let emptyLabel = V2.label("products.category.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let add = CustomersV2UI.iconButton("plus", label: "products.category.addTitle".localized(), size: DS.Icon.sm)
        add.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "products.category.manage".localized(), back: back, trailing: [add])

        table.dataSource = self
        table.delegate = self
        table.backgroundColor = .white
        table.rowHeight = 56
        table.register(UITableViewCell.self, forCellReuseIdentifier: "CategoryCell")
        view.addSubview(table)
        table.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        emptyLabel.textAlignment = .center
        emptyLabel.isHidden = true
        view.addSubview(emptyLabel)
        emptyLabel.snp.makeConstraints { make in
            make.center.equalTo(table)
        }
        load()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
    }

    @objc private func backTapped() {
        dismiss(animated: true)
    }

    // MARK: - Data

    private func load() {
        CategoryService.shared.loadCategories(keyword: nil, page: 1, limit: 100) { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                self.categories = (response?.categories ?? []).filter { $0.isActive != false && $0.id != nil }
                self.emptyLabel.isHidden = !self.categories.isEmpty
                self.table.reloadData()
                self.onChange?(self.categories)
            }
        }
    }

    /// Runs one API call with the progress HUD; reloads the list when it succeeds
    private func run(_ call: (@escaping (NSError?) -> Void) -> Void) {
        showProgressText(text: "Loading...".localized())
        call { [weak self] error in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                self.load()
            }
        }
    }

    // MARK: - Actions

    @objc private func addTapped() {
        Self.promptName(on: self, title: "products.category.addTitle".localized(), initial: nil) { [weak self] name in
            self?.run { done in
                CategoryService.shared.createCategory(withValues: ["name": name]) { _, error in done(error) }
            }
        }
    }

    private func rename(_ category: Category) {
        guard let id = category.id else { return }
        Self.promptName(on: self, title: "products.category.renameTitle".localized(), initial: category.name) { [weak self] name in
            self?.run { done in
                CategoryService.shared.updateCategory(categoryId: id, withValues: ["name": name]) { _, error in done(error) }
            }
        }
    }

    private func delete(_ category: Category) {
        guard let id = category.id else { return }
        let title = String(format: "products.category.deleteTitle".localized(), category.name ?? "")
        let alert = UIAlertController(title: title, message: nil, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "products.category.delete".localized(), style: .destructive) { [weak self] _ in
            self?.run { done in
                CategoryService.shared.deleteCategory(categoryId: id) { error in done(error) }
            }
        })
        present(alert, animated: true)
    }

    // MARK: - Name prompt (shared with the product form)

    /// Text field alert; calls back with the trimmed name only when it passes `CategoryRules.validateName`
    static func promptName(on presenter: UIViewController, title: String, initial: String?, completion: @escaping (String) -> Void) {
        let alert = UIAlertController(title: title, message: nil, preferredStyle: .alert)
        alert.addTextField { field in
            field.text = initial
            field.placeholder = "products.category.namePlaceholder".localized()
            field.autocapitalizationType = .sentences
            field.clearButtonMode = .whileEditing
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "products.category.save".localized(), style: .default) { [weak presenter] _ in
            guard let presenter else { return }
            let name = (alert.textFields?.first?.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            if let problem = CategoryRules.validateName(name) {
                let key: String
                switch problem {
                case .required: key = "products.category.nameRequired"
                case .tooShort: key = "products.category.nameTooShort"
                case .tooLong: key = "products.category.nameTooLong"
                }
                let error = NSError.errorWithOwnMessage(message: key.localized(), domain: "RC")
                UIAlertController.errorAlert(parent: presenter, error: error) { _ in
                    promptName(on: presenter, title: title, initial: name, completion: completion)
                }
                return
            }
            completion(name)
        })
        presenter.present(alert, animated: true)
    }
}

extension CategoryManageViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        categories.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "CategoryCell", for: indexPath)
        let category = categories[indexPath.row]
        var content = cell.defaultContentConfiguration()
        content.text = category.name
        content.textProperties.font = Utils.regularFont(size: DS.TextSize.body)
        if category.isDefault == true {
            content.secondaryText = "products.category.default".localized()
            content.secondaryTextProperties.color = DS.Color.textMuted
        }
        cell.contentConfiguration = content
        cell.accessoryType = .disclosureIndicator
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let category = categories[indexPath.row]
        let sheet = UIAlertController(title: category.name, message: nil, preferredStyle: .actionSheet)
        sheet.addAction(UIAlertAction(title: "products.category.rename".localized(), style: .default) { [weak self] _ in
            self?.rename(category)
        })
        if CategoryRules.canDelete(category) {
            sheet.addAction(UIAlertAction(title: "products.category.delete".localized(), style: .destructive) { [weak self] _ in
                self?.delete(category)
            })
        }
        sheet.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        if let cell = tableView.cellForRow(at: indexPath) {
            sheet.popoverPresentationController?.sourceView = cell
            sheet.popoverPresentationController?.sourceRect = cell.bounds
        }
        present(sheet, animated: true)
    }
}
