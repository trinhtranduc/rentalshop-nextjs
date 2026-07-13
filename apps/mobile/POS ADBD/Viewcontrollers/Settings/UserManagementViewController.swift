//
//  UserManagementViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-XX.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

class UserManagementViewController: BaseViewControler {
    
    // MARK: - UI Components
    private lazy var userTableView: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.delegate = self
        table.dataSource = self
        table.backgroundColor = .backgroundPrimary
        table.separatorStyle = .none // Bỏ separator giữa các cells để card style nổi bật
        table.register(UserCell.self, forCellReuseIdentifier: String(describing: UserCell.self))
        table.tableHeaderView = UIView()
        table.tableFooterView = UIView()
        table.translatesAutoresizingMaskIntoConstraints = false
        table.rowHeight = UITableViewAutomaticDimension // Tự động điều chỉnh height
        table.estimatedRowHeight = 100 // Estimated height để optimize performance
        table.allowsSelection = true
        table.selectionFollowsFocus = true
        table.isUserInteractionEnabled = true
        return table
    }()
    
    override var tableView: UITableView? {
        get { return userTableView }
        set { /* Ignore setting since we're using userTableView */ }
    }
    
    private lazy var searchBar: UISearchBar = {
        let searchBar = UISearchBar()
        searchBar.delegate = self
        searchBar.backgroundColor = .white
        searchBar.placeholder = "Search users...".localized()
        searchBar.placeholderLabel?.font = Utils.regularFont(size: 16)
        searchBar.placeholderLabel?.textColor = .textTertiary
        searchBar.textField?.textColor = .textPrimary
        searchBar.textField?.font = Utils.regularFont(size: 16)
        
        // Configure text input traits
        searchBar.searchTextField.autocorrectionType = .no
        searchBar.searchTextField.autocapitalizationType = .none
        searchBar.searchTextField.spellCheckingType = .no
        searchBar.searchTextField.smartDashesType = .no
        searchBar.searchTextField.smartQuotesType = .no
        searchBar.searchTextField.smartInsertDeleteType = .no

        return searchBar
    }()
    
    private lazy var addButton: UIButton = {
        let button = UIButton(type: .system)
        button.setImage(UIImage(systemName: "plus"), for: .normal)
        button.tintColor = .black
        button.addTarget(self, action: #selector(addNewUser), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Properties
    private var users: [User] = []
    private var filteredUsers: [User] = []
    private var searchText: String = ""
    private var currentPage: Int = 1
    private var hasMore: Bool = true
    private var isLoading: Bool = false
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadUsers()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        // Reload data when returning to this screen
        loadUsers()
    }
    
    // MARK: - Setup
    override func setupUI() {
        super.setupUI()
       
        view.backgroundColor = .backgroundPrimary
        
        // Setup custom navigation bar
        setupNavigationBar()
        
        // Configure table view
        if #available(iOS 15.0, *) {
            userTableView.sectionHeaderTopPadding = 0
        }
        
        // Configure search bar
        searchBar.frame = CGRect(x: 0, y: 0, width: view.bounds.width, height: 56)
        searchBar.sizeToFit()
        
        // Add subviews in order: custom nav bar, search bar, then table view
        view.addSubview(searchBar)
        view.addSubview(userTableView)
        
        // Adjust content inset to account for navigation bar
        userTableView.contentInsetAdjustmentBehavior = .automatic
        
        // Configure pull-to-refresh using the BaseViewControler implementation
        configPullToRefresh(tableview: userTableView)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        // Remove table view from constraints if it exists
        userTableView.snp.removeConstraints()
        
        // Setup constraints
        guard let customNavBar = customNavBar else { return }
        
        searchBar.snp.remakeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.height.equalTo(56)
        }
        
        userTableView.snp.remakeConstraints { make in
            make.top.equalTo(searchBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "User Management".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
        
        // Add right button (add user)
        // Only show add button if user has canManageUsers permission
        if PermissionManager.shared.canManageUsers() {
            navBar.addRightButton(addButton)
        }
    }
    
    // MARK: - Data Loading
    private func loadUsers(page: Int = 1, search: String? = nil, completion: ((UsersResponse?, NSError?) -> Void)? = nil) {
        guard !isLoading else { return }
        isLoading = true
        
        showProgressText(text: "Loading...".localized())
        
        UserService.shared.getUsers(search: search, page: page, limit: 20, role: nil, isActive: nil, merchantId: nil, outletId: nil) { [weak self] response, error in
            guard let self = self else { return }
            self.isLoading = false
            self.hideProgress()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
                completion?(nil, error)
                return
            }
            
            guard let response = response, let users = response.users else {
                completion?(nil, nil)
                return
            }
            
            if page == 1 {
                self.users = users
            } else {
                self.users.append(contentsOf: users)
            }
            
            self.currentPage = page
            self.hasMore = response.hasMore ?? false
            self.filterUsers()
            self.userTableView.reloadData()
            completion?(response, nil)
        }
    }
    
    private func filterUsers() {
        if searchText.isEmpty {
            filteredUsers = users
        } else {
            let lowercasedSearch = searchText.lowercased()
            filteredUsers = users.filter { user in
                let name = (user.fullName ?? "").lowercased()
                let email = (user.email ?? "").lowercased()
                return name.contains(lowercasedSearch) || email.contains(lowercasedSearch)
            }
        }
    }
    
    // MARK: - Actions
    @objc private func addNewUser() {
        let formVC = UserFormViewController()
        formVC.delegate = self
        let navController = UINavigationController(rootViewController: formVC)
        present(navController, animated: true)
    }
    
    private func createUserMenu(for user: User, cell: UserCell) -> UIMenu {
        var actions: [UIAction] = []
        
        // Edit action
        let editAction = UIAction(
            title: "Edit".localized(),
            image: UIImage(systemName: "pencil")
        ) { [weak self] _ in
            self?.editUser(user)
        }
        actions.append(editAction)
        
        // Change password action
        let changePasswordAction = UIAction(
            title: "Change Password".localized(),
            image: UIImage(systemName: "key")
        ) { [weak self] _ in
            self?.changePassword(for: user)
        }
        actions.append(changePasswordAction)
        
        // Disable/Enable action
        let statusAction = UIAction(
            title: user.isActive ? "Disable".localized() : "Enable".localized(),
            image: UIImage(systemName: user.isActive ? "person.crop.circle.badge.xmark" : "person.crop.circle.badge.checkmark")
        ) { [weak self] _ in
            self?.toggleUserStatus(user)
        }
        actions.append(statusAction)
        
        // Delete action
        let deleteAction = UIAction(
            title: "Delete".localized(),
            image: UIImage(systemName: "trash"),
            attributes: .destructive
        ) { [weak self] _ in
            self?.deleteUser(user)
        }
        actions.append(deleteAction)
        
        return UIMenu(children: actions)
    }
    
    private func editUser(_ user: User) {
        let formVC = UserFormViewController()
        formVC.user = user
        formVC.delegate = self
        let navController = UINavigationController(rootViewController: formVC)
        present(navController, animated: true)
    }
    
    private func changePassword(for user: User) {
        let userName = user.fullName ?? user.email ?? "user".localized()
        let alert = UIAlertController(
            title: "Change Password".localized(),
            message: String(format: "Enter new password for %@".localized(), userName),
            preferredStyle: .alert
        )
        
        alert.addTextField { textField in
            textField.placeholder = "New Password".localized()
            textField.isSecureTextEntry = true
        }
        
        alert.addTextField { textField in
            textField.placeholder = "Confirm Password".localized()
            textField.isSecureTextEntry = true
        }
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Change".localized(), style: .default) { [weak self] _ in
            guard let self = self,
                  let passwordField = alert.textFields?[0],
                  let confirmField = alert.textFields?[1],
                  let password = passwordField.text,
                  let confirm = confirmField.text,
                  !password.isEmpty,
                  password == confirm else {
                UIAlertController.alert(
                    parent: self,
                    title: "Error".localized(),
                    message: "Passwords do not match".localized()
                )
                return
            }
            
            self.showProgressText(text: "Changing password...".localized())
            UserService.shared.changeUserPassword(userId: user.id, newPassword: password, confirmPassword: confirm) { [weak self] error in
                guard let self = self else { return }
                self.hideProgress()
                
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else {
                    UIAlertController.alert(
                        parent: self,
                        title: "Success".localized(),
                        message: "Password changed successfully".localized()
                    )
                }
            }
        })
        
        present(alert, animated: true)
    }
    
    private func toggleUserStatus(_ user: User) {
        let action = user.isActive ? "disable".localized() : "enable".localized()
        let actionCapitalized = user.isActive ? "Disable".localized() : "Enable".localized()
        let userName = user.fullName ?? user.email ?? "this user".localized()
        let alert = UIAlertController(
            title: String(format: "%@ User".localized(), actionCapitalized),
            message: String(format: "Are you sure you want to %@ %@?".localized(), action, userName),
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: actionCapitalized, style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.showProgressText(text: "Updating...".localized())
            UserService.shared.disableUser(userId: user.id, isActive: !user.isActive) { [weak self] error in
                guard let self = self else { return }
                self.hideProgress()
                
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else {
                    self.loadUsers()
                }
            }
        })
        
        present(alert, animated: true)
    }
    
    private func deleteUser(_ user: User) {
        let userName = user.fullName ?? user.email ?? "this user".localized()
        let alert = UIAlertController(
            title: "Delete User".localized(),
            message: String(format: "Are you sure you want to delete %@? This action cannot be undone.".localized(), userName),
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "Delete".localized(), style: .destructive) { [weak self] _ in
            guard let self = self else { return }
            self.showProgressText(text: "Deleting...".localized())
            UserService.shared.deleteUser(userId: user.id) { [weak self] error in
                guard let self = self else { return }
                self.hideProgress()
                
                if let error = error {
                    UIAlertController.errorAlert(parent: self, error: error)
                } else {
                    self.loadUsers()
                }
            }
        })
        
        present(alert, animated: true)
    }
    
    // MARK: - Pull to Refresh
    @objc override func startRefresh(_ sender: Any) {
        super.startRefresh(sender)
        currentPage = 1
        loadUsers(page: 1, search: searchText.isEmpty ? nil : searchText) { [weak self] _, _ in
            self?.endRefresh()
        }
    }
}

