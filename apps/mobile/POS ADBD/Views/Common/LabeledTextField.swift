import UIKit
import SnapKit

class LabeledTextField: UIView {
    lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.mediumFont(size: 14)
        label.textColor = APP_TEXT_COLOR
        label.isHidden = false // Ensure label is always visible
        label.numberOfLines = 1
        label.setContentHuggingPriority(.required, for: .vertical)
        label.setContentCompressionResistancePriority(.required, for: .vertical)
        return label
    }()
    
    let textField: RCSimpleTextField = {
        let field = RCSimpleTextField()
        field.font = Utils.regularFont(size: 16)
        // Disable autocorrect and autocapitalization
        field.autocorrectionType = .no
        field.autocapitalizationType = .none
        return field
    }()
    
    private lazy var errorLabel: UILabel = {
        let label = UILabel()
        label.font = Utils.regularFont(size: 12)
        label.textColor = .actionDanger
        label.numberOfLines = 0
        label.isHidden = true
        return label
    }()
    
    private lazy var stackView: UIStackView = {
        let stack = UIStackView(arrangedSubviews: [titleLabel, textField, errorLabel])
        stack.axis = .vertical
        stack.spacing = 5
        stack.distribution = .fill
        stack.alignment = .fill
        return stack
    }()
    
    var isValid: Bool = true {
        didSet {
            updateValidationState()
        }
    }
    
    var errorMessage: String? {
        didSet {
            errorLabel.text = errorMessage
            errorLabel.isHidden = errorMessage == nil
            updateValidationState()
        }
    }
    
    init(title: String, placeholder: String) {
        super.init(frame: .zero)
        titleLabel.text = title
        titleLabel.isHidden = false // Ensure label is visible
        textField.placeholder = placeholder
        setupView()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupView() {
        backgroundColor = .clear
        addSubview(stackView)
        
        setupConstraints()
        
        // Title label should maintain its intrinsic size - already set in lazy var
        // titleLabel.setContentHuggingPriority(.required, for: .vertical) - set in lazy var
        // titleLabel.setContentCompressionResistancePriority(.required, for: .vertical) - set in lazy var
        
        // TextField should be flexible but maintain minimum height
        textField.setContentHuggingPriority(.defaultLow, for: .vertical)
        textField.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
        
        // Error label should be flexible
        errorLabel.setContentHuggingPriority(.defaultLow, for: .vertical)
        errorLabel.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
    }
    
    private func setupConstraints() {
        stackView.snp.makeConstraints { make in
            make.edges.equalToSuperview()
        }
        
        // Ensure titleLabel has intrinsic height - don't constrain it, let it size naturally
        // The label will size based on its font and text content
        
        textField.snp.makeConstraints { make in
            make.height.equalTo(50)
        }
    }
    
    private func updateValidationState() {
        // Route through RCSimpleTextField's error state so it coexists with the
        // field's focus-driven border instead of overwriting it.
        textField.isError = !isValid
    }
    
    func setTitle(_ text: String) {
        titleLabel.attributedText = nil
        titleLabel.text = text
    }

    /// Shows a red asterisk after the label for required fields.
    func setRequired(_ isRequired: Bool) {
        let displayTitle = titleLabel.attributedText?.string ?? titleLabel.text ?? ""
        let baseTitle = displayTitle
            .replacingOccurrences(of: " *", with: "")
            .replacingOccurrences(of: " (*)", with: "")
            .trimmingCharacters(in: .whitespaces)

        guard isRequired else {
            titleLabel.attributedText = nil
            titleLabel.text = baseTitle
            return
        }

        let attributed = NSMutableAttributedString(
            string: baseTitle,
            attributes: [
                .font: Utils.mediumFont(size: 14),
                .foregroundColor: titleLabel.textColor ?? APP_TEXT_COLOR
            ]
        )
        attributed.append(NSAttributedString(
            string: " *",
            attributes: [
                .font: Utils.mediumFont(size: 14),
                .foregroundColor: UIColor.actionDanger
            ]
        ))
        titleLabel.attributedText = attributed
    }

    /// Appends a muted "(Optional)" hint to the field label.
    func setOptional(_ isOptional: Bool) {
        let baseTitle = (titleLabel.attributedText?.string ?? titleLabel.text ?? "")
            .replacingOccurrences(of: " *", with: "")
            .replacingOccurrences(of: " (\("Optional".localized()))", with: "")
            .trimmingCharacters(in: .whitespaces)

        guard isOptional else {
            titleLabel.attributedText = nil
            titleLabel.text = baseTitle
            return
        }

        let attributed = NSMutableAttributedString(
            string: baseTitle + " ",
            attributes: [
                .font: Utils.mediumFont(size: 14),
                .foregroundColor: titleLabel.textColor ?? APP_TEXT_COLOR
            ]
        )
        attributed.append(NSAttributedString(
            string: "(\("Optional".localized()))",
            attributes: [
                .font: Utils.regularFont(size: 12),
                .foregroundColor: UIColor.textSecondary
            ]
        ))
        titleLabel.attributedText = attributed
    }
    
    func setTitleColor(_ color: UIColor) {
        titleLabel.textColor = color
    }
    
    func showError(_ message: String?) {
        errorMessage = message
        isValid = message == nil
    }
    
    func clearError() {
        errorMessage = nil
        isValid = true
    }
} 
