import UIKit

/// A custom button with built-in haptic feedback
class HapticButton: UIButton {
    
    // MARK: - Haptic Feedback Types
    enum HapticFeedbackType {
        case light
        case medium
        case heavy
        case success
        case warning
        case error
        case selection
        case none
    }
    
    // MARK: - Properties
    private var feedbackType: HapticFeedbackType = .medium
    private var shouldAnimate: Bool = true
    private var cornerRadiusValue: CGFloat = 12
    
    // MARK: - Initializers
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupButton()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupButton()
    }
    
    /// Convenience initializer with customization options
    /// - Parameters:
    ///   - title: Button title
    ///   - backgroundColor: Button background color
    ///   - titleColor: Button title color
    ///   - font: Button title font
    ///   - cornerRadius: Button corner radius
    ///   - feedbackType: Type of haptic feedback to use
    convenience init(
        title: String,
        backgroundColor: UIColor = .systemBlue,
        titleColor: UIColor = .white,
        font: UIFont? = nil,
        cornerRadius: CGFloat = 12,
        feedbackType: HapticFeedbackType = .medium
    ) {
        self.init(frame: .zero)
        
        setTitle(title, for: .normal)
        self.backgroundColor = backgroundColor
        setTitleColor(titleColor, for: .normal)
        if let font = font {
            titleLabel?.font = font
        }
        self.cornerRadiusValue = cornerRadius
        layer.cornerRadius = cornerRadius
        self.feedbackType = feedbackType
        
        setupButton()
    }
    
    // MARK: - Setup
    private func setupButton() {
        translatesAutoresizingMaskIntoConstraints = false
        layer.cornerRadius = cornerRadiusValue
        clipsToBounds = true
        
        // Add touch handling for haptic feedback
        addTarget(self, action: #selector(buttonTouchDown), for: .touchDown)
        addTarget(self, action: #selector(buttonTouchUpInside), for: .touchUpInside)
        addTarget(self, action: #selector(buttonTouchUpOutside), for: .touchUpOutside)
        addTarget(self, action: #selector(buttonTouchCancel), for: .touchCancel)
    }
    
    // MARK: - Public Methods
    
    /// Configure the haptic feedback type
    /// - Parameter type: The type of haptic feedback to use
    func configure(feedbackType type: HapticFeedbackType) {
        feedbackType = type
    }
    
    /// Enable or disable the press animation
    /// - Parameter enabled: Whether the animation should be enabled
    func setPressAnimation(enabled: Bool) {
        shouldAnimate = enabled
    }
    
    // MARK: - Touch Handling
    @objc private func buttonTouchDown() {
        if shouldAnimate {
            animateButtonDown()
        }
    }
    
    @objc private func buttonTouchUpInside() {
        if shouldAnimate {
            animateButtonUp()
        }
        generateHapticFeedback()
    }
    
    @objc private func buttonTouchUpOutside() {
        if shouldAnimate {
            animateButtonUp()
        }
    }
    
    @objc private func buttonTouchCancel() {
        if shouldAnimate {
            animateButtonUp()
        }
    }
    
    // MARK: - Animations
    private func animateButtonDown() {
        UIView.animate(withDuration: 0.1, delay: 0, options: [.allowUserInteraction, .curveEaseIn], animations: {
            self.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
        })
    }
    
    private func animateButtonUp() {
        UIView.animate(withDuration: 0.1, delay: 0, options: [.allowUserInteraction, .curveEaseOut], animations: {
            self.transform = CGAffineTransform.identity
        })
    }
    
    // MARK: - Haptic Feedback
    private func generateHapticFeedback() {
        switch feedbackType {
        case .light:
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.prepare()
            generator.impactOccurred()
            
        case .medium:
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.prepare()
            generator.impactOccurred()
            
        case .heavy:
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.prepare()
            generator.impactOccurred()
            
        case .success:
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.success)
            
        case .warning:
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.warning)
            
        case .error:
            let generator = UINotificationFeedbackGenerator()
            generator.prepare()
            generator.notificationOccurred(.error)
            
        case .selection:
            let generator = UISelectionFeedbackGenerator()
            generator.prepare()
            generator.selectionChanged()
            
        case .none:
            // No haptic feedback
            break
        }
    }
}

// MARK: - Style Extensions
extension HapticButton {
    /// Apply a primary button style (typically used for main actions)
    func applyPrimaryStyle() {
        backgroundColor = APP_TONE_COLOR
        setTitleColor(.white, for: .normal)
        titleLabel?.font = Utils.boldFont(size: 18)
        layer.cornerRadius = 12
    }
    
    /// Apply a secondary button style (typically used for secondary actions)
    func applySecondaryStyle() {
        backgroundColor = .systemGray5
        setTitleColor(APP_TEXT_COLOR, for: .normal)
        titleLabel?.font = Utils.mediumFont(size: 16)
        layer.cornerRadius = 10
    }
    
    /// Apply a destructive button style (typically used for delete actions)
    func applyDestructiveStyle() {
        backgroundColor = .systemRed
        setTitleColor(.white, for: .normal)
        titleLabel?.font = Utils.boldFont(size: 16)
        layer.cornerRadius = 10
    }
    
    /// Apply an outline button style (no background, just border)
    func applyOutlineStyle(color: UIColor = APP_TONE_COLOR) {
        backgroundColor = .clear
        setTitleColor(color, for: .normal)
        titleLabel?.font = Utils.mediumFont(size: 16)
        layer.cornerRadius = 10
        layer.borderWidth = 1
        layer.borderColor = color.cgColor
    }
} 