//
//  BaseNavigationViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 6/7/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

// MARK: - BaseNavigationController (for completeness)
class BaseNavigationController: UINavigationController {
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        tabBarController?.tabBar.isHidden = false // Ensure tab bar isn’t hidden by nav controller
    }
}
