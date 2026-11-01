//
//  OrderPhotoBlockView.swift
//  POS ADBD
//
//  #1418 condition photos: the camera / library picker, the block of the sheet (layout A) and the section of the detail.
//  Photos are the note photos' ~180 KB JPEGs (`NoteEditorLogic.compressedJPEG`).
//

import UIKit
import AVFoundation
import SnapKit
import Kingfisher

/// Opens the camera or the library and hands back a compressed JPEG
final class OrderPhotoPicker: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    weak var presenter: UIViewController?
    var onCompressing: (() -> Void)?
    var onPicked: ((Data?) -> Void)?

    func openCamera() {
        let status = AVCaptureDevice.authorizationStatus(for: .video)
        guard UIImagePickerController.isSourceTypeAvailable(.camera), status != .denied, status != .restricted else {
            showCameraUnavailable()
            return
        }
        present(.camera)
    }

    func openLibrary() {
        present(.photoLibrary)
    }

    /// Camera / library / cancel, as the note editor
    func chooseSource(from source: UIView) {
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Camera".localized(), style: .default) { [weak self] _ in self?.openCamera() })
        alert.addAction(UIAlertAction(title: "Photo Library".localized(), style: .default) { [weak self] _ in self?.openLibrary() })
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        alert.popoverPresentationController?.sourceView = source
        alert.popoverPresentationController?.sourceRect = source.bounds
        presenter?.present(alert, animated: true)
    }

    private func present(_ source: UIImagePickerController.SourceType) {
        let picker = UIImagePickerController()
        picker.sourceType = source
        picker.delegate = self
        presenter?.present(picker, animated: true)
    }

    private func showCameraUnavailable() {
        let alert = UIAlertController(title: nil, message: "order.photos.cameraUnavailable".localized(), preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "order.photos.openSettings".localized(), style: .default) { _ in
            if let url = URL(string: UIApplicationOpenSettingsURLString) { UIApplication.shared.open(url) }
        })
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        presenter?.present(alert, animated: true)
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [String: Any]) {
        picker.dismiss(animated: true)
        guard let image = info[UIImagePickerControllerOriginalImage] as? UIImage else { return }
        onCompressing?()
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let data = NoteEditorLogic.compressedJPEG(image)
            DispatchQueue.main.async { self?.onPicked?(data) }
        }
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}

/// A photo with an × that sticks out of the corner: touches on the × outside the tile still reach it
private final class PhotoTileView: UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        for subview in subviews.reversed() where !subview.isHidden && subview.isUserInteractionEnabled {
            if let hit = subview.hitTest(subview.convert(point, from: self), with: event) { return hit }
        }
        return bounds.contains(point) ? self : nil
    }
}

private final class RemovePhotoButton: UIButton {
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        bounds.insetBy(dx: -10, dy: -10).contains(point)
    }
}

/// The block of the hand-over sheet: photos chosen so far, × to drop one, and the two buttons until 3/3
final class OrderPhotoBlockView: UIStackView {
    private(set) var photos: [Data]
    var onChange: (() -> Void)?

