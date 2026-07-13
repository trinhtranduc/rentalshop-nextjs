//
//  Order.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/6/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import FirebaseFirestore
import ObjectMapper

enum SearchType: Int{
    case order_number, phone, name
}

enum Status : String{
    case draft, booking, renting, returned, cancel
    
    func inString() -> String{
        switch self {
        case .draft:
            return "ĐANG XEM"
        case .booking:
            return "MỚI CỌC"
        case .renting:
            return "ĐANG THUÊ"
        case .returned:
            return "ĐÃ TRẢ"
        case .cancel:
            return "HỦY"     
        }
    }
    var sortIndex : String {
        return self.rawValue
    }
}

enum Type : String{
    case rent, sale
}


class Order{
    var type : Type = .rent
    var order_id: String?
    var document_id : String?
    var status : Status = .draft
    var customer_name : String?
    var phone : String?
    var book_fee: Double = 0
    var book_fee_second_time: Double = 0
    var book_material_second_time: String?
    
    var date_number_rent : Int = 0
    
    var get_date_string:  String?
    var get_date:  Date?{
        didSet{
            if let date = get_date{
                self.get_date_string = date.dateInString()
            }
        }
    }
    var return_date:  Date?
    
    // Book date
    var book_month_string:  Int?
    var book_date_string:  String?
    var book_date:  Date? {
        didSet{
            if let date = book_date{
                self.book_month_string = date.getMonth()
                self.book_date_string = date.dateInString()
            }
        }
     }
    
    // A actual get date
    var get_month_string:  Int?
    var get_actual_date:  Date? {
        didSet{
            if let date = get_actual_date{
                self.get_month_string = date.getMonth()
            }
        }
     }
    
    //A Actual return date
    var return_month_string:  Int?
    var return_actual_date:  Date? {
        didSet{
            if let date = return_actual_date{
                self.return_month_string = date.getMonth()
            }
        }
    }
    
    
     var note: String?
     var outlet_id: String?
     var extra_amount : Double = 0
     var product_indexs : [String]?
     var prepared : Bool = false
     var products: [Product] = [] {
        didSet{
            var orderIds = [String]()
            for (_, product) in products.enumerated(){
                orderIds.append(product.code!)
            }
            
            self.product_indexs = orderIds
        }
     }

    init() {
        
    }

    func total() -> Double{
        var total = Double(0)
        for product in self.products{
            total += product.total()
        }
        return total
    }
    
    func inCurred(edit: Bool) -> Double{
        let total  = self.total()
  
        if self.type == .sale{
            return total
        }else{
            if self.status == .draft{
                return  self.book_fee
            }else if self.status == .booking {
                if edit {
                    return  self.book_fee
                }else{
                    return  total - self.book_fee +  self.book_fee_second_time
                }
                
            }else if self.status == .renting{
                return  self.book_fee_second_time - self.extra_amount
            }else if self.status == .returned{
                return Double(0)
            }else{
                return Double(0)
            }
        }
    }
    func toDictionary() -> [String : Any]{
        var dictionary : [String :Any] = [:]
        if let document_id = self.document_id{
            dictionary["document_id"] = document_id
        }
        if let order_id = self.order_id{
            dictionary["order_id"] = order_id
        }
        if let customer_name = self.customer_name{
            dictionary["customer_name"] = customer_name
        }
        if let phone = self.phone{
            dictionary["phone"] = phone.formatPhone(haveSpace: false)
        }
        if let outlet_id = self.outlet_id{
            dictionary["outlet_id"] = outlet_id
        }
        dictionary["status"] = self.status.rawValue
        dictionary["type"] = self.type.rawValue
        
        dictionary["book_month_string"] = book_month_string
        dictionary["book_date_string"] = book_date_string
        dictionary["get_date_string"] = get_date_string
        dictionary["get_month_string"] = get_month_string
        dictionary["return_month_string"] = return_month_string
        
        dictionary["date_number_rent"] = date_number_rent
        dictionary["book_fee"] = book_fee
        dictionary["book_fee_second_time"] = book_fee_second_time
        dictionary["book_material_second_time"] = book_material_second_time
        dictionary["extra_amount"] = extra_amount

        if let book_date = self.book_date{
            dictionary["book_date"] = book_date
        }
        if let get_date = self.get_date{
            dictionary["get_date"] = get_date
        }
        if let return_date = self.return_date{
            dictionary["return_date"] = return_date
        }
        if let get_actual_date = self.get_actual_date{
            dictionary["get_actual_date"] = get_actual_date
        }
        if let return_actual_date = self.return_actual_date{
            dictionary["return_actual_date"] = return_actual_date
        }
        if let note = self.note{
            dictionary["note"] = note
        }
        if let product_indexs = self.product_indexs{
            dictionary["product_indexs"] = product_indexs
        }
        dictionary["prepared"] = prepared
        
        var productDic = [[String: Any]]()
        for product in self.products{
            productDic.append(product.toDictionary())
        }
        dictionary["products"] = productDic
        
        return dictionary
    }
    
    
    class func object(with dictionary: [String : Any]) -> Order?{
        let order = Order()
        
