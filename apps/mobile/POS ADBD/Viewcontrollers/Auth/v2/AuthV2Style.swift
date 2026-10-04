//
//  AuthV2Style.swift
//  POS ADBD
//
//  #386 — the one place for the look of the new auth screens (login, create store 1/2 and 2/2, forgot, sent):
//  style E — white page, three soft drifting blobs at the top, no cards. Colours, sizes, the blobs and the
//  floating mail icon live here, so a restyle only touches this file.
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
    static let headingKern: CGFloat = -0.6

    // Controls
    static let primary = DS.Color.primary
    static let onPrimary = UIColor.white
    static let fieldBackground = UIColor.white
    static let fieldBorder = UIColor(hexString: "CBD5E1")
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
    static let backButtonFill = UIColor.white.withAlphaComponent(0.9)

    // Blobs
    static let blobBlue = UIColor(hexString: "DBEAFE")
    static let blobPeach = UIColor(hexString: "FFEDD5")
    static let blobDot = DS.Color.primary

    /// Blob size per screen (board: login 1, forgot and sent 0.8, register 0.55)
    enum BlobScale: CGFloat {
        case login = 1
        case forgot = 0.8
        case register = 0.55
    }

    /// Lowest point of the blobs from the top of the screen, drift included (dot: y 230, 70pt, drifts ≤ 12pt).
    /// Content starts below it, so a blob never sits on text on any device.
    static func blobClearance(_ scale: BlobScale) -> CGFloat {
        (230 + 70) * scale.rawValue + 16
    }

    static var reduceMotion: Bool { UIAccessibilityIsReduceMotionEnabled() }

    /// Puts the three blobs behind everything in `view`
    @discardableResult
    static func installBlobs(in view: UIView, scale: BlobScale) -> UIView {
        let layer = AuthV2BlobLayer(scale: scale.rawValue)
        layer.isUserInteractionEnabled = false
        layer.isAccessibilityElement = false
        layer.accessibilityElementsHidden = true
        view.insertSubview(layer, at: 0)
        layer.snp.makeConstraints { $0.edges.equalToSuperview() }
        return layer
    }

    /// White rounded square with a soft blue shadow and a mail icon that floats up and down (board Sent-E)
    static func makeSentIcon() -> UIView {
        let box = AuthV2FloatingView()
        box.backgroundColor = .white
        box.layer.cornerRadius = 22
        box.layer.shadowColor = primary.cgColor
        box.layer.shadowOpacity = 0.18
        box.layer.shadowRadius = 12
        box.layer.shadowOffset = CGSize(width: 0, height: 8)
        let icon = UIImageView(image: DS.symbol("envelope", 36))
        icon.tintColor = primary
        icon.contentMode = .center
        box.addSubview(icon)
        icon.snp.makeConstraints { $0.edges.equalToSuperview() }
        box.snp.makeConstraints { $0.width.height.equalTo(72) }
        let row = UIStackView(arrangedSubviews: [box, UIView()])
        row.axis = .horizontal
        row.alignment = .center
        row.snp.makeConstraints { $0.height.equalTo(88) }
        return row
    }
}

/// The three blobs. Animations are (re)added whenever the view joins a window, so they survive
/// navigation and background/foreground.
final class AuthV2BlobLayer: UIView {
    private struct Blob {
        let color: UIColor
        let size: CGFloat
        /// Top-left, top-right, bottom-right, bottom-left radius as a fraction of the size
        let corners: [CGFloat]
        let anchor: (CGFloat, CGFloat, Bool) // x, y, x measured from the right
        let delay: CFTimeInterval
    }

    private let scale: CGFloat
    private var blobViews: [UIView] = []

