//
//  PadLayout.swift
//  POS ADBD
//
//  #973: the app runs in landscape on iPad. Screens built for the phone stretch edge to edge there, so their
//  content sits in a centered column instead. On iPhone the column is the full width: nothing changes.
//

import AVFoundation
import UIKit

enum PadLayout {
    /// Lists, cart, order detail, settings
    static let readableWidth: CGFloat = 900
    /// Forms (product form) shown as a centered sheet
    static let formWidth: CGFloat = 720
    static let formHeight: CGFloat = 900
    /// Product photo above the details: a square photo as wide as the column would push the details off screen
    static let heroMaxHeight: CGFloat = 320

    static let columnIdentifier = "pad.readableColumn"

    /// Width of the centered column for a container `available` points wide
    static func columnWidth(available: CGFloat, max maxWidth: CGFloat = readableWidth) -> CGFloat {
        Swift.max(0, Swift.min(available, maxWidth))
    }

    /// Empty space on each side of the column
    static func sideInset(available: CGFloat, max maxWidth: CGFloat = readableWidth) -> CGFloat {
        (available - columnWidth(available: available, max: maxWidth)) / 2
    }

    /// Size of a form sheet inside a window of `container` (leaves room around it, never larger than the window)
    static func formSheetSize(in container: CGSize) -> CGSize {
        CGSize(width: Swift.min(formWidth, container.width - 64),
               height: Swift.min(formHeight, container.height - 64))
    }

    /// Height of the product photo box for a screen `width` points wide: 62% of the width (phone), capped on iPad
    static func heroHeight(width: CGFloat) -> CGFloat {
        Swift.min(width * 0.62, heroMaxHeight)
    }

    /// Width a list row can count on before it is laid out: the screen on iPhone; on iPad the narrowest place the
    /// row is shown (the list pane beside a detail). Too small only wraps chips earlier.
    static var rowWidthEstimate: CGFloat {
        let screen = UIScreen.main.bounds.width
        return isPad ? PadSplit.primaryWidth(total: screen) : screen
    }

    /// True on iPad (also in a narrow window): only used to pick a presentation style
    static var isPad: Bool { UIDevice.current.userInterfaceIdiom == .pad }
}

extension UIView {
    /// A layout guide centered in this view, as tall as it, at most `maxWidth` wide (#973).
    /// Pin top-level content's leading/trailing to it instead of to the view. Created once per view.
    func readableColumn(maxWidth: CGFloat = PadLayout.readableWidth) -> UILayoutGuide {
        if let guide = layoutGuides.first(where: { $0.identifier == PadLayout.columnIdentifier }) { return guide }
        let guide = UILayoutGuide()
        guide.identifier = PadLayout.columnIdentifier
        addLayoutGuide(guide)
        let fullWidth = guide.widthAnchor.constraint(equalTo: widthAnchor)
        fullWidth.priority = .defaultHigh
        NSLayoutConstraint.activate([
            guide.topAnchor.constraint(equalTo: topAnchor),
            guide.bottomAnchor.constraint(equalTo: bottomAnchor),
            guide.centerXAnchor.constraint(equalTo: centerXAnchor),
            guide.widthAnchor.constraint(lessThanOrEqualToConstant: maxWidth),
            guide.widthAnchor.constraint(lessThanOrEqualTo: widthAnchor),
            fullWidth,
        ])
        return guide
    }
}

extension UIPopoverPresentationController {
    /// iPad shows action sheets and share sheets as popovers, and UIKit raises an exception when a popover has
    /// no anchor. Keeps an anchor that is already set; otherwise uses `source`, else the middle of `fallback`.
    func anchor(to source: UIView?, fallback: UIView) {
        if barButtonItem != nil || sourceView != nil { return }
        if let source, source.window != nil {
            sourceView = source
            sourceRect = source.bounds
        } else {
            sourceView = fallback
            sourceRect = CGRect(x: fallback.bounds.midX, y: fallback.bounds.midY, width: 0, height: 0)
            permittedArrowDirections = []
        }
    }
}

/// #973: the camera sensor is landscape; the preview and the captured frames must follow the screen.
/// The app was portrait only on iPhone, so this used to be fixed at portrait (90°, `.right`).
enum CameraOrientation {
    /// Rotation of the back camera's video for the screen orientation (AVCaptureConnection.videoRotationAngle)
    static func rotationAngle(for orientation: UIInterfaceOrientation) -> CGFloat {
        switch orientation {
        case .landscapeRight: return 0
        case .portraitUpsideDown: return 270
        case .landscapeLeft: return 180
        default: return 90
        }
    }

    /// Orientation of a UIImage made from an unrotated back-camera frame
    static func imageOrientation(for orientation: UIInterfaceOrientation) -> UIImage.Orientation {
        switch orientation {
        case .landscapeRight: return .up
        case .portraitUpsideDown: return .left
        case .landscapeLeft: return .down
        default: return .right
        }
    }

    /// The screen orientation of `view`'s window (portrait when it is not on screen yet)
    static func interfaceOrientation(of view: UIView) -> UIInterfaceOrientation {
        let orientation = view.window?.windowScene?.interfaceOrientation ?? .portrait
        return orientation == .unknown ? .portrait : orientation
    }

    /// Turns a preview layer's video to match the screen
    static func apply(to connection: AVCaptureConnection?, interface orientation: UIInterfaceOrientation) {
        guard let connection else { return }
        if #available(iOS 17.0, *) {
            let angle = rotationAngle(for: orientation)
            if connection.isVideoRotationAngleSupported(angle) { connection.videoRotationAngle = angle }
        } else if connection.isVideoOrientationSupported,
                  let video = AVCaptureVideoOrientation(rawValue: orientation.rawValue) {
            connection.videoOrientation = video
        }
    }
}
