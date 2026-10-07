//
//  CategoryManageViewController.swift
//  POS ADBD
//
//  #632: the one category screen. From the product form it picks ("Không chọn" + the shop's categories, ✓ on the
//  current one, a tap picks and goes back); from Cài đặt → Danh mục it only manages. Both: search (accent-insensitive),
//  + adds (MERCHANT, OUTLET_ADMIN; in pick mode the new one is picked), ⋯ renames / deletes (MERCHANT; never the
//  default category). The API is the real gate (POST products.manage; PUT/DELETE MERCHANT and ADMIN only).
//

import UIKit
import SnapKit

final class CategoryManageViewController: BaseViewControler {
    /// Pick mode (product form): called with the chosen category, nil for "Không chọn"; the screen closes itself
    var onPick: ((Category?) -> Void)?
    /// Pick mode: the form's current category
    var selectedId: Int?
    /// Called with the fresh list after every load, so the product form can update its choice
    var onChange: (([Category]) -> Void)?

    private var categories: [Category] = []
    private var query = ""
    private let table = UITableView(frame: .zero, style: .plain)
    private let search = UISearchBar()
    private let emptyLabel = V2.label("products.category.empty".localized(), size: DS.TextSize.body, color: DS.Color.textMuted)

    private var picking: Bool { onPick != nil }
    private var canAdd: Bool { CategoryRules.canAdd(role: ProductAccess.currentRole, permissions: ProductAccess.currentPermissions) }
    /// Rename / delete: MERCHANT only, like `PUT`/`DELETE /api/categories/{id}`
    private var canManage: Bool { CategoryRules.canManage(role: ProductAccess.currentRole) }
    private var shown: [Category] { categories.filter { CategoryRules.matches($0.name, query: query) } }
    /// Pick mode shows "Không chọn" first while the search box is empty
    private var showsNone: Bool { picking && query.trimmingCharacters(in: .whitespaces).isEmpty }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        var trailing: [UIView] = []
        if canAdd {
            let add = CustomersV2UI.iconButton("plus", label: "products.category.addTitle".localized(), size: DS.Icon.sm)
            add.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
            trailing.append(add)
        }
        let line = SettingsDetailV2.installHeader(on: view, title: "products.form.category".localized(), back: back, trailing: trailing)

        search.placeholder = "products.category.search".localized()
        search.searchBarStyle = .minimal
        search.autocapitalizationType = .none
        search.delegate = self
        view.addSubview(search)
        search.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom).offset(4)
            make.leading.trailing.equalToSuperview().inset(8)
        }

        table.dataSource = self
        table.delegate = self
        table.backgroundColor = .white
        table.rowHeight = UITableViewAutomaticDimension
        table.estimatedRowHeight = 56
        table.keyboardDismissMode = .onDrag
        table.register(UITableViewCell.self, forCellReuseIdentifier: "CategoryCell")
        view.addSubview(table)
        table.snp.makeConstraints { make in
            make.top.equalTo(search.snp.bottom)
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

    /// Pushed (pop) or presented over the product form (dismiss)
    @objc private func backTapped() {
        close()
    }

    private func close() {
        if let nav = navigationController, nav.viewControllers.first !== self {
            nav.popViewController(animated: true)
        } else {
            dismiss(animated: true)
        }
    }

    private func pick(_ category: Category?) {
        onPick?(category)
        close()
    }

    // MARK: - Data

    private func load(thenPick pickId: Int? = nil) {
        CategoryService.shared.loadCategories(keyword: nil, page: 1, limit: 100) { [weak self] response, error in
            DispatchQueue.main.async {
                guard let self else { return }
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                self.categories = (response?.categories ?? []).filter { $0.isActive != false && $0.id != nil }
                self.onChange?(self.categories)
                if let pickId, self.picking, let created = self.categories.first(where: { $0.id == pickId }) {
                    self.pick(created)
                    return
                }
                self.reload()
            }
        }
    }

    private func reload() {
        emptyLabel.isHidden = !shown.isEmpty || showsNone
        table.reloadData()
    }

    /// Runs one API call with the progress HUD; reloads the list when it succeeds
    private func run(thenPick: Bool = false, _ call: (@escaping (NSError?, Int?) -> Void) -> Void) {
        showProgressText(text: "Loading...".localized())
        call { [weak self] error, id in
            DispatchQueue.main.async {
                guard let self else { return }
                self.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: self, error: error)
                    return
                }
                self.load(thenPick: thenPick ? id : nil)
            }
        }
    }

    // MARK: - Actions

    /// + : in pick mode the new category is picked straight away
    @objc private func addTapped() {
        Self.promptName(on: self, title: "products.category.addTitle".localized(), initial: nil) { [weak self] name in
            self?.run(thenPick: true) { done in
                CategoryService.shared.createCategory(withValues: ["name": name]) { category, error in done(error, category?.id) }
            }
        }
    }

    private func showActions(for category: Category, from source: UIView) {
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
        sheet.popoverPresentationController?.sourceView = source
        sheet.popoverPresentationController?.sourceRect = source.bounds
        present(sheet, animated: true)
    }

    private func rename(_ category: Category) {
        guard let id = category.id else { return }
        Self.promptName(on: self, title: "products.category.renameTitle".localized(), initial: category.name) { [weak self] name in
            self?.run { done in
                CategoryService.shared.updateCategory(categoryId: id, withValues: ["name": name]) { _, error in done(error, nil) }
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
                CategoryService.shared.deleteCategory(categoryId: id) { error in done(error, nil) }
            }
        })
        present(alert, animated: true)
    }

    @objc private func moreTapped(_ sender: UIButton) {
        let list = shown
        guard sender.tag >= 0, sender.tag < list.count else { return }
        showActions(for: list[sender.tag], from: sender)
    }

    // MARK: - Name prompt

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

