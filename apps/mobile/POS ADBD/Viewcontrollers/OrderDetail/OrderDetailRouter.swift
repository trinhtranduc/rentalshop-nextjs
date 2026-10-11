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

    /// Push the detail of an order known only by its numeric id (#374 calendar rows): the new detail loads it
    /// itself; the current one needs the order first
    static func open(orderId: Int, from controller: BaseViewControler) {
        if usesNewDetail {
            let detail = OrderDetailViewController(orderId: orderId)
            detail.hidesBottomBarWhenPushed = true
            controller.navigationController?.pushViewController(detail, animated: true)
            return
        }
        controller.showProgressText(text: "Loading...".localized())
        OrderService.shared.loadOrderDetail(orderId: orderId) { [weak controller] detail, error in
            DispatchQueue.main.async {
                guard let controller else { return }
                controller.hideProgress()
                if let error {
                    UIAlertController.errorAlert(parent: controller, error: error)
                    return
                }
                guard let detail else { return }
                let preview = detailController(for: Order.from(detail: detail), delegate: nil)
                controller.navigationController?.pushViewController(preview, animated: true)
            }
        }
    }
}

/// Edit an order the way the app does today: load it into the cart and open the sales tab
enum OrderEditLauncher {
    /// #677: [payments] = the order's payments when known, for "Đã thu" / "Thu khi giao" on the save sheet
    static func startEditing(_ order: Order, payments: [OrderPaymentLine]? = nil) {
        guard let tabbarController = appDelegate.window?.rootViewController as? TabbarViewController else { return }
        let cart = Cart.fromOrder(order, payments: payments)
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
