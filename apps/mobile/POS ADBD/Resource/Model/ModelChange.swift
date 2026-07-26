//
//  ModelChange.swift
//  Nodus
//
//  Created by Kieu Minh Phu on 8/14/18.
//  Copyright © 2018 Kieu Minh Phu. All rights reserved.
//

import UIKit
import FirebaseFirestore

struct ModelChange<Model: FirestoreModel> {
    var type: DocumentChangeType
    var value: Model?
    
    init(documentChange: DocumentChange) {
        self.type = documentChange.type
        self.value = Model(modelData: FirestoreModelData(snapshot: documentChange.document))
    }
}
