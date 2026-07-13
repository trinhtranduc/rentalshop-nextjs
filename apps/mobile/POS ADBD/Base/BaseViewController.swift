//
//  BaseViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/24/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import MBProgressHUD
//import Firebase
import PullToRefresh
import SnapKit

extension UINavigationController{
    func presentController(size: CGSize, controller: BaseViewControler, completion: (() -> Void)?){
//        if UIDevice.current.userInterfaceIdiom == .pad{
//            let width = ModalSize.custom(size: Float(size.width))
//            let height = ModalSize.custom(size: Float(size.height))
//            let center = ModalCenterPosition.center
//            let customType = PresentationType.custom(width: width, height:height, center: center)
//            
//            let customPresenter = Presentr(presentationType: customType)
//            
//            customPresenter.transitionType = .crossDissolve
//            customPresenter.dismissTransitionType = .crossDissolve
//            customPresenter.roundCorners = true
//            customPresenter.backgroundColor = .black
//            customPresenter.backgroundOpacity = 0.5
//            customPresenter.dismissOnSwipe = false
//            customPresenter.dismissAnimated = false
//            customPresenter.dismissOnSwipeDirection = .default
//            
//            customPresentViewController(customPresenter, viewController: controller, animated: true, completion: completion)
//        }else{
//            self.navigationController?.present(controller, animated: true, completion: completion)
//        }
    }
}

private let PageSize = 50

class BaseViewControler : UIViewController{
    
    var tableView: UITableView?

    private var refreshControl : UIRefreshControl?
    private var dataSourceCount = PageSize
    
