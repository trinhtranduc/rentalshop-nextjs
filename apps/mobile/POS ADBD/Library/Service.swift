////
////  Service.swift
////  SaleApp
////
////  Created by Trinh Tran on 10/23/17.
////  Copyright © 2017 Trinh Tran. All rights reserved.
////
//
//import Foundation
//import Alamofire
//import SwiftyJSON
//import ObjectMapper
//
//
//
//extension Service {
//    class func errorMetaObject(_ dictionary: JSON) -> RCError? {
//
//        let meta = dictionary["result"]["meta"]
//        let error = RCError()
//
//        guard meta != JSON.null else {
//
//            error.message = ValidationStringMessage.cannotParseData.rawValue
//            return error
//
//        }
//
//        if let success = meta["status"].bool {
//            error.success = success
//        }
//
//        if let message = meta["message"].string {
//            error.message = message
//        }
//        if let code = meta["status_code"].int {
//            error.code = code
//        }
//        return error
//    }
//
//    class func dataContentObject(_ dictionary: JSON) -> JSON {
//        let meta = dictionary["result"]["data"]
//        if meta == JSON.null {
//            return JSON.null
//        }
//        return meta
//    }
//    class func metaContentObject(_ dictionary: JSON) -> JSON {
//        let meta = dictionary["result"]["meta"]
//        if meta == JSON.null {
//            return JSON.null
//        }
//        return meta
//    }
//
//}
////extension NSError {
////
////    class func errorWithOwnMessage(message: String, domain: String) -> NSError {
////        var dict = [String: AnyObject]()
////        dict[NSLocalizedDescriptionKey] = message as AnyObject?
////
////        return NSError(domain: domain, code: 1000, userInfo: dict)
////    }
////    class func errorWithOwnMessage(message: String, domain: String, code: Int) -> NSError {
////        var dict = [String: AnyObject]()
////        dict[NSLocalizedDescriptionKey] = message as AnyObject?
////
////        return NSError(domain: domain, code: code, userInfo: dict)
////    }
////
////}
//
//extension Service {
//    static var jsonHeader: HTTPHeaders {
//        get {
//            var header: HTTPHeaders = [
//                "Content-Type": "application/json",
//                "version": UIDevice.getAppInfo(),
//                "device": UIDevice.deviceInfo(),
//                "lang": Locale.preferredLanguageCode == "vi" ? "vi" : "en"
//            ]
//            if let user = Account.account() {
//                header["TOKEN"] = user.token ?? ""
//            }
//            print (header)
//
//            return header
//
//
//        }
//    }
//    static var noneHeader: HTTPHeaders {
//        get {
//            var header: HTTPHeaders = [
//                "version": UIDevice.getAppInfo(),
//                "device": UIDevice.deviceInfo(),
//                "lang": Locale.preferredLanguageCode == "vi" ? "vi" : "en"
//            ]
//            if let user = Account.account() {
//                header["TOKEN"] = user.token ?? ""
//            }
//            print (header)
//
//            return header
//
//
//        }
//    }
//    static var header: HTTPHeaders {
//        get {
//            var header: HTTPHeaders = [
//                "Content-Type": "application/x-www-form-urlencoded",
//                "version": UIDevice.deviceVersion(),
//                "device": UIDevice.modelName,
//                "lang": Locale.preferredLanguageCode == "vi" ? "vi" : "en"
//            ]
//            if let user = Account.account() {
//                header["TOKEN"] = user.token ?? ""
//            }
//            print (header)
//
//            return header
//
//
//        }
//    }
//    static var formHeader: HTTPHeaders {
//        get {
//            var header: HTTPHeaders = [
//                "Content-Type": "multipart/form-data",
//                "version": UIDevice.getAppInfo(),
//                "device": UIDevice.deviceInfo(),
//                "lang": Locale.preferredLanguageCode == "vi" ? "vi" : "en"
//            ]
//            if let user = Account.account() {
//                header["TOKEN"] = user.token ?? ""
//            }
//            print (header)
//
//            return header
//
//
//        }
//    }
//}
//class Service {
//
//    class func logout(completion: @escaping (_ success: Bool, _ error: NSError?) -> Void) {
//
//        let path = URLService + "/logout"
//        let params = ["": ""]
//        
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                print (dic)
//                if errorMetaObject(dic)?.success == true {
//                    completion(true, nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(false, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(false, error)
//            }
//        }
//    }
//    
//    class func accountDeletion( completion: @escaping (_ success: Bool, _ error: NSError?) -> Void) {
//
//        let path = URLService + "/enable_disable_account"
//        let params = ["":""]
//        
//        
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                print (dic)
//                if errorMetaObject(dic)?.success == true {
//                    completion(true, nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(false, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(false, error)
//            }
//        }
//    }
//    
//    class func createAccountWithEmail(loginName: String, password: String, storeName: String, address: String, name: String, phone: String, completion: @escaping (_ account: Account?, _ error: NSError?) -> Void) {
//        let path = URLService + "/register_account"
//        let params = ["params": ["login": loginName, "password": password, "name": name, "phone": phone, "address": address, "store_name": storeName]]
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    let user = Mapper<Account>().map(JSON: data)
//                    completion(user, nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//    class func loginWithEmail(emailUser: String, passwordUser: String, completion: @escaping (_ account: Account?, _ error: NSError?) -> Void) {
//        let path = URLService + "/login"
//        let params = ["params": ["login": emailUser, "password": passwordUser]]
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    let user = Mapper<Account>().map(JSON: data)
//                    completion(user, nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//
//    class func loadProducts(keyword: String?, completion: @escaping (_ product: [Product]?, _ error: NSError?) -> Void) {
//        let path = URLService + "/get_products"
//        let param = ["params": ["keyword_search": keyword ?? ""]]
//
//        AF.request(path, method: .post, parameters: param, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    if let products = data["products"] as? [[String: Any]] {
//                        let _products = Mapper<Product>().mapArray(JSONArray: products)
//                        completion(_products, nil)
//                    } else {
//                        completion(nil, nil)
//                    }
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//    
//    class func createProduct(product: Product, img: UIImage, completion: @escaping (_ product: Product?, _ error: NSError?) -> Void) {
//        let path = URLService + "/create_product"
//
//        AF.upload(multipartFormData: { multipart in
//            multipart.append(product.quantity.description.data(using: .utf8)!, withName: "quantity")
//            multipart.append(product.rent.description.data(using: .utf8)!, withName: "rent_price")
//            multipart.append(product.barcode!.data(using: .utf8)!, withName: "barcode")
//            //            multipart.append(product.sale.description.data(using: .utf8)!, withName: "sale_price")
//            multipart.append("product".description.data(using: .utf8)!, withName: "type")
//            multipart.append(product.name!.description.data(using: .utf8)!, withName: "product_name")
//            multipart.append(img.toData()!, withName: "images", fileName: "images.jpeg", mimeType: "image/jpeg")
//        }, to: path, method: .post, headers: self.formHeader)
//            .response { response in
//            if let errr = response.error {
//                let error = NSError.errorWithOwnMessage(message: errr.localizedDescription, domain: "RC")
//                completion(nil, error)
//            } else {
//                let dic = JSON(response.data)
//                if let data = dataContentObject(dic).dictionaryObject {
//                    let product = Mapper<Product>().map(JSON: data)
//                    if errorMetaObject(dic)?.success == true {
//                        completion(product, nil)
//                    } else {
//                        let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                        completion(nil, error)
//                    }
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: ValidationStringMessage.unknowError.rawValue, domain: "RC")
//                    completion(nil, error)
//                }
//
//            }
//        }
//    }
//    class func createOrder(values: [String: Any], completion: @escaping (_ order: Order?, _ error: NSError?) -> Void) {
//        let path = URLService + "/create_order"
//        print (values)
//        AF.upload(multipartFormData: { multipart in
//            for (key, value) in values {
//                if let i = value as? Int {
//                    multipart.append(i.description.data(using: .utf8)!, withName: key)
//                } else if let f = value as? Float {
//                    multipart.append(f.description.data(using: .utf8)!, withName: key)
//                } else if let d = value as? Double {
//                    multipart.append(d.description.data(using: .utf8)!, withName: key)
//                } else if let s = value as? String {
//                    multipart.append(s.data(using: .utf8)!, withName: key)
//                } else if let b = value as? Bool {
//                    multipart.append(b.description.data(using: .utf8)!, withName: key)
//                }
//            }
//
//        }, to: path, usingThreshold: UInt64.init(), method: .post, headers: self.header)
//
//            .response { response in
//            if let errr = response.error {
//                let error = NSError.errorWithOwnMessage(message: errr.localizedDescription, domain: "RC")
//                completion(nil, error)
//            } else {
//                let dic = JSON(response.data)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//
//                    let order = Mapper<Order>().map(JSON: data)
//                    completion(order, nil)
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//            }
//        }
//    }
//    
//    class func cancelOrder(orderId: Int, completion: @escaping (_ error: NSError?) -> Void) {
//        let path = URLService + "/cancel_orders"
//        let params = ["params": ["order_ids": [orderId]]]
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//
//                if errorMetaObject(dic)?.success == true {
//                    completion(nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(error)
//            }
//        }
//    }
//    
//    class func updateOrder(withValues values: [String: Any], completion: @escaping (_ order: Order?, _ error: NSError?) -> Void) {
//        let path = URLService + "/update_order"
//        print (values)
//        AF.upload(multipartFormData: { multipart in
//
//            for (key, value) in values {
//                if let i = value as? Int {
//                    multipart.append(i.description.data(using: .utf8)!, withName: key)
//                } else if let f = value as? Float {
//                    multipart.append(f.description.data(using: .utf8)!, withName: key)
//                } else if let d = value as? Double {
//                    multipart.append(d.description.data(using: .utf8)!, withName: key)
//                } else if let s = value as? String {
//                    multipart.append(s.data(using: .utf8)!, withName: key)
//                } else if let b = value as? Bool {
//                    multipart.append(b.description.data(using: .utf8)!, withName: key)
//                }
//            }
//
//        }, to: path, usingThreshold: UInt64.init(), method: .post, headers: self.formHeader)
//            .response { response in
//            if let errr = response.error {
//                let error = NSError.errorWithOwnMessage(message: errr.localizedDescription, domain: "RC")
//                completion(nil, error)
//            } else {
//                let dic = JSON(response.data)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//
//                    let order = Mapper<Order>().map(JSON: data)
//                    completion(order, nil)
//
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//            }
//        }
//    }
//    class func createCustomer(withValues values: [String: Any], completion: @escaping (_ order: Customer?, _ error: NSError?) -> Void) {
//        let path = URLService + "/create_customer"
//        AF.upload(multipartFormData: { multipart in
//
//            for (key, value) in values {
//                if let i = value as? Int {
//                    multipart.append(i.description.data(using: .utf8)!, withName: key)
//                } else if let f = value as? Float {
//                    multipart.append(f.description.data(using: .utf8)!, withName: key)
//                } else if let d = value as? Double {
//                    multipart.append(d.description.data(using: .utf8)!, withName: key)
//                } else if let s = value as? String {
//                    multipart.append(s.data(using: .utf8)!, withName: key)
//                } else if let img = value as? UIImage {
//                    multipart.append(img.toData()!, withName: "images", fileName: "images.jpeg", mimeType: "image/jpeg")
//                }
//            }
//
//        }, to: path, usingThreshold: UInt64.init(), method: .post, headers: self.formHeader)
//            .response { response in
//            if let errr = response.error {
//                let error = NSError.errorWithOwnMessage(message: errr.localizedDescription, domain: "RC")
//                completion(nil, error)
//            } else {
//                let dic = JSON(response.data)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//
//                    let customer = Mapper<Customer>().map(JSON: data)
//                    completion(customer, nil)
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//            }
//        }
//    }
//    class func updateCustomer(withValues values: [String: Any], completion: @escaping (_ customer: Customer?, _ error: NSError?) -> Void) {
//        let path = URLService + "/update_customer"
//        AF.upload(multipartFormData: { multipart in
//
//            for (key, value) in values {
//                if let i = value as? Int {
//                    multipart.append(i.description.data(using: .utf8)!, withName: key)
//                } else if let f = value as? Float {
//                    multipart.append(f.description.data(using: .utf8)!, withName: key)
//                } else if let d = value as? Double {
//                    multipart.append(d.description.data(using: .utf8)!, withName: key)
//                } else if let s = value as? String {
//                    multipart.append(s.data(using: .utf8)!, withName: key)
//                } else if let img = value as? UIImage {
//                    multipart.append(img.toData()!, withName: "images", fileName: "images.jpeg", mimeType: "image/jpeg")
//                }
//            }
//
//        }, to: path, usingThreshold: UInt64.init(), method: .post, headers: self.formHeader)
//            .response { response in
//            if let errr = response.error {
//                let error = NSError.errorWithOwnMessage(message: errr.localizedDescription, domain: "RC")
//                completion(nil, error)
//            } else {
//                let dic = JSON(response.data)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//
//                    let customer = Mapper<Customer>().map(JSON: data)
//                    completion(customer, nil)
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//            }
//        }
//    }
//
//    class func deleteCustomer(customerId: Int, completion: @escaping (_ error: NSError?) -> Void) {
//        let path = URLService + "/delete_customers"
//        let params = ["params": ["customer_ids": [customerId]]]
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//
//                if errorMetaObject(dic)?.success == true {
//                    completion(nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(error)
//            }
//        }
//    }
//    class func loadCustomer(keyword: String?, completion: @escaping (_ customers: [Customer]?, _ error: NSError?) -> Void) {
//        let path = URLService + "/get_customers"
//        let param = ["params": ["keyword_search": keyword ?? ""]]
//        AF.request(path, method: .post, parameters: param, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    if let customers = data["customers"] as? [[String: Any]] {
//                        let _customers = Mapper<Customer>().mapArray(JSONArray: customers)
//                        completion(_customers, nil)
//                    } else {
//                        let error = NSError.errorWithOwnMessage(message: "Missing products key", domain: "RC")
//                        completion(nil, error)
//                    }
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//
//
//    class func loadOrders(from date: Date?, productIds: [Int]?, keyword: String?, completion: @escaping (_ orders: [Order]?, _ error: NSError?) -> Void) {
//        let path = URLService + "/get_orders"
//        var startTime = Utils.loadSyncTime()?.dateServerInString()
//        if startTime == nil{
//            startTime = date?.dateServerInString() ?? Utils.date2000()!.dateServerInString()
//        }
//        
//        let param = ["params": [
//            "after_time": startTime!,
//            "end_date": Date().dateServerInString()!,
//            "product_ids": productIds ?? [],
//            "keyword_search": keyword ?? ""]
//        ]
//        print (param)
//
//        AF.request(path, method: .post, parameters: param, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                print (dic)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    if let sync = data["sync_time"] as? String, let syncDate = sync.dateFromString(){
//                        Utils.saveSyncTime(date: syncDate)
//                    }
//                    if let orders = data["orders"] as? [[String: Any]] {
//                        let _orders = Mapper<Order>().mapArray(JSONArray: orders)
//                        
//                        completion(_orders, nil)
//                    } else {
//                        completion(nil, nil)
//                    }
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//    
//    class func forceLoadOrders(productId: Int?, keyword: String?, completion: @escaping (_ orders: [Order]?, _ error: NSError?) -> Void) {
//        let path = URLService + "/get_orders"
//        let startTime = Utils.date2000()!.dateServerInString()
//        
//        let param = ["params": [
//            "after_time": startTime!,
//            "end_date": Date().dateServerInString()!,
//            "product_ids": productIds ?? [],
//            "keyword_search": keyword ?? ""]
//        ]
//        print (param)
//
//        AF.request(path, method: .post, parameters: param, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                print (dic)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    if let sync = data["sync_time"] as? String, let syncDate = sync.dateFromString(){
//                        Utils.saveSyncTime(date: syncDate)
//                    }
//                    if let orders = data["orders"] as? [[String: Any]] {
//                        let _orders = Mapper<Order>().mapArray(JSONArray: orders)
//                        
//                        completion(_orders, nil)
//                    } else {
//                        completion(nil, nil)
//                    }
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//
//    class func deleteOrder(orderId: Int, completion: @escaping (_ error: NSError?) -> Void) {
//        let path = URLService + "/delete_orders"
//        let params = ["params": ["order_ids": [orderId]]]
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//
//                if errorMetaObject(dic)?.success == true {
//                    completion(nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(error)
//            }
//        }
//    }
//    class func deleteProduct(productId: Int, completion: @escaping (_ error: NSError?) -> Void) {
//        let path = URLService + "/delete_products"
//        let params = ["params": ["product_ids": [productId]]]
//        AF.request(path, method: .post, parameters: params, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//
//                if errorMetaObject(dic)?.success == true {
//                    completion(nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(error)
//            }
//        }
//    }
//    class func updateProduct(withValues values: [String: Any], productImages: [UIImage], completion: @escaping (_ product: Product?, _ error: NSError?) -> Void) {
//        let path = URLService + "/update_product"
//        AF.upload(multipartFormData: { multipart in
//
//            for (key, value) in values {
//                if let i = value as? Int {
//                    multipart.append(i.description.data(using: .utf8)!, withName: key)
//                } else if let f = value as? Float {
//                    multipart.append(f.description.data(using: .utf8)!, withName: key)
//                } else if let d = value as? Double {
//                    multipart.append(d.description.data(using: .utf8)!, withName: key)
//                } else if let s = value as? String {
//                    multipart.append(s.data(using: .utf8)!, withName: key)
//                }
//            }
//            for (_, image) in productImages.enumerated() {
//                multipart.append(image.jpeg(.medium)!, withName: "images", fileName: "images.jpg", mimeType: "jpg")
//            }
//
//
//        }, to: path, usingThreshold: UInt64.init(), method: .post, headers: self.formHeader)
//            .response { response in
//            if let errr = response.error {
//                let error = NSError.errorWithOwnMessage(message: errr.localizedDescription, domain: "RC")
//                completion(nil, error)
//            } else {
//                let dic = JSON(response.data)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    let product = Mapper<Product>().map(JSON: data)
//                    completion(product, nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//            }
//        }
//    }
//
//    class func validatateAccount(completion: @escaping (_ error: NSError?) -> Void) {
//        let path = URLService + "/validate_account"
//        let param = ["": ""]
//
//        AF.request(path, method: .post, parameters: param, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                if errorMetaObject(dic)?.success == true {
//                    completion(nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC", code: errorMetaObject(dic)?.code ?? 0)
//                    completion(error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(error)
//            }
//        }
//    }
//
//    class func overview(year: Int, completion: @escaping (_ result: [[String: Any]]?, _ error: NSError?) -> Void) {
//        let path = URLService + "/report_orders"
//        let param = ["params": ["year": year.inString()]]
//
//        AF.request(path, method: .post, parameters: param, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                if let data = dataContentObject(dic).dictionaryObject {
//                    completion(data["orders"] as? [[String: Any]], nil)
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC", code: errorMetaObject(dic)?.code ?? 0)
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//    class func loadOverviewOrder(from f_date: Date?, to t_date: Date?, completion: @escaping (_ orders: [Order]?, _ error: NSError?) -> Void) {
//        let path = URLService + "/overview_orders"
//
//
//        let param = ["params": [
//            "start_date": f_date?.dateServerInString() ?? Date().dateServerInString(),
//            "end_date": t_date?.dateServerInString() ?? Date().dateServerInString()
//            ]]
//
//        AF.request(path, method: .post, parameters: param, encoding: JSONEncoding.default, headers: self.jsonHeader).responseData { response in
//
//            switch(response.result) {
//            case .success(let data):
//                let dic = JSON(data)
//                print (dic)
//                if errorMetaObject(dic)?.success == true, let data = dataContentObject(dic).dictionaryObject {
//                    if let orders = data["orders"] as? [[String: Any]] {
//                        let _orders = Mapper<Order>().mapArray(JSONArray: orders)
//                        completion(_orders, nil)
//                    } else {
//                        completion(nil, nil)
//                    }
//
//                } else {
//                    let error = NSError.errorWithOwnMessage(message: (errorMetaObject(dic)?.message)!, domain: "RC")
//                    completion(nil, error)
//                }
//
//            case .failure(let error):
//                let error = NSError.errorWithOwnMessage(message: error.localizedDescription, domain: "RC", code: (error as NSError).code)
//                completion(nil, error)
//            }
//        }
//    }
//}
