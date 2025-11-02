# iOS Login Page Animations - Swift UIKit Implementation Guide

## 📱 Login Form Animations Documentation

Đây là tài liệu chi tiết mô tả tất cả các animation trong Login Page để implement trên Swift UIKit.

---

## 🎨 Background & Layout

### 1. Main Container
```
- View: Full screen container
- Background: Gradient từ blue-50 → white → indigo-50
- Fill mode: Fill to screen edges
- Layer: CAGradientLayer
```

**Swift Implementation:**
```swift
let gradientLayer = CAGradientLayer()
gradientLayer.colors = [
    UIColor(hex: "EFF6FF").cgColor, // blue-50
    UIColor.white.cgColor,
    UIColor(hex: "EEF2FF").cgColor  // indigo-50
]
gradientLayer.locations = [0.0, 0.5, 1.0]
gradientLayer.startPoint = CGPoint(x: 0, y: 0)
gradientLayer.endPoint = CGPoint(x: 1, y: 1)
gradientLayer.frame = view.bounds
view.layer.insertSublayer(gradientLayer, at: 0)
```

---

### 2. Background Grid Pattern
```
- Pattern: Dotted grid background
- Dot color: #c7d2fe (indigo-300)
- Dot size: 1.5px
- Grid spacing: 50x50px
- Opacity: 0.4
- Position: Absolute, full screen
```

**Swift Implementation:**
```swift
// Create CAShapeLayer for grid pattern
func createGridPattern() -> CALayer {
    let patternLayer = CALayer()
    
    UIGraphicsBeginImageContextWithOptions(
        CGSize(width: 50, height: 50), 
        false, 
        0
    )
    defer { UIGraphicsEndImageContext() }
    
    guard let ctx = UIGraphicsGetCurrentContext() else { 
        return CALayer() 
    }
    
    // Draw dots at grid points
    ctx.setFillColor(UIColor(hex: "C7D2FE").withAlphaComponent(0.4).cgColor)
    let rect = CGRect(x: 0, y: 0, width: 1.5, height: 1.5)
    ctx.fillEllipse(in: rect)
    
    if let image = UIGraphicsGetImageFromCurrentImageContext() {
        patternLayer.contents = image.cgImage
        patternLayer.backgroundColor = UIColor(patternImage: image).cgColor
    }
    
    return patternLayer
}
```

---

## ✨ Floating Elements (4 Blurred Circles)

### Element 1: Blue Circle
```
- Size: 128x128px (w-32 h-32)
- Color: blue-400 (#60A5FA)
- Position: top-20 left-10 (top: 5rem, left: 2.5rem)
- Opacity: 0.3
- Blur: blur-2xl (heavy blur)
- Animation: float-1 + pulse-glow
```

### Element 2: Indigo Circle
```
- Size: 96x96px (w-24 h-24)
- Color: indigo-400 (#818CF8)
- Position: top-40 right-20 (top: 10rem, right: 5rem)
- Opacity: 0.4
- Blur: blur-2xl
- Animation: float-2 + pulse-glow
```

### Element 3: Purple Circle
```
- Size: 80x80px (w-20 h-20)
- Color: purple-400 (#A78BFA)
- Position: bottom-32 left-20 (bottom: 8rem, left: 5rem)
- Opacity: 0.35
- Blur: blur-2xl
- Animation: float-3 + pulse-glow
```

### Element 4: Blue Dark Circle
```
- Size: 144x144px (w-36 h-36)
- Color: blue-500 (#3B82F6)
- Position: bottom-20 right-32 (bottom: 5rem, right: 8rem)
- Opacity: 0.3
- Blur: blur-2xl
- Animation: float-4 + pulse-glow
```

---

## 🎭 Animation Definitions

### Animation 1: `float` (for elements 1, 2, 3)
```
Duration: 8s, 10s, 12s respectively
Timing: ease-in-out
Repeat: infinite
Delay: 0s, 1s, 2s respectively

Keyframes:
0%:   translateY(0px)  translateX(0px)
25%:  translateY(-20px) translateX(10px)
50%:  translateY(-10px) translateX(-10px)
75%:  translateY(-15px) translateX(5px)
100%: translateY(0px)   translateX(0px)
```

