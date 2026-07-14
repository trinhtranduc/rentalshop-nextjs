//
//  FirestoreModel.swift
//  Nodus
//
//  Created by Kieu Minh Phu on 8/11/18.
//  Copyright © 2018 Kieu Minh Phu. All rights reserved.
//

import FirebaseFirestore

private struct Property {
    let label: String
    let value: Any
}

class FirestoreModelData {
    
    let snapshot: DocumentSnapshot?
    
    var documentID: String? {
        return snapshot?.documentID
    }
    
    private var customData: [String: Any]
    
    var data: [String : Any] {
        set {  }
        get {
            if let validSnapshot = snapshot {
                return validSnapshot.data() ?? [:]
            }
            
            return customData
        }
    }
    
    func value<T>(forKey key: String) throws -> T {
        guard let value = data[key] as? T else { throw ModelDataError.typeCastFailed }
        return value
    }
    
    func value<T: RawRepresentable>(forKey key: String) throws -> T where T.RawValue == String {
        guard let value = data[key] as? String else { throw ModelDataError.typeCastFailed }
        return T(rawValue: value)!
    }
    
    func optionalValue<T>(forKey key: String) -> T? {
        return data[key] as? T
    }
    
    func optionalValue<T: FirestoreModel>(forKey key: String) -> T? {
        if let dict: [String: Any] = data[key] as? [String: Any] {
            return T.init(modelData: FirestoreModelData(data: dict))
        }
        return nil
    }
    
    init(snapshot: DocumentSnapshot? = nil, data: [String: Any] = [:]) {
        self.snapshot = snapshot
        self.customData = data
    }
    
    enum ModelDataError: Error {
        case typeCastFailed
    }
}

protocol StringRawRepresentable {
    var stringRawValue: String { get }
}

extension StringRawRepresentable where Self: RawRepresentable, Self.RawValue == String {
    var stringRawValue: String { return rawValue }
}

protocol FirestoreModel {
    init?(modelData: FirestoreModelData)
    
    var documentID: String? { get }
    var customID: String? { get }
    var serialized: [String : Any?] { get }
}

extension FirestoreModel {
    
    var serialized: [String : Any?] {
        var data = [String : Any?]()
        
        Mirror(reflecting: self).children.forEach { child in
            guard let property = child.label.flatMap({ Property(label: $0, value: child.value) }) else { return }
            
            switch property.value {
            case let rawRepresentable as StringRawRepresentable:
                data[property.label] = rawRepresentable.stringRawValue
                
            case _ as Array<Any>:
                break
                
            default:
                if let firstoreModel = Mirror(reflecting: property.value).children.first?.value as? FirestoreModel {
                    data[property.label] = firstoreModel.serialized
                } else {
                    data[property.label] = property.value
                }
            }
        }
        
        return data
    }
    
    var customID: String? { return nil }
    var documentID: String? { return nil}
}

extension DocumentReference {
    
    func setModel(_ model: FirestoreModel, completion: ((_ error: Error?) -> Void)?) {
        var documentData = [String : Any]()
        
        for (key, value) in model.serialized {
            if key == "documentID" || key == model.customID { continue }
            
            switch value {
            case let rawRepresentable as StringRawRepresentable:
                documentData[key] = rawRepresentable.stringRawValue
            default:
                
                if let validValue = value {
                    documentData[key] = validValue
                }
            }
        }
        
        setData(documentData) { (error) in
            completion?(error)
        }
    }
    
    func getModel<Model: FirestoreModel>(_: Model.Type, completion: @escaping (Model?, Error?) -> Void) {
        
        getDocument { snapshot, error in
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let snapshot = snapshot else {
                completion(nil, nil)
                return
            }
            
            completion(Model(modelData: FirestoreModelData(snapshot: snapshot)), nil)
        }
    }
    
    func addModelListening<Model: FirestoreModel>(_: Model.Type, completion: @escaping (Model?, Error?) -> Void) -> ListenerRegistration {
        
        return addSnapshotListener { (snapshot, error) in
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let snapshot = snapshot else {
                completion(nil, nil)
                return
            }
            
            completion(Model(modelData: FirestoreModelData(snapshot: snapshot)), nil)
        }
    }
}

extension Query {
    
    func getModels<Model: FirestoreModel>(_: Model.Type, completion: @escaping ([Model]?, Error?) -> Void) {
        getDocuments { snapshot, error in
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let snapshot = snapshot else {
                completion(nil, nil)
                return
            }
            
            completion(snapshot.documents.compactMap { Model(modelData: FirestoreModelData(snapshot: $0)) }, nil)
        }
    }
    
    func addModelsListening<Model: FirestoreModel>(_: Model.Type, completion: @escaping ([Model]?, [ModelChange<Model>]?,  Error?) -> Void) -> ListenerRegistration {
        
        return addSnapshotListener { snapshot, error in
            if let error = error {
                completion(nil, nil, error)
                return
            }
            
            guard let snapshot = snapshot else {
                completion(nil, nil, nil)
                return
            }
            
            completion(snapshot.documents.compactMap { Model(modelData: FirestoreModelData(snapshot: $0)) },
                       snapshot.documentChanges.compactMap {ModelChange<Model>(documentChange: $0)},
                       nil)
        }
    }
}
