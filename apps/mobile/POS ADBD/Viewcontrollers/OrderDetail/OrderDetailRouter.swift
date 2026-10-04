//
//  OrderDetailRouter.swift
//  POS ADBD
//
//  One place that decides which order detail opens (#372): the redesigned screen when `newOrderDetail`
//  is on, `PreviewViewController` otherwise (unchanged).
//

import UIKit

enum OrderDetailRouter {
    static var usesNewDetail: Bool { FeatureFlags.shared.isOn(.newOrderDetail) }

    /// Detail screen for an existing order, ready to push
    static func detailController(for order: Order, delegate: PreviewViewControllerDelegate?) -> UIViewController {
        if usesNewDetail {
            let controller = OrderDetailViewController(orderId: order.id)
            controller.hidesBottomBarWhenPushed = true
            return controller
        }
        let preview = PreviewViewController(order: order)
        preview.hidesBottomBarWhenPushed = true
        preview.delegate = delegate
        return preview
    }
}

/// Edit an order the way the app does today: load it into the cart and open the sales tab
enum OrderEditLauncher {
    static func startEditing(_ order: Order) {
        guard let tabbarController = appDelegate.window?.rootViewController as? TabbarViewController else { return }
        let cart = Cart.fromOrder(order)
        // Ensure cart customer has complete information (including id)
        if var cartCustomer = cart.customer {
            cartCustomer.id = order.customerId
            cartCustomer.customer_id = order.customerId
            cart.customer = cartCustomer
        }

        CartStore.shared.replaceCart(with: cart)
        tabbarController.selectedIndex = 0

        // Find MainViewController in the navigation stack to update cart badge and reload cart
        if let navigationController = tabbarController.viewControllers?.first as? UINavigationController {
            for viewController in navigationController.viewControllers {
                if let mainVC = viewController as? MainViewController {
                    mainVC.updateCartBadge()
                    break
                }
            }
        }

        FirebaseManager.shared.logOrderUpdated(
            orderId: String(order.id),
            totalAmount: order.totalAmount
        )
    }
}
