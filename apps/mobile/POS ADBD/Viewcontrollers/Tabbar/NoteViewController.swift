//
//  NoteViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/23/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import GestureRecognizerClosures
import IQKeyboardManagerSwift
import Kingfisher
import SnapKit

protocol NoteViewControllerDelegate: AnyObject {
    /// imageURLs[i] = URL for images[i] if it came from server, nil if newly added. Count must match images.count.
    func didSave(note: String, images: [UIImage], imageURLs: [String?], sender: NoteViewController)
}

class NoteViewController: BaseViewControler, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    // MARK: - Properties
    weak var delegate: NoteViewControllerDelegate?
    private let placeholderText = "Enter your note here...".localized()
    private let maxAttachmentCount = 3
    private var selectedImages: [UIImage] = []
    /// URL for each selected image; nil = newly added (no server URL). Count matches selectedImages.
    private var selectedImageURLs: [String?] = []
    private var isIQKeyboardManagerEnabledBeforePresenting = true
    private var noteTextViewBottomConstraint: Constraint?
    private var attachmentsHeightConstraint: Constraint?
    
    // MARK: - UI Components
    private lazy var cancelButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Cancel".localized(), for: .normal)
        button.titleLabel?.font = Utils.regularFont(size: 17)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var saveButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Save".localized(), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 17)
        button.setTitleColor(APP_TONE_COLOR, for: .normal)
        button.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        return button
    }()

    private lazy var addImageButton: UIButton = {
        let button = UIButton(type: .system)
        var config = UIButton.Configuration.filled()
        config.title = "Add image".localized()
        config.image = UIImage(systemName: "photo.on.rectangle")
        config.imagePadding = 8
        config.baseBackgroundColor = APP_TONE_COLOR.withAlphaComponent(0.12)
        config.baseForegroundColor = APP_TONE_COLOR
        config.cornerStyle = .medium
        config.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 14, bottom: 12, trailing: 14)
        button.configuration = config
        button.contentHorizontalAlignment = .leading
        button.addTarget(self, action: #selector(addImageTapped), for: .touchUpInside)
        return button
    }()

    private lazy var attachmentsScrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.alwaysBounceHorizontal = true
        scrollView.isHidden = true
        return scrollView
    }()

    private lazy var attachmentsStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 12
        stack.alignment = .fill
        return stack
    }()
    
    private lazy var noteTextView: UITextView = {
        let textView = UITextView()
        textView.font = Utils.regularFont(size: 16)
        textView.textColor = .black
        textView.layer.borderWidth = 1
        textView.layer.borderColor = UIColor.systemGray4.cgColor
        textView.layer.cornerRadius = 8
        textView.textContainerInset = UIEdgeInsets(top: 12, left: 8, bottom: 12, right: 8)
        textView.isScrollEnabled = true
        textView.delegate = self
        textView.autocapitalizationType = .none
        textView.returnKeyType = .default
        textView.enablesReturnKeyAutomatically = true
        textView.text = placeholderText
        textView.textColor = .systemGray3
        textView.translatesAutoresizingMaskIntoConstraints = false
        return textView
    }()
    
    private lazy var containerView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()
    
    // MARK: - Static Instance Method
    static func instance() -> NoteViewController {
        let controller = NoteViewController()
        controller.modalPresentationStyle = .fullScreen
        return controller
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Setup navigation bar first so it's in the view hierarchy before creating constraints
        setupNavigationBar()
        setupUI()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        noteTextView.becomeFirstResponder()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        let isClosingNoteScreen = isBeingDismissed || isMovingFromParentViewController || navigationController?.isBeingDismissed == true
        if isClosingNoteScreen {
            unregisterKeyboardNotifications()
            IQKeyboardManager.shared.enable = isIQKeyboardManagerEnabledBeforePresenting
        }
    }
    
    // MARK: - Setup
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "Note".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: true,
            backAction: .pop
        )
        // Add buttons
        navBar.addLeftButton(cancelButton)
        navBar.addRightButton(saveButton)
    }
    
    override func setupUI() {
        view.backgroundColor = APP_BG_COLOR
        
        guard let customNavBar = customNavBar else { return }
        
        view.addSubview(containerView)
        containerView.addSubview(addImageButton)
        containerView.addSubview(attachmentsScrollView)
        containerView.addSubview(noteTextView)
        attachmentsScrollView.addSubview(attachmentsStackView)
        
        containerView.snp.makeConstraints { make in
            make.top.equalTo(customNavBar.snp.bottom)
            make.leading.trailing.bottom.equalToSuperview()
        }
        
        addImageButton.snp.makeConstraints { make in
            make.top.equalTo(containerView).offset(16)
            make.leading.trailing.equalToSuperview().inset(16)
            make.height.equalTo(44)
        }

        attachmentsScrollView.snp.makeConstraints { make in
            make.top.equalTo(addImageButton.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
            self.attachmentsHeightConstraint = make.height.equalTo(0).constraint
        }

        attachmentsStackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalToSuperview()
        }

        noteTextView.snp.makeConstraints { make in
            make.top.equalTo(attachmentsScrollView.snp.bottom).offset(12)
            make.leading.trailing.equalToSuperview().inset(16)
            self.noteTextViewBottomConstraint = make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-16).constraint
        }

        configureKeyboardHandling()
        refreshAttachmentPreviews()
    }
    
    // MARK: - Actions
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    @objc private func cancelTapped() {
        dismiss(animated: true)
    }
    
    @objc private func saveTapped() {
        let note = noteTextView.text == placeholderText ? "" : (noteTextView.text ?? "")
        delegate?.didSave(note: note, images: selectedImages, imageURLs: selectedImageURLs, sender: self)
        dismiss(animated: true)
    }

    @objc private func addImageTapped() {
        guard selectedImages.count < maxAttachmentCount else {
            UIAlertController.alert(
                parent: self,
                title: "Limit reached".localized(),
                message: String(format: "You can attach up to %d images.".localized(), maxAttachmentCount)
            )
            return
        }

        let alert = UIAlertController(title: nil, message: nil, preferredStyle: .actionSheet)
        alert.addAction(UIAlertAction(title: "Photo Library".localized(), style: .default) { [weak self] _ in
            self?.presentImagePicker(sourceType: .photoLibrary)
        })
        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            alert.addAction(UIAlertAction(title: "Camera".localized(), style: .default) { [weak self] _ in
                self?.presentImagePicker(sourceType: .camera)
            })
        }
        alert.addAction(UIAlertAction(title: "Cancel".localized(), style: .cancel))

        if let popover = alert.popoverPresentationController {
            popover.sourceView = addImageButton
            popover.sourceRect = addImageButton.bounds
        }

        present(alert, animated: true)
    }

    @objc private func removeImageTapped(_ sender: UIButton) {
        let index = sender.tag
        guard selectedImages.indices.contains(index) else { return }
        selectedImages.remove(at: index)
        if selectedImageURLs.indices.contains(index) {
            selectedImageURLs.remove(at: index)
        }
        refreshAttachmentPreviews()
    }

    @objc private func previewImageTapped(_ sender: UITapGestureRecognizer) {
        guard
            let tappedView = sender.view,
            selectedImages.indices.contains(tappedView.tag)
        else { return }

        let viewer = NoteImagePreviewViewController(image: selectedImages[tappedView.tag])
        viewer.modalPresentationStyle = .fullScreen
        present(viewer, animated: true)
    }
    
    // MARK: - Public Methods
    func setNote(_ note: String?) {
        if let note = note, !note.isEmpty {
            noteTextView.text = note
            noteTextView.textColor = .black
        } else {
            noteTextView.text = placeholderText
            noteTextView.textColor = .systemGray3
        }
    }

    func setImages(_ images: [UIImage]) {
        selectedImages = images
        selectedImageURLs = Array(repeating: nil, count: images.count)
        if isViewLoaded {
            refreshAttachmentPreviews()
        }
    }

    /// Load images from URLs (e.g. order note images) and append to selectedImages; each gets its URL in selectedImageURLs.
    func setImageURLs(_ urls: [String]) {
        guard !urls.isEmpty else { return }
        let group = DispatchGroup()
        var loaded: [(image: UIImage, url: String)] = []
        for urlString in urls {
            guard let url = URL(string: urlString) else { continue }
            group.enter()
            KingfisherManager.shared.retrieveImage(with: url) { result in
                defer { group.leave() }
                if case .success(let value) = result {
                    loaded.append((value.image, urlString))
                }
            }
        }
        group.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            for item in loaded {
                self.selectedImages.append(item.image)
                self.selectedImageURLs.append(item.url)
            }
            if self.isViewLoaded {
                self.refreshAttachmentPreviews()
            }
        }
    }

    private func configureKeyboardHandling() {
        isIQKeyboardManagerEnabledBeforePresenting = IQKeyboardManager.shared.enable
        IQKeyboardManager.shared.enable = false
        registerKeyboardNotifications()
    }

    private func registerKeyboardNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboardWillChangeFrame(_:)),
            name: NSNotification.Name.UIKeyboardWillChangeFrame,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboardWillHide(_:)),
            name: NSNotification.Name.UIKeyboardWillHide,
            object: nil
        )
    }

    private func unregisterKeyboardNotifications() {
        NotificationCenter.default.removeObserver(self, name: NSNotification.Name.UIKeyboardWillChangeFrame, object: nil)
        NotificationCenter.default.removeObserver(self, name: NSNotification.Name.UIKeyboardWillHide, object: nil)
    }

    @objc private func handleKeyboardWillChangeFrame(_ notification: Notification) {
        guard
            let userInfo = notification.userInfo,
            let keyboardFrame = (userInfo[UIKeyboardFrameEndUserInfoKey] as? NSValue)?.cgRectValue,
            let duration = userInfo[UIKeyboardAnimationDurationUserInfoKey] as? Double,
            let curveValue = userInfo[UIKeyboardAnimationCurveUserInfoKey] as? UInt
        else { return }

        let keyboardFrameInView = view.convert(keyboardFrame, from: nil)
        let overlap = max(0, view.bounds.maxY - keyboardFrameInView.minY - view.safeAreaInsets.bottom)
        noteTextViewBottomConstraint?.update(offset: -(overlap + 16))

        let options = UIView.AnimationOptions(rawValue: curveValue << 16)
        UIView.animate(withDuration: duration, delay: 0, options: [options, .beginFromCurrentState]) {
            self.view.layoutIfNeeded()
        }
    }

    @objc private func handleKeyboardWillHide(_ notification: Notification) {
        guard
            let userInfo = notification.userInfo,
            let duration = userInfo[UIKeyboardAnimationDurationUserInfoKey] as? Double,
            let curveValue = userInfo[UIKeyboardAnimationCurveUserInfoKey] as? UInt
        else { return }

        noteTextViewBottomConstraint?.update(offset: -16)
        let options = UIView.AnimationOptions(rawValue: curveValue << 16)
        UIView.animate(withDuration: duration, delay: 0, options: [options, .beginFromCurrentState]) {
            self.view.layoutIfNeeded()
        }
    }

    private func presentImagePicker(sourceType: UIImagePickerController.SourceType) {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.delegate = self
        picker.modalPresentationStyle = .fullScreen
        present(picker, animated: true)
    }

    private func refreshAttachmentPreviews() {
        attachmentsStackView.arrangedSubviews.forEach { view in
            attachmentsStackView.removeArrangedSubview(view)
            view.removeFromSuperview()
        }

        let hasImages = !selectedImages.isEmpty
        attachmentsScrollView.isHidden = !hasImages
        attachmentsHeightConstraint?.update(offset: hasImages ? 80 : 0)
        addImageButton.isEnabled = selectedImages.count < maxAttachmentCount
        addImageButton.alpha = addImageButton.isEnabled ? 1 : 0.6

        for (index, image) in selectedImages.enumerated() {
            let container = UIView()
            container.tag = index

            let imageView = UIImageView(image: image)
            imageView.contentMode = .scaleAspectFill
            imageView.clipsToBounds = true
            imageView.layer.cornerRadius = 10
            imageView.isUserInteractionEnabled = true
            imageView.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(previewImageTapped(_:))))

            let removeButton = UIButton(type: .system)
            removeButton.tag = index
            removeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
            removeButton.tintColor = .white
            removeButton.backgroundColor = UIColor.black.withAlphaComponent(0.4)
            removeButton.layer.cornerRadius = 12
            removeButton.addTarget(self, action: #selector(removeImageTapped(_:)), for: .touchUpInside)

            container.addSubview(imageView)
            container.addSubview(removeButton)
            attachmentsStackView.addArrangedSubview(container)

            container.snp.makeConstraints { make in
                make.width.height.equalTo(72)
            }

            imageView.snp.makeConstraints { make in
                make.edges.equalToSuperview()
            }

            removeButton.snp.makeConstraints { make in
                make.top.trailing.equalToSuperview().inset(4)
                make.width.height.equalTo(24)
            }
        }
    }
}


