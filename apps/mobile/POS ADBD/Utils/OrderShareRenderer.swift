//
//  OrderShareRenderer.swift
//  POS ADBD
//
//  #640: draws an `OrderShareModel` as the share image of the spec (540 pt wide at 2× → 1080 px JPG, system font,
//  height grows with the items), and shares it. Layout follows .agent/changes/640-share-image/mockups/.
//

import UIKit

enum OrderShareRenderer {
    static let width: CGFloat = 540
    static let scale: CGFloat = 2
    static let jpegQuality: CGFloat = 0.92

    private enum C {
        static let ground = UIColor(hexString: "EEF2F7")
        static let ink = UIColor(hexString: "0F172A")
        static let muted = UIColor(hexString: "475569")
        static let soft = UIColor(hexString: "64748B")
        static let accent = UIColor(hexString: "1D4ED8")
        static let strip = UIColor(hexString: "F1F5F9")
        static let divider = UIColor(hexString: "E2E8F0")
        static let dueBg = UIColor(hexString: "EFF6FF")
        static let paidBg = UIColor(hexString: "ECFDF5")
        static let paid = UIColor(hexString: "047857")
        static let draftBg = UIColor(hexString: "FFF7ED")
        static let draftPillBg = UIColor(hexString: "FFEDD5")
        static let draftText = UIColor(hexString: "9A3412")
        static let cancelled = UIColor(hexString: "B91C1C")
        static let qrBorder = UIColor(hexString: "CBD5E1")
    }

    private static func font(_ size: CGFloat, _ weight: UIFont.Weight = .regular) -> UIFont {
        .systemFont(ofSize: size, weight: weight)
    }

    // MARK: - Public