    init(scale: CGFloat) {
        self.scale = scale
        super.init(frame: .zero)
        backgroundColor = .clear
        clipsToBounds = true
        let blobs = [
            Blob(color: AuthV2Style.blobBlue, size: 260, corners: [0.42, 0.58, 0.55, 0.45], anchor: (-70, -60, false), delay: 0),
            Blob(color: AuthV2Style.blobPeach, size: 170, corners: [0.55, 0.45, 0.40, 0.60], anchor: (-60, 120, true), delay: 4),
            Blob(color: AuthV2Style.blobDot, size: 70, corners: [0.5, 0.5, 0.5, 0.5], anchor: (60, 230, false), delay: 8)
        ]
        for blob in blobs {
            let size = blob.size * scale
            let view = UIView()
            let shape = CAShapeLayer()
            shape.path = AuthV2BlobLayer.path(size: size, corners: blob.corners.map { $0 * size }).cgPath
            shape.fillColor = blob.color.cgColor
            view.layer.addSublayer(shape)
            view.layer.setValue(blob.delay, forKey: "p386Delay")
            addSubview(view)
            view.snp.makeConstraints { make in
                make.width.height.equalTo(size)
                make.top.equalToSuperview().offset(blob.anchor.1 * scale)
                if blob.anchor.2 {
                    make.trailing.equalToSuperview().offset(-blob.anchor.0 * scale)
                } else {
                    make.leading.equalToSuperview().offset(blob.anchor.0 * scale)
                }
            }
            blobViews.append(view)
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func didMoveToWindow() {
        super.didMoveToWindow()
        guard window != nil else { return }
        for view in blobViews {
            view.layer.removeAnimation(forKey: "drift")
            guard !AuthV2Style.reduceMotion else { continue }
            let drift = CAKeyframeAnimation(keyPath: "transform")
            drift.values = [
                CATransform3DIdentity,
                CATransform3DScale(CATransform3DMakeTranslation(15, -12, 0), 1.06, 1.06, 1),
                CATransform3DScale(CATransform3DMakeTranslation(-14, 10, 0), 0.96, 0.96, 1),
                CATransform3DIdentity
            ].map { NSValue(caTransform3D: $0) }
            drift.keyTimes = [0, 0.33, 0.66, 1]
            drift.timingFunctions = Array(repeating: CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseInEaseOut), count: 3)
            drift.duration = 12
            drift.repeatCount = .infinity
            drift.timeOffset = (view.layer.value(forKey: "p386Delay") as? CFTimeInterval) ?? 0
            drift.isRemovedOnCompletion = false
            view.layer.add(drift, forKey: "drift")
        }
    }

    /// A rounded square whose four corners have different radii (CSS `border-radius: a% b% c% d%`)
    private static func path(size: CGFloat, corners: [CGFloat]) -> UIBezierPath {
        let tl = corners[0], tr = corners[1], br = corners[2], bl = corners[3]
        let path = UIBezierPath()
        path.move(to: CGPoint(x: tl, y: 0))
        path.addLine(to: CGPoint(x: size - tr, y: 0))
        path.addArc(withCenter: CGPoint(x: size - tr, y: tr), radius: tr, startAngle: -.pi / 2, endAngle: 0, clockwise: true)
        path.addLine(to: CGPoint(x: size, y: size - br))
        path.addArc(withCenter: CGPoint(x: size - br, y: size - br), radius: br, startAngle: 0, endAngle: .pi / 2, clockwise: true)
        path.addLine(to: CGPoint(x: bl, y: size))
        path.addArc(withCenter: CGPoint(x: bl, y: size - bl), radius: bl, startAngle: .pi / 2, endAngle: .pi, clockwise: true)
        path.addLine(to: CGPoint(x: 0, y: tl))
        path.addArc(withCenter: CGPoint(x: tl, y: tl), radius: tl, startAngle: .pi, endAngle: 3 * .pi / 2, clockwise: true)
        path.close()
        return path
    }
}

/// Floats 8pt up and down on a 4.2 s loop (not with Reduce Motion)
final class AuthV2FloatingView: UIView {
    override func didMoveToWindow() {
        super.didMoveToWindow()
        layer.removeAnimation(forKey: "float")
        guard window != nil, !AuthV2Style.reduceMotion else { return }
        let float = CABasicAnimation(keyPath: "transform.translation.y")
        float.fromValue = 0
        float.toValue = -8
        float.duration = 2.1
        float.autoreverses = true
        float.repeatCount = .infinity
        float.timingFunction = CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseInEaseOut)
        float.isRemovedOnCompletion = false
        layer.add(float, forKey: "float")
    }
}
