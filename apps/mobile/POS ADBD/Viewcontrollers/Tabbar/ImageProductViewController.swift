//
//  ImageProductViewController.swift
//  POS ADBD
//
//  Created by Trinh Tran on 1/10/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import Kingfisher
import SnapKit

class ImageProductViewController: BaseViewControler {
    
    // MARK: - UI Components
    private lazy var imageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .black
        return imageView
    }()
    
    // MARK: - Properties
    var imageUrl: String?
    
    // MARK: - Class Methods
    class func instance(imageUrl: String? = nil) -> ImageProductViewController {
        return ImageProductViewController(imageUrl: imageUrl)
    }
    
    // MARK: - Initialization
    init(imageUrl: String? = nil) {
        self.imageUrl = imageUrl
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        loadImage()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Hide default navigation bar
        navigationController?.setNavigationBarHidden(true, animated: false)
        // Set status bar style for white background
        setStatusBarStyle(.darkContent)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
    }
    
    // MARK: - Setup
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        let navBar = setupCustomNavigationBar(
            title: "",
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .custom { [weak self] in
                self?.dismiss(animated: true)
            }
        )
        navBar.setDismissButton() // Use X button for dismiss
        navBar.backButtonTintColor = .black // Black X button for white background
    }
    
    override func setupUI() {
        view.backgroundColor = .black
        
        guard let customNavBar = customNavBar else { return }
        
        // Add subviews - order matters for z-index
        view.addSubview(imageView)
        
        // Setup constraints
        imageView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Navigation bar - extend from top of view to cover status bar area
        customNavBar.snp.remakeConstraints { make in
            make.top.equalToSuperview()
            make.leading.trailing.equalToSuperview()
        }
    }
    
    // MARK: - Helper Methods
    private func loadImage() {
        guard let urlString = imageUrl, let url = URL(string: urlString) else { return }
        
        imageView.kf.setImage(
            with: url,
            placeholder: nil,
            options: [.transition(.fade(0.1))],
            progressBlock: nil,
            completionHandler: nil
        )
    }
}
