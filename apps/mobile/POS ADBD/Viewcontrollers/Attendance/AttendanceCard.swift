//
//  AttendanceCard.swift
//  POS ADBD
//
//  #927 card L at the top of Cài đặt (mockup "App: Vào ca / Ra ca mới (chọn)" → "Chốt: thẻ giờ lớn ở Cài đặt"):
//  a big number (time now, time on shift, or the day's hours), one line, ONE button that opens the QR scanner at
//  once, "Ca và công của tôi ›". The result of a punch shows inside the card (✓ line) or in a red box under it.
//  Replaces the separate "Chấm công" screen of #909.
//

import UIKit
import SnapKit
import AVFoundation
import CoreLocation

final class SettingsAttendanceCardCell: UITableViewCell {
    static let reuseId = "SettingsAttendanceCardCell"

    var onPunch: (() -> Void)?
    var onMine: (() -> Void)?

    private let card = UIView()
    private let bigLabel = UILabel()
    private let lineLabel = V2.label(size: 13, color: UIColor(hexString: "64748B"), lines: 0)
    private let successLabel = V2.label(size: DS.TextSize.secondary, weight: .bold, color: UIColor(hexString: "065F46"), lines: 0)
    private let punchButton = UIButton(type: .custom)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let mineButton = UIButton(type: .system)
    private let errorBox = UIView()
    private let errorTitle = V2.label(size: DS.TextSize.secondary, weight: .bold, color: UIColor(hexString: "991B1B"), lines: 0)
    private let errorMessage = V2.label(size: DS.TextSize.secondary, color: UIColor(hexString: "991B1B"), lines: 0)

    override init(style: UITableViewCellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear

        card.layer.cornerRadius = 18
        card.layer.borderWidth = 1
        card.accessibilityIdentifier = "settings.attendance.card"

        bigLabel.font = UIFont.monospacedDigitSystemFont(ofSize: 34, weight: .bold)
        bigLabel.textColor = DS.Color.text
        bigLabel.textAlignment = .center
        bigLabel.adjustsFontSizeToFitWidth = true
        bigLabel.minimumScaleFactor = 0.6
        bigLabel.accessibilityIdentifier = "attendance.card.big"
        lineLabel.textAlignment = .center
        lineLabel.accessibilityIdentifier = "attendance.card.line"
        successLabel.textAlignment = .center
        successLabel.isHidden = true
        successLabel.accessibilityIdentifier = "attendance.result"

        punchButton.layer.cornerRadius = 12
        punchButton.titleLabel?.font = Utils.boldFont(size: 16)
        punchButton.setTitleColor(.white, for: .normal)
        punchButton.tintColor = .white
        punchButton.adjustsImageWhenHighlighted = false
        punchButton.setImage(DS.symbol("qrcode.viewfinder", 20, weight: .bold), for: .normal)
        punchButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: -4, bottom: 0, right: 4)
        punchButton.titleEdgeInsets = UIEdgeInsets(top: 0, left: 4, bottom: 0, right: -4)
        punchButton.accessibilityIdentifier = "attendance.punch"
        punchButton.addTarget(self, action: #selector(punchTapped), for: .touchUpInside)
        punchButton.snp.makeConstraints { make in make.height.equalTo(46) }
        spinner.color = .white
        spinner.hidesWhenStopped = true
        punchButton.addSubview(spinner)
        spinner.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview().offset(-14)
        }

        mineButton.setTitle("attendance.mine.title".localized() + " ›", for: .normal)
        mineButton.setTitleColor(DS.Color.primary, for: .normal)
        mineButton.titleLabel?.font = Utils.regularFont(size: 13)
        mineButton.accessibilityIdentifier = "attendance.mine"
        mineButton.addTarget(self, action: #selector(mineTapped), for: .touchUpInside)
        mineButton.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(32) }

        let stack = UIStackView(arrangedSubviews: [bigLabel, lineLabel, successLabel, punchButton, mineButton])
        stack.axis = .vertical
        stack.spacing = 4
        stack.setCustomSpacing(10, after: lineLabel)
        stack.setCustomSpacing(10, after: successLabel)
        stack.setCustomSpacing(4, after: punchButton)
        card.addSubview(stack)
        stack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 14, left: 14, bottom: 6, right: 14)) }

        let errorStack = UIStackView(arrangedSubviews: [errorTitle, errorMessage])
        errorStack.axis = .vertical
        errorStack.spacing = 2
        errorBox.backgroundColor = UIColor(hexString: "FEF2F2")
        errorBox.layer.cornerRadius = 14
        errorBox.addSubview(errorStack)
        errorStack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)) }
        errorBox.isHidden = true
        errorBox.isAccessibilityElement = true
        errorBox.accessibilityIdentifier = "attendance.error"

        let outer = UIStackView(arrangedSubviews: [card, errorBox])
        outer.axis = .vertical
        outer.spacing = 8
        contentView.addSubview(outer)
        outer.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(UIEdgeInsets(top: 4, left: DS.Spacing.lg, bottom: 12, right: DS.Spacing.lg))
        }
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func configure(_ model: AttendanceCardModel, success: String?, error: AttendanceErrorCopy?, busy: Bool) {
        card.backgroundColor = model.isGreen ? UIColor(hexString: "ECFDF5") : .white
        card.layer.borderColor = UIColor(hexString: model.isGreen ? "A7F3D0" : "E2E8F0").cgColor
        setBig(model.big)
        lineLabel.text = model.line
        successLabel.text = success
        successLabel.isHidden = (success ?? "").isEmpty
        successLabel.accessibilityLabel = success
        punchButton.setTitle(model.button, for: .normal)
        punchButton.backgroundColor = model.state == .inShift ? DS.Color.text : DS.Color.primary
        punchButton.isEnabled = !busy
        punchButton.alpha = busy ? 0.7 : 1
        busy ? spinner.startAnimating() : spinner.stopAnimating()
        errorTitle.text = error?.title
        errorMessage.text = error?.message
        errorBox.accessibilityLabel = error.map { "\($0.title). \($0.message)" }
        errorBox.isHidden = error == nil
    }

    /// The ticking number only (no relayout)
    func setBig(_ text: String) {
        guard bigLabel.text != text else { return }
        bigLabel.text = text
        bigLabel.accessibilityLabel = text
    }

    @objc private func punchTapped() { onPunch?() }
    @objc private func mineTapped() { onMine?() }
}

