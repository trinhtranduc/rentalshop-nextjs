import UIKit
import ObjectiveC

/// A class that adds haptic feedback to UITabBar taps
class HapticTabBar {
    
    // MARK: - Properties
    private static var feedbackStyle: UIImpactFeedbackGenerator.FeedbackStyle = .medium
    private static var feedbackGenerator: UIImpactFeedbackGenerator?
    private static var isEnabled = false
    
    // MARK: - Setup
    
    /// Enable haptic feedback for all tab bars in the app
    /// - Parameter style: The haptic feedback style to use
    static func enableHapticFeedback(style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        // Set the feedback style
        feedbackStyle = style
        
        // Create and prepare the feedback generator
        feedbackGenerator = UIImpactFeedbackGenerator(style: feedbackStyle)
        feedbackGenerator?.prepare()
        
        // Only swizzle once
        if !isEnabled {
            // Swizzle the UITabBarController's tabBar(_:didSelect:) method
            swizzleTabBarControllerMethod()
            isEnabled = true
        }
        
        print("Tab bar haptic feedback enabled with \(feedbackStyle) style")
    }
    
    /// Test the haptic feedback directly
    static func testHapticFeedback() {
        print("Testing haptic feedback...")
        generateHapticFeedback()
    }
    
    // MARK: - Method Swizzling
    private static func swizzleTabBarControllerMethod() {
        // Get the UITabBarController class
        let tabBarControllerClass = UITabBarController.self
        
        // Get the original and swizzled method selectors
        let originalSelector = #selector(UITabBarController.tabBar(_:didSelect:))
        let swizzledSelector = #selector(UITabBarController.haptic_tabBar(_:didSelect:))
        
        // Get the original and swizzled methods
        guard let originalMethod = class_getInstanceMethod(tabBarControllerClass, originalSelector),
              let swizzledMethod = class_getInstanceMethod(tabBarControllerClass, swizzledSelector) else {
            print("Failed to get methods for swizzling")
            return
        }
        
        // Add the swizzled method to the class
        let didAddMethod = class_addMethod(
            tabBarControllerClass,
            originalSelector,
            method_getImplementation(swizzledMethod),
            method_getTypeEncoding(swizzledMethod)
        )
        
        // If the method was added, replace the original method
        if didAddMethod {
            class_replaceMethod(
                tabBarControllerClass,
                swizzledSelector,
                method_getImplementation(originalMethod),
                method_getTypeEncoding(originalMethod)
            )
        } else {
            // If the method was not added, exchange the implementations
            method_exchangeImplementations(originalMethod, swizzledMethod)
        }
    }
    
    // MARK: - Haptic Feedback
    
    /// Generate haptic feedback
    static func generateHapticFeedback() {
        print("Generating haptic feedback for tab bar tap")
        feedbackGenerator?.impactOccurred()
        feedbackGenerator?.prepare() // Prepare for next use
    }
}

// MARK: - UITabBarController Extension
extension UITabBarController {
    
    /// Swizzled tabBar(_:didSelect:) method that adds haptic feedback
    @objc func haptic_tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        // Call the original implementation
        haptic_tabBar(tabBar, didSelect: item)
        
        // Generate haptic feedback
        HapticTabBar.generateHapticFeedback()
    }
} 