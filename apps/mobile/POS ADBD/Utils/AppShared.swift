//
//  AppShared.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/11/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import Kingfisher

public let USER_COLLECTION_PATH = "user"
public let OUTLET_COLLECTION_PATH = "outlet"
public let VALIDATION_COLLECTION_PATH = "validation"
public let CONFIG_COLLECTION_PATH = "config"
public let PRODUCT_COLLECTION_PATH = "product"
public let ORDER_COLLECTION_PATH = "order"
public let MERCHANT_COLLECTION_PATH = "merchants"

class AppShare{
    static let shared = AppShare()

    let cache = ImageCache.default
    
    private init() {
        
    }
    
    func reset(){
        // Reset the shared working cart in one place so the app keeps a single source of truth.
        CartStore.shared.resetCart()
        
        // Clear image cache
        cache.clearMemoryCache()
        cache.clearDiskCache()
        
        print("AppShare reset completed")
    }
    
}