**Swift Implementation:**
```swift
func createFloatAnimation(duration: TimeInterval, delay: TimeInterval) -> CAAnimationGroup {
    let group = CAAnimationGroup()
    group.duration = duration
    group.beginTime = CACurrentMediaTime() + delay
    group.repeatCount = .infinity
    group.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    
    // Y-axis translation
    let translateY = CAKeyframeAnimation(keyPath: "position.y")
    translateY.values = [0, -20, -10, -15, 0]
    translateY.keyTimes = [0, 0.25, 0.5, 0.75, 1.0]
    
    // X-axis translation
    let translateX = CAKeyframeAnimation(keyPath: "position.x")
    translateX.values = [0, 10, -10, 5, 0]
    translateX.keyTimes = [0, 0.25, 0.5, 0.75, 1.0]
    
    group.animations = [translateY, translateX]
    
    return group
}
```

---

### Animation 2: `float-slow` (for element 4)
```
Duration: 15s
Timing: ease-in-out
Repeat: infinite
Delay: 0.5s

Keyframes:
0%:   translateY(0px)   translateX(0px)   scale(1)
50%:  translateY(-30px) translateX(-20px) scale(1.1)
100%: translateY(0px)   translateX(0px)   scale(1)
```

**Swift Implementation:**
```swift
func createFloatSlowAnimation() -> CAAnimationGroup {
    let group = CAAnimationGroup()
    group.duration = 15
    group.beginTime = CACurrentMediaTime() + 0.5
    group.repeatCount = .infinity
    group.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    
    // Y-axis translation
    let translateY = CAKeyframeAnimation(keyPath: "position.y")
    translateY.values = [0, -30, 0]
    translateY.keyTimes = [0, 0.5, 1.0]
    
    // X-axis translation
    let translateX = CAKeyframeAnimation(keyPath: "position.x")
    translateX.values = [0, -20, 0]
    translateX.keyTimes = [0, 0.5, 1.0]
    
    // Scale
    let scale = CAKeyframeAnimation(keyPath: "transform.scale")
    scale.values = [1.0, 1.1, 1.0]
    scale.keyTimes = [0, 0.5, 1.0]
    
    group.animations = [translateY, translateX, scale]
    
    return group
}
```

---

### Animation 3: `pulse-glow`
```
Duration: 3s
Timing: ease-in-out
Repeat: infinite
Delay: 0s

Keyframes:
0%, 100%: opacity(0.3)
50%: opacity(0.5)
```

**Swift Implementation:**
```swift
func createPulseGlowAnimation() -> CABasicAnimation {
    let animation = CABasicAnimation(keyPath: "opacity")
    animation.fromValue = 0.3
    animation.toValue = 0.5
    animation.duration = 3.0
    animation.repeatCount = .infinity
    animation.autoreverses = true
    animation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    
    return animation
}
```

---

## 🌊 Decorative Gradient Circles

### Gradient Circle 1 (Top Right)
```
- Size: 500x500px
- Colors: blue-200 → transparent
- Position: top-0 right-0
- Opacity: 0.4
- Blur: blur-3xl (maximum blur)
- Animation: rotate-move
- Duration: 30s
- Timing: ease-in-out
- Repeat: infinite
- Transform origin: center
```

### Gradient Circle 2 (Bottom Left)
```
- Size: 400x400px
- Colors: indigo-200 → transparent
- Position: bottom-0 left-0
- Opacity: 0.35
- Blur: blur-3xl
- Animation: rotate-move (reverse)
- Duration: 25s
- Timing: ease-in-out
- Repeat: infinite
- Transform origin: center
```

---

### Animation 4: `rotate-move`
```
Duration: 30s (for circle 1), 25s (for circle 2)
Timing: ease-in-out
Repeat: infinite
Direction: normal (circle 1), reverse (circle 2)

Keyframes:
0%:   rotate(0deg)   translate(-50%, -50%)
25%:  rotate(90deg)  translate(-30%, -70%)
50%:  rotate(180deg) translate(-50%, -50%)
75%:  rotate(270deg) translate(-70%, -30%)
100%: rotate(360deg) translate(-50%, -50%)
```

**Swift Implementation:**
```swift
func createRotateMoveAnimation(duration: TimeInterval, isReverse: Bool = false) -> CAAnimationGroup {
    let group = CAAnimationGroup()
    group.duration = duration
    group.repeatCount = .infinity
    group.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    
    if isReverse {
        group.speed = -1.0
    }
    
    // Rotation
    let rotate = CAKeyframeAnimation(keyPath: "transform.rotation.z")
    rotate.values = [0, .pi/2, .pi, .pi * 3/2, .pi * 2]
    rotate.keyTimes = [0, 0.25, 0.5, 0.75, 1.0]
    
    // Translation X
    let translateX = CAKeyframeAnimation(keyPath: "position.x")
    translateX.values = [-50, -30, -50, -70, -50] // percentages
    translateX.keyTimes = [0, 0.25, 0.5, 0.75, 1.0]
    
    // Translation Y
    let translateY = CAKeyframeAnimation(keyPath: "position.y")
    translateY.values = [-50, -70, -50, -30, -50] // percentages
    translateY.keyTimes = [0, 0.25, 0.5, 0.75, 1.0]
    
    group.animations = [rotate, translateX, translateY]
    
    return group
}

// Note: For percentage-based translations, calculate actual positions
// relative to view bounds before applying animation
```

