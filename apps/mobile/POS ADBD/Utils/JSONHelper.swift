//
//  JSONHelper.swift
//  POS ADBD
//
//  Created by Trinh Tran on 12/5/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - JSON Helper Extensions
extension Array where Element: Encodable {
    var json: [[String: Any]] {
        return self.compactMap { element in
            return element.toDictionary()
        }
    }
}

// MARK: - Dictionary Array JSON Conversion
extension Array where Element == [String: Any] {
    var jsonString: String {
        do {
            let data = try JSONSerialization.data(withJSONObject: self, options: [])
            return String(data: data, encoding: .utf8) ?? "[]"
        } catch {
            print("Error converting array to JSON: \(error)")
            return "[]"
        }
    }
    
    var jsonData: Data? {
        do {
            return try JSONSerialization.data(withJSONObject: self, options: [])
        } catch {
            print("Error converting array to JSON data: \(error)")
            return nil
        }
    }
}

// MARK: - Codable Extensions
extension Encodable {
    func toDictionary() -> [String: Any]? {
        do {
            let data = try JSONEncoder.withCustomDateEncoding().encode(self)
            let json = try JSONSerialization.jsonObject(with: data, options: [])
            return json as? [String: Any]
        } catch {
            print("Error converting to dictionary: \(error)")
            return nil
        }
    }
    
    func toJSONString() -> String? {
        do {
            let data = try JSONEncoder.withCustomDateEncoding().encode(self)
            return String(data: data, encoding: .utf8)
        } catch {
            print("Error converting to JSON string: \(error)")
            return nil
        }
    }
}

// MARK: - Shared JSON Coders
extension JSONDecoder {
    /// Shared decoder with ISO8601 date decoding strategy (for API responses)
    /// Supports both standard ISO8601 and ISO8601 with fractional seconds
    static let shared: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            
            // Try ISO8601 with fractional seconds first (e.g., "2025-10-24T13:19:55.009Z")
            let iso8601WithFractionalSeconds = ISO8601DateFormatter()
            iso8601WithFractionalSeconds.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date = iso8601WithFractionalSeconds.date(from: dateString) {
                return date
            }
            
            // Try standard ISO8601 (e.g., "2025-10-24T13:19:55Z")
            let iso8601 = ISO8601DateFormatter()
            if let date = iso8601.date(from: dateString) {
                return date
            }
            
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Expected date string to be ISO8601-formatted.")
        }
        return decoder
    }()
    
    /// Legacy decoder with custom date format "yyyy-MM-dd HH:mm:ss"
    static func withCustomDateDecoding() -> JSONDecoder {
        let decoder = JSONDecoder()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        decoder.dateDecodingStrategy = .formatted(formatter)
        return decoder
    }
    
    /// Decoder with custom date format for specific cases
    static func decoder(withDateFormat format: String) -> JSONDecoder {
        let decoder = JSONDecoder()
        let formatter = DateFormatter()
        formatter.dateFormat = format
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        decoder.dateDecodingStrategy = .formatted(formatter)
        return decoder
    }
}

extension JSONEncoder {
    /// Shared encoder with ISO8601 date encoding strategy (for API requests)
    /// Encodes dates with fractional seconds for consistency with API
    static let shared: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .custom { date, encoder in
            let iso8601 = ISO8601DateFormatter()
            iso8601.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let dateString = iso8601.string(from: date)
            var container = encoder.singleValueContainer()
            try container.encode(dateString)
        }
        return encoder
    }()
    
    /// Legacy encoder with custom date format "yyyy-MM-dd HH:mm:ss"
    static func withCustomDateEncoding() -> JSONEncoder {
        let encoder = JSONEncoder()
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        encoder.dateEncodingStrategy = .formatted(formatter)
        return encoder
    }
    
    /// Encoder with custom date format for specific cases
    static func encoder(withDateFormat format: String) -> JSONEncoder {
        let encoder = JSONEncoder()
        let formatter = DateFormatter()
        formatter.dateFormat = format
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        encoder.dateEncodingStrategy = .formatted(formatter)
        return encoder
    }
}

// MARK: - Custom Date Coding for API Responses
struct CustomDateCoding {
    static let dateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()
    
    static let serverDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()
    
    /// Formatter for displaying dates in UI (medium style)
    static let displayDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter
    }()
    
    /// Formatter for displaying short dates in UI (e.g., "Jan 1, 2024")
    static let shortDisplayDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .none
        return formatter
    }()
}

// MARK: - Custom Date Decoder
class CustomDateDecoder: JSONDecoder {
    override init() {
        super.init()
        self.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            
            // Try different date formats
            let formatters = [
                CustomDateCoding.dateFormatter,
                CustomDateCoding.serverDateFormatter
            ]
            
            for formatter in formatters {
                if let date = formatter.date(from: dateString) {
                    return date
                }
            }
            
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date string \(dateString)"
            )
        }
    }
}

// MARK: - Custom Date Encoder
class CustomDateEncoder: JSONEncoder {
    override init() {
        super.init()
        self.dateEncodingStrategy = .formatted(CustomDateCoding.dateFormatter)
    }
}

// MARK: - AnyCodable Helper for Mixed Types
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if container.decodeNil() {
            value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "AnyCodable cannot decode value")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case is NSNull:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            let context = EncodingError.Context(codingPath: container.codingPath, debugDescription: "AnyCodable cannot encode value")
            throw EncodingError.invalidValue(value, context)
        }
    }
    
    var stringValue: String? {
        if let string = value as? String {
            return string
        } else if let bool = value as? Bool {
            return bool ? "true" : "false"
        } else if let number = value as? NSNumber {
            return number.stringValue
        }
        return nil
    }
    
    var boolValue: Bool {
        if let bool = value as? Bool {
            return bool
        } else if let string = value as? String {
            return string.lowercased() == "true"
        } else if let number = value as? NSNumber {
            return number.boolValue
        }
        return false
    }
} 
