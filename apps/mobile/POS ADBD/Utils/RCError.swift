//
//  RCError.swift
//  RippleCrowd
//
//  Created by Trinh Tran on 10/31/16.
//  Copyright © 2016 Trinh Tran. All rights reserved.
//

import Foundation

let INVALID_TOKEN_CODE  = 403
let EXPIRED_DATE_CODE  = 402
let SUCCESS_CODE  = 200

class RCError : NSObject{
    var success : Bool = false
    var code : Int?
    var message: String?
}
