//
//  ToastView.swift
//  POS ADBD
//
//  Created by AI Assistant
//  Copyright © 2024 Trinh Tran. All rights reserved.
//

import UIKit
import SnapKit

/// A reusable toast notification view
class ToastView: UIView {
    
    // MARK: - UI Components
    private let messageLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 15)
        label.textColor = .white
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    private let iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = .white
        return imageView
    }()
    
    // MARK: - Initialization
    init(message: String, icon: UIImage? = nil) {
        super.init(frame: .zero)
        setupUI()
        configure(message: message, icon: icon)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup
    private func setupUI() {
        backgroundColor = UIColor.black.withAlphaComponent(0.8)
        layer.cornerRadius = 12
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 4)
        layer.shadowRadius = 8
        layer.shadowOpacity = 0.3
        
        // Add subviews
        addSubview(messageLabel)
        
        // Setup constraints
        messageLabel.snp.makeConstraints { make in
            make.leading.trailing.equalToSuperview().inset(20)
            make.top.bottom.equalToSuperview().inset(16)
        }
    }
    
    private func configure(message: String, icon: UIImage?) {
        messageLabel.text = message
        
        if let icon = icon {
            // Add icon if provided
            addSubview(iconImageView)
            iconImageView.image = icon
            
            iconImageView.snp.makeConstraints { make in
                make.leading.equalToSuperview().offset(16)
                make.centerY.equalToSuperview()
                make.width.height.equalTo(20)
            }
            
            messageLabel.snp.remakeConstraints { make in
                make.leading.equalTo(iconImageView.snp.trailing).offset(12)
                make.trailing.equalToSuperview().inset(16)
                make.top.bottom.equalToSuperview().inset(16)
            }
        }
    }
}

// MARK: - Toast Extension for BaseViewControler
extension BaseViewControler {
    /// Show a toast message
    /// - Parameters:
    ///   - message: The message to display
    ///   - duration: How long to show the toast (default: 2 seconds)
    ///   - icon: Optional icon to display
    func showToast(message: String, duration: TimeInterval = 2.0, icon: UIImage? = nil) {
        // Remove any existing toast
        view.subviews.forEach { subview in
            if subview is ToastView {
                subview.removeFromSuperview()
            }
        }
        
        // Create toast view
        let toast = ToastView(message: message, icon: icon)
        view.addSubview(toast)
        
        // Setup constraints - center horizontally, near bottom
        toast.snp.makeConstraints { make in
            make.centerX.equalToSuperview()
            make.bottom.equalTo(view.safeAreaLayoutGuide).offset(-40)
            make.leading.greaterThanOrEqualToSuperview().offset(20)
            make.trailing.lessThanOrEqualToSuperview().offset(-20)
        }
        
        // Animate in
        toast.alpha = 0
        toast.transform = CGAffineTransform(translationX: 0, y: 20)
        
        UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseOut], animations: {
            toast.alpha = 1
            toast.transform = .identity
        }) { _ in
            // Animate out after duration
            UIView.animate(withDuration: 0.3, delay: duration, options: [.curveEaseIn], animations: {
                toast.alpha = 0
                toast.transform = CGAffineTransform(translationX: 0, y: -20)
            }) { _ in
                toast.removeFromSuperview()
            }
        }
    }
}
