//
//  TabbarViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/25/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

class TabbarViewController: UITabBarController {
    
    // MARK: - Properties
    private var hapticDelegate: HapticTabBarDelegate?
    
    // MARK: - Initialization
    init() {
        super.init(nibName: nil, bundle: nil)
        setupTabBarAppearance()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupTabBarAppearance()
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Setup haptic feedback for tab bar items using the delegate approach
        hapticDelegate = HapticTabBarDelegate(style: .medium)
        hapticDelegate?.applyTo(tabBarController: self)
        
        // Build tabs once here — previously also ran in init(), so every launch
        // created 5 VCs twice and called setViewControllers(animated: true) twice.
        // That made the tab bar feel laggy right after finishing onboarding.
        setupViewControllers()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // let numberOfItems = CGFloat(tabBar.items!.count)
        // let tabBarItemSize = CGSize(width: tabBar.frame.width / numberOfItems, height: tabBar.frame.height)
        // tabBar.selectionIndicatorImage = UIImage.imageWithColor(color: APP_TONE_COLOR, size: tabBarItemSize).resizableImage(withCapInsets: UIEdgeInsets.zero)
    }
    
    // MARK: - Setup
    private func setupTabBarAppearance() {
        // Set colors for both icon and text
        let appearance = UITabBarAppearance()
        appearance.stackedLayoutAppearance.selected.iconColor = UIColor.textPrimary
        appearance.stackedLayoutAppearance.selected.titleTextAttributes = [
            .foregroundColor: UIColor.textPrimary,//UIColor(hexString: "#4E4E4E"),
            .font: Utils.regularFont(size: 12)
        ]
        appearance.stackedLayoutAppearance.normal.iconColor = .systemGray
        appearance.stackedLayoutAppearance.normal.titleTextAttributes = [
            .foregroundColor: UIColor.systemGray,
            .font: Utils.regularFont(size: 12)
        ]
        
        tabBar.standardAppearance = appearance
        if #available(iOS 15.0, *) {
            tabBar.scrollEdgeAppearance = appearance
        }
    }
    
    private func setupViewControllers() {
        let child0Title = "Home".localized()
        let child1Title = "My Order".localized()
        let child2Title = "Calendar".localized()
        let child3Title = "Overview".localized()
        let child4Title = "Setting".localized()
        
        // Create symbol configuration for larger icons
        let symbolConfig = UIImage.SymbolConfiguration(pointSize: 14, weight: .regular)
        
        // Create view controllers
        let child_0 = MainViewController()
        child_0.tabBarItem = UITabBarItem(
            title: child0Title,
            image: UIImage(systemName: "house")?.withConfiguration(symbolConfig),
            selectedImage: UIImage(systemName: "house.fill")?.withConfiguration(symbolConfig)
        )
        child_0.navigationItem.title = child0Title
        
        let child_1 = SaleViewController()
        child_1.tabBarItem = UITabBarItem(
            title: child1Title,
            image: UIImage(systemName: "list.bullet.rectangle")?.withConfiguration(symbolConfig),
            selectedImage: UIImage(systemName: "list.bullet.rectangle.fill")?.withConfiguration(symbolConfig)
        )
        child_1.navigationItem.title = child1Title
        
        let child_2 = CalendarViewController()
        child_2.navigationItem.title = child2Title
        child_2.tabBarItem = UITabBarItem(
            title: child2Title,
            image: UIImage(systemName: "calendar")?.withConfiguration(symbolConfig),
            selectedImage: UIImage(systemName: "calendar.fill")?.withConfiguration(symbolConfig)
        )
        
        let child_3 = OverviewViewController()
        child_3.navigationItem.title = child3Title
        child_3.tabBarItem = UITabBarItem(
            title: child3Title,
            image: UIImage(systemName: "chart.bar")?.withConfiguration(symbolConfig),
            selectedImage: UIImage(systemName: "chart.bar.fill")?.withConfiguration(symbolConfig)
        )
        
        let child_5 = SettingsViewController()
        child_5.navigationItem.title = child4Title
        child_5.tabBarItem = UITabBarItem(
            title: child4Title,
            image: UIImage(systemName: "gearshape")?.withConfiguration(symbolConfig),
            selectedImage: UIImage(systemName: "gearshape.fill")?.withConfiguration(symbolConfig)
        )
        
        // Create navigation controllers
        let nav_0 = BaseNavigationController(rootViewController: child_0)
        let nav_1 = BaseNavigationController(rootViewController: child_1)
        let nav_2 = BaseNavigationController(rootViewController: child_2)
        let nav_3 = BaseNavigationController(rootViewController: child_3)
        let nav_5 = BaseNavigationController(rootViewController: child_5)
        
        // Set view controllers based on permissions
        // Overview tab is shown if user can view daily report (orders.view) or analytics (analytics.view)
        var viewControllers: [UINavigationController]
        let canViewDailyReport = PermissionManager.shared.canViewOrders() || 
                                 PermissionManager.shared.canViewAnalytics()
        
        if canViewDailyReport {
            viewControllers = [nav_0, nav_1, nav_2, nav_3, nav_5]
        } else {
            viewControllers = [nav_0, nav_1, nav_2, nav_5]
        }
        
        // animated: false — initial tab setup must not animate; animation on first
        // load (especially after swapping root from onboarding) janks the tab bar.
        setViewControllers(viewControllers, animated: false)
    }
}
