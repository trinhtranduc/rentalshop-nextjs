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

enum AppImageAsset {
    static let authEntryBackground = "anyrent-auth-background"
    static let brandPrimaryMark = "anyrent-brandmark-ribbon"
}

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

    // Order status badges — solid mid-tone fill + white label text on the chip.
    // `status*Text` stays dark for on-surface use (negative revenue, icon tints);
    // badge chips force white via `badgeTextColor` so we don't bleach those UIs.
    // Fills (solid / saturated)
    static let statusDraftFill     = UIColor(hexString: "6B7280") // gray-500
    static let statusReservedFill  = UIColor(hexString: "D97706") // amber-600 (pending)
    static let statusActiveFill    = UIColor(hexString: "2563EB") // blue-600 (picked up / in use)
    static let statusDoneFill      = UIColor(hexString: "16A34A") // green-600 (returned / completed)
    static let statusCancelledFill = UIColor(hexString: "DC2626") // red-600 (cancelled)
    // On-surface / accent text (dark) — NOT for painting on solid badge fills
    static let statusDraftText     = UIColor(hexString: "374151") // gray-700
    static let statusReservedText  = UIColor(hexString: "92400E") // amber-800
    static let statusActiveText    = UIColor(hexString: "1E40AF") // blue-800
    static let statusDoneText      = UIColor(hexString: "166534") // green-800
    /// Matched substring in product/customer search results.
    static let searchMatchHighlight = UIColor(hexString: "15803D") // green-700
    static let statusCancelledText = UIColor(hexString: "B91C1C") // red-700
    /// Label color on solid status chips only.
    static let statusBadgeLabelText = UIColor.white

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

enum OrderStatusBadgeMetrics {
    static let cornerRadius: CGFloat = 12
    static let contentInsets = UIEdgeInsets(top: 5, left: 9, bottom: 5, right: 9)
    static let minimumHeight: CGFloat = 26

    static func font(isRegularWidth: Bool = false) -> UIFont {
        Utils.boldFont(size: isRegularWidth ? 11 : 10)
    }

    static func applyBaseAppearance(to label: UILabel, isRegularWidth: Bool = false) {
        label.textAlignment = .center
        label.numberOfLines = 1
        label.layer.cornerRadius = cornerRadius
        label.layer.masksToBounds = true
        label.font = font(isRegularWidth: isRegularWidth)
    }
}

/// Padded pill label for order status badges in list cells and headers.
final class OrderStatusPillLabel: UILabel {
    var contentInsets: UIEdgeInsets = OrderStatusBadgeMetrics.contentInsets

    override var intrinsicContentSize: CGSize {
        let size = super.intrinsicContentSize
        return CGSize(
            width: size.width + contentInsets.left + contentInsets.right,
            height: max(size.height + contentInsets.top + contentInsets.bottom, OrderStatusBadgeMetrics.minimumHeight)
        )
    }

    override func drawText(in rect: CGRect) {
        super.drawText(in: UIEdgeInsetsInsetRect(rect, contentInsets))
    }

    override init(frame: CGRect) {
        super.init(frame: frame)
        OrderStatusBadgeMetrics.applyBaseAppearance(to: self)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func apply(status: OrderStatus, isRegularWidth: Bool = false) {
        OrderStatusBadgeMetrics.applyBaseAppearance(to: self, isRegularWidth: isRegularWidth)
        text = status.filterChipTitle
        backgroundColor = status.badgeColor
        textColor = status.badgeTextColor
    }

    func apply(status: OrderStatus?, isRegularWidth: Bool = false) {
        guard let status else {
            clearBadge()
            return
        }
        apply(status: status, isRegularWidth: isRegularWidth)
    }

    func clearBadge() {
        text = nil
        backgroundColor = .clear
        textColor = .textSecondary
    }
}

extension String {
    /// Masks the middle of a phone number for display, e.g. "0901234099" -> "09xxxx099".
    /// Numbers with 5 or fewer characters are returned unchanged (nothing to hide).
    var maskedPhoneNumber: String {
        let trimmed = trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count > 5 else { return trimmed }
        return "\(trimmed.prefix(2))xxxx\(trimmed.suffix(3))"
    }
}

extension UIImage {
    /// Subtle eye toggle glyph for reveal/hide affordances (e.g. masked phone numbers).
    /// Single source of truth so the icon style can be changed in one place.
    static func revealEye(revealed: Bool) -> UIImage? {
        // Outline glyph at the same size/weight as the date-row icons so the toggle
        // reads as a peer of them rather than a heavier filled blob.
        let config = UIImage.SymbolConfiguration(pointSize: 14, weight: .regular)
        return UIImage(systemName: revealed ? "eye.slash" : "eye", withConfiguration: config)
    }
}

extension OrderStatus {
    /// Saturated fill for the status badge (solid chip).
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

    /// White text on solid fill for strong contrast (do not reuse for on-surface labels).
    var badgeTextColor: UIColor {
        .statusBadgeLabelText
    }

    /// Uppercase title shared by list badges and filter chips.
    var filterChipTitle: String {
        inString()
    }

    /// Applies neutral filter-chip styling (plain surface — status color stays on list badges only).
    func applyFilterChipAppearance(to button: UIButton, isSelected: Bool) {
        button.setTitle(localizedDisplayName(), for: .normal)
        OrderFilterChipAppearance.applyNeutral(to: button, isSelected: isSelected)
    }

    /// Solid badge colors for inline `UILabel` badges (e.g. table cells).
    func applySolidBadge(to label: UILabel, isRegularWidth: Bool = false) {
        OrderStatusBadgeMetrics.applyBaseAppearance(to: label, isRegularWidth: isRegularWidth)
        label.text = filterChipTitle
        label.backgroundColor = badgeColor
        label.textColor = badgeTextColor
    }

    /// Solid badge on a container with clear label text (chart chip layout).
    func applySolidBadge(to label: UILabel, container: UIView, isRegularWidth: Bool = false) {
        applySolidBadge(to: label, isRegularWidth: isRegularWidth)
        label.backgroundColor = .clear
        container.backgroundColor = badgeColor
        container.layer.cornerRadius = OrderStatusBadgeMetrics.cornerRadius
        container.clipsToBounds = true
    }
}

enum OrderFilterChipMetrics {
    static let cornerRadius: CGFloat = 15
    static let contentInsets = UIEdgeInsets(top: 10, left: 15, bottom: 10, right: 15)
    static let minimumHeight: CGFloat = 44

    static func applyBase(to button: UIButton) {
        button.titleLabel?.font = .bodyMedium(size: 15)
        button.layer.cornerRadius = cornerRadius
        button.layer.masksToBounds = true
        button.layer.borderWidth = 1
        button.contentEdgeInsets = contentInsets
        button.setImage(nil, for: .normal)
    }
}

enum OrderFilterChipAppearance {
    /// Plain single-tone chips for the order filter sheet (matches period filter chips).
    static func applyNeutral(to button: UIButton, isSelected: Bool) {
        OrderFilterChipMetrics.applyBase(to: button)

        if isSelected {
            button.backgroundColor = UIColor.brandPrimary.withAlphaComponent(0.10)
            button.layer.borderColor = UIColor.brandPrimary.withAlphaComponent(0.20).cgColor
            button.setTitleColor(.brandPrimary, for: .normal)
        } else {
            button.backgroundColor = .backgroundCard
            button.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.75).cgColor
            button.setTitleColor(.textPrimary, for: .normal)
        }
    }

    static func applyAll(to button: UIButton, isSelected: Bool) {
        applyNeutral(to: button, isSelected: isSelected)
    }
}
