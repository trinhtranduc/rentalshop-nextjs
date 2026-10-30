//
//  ShopCurrencyUI.swift
//  POS ADBD
//
//  #1145 / #1313: pick the shop currency (VND / USD), confirm, save. The owner's "Tiền tệ" row sits in the shop block of
//  Thông tin cửa hàng. Moved out of the Settings list unchanged.
//

import UIKit

enum ShopCurrencyUI {
    /// "VND (đ)" / "USD ($)", the current one checked; another one asks to confirm. `onChange` runs after a saved change.
    static func choose(from host: UIViewController, onChange: @escaping () -> Void) {
        let current = ShopCurrencyStore.current
        let sheet = UIAlertController(title: "settings.v2.currency".localized(), message: nil, preferredStyle: .actionSheet)
        for currency in ShopCurrency.allCases {
            let action = UIAlertAction(title: currency.label, style: .default) { [weak host] _ in
                guard currency != current, let host else { return }
                confirm(currency, from: current, host: host, onChange: onChange)
            }
            action.setValue(currency == current, forKey: "checked")
            sheet.addAction(action)
        }
        sheet.addAction(UIAlertAction(title: "settings.v2.currency.cancel".localized(), style: .cancel))
        if let popover = sheet.popoverPresentationController {
            popover.sourceView = host.view
            popover.sourceRect = CGRect(x: host.view.bounds.midX, y: host.view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        host.present(sheet, animated: true)
    }

    private static func confirm(_ currency: ShopCurrency, from current: ShopCurrency, host: UIViewController,
                                onChange: @escaping () -> Void) {
        let alert = UIAlertController(title: ShopCurrencyLogic.confirmTitle(to: currency),
                                      message: ShopCurrencyLogic.confirmMessage(from: current, to: currency),
                                      preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "settings.v2.currency.cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: ShopCurrencyLogic.confirmButton(to: currency), style: .default) { [weak host] _ in
            guard let host else { return }
            save(currency, host: host, onChange: onChange)
        })
        host.present(alert, animated: true)
    }

    private static func save(_ currency: ShopCurrency, host: UIViewController, onChange: @escaping () -> Void) {
        guard !ShopCurrencyStore.saving else { return }
        ShopCurrencyStore.saving = true
        TabsV2APIService.shared.setShopCurrency(currency) { [weak host] saved, error in
            DispatchQueue.main.async {
                ShopCurrencyStore.saving = false
                if let saved, error == nil {
                    ShopCurrencyStore.store(saved)
                    onChange()
                    return
                }
                guard let host else { return }
                let failure = error ?? NSError.errorWithOwnMessage(message: "settings.v2.currency.failed".localized(), domain: "RC")
                UIAlertController.errorAlert(parent: host, error: failure)
            }
        }
    }
}