// MARK: - UITableViewDataSource
extension UserManagementViewController: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return filteredUsers.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(
            withIdentifier: String(describing: UserCell.self),
            for: indexPath
        ) as! UserCell
        
        cell.isUserInteractionEnabled = true
        cell.contentView.isUserInteractionEnabled = true
        cell.delegate = self
        
        let user = filteredUsers[indexPath.row]
        let searchWords = searchText.isEmpty ? nil : searchText.components(separatedBy: " ").filter { !$0.isEmpty }
        cell.bind(user: user, searchWords: searchWords)
        
        // Setup menu for more button
        cell.setupMoreButtonMenu(menu: createUserMenu(for: user, cell: cell))
        
        cell.selectionStyle = .default
        return cell
    }
}

// MARK: - UITableViewDelegate
extension UserManagementViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let user = filteredUsers[indexPath.row]
        editUser(user)
    }
}

// MARK: - UISearchBarDelegate
extension UserManagementViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        self.searchText = searchText
        filterUsers()
        userTableView.reloadData()
        
        // Debounce search API call
        NSObject.cancelPreviousPerformRequests(withTarget: self, selector: #selector(performSearch), object: nil)
        perform(#selector(performSearch), with: nil, afterDelay: 0.5)
    }
    
    @objc private func performSearch() {
        currentPage = 1
        loadUsers(page: 1, search: searchText.isEmpty ? nil : searchText)
    }
    
    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
        performSearch()
    }
}

// MARK: - UserCellDelegate
extension UserManagementViewController: UserCellDelegate {
    func more(user: User?, sender: UserCell) {
        // Menu is handled by UIMenu on moreButton
        // This delegate method is kept for backward compatibility
    }
}

// MARK: - UserFormViewControllerDelegate
extension UserManagementViewController: UserFormViewControllerDelegate {
    func didCreateUser(user: User) {
        loadUsers()
    }
    
    func didUpdateUser(user: User) {
        loadUsers()
    }
}

