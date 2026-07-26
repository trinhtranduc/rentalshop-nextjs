//
//  PrinterConfiguration.swift
//  POS ADBD
//
//  Created by Tran Trinh on 11/30/19.
//  Copyright © 2019 Trinh Tran. All rights reserved.
//

import Foundation

class PrinterConfiguration: BaseModel {
    static let shared = PrinterConfiguration()
    
    var note: String?
    var footer: String?
    var ipAddress: String?
    var id: String?
    
    private override init() {
        super.init()
        loadSavedConfiguration()
    }
    
    init(id: String?, note: String?, footer: String?, ipAddress: String?) {
        self.note = note
        self.footer = footer
        self.ipAddress = ipAddress
        self.id = id
    }
    
    func toDictionary() -> [String: Any] {
        var dictionary: [String: Any] = [:]
        dictionary["note"] = note ?? ""
        dictionary["footer"] = footer ?? ""
        dictionary["ipAddress"] = ipAddress ?? ""
        return dictionary
    }
    
    class func object(with dictionary: [String: Any]) -> PrinterConfiguration {
        let printer = PrinterConfiguration()
        printer.note = dictionary["note"] as? String
        printer.footer = dictionary["footer"] as? String
        printer.ipAddress = dictionary["ipAddress"] as? String
        return printer
    }
    
    // MARK: - Helper Methods
    private func loadSavedConfiguration() {
        ipAddress = Utils.loadBillPrinter()
        note = Utils.loadNotePrinter()
        // Load footer from UserDefaults or other storage
    }
    
    func save() {
        Utils.saveBillPrinter(ip: ipAddress ?? "")
        Utils.saveNotePrinter(note: note ?? "")
        // Save footer to UserDefaults or other storage
    }
    
    class func current() -> PrinterConfiguration {
        return shared
    }
}
