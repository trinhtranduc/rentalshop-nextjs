import UIKit

/// A primary action button component styled to match the app design
/// Red background with white text, used for main actions like "Save", "Submit", etc.
class RCPrimaryButton: UIButton {
    
    // MARK: - Properties
    private var cornerRadiusValue: CGFloat = 25
    private var buttonHeight: CGFloat = 50
    private var customBackgroundColor: UIColor = .systemRed
    private var customDisabledColor: UIColor = .systemGray4
    private var isBorderStyle: Bool = false
    var buttonBorderColor: UIColor = APP_TONE_COLOR
    
    // MARK: - Initializers
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupButton()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupButton()
    }
    
    /// Convenience initializer with title
    /// - Parameter title: Button title text
    convenience init(title: String) {
        self.init(frame: .zero)
        setTitle(title, for: .normal)
        setupButton()
    }
    
    /// Convenience initializer with title and custom background color
    /// - Parameters:
    ///   - title: Button title text
    ///   - backgroundColor: Custom background color (default: systemRed)
    convenience init(title: String, backgroundColor: UIColor) {
        self.init(frame: .zero)
        setTitle(title, for: .normal)
        self.customBackgroundColor = backgroundColor
        setupButton()
    }
    
    /// Convenience initializer with title and border style (outline button)
    /// - Parameters:
    ///   - title: Button title text
    ///   - borderColor: Border color (default: systemRed)
    convenience init(title: String, borderStyle: Bool, borderColor: UIColor = .systemRed) {
        self.init(frame: .zero)
        setTitle(title, for: .normal)
        self.isBorderStyle = borderStyle
        self.buttonBorderColor = borderColor
        self.customBackgroundColor = borderColor
        setupButton()
    }
    
    // MARK: - Setup
    private func setupButton() {
        // Border and corner radius
        layer.cornerRadius = cornerRadiusValue
        layer.masksToBounds = true
        
        if isBorderStyle {
            // Border style: clear background with border
            backgroundColor = .clear
            layer.borderWidth = 1
            layer.borderColor = buttonBorderColor.cgColor
            setTitleColor(buttonBorderColor, for: .normal)
        } else {
            // Filled style: background color (tone color) with white text
            backgroundColor = customBackgroundColor
            layer.borderWidth = 0
            setTitleColor(.white, for: .normal)
        }
        
        // Text styling
        titleLabel?.font = Utils.boldFont(size: 18)
        
        // Fixed height
        heightAnchor.constraint(equalToConstant: buttonHeight).isActive = true
        
        // Disable default button highlighting
        adjustsImageWhenHighlighted = false
        
        // Add press animation
        addTarget(self, action: #selector(buttonTouchDown), for: .touchDown)
        addTarget(self, action: #selector(buttonTouchUp), for: [.touchUpInside, .touchUpOutside, .touchCancel])
    }
    
    // MARK: - Public Methods
    
    /// Update button title
    /// - Parameter title: New title text
    func setButtonTitle(_ title: String) {
        setTitle(title, for: .normal)
    }
    
    /// Enable or disable the button
    /// - Parameter enabled: Whether the button should be enabled
    override var isEnabled: Bool {
        didSet {
            if isEnabled {
                if isBorderStyle {
                    backgroundColor = .clear
                    layer.borderColor = buttonBorderColor.cgColor
                    setTitleColor(buttonBorderColor, for: .normal)
                } else {
                    // Enabled: tone color background with white text
                    backgroundColor = customBackgroundColor
                    setTitleColor(.white, for: .normal)
                }
                alpha = 1.0
            } else {
                // Disabled: gray background with white text (màu phù hợp)
                if isBorderStyle {
                    backgroundColor = .clear
                    layer.borderColor = UIColor.systemGray4.cgColor
                    setTitleColor(.systemGray4, for: .normal)
                } else {
                    backgroundColor = customDisabledColor
                    setTitleColor(.white, for: .normal)
                }
                alpha = 1.0
            }
        }
    }
    
    /// Set custom background color
    /// - Parameter color: The background color to use
    func setBackgroundColor(_ color: UIColor) {
        customBackgroundColor = color
        if isEnabled {
            backgroundColor = color
        }
    }
    
    // MARK: - Actions
    @objc private func buttonTouchDown() {
        UIView.animate(withDuration: 0.1, delay: 0, options: [.allowUserInteraction, .curveEaseIn], animations: {
            self.transform = CGAffineTransform(scaleX: 0.97, y: 0.97)
            self.alpha = 0.8
        })
    }
    
    @objc private func buttonTouchUp() {
        UIView.animate(withDuration: 0.1, delay: 0, options: [.allowUserInteraction, .curveEaseOut], animations: {
            self.transform = CGAffineTransform.identity
            if self.isEnabled {
                self.alpha = 1.0
            }
        })
    }
}

