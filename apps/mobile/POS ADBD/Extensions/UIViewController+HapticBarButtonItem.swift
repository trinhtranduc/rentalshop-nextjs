import UIKit

extension UIViewController {
    
    /// Create a haptic bar button item with a system item
    /// - Parameters:
    ///   - systemItem: The system item to use
    ///   - action: The action to perform when tapped
    ///   - feedbackStyle: The haptic feedback style to use
    /// - Returns: A HapticBarButtonItem
    func createHapticBarButtonItem(systemItem: UIBarButtonItem.SystemItem, action: Selector, feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light) -> HapticBarButtonItem {
        return HapticBarButtonItem(barButtonSystemItem: systemItem, target: self, action: action, feedbackStyle: feedbackStyle)
    }
    
    /// Create a haptic bar button item with a title
    /// - Parameters:
    ///   - title: The title to display
    ///   - style: The button style
    ///   - action: The action to perform when tapped
    ///   - feedbackStyle: The haptic feedback style to use
    /// - Returns: A HapticBarButtonItem
    func createHapticBarButtonItem(title: String, style: UIBarButtonItem.Style = .plain, action: Selector, feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light) -> HapticBarButtonItem {
        return HapticBarButtonItem(title: title, style: style, target: self, action: action, feedbackStyle: feedbackStyle)
    }
    
    /// Create a haptic bar button item with an image
    /// - Parameters:
    ///   - image: The image to display
    ///   - style: The button style
    ///   - action: The action to perform when tapped
    ///   - feedbackStyle: The haptic feedback style to use
    /// - Returns: A HapticBarButtonItem
    func createHapticBarButtonItem(image: UIImage?, style: UIBarButtonItem.Style = .plain, action: Selector, feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .light) -> HapticBarButtonItem {
        return HapticBarButtonItem(image: image, style: style, target: self, action: action, feedbackStyle: feedbackStyle)
    }
    
    /// Add a haptic back button to the navigation bar
    /// - Parameter title: The title for the back button (optional)
    func addHapticBackButton(title: String? = nil) {
        let backImage = UIImage(systemName: "chevron.left")
        let backItem = createHapticBarButtonItem(image: backImage, action: #selector(hapticBackButtonTapped))
        navigationItem.leftBarButtonItem = backItem
        
        if let title = title {
            backItem.title = title
        }
    }
    
    /// Action for the haptic back button
    @objc private func hapticBackButtonTapped() {
        navigationController?.popViewController(animated: true)
    }
} 