    static func image(_ model: OrderShareModel) -> UIImage {
        let height = layout(model, drawing: false)
        let format = UIGraphicsImageRendererFormat()
        format.scale = scale
        format.opaque = true
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height), format: format)
        return renderer.image { _ in _ = layout(model, drawing: true, height: height) }
    }

    static func jpeg(_ model: OrderShareModel) -> Data? {
        // The app target builds in Swift 4 mode (UIKit's older name)
        UIImageJPEGRepresentation(image(model), jpegQuality)
    }

    /// Writes `model.fileName` in `directory` (default: the temporary directory)
    static func writeJPEG(_ model: OrderShareModel, to directory: URL = FileManager.default.temporaryDirectory) -> URL? {
        guard let data = jpeg(model) else { return nil }
        let url = directory.appendingPathComponent(model.fileName)
        do {
            try data.write(to: url, options: .atomic)
            return url
        } catch {
            return nil
        }
    }

    // MARK: - Layout (measured once, then drawn)

    private static let side: CGFloat = 24
    private static let pad: CGFloat = 24
    private static let bandHeight: CGFloat = 225
    private static let customerTop: CGFloat = 185

    /// Returns the total height. With `drawing` false nothing is drawn.
    private static func layout(_ model: OrderShareModel, drawing: Bool, height: CGFloat = 0) -> CGFloat {
        let ctx = drawing ? UIGraphicsGetCurrentContext() : nil
        let p = Painter(drawing: drawing)
        let cardX = side
        let cardW = width - side * 2
        let innerX = cardX + pad
        let innerW = cardW - pad * 2

        if drawing {
            C.ground.setFill()
            UIRectFill(CGRect(x: 0, y: 0, width: width, height: height))
            C.accent.setFill()
            UIRectFill(CGRect(x: 0, y: 0, width: width, height: bandHeight))
        }

        // Header
        let tile = CGRect(x: 32, y: 28, width: 44, height: 44)
        p.fill(tile, radius: 11, color: .white)
        p.text(model.initials, font: font(model.initials.count > 1 ? 19 : 21, .heavy), color: C.accent,
               in: tile, align: .center, vCenter: true)
        let headX: CGFloat = 88
        let headW = width - headX - 32
        p.text(model.shopName, font: font(20, .bold), color: .white, x: headX, y: 28, width: headW, lines: 1)
        p.text(model.outletLine, font: font(14), color: UIColor.white.withAlphaComponent(0.88),
               x: headX, y: 53, width: headW, lines: 1)
        p.text(model.kindLine.uppercased(with: Locale(identifier: "vi")), font: font(13, .medium),
               color: UIColor.white.withAlphaComponent(0.85), x: 32, y: 89, width: width - 64, lines: 1, kern: 1.2)

        var pillWidth: CGFloat = 0
        let pillH: CGFloat = 30
        let pillY: CGFloat = 131
        if let pill = model.pill {
            let pillFont = font(14, .bold)
            pillWidth = ceil(p.size(pill, font: pillFont).width) + 28
            let rect = CGRect(x: width - 24 - pillWidth, y: pillY, width: pillWidth, height: pillH)
            let (bg, fg): (UIColor, UIColor) = {
                switch model.pillTone {
                case .accent: return (.white, C.accent)
                case .paid: return (.white, C.paid)
                case .cancelled: return (.white, C.cancelled)
                case .draft: return (C.draftPillBg, C.draftText)
                }
            }()
            p.fill(rect, radius: pillH / 2, color: bg)
            p.text(pill, font: pillFont, color: fg, in: rect, align: .center, vCenter: true)
        }
        p.text(model.title, font: font(44, .heavy), color: .white, x: 30, y: 108,
               width: width - 60 - (pillWidth > 0 ? pillWidth + 12 : 0), lines: 1, shrink: true)

        // Customer card (floats over the band, soft shadow); measured first so the card is drawn under the text
        let cardTop = customerTop
        let phoneW = model.customerPhone.map { ceil(p.size($0, font: font(16, .semibold)).width) } ?? 0
        let customerBottom = drawCustomerText(model, p: Painter(drawing: false), cardTop: cardTop, innerX: innerX,
                                              innerW: innerW, phoneW: phoneW)
        let customerCard = CGRect(x: cardX, y: cardTop, width: cardW, height: customerBottom - cardTop)
        if let ctx {
            ctx.saveGState()
            ctx.setShadow(offset: CGSize(width: 0, height: 6), blur: 18, color: UIColor.black.withAlphaComponent(0.07).cgColor)
            UIColor.white.setFill()
            UIBezierPath(roundedRect: customerCard, cornerRadius: 20).fill()
            ctx.restoreGState()
        }
        drawCustomerText(model, p: p, cardTop: cardTop, innerX: innerX, innerW: innerW, phoneW: phoneW)
        var y = customerCard.maxY + 16

        // Items card
        let itemsTop = y
        let itemsBottom = itemsCard(model, p: Painter(drawing: false), top: itemsTop + 22, innerX: innerX, innerW: innerW)
        p.fill(CGRect(x: cardX, y: itemsTop, width: cardW, height: itemsBottom - itemsTop), radius: 20, color: .white)
        itemsCard(model, p: p, top: itemsTop + 22, innerX: innerX, innerW: innerW)
        y = itemsBottom + 16

        // VietQR card
        if let qr = model.qr {
            let top = y
            let qrBox = CGRect(x: innerX - 2, y: top + 18, width: 124, height: 124)
            let textX = qrBox.maxX + 18
            let textW = cardX + cardW - pad - textX
            let qrHeight = max(qrBox.height + 36, 36 + 120)
            p.fill(CGRect(x: cardX, y: top, width: cardW, height: qrHeight), radius: 20, color: .white)
            if drawing {
                let border = UIBezierPath(roundedRect: qrBox, cornerRadius: 12)
                C.qrBorder.setStroke()
                border.lineWidth = 1
                border.stroke()
                if let image = QRCodeGenerator.shared.generateQRCode(from: qr.payload, size: CGSize(width: 440, height: 440)) {
                    ctx?.interpolationQuality = .none
                    image.draw(in: qrBox.insetBy(dx: 8, dy: 8))
                }
            }
            var ty = top + 26
            p.text(qr.title.uppercased(with: Locale(identifier: "vi")), font: font(12, .bold), color: C.muted,
                   x: textX, y: ty, width: textW, lines: 1, kern: 1.1)
            ty += 22
            ty += p.text(qr.bankName, font: font(16, .bold), color: C.ink, x: textX, y: ty, width: textW, lines: 1) + 6
            ty += p.text(qr.accountNumber, font: font(15), color: UIColor(hexString: "334155"), x: textX, y: ty, width: textW, lines: 1) + 6
            ty += p.text(qr.holder, font: font(15), color: UIColor(hexString: "334155"), x: textX, y: ty, width: textW, lines: 1) + 6
            p.text(qr.content, font: font(14), color: C.muted, x: textX, y: ty, width: textW, lines: 1)
            y = top + qrHeight + 16
        }

        // Footer
        y += 30
        y += p.text(model.thanks, font: font(16, .semibold), color: C.ink, x: side, y: y, width: width - side * 2,
                    align: .center, lines: 2) + 4
        if let address = model.address {
            y += p.text(address, font: font(13), color: C.muted, x: side, y: y, width: width - side * 2,
                        align: .center, lines: 2) + 8
        } else {
            y += 4
        }
        y += p.text(model.madeWith, font: font(12), color: C.soft, x: side, y: y, width: width - side * 2,
                    align: .center, lines: 1)
        return ceil(y + 30)
    }

    @discardableResult
    private static func drawCustomerText(_ model: OrderShareModel, p: Painter, cardTop: CGFloat, innerX: CGFloat,
                                         innerW: CGFloat, phoneW: CGFloat) -> CGFloat {
        var cy = cardTop + 22
        p.text(model.customerLabel, font: font(13), color: C.muted, x: innerX, y: cy, width: innerW)
        cy += 18
        let nameH = p.text(model.customerName, font: font(18, .bold), color: C.ink, x: innerX, y: cy,
                           width: innerW - (phoneW > 0 ? phoneW + 16 : 0), lines: 2)
        if let phone = model.customerPhone {
            p.text(phone, font: font(16, .semibold), color: UIColor(hexString: "334155"), x: innerX, y: cardTop + 31,
                   width: innerW, align: .right, lines: 1)
        }
        cy += max(nameH, 22)
        if let strip = model.strip {
            cy += 18
            let box = CGRect(x: innerX, y: cy, width: innerW, height: 62)
            p.fill(box, radius: 14, color: C.strip)
            let sx = box.minX + 16
            let sw = box.width - 32
            p.text(strip.pickupLabel, font: font(13), color: C.muted, x: sx, y: box.minY + 12, width: sw / 3)
            p.text(strip.pickupDay, font: font(18, .bold), color: C.ink, x: sx, y: box.minY + 29, width: sw / 3, lines: 1)
            p.text(strip.returnLabel, font: font(13), color: C.muted, x: sx, y: box.minY + 12, width: sw, align: .right)
            p.text(strip.returnDay, font: font(18, .bold), color: C.ink, x: sx, y: box.minY + 29, width: sw,
                   align: .right, lines: 1)
            p.text(strip.days, font: font(13, .bold), color: C.accent, x: box.midX - 60, y: box.minY + 13,
                   width: 120, align: .center, lines: 1)
            p.fill(CGRect(x: box.midX - 61, y: box.minY + 37, width: 122, height: 2), radius: 1, color: C.accent)
            cy = box.maxY
        }
        return cy + 22
    }

    /// Draws (or measures) the items card content from `top`; returns its bottom edge
    @discardableResult
    private static func itemsCard(_ model: OrderShareModel, p: Painter, top: CGFloat, innerX: CGFloat, innerW: CGFloat) -> CGFloat {
        var y = top
        y += p.text(model.itemsHeader.uppercased(with: Locale(identifier: "vi")), font: font(13, .bold), color: C.muted,
                    x: innerX, y: y, width: innerW, lines: 1, kern: 1.2) + 14
        let amountFont = font(16, .bold)
        for (index, line) in model.lines.enumerated() {
            if index > 0 { y += 14 }
            let amountW = ceil(p.size(line.amount, font: amountFont).width)
            p.text(line.amount, font: amountFont, color: C.ink, x: innerX, y: y, width: innerW, align: .right, lines: 1)
            y += p.text(line.name, font: font(16, .semibold), color: C.ink, x: innerX, y: y,
                        width: innerW - amountW - 16, lines: 2) + 2
            y += p.text(line.detail, font: font(14), color: C.muted, x: innerX, y: y, width: innerW, lines: 1)
        }
        y += 16
        p.fill(CGRect(x: innerX, y: y, width: innerW, height: 1), radius: 0, color: C.divider)
        y += 13
        for row in model.rows {
            let valueFont = font(15, .semibold)
            let valueW = min(innerW * 0.6, ceil(p.size(row.value, font: valueFont).width))
            p.text(row.value, font: valueFont, color: UIColor(hexString: "334155"), x: innerX + innerW - valueW, y: y,
                   width: valueW, align: .right, lines: 1, shrink: true)
            y += max(p.text(row.label, font: font(15), color: C.muted, x: innerX, y: y, width: innerW - valueW - 12, lines: 2), 19) + 11
        }
        y += 4
        let box = CGRect(x: innerX, y: y, width: innerW, height: 60)
        let (bg, labelColor, valueColor): (UIColor, UIColor, UIColor) = {
            switch model.highlight {
            case .due: return (C.dueBg, UIColor(hexString: "1E3A8A"), C.accent)
            case .total: return (C.paidBg, C.paid, C.paid)
            case .draft: return (C.draftBg, C.draftText, C.ink)
            }
        }()
        p.fill(box, radius: 16, color: bg)
        let valueFont = font(28, .heavy)
        let valueW = min(innerW * 0.65, ceil(p.size(model.highlightValue, font: valueFont).width))
        p.text(model.highlightLabel, font: font(16, .bold), color: labelColor,
               in: CGRect(x: box.minX + 16, y: box.minY, width: box.width - valueW - 44, height: box.height),
               align: .left, vCenter: true)
        p.text(model.highlightValue, font: valueFont, color: valueColor,
               in: CGRect(x: box.maxX - 16 - valueW, y: box.minY, width: valueW, height: box.height),
               align: .right, vCenter: true, shrink: true)
        y = box.maxY
        if let note = model.note {
            y += 12
            y += p.text(note, font: font(14), color: C.muted, x: innerX, y: y, width: innerW, lines: 3)
        }
        return y + 18
    }
}

