//
//  AttendanceScanViewController.swift
//  POS ADBD
//
//  Quét mã (#909, mockup "App (nhân viên)" 3): the camera reads the outlet's QR code while location runs.
//  On a code it waits for a fix (≤ 10 s), then hands back the code and the best location. Debug builds offer
//  "Nhập mã" for the Simulator, which has no camera.
//

import UIKit
import SnapKit
import AVFoundation
import CoreLocation

final class AttendanceScanViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate, CLLocationManagerDelegate {
    /// Code and the best location (nil when no fix came)
    var onResult: ((String, CLLocation?) -> Void)?

    /// A fix this good is used at once; otherwise the best one after `maxWait`
    static let goodAccuracy: CLLocationAccuracy = 30
    static let maxWait: TimeInterval = 10

    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let sessionQueue = DispatchQueue(label: "attendance.scan.session")
    private let locationManager = CLLocationManager()
    private var bestLocation: CLLocation?
    private var scannedCode: String?
    private var finished = false
    private let frameView = UIView()
    private let dimLayer = CAShapeLayer()
    private let titleLabel = V2.label("attendance.scan.title".localized(), size: DS.TextSize.body, weight: .medium, color: .white, lines: 0)
    private let statusLabel = V2.label("attendance.scan.locating".localized(), size: DS.TextSize.secondary, color: UIColor.white.withAlphaComponent(0.8), lines: 0)

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(hexString: "0F172A")
        view.accessibilityIdentifier = "attendance.scanner"
        setupCamera()

        dimLayer.fillRule = kCAFillRuleEvenOdd
        dimLayer.fillColor = UIColor.black.withAlphaComponent(0.35).cgColor
        view.layer.addSublayer(dimLayer)

        frameView.layer.borderWidth = 4
        frameView.layer.borderColor = UIColor.white.cgColor
        frameView.layer.cornerRadius = 22
        view.addSubview(frameView)
        frameView.snp.makeConstraints { make in
            make.width.height.equalTo(210)
            make.centerX.equalToSuperview()
            make.centerY.equalToSuperview().multipliedBy(0.76)
        }

        titleLabel.textAlignment = .center
        statusLabel.textAlignment = .center
        let texts = UIStackView(arrangedSubviews: [titleLabel, statusLabel])
        texts.axis = .vertical
        texts.spacing = 4
        view.addSubview(texts)
        texts.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-96)
        }

        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", 18, weight: .bold), for: .normal)
        close.tintColor = .white
        close.backgroundColor = UIColor.black.withAlphaComponent(0.35)
        close.layer.cornerRadius = 22
        close.accessibilityLabel = "Cancel".localized()
        close.accessibilityIdentifier = "attendance.scan.close"
        close.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        view.addSubview(close)
        close.snp.makeConstraints { make in
            make.size.equalTo(DS.touchTarget)
            make.top.equalTo(view.safeAreaLayoutGuide).offset(8)
            make.leading.equalToSuperview().offset(DS.Spacing.lg)
        }

        #if DEBUG
        let manual = UIButton(type: .system)
        manual.setTitle("attendance.scan.manual".localized(), for: .normal)
        manual.setTitleColor(.white, for: .normal)
        manual.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        manual.layer.borderColor = UIColor.white.cgColor
        manual.layer.borderWidth = 1
        manual.layer.cornerRadius = 14
        manual.accessibilityIdentifier = "attendance.manualCode"
        manual.addTarget(self, action: #selector(manualTapped), for: .touchUpInside)
        view.addSubview(manual)
        manual.snp.makeConstraints { make in
            make.height.equalTo(DS.touchTarget)
            make.width.equalTo(160)
            make.centerX.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-24)
        }
        #endif

        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
        // #973: iPad runs in landscape; the preview was turned 90° there
        CameraOrientation.apply(to: previewLayer?.connection, interface: CameraOrientation.interfaceOrientation(of: view))
        let path = UIBezierPath(rect: view.bounds)
        path.append(UIBezierPath(roundedRect: frameView.frame, cornerRadius: 22))
        dimLayer.path = path.cgPath
        dimLayer.frame = view.bounds
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        locationManager.startUpdatingLocation()
        sessionQueue.async { [session] in if !session.isRunning && !session.inputs.isEmpty { session.startRunning() } }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        locationManager.stopUpdatingLocation()
        sessionQueue.async { [session] in if session.isRunning { session.stopRunning() } }
    }

    private func setupCamera() {
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: AVMediaType.video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera), session.canAddInput(input) else { return }
        session.addInput(input)
        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        if output.availableMetadataObjectTypes.contains(.qr) { output.metadataObjectTypes = [.qr] }
        let layer = AVCaptureVideoPreviewLayer(session: session)
        layer.videoGravity = .resizeAspectFill
        view.layer.insertSublayer(layer, at: 0)
        previewLayer = layer
    }

    // MARK: - Code

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard scannedCode == nil,
              let object = metadataObjects.compactMap({ $0 as? AVMetadataMachineReadableCodeObject }).first,
              let code = object.stringValue, !code.isEmpty else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        received(code)
    }

    private func received(_ code: String) {
        guard scannedCode == nil else { return }
        scannedCode = code
        sessionQueue.async { [session] in if session.isRunning { session.stopRunning() } }
        statusLabel.text = "attendance.scan.locating".localized()
        if isGood(bestLocation) {
            finish()
        } else {
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.maxWait) { [weak self] in self?.finish() }
        }
    }

    private func isGood(_ location: CLLocation?) -> Bool {
        guard let location, location.horizontalAccuracy >= 0 else { return false }
        return location.horizontalAccuracy <= Self.goodAccuracy && abs(location.timestamp.timeIntervalSinceNow) < 30
    }

    private func finish() {
        guard !finished, let code = scannedCode else { return }
        finished = true
        locationManager.stopUpdatingLocation()
        let location = bestLocation
        dismiss(animated: true) { [onResult] in onResult?(code, location) }
    }

    // MARK: - Location

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        for location in locations where location.horizontalAccuracy >= 0 {
            if let best = bestLocation, best.horizontalAccuracy <= location.horizontalAccuracy,
               abs(best.timestamp.timeIntervalSince(location.timestamp)) < 15 { continue }
            bestLocation = location
        }
        if let best = bestLocation {
            statusLabel.text = String(format: "attendance.scan.accuracy".localized(), AttendanceLogic.meters(best.horizontalAccuracy))
        }
        if scannedCode != nil, isGood(bestLocation) { finish() }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        // Keeps waiting; `finish` hands back nil after `maxWait` when no fix came
    }

    // MARK: - Actions

    @objc private func closeTapped() {
        finished = true
        dismiss(animated: true)
    }

    #if DEBUG
    /// Simulator: paste the code the kiosk / web shows
    @objc private func manualTapped() {
        let alert = UIAlertController(title: "attendance.scan.manual".localized(), message: nil, preferredStyle: .alert)
        alert.addTextField { field in
            field.accessibilityIdentifier = "attendance.manualCode.field"
            field.autocapitalizationType = .none
            field.autocorrectionType = .no
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self, weak alert] _ in
            let code = alert?.textFields?.first?.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            guard !code.isEmpty else { return }
            self?.received(code)
        })
        present(alert, animated: true)
    }
    #endif
}
