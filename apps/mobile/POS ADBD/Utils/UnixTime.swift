//
//  UnixTime.swift
//  Nodus
//
//  Created by Phu on 5/29/18.
//  Copyright © 2018 Kieu Minh Phu. All rights reserved.
//

// MARK: UnixTime
import UIKit

typealias UnixTime = Double

extension UnixTime {
    private func formatType(form: String) -> DateFormatter {
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale.current
        dateFormatter.dateFormat = form
        return dateFormatter
    }

    var dateFull: Date {
        return Date(timeIntervalSince1970: self/1000)
    }
    
    var toHour: String {
        return formatType(form: "HH:mm").string(from: dateFull)
    }
    
    var toDay: String {
        return formatType(form: "dd/MM/yyyy").string(from: dateFull)
    }
    
    var toDayHour: String {
        return formatType(form: "yyyy-MM-dd HH:mm:ss").string(from: dateFull)
    }
    
    var toShortDayHour: String {
        return formatType(form: "HH:mm aa").string(from: dateFull)
    }
    
    var toServerFormat: String{
         return formatType(form: "MM yyyy dd, HH:mm:ss").string(from: dateFull)
    }
}