---

## 🎯 Login Card

### Card Container
```
- Background: white with 80% opacity + backdrop blur
- Border: none (border-0)
- Shadow: 2xl (large shadow)
- Border radius: rounded
- Position: Center, max-width 28rem (448px)
- Z-index: relative z-10
```

**Swift Implementation:**
```swift
// Card setup
cardContainer.backgroundColor = .white.withAlphaComponent(0.8)
cardContainer.layer.cornerRadius = 12
cardContainer.layer.shadowColor = UIColor.black.cgColor
cardContainer.layer.shadowOpacity = 0.25
cardContainer.layer.shadowRadius = 24
cardContainer.layer.shadowOffset = CGSize(width: 0, height: 8)

// Backdrop blur effect
let blurEffect = UIBlurEffect(style: .systemThinMaterialLight)
let blurView = UIVisualEffectView(effect: blurEffect)
blurView.frame = cardContainer.bounds
blurView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
cardContainer.insertSubview(blurView, at: 0)
```

---

## 🔄 Loading Animation (Submit Button)

### Loading Indicator
```
- Type: Spinning circle
- Size: 20x20px (h-5 w-5)
- Color: white
- Style: border-b-2 (bottom border only)
- Animation: animate-spin
- Duration: 1s
- Repeat: infinite
- Timing: linear
```

**Swift Implementation:**
```swift
// Loading spinner
let spinner = UIActivityIndicatorView(style: .medium)
spinner.color = .white
spinner.hidesWhenStopped = true
spinner.startAnimating()

// Add to button
loginButton.addSubview(spinner)
spinner.translatesAutoresizingMaskIntoConstraints = false
NSLayoutConstraint.activate([
    spinner.centerXAnchor.constraint(equalTo: loginButton.centerXAnchor),
    spinner.centerYAnchor.constraint(equalTo: loginButton.centerYAnchor)
])
```

**OR using CAShapeLayer for custom spinner:**
```swift
func createCustomSpinner() -> CALayer {
    let spinnerLayer = CAShapeLayer()
    
    // Circle path
    let path = UIBezierPath(
        arcCenter: CGPoint(x: 10, y: 10),
        radius: 9,
        startAngle: -(.pi / 2),
        endAngle: .pi * 1.5,
        clockwise: true
    )
    
    spinnerLayer.path = path.cgPath
    spinnerLayer.strokeColor = UIColor.white.cgColor
    spinnerLayer.fillColor = UIColor.clear.cgColor
    spinnerLayer.lineWidth = 2
    spinnerLayer.strokeEnd = 0.25 // Show 25% of circle (bottom quarter)
    
    // Rotation animation
    let rotation = CABasicAnimation(keyPath: "transform.rotation.z")
    rotation.fromValue = 0
    rotation.toValue = .pi * 2
    rotation.duration = 1.0
    rotation.repeatCount = .infinity
    
    spinnerLayer.add(rotation, forKey: "rotation")
    
    return spinnerLayer
}
```

---

## 📝 Complete Implementation Structure

