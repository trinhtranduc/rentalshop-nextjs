//
//  QRCodeViewController.swift
//  POS ADBD
//
//  Created by Auto on $(date).
//

import UIKit
import SnapKit

class QRCodeViewController: BaseViewControler {
    private let qrData: String
    private let orderNumber: String?
    
    private lazy var scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.backgroundColor = .systemBackground
        return scrollView
    }()
    
    private lazy var contentView: UIView = {
        let view = UIView()
        view.backgroundColor = .systemBackground
        return view
    }()
    
    private lazy var qrImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .white
        imageView.layer.cornerRadius = 12
        imageView.clipsToBounds = true
        return imageView
    }()
    
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.textAlignment = .center
        label.font = Utils.boldFont(size: 20)
        label.textColor = .label
        return label
    }()
    
    init(qrData: String, orderNumber: String?) {
        self.qrData = qrData
        self.orderNumber = orderNumber
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        generateQRCode()
    }
    
    internal override func setupUI() {
        title = "QR Code".localized()
        view.backgroundColor = .systemBackground
        
        // Setup navigation bar
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(closeTapped)
        )
        
        // Add scroll view
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        // Add subviews
        contentView.addSubview(qrImageView)
        contentView.addSubview(orderNumberLabel)
        
        // Layout
        scrollView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        contentView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
        
        qrImageView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(40)
            make.centerX.equalToSuperview()
            make.width.height.equalTo(300)
        }
        
        orderNumberLabel.snp.makeConstraints { make in
            make.top.equalTo(qrImageView.snp.bottom).offset(24)
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.equalToSuperview().offset(-40)
        }
    }
    
    private func generateQRCode() {
        // Generate QR code image
        if let qrImage = qrData.qrcode() {
            qrImageView.image = qrImage
        } else {
            qrImageView.image = nil
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Failed to generate QR code".localized()
            )
        }
        
        // Set order number label
        if let orderNumber = orderNumber {
            orderNumberLabel.text = "Order Number: \(orderNumber)"
        } else {
            orderNumberLabel.text = qrData
        }
    }
    
    @objc private func closeTapped() {
        dismiss(animated: true)
    }
}

