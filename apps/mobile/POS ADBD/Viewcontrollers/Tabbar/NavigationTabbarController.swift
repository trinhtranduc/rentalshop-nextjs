//
//  NavigationTabbarController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/19/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

extension UIViewController {
    func hideNavigationBar(){
        // Hide the navigation bar on the this view controller
        self.navigationController?.setNavigationBarHidden(true, animated: true)
        
    }
    
    func showNavigationBar() {
        // Show the navigation bar on other view controllers
        self.navigationController?.setNavigationBarHidden(false, animated: true)
    }
    
    
}

class NavigationTabbarController: UINavigationController {

}
