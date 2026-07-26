//
//  PaymentQRCodeViewController.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import UIKit
import SnapKit

class PaymentQRCodeViewController: BaseViewControler {
    // MARK: - Properties
    private let orderId: Int
    private var qrCodeData: QRCodeData?
    
    // MARK: - UI Components
    private lazy var scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.showsVerticalScrollIndicator = false
        return scrollView
    }()
    
    private lazy var contentView: UIView = {
        let view = UIView()
        view.backgroundColor = .clear
        return view
    }()
    
    private lazy var qrCodeImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .white
        imageView.layer.cornerRadius = 12
        imageView.layer.shadowColor = UIColor.black.cgColor
        imageView.layer.shadowOffset = CGSize(width: 0, height: 2)
        imageView.layer.shadowRadius = 8
        imageView.layer.shadowOpacity = 0.1
        imageView.clipsToBounds = false
        return imageView
    }()
    
    private lazy var amountLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 24)
        label.textColor = .label
        label.textAlignment = .center
        return label
    }()
    
    private lazy var orderNumberLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 16)
        label.textColor = .secondaryLabel
        label.textAlignment = .center
        return label
    }()
    
    private lazy var bankInfoView: UIView = {
        let view = UIView()
        view.backgroundColor = .white
        view.layer.cornerRadius = 12
        view.layer.borderWidth = 0.5
        view.layer.borderColor = UIColor.separator.withAlphaComponent(0.25).cgColor
        return view
    }()
    
    private lazy var loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(activityIndicatorStyle: .large)
        indicator.hidesWhenStopped = true
        indicator.color = APP_TONE_COLOR
        return indicator
    }()
    
    private lazy var saveButton: UIBarButtonItem = {
        let button = UIBarButtonItem(
            title: "Save".localized(),
            style: .plain,
            target: self,
            action: #selector(saveQRCode)
        )
        return button
    }()
    
    // MARK: - Initialization
    init(orderId: Int) {
        self.orderId = orderId
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadQRCode()
    }
    
    // MARK: - Setup
    override func setupUI() {
        title = "Payment QR Code".localized()
        view.backgroundColor = .backgroundPrimary
        
        navigationItem.leftBarButtonItem = UIBarButtonItem(
            barButtonSystemItem: .close,
            target: self,
            action: #selector(closeTapped)
        )
        
        navigationItem.rightBarButtonItem = saveButton
        saveButton.isEnabled = false
        
        view.addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        contentView.addSubview(qrCodeImageView)
        contentView.addSubview(amountLabel)
        contentView.addSubview(orderNumberLabel)
        contentView.addSubview(bankInfoView)
        contentView.addSubview(loadingIndicator)
        
        scrollView.snp.makeConstraints { make in
            make.top.equalTo(view.safeAreaLayoutGuide)
            make.leading.trailing.bottom.equalToSuperview()
        }
        
        contentView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
            make.width.equalToSuperview()
        }
        
        qrCodeImageView.snp.makeConstraints { make in
            make.top.equalToSuperview().offset(20)
            make.centerX.equalToSuperview()
            make.width.height.equalTo(300)
        }
        
        amountLabel.snp.makeConstraints { make in
            make.top.equalTo(qrCodeImageView.snp.bottom).offset(20)
            make.leading.trailing.equalToSuperview().inset(20)
        }
        
        orderNumberLabel.snp.makeConstraints { make in
            make.top.equalTo(amountLabel.snp.bottom).offset(8)
            make.leading.trailing.equalToSuperview().inset(20)
        }
        
        bankInfoView.snp.makeConstraints { make in
            make.top.equalTo(orderNumberLabel.snp.bottom).offset(20)
            make.leading.trailing.equalToSuperview().inset(20)
            make.bottom.equalToSuperview().offset(-20)
        }
        
        loadingIndicator.snp.makeConstraints { make in
            make.center.equalToSuperview()
        }
    }
    
    // MARK: - Load QR Code
    private func loadQRCode() {
        loadingIndicator.startAnimating()
        qrCodeImageView.isHidden = true
        amountLabel.isHidden = true
        orderNumberLabel.isHidden = true
        bankInfoView.isHidden = true
        
        showProgressText(text: "Loading...".localized())
        
        QRCodeService.shared.getQRCode(for: orderId) { [weak self] qrData, error in
            guard let self = self else { return }
            self.hideProgress()
            self.loadingIndicator.stopAnimating()
            
            if let error = error {
                UIAlertController.errorAlert(parent: self, error: error)
            } else if let qrData = qrData {
                self.qrCodeData = qrData
                self.displayQRCode(qrData)
            }
        }
    }
    
    private func displayQRCode(_ data: QRCodeData) {
        // Generate QR code image
        guard let qrImage = QRCodeGenerator.shared.generateQRCode(
            from: data.qrCodeString,
            size: CGSize(width: 300, height: 300)
        ) else {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Failed to generate QR code".localized()
            )
            return
        }
        
        // Display QR code
        qrCodeImageView.image = qrImage
        qrCodeImageView.isHidden = false
        
        // Display amount
        if data.amount > 0 {
            amountLabel.text = data.amount.formatStringInCommon() + " đ"
        } else {
            amountLabel.text = "Scan to pay".localized()
        }
        amountLabel.isHidden = false
        
        // Display order number
        orderNumberLabel.text = "Order Number".localized() + ": \(data.orderNumber)"
        orderNumberLabel.isHidden = false
        
        // Setup bank info
        setupBankInfo(data.bankAccount)
        bankInfoView.isHidden = false
        
        saveButton.isEnabled = true
    }
    
    private func setupBankInfo(_ bankAccount: QRCodeBankAccount) {
        // Clear existing subviews
        bankInfoView.subviews.forEach { $0.removeFromSuperview() }
        
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 12
        stackView.alignment = .leading
        
        // Bank name
        let bankNameLabel = createInfoLabel(
            title: "Bank Name".localized(),
            value: bankAccount.bankName
        )
        stackView.addArrangedSubview(bankNameLabel)
        
        // Account number
        let accountNumberLabel = createInfoLabel(
            title: "Account Number".localized(),
            value: bankAccount.accountNumber
        )
        stackView.addArrangedSubview(accountNumberLabel)
        
        // Account holder
        let accountHolderLabel = createInfoLabel(
            title: "Account Holder Name".localized(),
            value: bankAccount.accountHolderName
        )
        stackView.addArrangedSubview(accountHolderLabel)
        
        // Branch (if available)
        if let branch = bankAccount.branch, !branch.isEmpty {
            let branchLabel = createInfoLabel(
                title: "Branch".localized(),
                value: branch
            )
            stackView.addArrangedSubview(branchLabel)
        }
        
        bankInfoView.addSubview(stackView)
        
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(16)
        }
    }
    
    private func createInfoLabel(title: String, value: String) -> UIView {
        let containerView = UIView()
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = Utils.regularFont(size: 14)
        titleLabel.textColor = .secondaryLabel
        
        let valueLabel = UILabel()
        valueLabel.text = value
        valueLabel.font = Utils.regularFont(size: 16)
        valueLabel.textColor = .label
        valueLabel.numberOfLines = 0
        
        containerView.addSubview(titleLabel)
        containerView.addSubview(valueLabel)
        
        titleLabel.snp.makeConstraints { make in
            make.top.leading.trailing.equalToSuperview()
        }
        
        valueLabel.snp.makeConstraints { make in
            make.top.equalTo(titleLabel.snp.bottom).offset(4)
            make.leading.trailing.bottom.equalToSuperview()
        }
        
        return containerView
    }
    
    // MARK: - Actions
    @objc private func saveQRCode() {
        guard let qrImage = qrCodeImageView.image else { return }
        
        UIImageWriteToSavedPhotosAlbum(
            qrImage,
            self,
            #selector(image(_:didFinishSavingWithError:contextInfo:)),
            nil
        )
    }
    
    @objc private func image(_ image: UIImage, didFinishSavingWithError error: Error?, contextInfo: UnsafeRawPointer) {
        if let error = error {
            UIAlertController.alert(
                parent: self,
                title: "Error".localized(),
                message: "Cannot save image: \(error.localizedDescription)".localized()
            )
        } else {
            UIAlertController.alert(
                parent: self,
                title: "Success".localized(),
                message: "QR code saved to photo library".localized()
            )
        }
    }
    
    @objc private func closeTapped() {
        dismiss(animated: true)
    }
}

