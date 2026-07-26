//
//  NSError+RC.swift
//  RippleCrowd
//
//  Created by Trinh Tran on 11/1/16.
//  Copyright © 2016 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
//import FirebaseAnalytics

extension UIAlertController{
    class func errorAlert(parent: UIViewController? , error: Error, handler:((UIAlertAction?) -> Void)? = nil){
        let alert = UIAlertController(title:"Error".localized(), message:error.localizedDescription, preferredStyle: UIAlertControllerStyle.alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default, handler:handler))
        if parent != nil{
            parent!.present(alert, animated: true, completion: nil)
        }else if let rootWindow = appDelegate.window?.rootViewController{
            rootWindow.present(alert, animated: true, completion: nil)
        }
    }
      class func alert(parent: UIViewController? ,title:String, message:String, handler:((UIAlertAction?) -> Void)? = nil){
//          Analytics.logEvent("Error", parameters: ["username" : Account.account()?.userName ?? "","message": message])
       
        let alert = UIAlertController(title:title, message:message, preferredStyle: UIAlertControllerStyle.alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default, handler:handler))
        if parent != nil{
            parent!.present(alert, animated: true, completion: nil)
        }else if let rootWindow = appDelegate.window?.rootViewController{
            rootWindow.present(alert, animated: true, completion: nil)
        }
        
    }
    
    class func alert(parent: UIViewController, title: String, message: String, okTitle: String = "Yes".localized(), cancelTitle: String = "No".localized(), okAction:((UIAlertAction?) -> Void)? , cancelAction: ((UIAlertAction?) -> Void)?){
        
        let attributedStringTitle = NSAttributedString(string: title, attributes: [
            NSAttributedStringKey.font : Utils.font(name: BOLD_FONT, size: 16) ,
            NSAttributedStringKey.foregroundColor : UIColor.black
            ])
        
        let attributedStringMessage = NSAttributedString(string: message, attributes: [
            NSAttributedStringKey.font : Utils.font(name: REGULAR_FONT, size: 15) ,
            NSAttributedStringKey.foregroundColor : UIColor.black
            ])
       
        
        let alert = UIAlertController(title:title, message:message, preferredStyle: .alert)
        alert.view.tintColor = APP_TONE_COLOR
        alert.setValue(attributedStringTitle, forKey: "attributedTitle")
        alert.setValue(attributedStringMessage, forKey: "attributedMessage")

        alert.addAction(UIAlertAction(title: okTitle , style: .default, handler:okAction))

        alert.addAction(UIAlertAction(title: cancelTitle, style: .default, handler:cancelAction))
        
        
        parent.present(alert, animated: true, completion: nil)
    }
    
    class func alertConfirm(parent: UIViewController, title: String, message: String, okAction:((UIAlertAction?) -> Void)? , cancelAction: ((UIAlertAction?) -> Void)?){
        
//        let attributedString = NSAttributedString(string: message, attributes: [
//            NSAttributedStringKey.font : Utils.font(name: REGULAR_FONT, size: 15) ,
//            NSAttributedStringKey.foregroundColor : UIColor.black
//            ])
        
        
        let alert = UIAlertController(title:title, message: message, preferredStyle: .alert)
//        alert.view.tintColor = APP_TONE_COLOR
//        alert.setValue(attributedString, forKey: "attributedTitle")
        
        alert.addAction(UIAlertAction(title: "Yes, correct!".localized(), style: .default, handler:okAction))
        
        alert.addAction(UIAlertAction(title: "No, wait".localized(), style: .destructive, handler:cancelAction))
        
        
        parent.present(alert, animated: true, completion: nil)
    }
    
    
    class func alertWithMessageSuccess(parent: UIViewController? , message:String){
        let alert = UIAlertController(title: "", message:message, preferredStyle: UIAlertControllerStyle.alert)
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default, handler:nil))
        if parent != nil{
            parent!.present(alert, animated: true, completion: nil)
        }else if let rootWindow = appDelegate.window?.rootViewController{
            rootWindow.present(alert, animated: true, completion: nil)
        }
    }
    
    class func alertConfirmWithStyle(parent: UIViewController, title: String, message: String, specialMessage: String, okAction:((UIAlertAction?) -> Void)? , cancelAction: ((UIAlertAction?) -> Void)?){
        
        
        let alertController = UIAlertController(title: nil, message: nil, preferredStyle: .alert)
        alertController.addAction(UIAlertAction(title: "Yes, correct!".localized(), style: .default, handler:okAction))
        
        alertController.addAction(UIAlertAction(title: "No, wait".localized(), style: .destructive, handler:cancelAction))
        
        
        // Create custom title
        let customTitle = NSMutableAttributedString(string: title, attributes: [
            NSAttributedStringKey.font: Utils.boldFont(size: 20),
            ])
        alertController.setValue(customTitle, forKey: "attributedTitle")
        
        // Create custom message
        let customMessage = NSMutableAttributedString(string: "\(message) \n\n", attributes: [
            NSAttributedStringKey.font: Utils.regularFont(size: 15),
            ])
        customMessage.append(NSMutableAttributedString(string: specialMessage, attributes: [
            NSAttributedStringKey.font: Utils.boldFont(size: 20),
            NSAttributedStringKey.foregroundColor: UIColor.red
            ]))
        alertController.setValue(customMessage, forKey: "attributedMessage")
        
        parent.present(alertController, animated: true, completion: nil)
        
    }
    

}
