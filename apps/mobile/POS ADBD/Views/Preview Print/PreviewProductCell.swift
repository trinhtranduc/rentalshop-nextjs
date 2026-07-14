//
//  PreviewProductCell.swift
//  POS ADBD
//
//  Created by Trinh Tran on 2/20/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import SnapKit

class PreviewProductCell: UITableViewCell {
    private lazy var nameLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 15)
        return label
    }()
    
    private lazy var qtyLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textAlignment = .center
        return label
    }()
    
    private lazy var priceLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 14)
        label.textAlignment = .right
        return label
    }()
    
    private lazy var totalLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.boldFont(size: 14)
        label.textAlignment = .right
        return label
    }()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        [nameLabel, qtyLabel, priceLabel, totalLabel].forEach { contentView.addSubview($0) }
        
        nameLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.centerY.equalToSuperview()
            make.width.equalToSuperview().multipliedBy(0.4)
        }
        
        qtyLabel.snp.makeConstraints { make in
            make.leading.equalTo(nameLabel.snp.trailing).offset(8)
            make.centerY.equalToSuperview()
            make.width.equalTo(60)
        }
        
        priceLabel.snp.makeConstraints { make in
            make.leading.equalTo(qtyLabel.snp.trailing).offset(8)
            make.centerY.equalToSuperview()
            make.width.equalTo(100)
        }
        
        totalLabel.snp.makeConstraints { make in
            make.leading.equalTo(priceLabel.snp.trailing).offset(8)
            make.trailing.equalToSuperview().offset(-16)
            make.centerY.equalToSuperview()
        }
    }
    
    /// Bind with CartItem
    func bindProduct(cartItem: CartItem) {
        nameLabel.text = cartItem.productName
        qtyLabel.text = cartItem.quantity.formatStringInCommon()
        priceLabel.text = cartItem.price.formatStringInCommon()
        totalLabel.text = cartItem.subTotal.formatStringInCommon()
    }
    
    /// Bind with OrderItem
    func bindProduct(orderItem: OrderItem) {
        nameLabel.text = orderItem.productName
        qtyLabel.text = orderItem.quantity.formatStringInCommon()
        priceLabel.text = orderItem.unitPrice.formatStringInCommon()
        totalLabel.text = orderItem.totalPrice.formatStringInCommon()
    }
}
