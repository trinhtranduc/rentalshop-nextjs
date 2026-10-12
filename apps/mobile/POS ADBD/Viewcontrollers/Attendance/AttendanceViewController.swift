//
//  AttendanceViewController.swift
//  POS ADBD
//
//  Chấm công (#909, mockup "App (nhân viên)" 2, 4, 5, 6): today's shift card, ONE button (Vào ca without an open
//  record, Ra ca with one) that opens the QR scanner, the result of the last punch (one error at a time) and
//  "Ca và công của tôi ›".
//

import UIKit
import SnapKit
import AVFoundation
import CoreLocation

final class AttendanceViewController: BaseViewControler {
    private var me: AttendanceMe?
    private var stateOverride: AttendanceState?

    private let dayLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted)
    private let shiftLabel = V2.label(size: DS.TextSize.name, weight: .bold, lines: 0)
    private let placeLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private let resultBox = UIView()
    private let resultTitle = V2.label(size: DS.TextSize.secondary, weight: .bold, lines: 0)
    private let resultMessage = V2.label(size: DS.TextSize.secondary, lines: 0)
    private let punchButton = UIButton(type: .custom)
    private let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
    private let hintLabel = V2.label(size: DS.TextSize.secondary, color: UIColor(hexString: "64748B"), lines: 0)
    private let mineRow = UIControl()
    private let permissions = AttendancePermissions()
    private var busy = false

    private var user: User? { User.account() }
    private var outletName: String? { me?.outletName ?? user?.outlet?.name }

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        render()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        navigationController?.setNavigationBarHidden(true, animated: false)
        load()
    }

    override func setupUI() {
        view.backgroundColor = .white
        let back = SettingsDetailV2.backButton()
        back.addTarget(self, action: #selector(backTapped), for: .touchUpInside)
        let line = SettingsDetailV2.installHeader(on: view, title: "attendance.title".localized(), back: back)

        let card = UIStackView(arrangedSubviews: [dayLabel, shiftLabel, placeLabel])
        card.axis = .vertical
        card.spacing = 4
        card.isLayoutMarginsRelativeArrangement = true
        card.layoutMargins = UIEdgeInsets(top: 14, left: 14, bottom: 14, right: 14)
        let cardBox = UIView()
        cardBox.layer.cornerRadius = 16
        cardBox.layer.borderWidth = 1
        cardBox.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        cardBox.addSubview(card)
        card.snp.makeConstraints { make in make.edges.equalToSuperview() }

        let resultStack = UIStackView(arrangedSubviews: [resultTitle, resultMessage])
        resultStack.axis = .vertical
        resultStack.spacing = 2
        resultBox.layer.cornerRadius = 14
        resultBox.addSubview(resultStack)
        resultStack.snp.makeConstraints { make in make.edges.equalToSuperview().inset(UIEdgeInsets(top: 12, left: 14, bottom: 12, right: 14)) }
        resultBox.isHidden = true
        resultBox.accessibilityIdentifier = "attendance.result"
        resultBox.isAccessibilityElement = true

        punchButton.layer.cornerRadius = 16
        punchButton.titleLabel?.font = Utils.boldFont(size: 19)
        punchButton.setTitleColor(.white, for: .normal)
        punchButton.tintColor = .white
        punchButton.adjustsImageWhenHighlighted = false
        punchButton.imageEdgeInsets = UIEdgeInsets(top: 0, left: -5, bottom: 0, right: 5)
        punchButton.titleEdgeInsets = UIEdgeInsets(top: 0, left: 5, bottom: 0, right: -5)
        punchButton.accessibilityIdentifier = "attendance.punch"
        punchButton.addTarget(self, action: #selector(punchTapped), for: .touchUpInside)
        punchButton.snp.makeConstraints { make in make.height.equalTo(60) }
        spinner.color = .white
        spinner.hidesWhenStopped = true
        punchButton.addSubview(spinner)
        spinner.snp.makeConstraints { make in
            make.centerY.equalToSuperview()
            make.trailing.equalToSuperview().offset(-18)
        }

        let mineTitle = V2.label("attendance.mine.title".localized(), size: DS.TextSize.body)
        let chevron = UIImageView(image: DS.symbol("chevron.right", DS.Icon.sm))
        chevron.tintColor = UIColor(hexString: "94A3B8")
        let top = V2.divider()
        let bottom = V2.divider()
        [top, mineTitle, chevron, bottom].forEach(mineRow.addSubview)
        top.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        bottom.snp.makeConstraints { make in make.bottom.leading.trailing.equalToSuperview() }
        mineTitle.snp.makeConstraints { make in
            make.leading.equalToSuperview()
            make.centerY.equalToSuperview()
        }
        chevron.snp.makeConstraints { make in
            make.trailing.equalToSuperview()
            make.centerY.equalToSuperview()
        }
        mineRow.snp.makeConstraints { make in make.height.equalTo(48) }
        mineRow.accessibilityIdentifier = "attendance.mine"
        mineRow.accessibilityLabel = "attendance.mine.title".localized()
        mineRow.accessibilityTraits = UIAccessibilityTraitButton
        mineRow.isAccessibilityElement = true
        mineRow.addTarget(self, action: #selector(mineTapped), for: .touchUpInside)

        let content = UIStackView(arrangedSubviews: [cardBox, resultBox, punchButton, hintLabel, mineRow])
        content.axis = .vertical
        content.spacing = 12
        let scroll = UIScrollView()
        scroll.alwaysBounceVertical = true
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(line.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.lg)
            make.leading.trailing.equalTo(view).inset(DS.Spacing.lg)
            make.bottom.equalToSuperview().offset(-DS.Spacing.lg)
        }
    }

    private var state: AttendanceState { stateOverride ?? AttendanceLogic.state(me) }

    private func render() {
        let now = Date()
        dayLabel.text = AttendanceLogic.todayLabel(now)
        if let shift = me?.todayShifts.first {
            shiftLabel.text = me?.todayShifts.map(AttendanceLogic.shiftLine).joined(separator: "\n") ?? AttendanceLogic.shiftLine(shift)
        } else {
            shiftLabel.text = "attendance.noShift".localized()
        }
        let status = AttendanceLogic.statusText(state)
        placeLabel.text = [outletName ?? "", status].filter { !$0.isEmpty }.joined(separator: " · ")

        let out = state == .inShift
        punchButton.setTitle((out ? "attendance.clockOut" : "attendance.clockIn").localized(), for: .normal)
        punchButton.setImage(DS.symbol("qrcode.viewfinder", 22, weight: .bold), for: .normal)
        punchButton.backgroundColor = out ? DS.Color.text : DS.Color.primary
        punchButton.isEnabled = !busy
        punchButton.alpha = busy ? 0.7 : 1
        busy ? spinner.startAnimating() : spinner.stopAnimating()

        switch state {
        case .notIn: hintLabel.text = "attendance.hint.clockIn".localized()
        case .done: hintLabel.text = "attendance.hint.again".localized()
        case .inShift: hintLabel.text = nil
        }
        hintLabel.isHidden = hintLabel.text == nil
    }

    private func load() {
        AttendanceService.shared.me { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let me):
                self.me = me
                self.stateOverride = nil
            case .failure(let failure):
                // Module turned off meanwhile: say so once, the button stays
                if failure.code == "MODULE_NOT_ENABLED" { self.show(failure: failure) }
            }
            self.render()
        }
    }

    // MARK: - Result box

    private func showSuccess(_ result: AttendancePunchResult) {
        let record = result.record
        let ok = UIColor(hexString: "065F46")
        resultBox.backgroundColor = UIColor(hexString: "ECFDF5")
        resultTitle.textColor = ok
        resultMessage.textColor = ok
        if result.isOut {
            let at = record?.checkOutAt.map { AttendanceLogic.clock($0) } ?? ""
            resultTitle.text = "✓ " + String(format: "attendance.done.out".localized(), at)
            let hours = result.todayHours ?? record.flatMap(AttendanceLogic.recordHours) ?? 0
            let span = [record?.checkInAt, record?.checkOutAt].compactMap { $0 }.map { AttendanceLogic.clock($0) }.joined(separator: " – ")
            resultMessage.text = String(format: "attendance.done.outDetail".localized(), AttendanceLogic.hours(hours), span)
            stateOverride = .done
        } else {
            let at = record?.checkInAt.map { AttendanceLogic.clock($0) } ?? ""
            resultTitle.text = "✓ " + String(format: "attendance.done.in".localized(), at)
            resultMessage.text = String(format: "attendance.done.inDetail".localized(),
                                        AttendanceLogic.meters(result.distanceM), AttendanceLogic.meters(result.accuracyM))
            stateOverride = .inShift
        }
        resultBox.accessibilityLabel = [resultTitle.text, resultMessage.text].compactMap { $0 }.joined(separator: ". ")
        resultBox.isHidden = false
        render()
    }

    private func show(failure: AttendanceFailure) {
        let copy = AttendanceLogic.errorCopy(failure, outletName: outletName)
        let red = UIColor(hexString: "991B1B")
        resultBox.backgroundColor = UIColor(hexString: "FEF2F2")
        resultTitle.textColor = red
        resultMessage.textColor = red
        resultTitle.text = copy.title
        resultMessage.text = copy.message
        resultBox.accessibilityLabel = "\(copy.title). \(copy.message)"
        resultBox.isHidden = false
    }

    // MARK: - Actions

    @objc private func backTapped() {
        navigationController?.popViewController(animated: true)
    }

    @objc private func mineTapped() {
        navigationController?.pushViewController(MyShiftsViewController(), animated: true)
    }

    @objc private func punchTapped() {
        guard !busy else { return }
        permissions.ask(from: self) { [weak self] granted in
            guard let self, granted else { return }
            let scanner = AttendanceScanViewController()
            scanner.modalPresentationStyle = .fullScreen
            scanner.onResult = { [weak self] code, location in
                self?.punch(code: code, location: location)
            }
            self.present(scanner, animated: true)
        }
    }

    private func punch(code: String, location: CLLocation?) {
        guard let location else {
            show(failure: AttendanceFailure(code: "NO_LOCATION"))
            return
        }
        busy = true
        render()
        AttendanceService.shared.punch(code: code, latitude: location.coordinate.latitude, longitude: location.coordinate.longitude,
                                       accuracy: max(0, location.horizontalAccuracy),
                                       isMock: AttendancePermissions.isMock(location)) { [weak self] result in
            guard let self else { return }
            self.busy = false
            switch result {
            case .success(let punch):
                self.showSuccess(punch)
                self.load()
            case .failure(let failure):
                self.show(failure: failure)
                self.render()
            }
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
