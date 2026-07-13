//
//  PreviewTwoColumnCells.swift
//  POS ADBD
//
//  Custom cells for PreviewViewController with Two Column Style (Option 4)
//

import UIKit
import SnapKit

// MARK: - Two Column Cell
// Cell with two columns side by side for iPad layout
class TwoColumnCell: UITableViewCell {
    private let leftColumnView = UIView()
    private let rightColumnView = UIView()
    private let separatorView = UIView()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupTwoColumnStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupTwoColumnStyle() {
        backgroundColor = .backgroundCard
        selectionStyle = .none
        
        separatorView.backgroundColor = .separator
        
        let stackView = UIStackView(arrangedSubviews: [leftColumnView, separatorView, rightColumnView])
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.spacing = 16
        
        contentView.addSubview(stackView)
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(16)
        }
        
        separatorView.snp.makeConstraints { make in
            make.width.equalTo(1)
        }
    }
    
    func configure(leftContent: UIView, rightContent: UIView) {
        leftColumnView.subviews.forEach { $0.removeFromSuperview() }
        rightColumnView.subviews.forEach { $0.removeFromSuperview() }
        
        leftColumnView.addSubview(leftContent)
        rightColumnView.addSubview(rightContent)
        
        leftContent.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        rightContent.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
    }
}