extension CategoryManageViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        query = searchText
        reload()
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}

extension CategoryManageViewController: UITableViewDataSource, UITableViewDelegate {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        shown.count + (showsNone ? 1 : 0)
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "CategoryCell", for: indexPath)
        var content = cell.defaultContentConfiguration()
        content.textProperties.font = Utils.regularFont(size: DS.TextSize.body)
        cell.accessoryView = nil
        cell.accessoryType = .none
        cell.selectionStyle = picking ? .default : .none

        if showsNone && indexPath.row == 0 {
            content.text = "products.form.noCategory".localized()
            content.textProperties.color = DS.Color.textMuted
            cell.contentConfiguration = content
            cell.accessoryType = selectedId == nil ? .checkmark : .none
            return cell
        }
        let index = indexPath.row - (showsNone ? 1 : 0)
        let category = shown[index]
        content.text = category.name
        if category.isDefault == true {
            content.secondaryText = "products.category.default".localized()
            content.secondaryTextProperties.color = DS.Color.textMuted
        }
        cell.contentConfiguration = content
        let checked = picking && category.id == selectedId
        if canManage {
            let more = UIButton(type: .system)
            more.setImage(UIImage(systemName: "ellipsis"), for: .normal)
            if checked {
                // ✓ and ⋯ together: the check sits left of the menu
                let check = UIImageView(image: UIImage(systemName: "checkmark"))
                check.tintColor = APP_TONE_COLOR
                let stack = UIStackView(arrangedSubviews: [check, more])
                stack.spacing = 12
                stack.alignment = .center
                stack.frame = CGRect(x: 0, y: 0, width: 72, height: 44)
                cell.accessoryView = stack
            } else {
                more.frame = CGRect(x: 0, y: 0, width: 44, height: 44)
                cell.accessoryView = more
            }
            more.tintColor = DS.Color.textMuted
            more.tag = index
            more.accessibilityLabel = "products.category.actions".localized()
            more.addTarget(self, action: #selector(moreTapped(_:)), for: .touchUpInside)
        } else if checked {
            cell.accessoryType = .checkmark
        }
        return cell
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        guard picking else { return }
        if showsNone && indexPath.row == 0 {
            pick(nil)
            return
        }
        pick(shown[indexPath.row - (showsNone ? 1 : 0)])
    }
}
