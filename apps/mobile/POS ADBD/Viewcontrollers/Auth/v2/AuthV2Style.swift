//
//  AuthV2Style.swift
//  POS ADBD
//
//  #386, restyled in #466 — the one place for the look of the pre-login screens (login, create store 1/2 and 2/2,
//  forgot, sent, onboarding v2): style 4A — white page, a light dot grid fading out over the top, the AnyRent brand
//  mark, no cards, no motion. Colours, sizes, the dot grid and the brand views live here, so a restyle only touches
//  this file.
//

import UIKit
import SnapKit

enum AuthV2Style {
    // Page
    static let pageBackground = UIColor.white
    static let sideInset: CGFloat = 24
    static let maxWidth: CGFloat = 480

    // Text
    static let text = DS.Color.text
    static let textMuted = DS.Color.textMuted
    static let termsText = UIColor(hexString: "334155")
    static let error = UIColor(hexString: "B91C1C")
    static let headingKern: CGFloat = -0.56
    static let titleSize: CGFloat = 28
    static let titleLineHeight: CGFloat = 36
    static let wordmark = UIColor(hexString: "1E3A8A")
    static let brandName = "AnyRent"
    /// Placeholder of every password field: dots, not words (owner, #466)
    static let passwordPlaceholder = "••••••••"

    // Controls
    static let primary = DS.Color.primary
    static let onPrimary = UIColor.white
    static let fieldBackground = UIColor.white
    static let fieldBorder = UIColor(hexString: "CBD5E1")
    static let fieldIcon = UIColor(hexString: "64748B")
    static let focusRing = UIColor(hexString: "DBEAFE")
    static let fieldHeight: CGFloat = 52
    static let fieldRadius: CGFloat = 12
    static let buttonHeight: CGFloat = 54
    static let buttonRadius: CGFloat = 14
    static let chipOn = DS.Color.primary
    static let chipOnText = UIColor.white
    static let chipOff = UIColor.white
    static let chipOffText = DS.Color.text
    static let chipBorder = UIColor(hexString: "CBD5E1")
    static let progressTrack = UIColor(hexString: "DBEAFE")
    static let mailTile = UIColor(hexString: "EFF6FF")

    // Dot grid
    static let dot = UIColor(hexString: "E2E8F0")
    static let dotGridHeight: CGFloat = 420
    static let dotSpacing: CGFloat = 18
    static let dotRadius: CGFloat = 1

    /// Puts the dot grid behind everything at the top of `view`
    @discardableResult
    static func installDotGrid(in view: UIView) -> UIView {
        let grid = AuthV2DotGrid()
        view.insertSubview(grid, at: 0)
        grid.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
            make.height.equalTo(dotGridHeight)
        }
        return grid
    }

    /// The AnyRent mark as a rounded tile, with an optional soft blue shadow
    static func makeBrandMark(size: CGFloat, radius: CGFloat, shadow: Bool) -> UIView {
        let image = UIImageView(image: UIImage(named: AppImageAsset.brandPrimaryMark)?.withRenderingMode(.alwaysOriginal))
        image.contentMode = .scaleAspectFill
        image.backgroundColor = .white
        image.layer.cornerRadius = radius
        image.clipsToBounds = true
        let holder = UIView()
        holder.addSubview(image)
        image.snp.makeConstraints { $0.edges.equalToSuperview() }
        holder.snp.makeConstraints { $0.width.height.equalTo(size) }
        if shadow {
            holder.layer.shadowColor = primary.cgColor
            holder.layer.shadowOpacity = 0.18
            holder.layer.shadowRadius = 12
            holder.layer.shadowOffset = CGSize(width: 0, height: 8)
            holder.layer.shadowPath = UIBezierPath(roundedRect: CGRect(x: 0, y: 0, width: size, height: size), cornerRadius: radius).cgPath
        }
        return holder
    }

    /// Login header: 72pt mark, 10pt gap, "AnyRent" 22pt extra-bold, centred
    static func makeBrandHeader() -> UIView {
        let name = UILabel()
        name.text = brandName
        name.font = Utils.extraBoldFont(size: 22)
        name.textColor = wordmark
        let stack = UIStackView(arrangedSubviews: [makeBrandMark(size: 72, radius: 20, shadow: true), name])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 10
        stack.isAccessibilityElement = true
        stack.accessibilityLabel = brandName
        return stack
    }

    /// Top-bar brand: 32pt mark + "AnyRent" 17pt extra-bold
    static func makeBrandBar() -> UIView {
        let name = UILabel()
        name.text = brandName
        name.font = Utils.extraBoldFont(size: 17)
        name.textColor = wordmark
        let stack = UIStackView(arrangedSubviews: [makeBrandMark(size: 32, radius: 9, shadow: false), name])
        stack.axis = .horizontal
        stack.alignment = .center
        stack.spacing = 8
        stack.isAccessibilityElement = true
        stack.accessibilityLabel = brandName
        return stack
    }

    /// 64pt light-blue rounded tile with a mail icon, left-aligned (board DX-Da-gui)
    static func makeMailTile() -> UIView {
        let tile = UIView()
        tile.backgroundColor = mailTile
        tile.layer.cornerRadius = 18
        let icon = UIImageView(image: DS.symbol("envelope", 32))
        icon.tintColor = primary
        icon.contentMode = .center
        tile.addSubview(icon)
        icon.snp.makeConstraints { $0.edges.equalToSuperview() }
        tile.snp.makeConstraints { $0.width.height.equalTo(64) }
        let row = UIStackView(arrangedSubviews: [tile, UIView()])
        row.axis = .horizontal
        row.alignment = .center
        row.isAccessibilityElement = false
        row.accessibilityElementsHidden = true
        return row
    }
}

/// Light dot grid (#E2E8F0, r 1, every 18pt) whose opacity fades out toward the bottom. Decorative.
final class AuthV2DotGrid: UIView {
    private let fade = CAGradientLayer()

    init() {
        super.init(frame: .zero)
        backgroundColor = .clear
        isOpaque = false
        isUserInteractionEnabled = false
        isAccessibilityElement = false
        accessibilityElementsHidden = true
        contentMode = .redraw
        fade.colors = [UIColor.black.cgColor, UIColor.black.cgColor, UIColor.clear.cgColor]
        fade.locations = [0, 0.3, 1]
        layer.mask = fade
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        fade.frame = bounds
    }

    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        context.setFillColor(AuthV2Style.dot.cgColor)
        let step = AuthV2Style.dotSpacing
        let r = AuthV2Style.dotRadius
        var y = step / 2
        while y < bounds.height {
            var x = step / 2
            while x < bounds.width {
                context.fillEllipse(in: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r))
                x += step
            }
            y += step
        }
    }
}
