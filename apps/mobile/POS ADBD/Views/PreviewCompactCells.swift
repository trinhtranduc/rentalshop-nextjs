//
//  PreviewCompactCells.swift
//  POS ADBD
//
//  Custom cells for PreviewViewController with Compact Style (Option 3)
//

import UIKit
import SnapKit

// MARK: - Compact Info Row Cell
// Dense info cell with minimal spacing
class CompactInfoRowCell: UITableViewCell {
    private let titleLabel = UILabel()
    private let valueLabel = UILabel()
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCompactStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCompactStyle() {
        backgroundColor = .backgroundCard
        selectionStyle = .none
        
        // Minimal padding
        let stackView = UIStackView(arrangedSubviews: [titleLabel, valueLabel])
        stackView.axis = .horizontal
        stackView.distribution = .fill
        stackView.spacing = 8
        
        contentView.addSubview(stackView)
        stackView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.top.bottom.equalToSuperview().inset(4) // Minimal vertical padding
        }
        
        titleLabel.font = .bodySmall()
        titleLabel.textColor = .textSecondary
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        
        valueLabel.font = .bodyMedium()
        valueLabel.textColor = .textPrimary
        valueLabel.textAlignment = .right
    }
    
    func configure(title: String, value: String, isHighlighted: Bool = false) {
        titleLabel.text = title
        valueLabel.text = value
        
        if isHighlighted {
            valueLabel.textColor = .actionPrimary
            valueLabel.font = .bodyBold()
        } else {
            valueLabel.textColor = .textPrimary
            valueLabel.font = .bodyMedium()
        }
    }
}

// MARK: - Compact Inline Editable Cell
// Cell with inline text field
class CompactInlineEditableCell: UITableViewCell {
    var textField: UITextField!
    var onTextChanged: ((String) -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCompactStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCompactStyle() {
        backgroundColor = .backgroundCard
        selectionStyle = .none
        
        textField = UITextField()
        textField.font = .bodyMedium()
        textField.textColor = .textPrimary
        textField.borderStyle = .none
        textField.clearButtonMode = .whileEditing
        textField.returnKeyType = .done
        
        contentView.addSubview(textField)
        textField.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.top.bottom.equalToSuperview().inset(4)
        }
        
        textField.addTarget(self, action: #selector(textFieldChanged), for: .editingChanged)
    }
    
    @objc private func textFieldChanged() {
        onTextChanged?(textField.text ?? "")
    }
    
    func configure(placeholder: String, value: String, isEnabled: Bool = true) {
        textField.placeholder = placeholder
        textField.text = value
        textField.isEnabled = isEnabled
    }
}

// MARK: - Compact Button Cell
// Cell with button for picker actions
class CompactButtonCell: UITableViewCell {
    private let titleLabel = UILabel()
    private let valueButton = UIButton(type: .system)
    var onButtonTapped: (() -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCompactStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCompactStyle() {
        backgroundColor = .backgroundCard
        selectionStyle = .none
        
        let stackView = UIStackView(arrangedSubviews: [titleLabel, valueButton])
        stackView.axis = .horizontal
        stackView.distribution = .fill
        stackView.spacing = 8
        
        contentView.addSubview(stackView)
        stackView.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.top.bottom.equalToSuperview().inset(4)
        }
        
        titleLabel.font = .bodySmall()
        titleLabel.textColor = .textSecondary
        titleLabel.setContentHuggingPriority(.required, for: .horizontal)
        
        valueButton.titleLabel?.font = .bodyMedium()
        valueButton.setTitleColor(.actionPrimary, for: .normal)
        valueButton.contentHorizontalAlignment = .right
        valueButton.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
    }
    
    @objc private func buttonTapped() {
        onButtonTapped?()
    }
    
    func configure(title: String, value: String, isEnabled: Bool = true) {
        titleLabel.text = title
        valueButton.setTitle(value, for: .normal)
        valueButton.isEnabled = isEnabled
    }
}

// MARK: - Compact Note Cell
// Cell with compact note text view
class CompactNoteCell: UITableViewCell {
    private let noteTextView: PlaceholderTextView
    var onNoteTapped: (() -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        noteTextView = PlaceholderTextView()
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCompactStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCompactStyle() {
        backgroundColor = .backgroundCard
        selectionStyle = .none
        
        noteTextView.font = .bodySmall()
        noteTextView.textColor = .textPrimary
        noteTextView.backgroundColor = .backgroundSecondary
        noteTextView.isScrollEnabled = false
        noteTextView.isEditable = false
        noteTextView.isUserInteractionEnabled = true
        noteTextView.textContainerInset = UIEdgeInsets(top: 4, left: 4, bottom: 4, right: 4)
        noteTextView.placeholder = "Add notes here...".localized()
        noteTextView.layer.cornerRadius = 4
        noteTextView.layer.borderWidth = 0.5
        noteTextView.layer.borderColor = UIColor.borderColor.cgColor
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(noteTapped))
        noteTextView.addGestureRecognizer(tap)
        
        contentView.addSubview(noteTextView)
        noteTextView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(8)
            make.height.greaterThanOrEqualTo(60)
        }
    }
    
    @objc private func noteTapped() {
        onNoteTapped?()
    }
    
    func configure(note: String) {
        noteTextView.text = note
    }
}

// MARK: - Compact Switch Cell
// Cell with switch for ready to deliver
class CompactSwitchCell: UITableViewCell {
    private let titleLabel = UILabel()
    private let switchControl = UISwitch()
    var onSwitchChanged: ((Bool) -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupCompactStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupCompactStyle() {
        backgroundColor = .backgroundCard
        selectionStyle = .none
        
        titleLabel.font = .bodySmall()
        titleLabel.textColor = .textPrimary
        
        switchControl.addTarget(self, action: #selector(switchChanged), for: .valueChanged)
        
        contentView.addSubview(titleLabel)
        contentView.addSubview(switchControl)
        
        titleLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.centerY.equalToSuperview()
        }
        
        switchControl.snp.makeConstraints { make in
            make.trailing.equalToSuperview().offset(-16)
            make.centerY.equalToSuperview()
        }
    }
    
    @objc private func switchChanged() {
        onSwitchChanged?(switchControl.isOn)
    }
    
    func configure(title: String, isOn: Bool) {
        titleLabel.text = title
        switchControl.isOn = isOn
    }
}

// MARK: - Compact Section Header
// Minimal section header
class CompactSectionHeader: UIView {
    private let titleLabel = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupStyle() {
        backgroundColor = .backgroundSecondary
        
        titleLabel.font = .titleSmall()
        titleLabel.textColor = .textSecondary
        
        addSubview(titleLabel)
        titleLabel.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.top.equalToSuperview().offset(8)
            make.bottom.equalToSuperview().offset(-4)
        }
    }
    
    func configure(title: String) {
        titleLabel.text = title
    }
}

