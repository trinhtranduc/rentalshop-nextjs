//
//  ThermalPrintPreviewViewController.swift
//  POS ADBD
//
//  Created by Auto on $(date).
//

import UIKit
import PDFKit
import SnapKit

class ThermalPrintPreviewViewController: BaseViewControler {
    private let order: Order
    private var pdfDocument: PDFDocument?
    private var pdfURL: URL?
    
    private lazy var pdfView: PDFView = {
        let view = PDFView()
        view.autoScales = true
        view.displayMode = .singlePageContinuous
        view.displayDirection = .vertical
        view.backgroundColor = .systemGray6
        return view
    }()
    
    private lazy var shareButton: UIButton = {
        let button = UIButton(type: .system)
        button.setTitle("Share".localized(), for: .normal)
        button.titleLabel?.font = Utils.boldFont(size: 16)
        button.backgroundColor = .systemBlue
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = 8
        button.addTarget(self, action: #selector(shareTapped), for: .touchUpInside)
        return button
    }()
    
    init(order: Order) {
        self.order = order
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        generatePDF()
    }
    
    internal override func setupUI() {
        title = "Thermal Print Preview".localized()
        view.backgroundColor = .systemBackground
        
        // Setup navigation bar
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(closeTapped)
        )
        
        // Add PDF view
        view.addSubview(pdfView)
        
        // Add share button
        view.addSubview(shareButton)
        
        // Layout
        pdfView.snp.makeConstraints { make in
            make.top.leading.trailing.equalTo(view.safeAreaLayoutGuide)
            make.bottom.equalTo(shareButton.snp.top).offset(-16)
        }
        
        shareButton.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-20)
            make.height.equalTo(50)
        }
    }
    
    private func generatePDF() {
        // Create PDF document
        let pdfMetaData = [
            kCGPDFContextCreator: "POS ADBD",
            kCGPDFContextAuthor: "POS ADBD",
            kCGPDFContextTitle: "Order Receipt - \(order.orderNumber)"
        ]
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]
        
        // Calculate page size (80mm width, standard thermal receipt)
        // 80mm = 226.77 points, with 42 characters per line
        let pageWidth: CGFloat = 226.77 // 80mm in points (80 * 2.83465)
        let pageHeight: CGFloat = 2000 // Dynamic height
        let pageRect = CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight)
        
        // Constants matching thermal printer (80mm paper, 42 chars per line)
        let charsPerLine = 42
        let margin: CGFloat = 10
        let lineHeight: CGFloat = 18
        let font = UIFont.monospacedSystemFont(ofSize: 11, weight: .regular)
        let boldFont = UIFont.monospacedSystemFont(ofSize: 11, weight: .bold)
        
        // Helper function to center text
        let centerText: (String, CGFloat) -> CGFloat = { text, width in
            let textSize = text.size(withAttributes: [.font: font])
            return (width - textSize.width) / 2
        }
        
        // Helper function to create separator
        let createSeparator: () -> String = {
            return String(repeating: "-", count: charsPerLine)
        }
        
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect, format: format)
        
        let data = renderer.pdfData { context in
            context.beginPage()
            
            var yPosition: CGFloat = 20
            
            // Header - Centered
            let headerText = order.orderType == .rent ? "RENTAL RECEIPT" : "SALE RECEIPT"
            let headerX = centerText(headerText, pageWidth)
            headerText.draw(at: CGPoint(x: headerX, y: yPosition), withAttributes: [
                .font: boldFont,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight
            
            // Order Number - Centered
            let orderText = "Order #\(order.orderNumber)"
            let orderX = centerText(orderText, pageWidth)
            orderText.draw(at: CGPoint(x: orderX, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight
            
            // Date - Centered
            let dateText = order.createdAt.dateInString() ?? "N/A"
            let dateX = centerText(dateText, pageWidth)
            dateText.draw(at: CGPoint(x: dateX, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 5
            
            // Separator
            let separator = createSeparator()
            separator.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 5
            
            // Customer Info
            let customerName = order.customerName.trimmingCharacters(in: .whitespaces)
            let customerText = "Customer: \(customerName.isEmpty ? "N/A" : customerName)"
            customerText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight
            
            let phoneText = "Phone: \(order.customerPhone)"
            phoneText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 5
            
            // Separator
            separator.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 5
            
            // Items
            "Items:".draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight
            
            for item in order.orderItems {
                let itemName = item.productName
                itemName.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                    .font: font,
                    .foregroundColor: UIColor.black
                ])
                yPosition += lineHeight
                
                let quantity = item.quantity
                let price = item.unitPrice
                let total = item.totalPrice
                let itemDetail = "\(quantity) x \(price.formatStringInCommon()) = \(total.formatStringInCommon())"
                itemDetail.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                    .font: font,
                    .foregroundColor: UIColor.black
                ])
                yPosition += lineHeight
            }
            
            yPosition += 5
            
            // Separator
            separator.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 5
            
            // Payment Details - Calculate subtotal from items
            let subtotal = order.orderItems.reduce(0.0) { $0 + $1.totalPrice }
            let subtotalText = "Subtotal: \(subtotal.formatStringInCommon())"
            subtotalText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight
            
            // Discount
            let discountAmount = order.discountAmount
            if discountAmount > 0 {
                let discountText: String
                if let discountType = order.discountType, discountType.lowercased() == "amount" {
                    discountText = "Discount: \(discountAmount.formatStringInCommon())"
                } else if order.discountValue > 0 {
                    discountText = "Discount: \(order.discountValue)%"
                } else {
                    discountText = "Discount: \(discountAmount.formatStringInCommon())"
                }
                discountText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                    .font: font,
                    .foregroundColor: UIColor.black
                ])
                yPosition += lineHeight
            }
            
            // Total
            let totalText = "Total: \(order.totalAmount.formatStringInCommon())"
            totalText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: boldFont,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight
            
            // Deposit Info (for rent orders)
            if order.orderType == .rent, order.depositAmount > 0 {
                let depositText = "Deposit: \(order.depositAmount.formatStringInCommon())"
                depositText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                    .font: font,
                    .foregroundColor: UIColor.black
                ])
                yPosition += lineHeight
            }
            
            // Paid amount (for sale orders)
            if order.orderType == .sale, order.depositAmount > 0 {
                let paidText = "Paid: \(order.depositAmount.formatStringInCommon())"
                paidText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                    .font: font,
                    .foregroundColor: UIColor.black
                ])
                yPosition += lineHeight
            }
            
            yPosition += 10
            
            // Separator
            separator.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 5
            
            // Dates (for rent orders)
            if order.orderType == .rent {
                let pickupText = "Pickup: \(order.pickupDate?.dateInString() ?? "N/A")"
                pickupText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                    .font: font,
                    .foregroundColor: UIColor.black
                ])
                yPosition += lineHeight
                
                let returnText = "Return: \(order.returnDate?.dateInString() ?? "N/A")"
                returnText.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                    .font: font,
                    .foregroundColor: UIColor.black
                ])
                yPosition += lineHeight + 10
            }
            
            // Separator
            separator.draw(at: CGPoint(x: margin, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 5
            
            // Footer - Centered
            let footerText = order.orderType == .rent ? "Thank you for your business!" : "Thank you for your purchase!"
            let footerX = centerText(footerText, pageWidth)
            footerText.draw(at: CGPoint(x: footerX, y: yPosition), withAttributes: [
                .font: font,
                .foregroundColor: UIColor.black
            ])
            yPosition += lineHeight + 10
        }
        
        // Save PDF to temporary file
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("Order_\(order.orderNumber).pdf")
        try? data.write(to: tempURL)
        pdfURL = tempURL
        
        // Load PDF document
        if let document = PDFDocument(url: tempURL) {
            pdfDocument = document
            pdfView.document = document
            pdfView.goToFirstPage(nil)
        }
    }
    
    @objc private func shareTapped() {
        guard let pdfDocument = pdfDocument else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "PDF not available".localized()
            )
            return
        }
        
        // Show progress
        showProgressText(text: "Generating image...".localized())
        
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            // Convert PDF to JPG
            let fileName = "Order_\(self.order.orderNumber).jpg"
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
            
            if let jpgURL = pdfDocument.saveAsJPG(to: tempURL, quality: 0.9, scale: 2.0) {
                DispatchQueue.main.async {
                    self.hideProgress()
                    self.shareFile(url: jpgURL)
                }
            } else {
                DispatchQueue.main.async {
                    self.hideProgress()
                    UIAlertController.alert(
                        parent: self,
                        title: "Error".localized(),
                        message: "Failed to generate image".localized()
                    )
                }
            }
        }
    }
    
    private func shareFile(url: URL) {
        // Load UIImage from file - use UIImage only (not URL) to avoid duplicate saves
        // UIImage enables "Save to Photos" option and prevents duplicate saves
        guard let imageData = try? Data(contentsOf: url),
              let image = UIImage(data: imageData) else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Failed to load image".localized()
            )
            return
        }
        
        let activityViewController = UIActivityViewController(
            activityItems: [image],
            applicationActivities: nil
        )
        
        // For iPad
        if let popover = activityViewController.popoverPresentationController {
            popover.sourceView = shareButton
            popover.sourceRect = shareButton.bounds
        }
        
        // Clean up file after sharing
        activityViewController.completionWithItemsHandler = { _, _, _, _ in
            try? FileManager.default.removeItem(at: url)
        }
        
        present(activityViewController, animated: true)
    }
    
    @objc private func closeTapped() {
        dismiss(animated: true)
    }
    
    deinit {
        // Clean up temporary file
        if let pdfURL = pdfURL {
            try? FileManager.default.removeItem(at: pdfURL)
        }
    }
}

