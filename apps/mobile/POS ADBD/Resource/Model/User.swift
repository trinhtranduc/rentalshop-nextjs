//
//  User.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/15/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import ObjectMapper
import RealmSwift


enum Role : String{
    case admin, sale
}

class User : Object, Mappable{
    
    @objc dynamic var name: String?
    @objc dynamic var password: String?
    @objc dynamic var outlet_id: String?
    @objc dynamic var role: String? //admin, sale
    @objc dynamic var user_id: String?
    
 
    convenience required init?(map: Map) {
        self.init()
        
    }
    
    override class func primaryKey() -> String? {
        return "user_id"
    }
    
    func mapping(map: Map) {
        name              <- map["namename"]
        password              <- map["password"]
        outlet_id              <- map["outlet_id"]
        role              <- map["role"]
        user_id              <- map["user_id"]
        
    }
    
    class func user() -> User?{
        let realm = try! Realm()
        let users = realm.objects(User.self)
        if users.count > 0{
            return users.first!
        }
        return nil
    }
    class func clear(){
        let realm = try! Realm()
        let users = realm.objects(User.self)
        try! realm.write{
            realm.delete(users)
        }
    }
    
    class func object(with dictionary: [String : Any]) -> User?{
        let user = User()
        user.name = dictionary["namename"] as? String
        user.password = dictionary["password"] as? String
        user.outlet_id = dictionary["outlet_id"] as? String
        user.role = dictionary["role"] as? String
         user.user_id = dictionary["user_id"] as? String
        
        return user
    }
}

