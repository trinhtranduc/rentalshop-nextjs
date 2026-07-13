//
//  PreviewNotesCell.swift
//  POS ADBD
//
//  Cell for Notes section: shows note text and image thumbnails. Tap thumbnail to preview image.
//

import UIKit
import Kingfisher
import SnapKit

protocol PreviewNotesCellDelegate: AnyObject {
    func previewNotesCell(_ cell: PreviewNotesCell, didTapImage image: UIImage?, imageURL: String?)
}

final class PreviewNotesCell: UITableViewCell {
    static let reuseId = "PreviewNotesCell"
    private let thumbnailSize: CGFloat = 56

    weak var delegate: PreviewNotesCellDelegate?
    private var boundImages: [UIImage] = []
    private var boundImageURLs: [String] = []

    // MARK: - UI
    private let titleLabel: UILabel = {
        let l = UILabel()
        l.font = Utils.regularFont(size: 16)
        l.textColor = .label
        l.text = "Notes".localized()
        return l
    }()

    private let noteLabel: UILabel = {
        let l = UILabel()
        l.font = Utils.regularFont(size: 14)
        l.textColor = .secondaryLabel
        l.numberOfLines = 0
        return l
    }()

    private let thumbnailsScrollView: UIScrollView = {
        let s = UIScrollView()
        s.showsHorizontalScrollIndicator = false
        s.alwaysBounceHorizontal = true
        return s
    }()
    private var thumbnailsHeightConstraint: Constraint?
    private var titleTopConstraint: Constraint?
    private var titleCenterYConstraint: Constraint?

    private let thumbnailsStack: UIStackView = {
        let s = UIStackView()
        s.axis = .horizontal
        s.spacing = 8
        s.alignment = .center
        return s
    }()

    private let placeholderLabel: UILabel = {
        let l = UILabel()
        l.font = Utils.regularFont(size: 14)
        l.textColor = APP_TONE_COLOR
        l.text = "Tap to add".localized()
        l.textAlignment = .right
        return l
    }()

    private let disclosureImageView: UIImageView = {
        let v = UIImageView(image: UIImage(systemName: "chevron.right"))
        v.tintColor = .tertiaryLabel
        v.contentMode = .scaleAspectFit
        return v
    }()

    // MARK: - Init
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setup()
    }

    private func setup() {
        selectionStyle = .default
        contentView.addSubview(titleLabel)
        contentView.addSubview(noteLabel)
        contentView.addSubview(thumbnailsScrollView)
        thumbnailsScrollView.addSubview(thumbnailsStack)
        contentView.addSubview(placeholderLabel)
        contentView.addSubview(disclosureImageView)

        // Row 1: title, placeholder, disclosure on same horizontal line
        titleLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().inset(16)
            titleTopConstraint = make.top.equalToSuperview().offset(12).constraint
            titleCenterYConstraint = make.centerY.equalToSuperview().constraint
        }
        titleCenterYConstraint?.deactivate()
        disclosureImageView.snp.makeConstraints { make in
            make.centerY.equalTo(titleLabel)
            make.trailing.equalToSuperview().inset(16)
            make.size.equalTo(CGSize(width: 12, height: 12))
        }
        placeholderLabel.snp.makeConstraints { make in
            make.centerY.equalTo(titleLabel)
            make.leading.greaterThanOrEqualTo(titleLabel.snp.trailing).offset(8)
            make.trailing.equalTo(disclosureImageView.snp.leading).offset(-8)
        }
        placeholderLabel.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)

        noteLabel.snp.makeConstraints { make in
            make.top.equalTo(titleLabel.snp.bottom).offset(6)
            make.leading.equalToSuperview().inset(16)
            make.trailing.lessThanOrEqualTo(disclosureImageView.snp.leading).offset(-8)
        }
        thumbnailsScrollView.snp.makeConstraints { make in
            make.top.equalTo(noteLabel.snp.bottom).offset(10)
            make.leading.trailing.equalToSuperview().inset(16)
            thumbnailsHeightConstraint = make.height.equalTo(thumbnailSize).constraint
            make.bottom.equalToSuperview().inset(12)
        }
        thumbnailsStack.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.height.equalTo(thumbnailSize)
        }
    }

    // MARK: - Bind
    /// noteText: ghi chú; images: ảnh local (từ cart); imageURLs: URL ảnh (từ order, load bằng Kingfisher trong cell).
    func bind(noteText: String?, images: [UIImage], imageURLs: [String]? = nil) {
        let hasNote = !(noteText?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        let hasLocalImages = !images.isEmpty
        let urls = imageURLs ?? []
        let hasURLImages = !urls.isEmpty
        let hasImages = hasLocalImages || hasURLImages

        placeholderLabel.isHidden = hasNote || hasImages
        noteLabel.isHidden = !hasNote
        noteLabel.text = noteText
        thumbnailsScrollView.isHidden = !hasImages
        thumbnailsHeightConstraint?.update(offset: hasImages ? thumbnailSize : 0)

        // When empty: center row vertically; when has content: pin to top
        let isEmpty = !hasNote && !hasImages
        if isEmpty {
            titleTopConstraint?.deactivate()
            titleCenterYConstraint?.activate()
        } else {
            titleCenterYConstraint?.deactivate()
            titleTopConstraint?.activate()
        }

        boundImages = images
        boundImageURLs = urls
        thumbnailsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        for (index, img) in images.enumerated() {
            let iv = thumbnailImageView()
            iv.image = img
            iv.tag = index
            iv.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(thumbnailTapped(_:))))
            thumbnailsStack.addArrangedSubview(iv)
        }
        for (index, urlString) in urls.enumerated() {
            let iv = thumbnailImageView()
            iv.tag = images.count + index
            if let url = URL(string: urlString) {
                iv.kf.setImage(
                    with: url,
                    placeholder: UIImage(named: "no-image"),
                    options: [.transition(.fade(0.15))]
                )
            }
            iv.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(thumbnailTapped(_:))))
            thumbnailsStack.addArrangedSubview(iv)
        }

        thumbnailsStack.arrangedSubviews.forEach { view in
            view.snp.makeConstraints { make in
                make.width.equalTo(thumbnailSize)
            }
        }
    }

    @objc private func thumbnailTapped(_ sender: UITapGestureRecognizer) {
        guard let iv = sender.view as? UIImageView else { return }
        let tag = iv.tag
        if tag < boundImages.count {
            delegate?.previewNotesCell(self, didTapImage: boundImages[tag], imageURL: nil)
        } else if (tag - boundImages.count) < boundImageURLs.count {
            delegate?.previewNotesCell(self, didTapImage: iv.image, imageURL: boundImageURLs[tag - boundImages.count])
        }
    }

    private func thumbnailImageView() -> UIImageView {
        let iv = UIImageView()
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.cornerRadius = 6
        iv.backgroundColor = .systemGray6
        iv.isUserInteractionEnabled = true
        iv.snp.makeConstraints { make in
            make.size.equalTo(thumbnailSize)
        }
        return iv
    }
}
