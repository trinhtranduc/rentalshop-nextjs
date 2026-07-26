import UIKit

/// A custom UITabBarController that provides haptic feedback when tab bar items are tapped
class HapticTabBarController: UITabBarController {
    
    // MARK: - Properties
    private var feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light
    private var feedbackGenerator: UIImpactFeedbackGenerator?
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupHapticFeedback()
    }
    
    // MARK: - Setup
    private func setupHapticFeedback() {
        // Create and prepare the feedback generator
        feedbackGenerator = UIImpactFeedbackGenerator(style: feedbackStyle)
        feedbackGenerator?.prepare()
        
        // Set the delegate to self to intercept tab bar selections
        delegate = self
    }
    
    // MARK: - Haptic Feedback
    private func generateHapticFeedback() {
        print("Generating haptic feedback for tab bar item")
        feedbackGenerator?.impactOccurred()
        feedbackGenerator?.prepare() // Prepare for next use
    }
    
    // MARK: - Public Methods
    
    /// Configure the haptic feedback style
    /// - Parameter style: The UIImpactFeedbackGenerator.FeedbackStyle to use
    func configure(feedbackStyle style: UIImpactFeedbackGenerator.FeedbackStyle) {
        feedbackStyle = style
        feedbackGenerator = UIImpactFeedbackGenerator(style: style)
        feedbackGenerator?.prepare()
    }
}

// MARK: - UITabBarControllerDelegate
extension HapticTabBarController: UITabBarControllerDelegate {
    func tabBarController(_ tabBarController: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        // Generate haptic feedback when a tab is selected
        if viewController != tabBarController.selectedViewController {
            generateHapticFeedback()
        }
        return true
    }
} 