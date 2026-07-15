//
//  DateTransfomer.swift
//  POS ADBD
//
//  Created by Tran Trinh on 12/20/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation
import ObjectMapper

public class DateFormatTransform: TransformType {
    
    
    public typealias Object = Date
    public typealias JSON = String
    
    
    var dateFormat = DateFormatter()
    
    convenience init(dateFormat: String) {
        self.init()
        self.dateFormat = DateFormatter(withFormat: dateFormat, locale: Locale.current.languageCode!)
    }
    
    init() {
        
    }
    public func transformToJSON(_ value: Date?) -> JSON? {
        if let date = value {
            return self.dateFormat.string(from: date)
        }
        return nil
    }
    public func transformFromJSON(_ value: Any?) -> Date? {
        if let date = value as? String {
            return self.dateFormat.date(from: date)
        }
        return nil
    }
}
