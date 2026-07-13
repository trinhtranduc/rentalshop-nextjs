//
//  JSONParsingErrorLogger.swift
//  POS ADBD
//
//  Created by Assistant on 10/15/25.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

extension DecodingError {
    /// Log detailed information about JSON parsing errors
    func logDetailedError(data: Data, context: String = "JSON Parsing") {
        print("❌ \(context) Error:")
        print("   Error Type: \(type(of: self))")
        
        // Log raw JSON data for debugging
        if let jsonString = String(data: data, encoding: .utf8) {
            print("   Raw JSON Data:")
            print("   \(jsonString)")
        } else {
            print("   Unable to convert data to string")
        }
        
        // Log specific error details
        switch self {
        case .typeMismatch(let type, let context):
            print("   Type Mismatch:")
            print("     Expected Type: \(type)")
            print("     Context: \(context.debugDescription)")
            print("     Coding Path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            
        case .valueNotFound(let type, let context):
            print("   Value Not Found:")
            print("     Expected Type: \(type)")
            print("     Context: \(context.debugDescription)")
            print("     Coding Path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            
        case .keyNotFound(let key, let context):
            print("   Key Not Found:")
            print("     Missing Key: \(key.stringValue)")
            print("     Context: \(context.debugDescription)")
            print("     Coding Path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            
        case .dataCorrupted(let context):
            print("   Data Corrupted:")
            print("     Context: \(context.debugDescription)")
            print("     Coding Path: \(context.codingPath.map { $0.stringValue }.joined(separator: " -> "))")
            
        @unknown default:
            print("   Unknown Decoding Error")
        }
        
        // Log JSON structure analysis
        if let jsonObject = try? JSONSerialization.jsonObject(with: data, options: []) {
            print("   JSON Structure Analysis:")
            analyzeJSONStructure(jsonObject, indent: 2)
        }
    }
    
    private func analyzeJSONStructure(_ object: Any, indent: Int) {
        let spaces = String(repeating: " ", count: indent)
        
        switch object {
        case let dict as [String: Any]:
            print("\(spaces)Object with keys: \(dict.keys.sorted().joined(separator: ", "))")
            for (key, value) in dict.sorted(by: { $0.key < $1.key }) {
                print("\(spaces)  \(key): \(type(of: value))")
                if let nestedDict = value as? [String: Any], nestedDict.count < 5 {
                    analyzeJSONStructure(nestedDict, indent: indent + 4)
                } else if let nestedArray = value as? [Any], nestedArray.count < 3 {
                    analyzeJSONStructure(nestedArray, indent: indent + 4)
                }
            }
            
        case let array as [Any]:
            print("\(spaces)Array with \(array.count) items")
            if let firstItem = array.first {
                print("\(spaces)  First item type: \(type(of: firstItem))")
                if array.count <= 3 {
                    for (index, item) in array.enumerated() {
                        print("\(spaces)  [\(index)]: \(type(of: item))")
                        if let nestedDict = item as? [String: Any], nestedDict.count < 5 {
                            analyzeJSONStructure(nestedDict, indent: indent + 4)
                        }
                    }
                }
            }
            
        default:
            print("\(spaces)\(type(of: object)): \(object)")
        }
    }
}

extension Error {
    /// Log JSON parsing error with detailed information
    func logJSONParsingError(data: Data, context: String = "JSON Parsing") {
        if let decodingError = self as? DecodingError {
            decodingError.logDetailedError(data: data, context: context)
        } else {
            print("❌ \(context) Error:")
            print("   Error: \(self)")
            print("   Type: \(type(of: self))")
            if let jsonString = String(data: data, encoding: .utf8) {
                print("   Raw JSON Data:")
                print("   \(jsonString)")
            }
        }
    }
}