    // MARK: - Status Bar Management
    private lazy var statusBarBackgroundView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.isHidden = true // Hidden by default, will be shown when needed
        return view
    }()
    
    /// Setup status bar background view with specified color
    /// - Parameter color: Background color for status bar area (default: .white)
    func setupStatusBarBackground(color: UIColor = .white) {
        // Add status bar background view if not already added
        if statusBarBackgroundView.superview == nil {
            view.addSubview(statusBarBackgroundView)
            
            statusBarBackgroundView.snp.makeConstraints { make in
                make.top.equalToSuperview()
                make.leading.trailing.equalToSuperview()
                make.bottom.equalTo(view.safeAreaLayoutGuide.snp.top)
            }
        }
        
        statusBarBackgroundView.backgroundColor = color
        statusBarBackgroundView.isHidden = false
    }
    
    /// Setup status bar style callback for RCCustomNavigationBar
    /// This should be called after creating customNavBar to automatically sync status bar style
    /// - Parameter customNavBar: The RCCustomNavigationBar instance to setup
    func setupStatusBarStyleCallback(for customNavBar: RCCustomNavigationBar) {
        customNavBar.onStatusBarStyleChanged = { [weak self] style in
            self?.setStatusBarStyle(style)
        }
    }
    
    /// Hide status bar background view
    func hideStatusBarBackground() {
        statusBarBackgroundView.isHidden = true
    }
    
    /// Show status bar background view
    func showStatusBarBackground() {
        statusBarBackgroundView.isHidden = false
    }
    
    // MARK: - Navigation Bar Management
    /// Back action type for navigation bar
    enum NavigationBackAction {
        case pop                    // Pop current view controller
        case popToRoot              // Pop to root view controller
        case custom(() -> Void)     // Custom action
    }
    
    /// Stored navigation bar configuration
    private var navigationBarConfig: (navBar: RCCustomNavigationBar, backAction: NavigationBackAction)?
    
    /// Stored custom navigation bar instance (created automatically when using title-only setup)
    /// This property is accessible to subclasses for constraints or further customization
    var customNavBar: RCCustomNavigationBar?
    
    // MARK: - Navigation Bar Setup Helper
    
    /// Setup custom navigation bar with just a title string (simplified version)
    /// This method automatically creates the RCCustomNavigationBar instance
    /// - Parameters:
    ///   - title: Title string - will create a custom title label with standard styling (size 24, extraBold)
    ///   - statusBarBackgroundColor: Background color for status bar area (default: .white)
    ///   - titleCentered: Whether to center the title (default: true)
    ///   - hideBackButton: Whether to hide the back button (default: true)
    ///   - backAction: Type of back action (default: .pop)
    /// - Returns: The created RCCustomNavigationBar instance for further customization if needed
    @discardableResult
    func setupCustomNavigationBar(
        title: String,
        statusBarBackgroundColor: UIColor = .white,
        titleCentered: Bool = true,
        hideBackButton: Bool = true,
        backAction: NavigationBackAction = .pop
    ) -> RCCustomNavigationBar {
        // Create customNavBar automatically (title will be set via setupCustomNavigationBar)
        let navBar = RCCustomNavigationBar()
        customNavBar = navBar
        
        // Call the main setup method
        setupCustomNavigationBar(
            navBar,
            title: title,
            statusBarBackgroundColor: statusBarBackgroundColor,
            titleCentered: titleCentered,
            hideBackButton: hideBackButton,
            backAction: backAction
        )
        
        return navBar
    }
    
    /// Setup custom navigation bar with common configuration and back button handling
    /// Use this method when you need to provide your own RCCustomNavigationBar instance (e.g., for adding custom buttons)
    /// - Parameters:
    ///   - customNavBar: The RCCustomNavigationBar instance to setup
    ///   - title: Title string - if provided, will create a custom title label with standard styling (size 24, extraBold)
    ///   - statusBarBackgroundColor: Background color for status bar area (default: .white)
    ///   - titleCentered: Whether to center the title (default: true)
    ///   - customTitleView: Optional custom title view to replace default title label (overrides title parameter)
    ///   - hideBackButton: Whether to hide the back button (default: true)
    ///   - backAction: Type of back action (default: .pop)
    func setupCustomNavigationBar(
        _ customNavBar: RCCustomNavigationBar,
        title: String? = nil,
        statusBarBackgroundColor: UIColor = .white,
        titleCentered: Bool = true,
        customTitleView: UIView? = nil,
        hideBackButton: Bool = true,
        backAction: NavigationBackAction = .pop
    ) {
        // Store customNavBar reference for access in subclasses
        self.customNavBar = customNavBar
        
        // Store configuration for viewWillDisappear handling
        navigationBarConfig = (customNavBar, backAction)
        
        // Hide default navigation bar
        navigationController?.setNavigationBarHidden(true, animated: false)
        
        // Setup status bar background
        setupStatusBarBackground(color: statusBarBackgroundColor)
        
        // Setup custom navigation bar background color
        customNavBar.barBackgroundColor = statusBarBackgroundColor
        
        // Setup back button visibility
        if hideBackButton {
            customNavBar.hideBackButton()
        } else {
            customNavBar.showBackButton()
        }
        
        // Setup back button callback (only if back button is visible)
        if !hideBackButton {
            customNavBar.onBackTapped = { [weak self] in
                self?.handleNavigationBackAction(backAction)
            }
        }
        
        // Add custom navigation bar to view
        view.addSubview(customNavBar)
        
        // Setup title
        if let customTitle = customTitleView {
            // Use provided custom title view
            // When using customTitleView, we don't need to setup titleLabel constraints
            // The customTitleView will handle its own layout
            customNavBar.setCustomTitleView(customTitle, centered: titleCentered)
        } else if let titleText = title {
            // Create custom title label with standard styling
            let titleLabel = UILabel()
            titleLabel.text = titleText
            titleLabel.font = Utils.boldFont(size: 20)
            titleLabel.textColor = APP_TEXT_COLOR
            titleLabel.textAlignment = .center
            customNavBar.setCustomTitleView(titleLabel, centered: titleCentered)
        } else {
            // Use default title from customNavBar
            // Even when title is nil, we should set an empty title to maintain layout
            // This ensures left/right buttons don't collapse
            customNavBar.title = ""
            customNavBar.setTitleCentered(titleCentered)
        }
        
        // Setup status bar style callback
        setupStatusBarStyleCallback(for: customNavBar)
        
        // Setup constraints
        customNavBar.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.equalToSuperview()
        }
    }
    
    /// Handle navigation back action
    /// - Parameter action: The type of back action to perform
    private func handleNavigationBackAction(_ action: NavigationBackAction) {
        // Hide navigation bar before navigation
        navigationController?.setNavigationBarHidden(true, animated: true)
        
        switch action {
        case .pop:
            navigationController?.popViewController(animated: true)
        case .popToRoot:
            navigationController?.popToRootViewController(animated: true)
        case .custom(let customAction):
            customAction()
        }
    }
    
    /// Override viewWillDisappear to handle navigation bar hiding
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Hide navigation bar when leaving this screen if using custom navigation bar
        if navigationBarConfig != nil && navigationController?.topViewController != self {
            navigationController?.setNavigationBarHidden(true, animated: true)
        }
    }
    
    deinit {
        if let tbv = tableView{
            tbv.removeAllPullToRefresh()
        }
    }
    
    func setupUI(){
    }
    
    func setupData(){
    }
    
    func configPullToRefresh(tableview: UITableView){
        self.tableView = tableview
        self.refreshControl = UIRefreshControl()
        self.setupPullToRefresh()
    }
    
    func stopPullToRefresh(){
        self.refreshControl = nil
        self.tableView?.refreshControl = nil
    }

    func configBackButton(){
        self.navigationItem.leftBarButtonItem = UIBarButtonItem(image: UIImage(named: "ic_back"), style: .plain, target: self, action: #selector(backAction))
    }
    
    @objc func backAction(){
        self.navigationController?.popViewController(animated: true)
    }
    
    func presentController(size: CGSize, controller: BaseViewControler,  completion: (() -> Void)?){
//        if UIDevice.current.userInterfaceIdiom == .pad{
//            let width = ModalSize.custom(size: Float(size.width))
//            let height = ModalSize.custom(size: Float(size.height))
//            let center = ModalCenterPosition.center
//            let customType = PresentationType.custom(width: width, height:height, center: center)
//            
//            let customPresenter = Presentr(presentationType: customType)
//            
//            customPresenter.transitionType = .crossDissolve
//            customPresenter.dismissTransitionType = .crossDissolve
//            customPresenter.roundCorners = true
//            customPresenter.backgroundColor = .black
//            customPresenter.backgroundOpacity = 0.5
//            customPresenter.dismissOnSwipe = false
//            customPresenter.dismissAnimated = false
//            customPresenter.dismissOnSwipeDirection = .default
//            
//            customPresentViewController(customPresenter, viewController: controller, animated: true, completion: completion)
//        }else{
//            self.navigationController?.pushViewController(controller, animated: true)
//        }
    }
    
     func presentModal(_ viewController: UIViewController,
                             animated: Bool,
                             completion: (() -> Void)? = nil) {
        viewController.modalPresentationStyle =  .pageSheet
      present(viewController, animated: animated, completion: completion)
    }
    
    // Add status bar style property
    override var preferredStatusBarStyle: UIStatusBarStyle {
        return statusBarStyle
    }
    
    // Property to control status bar style
    private var statusBarStyle: UIStatusBarStyle = .default {
        didSet {
            setNeedsStatusBarAppearanceUpdate()
        }
    }
    
    // Function to change status bar style
    func setStatusBarStyle(_ style: UIStatusBarStyle) {
        statusBarStyle = style
    }
}

