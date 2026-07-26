//
//  Product.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/5/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import FirebaseFirestore

enum Brand : String{
    case bd, gv, td
}
enum Category : String {
    case adtt, adct, adcd, adn, adbx, adc, mq, pk
}

class Product : Comparable{
     var code: String?
     var document_id: String?
     var name: String?
     var quatity: Int = 0
     var rent: Double = 0
     var sale: Double = 0
     var selected_price: Double = 0
     var selected_quatity : Int = 0
     var image_name: String?
     var image: UIImage?
     var image_url: String?
     var brand : Brand = .bd
     var category : Category  = .adtt
     var note: String?
    func total() -> Double{
        return (self.selected_price * Double(self.selected_quatity))
    }
    func productValid() -> Bool{
        if selected_price == 0{
            return false
        }
        if selected_quatity == 0{
            return false
        }
        return true
        
    }
    
    func toDictionary() -> [String: Any]{
        var dictionary : [String :Any] = [:]
        
        if let code = self.code{
            dictionary["code"] = code
        }
        if let name = self.name{
            dictionary["name"] = name
        }
        if let image_name = self.image_name{
            dictionary["image_name"] = image_name
        }
        dictionary["quatity"] = self.quatity
        dictionary["quatity"] = self.quatity
        dictionary["rent"] = self.rent
        dictionary["sale"] = self.sale
        dictionary["brand"] = self.brand.rawValue
        dictionary["category"] = self.category.rawValue
        
        dictionary["selected_price"] = self.selected_price
        dictionary["selected_quatity"] = self.selected_quatity
        dictionary["note"] = self.note
        
        return dictionary
    }
    class func object(with dictionary: [String : Any]) -> Product?{
        
        let product = Product()
        product.document_id = dictionary["document_id"] as? String
        product.code = dictionary["code"] as? String
        product.name = dictionary["name"] as? String
        product.image_name = dictionary["image_name"] as? String
        product.note = dictionary["note"] as? String
        
        if let value = dictionary["brand"] as? String, let brand = Brand(rawValue: value){
            product.brand = brand
        }
        if let value = dictionary["category"] as? String, let category = Category(rawValue: value){
            product.category = category
        }
        
        
        if let quatity = dictionary["quatity"] as? Int{
            product.quatity = quatity
        }else{
            product.quatity  = 0
        }
        
        if let rent = dictionary["rent"] as? Double{
            product.rent = rent
        }else{
            product.rent  = Double(0)
        }
        if let sale = dictionary["sale"] as? Double{
            product.sale = sale
        }else{
            product.sale  = Double(0)
        }
        
        if let selected_price =  dictionary["selected_price"] as? Double {
            product.selected_price = selected_price
        }else{
            product.selected_price = Double(0)
        }
        if let selected_quatity =  dictionary["selected_quatity"] as? Int {
            product.selected_quatity = selected_quatity
        }else{
            product.selected_quatity = Int(0)
        }
        return product
    }
    
    
    class func filter(text: String, products: [Product]) -> ([Product], [String]){
        var result = products
        var words : [String] = []
        for word in text.lowercased().components(separatedBy: " "){
            if word.count != 0{
                result = Product.filter(word: word, products: result)
                words.append(word)
            }
            
        }
        return (result,words)
    }
    
    class func filter(word: String, products: [Product]) -> [Product]{
        return products.filter({ product -> Bool in
            return product.name!.lowercased().contains(word)
        })
    }
    
    init() {
        
    }
    init(code: String?, name: String?, quatity: Int, rent: Double, sale: Double, image_name: String?) {
        
        self.code = code
        self.name = name
        self.quatity = quatity
        self.rent = rent
        self.sale = sale
        self.image_name = image_name
        self.selected_price = 0
        self.selected_quatity = 0
    }
    
    static func ==(lhs: Product, rhs: Product) -> Bool {
        return lhs.name == rhs.name
    }
    
    static func <(lhs: Product, rhs: Product) -> Bool {
        return lhs.name! < rhs.name!
    }
    
    
    
    func update(completion: @escaping ((Error?) -> Void)){
        if let imageName = self.image_name{
            let refStorage = AppShare.shared.storageRef.child(imageName)
            refStorage.delete { error in
                print(error ?? "")
            }
        }
        if let image = self.image, let newImage = image.resizeWithWidth(width: 160), let data = newImage.jpeg(.highest) , let document_id = self.document_id, let imageName = self.image_name{
            
            let productImageRef = AppShare.shared.storageRef.child(imageName)
            _ = productImageRef.putData(data, metadata: nil) { (metadata, error) in
                print (error ?? "")
            }
            
            let ref = AppShare.shared.PRODUCT_COLLECTION.document(document_id)
            ref.updateData(["name" : self.name, "quatity" : self.quatity,"sale" : self.sale, "rent": self.rent]) { error in
                completion(error)
            }

        }else{
            completion(NSError(domain:"update-product", code: 1000, userInfo:[NSLocalizedDescriptionKey : "Hình ảnh sản phẩm hay document id có vấn đề"]))
        }
    }
    
    func add(completion: (@escaping (Error?) -> Void)){
        let imageName = "product-\(UUID.init().uuidString).jpg"
        self.image_name = imageName
        
        if let image = self.image, let data = image.jpeg(.highest){
            
            let productImageRef = AppShare.shared.storageRef.child(imageName)
            _ = productImageRef.putData(data, metadata: nil) { (metadata, error) in
                    print (error ?? "")
            }
            let ref = AppShare.shared.PRODUCT_COLLECTION.addDocument(data: self.toDictionary()) { error in
                print (error ?? "")
            }
            ref.updateData(["document_id" : ref.documentID]) { error in
                completion(error)
            }
            
        }else{
          completion(NSError(domain:"add-product", code: 1000, userInfo:[NSLocalizedDescriptionKey : "Hình ảnh sản phẩm có vấn đề"]))
        }
    }
    
    func delete(completion: @escaping ((Error?) -> Void)){
        if let imageName = self.image_name{
            let ref = AppShare.shared.storageRef.child(imageName)
            ref.delete { error in
                print (error ?? "")
            }
        }
        if let documentId = self.document_id{
            let ref = AppShare.shared.PRODUCT_COLLECTION.document(documentId)
            ref.delete { error in
                completion(error)
            }
        }else{
            completion(NSError(domain:"delete-product", code: 1000, userInfo:[NSLocalizedDescriptionKey : "Document id là rỗng"]))
        }
    }

}

