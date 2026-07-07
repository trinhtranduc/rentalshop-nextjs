import UIKit

/// A simple text field component styled to match the app design
/// Similar to RCTextFieldPadding but with a cleaner, simpler implementation
class RCSimpleTextField: UITextField {
    
    // MARK: - Properties
    private var leftIconView: UIImageView?
    private var rightIconView: UIImageView?
    private var rightIconAction: Selector?
    private var rightIconTarget: Any?
    
    private let iconPadding: CGFloat = 12
    private let iconSize: CGFloat = 20
    private let containerSize: CGFloat = 40
    
    // MARK: - Computed Properties
    private var padding: UIEdgeInsets {
        var leftPadding: CGFloat = 16
        if leftIconView != nil {
            leftPadding = 50 // Space for icon + padding
        }
        
        var rightPadding: CGFloat = 16
        if rightIconView != nil {
            rightPadding = 50 // Space for icon + padding
        }
        
        return UIEdgeInsets(top: 0, left: leftPadding, bottom: 0, right: rightPadding)
    }
    
    // MARK: - Initializers
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupField()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupField()
    }
    
    // MARK: - Setup
    private func setupField() {
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        // Background and border styling (design tokens so it themes consistently)
        backgroundColor = .backgroundCard
        layer.cornerRadius = 25
        layer.borderWidth = 1
        layer.borderColor = UIColor.borderColor.cgColor

        // Text styling - Larger font size
        font = Utils.regularFont(size: isIPad ? 18 : 16)
        textColor = APP_TEXT_COLOR
        tintColor = .brandPrimary

        // Placeholder styling
        if let placeholder = placeholder {
            attributedPlaceholder = NSAttributedString(
                string: placeholder,
                attributes: [
                    .foregroundColor: UIColor.textTertiary,
                    .font: Utils.regularFont(size: isIPad ? 18 : 16)
                ]
            )
        }

        // Border reflects focus (and error) state, not merely whether text exists.
        addTarget(self, action: #selector(textFieldDidChange), for: .editingChanged)
        addTarget(self, action: #selector(updateBorderColor), for: .editingDidBegin)
        addTarget(self, action: #selector(updateBorderColor), for: .editingDidEnd)
        
        // Fixed height
        heightAnchor.constraint(equalToConstant: 50).isActive = true
    }
    
    // MARK: - Error State
    /// Set to true to render the field in its error state (red border).
    var isError: Bool = false {
        didSet { updateBorderColor() }
    }

    // MARK: - Border Color Update
    /// Border priority: error > focused > default. Uses design tokens throughout.
    @objc private func updateBorderColor() {
        if isError {
            layer.borderColor = UIColor.actionDanger.cgColor
        } else if isEditing {
            layer.borderColor = UIColor.brandPrimary.cgColor
        } else {
            layer.borderColor = UIColor.borderColor.cgColor
        }
    }
    
    // MARK: - Public Methods
    
    /// Set left icon for the text field
    /// - Parameter image: The icon image to display on the left
    func setLeftIcon(_ image: UIImage?) {
        if let image = image {
            leftIconView = UIImageView(image: image)
            leftIconView?.tintColor = .textTertiary
            leftIconView?.contentMode = .scaleAspectFit
            
            let containerView = UIView(frame: CGRect(x: 0, y: 0, width: iconSize + (iconPadding * 2), height: iconSize))
            leftIconView?.frame = CGRect(x: iconPadding, y: 0, width: iconSize, height: iconSize)
            containerView.addSubview(leftIconView!)
            
            leftView = containerView
            leftViewMode = .always
        } else {
            leftView = nil
            leftViewMode = .never
            leftIconView = nil
        }
        
        setNeedsLayout()
    }
    
    /// Set right icon for the text field with optional action
    /// - Parameters:
    ///   - image: The icon image to display on the right
    ///   - action: Optional selector to call when icon is tapped
    ///   - target: Optional target for the action
    func setRightIcon(_ image: UIImage?, action: Selector? = nil, target: Any? = nil) {
        if let image = image {
            rightIconAction = action
            rightIconTarget = target
            
            let iconContainerView = UIView(frame: CGRect(x: 0, y: 0, width: containerSize, height: containerSize))
            
            rightIconView = UIImageView(frame: CGRect(
                x: (containerSize - iconSize) / 2,
                y: (containerSize - iconSize) / 2,
                width: iconSize,
                height: iconSize
            ))
            rightIconView?.image = image
            rightIconView?.tintColor = .textTertiary
            rightIconView?.contentMode = .scaleAspectFit
            
            if let iconView = rightIconView {
                iconContainerView.addSubview(iconView)
            }
            
            // Add tap gesture if action is provided
            if let action = action {
                iconContainerView.isUserInteractionEnabled = true
                let tap = UITapGestureRecognizer(target: self, action: #selector(rightIconTapped))
                iconContainerView.addGestureRecognizer(tap)
            }
            
            rightView = iconContainerView
            rightViewMode = .always
        } else {
            rightView = nil
            rightViewMode = .never
            rightIconView = nil
        }
        
        setNeedsLayout()
    }
    
    /// Update placeholder text with proper styling
    override var placeholder: String? {
        didSet {
            if let placeholder = placeholder {
                let isIPad = traitCollection.horizontalSizeClass == .regular
                attributedPlaceholder = NSAttributedString(
                    string: placeholder,
                    attributes: [
                        .foregroundColor: UIColor.textTertiary,
                        .font: Utils.regularFont(size: isIPad ? 18 : 16)
                    ]
                )
            }
        }
    }
    
    // MARK: - Actions
    @objc private func rightIconTapped() {
        if let action = rightIconAction, let target = rightIconTarget {
            _ = (target as AnyObject).perform(action)
        }
    }
    
    @objc private func textFieldDidChange() {
        updateBorderColor()
    }
    
    // MARK: - Override Methods
    
    override var text: String? {
        didSet {
            updateBorderColor()
        }
    }
    
    override func textRect(forBounds bounds: CGRect) -> CGRect {
        return UIEdgeInsetsInsetRect(bounds, padding)
    }
    
    override func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        return UIEdgeInsetsInsetRect(bounds, padding)
    }
    
    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        return UIEdgeInsetsInsetRect(bounds, padding)
    }
    
    override func leftViewRect(forBounds bounds: CGRect) -> CGRect {
        var rect = super.leftViewRect(forBounds: bounds)
        rect.origin.x += iconPadding / 2
        return rect
    }
    
    override func rightViewRect(forBounds bounds: CGRect) -> CGRect {
        var rect = super.rightViewRect(forBounds: bounds)
        rect.origin.x -= iconPadding / 2
        return rect
    }
}