extension BaseViewControler{
    func showProgressText(text: String?, navigationController: UINavigationController? = nil){
        if let navigationController = navigationController{
            let hud = MBProgressHUD.showAdded(to: navigationController.view, animated: true)
            if text != nil{
                hud.label.text = text
            }
        }else{
            let hud = MBProgressHUD.showAdded(to: appDelegate.window!, animated: true)
            if text != nil{
                hud.label.text = text
            }
        }
    }
    
    func hideProgress(navigationController: UINavigationController? = nil){
        if let navigationController = navigationController{
            MBProgressHUD.hide(for: navigationController.view, animated: true)
        }else{
            MBProgressHUD.hide(for: appDelegate.window!, animated: true)
        }
    }
}

extension BaseViewControler{
    @objc func startRefresh(_ sender: Any){
        
    }
    @objc func startLoadMore(_ sender: Any){
        
    }
    func endRefresh(){
        DispatchQueue.main.async { [weak self] in
            self?.refreshControl?.endRefreshing()
        }
    }
    func endLoadMore(){
        
    }
}
private extension BaseViewControler {
    func setupPullToRefresh() {
        if let tbv = self.tableView{
            if #available(iOS 10.0, *) {
                tbv.refreshControl = refreshControl
            } else {
                tbv.addSubview(refreshControl!)
            }
            refreshControl?.addTarget(self, action: #selector(startRefresh(_:)), for: .valueChanged)
        }
    }
}

extension BaseViewControler{
    func startTracking(){

    }
    func stopTracking(){
        
    }
}