```swift
import UIKit

class LoginViewController: UIViewController {
    
    // MARK: - UI Components
    private var gradientLayer: CAGradientLayer!
    private var gridPatternLayer: CALayer!
    
    // Floating elements (4 circles)
    private var floatingCircle1: CALayer!
    private var floatingCircle2: CALayer!
    private var floatingCircle3: CALayer!
    private var floatingCircle4: CALayer!
    
    // Gradient circles (2 decorative shapes)
    private var decorativeCircle1: CALayer!
    private var decorativeCircle2: CALayer!
    
    // Card
    private var cardContainer: UIView!
    private var blurEffectView: UIVisualEffectView!
    
    // Login form elements
    private var logoImageView: UIImageView!
    private var emailTextField: UITextField!
    private var passwordTextField: UITextField!
    private var loginButton: UIButton!
    private var loadingSpinner: CALayer!
    
    // MARK: - View Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupBackground()
        setupFloatingElements()
        setupDecorativeElements()
        setupCard()
        setupLoginForm()
        startAllAnimations()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        updateLayerFrames()
    }
    
    // MARK: - Setup Methods
    
    private func setupBackground() {
        // Gradient layer
        gradientLayer = CAGradientLayer()
        gradientLayer.colors = [
            UIColor(hex: "EFF6FF").cgColor, // blue-50
            UIColor.white.cgColor,
            UIColor(hex: "EEF2FF").cgColor  // indigo-50
        ]
        gradientLayer.locations = [0.0, 0.5, 1.0]
        gradientLayer.startPoint = CGPoint(x: 0, y: 0)
        gradientLayer.endPoint = CGPoint(x: 1, y: 1)
        view.layer.insertSublayer(gradientLayer, at: 0)
        
        // Grid pattern
        gridPatternLayer = createGridPattern()
        view.layer.insertSublayer(gridPatternLayer, at: 1)
    }
    
    private func setupFloatingElements() {
        // Circle 1: Blue, top-left
        floatingCircle1 = createFloatingCircle(
            size: 128,
            color: UIColor(hex: "60A5FA"),
            opacity: 0.3
        )
        view.layer.addSublayer(floatingCircle1)
        
        // Circle 2: Indigo, top-right
        floatingCircle2 = createFloatingCircle(
            size: 96,
            color: UIColor(hex: "818CF8"),
            opacity: 0.4
        )
        view.layer.addSublayer(floatingCircle2)
        
        // Circle 3: Purple, bottom-left
        floatingCircle3 = createFloatingCircle(
            size: 80,
            color: UIColor(hex: "A78BFA"),
            opacity: 0.35
        )
        view.layer.addSublayer(floatingCircle3)
        
        // Circle 4: Dark Blue, bottom-right
        floatingCircle4 = createFloatingCircle(
            size: 144,
            color: UIColor(hex: "3B82F6"),
            opacity: 0.3
        )
        view.layer.addSublayer(floatingCircle4)
    }
    
    private func setupDecorativeElements() {
        // Gradient circle 1: Top-right
        decorativeCircle1 = createDecorativeCircle(
            size: 500,
            colors: [UIColor(hex: "BFDBFE"), UIColor.clear],
            opacity: 0.4
        )
        view.layer.addSublayer(decorativeCircle1)
        
        // Gradient circle 2: Bottom-left
        decorativeCircle2 = createDecorativeCircle(
            size: 400,
            colors: [UIColor(hex: "C7D2FE"), UIColor.clear],
            opacity: 0.35
        )
        view.layer.addSublayer(decorativeCircle2)
    }
    
    private func setupCard() {
        cardContainer = UIView()
        cardContainer.backgroundColor = .white.withAlphaComponent(0.8)
        cardContainer.layer.cornerRadius = 12
        cardContainer.layer.shadowColor = UIColor.black.cgColor
        cardContainer.layer.shadowOpacity = 0.25
        cardContainer.layer.shadowRadius = 24
        cardContainer.layer.shadowOffset = CGSize(width: 0, height: 8)
        
        // Backdrop blur
        let blurEffect = UIBlurEffect(style: .systemThinMaterialLight)
        blurEffectView = UIVisualEffectView(effect: blurEffect)
        cardContainer.addSubview(blurEffectView)
        
        view.addSubview(cardContainer)
    }
    
    private func setupLoginForm() {
        // Logo, text fields, button setup
        // ... (detailed implementation)
    }
    
    // MARK: - Helper Methods
    
    private func createFloatingCircle(size: CGFloat, color: UIColor, opacity: Float) -> CALayer {
        let circle = CALayer()
        circle.frame = CGRect(x: 0, y: 0, width: size, height: size)
        circle.cornerRadius = size / 2
        circle.backgroundColor = color.cgColor
        circle.opacity = opacity
        
        // Apply blur effect using CIFilter
        circle.shouldRasterize = true
        circle.rasterizationScale = UIScreen.main.scale
        
        return circle
    }
    
    private func createDecorativeCircle(size: CGFloat, colors: [UIColor], opacity: Float) -> CAGradientLayer {
        let gradient = CAGradientLayer()
        gradient.frame = CGRect(x: 0, y: 0, width: size, height: size)
        gradient.cornerRadius = size / 2
        gradient.colors = colors.map { $0.cgColor }
        gradient.startPoint = CGPoint(x: 0, y: 0)
        gradient.endPoint = CGPoint(x: 1, y: 1)
        gradient.opacity = opacity
        
        // Apply blur
        gradient.shouldRasterize = true
        gradient.rasterizationScale = UIScreen.main.scale
        
        return gradient
    }
    
    private func createGridPattern() -> CALayer {
        // Implementation as shown above
        // ...
        return CALayer()
    }
    
    private func updateLayerFrames() {
        gradientLayer?.frame = view.bounds
        gridPatternLayer?.frame = view.bounds
        
        // Update floating circle positions
        let bounds = view.bounds
        floatingCircle1?.frame = CGRect(
            x: 40, y: 80,
            width: 128, height: 128
        )
        floatingCircle2?.frame = CGRect(
            x: bounds.width - 120, y: 160,
            width: 96, height: 96
        )
        floatingCircle3?.frame = CGRect(
            x: 80, y: bounds.height - 200,
            width: 80, height: 80
        )
        floatingCircle4?.frame = CGRect(
            x: bounds.width - 180, y: bounds.height - 120,
            width: 144, height: 144
        )
        
        // Update decorative circles
        decorativeCircle1?.frame = CGRect(
            x: bounds.width - 500, y: -100,
            width: 500, height: 500
        )
        decorativeCircle2?.frame = CGRect(
            x: -100, y: bounds.height - 300,
            width: 400, height: 400
        )
        
        // Update card position
        cardContainer?.center = view.center
        blurEffectView?.frame = cardContainer.bounds
    }
    
    // MARK: - Animation Methods
    
    private func startAllAnimations() {
        // Floating circles
        floatingCircle1.add(createFloatAnimation(duration: 8, delay: 0) + createPulseGlowAnimation(), forKey: nil)
        floatingCircle2.add(createFloatAnimation(duration: 10, delay: 1) + createPulseGlowAnimation(), forKey: nil)
        floatingCircle3.add(createFloatAnimation(duration: 12, delay: 2) + createPulseGlowAnimation(), forKey: nil)
        floatingCircle4.add(createFloatSlowAnimation() + createPulseGlowAnimation(), forKey: nil)
        
        // Decorative circles
        decorativeCircle1.add(createRotateMoveAnimation(duration: 30, isReverse: false), forKey: nil)
        decorativeCircle2.add(createRotateMoveAnimation(duration: 25, isReverse: true), forKey: nil)
    }
    
    // Animation helper functions as shown above
    private func createFloatAnimation(duration: TimeInterval, delay: TimeInterval) -> CAAnimationGroup { ... }
    private func createFloatSlowAnimation() -> CAAnimationGroup { ... }
    private func createPulseGlowAnimation() -> CABasicAnimation { ... }
    private func createRotateMoveAnimation(duration: TimeInterval, isReverse: Bool) -> CAAnimationGroup { ... }
}

// MARK: - UIColor Extension

extension UIColor {
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            red: CGFloat(r) / 255,
            green: CGFloat(g) / 255,
            blue: CGFloat(b) / 255,
            alpha: CGFloat(a) / 255
        )
    }
}
```