    private let picker = OrderPhotoPicker()
    private let countLabel = V2.label(size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
    private let tiles = UIStackView()
    private let buttons = UIStackView()
    private let cameraButton = UIButton(type: .system)
    private let libraryButton = UIButton(type: .system)
    private let fullLabel = V2.label(size: DS.TextSize.secondary, color: DS.Color.textMuted, lines: 0)
    private var compressing = 0

    private static let tileSize: CGFloat = 64

    init(photos: [Data], presenter: UIViewController) {
        self.photos = photos
        super.init(frame: .zero)
        picker.presenter = presenter
        picker.onCompressing = { [weak self] in
            self?.compressing += 1
            self?.render()
        }
        picker.onPicked = { [weak self] data in
            guard let self else { return }
            self.compressing -= 1
            if let data, OrderPhotoLogic.canAdd(count: self.photos.count) {
                self.photos.append(data)
                self.onChange?()
            }
            self.render()
        }
        build()
        render()
    }

    required init(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func build() {
        axis = .vertical
        spacing = DS.Spacing.sm

        let title = V2.label("order.photos.title".localized(), size: DS.TextSize.secondary, weight: .bold, color: DS.Color.textMuted)
        let optional = V2.label("order.photos.optional".localized(), size: 12, color: DS.Color.textMuted)
        countLabel.accessibilityIdentifier = "orderPhotos.count"
        countLabel.setContentHuggingPriority(.required, for: .horizontal)
        let spacer = UIView()
        spacer.setContentHuggingPriority(.defaultLow, for: .horizontal)
        let header = UIStackView(arrangedSubviews: [title, optional, spacer, countLabel])
        header.alignment = .firstBaseline
        header.spacing = DS.Spacing.sm

        tiles.axis = .horizontal
        tiles.spacing = DS.Spacing.sm
        tiles.alignment = .center

        style(cameraButton, symbol: "camera", primary: true)
        cameraButton.accessibilityIdentifier = "orderPhotos.camera"
        cameraButton.addAction(UIAction { [weak self] _ in self?.picker.openCamera() }, for: .touchUpInside)
        style(libraryButton, symbol: "photo", primary: false)
        libraryButton.setTitle(" " + "order.photos.library".localized(), for: .normal)
        libraryButton.accessibilityIdentifier = "orderPhotos.library"
        libraryButton.addAction(UIAction { [weak self] _ in self?.picker.openLibrary() }, for: .touchUpInside)
        buttons.addArrangedSubview(cameraButton)
        buttons.addArrangedSubview(libraryButton)
        buttons.spacing = DS.Spacing.sm
        libraryButton.snp.makeConstraints { make in make.width.equalTo(cameraButton).multipliedBy(0.58) }

        fullLabel.text = String(format: "order.photos.full".localized(), OrderPhotoLogic.maxPhotos)
        fullLabel.accessibilityIdentifier = "orderPhotos.full"

        [header, tiles, buttons, fullLabel].forEach(addArrangedSubview)
        setCustomSpacing(DS.Spacing.md, after: header)
    }

    private func style(_ button: UIButton, symbol: String, primary: Bool) {
        button.setImage(DS.symbol(symbol, primary ? 20 : 18), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: primary ? DS.TextSize.input : DS.TextSize.body)
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.titleLabel?.minimumScaleFactor = 0.8
        button.tintColor = primary ? DS.Color.primary : DS.Color.text
        button.backgroundColor = primary ? UIColor(hexString: "EFF6FF") : .white
        button.layer.cornerRadius = 14
        button.layer.borderWidth = primary ? 1.5 : 1
        button.layer.borderColor = (primary ? DS.Color.primary : V2.border).cgColor
        button.snp.makeConstraints { make in make.height.equalTo(52) }
    }

    private func render() {
        let used = photos.count + compressing
        countLabel.text = OrderPhotoLogic.countLabel(used)
        tiles.arrangedSubviews.forEach { $0.removeFromSuperview() }
        photos.enumerated().forEach { index, data in tiles.addArrangedSubview(tile(index: index, data: data)) }
        (0..<compressing).forEach { _ in tiles.addArrangedSubview(compressingTile()) }
        if used > 0 { tiles.addArrangedSubview(UIView()) }
        tiles.isHidden = used == 0
        let canAdd = OrderPhotoLogic.canAdd(count: used)
        buttons.isHidden = !canAdd
        fullLabel.isHidden = canAdd
        cameraButton.setTitle(" " + (used == 0 ? "order.photos.take" : "order.photos.takeMore").localized(), for: .normal)
    }

    private func tile(index: Int, data: Data) -> UIView {
        let image = UIImageView(image: UIImage(data: data))
        image.contentMode = .scaleAspectFill
        image.clipsToBounds = true
        image.layer.cornerRadius = 10
        image.backgroundColor = UIColor(hexString: "E2E8F0")
        let remove = RemovePhotoButton(type: .system)
        remove.setImage(DS.symbol("xmark", 11, weight: .bold), for: .normal)
        remove.tintColor = .white
        remove.backgroundColor = DS.Color.text
        remove.layer.cornerRadius = 11
        remove.layer.borderWidth = 1
        remove.layer.borderColor = UIColor.white.cgColor
        remove.accessibilityLabel = "Remove photo".localized()
        remove.accessibilityIdentifier = "orderPhotos.remove.\(index)"
        remove.addAction(UIAction { [weak self] _ in
            guard let self, self.photos.indices.contains(index) else { return }
            self.photos.remove(at: index)
            self.onChange?()
            self.render()
        }, for: .touchUpInside)
        let container = PhotoTileView()
        container.addSubview(image)
        container.addSubview(remove)
        container.snp.makeConstraints { make in make.size.equalTo(Self.tileSize) }
        image.snp.makeConstraints { make in make.edges.equalToSuperview() }
        remove.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(-5)
            make.trailing.equalToSuperview().offset(5)
            make.size.equalTo(22)
        }
        return container
    }

    private func compressingTile() -> UIView {
        let box = UIView()
        box.backgroundColor = UIColor(hexString: "E2E8F0")
        box.layer.cornerRadius = 10
        let spinner = UIActivityIndicatorView(activityIndicatorStyle: .medium)
        spinner.startAnimating()
        box.addSubview(spinner)
        spinner.snp.makeConstraints { make in make.center.equalToSuperview() }
        box.snp.makeConstraints { make in make.size.equalTo(Self.tileSize) }
        return box
    }
}

/// The section of the order detail: uploaded photos, those still waiting (faded), "Thêm" and the failure line.
/// There is no delete: an uploaded photo stays.
enum OrderPhotoSection {
    static func content(title: String, urls: [String], waiting: [Data], failed: Bool, id: String,
                        onOpen: @escaping (UIImage) -> Void, onAdd: ((UIView) -> Void)?, onRetry: @escaping () -> Void) -> UIView {
        let column = UIStackView()
        column.axis = .vertical
        column.spacing = DS.Spacing.sm
        column.accessibilityIdentifier = id

        // An ordinary row of the papers section, like "Khi nhận trả": not a section title
        let label = V2.label("\(title) · \(urls.count + waiting.count)", size: DS.TextSize.body, color: DS.Color.textMuted)
        label.accessibilityIdentifier = id + ".title"
        label.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(38) }
        column.addArrangedSubview(label)
        column.setCustomSpacing(0, after: label)