        order.document_id = dictionary["document_id"] as? String
        order.order_id = dictionary["order_id"] as? String
        order.outlet_id = dictionary["outlet_id"] as? String
        order.customer_name = dictionary["customer_name"] as? String
        order.phone = dictionary["phone"] as? String
        if let book_fee = dictionary["book_fee"] as? Double{
            order.book_fee = book_fee
        }else{
            order.book_fee = Double(0)
        }
        if let book_fee_second_time = dictionary["book_fee_second_time"] as? Double{
            order.book_fee_second_time = book_fee_second_time
        }else{
            order.book_fee_second_time = Double(0)
        }
        
        order.status = Status(rawValue: dictionary["status"] as! String)!
        order.type = Type(rawValue: dictionary["type"] as! String)!
        
        if let date_number_rent = dictionary["date_number_rent"] as? Int{
            order.date_number_rent = date_number_rent
        }else{
            order.date_number_rent = 0
        }
        
        if let extra_amount = dictionary["extra_amount"] as? Double{
            order.extra_amount = extra_amount
        }else{
            order.extra_amount = Double(0)
        }
        if let timestamp = dictionary["book_date"] as? Timestamp {
            order.book_date = timestamp.dateValue()
        }
        if let timestamp = dictionary["get_date"] as? Timestamp{
            order.get_date = timestamp.dateValue()
        }
        if let timestamp = dictionary["return_date"] as? Timestamp {
            order.return_date = timestamp.dateValue()
        }
        
        if let timestamp = dictionary["get_actual_date"] as? Timestamp{
            order.get_actual_date = timestamp.dateValue()
        }
        if let timestamp = dictionary["return_actual_date"] as? Timestamp{
            order.return_actual_date = timestamp.dateValue()
        }
        order.get_date_string = dictionary["get_date_string"] as? String
        order.book_month_string = dictionary["book_month_string"] as? Int
        order.book_date_string = dictionary["book_date_string"] as? String
        order.get_month_string = dictionary["get_month_string"] as? Int
        order.return_month_string = dictionary["return_month_string"] as? Int
        order.book_material_second_time = dictionary["book_material_second_time"] as? String
        
        order.note = dictionary["note"]  as? String
        order.product_indexs = dictionary["product_indexs"]  as? [String]
        if let prepared = dictionary["prepared"] as? Bool{
            order.prepared = prepared
        }else{
            order.prepared = false
        }
        
        var products = [Product]()
        for product in dictionary["products"] as! [[String: Any]]{
            let product = Product.object(with: product)
            products.append(product!)
        }
        order.products = products
        
        return order
    }
    init(order_id: String?, status: Status, customer_name: String?, phone: String?, book_fee: Double,get_date : Date?, return_date: Date?, outlet_id : String?) {
        
        self.order_id = order_id
        self.status = status
        self.customer_name = customer_name
        self.phone = phone
        self.book_fee = book_fee
        
        defer {
            self.get_date = get_date
        }
        
        
       
        self.return_date = return_date
        self.outlet_id = outlet_id
    }
    
    func getIncomeByStatus(status: Status) -> Double{
        let total  = self.total()
        
        if self.type == .sale{
            return total
        }else{
            if status == .booking{
                return self.book_fee
            }else if status == .renting{
                return self.total() - self.book_fee + self.book_fee_second_time
            }else if status == .returned{
                let returnValue = self.book_fee_second_time - self.extra_amount
                return returnValue != 0 ? -1 * returnValue : Double(0)
            }
            return Double(0)
        }
        
    }
    class func filter(text: String, orders: [Order], searchType: SearchType) -> ([Order], [String]){
        var result = orders
        var words : [String] = []
        for word in text.lowercased().components(separatedBy: " "){
            if word.count != 0{
                result = Order.filter(word: word, orders: result, searchType : searchType)
                words.append(word)
            }
            
        }
        return (result,words)
    }
    
    class func filter(word: String, orders: [Order], searchType: SearchType) -> [Order]{
        if searchType == .order_number{
            return orders.filter({ order -> Bool in
                return order.order_id!.lowercased().contains(word)
            })
        }else if searchType == .phone{
            return orders.filter({ order -> Bool in
                return order.phone!.lowercased().contains(word)
            })
        }else if searchType == .name{
            return orders.filter({ order -> Bool in
                return order.customer_name!.lowercased().contains(word)
            })
        }
        return []
        
    }
    
    func delete(completion: @escaping ((Error?) -> Void)){
        let ref = AppShare.shared.ORDER_COLLECTION.document(self.document_id!)
        ref.delete { error in
            completion(error)
        }
    }
}


