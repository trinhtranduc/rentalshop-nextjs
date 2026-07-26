//
//  PreviewGroupedCells.swift
//  POS ADBD
//
//  Custom cells for PreviewViewController with Grouped Style (Option 2)
//

import UIKit
import SnapKit

// MARK: - Grouped Info Cell
// Simple info cell using iOS native .value1 style
class GroupedInfoCell: UITableViewCell {
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: .value1, reuseIdentifier: reuseIdentifier)
        setupStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupStyle() {
        // Use default iOS grouped cell style
        // .value1 style shows title on left, value on right
    }
    
    func configure(title: String, value: String, isHighlighted: Bool = false) {
        var config = defaultContentConfiguration()
        config.text = title
        config.secondaryText = value
        config.textProperties.font = .bodyMedium()
        config.secondaryTextProperties.font = isHighlighted ? .bodyBold() : .bodyMedium()
        config.secondaryTextProperties.color = isHighlighted ? .actionPrimary : .textPrimary
        contentConfiguration = config
    }
}

// MARK: - Grouped Editable Cell
// Cell with text field for editable content
class GroupedEditableCell: UITableViewCell {
    var textField: UITextField!
    var onTextChanged: ((String) -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: .default, reuseIdentifier: reuseIdentifier)
        setupStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupStyle() {
        textField = UITextField()
        textField.font = .bodyMedium()
        textField.textColor = .textPrimary
        textField.clearButtonMode = .whileEditing
        textField.returnKeyType = .done
        
        contentView.addSubview(textField)
        textField.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.top.bottom.equalToSuperview().inset(8)
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

// MARK: - Grouped Button Cell
// Cell with button for picker actions
class GroupedButtonCell: UITableViewCell {
    var button: UIButton!
    var onButtonTapped: (() -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: .default, reuseIdentifier: reuseIdentifier)
        setupStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupStyle() {
        button = UIButton(type: .system)
        button.titleLabel?.font = .bodyMedium()
        button.setTitleColor(.actionPrimary, for: .normal)
        button.contentHorizontalAlignment = .left
        button.addTarget(self, action: #selector(buttonTapped), for: .touchUpInside)
        
        contentView.addSubview(button)
        button.snp.makeConstraints { make in
            make.leading.equalToSuperview().offset(16)
            make.trailing.equalToSuperview().offset(-16)
            make.top.bottom.equalToSuperview().inset(8)
        }
    }
    
    @objc private func buttonTapped() {
        onButtonTapped?()
    }
    
    func configure(title: String, value: String, isEnabled: Bool = true) {
        button.setTitle("\(title): \(value)", for: .normal)
        button.isEnabled = isEnabled
    }
}

// MARK: - Grouped Note Cell
// Cell with text view for notes
class GroupedNoteCell: UITableViewCell {
    private let noteTextView: PlaceholderTextView
    var onNoteTapped: (() -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        noteTextView = PlaceholderTextView()
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupStyle() {
        noteTextView.font = .bodySmall()
        noteTextView.textColor = .textPrimary
        noteTextView.backgroundColor = .backgroundSecondary
        noteTextView.isScrollEnabled = false
        noteTextView.isEditable = false
        noteTextView.isUserInteractionEnabled = true
        noteTextView.textContainerInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        noteTextView.placeholder = "Add notes here...".localized()
        noteTextView.layer.cornerRadius = 8
        noteTextView.layer.borderWidth = 0.5
        noteTextView.layer.borderColor = UIColor.borderColor.cgColor
        
        let tap = UITapGestureRecognizer(target: self, action: #selector(noteTapped))
        noteTextView.addGestureRecognizer(tap)
        
        contentView.addSubview(noteTextView)
        noteTextView.snp.makeConstraints { make in
            make.edges.equalToSuperview().inset(8)
            make.height.greaterThanOrEqualTo(80)
        }
    }
    
    @objc private func noteTapped() {
        onNoteTapped?()
    }
    
    func configure(note: String) {
        noteTextView.text = note
    }
}

// MARK: - Grouped Switch Cell
// Cell with switch for ready to deliver
class GroupedSwitchCell: UITableViewCell {
    private let titleLabel = UILabel()
    private let switchControl = UISwitch()
    var onSwitchChanged: ((Bool) -> Void)?
    
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupStyle()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupStyle() {
        titleLabel.font = .bodyMedium()
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

