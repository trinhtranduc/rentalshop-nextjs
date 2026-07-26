import UIKit

/// A UITabBarControllerDelegate that adds haptic feedback when tab bar items are tapped
class HapticTabBarDelegate: NSObject, UITabBarControllerDelegate {
    
    // MARK: - Properties
    private var feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle
    private var feedbackGenerator: UIImpactFeedbackGenerator
    
    // MARK: - Initializers
    
    /// Initialize with a specific feedback style
    /// - Parameter style: The haptic feedback style to use
    init(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        self.feedbackStyle = style
        self.feedbackGenerator = UIImpactFeedbackGenerator(style: style)
        super.init()
        
        // Prepare the feedback generator
        feedbackGenerator.prepare()
    }
    
    // MARK: - UITabBarControllerDelegate
    
    func tabBarController(_ tabBarController: UITabBarController, shouldSelect viewController: UIViewController) -> Bool {
        // Only generate feedback if selecting a different tab
        if viewController != tabBarController.selectedViewController {
            generateHapticFeedback()
        }
        
        // Allow the selection
        return true
    }
    
    // func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
    //     // When switching to home tab (index 0), reload cart in InfoMainViewController on iPad
    //     if let navigationController = viewController as? UINavigationController,
    //        let mainVC = navigationController.viewControllers.first as? MainViewController,
    //        tabBarController.selectedIndex == 0,
    //        UIDevice.current.userInterfaceIdiom == .pad {
    //         // Reload cart when switching to home tab on iPad
    //         DispatchQueue.main.async {
    //             mainVC.infoViewController?.reloadOrder()
    //         }
    //     }
    // }
    
    // MARK: - Haptic Feedback
    
    /// Generate haptic feedback
    private func generateHapticFeedback() {
        print("Generating haptic feedback for tab bar tap (delegate)")
        feedbackGenerator.impactOccurred()
        feedbackGenerator.prepare() // Prepare for next use
    }
    
    // MARK: - Public Methods
    
    /// Apply this delegate to a UITabBarController
    /// - Parameter tabBarController: The UITabBarController to apply the delegate to
    func applyTo(tabBarController: UITabBarController) {
        tabBarController.delegate = self
        print("Haptic tab bar delegate applied with \(feedbackStyle) style")
    }
} 