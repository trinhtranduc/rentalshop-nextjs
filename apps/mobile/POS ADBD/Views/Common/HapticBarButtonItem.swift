import UIKit

/// A custom UIBarButtonItem that provides haptic feedback when tapped
class HapticBarButtonItem: UIBarButtonItem {
    
    // MARK: - Properties
    private var feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light
    private var originalAction: Selector?
    private var originalTarget: AnyObject?
    
    // MARK: - Initializers
    override init() {
        super.init()
        setupHapticFeedback()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupHapticFeedback()
    }
    
    /// Initialize with a title and action
    convenience init(title: String?, style: UIBarButtonItem.Style, target: Any?, action: Selector?, feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        self.init(title: title, style: style, target: nil, action: nil)
        self.feedbackStyle = feedbackStyle
        setupWithOriginalAction(target: target, action: action)
    }
    
    /// Initialize with an image and action
    convenience init(image: UIImage?, style: UIBarButtonItem.Style, target: Any?, action: Selector?, feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        self.init(image: image, style: style, target: nil, action: nil)
        self.feedbackStyle = feedbackStyle
        setupWithOriginalAction(target: target, action: action)
    }
    
    /// Initialize with a system item and action
    convenience init(barButtonSystemItem systemItem: UIBarButtonItem.SystemItem, target: Any?, action: Selector?, feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light) {
        self.init(barButtonSystemItem: systemItem, target: nil, action: nil)
        self.feedbackStyle = feedbackStyle
        setupWithOriginalAction(target: target, action: action)
    }
    
    // MARK: - Setup
    private func setupHapticFeedback() {
        // Store original target and action if they exist
        if let action = self.action, let target = self.target {
            setupWithOriginalAction(target: target, action: action)
        }
    }
    
    private func setupWithOriginalAction(target: Any?, action: Selector?) {
        // Store original target and action
        if let action = action {
            originalAction = action
            originalTarget = target as? AnyObject
            
            // Set our own target and action
            self.target = self
            self.action = #selector(hapticButtonTapped)
        }
    }
    
    // MARK: - Actions
    @objc private func hapticButtonTapped() {
        // Generate haptic feedback
        let generator = UIImpactFeedbackGenerator(style: feedbackStyle)
        generator.prepare()
        generator.impactOccurred()
        
        // Call the original action
        if let originalAction = originalAction, let originalTarget = originalTarget {
            _ = originalTarget.perform(originalAction, with: self)
        }
    }
    
    // MARK: - Public Methods
    
    /// Configure the haptic feedback style
    /// - Parameter style: The UIImpactFeedbackGenerator.FeedbackStyle to use
    func configure(feedbackStyle style: UIImpactFeedbackGenerator.FeedbackStyle) {
        feedbackStyle = style
    }
} 