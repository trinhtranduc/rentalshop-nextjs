import UIKit

/// A utility class for generating haptic feedback throughout the app
class HapticFeedback {
    
    // MARK: - Haptic Feedback Types
    
    /// Generate a light impact feedback
    static func light() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.prepare()
        generator.impactOccurred()
    }
    
    /// Generate a medium impact feedback
    static func medium() {
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.prepare()
        generator.impactOccurred()
    }
    
    /// Generate a heavy impact feedback
    static func heavy() {
        let generator = UIImpactFeedbackGenerator(style: .heavy)
        generator.prepare()
        generator.impactOccurred()
    }
    
    /// Generate a selection feedback
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.prepare()
        generator.selectionChanged()
    }
    
    /// Generate a success notification feedback
    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.success)
    }
    
    /// Generate an error notification feedback
    static func error() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.error)
    }
    
    /// Generate a warning notification feedback
    static func warning() {
        let generator = UINotificationFeedbackGenerator()
        generator.prepare()
        generator.notificationOccurred(.warning)
    }
    
    /// Generate the appropriate feedback for a button press
    /// - Parameter isImportant: Whether the button action is important (uses medium instead of light)
    static func buttonTap(isImportant: Bool = false) {
        isImportant ? medium() : light()
    }
} 