---

## 🎨 Color Palette

```swift
extension UIColor {
    static let loginBlue50 = UIColor(hex: "EFF6FF")
    static let loginBlue100 = UIColor(hex: "DBEAFE")
    static let loginBlue200 = UIColor(hex: "BFDBFE")
    static let loginBlue400 = UIColor(hex: "60A5FA")
    static let loginBlue500 = UIColor(hex: "3B82F6")
    static let loginBlue700 = UIColor(hex: "1D4ED8")
    static let loginIndigo50 = UIColor(hex: "EEF2FF")
    static let loginIndigo200 = UIColor(hex: "C7D2FE")
    static let loginIndigo300 = UIColor(hex: "A5B4FC")
    static let loginIndigo400 = UIColor(hex: "818CF8")
    static let loginPurple400 = UIColor(hex: "A78BFA")
}
```

---

## 📊 Performance Optimization

### 1. Rasterization
```swift
// For layers with blur and effects
layer.shouldRasterize = true
layer.rasterizationScale = UIScreen.main.scale
```

### 2. Separate Animation Layer
```swift
// Create separate layers for animations
// Keep original layers for static content
```

### 3. GPU Acceleration
```swift
// Use CALayer properties that are GPU-accelerated:
// - transform
// - opacity
// - position
// - bounds
// Avoid: shadowPath changes, complex masks
```

---

## ✅ Checklist

- [ ] Gradient background setup
- [ ] Grid pattern layer
- [ ] 4 floating circles (different sizes, colors, positions)
- [ ] 2 decorative gradient circles
- [ ] Float animations (3 variations)
- [ ] Float-slow animation
- [ ] Pulse-glow animation
- [ ] Rotate-move animation (normal + reverse)
- [ ] Card with blur effect
- [ ] Loading spinner animation
- [ ] All colors match design
- [ ] All timing and durations match
- [ ] Performance optimized
- [ ] Animations start on viewDidLoad

---

**Last Updated**: January 2025  
**Platform**: iOS / Swift UIKit  
**Design Reference**: packages/ui/src/components/forms/LoginForm.tsx

