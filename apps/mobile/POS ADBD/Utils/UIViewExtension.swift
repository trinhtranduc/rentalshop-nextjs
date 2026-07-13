//
//  UIViewExtension.swift
//  MX3Hydration
//
//  Created by HUNGNGUYEN on 11/8/17.
//  Copyright © 2017 MX3 Diagnostics. All rights reserved.
//

import Foundation
import UIKit

extension UIView {
    
    @IBInspectable var cornerRadius: CGFloat {
        get {
            return layer.cornerRadius
        }
        set {
            layer.cornerRadius = newValue
            layer.masksToBounds = newValue > 0
        }
    }
    
    @IBInspectable var borderWidth: CGFloat {
        get {
            return layer.borderWidth
        }
        set {
            layer.borderWidth = newValue
        }
    }
    
    @IBInspectable var borderColor: UIColor? {
        get {
            return UIColor(cgColor: layer.borderColor!)
        }
        set {
            layer.borderColor = newValue?.cgColor
        }
    }
    
    @IBInspectable var shadow: Bool {
        get {
            return layer.shadowOpacity > 0.0
        }
        set {
            if newValue == true {
                self.addShadow()
            }
        }
    }
    func addShadow(shadowColor: CGColor = UIColor.black.cgColor,
                   shadowOffset: CGSize = CGSize(width: 1.5, height: 1.5),
                   shadowOpacity: Float = 0.4,
                   shadowRadius: CGFloat = 3.0) {
        layer.shadowColor = shadowColor
        layer.shadowOffset = shadowOffset
        layer.shadowOpacity = shadowOpacity
        layer.shadowRadius = shadowRadius
        layer.masksToBounds = false
        self.clipsToBounds = false
        self.setNeedsDisplay()
    }
    
    func setX(_ positionX:CGFloat) {
        var frame:CGRect = self.frame
        frame.origin.x = positionX
        self.frame = frame
    }
    
    func setY(_ positionY:CGFloat) {
        var frame:CGRect = self.frame
        frame.origin.y = positionY
        self.frame = frame
    }
    
    func setWidth(_ width:CGFloat) {
        var frame:CGRect = self.frame
        frame.size.width = width
        self.frame = frame
    }
    
    func setHeight(_ height:CGFloat) {
        var frame:CGRect = self.frame
        frame.size.height = height
        self.frame = frame
    }
    
    func circle() {
        layer.cornerRadius = frame.size.height / 2
        layer.masksToBounds = true
    }
    
    internal func getChildViewWithClass (_ typeClass : AnyClass) -> UIView {
        var typeView : UIView! = nil
        self.adjustAllSubviews { (view) in
            if view.isKind(of: typeClass) {
                typeView = view
                return
            }
        }
        
        return typeView
    }
    
    func adjustAllSubviews(withHandler handler: @escaping (_ subview: UIView) -> Void) {
        for subview: UIView in subviews {
            handler(subview)
            subview.adjustAllSubviews(withHandler: handler)
        }
    }
    
    var parentViewController: UIViewController? {
        var parentResponder: UIResponder? = self
        while parentResponder != nil {
            parentResponder = parentResponder!.next
            if let viewController = parentResponder as? UIViewController {
                return viewController
            }
        }
        return nil
    }
    
    public class func fromNib() -> Self {
        return fromNib(nibName: nil)
    }
    
    public class func fromNib(nibName: String?) -> Self {
        func fromNibHelper<T>(nibName: String?) -> T where T : UIView {
            let bundle = Bundle(for: T.self)
            let name = nibName ?? String(describing: T.self)
            return bundle.loadNibNamed(name, owner: nil, options: nil)?.first as? T ?? T()
        }
        return fromNibHelper(nibName: nibName)
    }
    
}

public extension UIView {
    func shake(count : Float? = nil,for duration : TimeInterval? = nil,withTranslation translation : Float? = nil) {
        // You can change these values, so that you won't have to write a long function
        let defaultRepeatCount: Float = 2.0
        let defaultTotalDuration = 0.1
        let defaultTranslation = -18
        
        let animation : CABasicAnimation = CABasicAnimation(keyPath: "transform.translation.x")
        animation.timingFunction = CAMediaTimingFunction(name: kCAMediaTimingFunctionLinear)
        
        animation.repeatCount = count ?? defaultRepeatCount
        animation.duration = (duration ?? defaultTotalDuration)/TimeInterval(animation.repeatCount)
        animation.autoreverses = true
        animation.byValue = translation ?? defaultTranslation
        layer.add(animation, forKey: "shake")
        
    }
}
