//
//  CalendarProductCell.swift
//  POS ADBD
//
//  Created by Trinh Tran on 11/29/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import Kingfisher
import SnapKit

class CalendarProductCell: UITableViewCell {
    private enum Metrics {
        static let cardCornerRadius: CGFloat = 12
        static let horizontalInset: CGFloat = 12
        static let contentPadding: CGFloat = 10
    }

    private lazy var cardView: UIView = {
        let view = UIView()
        view.backgroundColor = .backgroundCard
        view.layer.borderWidth = 1
        view.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.65).cgColor
        return view
    }()

    private lazy var topSeparatorView: UIView = {
        let view = UIView()
        view.backgroundColor = UIColor.borderColor.withAlphaComponent(0.9)
        return view
    }()

    private lazy var containerStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 10
        stack.alignment = .top
        return stack
    }()

    private lazy var productImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 10
        imageView.backgroundColor = .backgroundPrimary
        return imageView
    }()

    private lazy var infoStackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 4
        stack.alignment = .leading
        return stack
    }()

    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 16)
        label.textColor = .textPrimary
        label.numberOfLines = 2
        return label
    }()

    private lazy var noteLabel: UILabel = {
        let label = UILabel()
        label.font = .captionLarge(size: 13)
        label.textColor = .textSecondary
        label.numberOfLines = 2
        return label
    }()

    private lazy var pricingLabel: UILabel = {
        let label = UILabel()
        label.font = .bodyRegular(size: 14)
        label.textColor = .textPrimary
        label.numberOfLines = 0
        return label
    }()

    private lazy var metaLabel: UILabel = {
        let label = UILabel()
        label.font = .captionLarge(size: 13)
        label.textColor = .textSecondary
        label.numberOfLines = 1
        return label
    }()

    private var isLastInSection = true

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    private func setupUI() {
        backgroundColor = .clear
        contentView.backgroundColor = .clear
        selectionStyle = .none

        contentView.addSubview(cardView)
        cardView.addSubview(topSeparatorView)
        cardView.addSubview(containerStackView)

        containerStackView.addArrangedSubview(productImageView)
        containerStackView.addArrangedSubview(infoStackView)

        infoStackView.addArrangedSubview(nameLabel)
        infoStackView.addArrangedSubview(pricingLabel)
        infoStackView.addArrangedSubview(noteLabel)
        infoStackView.addArrangedSubview(metaLabel)

        cardView.snp.makeConstraints { make in
            make.top.bottom.equalToSuperview()
            make.leading.trailing.equalToSuperview().inset(Metrics.horizontalInset)
        }

        topSeparatorView.snp.makeConstraints { make in
            make.top.equalToSuperview()
            make.leading.trailing.equalToSuperview().inset(Metrics.contentPadding)
            make.height.equalTo(1)
        }

        containerStackView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(Metrics.contentPadding)
            make.leading.equalToSuperview().offset(Metrics.contentPadding)
            make.trailing.equalToSuperview().offset(-Metrics.contentPadding)
            make.bottom.equalToSuperview().offset(-Metrics.contentPadding)
        }

        productImageView.snp.makeConstraints { make in
            make.width.height.equalTo(60)
        }
    }

    func bind(orderItem: CalendarOrderItem, isLastInSection: Bool = true) {
        self.isLastInSection = isLastInSection
        applyShape()

        nameLabel.text = orderItem.productName ?? "Unknown Product"

        if let note = orderItem.notes, !note.isEmpty {
            noteLabel.attributedText = buildNoteText(from: note)
            noteLabel.isHidden = false
        } else {
            noteLabel.attributedText = nil
            noteLabel.isHidden = true
        }

        pricingLabel.attributedText = buildPricingText(from: orderItem)
        metaLabel.text = nil
        metaLabel.isHidden = true

        loadProductImage(from: orderItem.productImages)
    }

    func bind(calendarOrder: CalendarOrder, isLastInSection: Bool = true) {
        self.isLastInSection = isLastInSection
        applyShape()

        guard let orderItems = calendarOrder.orderItems, !orderItems.isEmpty else {
            nameLabel.text = "No items available".localized()
            noteLabel.attributedText = nil
            noteLabel.isHidden = true
            pricingLabel.attributedText = nil
            metaLabel.text = nil
            metaLabel.isHidden = true
            productImageView.image = UIImage(named: "no-image")
            return
        }

        let firstItem = orderItems[0]
        nameLabel.text = firstItem.productName ?? "Unknown Product"

        if let note = firstItem.notes, !note.isEmpty {
            noteLabel.attributedText = buildNoteText(from: note)
            noteLabel.isHidden = false
        } else {
            noteLabel.attributedText = nil
            noteLabel.isHidden = true
        }

        pricingLabel.attributedText = buildPricingText(from: firstItem)

        var metaParts: [String] = []
        if orderItems.count > 1 {
            metaParts.append("+\(orderItems.count - 1) " + "more items".localized())
        }
        if let orderNumber = calendarOrder.orderNumber, !orderNumber.isEmpty {
            metaParts.append("#\(orderNumber)")
        }
        metaLabel.text = metaParts.isEmpty ? nil : metaParts.joined(separator: " • ")
        metaLabel.isHidden = metaParts.isEmpty

        loadProductImage(from: firstItem.productImages)
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        productImageView.image = nil
        nameLabel.text = nil
        noteLabel.attributedText = nil
        noteLabel.isHidden = false
        pricingLabel.attributedText = nil
        metaLabel.text = nil
        metaLabel.isHidden = false
        isLastInSection = true
        applyShape()
    }

    private func applyShape() {
        topSeparatorView.isHidden = false

        if isLastInSection {
            cardView.layer.borderWidth = 1
            cardView.layer.borderColor = UIColor.borderColor.withAlphaComponent(0.65).cgColor
            cardView.layer.cornerRadius = Metrics.cardCornerRadius
            cardView.layer.maskedCorners = [.layerMinXMaxYCorner, .layerMaxXMaxYCorner]
        } else {
            cardView.layer.borderWidth = 0
            cardView.layer.cornerRadius = 0
            cardView.layer.maskedCorners = []
        }
    }

    private func buildNoteText(from note: String) -> NSAttributedString {
        let prefix = "Note:".localized() + " "
        let fullText = prefix + note
        let baseFont = UIFont.captionLarge(size: 13)
        let italicFont = UIFont(
            descriptor: baseFont.fontDescriptor.withSymbolicTraits(.traitItalic) ?? baseFont.fontDescriptor,
            size: baseFont.pointSize
        )

        return NSAttributedString(
            string: fullText,
            attributes: [
                .font: italicFont,
                .foregroundColor: UIColor.textSecondary
            ]
        )
    }

    private func buildPricingText(from item: CalendarOrderItem) -> NSAttributedString? {
        let quantity = item.quantity ?? 0
        let unitPrice = item.unitPrice ?? 0
        let totalPrice = item.totalPrice ?? 0

        if quantity <= 0 && unitPrice <= 0 && totalPrice <= 0 {
            return nil
        }

        let leftText: String
        if quantity > 0 && unitPrice > 0 {
            leftText = "\(quantity.formatStringInCommon()) × \(unitPrice.formatStringInCommon())"
        } else if quantity > 0 {
            leftText = quantity.formatStringInCommon()
        } else {
            leftText = unitPrice.formatStringInCommon()
        }

        let rightText = totalPrice > 0 ? " = \(totalPrice.formatStringInCommon())" : ""
        let fullText = leftText + rightText
        let attributedText = NSMutableAttributedString(
            string: fullText,
            attributes: [
                .font: UIFont.bodyRegular(size: 14),
                .foregroundColor: UIColor.textSecondary
            ]
        )

        if !rightText.isEmpty {
            let nsText = fullText as NSString
            let range = nsText.range(of: rightText)
            attributedText.addAttributes([
                .font: UIFont.bodyRegular(size: 14),
                .foregroundColor: UIColor.textPrimary
            ], range: range)
        }

        return attributedText
    }

    private func loadProductImage(from productImages: [String]?) {
        guard let productImages,
              !productImages.isEmpty,
              let firstImage = productImages.first,
              let imageURL = URL(string: firstImage) else {
            productImageView.image = UIImage(named: "no-image")
            return
        }

        let processor = RoundCornerImageProcessor(cornerRadius: 10)
        productImageView.kf.setImage(
            with: imageURL,
            placeholder: UIImage(named: "no-image"),
            options: [
                .processor(processor),
                .transition(.fade(0.12))
            ]
        )
    }
}
