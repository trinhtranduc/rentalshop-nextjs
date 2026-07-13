//
//  FirebaseExtension.swift
//  MX3Hydration
//
//  Created by Anh Vu on 11/9/17.
//  Copyright © 2017 MX3 Diagnostics. All rights reserved.
//

//import ObjectMapper
//import FirebaseDatabase

//extension DataSnapshot {
//    func toUser() -> UserModel? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return UserModel(JSON: dict)
//    }
//
//    func toOsmData() -> OsmData? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return OsmData(JSON: dict)
//    }
//
//    func toOrganization() -> Organization? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return Organization(JSON: dict)
//    }
//
//    func toPlayer() -> Player? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return Player(JSON: dict)
//    }
//
//    func toPinCode() -> Pincode? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return Pincode(JSON: dict)
//    }
//
//    func toBatchData() -> BatchData? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return BatchData(JSON: dict)
//    }
//    func toHydration() -> Hydration? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return Hydration(JSON: dict)
//    }
//
//    func toFirmwareData() -> FirmwareData? {
//        guard let dict = self.value as? [String:Any] else { return nil }
//        return FirmwareData(JSON: dict)
//    }
//
//    func getChildSnapshots() -> [DataSnapshot] {
//        let enumerate = self.children
//        var results = [DataSnapshot]()
//        while let childSnap = enumerate.nextObject() as? DataSnapshot {
//            results.append(childSnap)
//        }
//        return results
//    }
//}