extension NoteViewController: UITextViewDelegate {
    func textViewDidBeginEditing(_ textView: UITextView) {
        if textView.textColor == .systemGray3 {
            textView.text = ""
            textView.textColor = .black
        }
    }
    
    func textViewDidEndEditing(_ textView: UITextView) {
        if textView.text.isEmpty {
            textView.text = placeholderText
            textView.textColor = .systemGray3
        }
    }
    
    func textViewDidChange(_ textView: UITextView) {
        
    }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [String : Any]) {
        let image = (info[UIImagePickerControllerEditedImage] as? UIImage) ?? (info[UIImagePickerControllerOriginalImage] as? UIImage)
        if let image = image {
            if selectedImages.count < maxAttachmentCount {
                selectedImages.append(image)
                selectedImageURLs.append(nil)
                refreshAttachmentPreviews()
            } else {
                UIAlertController.alert(
                    parent: self,
                    title: "Limit reached".localized(),
                    message: String(format: "You can attach up to %d images.".localized(), maxAttachmentCount)
                )
            }
        }
        picker.dismiss(animated: true)
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
    }
}

private final class NoteImagePreviewViewController: UIViewController {
    private let image: UIImage

    init(image: UIImage) {
        self.image = image
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let imageView = UIImageView(image: image)
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false

        let closeButton = UIButton(type: .system)
        closeButton.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton.tintColor = .white
        closeButton.backgroundColor = UIColor.black.withAlphaComponent(0.35)
        closeButton.layer.cornerRadius = 22
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.translatesAutoresizingMaskIntoConstraints = false

        let dismissTap = UITapGestureRecognizer(target: self, action: #selector(closeTapped))
        view.addGestureRecognizer(dismissTap)

        view.addSubview(imageView)
        view.addSubview(closeButton)

        NSLayoutConstraint.activate([
            imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            imageView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            imageView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -16),

            closeButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            closeButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
            closeButton.widthAnchor.constraint(equalToConstant: 44),
            closeButton.heightAnchor.constraint(equalToConstant: 44)
        ])
    }

    @objc private func closeTapped() {
        dismiss(animated: true)
    }
}