/// Draws text and shapes, or only measures them when `drawing` is false
private struct Painter {
    let drawing: Bool

    func size(_ text: String, font: UIFont) -> CGSize {
        (text as NSString).size(withAttributes: [.font: font])
    }

    func fill(_ rect: CGRect, radius: CGFloat, color: UIColor) {
        guard drawing else { return }
        color.setFill()
        UIBezierPath(roundedRect: rect, cornerRadius: radius).fill()
    }

    private func attributes(font: UIFont, color: UIColor, align: NSTextAlignment, kern: CGFloat, lines: Int) -> [NSAttributedString.Key: Any] {
        let style = NSMutableParagraphStyle()
        style.alignment = align
        style.lineBreakMode = lines == 1 ? .byTruncatingTail : .byWordWrapping
        var attrs: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: color, .paragraphStyle: style]
        if kern != 0 { attrs[.kern] = kern }
        return attrs
    }

    /// Text from (x, y) in `width`; `lines` 0 = unlimited. Returns the height used.
    @discardableResult
    func text(_ text: String, font: UIFont, color: UIColor, x: CGFloat, y: CGFloat, width: CGFloat,
              align: NSTextAlignment = .left, lines: Int = 0, kern: CGFloat = 0, shrink: Bool = false) -> CGFloat {
        guard !text.isEmpty, width > 0 else { return 0 }
        var font = font
        if shrink {
            while font.pointSize > 10, size(text, font: font).width > width {
                font = font.withSize(font.pointSize - 1)
            }
        }
        let attrs = attributes(font: font, color: color, align: align, kern: kern, lines: lines)
        let string = NSAttributedString(string: text, attributes: attrs)
        let lineHeight = ceil(font.lineHeight)
        let maxHeight = lines > 0 ? lineHeight * CGFloat(lines) + 1 : .greatestFiniteMagnitude
        let bounds = string.boundingRect(with: CGSize(width: width, height: maxHeight), options: [.usesLineFragmentOrigin, .usesFontLeading], context: nil)
        let height = min(ceil(bounds.height), maxHeight)
        if drawing {
            // Top-left origin (usesLineFragmentOrigin); one line is cut with "…" at its height
            let box = CGRect(x: x, y: y, width: width, height: lines == 1 ? lineHeight + 1 : height)
            string.draw(with: box, options: [.usesLineFragmentOrigin, .usesFontLeading, .truncatesLastVisibleLine], context: nil)
        }
        return lines == 1 ? lineHeight : height
    }

    /// One line centred vertically in `rect`
    func text(_ text: String, font: UIFont, color: UIColor, in rect: CGRect, align: NSTextAlignment,
              vCenter: Bool, shrink: Bool = false) {
        var font = font
        if shrink {
            while font.pointSize > 10, size(text, font: font).width > rect.width {
                font = font.withSize(font.pointSize - 1)
            }
        }
        let lineHeight = ceil(font.lineHeight)
        self.text(text, font: font, color: color, x: rect.minX, y: rect.midY - lineHeight / 2, width: rect.width,
                  align: align, lines: 1)
    }
}

