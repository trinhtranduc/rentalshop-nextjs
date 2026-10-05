//
//  OrderNotesEditorViewController.swift
//  POS ADBD
//
//  Note text + up to 5 photos for the redesigned order detail (#372). Saved photos stay URLs (so removing
//  one never depends on it having loaded); new photos are images until the order is saved.
//  #477: full-screen look of board GC-ghi-chu (X + "Ghi chú #0057", new field, 72pt tiles, dashed "Thêm",
//  "Lưu ghi chú" pinned above the keyboard). Also opened by the cart v2 note row (#480: with photos, kept by the cart).
//  Presented `.overFullScreen`: the presenter stays in place, so a pushed screen's hidden tab bar stays hidden.
//

import UIKit
import SnapKit
import Kingfisher
import IQKeyboardManagerSwift

final class OrderNotesEditorViewController: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate, UITextViewDelegate {
    enum Photo {
        case saved(String)
        case new(UIImage)
    }

    /// text, kept saved URLs, new images
    var onSave: ((String, [String], [UIImage]) -> Void)?

    private var photos: [Photo]
    private let initialText: String
    private let maxPhotos: Int
    private let orderNumber: String?
    private let textView = UITextView()
    private let ring = UIView()
    private let tilesStack = UIStackView()
    private let countLabel = V2.label(size: DS.TextSize.secondary, color: UIColor(hexString: "64748B"))
    private let addButton = UIButton(type: .custom)
    private var tileImages: [Int: UIImageView] = [:]
    private var keyboardManagerWasEnabled = true

    private static let tileSize: CGFloat = 72
    private static let tilesPerRow = 4

    /// `newImages`: photos not uploaded yet (the cart's). `maxPhotos` 0 hides the photo block (cart in edit mode).
    init(text: String, savedURLs: [String], newImages: [UIImage] = [], orderNumber: String? = nil,
         maxPhotos: Int = OrderDetailLogic.maxNotePhotos) {
        initialText = text
        photos = savedURLs.map { .saved($0) } + newImages.map { .new($0) }
        self.orderNumber = orderNumber
        self.maxPhotos = maxPhotos
        super.init(nibName: nil, bundle: nil)
        // #480: `.fullScreen` removed the cart from the window; on dismiss its hidden tab bar came back
        modalPresentationStyle = .overFullScreen
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    /// Cart v2 note row (#477): same editor; saves the cart note as the old alert did. #480: with photos, kept by
    /// the cart (memory only) and sent on create. Editing an existing order stays text only (its photos live on the
    /// order detail).
    static func presentCartNote(from presenter: UIViewController) {
        let store = CartStore.shared
        let editMode = store.cart.isEditMode
        // Photos already kept by the cart keep their compressed bytes; only new picks are compressed
        let kept = store.noteImageData.compactMap { data in UIImage(data: data).map { ($0, data) } }
        var keptData: [ObjectIdentifier: Data] = [:]
        kept.forEach { keptData[ObjectIdentifier($0.0)] = $0.1 }
        let editor = OrderNotesEditorViewController(text: store.cart.notes ?? "", savedURLs: [],
                                                    newImages: editMode ? [] : kept.map { $0.0 },
                                                    maxPhotos: editMode ? 0 : OrderDetailLogic.maxNotePhotos)
        editor.onSave = { text, _, images in
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            store.setNotes(trimmed.isEmpty ? nil : trimmed)
            guard !editMode else { return }
            store.setNoteImageData(images.compactMap { keptData[ObjectIdentifier($0)] ?? NoteEditorLogic.compressedJPEG($0) })
        }
        presenter.present(editor, animated: true)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface
        buildLayout()
        renderPhotos()
        let tap = UITapGestureRecognizer(target: view, action: #selector(UIView.endEditing(_:)))
        tap.cancelsTouchesInView = false
        view.addGestureRecognizer(tap)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // The save bar rides on the keyboard (#461 pattern); IQKeyboardManager would shift the screen too
        keyboardManagerWasEnabled = IQKeyboardManager.shared.enable
        IQKeyboardManager.shared.enable = false
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        IQKeyboardManager.shared.enable = keyboardManagerWasEnabled
    }

    // MARK: - Layout

    private func buildLayout() {
        // Header: X (discard) + "Ghi chú #0057"
        let close = UIButton(type: .system)
        close.setImage(DS.symbol("xmark", DS.Icon.lg, weight: .semibold), for: .normal)
        close.tintColor = DS.Color.text
        close.accessibilityLabel = "notes.v2.discard".localized()
        close.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        close.snp.makeConstraints { make in make.size.equalTo(DS.touchTarget) }

        let title = UILabel()
        let text = NSMutableAttributedString(string: "Notes".localized(), attributes: [
            NSAttributedString.Key.font: Utils.boldFont(size: 20),
            NSAttributedString.Key.foregroundColor: DS.Color.text,
        ])
        if let suffix = NoteEditorLogic.titleSuffix(orderNumber: orderNumber) {
            text.append(NSAttributedString(string: " " + suffix, attributes: [
                NSAttributedString.Key.font: Utils.mediumFont(size: DS.TextSize.body),
                NSAttributedString.Key.foregroundColor: DS.Color.textMuted,
            ]))
        }
        title.attributedText = text
        title.accessibilityTraits = UIAccessibilityTraitHeader
        let header = UIStackView(arrangedSubviews: [close, title])
        header.alignment = .center
        header.spacing = 4
        let headerLine = V2.divider()
        headerLine.backgroundColor = DS.Color.border
        [header, headerLine].forEach(view.addSubview)
        header.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.sm)
            make.leading.equalToSuperview().offset(DS.Spacing.sm)
            make.trailing.lessThanOrEqualToSuperview().offset(-DS.Spacing.sm)
        }
        headerLine.snp.makeConstraints { make in
            make.top.equalTo(header.snp.bottom).offset(DS.Spacing.sm)
            make.leading.trailing.equalToSuperview()
        }

        // Bottom bar: "Lưu ghi chú", on the keyboard while it is up, else on the safe area
        let bottom = UIView()
        bottom.backgroundColor = .white
        let bottomLine = V2.divider()
        bottomLine.backgroundColor = DS.Color.border
        let save = V2.primaryButton("notes.v2.save".localized())
        save.snp.remakeConstraints { make in make.height.equalTo(54) }
        save.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        [bottomLine, save].forEach(bottom.addSubview)
        view.addSubview(bottom)
        bottom.snp.makeConstraints { make in make.leading.trailing.bottom.equalToSuperview() }
        bottomLine.snp.makeConstraints { make in make.top.leading.trailing.equalToSuperview() }
        save.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(DS.Spacing.md)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
            make.bottom.equalTo(view.keyboardLayoutGuide.snp.top).offset(-DS.Spacing.md)
        }

