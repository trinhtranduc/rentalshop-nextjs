//
//  OrderNotesEditorViewController.swift
//  POS ADBD
//
//  Note text + up to 5 photos for the redesigned order detail (#372). Saved photos stay URLs (so removing
//  one never depends on it having loaded); new photos are images until the order is saved.
//

import UIKit
import SnapKit
import Kingfisher

final class OrderNotesEditorViewController: UIViewController, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    enum Photo {
        case saved(String)
        case new(UIImage)
    }

    /// text, kept saved URLs, new images
    var onSave: ((String, [String], [UIImage]) -> Void)?

    private var photos: [Photo]
    private let initialText: String
    private let maxPhotos: Int
    private let textView = UITextView()
    private let photoStack = UIStackView()
    private let countLabel = UILabel()
    private let addButton = UIButton(type: .system)

    init(text: String, savedURLs: [String], maxPhotos: Int = OrderDetailLogic.maxNotePhotos) {
        initialText = text
        photos = savedURLs.map { .saved($0) }
        self.maxPhotos = maxPhotos
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = DS.Color.surface

        let titleLabel = UILabel()
        titleLabel.text = "Notes".localized()
        titleLabel.font = Utils.boldFont(size: 20)
        titleLabel.textColor = DS.Color.text

        let cancelButton = UIButton(type: .system)
        cancelButton.setTitle("Cancel".localized(), for: .normal)
        cancelButton.titleLabel?.font = Utils.mediumFont(size: 16)
        cancelButton.tintColor = DS.Color.textMuted
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)

        let saveButton = UIButton(type: .system)
        saveButton.setTitle("Save".localized(), for: .normal)
        saveButton.titleLabel?.font = Utils.boldFont(size: 16)
        saveButton.tintColor = DS.Color.primary
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)

        let header = UIStackView(arrangedSubviews: [cancelButton, titleLabel, saveButton])
        header.axis = .horizontal
        header.alignment = .center
        header.distribution = .equalCentering
        header.snp.makeConstraints { make in make.height.equalTo(DS.touchTarget) }

        textView.text = initialText
        textView.font = Utils.regularFont(size: 16)
        textView.textColor = DS.Color.text
        textView.layer.cornerRadius = DS.Radius.card
        textView.layer.borderWidth = 1
        textView.layer.borderColor = DS.Color.border.cgColor
        textView.textContainerInset = UIEdgeInsets(top: 10, left: 8, bottom: 10, right: 8)
        textView.snp.makeConstraints { make in make.height.equalTo(140) }

        countLabel.font = Utils.mediumFont(size: 13)
        countLabel.textColor = DS.Color.textMuted
        let photosTitle = UILabel()
        photosTitle.text = "Photos".localized().uppercased()
        photosTitle.font = Utils.boldFont(size: 13)
        photosTitle.textColor = DS.Color.textMuted
        let photosHeader = UIStackView(arrangedSubviews: [photosTitle, UIView(), countLabel])
        photosHeader.axis = .horizontal

        photoStack.axis = .horizontal
        photoStack.spacing = DS.Spacing.sm
        photoStack.alignment = .center
        let photoScroll = UIScrollView()
        photoScroll.showsHorizontalScrollIndicator = false
        photoScroll.addSubview(photoStack)
        photoStack.snp.makeConstraints { make in
            make.edges.equalTo(photoScroll.contentLayoutGuide)
            make.height.equalTo(photoScroll.frameLayoutGuide)
        }
        photoScroll.snp.makeConstraints { make in make.height.equalTo(72) }

        addButton.setImage(UIImage(systemName: "plus"), for: .normal)
        addButton.tintColor = DS.Color.primary
        addButton.backgroundColor = DS.Color.background
        addButton.layer.cornerRadius = DS.Radius.card
        addButton.accessibilityLabel = "Add photos".localized()
        addButton.addTarget(self, action: #selector(addTapped), for: .touchUpInside)

        let stack = UIStackView(arrangedSubviews: [header, textView, photosHeader, photoScroll])
        stack.axis = .vertical
        stack.spacing = DS.Spacing.md
        view.addSubview(stack)
        stack.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide).offset(DS.Spacing.md)
            make.leading.trailing.equalToSuperview().inset(DS.Spacing.lg)
        }
        renderPhotos()
    }

    private func renderPhotos() {
        photoStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        for (index, photo) in photos.enumerated() {
            let imageView = UIImageView()
            imageView.contentMode = .scaleAspectFill
            imageView.clipsToBounds = true
            imageView.layer.cornerRadius = DS.Radius.card
            imageView.backgroundColor = DS.Color.background
            switch photo {
            case .saved(let url):
                imageView.kf.setImage(with: URL(string: url), placeholder: UIImage(systemName: "photo"))
            case .new(let image):
                imageView.image = image
            }
            let remove = UIButton(type: .system)
            remove.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
            remove.tintColor = DS.Color.text
            remove.backgroundColor = .white
            remove.layer.cornerRadius = 11
            remove.tag = index
            remove.accessibilityLabel = "Remove photo".localized()
            remove.addTarget(self, action: #selector(removeTapped(_:)), for: .touchUpInside)
            let container = UIView()
            container.addSubview(imageView)
            container.addSubview(remove)
            container.snp.makeConstraints { make in make.size.equalTo(64) }
            imageView.snp.makeConstraints { make in make.edges.equalToSuperview() }
            remove.snp.makeConstraints { make in
                make.top.trailing.equalToSuperview().inset(2)
                make.size.equalTo(22)
            }
            photoStack.addArrangedSubview(container)
        }
        if photos.count < maxPhotos {
            photoStack.addArrangedSubview(addButton)
            addButton.snp.remakeConstraints { make in make.size.equalTo(64) }
        }
        countLabel.text = String(format: "%d/%d photos".localized(), photos.count, maxPhotos)
    }

    @objc private func removeTapped(_ sender: UIButton) {
        guard photos.indices.contains(sender.tag) else { return }
        photos.remove(at: sender.tag)
        renderPhotos()
    }

    @objc private func addTapped() {
        guard photos.count < maxPhotos else { return }
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
        guard let image = info[UIImagePickerControllerOriginalImage] as? UIImage, photos.count < maxPhotos else { return }
        photos.append(.new(image))
        renderPhotos()
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }

    @objc private func cancelTapped() {
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
        dismiss(animated: true) { [onSave] in
            onSave?(text, kept, added)
        }
    }
}