/// Permissions → scanner → POST /punch. Completion on main; nil = cancelled before any call.
final class AttendancePunchFlow {
    private let permissions = AttendancePermissions()
    private(set) var busy = false

    func start(from controller: UIViewController, onCall: @escaping () -> Void,
               completion: @escaping (Result<AttendancePunchResult, AttendanceFailure>) -> Void) {
        guard !busy else { return }
        permissions.ask(from: controller) { [weak self, weak controller] granted in
            guard let self, let controller, granted else { return }
            let scanner = AttendanceScanViewController()
            scanner.modalPresentationStyle = .fullScreen
            scanner.onResult = { [weak self] code, location in
                guard let self else { return }
                guard let location else {
                    completion(.failure(AttendanceFailure(code: "NO_LOCATION")))
                    return
                }
                self.busy = true
                onCall()
                AttendanceService.shared.punch(code: code, latitude: location.coordinate.latitude,
                                               longitude: location.coordinate.longitude,
                                               accuracy: max(0, location.horizontalAccuracy),
                                               isMock: AttendancePermissions.isMock(location)) { [weak self] result in
                    self?.busy = false
                    completion(result)
                }
            }
            controller.present(scanner, animated: true)
        }
    }
}

/// Camera, then when-in-use location. Denied → an alert that opens the app's Settings.
final class AttendancePermissions: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var waiting: ((Bool) -> Void)?

    /// `isMock = location.sourceInformation?.isSimulatedBySoftware ?? false` (iOS 15+)
    static func isMock(_ location: CLLocation) -> Bool {
        #if DEBUG && targetEnvironment(simulator)
        // The Simulator marks every location as simulated; e2e passes `-attendanceRealMock` to keep the flag
        if !ProcessInfo.processInfo.arguments.contains("-attendanceRealMock") { return false }
        #endif
        if #available(iOS 15.0, *) {
            return location.sourceInformation?.isSimulatedBySoftware ?? false
        }
        return false
    }

    func ask(from controller: UIViewController, completion: @escaping (Bool) -> Void) {
        askCamera(from: controller) { [weak self, weak controller] granted in
            guard let self, let controller, granted else { completion(false); return }
            self.askLocation(from: controller, completion: completion)
        }
    }

    private func askCamera(from controller: UIViewController, completion: @escaping (Bool) -> Void) {
        #if targetEnvironment(simulator)
        // No camera on the Simulator: the scanner offers manual entry (Debug)
        completion(true)
        return
        #else
        switch AVCaptureDevice.authorizationStatus(for: AVMediaType.video) {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: AVMediaType.video) { granted in
                DispatchQueue.main.async {
                    if !granted { Self.guideToSettings(from: controller, message: "attendance.permission.camera".localized()) }
                    completion(granted)
                }
            }
        default:
            Self.guideToSettings(from: controller, message: "attendance.permission.camera".localized())
            completion(false)
        }
        #endif
    }

    private func askLocation(from controller: UIViewController, completion: @escaping (Bool) -> Void) {
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways:
            completion(true)
        case .notDetermined:
            waiting = { [weak controller] granted in
                if !granted, let controller { Self.guideToSettings(from: controller, message: "attendance.permission.location".localized()) }
                completion(granted)
            }
            manager.delegate = self
            manager.requestWhenInUseAuthorization()
        default:
            Self.guideToSettings(from: controller, message: "attendance.permission.location".localized())
            completion(false)
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        guard let waiting, manager.authorizationStatus != .notDetermined else { return }
        self.waiting = nil
        let granted = manager.authorizationStatus == .authorizedWhenInUse || manager.authorizationStatus == .authorizedAlways
        DispatchQueue.main.async { waiting(granted) }
    }

    static func guideToSettings(from controller: UIViewController, message: String) {
        let alert = UIAlertController(title: "attendance.permission.title".localized(), message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "attendance.permission.openSettings".localized(), style: .default) { _ in
            if let url = URL(string: UIApplicationOpenSettingsURLString) { UIApplication.shared.open(url) }
        })
        controller.present(alert, animated: true)
    }
}