        let scroll = UIScrollView()
        scroll.keyboardDismissMode = .interactive
        scroll.alwaysBounceVertical = true
        view.addSubview(scroll)
        scroll.snp.makeConstraints { make in
            make.top.equalTo(headerLine.snp.bottom)
            make.leading.trailing.equalToSuperview()
            make.bottom.equalTo(bottom.snp.top)
        }
        let content = UIStackView()
        content.axis = .vertical
        content.spacing = 18
        content.isLayoutMarginsRelativeArrangement = true
        content.layoutMargins = UIEdgeInsets(top: DS.Spacing.lg, left: DS.Spacing.lg, bottom: DS.Spacing.lg, right: DS.Spacing.lg)
        scroll.addSubview(content)
        content.snp.makeConstraints { make in
            make.edges.equalTo(scroll.contentLayoutGuide)
            make.width.equalTo(scroll.frameLayoutGuide)
        }

        content.addArrangedSubview(contentField())
        if maxPhotos > 0 {
            content.addArrangedSubview(photosBlock())
        }
    }

    /// "Nội dung" over a 140pt area: 12 radius, slate border; focused = blue border + light blue ring
    private func contentField() -> UIView {
        let label = V2.label("notes.v2.content".localized(), size: DS.TextSize.body, weight: .bold)
        textView.text = initialText
        textView.font = Utils.regularFont(size: DS.TextSize.input)
        textView.textColor = DS.Color.text
        textView.backgroundColor = .white
        textView.layer.cornerRadius = DS.Radius.card
        textView.layer.borderWidth = 1.5
        textView.layer.borderColor = V2.border.cgColor
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 10, bottom: 12, right: 10)
        textView.accessibilityLabel = "notes.v2.content".localized()
        textView.autocapitalizationType = .sentences
        textView.delegate = self
        attachDoneBar(to: textView)

        ring.layer.cornerRadius = DS.Radius.card + 3
        ring.layer.borderWidth = 3
        ring.layer.borderColor = UIColor.clear.cgColor
        ring.addSubview(textView)
        textView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(3)
            make.height.equalTo(140)
        }
        // The 3pt ring is part of the field's box, so label → field reads as the board's 6pt
        let stack = UIStackView(arrangedSubviews: [label, ring])
        stack.axis = .vertical
        stack.spacing = 3
        return stack
    }

    private func attachDoneBar(to textView: UITextView) {
        let bar = UIToolbar(frame: CGRect(x: 0, y: 0, width: UIScreen.main.bounds.width, height: 44))
        let done = UIBarButtonItem(title: "Done".localized(), style: .done, target: textView,
                                   action: #selector(UIResponder.resignFirstResponder))
        done.tintColor = DS.Color.primary
        bar.items = [UIBarButtonItem(barButtonSystemItem: .flexibleSpace, target: nil, action: nil), done]
        bar.sizeToFit()
        textView.inputAccessoryView = bar
    }

    private func photosBlock() -> UIView {
        let title = V2.label("Photos".localized(), size: DS.TextSize.body, weight: .bold)
        let titleRow = UIStackView(arrangedSubviews: [title, UIView(), countLabel])
        titleRow.alignment = .firstBaseline

        tilesStack.axis = .vertical
        tilesStack.spacing = DS.Spacing.md
        tilesStack.alignment = .leading

        var config = UIButton.Configuration.plain()
        config.image = DS.symbol("camera", DS.Icon.lg)
        config.imagePlacement = .top
        config.imagePadding = 2
        config.title = "notes.v2.add".localized()
        config.baseForegroundColor = DS.Color.primary
        config.contentInsets = .zero
        config.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
            var outgoing = incoming
            outgoing.font = Utils.boldFont(size: DS.TextSize.secondary)
            return outgoing
        }
        addButton.configuration = config
        addButton.backgroundColor = V2.sectionFill
        addButton.layer.cornerRadius = DS.Radius.card
        addButton.accessibilityLabel = "Add photos".localized()
        addButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        addButton.snp.makeConstraints { make in make.size.equalTo(Self.tileSize) }
        let dashed = DashedBorderView()
        dashed.isUserInteractionEnabled = false
        addButton.addSubview(dashed)
        dashed.snp.makeConstraints { make in make.edges.equalToSuperview() }

        let hint = V2.label("notes.v2.photoHint".localized(), size: DS.TextSize.secondary, color: UIColor(hexString: "64748B"), lines: 0)

        let stack = UIStackView(arrangedSubviews: [titleRow, tilesStack, hint])
        stack.axis = .vertical
        stack.spacing = 10
        // Room for the × badges that stick out of the first row
        stack.setCustomSpacing(16, after: titleRow)
        return stack
    }

    private func renderPhotos() {
        guard maxPhotos > 0 else { return }
        tilesStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        tileImages = [:]
        var tiles: [UIView] = photos.enumerated().map { index, photo in photoTile(index: index, photo: photo) }
        if NoteEditorLogic.canAdd(count: photos.count, max: maxPhotos) {
            tiles.append(addButton)
        }
        stride(from: 0, to: tiles.count, by: Self.tilesPerRow).forEach { start in
            let row = UIStackView(arrangedSubviews: Array(tiles[start..<min(start + Self.tilesPerRow, tiles.count)]))
            row.spacing = DS.Spacing.md
            tilesStack.addArrangedSubview(row)
        }
        countLabel.text = NoteEditorLogic.countLabel(count: photos.count, max: maxPhotos)
    }

    private func photoTile(index: Int, photo: Photo) -> UIView {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = DS.Radius.card
        imageView.layer.borderWidth = 1
        imageView.layer.borderColor = UIColor(hexString: "E2E8F0").cgColor
        imageView.backgroundColor = UIColor(hexString: "E2E8F0")
        imageView.tintColor = DS.Color.textMuted
        switch photo {
        case .saved(let url):
            imageView.kf.setImage(with: URL(string: url), placeholder: DS.symbol("photo", DS.Icon.lg))
        case .new(let image):
            imageView.image = image
        }
        tileImages[index] = imageView

        let open = UIButton(type: .custom)
        open.tag = index
        open.accessibilityLabel = "Note photo".localized()
        open.addTarget(self, action: #selector(photoTapped(_:)), for: .touchUpInside)

        let remove = HitSlopButton(type: .system)
        remove.setImage(DS.symbol("xmark", 12, weight: .bold), for: .normal)
        remove.tintColor = .white
        remove.backgroundColor = DS.Color.text
        remove.layer.cornerRadius = 12
        remove.layer.borderWidth = 2
        remove.layer.borderColor = UIColor.white.cgColor
        remove.tag = index
        remove.accessibilityLabel = "Remove photo".localized()
        remove.addTarget(self, action: #selector(removeTapped(_:)), for: .touchUpInside)

        let container = OverflowTouchView()
        [imageView, open, remove].forEach(container.addSubview)
        container.snp.makeConstraints { make in make.size.equalTo(Self.tileSize) }
        imageView.snp.makeConstraints { make in make.edges.equalToSuperview() }
        open.snp.makeConstraints { make in make.edges.equalToSuperview() }
        remove.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(-6)
            make.trailing.equalToSuperview().offset(6)
            make.size.equalTo(24)
        }
        return container
    }

    // MARK: - Text field focus

    func textViewDidBeginEditing(_ textView: UITextView) {
        textView.layer.borderColor = DS.Color.primary.cgColor
        ring.layer.borderColor = UIColor(hexString: "DBEAFE").cgColor
    }

    func textViewDidEndEditing(_ textView: UITextView) {
        textView.layer.borderColor = V2.border.cgColor
        ring.layer.borderColor = UIColor.clear.cgColor
    }

    // MARK: - Photos

    @objc private func photoTapped(_ sender: UIButton) {
        guard let image = tileImages[sender.tag]?.image, photos.indices.contains(sender.tag) else { return }
        // Same viewer as the old note screen
        let viewer = NoteImagePreviewViewController(image: image)
        viewer.modalPresentationStyle = .fullScreen
        present(viewer, animated: true)
    }

    @objc private func removeTapped(_ sender: UIButton) {
        guard photos.indices.contains(sender.tag) else { return }
        photos.remove(at: sender.tag)
        renderPhotos()
    }

    @objc private func addTapped() {
        guard NoteEditorLogic.canAdd(count: photos.count, max: maxPhotos) else { return }
        view.endEditing(true)
        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Photo Library".localized(), style: .default) { [weak self] _ in
            self?.presentPicker(.photoLibrary)
        })
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            alert.addAction(UIAlertAction(title: "Camera".localized(), style: .default) { [weak self] _ in
                self?.presentPicker(.camera)
            })
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))
        if let popover = alert.popoverPresentationController {
            popover.sourceView = addButton
            popover.sourceRect = addButton.bounds
        }
        present(alert, animated: true)
    }

    private func presentPicker(_ source: UIImagePickerController.SourceType) {
        let picker = UIImagePickerController()
        picker.sourceType = source
        picker.delegate = self
        present(picker, animated: true)
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [String: Any]) {
        picker.dismiss(animated: true)
        guard let image = info[UIImagePickerControllerOriginalImage] as? UIImage,
              NoteEditorLogic.canAdd(count: photos.count, max: maxPhotos) else { return }
        photos.append(.new(image))
        renderPhotos()
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }

    // MARK: - Actions

    @objc private func cancelTapped() {
        view.endEditing(true)
        dismiss(animated: true)
    }

    @objc private func saveTapped() {
        var kept: [String] = []
        var added: [UIImage] = []
        for photo in photos {
            switch photo {
            case .saved(let url): kept.append(url)
            case .new(let image): added.append(image)
            }
        }
        let text = textView.text ?? ""
        view.endEditing(true)
        dismiss(animated: true) { [onSave] in
            onSave?(text, kept, added)
        }
    }
}

/// 1.5pt dashed slate outline of the "Thêm" tile
private final class DashedBorderView: UIView {
    private let shape = CAShapeLayer()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        shape.strokeColor = UIColor(hexString: "94A3B8").cgColor
        shape.fillColor = UIColor.clear.cgColor
        shape.lineWidth = 1.5
        shape.lineDashPattern = [5, 4]
        layer.addSublayer(shape)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    override func layoutSubviews() {
        super.layoutSubviews()
        shape.frame = bounds
        shape.path = UIBezierPath(roundedRect: bounds.insetBy(dx: 0.75, dy: 0.75), cornerRadius: DS.Radius.card).cgPath
    }
}

/// The × badge is 24pt; touches 10pt around it count (44pt target)
private final class HitSlopButton: UIButton {
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        bounds.insetBy(dx: -10, dy: -10).contains(point)
    }
}

/// Photo tile whose × badge sticks out of the corner: touches on the badge outside the tile still reach it
private final class OverflowTouchView: UIView {
    override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        for subview in subviews.reversed() where !subview.isHidden && subview.isUserInteractionEnabled {
            let local = subview.convert(point, from: self)
            if let hit = subview.hitTest(local, with: event) { return hit }
        }
        return bounds.contains(point) ? self : nil
    }
}
