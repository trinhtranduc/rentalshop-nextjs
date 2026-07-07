//
//  Define.swift
//  POS_ADBD
//
//  Created by Trinh Tran on 6/7/17.
//  Copyright © 2017 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit

let appDelegate = UIApplication.shared.delegate as! AppDelegate

let keyWindow = UIApplication.shared.keyWindow
let SCREEN_SIZE = UIScreen.main.bounds
let SCREEN_RATIO = SCREEN_SIZE.width/SCREEN_SIZE.height

// Legacy color definitions - keeping for backward compatibility
let APP_GRAY_COLOR                    = UIColor.neutralGray
let APP_TONE_COLOR                    = UIColor.brandPrimary
let APP_TONE_NAV_COLOR                = UIColor.navBackground
let APP_TONE_LINE_BG_COLOR            = UIColor.backgroundSecondary
let APP_TONE_NAV_BLACK_COLOR          = UIColor.navBackground
let APP_ORANGE_COLOR                  = UIColor.accentOrange
let APP_BG_COLOR                      = UIColor.backgroundPrimary
let APP_TEXT_COLOR                    = UIColor.textPrimary
let APP_BORDER_COLOR                  = UIColor.borderColor
let APP_BUTTON_BG_COLOR               = UIColor.actionPrimary

// Fonts
internal let REGULAR_FONT = "Inter-Regular"
internal let LIGHT_FONT = "Inter-Thin"
internal let MEDIUM_FONT = "Inter-Medium"
internal let BOLD_FONT = "Inter-Bold"
internal let EXTRA_BOLD_FONT = "Inter-Extra-Bold"

internal let DATE_STRING_FULL_FORMAT =  "yyyy-MM-dd HH:mm:ss"

let UpgradeMessage = "UpgradeMessage".localized()
let INVALID_NUMBER = -1

extension Notification.Name {
    static let unauthorizedAccess = Notification.Name("unauthorizedAccess")
    static let orderDidCreateOrUpdate = Notification.Name("orderDidCreateOrUpdate")
}

// MARK: - Design System
extension UIColor {
    // Brand Colors
    static let brandPrimary = UIColor(hexString: "1D4EFD")//UIColor(hexString: "0052CC") // APP_TONE_COLOR
    static let brandSecondary = UIColor(hexString: "2B3349") // APP_TONE_NAV_COLOR
    
    // Action Colors
    static let actionPrimary = UIColor(hexString: "008AE8") // APP_BUTTON_BG_COLOR
    static let actionSuccess = UIColor.systemGreen
    static let actionDanger = UIColor.systemRed
    static let actionWarning = UIColor.accentOrange
    
    // Accent Colors
    static let accentOrange = UIColor(hexString: "f19920") // APP_ORANGE_COLOR
    
    // Text Colors
    static let textPrimary = UIColor(hexString: "202020")//UIColor(hexString: "323334") // APP_TEXT_COLOR
    static let textSecondary = UIColor.darkGray
    static let textTertiary = UIColor.neutralGray
    static let textInverted = UIColor.white
    
    // Background Colors
    static let backgroundPrimary = UIColor(red: 245/255, green: 245/255, blue: 245/255, alpha: 1.0) // APP_BG_COLOR //UIColor(hexString: "E7F0FE")//
    static let backgroundSecondary = UIColor(hexString: "E7F0F5") // APP_TONE_LINE_BG_COLOR
    static let backgroundTertiary = UIColor.systemGray6
    static let backgroundCard = UIColor.white
    static let backgroundAuthStart = UIColor(hexString: "EFF6FF")
    static let backgroundAuthEnd = UIColor(hexString: "EEF2FF")
    static let surfaceAccentSoft = UIColor(hexString: "EDF4FF")
    static let surfaceAuthCard = UIColor.white.withAlphaComponent(0.82)
    static let surfaceAuthChrome = UIColor.white.withAlphaComponent(0.92)
    
    // Navigation Colors
    static let navBackground = UIColor(hexString: "2B3349") // APP_TONE_NAV_COLOR
    static let navTint = UIColor.white
    
    // Neutral Colors
    static let neutralGray = UIColor(hexString: "999999") // APP_GRAY_COLOR
    
    // Border Colors
    static let borderColor = UIColor(hexString: "E5EAED") // APP_BORDER_COLOR
    
    // Status Colors
    static let statusActive = UIColor.brandPrimary
    static let statusInactive = UIColor.neutralGray
    static let statusPending = UIColor.accentOrange

    // Order status badge fills.
    // Darkened on purpose so white badge text clears WCAG AA (all >= ~4.8:1 contrast);
    // the bright accent colors previously used (systemGreen/accentOrange) only reached ~2.2:1.
    static let statusDraftFill     = UIColor(hexString: "6B7280") // neutral gray
    static let statusReservedFill  = UIColor(hexString: "B45309") // amber (pending)
    static let statusActiveFill    = UIColor.brandPrimary          // blue (picked up / in use)
    static let statusDoneFill      = UIColor(hexString: "1E7B34") // green (returned / completed)
    static let statusCancelledFill = UIColor(hexString: "C62828") // red (cancelled)

    static var authGradientColors: [CGColor] {
        [
            UIColor.backgroundAuthStart.cgColor,
            UIColor.backgroundCard.cgColor,
            UIColor.backgroundAuthEnd.cgColor
        ]
    }
}

extension UIFont {
    // Title fonts
    static func titleLarge() -> UIFont {
        return Utils.boldFont(size: 20)
    }
    
    static func titleMedium() -> UIFont {
        return Utils.boldFont(size: 18)
    }
    
    static func titleSmall() -> UIFont {
        return Utils.boldFont(size: 16)
    }
    
    // Body fonts
    static func bodyLarge() -> UIFont {
        return Utils.mediumFont(size: 16)
    }
    
    static func bodyBold(size: CGFloat = 16) -> UIFont {
        return Utils.boldFont(size: size)
    }
    
    static func bodyMedium(size: CGFloat = 14) -> UIFont {
        return Utils.mediumFont(size: size)
    }
    
    static func bodyRegular(size: CGFloat = 14) -> UIFont {
        return Utils.regularFont(size: size)
    }
    
    static func bodySmall(size: CGFloat = 14) -> UIFont {
        return Utils.regularFont(size: size)
    }
    
    // Caption fonts
    static func captionLarge(size: CGFloat = 13) -> UIFont {
        return Utils.regularFont(size: size)
    }

    static func captionMedium(size: CGFloat = 12) -> UIFont {
        return Utils.regularFont(size: size)
    }

    static func captionSmall(size: CGFloat = 11) -> UIFont {
        return Utils.regularFont(size: size)
    }
}

// MARK: - Order Status Badge Styling (single source of truth)
// Previously the status -> color mapping was duplicated across 5+ cells with
// diverging results (e.g. `reserved` showed red on one screen, blue on another,
// and `draft` rendered white-on-clear = invisible). Centralizing it here keeps
// every badge consistent and readable.
extension OrderStatus {
    /// Background fill for the status badge. One canonical color per status,
    /// independent of order type: gray(draft) -> amber(reserved) -> blue(pickuped)
    /// -> green(returned/completed), with red for cancelled.
    var badgeColor: UIColor {
        switch self {
        case .draft:     return .statusDraftFill
        case .reserved:  return .statusReservedFill
        case .pickuped:  return .statusActiveFill
        case .returned:  return .statusDoneFill
        case .completed: return .statusDoneFill
        case .cancelled: return .statusCancelledFill
        }
    }

    /// Text color for the badge. White reads with AA contrast on every fill above.
    var badgeTextColor: UIColor { .textInverted }
}
