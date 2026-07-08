import UIKit

class RCTextFieldPadding: UITextField {
    // Property to disable padding (for card style forms)
    var disablePadding: Bool = false {
        didSet {
            setNeedsLayout()
        }
    }
    
    private var padding: UIEdgeInsets {
        if disablePadding {
            return .zero // No padding when disabled
        }
        let leftPadding = leftIconView != nil ? 50 : 16 // Use 16 if no left icon
        return UIEdgeInsets(top: 0, left: CGFloat(leftPadding), bottom: 0, right: 40)
    }
    
    private let iconPadding: CGFloat = 12
    private var leftIconView: UIImageView?
    private var rightIconButton: UIButton?
    private var rightIconAction: Selector?
    private var rightIconTarget: Any?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupField()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupField()
    }
    
    private func setupField() {
        backgroundColor = .backgroundCard
        layer.cornerRadius = 12
        layer.borderWidth = 1
        layer.borderColor = UIColor.borderColor.cgColor
        font = Utils.regularFont(size: 16)
        tintColor = .brandPrimary
        
        heightAnchor.constraint(equalToConstant: 50).isActive = true
    }
    
    func setLeftIcon(_ image: UIImage?) {
        if let image = image {
            leftIconView = UIImageView(image: image)
            leftIconView?.tintColor = .textTertiary
            leftIconView?.contentMode = .scaleAspectFit
            
            let iconSize: CGFloat = 20
            let containerView = UIView(frame: CGRect(x: 0, y: 0, width: iconSize + (iconPadding * 2), height: iconSize))
            leftIconView?.frame = CGRect(x: iconPadding, y: 0, width: iconSize, height: iconSize)
            containerView.addSubview(leftIconView!)
            
            leftView = containerView
            leftViewMode = .always
        }
    }
    
    func setRightIcon(_ image: UIImage?, action: Selector? = nil, target: Any? = nil) {
        if let image = image {
            rightIconAction = action
            rightIconTarget = target
            
            // Create container view with fixed size
            let containerSize: CGFloat = 40
            let iconSize: CGFloat = 20
            let iconContainerView = UIView(frame: CGRect(x: 0, y: 0, width: containerSize, height: containerSize))
            
            // Create and configure icon view
            let iconView = UIImageView(frame: CGRect(x: (containerSize - iconSize)/2,
                                                   y: (containerSize - iconSize)/2,
                                                   width: iconSize,
                                                   height: iconSize))
            iconView.image = image
            iconView.tintColor = .textTertiary
            iconView.contentMode = .scaleAspectFit // Ensure proper scaling
            
            iconContainerView.addSubview(iconView)
            
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
        }
    }
    
    @objc private func rightIconTapped() {
        if let action = rightIconAction, let target = rightIconTarget {
            _ = (target as AnyObject).perform(action)
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