// MARK: - Share

/// Builds the model (with the bill's QR decision), renders the JPG off the main thread and opens the share sheet
enum OrderSharePresenter {
    /// #622 decision of the printed bill (`PrinterManager.printOrder`): the device switch, then the outlet's
    /// account from `BankAccountService.printAccount` (default active, else first active). Nil after 5 s.
    static func billQRAccount(outletId: Int?, completion: @escaping (_ switchOn: Bool, _ account: BankAccount?) -> Void) {
        guard Utils.loadPrintBankQr(), let outletId else {
            completion(false, nil)
            return
        }
        var answered = false
        let answer: (BankAccount?) -> Void = { account in
            guard !answered else { return }
            answered = true
            completion(true, account)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { answer(nil) }
        BankAccountService.shared.printAccount(outletId: outletId, completion: answer)
    }

    static func share(_ source: OrderShareSource, from controller: BaseViewControler, sourceView: UIView? = nil) {
        controller.showProgressText(text: "Generating image...".localized())
        let language = ShareLanguage.current
        let render: (Bool, BankAccount?) -> Void = { [weak controller] switchOn, account in
            let model = OrderShareModel.make(source, language: language, bankAccount: account, qrSwitchOn: switchOn)
            DispatchQueue.global(qos: .userInitiated).async {
                let url = OrderShareRenderer.writeJPEG(model)
                DispatchQueue.main.async {
                    guard let controller else { return }
                    controller.hideProgress()
                    guard let url else {
                        UIAlertController.alert(parent: controller, title: "Error".localized(), message: "Failed to generate image".localized())
                        return
                    }
                    let sheet = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                    let anchor = sourceView ?? controller.view!
                    sheet.popoverPresentationController?.sourceView = anchor
                    sheet.popoverPresentationController?.sourceRect = sourceView?.bounds
                        ?? CGRect(x: anchor.bounds.midX, y: anchor.bounds.midY, width: 0, height: 0)
                    sheet.completionWithItemsHandler = { _, _, _, _ in try? FileManager.default.removeItem(at: url) }
                    controller.present(sheet, animated: true)
                }
            }
        }
        if source.isDraft {
            render(false, nil)
        } else {
            billQRAccount(outletId: source.outletId, completion: render)
        }
    }
}