        let row = UIStackView()
        row.axis = .horizontal
        row.spacing = DS.Spacing.sm
        for url in urls {
            let tile = thumb(onOpen: onOpen)
            tile.kf.setImage(with: URL(string: url), for: .normal, placeholder: UIImage(systemName: "photo"))
            row.addArrangedSubview(tile)
        }
        for data in waiting {
            let tile = thumb(onOpen: onOpen)
            tile.setImage(UIImage(data: data), for: .normal)
            tile.alpha = 0.45
            tile.accessibilityIdentifier = id + ".waiting"
            row.addArrangedSubview(tile)
        }
        if let onAdd { row.addArrangedSubview(addTile(id: id, onAdd: onAdd)) }
        row.addArrangedSubview(UIView())
        column.addArrangedSubview(row)

        if failed { column.addArrangedSubview(failure(count: waiting.count, id: id, onRetry: onRetry)) }
        return column
    }

    private static func thumb(onOpen: @escaping (UIImage) -> Void) -> UIButton {
        let tile = UIButton(type: .custom)
        tile.imageView?.contentMode = .scaleAspectFill
        tile.clipsToBounds = true
        tile.layer.cornerRadius = 10
        tile.backgroundColor = UIColor(hexString: "E2E8F0")
        tile.tintColor = DS.Color.textMuted
        tile.accessibilityLabel = "order.photos.title".localized()
        tile.addAction(UIAction { [weak tile] _ in
            if let image = tile?.image(for: .normal) { onOpen(image) }
        }, for: .touchUpInside)
        tile.snp.makeConstraints { make in make.size.equalTo(64) }
        return tile
    }

    private static func addTile(id: String, onAdd: @escaping (UIView) -> Void) -> UIView {
        var config = UIButton.Configuration.plain()
        config.image = DS.symbol("camera", 22)
        config.imagePlacement = .top
        config.imagePadding = 2
        config.title = "notes.v2.add".localized()
        config.baseForegroundColor = DS.Color.primary
        config.contentInsets = .zero
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.boldFont(size: 12)
            return outgoing
        }
        let add = UIButton(type: .custom)
        add.configuration = config
        add.backgroundColor = UIColor(hexString: "EFF6FF")
        add.layer.cornerRadius = 10
        add.layer.borderWidth = 1
        add.layer.borderColor = UIColor(hexString: "93C5FD").cgColor
        add.accessibilityIdentifier = id + ".add"
        add.addAction(UIAction { [weak add] _ in
            if let add { onAdd(add) }
        }, for: .touchUpInside)
        add.snp.makeConstraints { make in make.size.equalTo(64) }
        return add
    }

    private static func failure(count: Int, id: String, onRetry: @escaping () -> Void) -> UIView {
        let text = V2.label(String(format: "order.photos.notUploaded".localized(), count), size: DS.TextSize.secondary, color: V2.warn, lines: 0)
        text.accessibilityIdentifier = id + ".failed"
        let retry = UIButton(type: .system)
        retry.setTitle("Retry".localized(), for: .normal)
        retry.titleLabel?.font = Utils.boldFont(size: DS.TextSize.body)
        retry.tintColor = DS.Color.primary
        retry.accessibilityIdentifier = id + ".retry"
        retry.setContentCompressionResistancePriority(.required, for: .horizontal)
        retry.setContentHuggingPriority(.required, for: .horizontal)
        retry.addAction(UIAction { _ in onRetry() }, for: .touchUpInside)
        retry.snp.makeConstraints { make in make.height.greaterThanOrEqualTo(DS.touchTarget) }
        let row = UIStackView(arrangedSubviews: [text, retry])
        row.alignment = .center
        row.spacing = DS.Spacing.md
        row.isLayoutMarginsRelativeArrangement = true
        row.layoutMargins = UIEdgeInsets(top: 4, left: 12, bottom: 4, right: 12)
        row.backgroundColor = UIColor(hexString: "FFEDD5")
        row.layer.cornerRadius = 10
        return row
    }
}
