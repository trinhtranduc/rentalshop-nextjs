//
//  RCString+Formatter.swift
//  RippleCrowd
//
//  Created by Trinh Tran on 1/4/17.
//  Copyright © 2017 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
//import MBProgressHUD
import PDFKit

import AVFoundation

let numberFormatter: NumberFormatter = {
    let formatter = NumberFormatter()
    formatter.numberStyle = .decimal
    formatter.minimumFractionDigits = 0
    formatter.maximumFractionDigits = 2
    return formatter
}()

enum LangCode :String {
    case en, vi
}

extension UIColor{
    convenience init(hexString: String) {
        let hex = hexString.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int = UInt32()
        Scanner(string: hex).scanHexInt32(&int)
        let a, r, g, b: UInt32
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(red: CGFloat(r) / 255, green: CGFloat(g) / 255, blue: CGFloat(b) / 255, alpha: CGFloat(a) / 255)
    }
}
extension Data {
    
    init<T>(from value: T) {
        var value = value
        self.init(buffer: UnsafeBufferPointer(start: &value, count: 1))
    }
    
    func to<T>(type: T.Type) -> T {
        return self.withUnsafeBytes { $0.pointee }
    }
}

extension Double {
    
    // Formatting double value to k and M
    // 1000 = 1k
    // 1100 = 1.1k
    // 15000 = 15k
    // 115000 = 115k
    // 1000000 = 1m
    func formatPoints() -> String{
        let thousandNum = self/1000
        let millionNum = self/1000000
        if self >= 1000 && self < 1000000{
            if(floor(thousandNum) == thousandNum){
                return ("\(Int(thousandNum))k").replacingOccurrences(of: ".0", with: "")
            }
            return("\(thousandNum.roundTo(places: 1))k").replacingOccurrences(of: ".0", with: "")
        }
        if self > 1000000{
            return ("\(millionNum.roundTo(places: 1))M").replacingOccurrences(of: ".0", with: "")
        }
        else{
            if(floor(self) == self){
                return ("\(Int(self))")
            }
            return ("\(self)")
        }
    }
    
    /// Returns rounded value for passed places
    ///
    /// - parameter places: Pass number of digit for rounded value off after decimal
    ///
    /// - returns: Returns rounded value with passed places
    func roundTo(places:Int) -> Double {
        let divisor = pow(10.0, Double(places))
        return (self * divisor).rounded() / divisor
    }
}
extension UITextField {
    var isEmpty: Bool {
        return text?.isEmpty ?? true
    }
}
extension String {
    subscript(_ i: Int) -> String {
        let idx1 = index(startIndex, offsetBy: i)
        let idx2 = index(idx1, offsetBy: 1)
        return String(self[idx1..<idx2])
    }
    
    subscript (r: Range<Int>) -> String {
        let start = index(startIndex, offsetBy: r.lowerBound)
        let end = index(startIndex, offsetBy: r.upperBound)
        return String(self[start ..< end])
    }
    
    subscript (r: CountableClosedRange<Int>) -> String {
        let startIndex =  self.index(self.startIndex, offsetBy: r.lowerBound)
        let endIndex = self.index(startIndex, offsetBy: r.upperBound - r.lowerBound)
        return String(self[startIndex...endIndex])
    }
}
extension String{
    
    func dateFromString() -> Date?{
        let formatter = DateFormatter()
        formatter.dateFormat = DATE_STRING_FULL_FORMAT
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: self)
    }
    
    func inInteger() -> Int{
        guard self != "" else {
            return 0
        }
        return Int(self)!
    }
    
    func inDouble() -> Double{
        guard self != "" else {
            return 0.0
        }
        let value = self.replacingOccurrences(of: ",", with: "")
        return Double(value)!
    }
    
    func inFloat() -> Float{
        guard self != "" else {
            return 0.0
        }

        let value = self.replacingOccurrences(of: ",", with: "")
        return Float(value)!
    }
    
    func formatStringRemoveCommon() -> String{
        return self.replacingOccurrences(of: ",", with: "")
    }
    func checkDate() -> Date?{
        if self.count > 0{
            let dateFormat = DateFormatter()
            dateFormat.dateFormat = "dd/MM/yyyy"
            dateFormat.locale = Locale(identifier: "en_US_POSIX")
            let date = dateFormat.date(from: self)
            
            return date
        }
        return nil
    }

    func trim() -> String{
        return self.trimmingCharacters(in: CharacterSet.whitespaces)
    }
    func formatPhone(haveSpace: Bool) -> String{
        if haveSpace == true{
            var output = ""
            self.enumerated().forEach { index , c in
                if index == 4 || index == 7{
                    output += " "
                }
                output.append(c)
            }
            return output
        }else{
            return components(separatedBy: .whitespaces).joined()
        }
        
    }
    func containsSpecialCharacters() -> Bool {
        
        let characterset = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789")
        if self.rangeOfCharacter(from: characterset.inverted) != nil {
            return true
        }
        return false
    }
    func isWhitespace() -> Bool {
        // check if there's a range for a whitespace
        let range = self.rangeOfCharacter(from: .whitespacesAndNewlines)

        // returns false when there's no range for whitespace
        if let _ = range {
            return true
        } else {
            return false
        }
    }
    func removeWhiteSpace() -> String{
        let replacedString = self.replacingOccurrences(of: " ", with: "")
        return replacedString
        
        
    }
    func formatStringOriginalCharacter() -> String{
        let chars1: [String] = ["à","á","ạ","ả","ã","â","ầ" ,"ấ","ậ","ẩ","ẫ","ă","ằ","ắ","ặ","ẳ","ẵ"]
        var newString = self.replacingOccurrences(of: chars1, with: "a")
        
        let chars2: [String] = ["è","é","ẹ","ẻ","ẽ","ê","ề","ế","ệ","ể","ễ"]
        newString = newString.replacingOccurrences(of: chars2, with: "e")
        
        let chars3: [String] = ["ì","í","ị","ỉ","ĩ"]
        newString = newString.replacingOccurrences(of: chars3, with: "i")
        
        let chars4: [String] = ["ò","ó","ọ","ỏ","õ","ô","ồ","ố","ộ","ổ","ỗ","ơ","ờ","ớ","ợ","ở","ỡ"]
        newString = newString.replacingOccurrences(of: chars4, with: "o")
        
        let chars14: [String] = ["ỳ","ý","ỵ","ỷ","ỹ"]
        newString = newString.replacingOccurrences(of: chars14, with: "y")
        
        let chars5: [String] = ["ù","ú","ụ","ủ","ũ","ư","ừ","ứ","ự","ử","ữ"]
        newString = newString.replacingOccurrences(of: chars5, with: "u")
        
        let chars6: [String] = ["đ"]
        newString = newString.replacingOccurrences(of: chars6, with: "d")
        
        let chars7: [String] = ["À","Á","Ạ","Ả","Ã","Â","Ầ","Ấ","Ậ","Ẩ","Ẫ","Ă","Ằ","Ắ","Ặ","Ẳ","Ẵ"]
        newString = newString.replacingOccurrences(of: chars7, with: "A")
        
        let chars8: [String] = ["È","É","Ẹ","Ẻ","Ẽ","Ê","Ề","Ế","Ệ","Ể","Ễ"]
        newString = newString.replacingOccurrences(of: chars8, with: "E")
        
        let chars9: [String] = ["Ì","Í","Ị","Ỉ","Ĩ"]
        newString = newString.replacingOccurrences(of: chars9, with: "I")
        
        let chars10: [String] = ["Ò","Ó","Ọ","Ỏ","Õ","Ô","Ồ","Ố","Ộ","Ổ","Ỗ","Ơ","Ờ","Ớ","Ợ","Ở","Ỡ"]
        newString = newString.replacingOccurrences(of: chars10, with: "O")
        
        let chars11: [String] = ["Ù","Ú","Ụ","Ủ","Ũ","Ư","Ừ","Ứ","Ự","Ử","Ữ"]
        newString = newString.replacingOccurrences(of: chars11, with: "U")
        
        let chars12: [String] = ["Ỳ","Ý","Ỵ","Ỷ","Ỹ"]
        newString = newString.replacingOccurrences(of: chars12, with: "Y")
        
        let chars13: [String] = ["Đ"]
        newString = newString.replacingOccurrences(of: chars13, with: "D")
        
        
        
        return newString
        
    }
    func replacingOccurrences(of strings:[String], with replacement:String) -> String {
        var newString = self
        for string in strings {
            newString = newString.replacingOccurrences(of: string, with: replacement)
        }
        return newString
    }
    
    func barcode() -> UIImage?{
        let data = self.data(using: String.Encoding.ascii)
        
        if let filter = CIFilter(name: "CICode128BarcodeGenerator") {
            filter.setValue(data, forKey: "inputMessage")
            let transform = CGAffineTransform(scaleX: 3, y: 3)
            
            if let output = filter.outputImage?.transformed(by: transform) {
                let image = UIImage(ciImage: output)
                let outImage = image.resizeWithWidth(width: 600)
                return outImage
            }
        }
        
        return nil
    }
    
    func qrcode() -> UIImage?{
        // Get define string to encode
        // Get data from the string
        let data = self.data(using: String.Encoding.ascii)
        // Get a QR CIFilter
        guard let qrFilter = CIFilter(name: "CIQRCodeGenerator") else { return nil}
        // Input the data
        qrFilter.setValue(data, forKey: "inputMessage")
        // Get the output image
        guard let qrImage = qrFilter.outputImage else { return nil}
        // Scale the image
        let transform = CGAffineTransform(scaleX: 10, y: 10)
        let scaledQrImage = qrImage.transformed(by: transform)
        // Do some processing to get the UIImage
        let context = CIContext()
        guard let cgImage = context.createCGImage(scaledQrImage, from: scaledQrImage.extent) else { return nil}
        let processedImage = UIImage(cgImage: cgImage)
        
        let image = processedImage.resizeWithWidth(width: 500)
        
        
        return image
    }
    func splitByLength(_ length: Int, seperator: String) -> [String] {
        var result = [String]()
        var collectedWords = [String]()
        collectedWords.reserveCapacity(length)
        var count = 0
        let words = self.components(separatedBy: " ")
        
        for word in words {
            count += word.count + 1 //add 1 to include space
            if (count > length) {
                // Reached the desired length
                
                result.append(collectedWords.map { String($0) }.joined(separator: seperator) )
                collectedWords.removeAll(keepingCapacity: true)
                
                count = word.count
                collectedWords.append(word)
            } else {
                collectedWords.append(word)
            }
        }
        
        // Append the remainder
        if !collectedWords.isEmpty {
            result.append(collectedWords.map { String($0) }.joined(separator: seperator))
        }
        
        return result
    }
    func phoneValid() -> Bool{
        let phoneStart = ["086","096","097","098","032","033","034","035","036","037","038","039","089","093","090","070","079","077","076","078","091","094","088","083","084","085","081","082","092","056","058","052","099","059"]
        for value in phoneStart{
            if self.starts(with: value){
                return true
            }
        }
        return false
    }
    
    func isValidEmail() -> Bool {
            // here, `try!` will always succeed because the pattern is valid
        let regex = try! NSRegularExpression(pattern: "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$", options: .caseInsensitive)
            return regex.firstMatch(in: self, options: [], range: NSRange(location: 0, length: count)) != nil
    }
}
extension Locale {
    
    static var langCode: String {
        let defaultLanguage = LangCode.en.rawValue
        let preferredLanguage = preferredLanguages.first ?? defaultLanguage
        return Locale(identifier: preferredLanguage).languageCode ?? defaultLanguage
    }

    static var langCodes: [String] {
        return Locale.preferredLanguages.compactMap({Locale(identifier: $0).languageCode})
    }
}
extension String {

    func localized(withComment comment: String? = nil) -> String {
        return NSLocalizedString(self, comment: comment ?? "")
    }

    /// Localize order status string (from API response)
    /// Converts status strings like "RESERVED", "PICKUPED", "RETURNED", etc. to localized strings
    func localizedStatus() -> String {
        switch self.uppercased() {
        case "DRAFT":
            return "Draft".localized().uppercased()
        case "RESERVED":
            return "Reserved".localized().uppercased()
        case "PICKUPED", "PICKUP", "PICKED_UP":
            return "Picked Up".localized().uppercased()
        case "RETURNED":
            return "Returned".localized().uppercased()
        case "COMPLETED":
            return "Completed".localized().uppercased()
        case "CANCELLED":
            return "Cancelled".localized().uppercased()
        default:
            return self.uppercased()
        }
    }

}
extension Int{
    func inString() -> String{
        return String(format: "%d", self)
    }
    
    func formatStringInCommon() -> String{
        let numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = NumberFormatter.Style.decimal
        numberFormatter.locale = Locale.current
        numberFormatter.groupingSeparator = ","
        return numberFormatter.string(from: NSNumber(value: self))!
    }
    
    func daysFromSecond() -> (Int, String){
        let days = Int(self / (24 * 60 * 60))
        let hours = Int(self / (60 * 60))
        let mins = Int(self / 60)
        let seconds = Int(self)
        
        if days > 1{
            return (days, "Days remaining")
        }
        if days > 0{
            return (days, "Day remaining")
        }
        if hours > 1{
            return (hours, "Hrs remaining")
        }
        if hours > 0{
            return (hours, "Hr remaining")
        }
        if mins > 1{
            return (mins, "Mins remaining")
        }
        if mins > 0{
            return (mins, "Min remaining")
        }
        if seconds > 1{
            return (seconds, "Secs remaining")
        }
        return (seconds, "Sec remaining")
    }
    
    mutating func increase(number: Int){
        self = self + 1
    }
    mutating func decrease(number: Int){
        self = self - number < 0 ? 0: self - number
    }
}

extension Double{
    func inString() -> String{
        if self.truncatingRemainder(dividingBy: 1) == 0{
            return String(format: "%.0f", self)
        }else{
            return String(format: "%0.0f", self)
        }
        
    }
    
    func inPercent(decimal: Bool)-> String{
        if decimal == true{
            return String(format: "%0.0f%%", self)
        }else{
            if self.truncatingRemainder(dividingBy: 1) == 0{
                return String(format: "%.0f%%", self)
            }else{
                return String(format: "%0.0f%%", self)
            }
        }
        
        
    }
    func inCurrency(hasPrefix : Bool) -> String{
        return hasPrefix == true ? "VND\(String(format: "%.0f", self))" : "$\(String(format: "%.0f", self))"
    }
    func formatStringInCommon() -> String{
        let numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = NumberFormatter.Style.decimal
        numberFormatter.locale = Locale.current
        numberFormatter.groupingSeparator = ","
        let value = numberFormatter.string(from: NSNumber(value: self))!
        return value
    }
   
}

extension Float{
    func formatStringInCommon() -> String{
        let numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = NumberFormatter.Style.decimal
        numberFormatter.locale = Locale.current
        numberFormatter.groupingSeparator = ","
        return numberFormatter.string(from: NSNumber(value: self))!
    }
    func inString() -> String{
        if self.truncatingRemainder(dividingBy: 1) == 0{
            return String(format: "%.0f", self)
        }else{
            return String(format: "%0.0f", self)
        }
        
    }
    func inPercent(decimal: Bool)-> String{
        if decimal == true{
            return String(format: "%0.0f%%", self)
        }else{
            if self.truncatingRemainder(dividingBy: 1) == 0{
                return String(format: "%.0f%%", self)
            }else{
                return String(format: "%0.0f%%", self)
            }
        }
        
    }
    func inCurrency(hasPrefix : Bool)-> String{
        return hasPrefix == true ? "SGD$\(String(format: "%.0f", self))" : "$\(String(format: "%.0f", self))"
    }
}
// MARK: - TextField Number Formatting Utility
extension UITextField {
    /// Configure text field for number formatting with thousand separators
    func configureNumberFormatting() {
        self.addTarget(self, action: #selector(formatNumberInput), for: .editingChanged)
    }
    
    @objc private func formatNumberInput() {
        guard let text = self.text else { return }
        
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale.current
        formatter.groupingSeparator = ","
        formatter.maximumFractionDigits = 0
        
        // Remove existing formatting
        let cleanText = text.replacingOccurrences(of: ",", with: "")
        
        // Format the number
        if let number = Double(cleanText) {
            self.text = number.formatStringInCommon()
        }
    }
    
    /// Handle text field input with number formatting
    func shouldChangeCharactersForNumberFormatting(in range: NSRange, replacementString string: String) -> Bool {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale.current
        formatter.groupingSeparator = ","
        formatter.maximumFractionDigits = 0
        
        if let groupingSeparator = formatter.groupingSeparator {
            if string == groupingSeparator {
                return true
            }
            
            if let textWithoutGroupingSeparator = self.text?.replacingOccurrences(of: groupingSeparator, with: "") {
                var totalTextWithoutGroupingSeparators = textWithoutGroupingSeparator + string
                if string == "" {
                    totalTextWithoutGroupingSeparators.removeLast()
                }
                if let numberWithoutGroupingSeparator = formatter.number(from: totalTextWithoutGroupingSeparators),
                   let formattedText = formatter.string(from: numberWithoutGroupingSeparator) {
                    self.text = formattedText
                    return false
                }
            }
        }
        return true
    }
}

extension UIImage{
    enum JPEGQuality: CGFloat {
        case lowest  = 0
        case low     = 0.25
        case medium  = 0.5
        case high    = 0.75
        case highest = 1
    }
    
    
    /// Returns the data for the specified image in JPEG format.
    /// If the image object’s underlying image data has been purged, calling this function forces that data to be reloaded into memory.
    /// - returns: A data object containing the JPEG data, or nil if there was a problem generating the data. This function may return nil if the image has no data or if the underlying CGImageRef contains data in an unsupported bitmap format.
    func jpeg(_ quality: JPEGQuality) -> Data? {
        return UIImageJPEGRepresentation(self, quality.rawValue)
    }
    func resizeWithWidth(width: CGFloat) -> UIImage? {
        let imageView = UIImageView(frame: CGRect(origin: .zero, size: CGSize(width: width, height: CGFloat(ceil(width/size.width * size.height)))))
        imageView.contentMode = .scaleAspectFit
        imageView.image = self
        UIGraphicsBeginImageContextWithOptions(imageView.bounds.size, false, scale)
        guard let context = UIGraphicsGetCurrentContext() else { return nil }
        imageView.layer.render(in: context)
        guard let result = UIGraphicsGetImageFromCurrentImageContext() else { return nil }
        UIGraphicsEndImageContext()
        return result
    }
    func scaleImage(toSize size: CGSize) -> UIImage? {
        let widthImage = SCREEN_SIZE.width * 3
        let ratio = SCREEN_SIZE.width / size.width
        let heightImage = (size.height * ratio)*3
        let newSize = CGSize(width: widthImage, height: heightImage)
        
        let newRect = CGRect(x: 0, y: 0, width: newSize.width, height: newSize.height).integral
        UIGraphicsBeginImageContextWithOptions(newSize, false, 0.0)
        if let context = UIGraphicsGetCurrentContext() {
            self.draw(in: newRect)
            let newImage: UIImage = UIImage(cgImage: context.makeImage()!)
            UIGraphicsEndImageContext()
            return newImage
        }
        
        
        return nil
    }
    func fixImageOrientation()->UIImage {
        UIGraphicsBeginImageContext(self.size)
        self.draw(at: .zero)
        let newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return newImage ?? self
    }
    func resize(withWidth newWidth: CGFloat) -> UIImage? {
        
        let scale = newWidth / self.size.width
        let newHeight = self.size.height * scale
        UIGraphicsBeginImageContext(CGSize(width: newWidth, height: newHeight))
        self.draw(in: CGRect(x: 0, y: 0, width: newWidth, height: newHeight))
        let newImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return newImage
    }
    func toData()-> Data?{
        let image = self.resize(withWidth: UIScreen.main.bounds.size.width)?.fixImageOrientation()
        let data = image?.jpeg(.highest)
        return data
    }
    
    /// Crop white space from bottom of image
    /// Scans from bottom up to find the last row with non-white pixels
    /// - Parameter threshold: Tolerance for white color (default: 0.95, 95% white is considered white)
    /// - Returns: Cropped image with white space removed from bottom
    func cropBottomWhiteSpace(threshold: CGFloat = 0.95) -> UIImage? {
        guard let cgImage = self.cgImage else { return nil }
        
        let width = cgImage.width
        let height = cgImage.height
        
        // Create bitmap context
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let bytesPerPixel = 4
        let bytesPerRow = bytesPerPixel * width
        let bitsPerComponent = 8
        var pixelData = [UInt8](repeating: 0, count: width * height * bytesPerPixel)
        
        guard let context = CGContext(
            data: &pixelData,
            width: width,
            height: height,
            bitsPerComponent: bitsPerComponent,
            bytesPerRow: bytesPerRow,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
        ) else { return nil }
        
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        // Find last non-white row (scan from bottom up)
        // Use more precise scanning for better accuracy
        var lastContentRow = 0
        let whiteThreshold = UInt8(threshold * 255.0)
        // Sample every pixel horizontally for more accuracy (but skip every 2 pixels for performance)
        let horizontalStep = max(1, width / 200) // Sample every ~0.5% of width for better accuracy
        let verticalStep = max(1, height / 1000) // Scan every ~0.1% of height for better accuracy
        
        for y in stride(from: height - 1, through: 0, by: -verticalStep) {
            var hasNonWhite = false
            for x in stride(from: 0, to: width, by: horizontalStep) {
                let pixelIndex = (y * width + x) * bytesPerPixel
                guard pixelIndex + 2 < pixelData.count else { continue }
                let r = pixelData[pixelIndex]
                let g = pixelData[pixelIndex + 1]
                let b = pixelData[pixelIndex + 2]
                
                // Check if pixel is not white
                if r < whiteThreshold || g < whiteThreshold || b < whiteThreshold {
                    hasNonWhite = true
                    break
                }
            }
            
            if hasNonWhite {
                lastContentRow = y
                // Fine-tune: scan from this row up to find the exact last content row
                // Scan backwards from y + verticalStep to y to find highest row with content
                let fineTuneStart = min(height - 1, y + verticalStep * 10)
                for fineY in stride(from: fineTuneStart, through: y, by: -1) {
                    var fineHasNonWhite = false
                    for x in stride(from: 0, to: width, by: horizontalStep) {
                        let pixelIndex = (fineY * width + x) * bytesPerPixel
                        guard pixelIndex + 2 < pixelData.count else { continue }
                        let r = pixelData[pixelIndex]
                        let g = pixelData[pixelIndex + 1]
                        let b = pixelData[pixelIndex + 2]
                        
                        if r < whiteThreshold || g < whiteThreshold || b < whiteThreshold {
                            fineHasNonWhite = true
                            lastContentRow = max(lastContentRow, fineY) // Update to highest row found
                            break
                        }
                    }
                }
                break
            }
        }
        
        // No padding - crop exactly to last content row
        // Add 1 pixel to include the last content row itself
        let cropHeight = min(height, lastContentRow + 1)
        
        // If no content found or crop would remove less than 5%, return original
        if lastContentRow == 0 || CGFloat(cropHeight) >= CGFloat(height) * 0.95 {
            return self
        }
        
        // Crop the image
        let cropRect = CGRect(x: 0, y: 0, width: width, height: cropHeight)
        guard let croppedCGImage = cgImage.cropping(to: cropRect) else { return self }
        
        return UIImage(cgImage: croppedCGImage, scale: self.scale, orientation: self.imageOrientation)
    }
    
    /// Compress image to be smaller than target size (default: 100KB)
    /// Uses iterative quality reduction (5% per iteration) until target size is reached
    /// - Parameters:
    ///   - targetSizeKB: Target size in KB (default: 100KB)
    ///   - maxDimension: Maximum dimension for resizing (default: 1920px)
    ///   - minQuality: Minimum quality to prevent too low quality (default: 0.1)
    /// - Returns: Compressed image data, or nil if compression fails
    func compressToTargetSize(
        targetSizeKB: Int = 100,
        maxDimension: CGFloat = 1920,
        minQuality: CGFloat = 0.1
    ) -> Data? {
        let targetSizeBytes = targetSizeKB * 1024
        
        // For very small target sizes (< 50KB), use more aggressive initial resizing
        let aggressiveResize = targetSizeKB < 50
        let initialMaxDimension = aggressiveResize ? min(maxDimension, 1024) : maxDimension
        
        // First, resize image if it's too large
        var processedImage = self
        let maxSize = max(size.width, size.height)
        if maxSize > initialMaxDimension {
            let scale = initialMaxDimension / maxSize
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)
            if let resized = resize(to: newSize) {
                processedImage = resized
                if aggressiveResize {
                    print("🔄 Initial resize: \(Int(maxSize))px → \(Int(initialMaxDimension))px")
                }
            }
        }
        
        // Start with high quality and reduce by 5% each iteration
        var quality: CGFloat = 1.0
        var imageData: Data?
        var iterations = 0
        let maxIterations = 30 // Increased for aggressive compression
        var resizeCount = 0
        let maxResizeCount = 5 // Maximum number of resize attempts
        
        while iterations < maxIterations {
            // Try to compress with current quality
            if let data = UIImageJPEGRepresentation(processedImage, quality) {
                imageData = data
                
                // Check if we've reached target size
                if data.count <= targetSizeBytes {
                    print("✅ Image compressed successfully: \(data.count / 1024)KB (target: \(targetSizeKB)KB) after \(iterations) iterations at quality \(Int(quality * 100))%")
                    return data
                }
                
                // If still too large and quality is above minimum, reduce quality by 5%
                if quality > minQuality {
                    quality -= 0.05
                    quality = max(quality, minQuality) // Ensure we don't go below minimum
                    iterations += 1
                    if aggressiveResize && iterations % 5 == 0 {
                        print("🔄 Iteration \(iterations): Size \(data.count / 1024)KB > \(targetSizeKB)KB, quality: \(Int(quality * 100))%")
                    }
                } else {
                    // If we've reached minimum quality and still too large, try resizing more
                    if resizeCount < maxResizeCount {
                        let currentMaxDimension = max(processedImage.size.width, processedImage.size.height)
                        // For aggressive compression, resize more aggressively
                        let resizeFactor: CGFloat = aggressiveResize ? 0.7 : 0.8 // 30% reduction for aggressive, 20% for normal
                        let minDimension: CGFloat = aggressiveResize ? 400 : 800 // Lower minimum for aggressive
                        
                        if currentMaxDimension > minDimension {
                            let newMaxDimension = currentMaxDimension * resizeFactor
                            let scale = newMaxDimension / currentMaxDimension
                            let newSize = CGSize(
                                width: processedImage.size.width * scale,
                                height: processedImage.size.height * scale
                            )
                            if let resized = processedImage.resize(to: newSize) {
                                processedImage = resized
                                quality = aggressiveResize ? 0.6 : 0.8 // Lower quality reset for aggressive
                                iterations += 1
                                resizeCount += 1
                                print("🔄 Iteration \(iterations): Resizing to \(Int(newMaxDimension))px (resize #\(resizeCount)) and resetting quality to \(Int(quality * 100))%")
                                continue
                            }
                        }
                    }
                    // Return best attempt if we can't compress further
                    print("⚠️ Image compressed to \(data.count / 1024)KB (target: \(targetSizeKB)KB) - minimum quality reached")
                    return data
                }
            } else {
                // If compression fails, return nil
                print("❌ Failed to compress image")
                return nil
            }
        }
        
        // Return the last successful compression
        return imageData
    }
    
    /// Resize image to specific size
    /// - Parameter size: Target size
    /// - Returns: Resized image or nil if resizing fails
    private func resize(to size: CGSize) -> UIImage? {
        UIGraphicsBeginImageContextWithOptions(size, false, scale)
        defer { UIGraphicsEndImageContext() }
        draw(in: CGRect(origin: .zero, size: size))
        return UIGraphicsGetImageFromCurrentImageContext()
    }
}

extension UIView{
    func viewBorder(){
        self.clipsToBounds = true
        self.layer.cornerRadius = 3
        self.layer.borderColor = APP_TONE_COLOR.cgColor
    }
}
extension UIButton{
    func buttonBorder() {
        self.backgroundColor = APP_TONE_COLOR
        self.setTitleColor(UIColor.white, for: .normal)
        self.layer.cornerRadius = 3
    }
    func setTitleWithOutAnimation(title: String?) {
        UIView.setAnimationsEnabled(false)
        
        setTitle(title, for: .normal)
        
        layoutIfNeeded()
        UIView.setAnimationsEnabled(true)
    }
}


extension TimeInterval {
    var milliseconds: Int {
        return Int((truncatingRemainder(dividingBy: 1)) * 1000)
    }
    
    var seconds: Int {
        return Int(self) % 60
    }
    
    var minutes: Int {
        return (Int(self) / 60 ) % 60
    }
    
    var hours: Int {
        return Int(self) / 3600
    }
    
    var stringTime: String {
        if hours != 0 {
            return "\(hours)h \(minutes)m \(seconds)s"
        } else if minutes != 0 {
            return "\(minutes)m \(seconds)s"
        } else if milliseconds != 0 {
            return "\(seconds)s \(milliseconds)ms"
        } else {
            return "\(seconds)s"
        }
    }
}

extension Locale {
    static var preferredLanguageCode: String {
        guard let preferredLanguage = preferredLanguages.first,
              let code = Locale(identifier: preferredLanguage).languageCode else {
            return "en"
        }
        return code
    }
    
    static var preferredLanguageCodes: [String] {
        return Locale.preferredLanguages.compactMap({Locale(identifier: $0).languageCode})
    }
}

extension Date {
    func orderDateCode() -> String?{
        
        let formatter = DateFormatter()
        formatter.dateFormat = "ddMMYY"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: self)
        
    }
    func startOfMonth() -> Date {
        let components = Calendar.current.dateComponents([.year, .month], from: self)
        return Calendar.current.date(from: components)!
    }
    
    func endOfMonth() -> Date {
        let components:NSDateComponents = Calendar.current.dateComponents([.year, .month], from: self) as NSDateComponents
        components.month += 1
        components.day = 1
        components.day -= 1
        return Calendar.current.date(from: components as DateComponents)!
    }
    func startOfDay() -> Date {
        //For Start Date
        var calendar = Calendar.current
        calendar.timeZone = TimeZone.current
        let dateAtMidnight = calendar.startOfDay(for: self)
        return dateAtMidnight
    }
    
    func endOfDay() -> Date{
        
        var calendar = Calendar.current
        calendar.timeZone = TimeZone.current
        
        //For End Date
        var components = DateComponents()
        components.day = 1
        components.second = -1
        let endDay = calendar.date(byAdding: components, to: startOfDay())!
        return endDay
    }

    var daysOfMonth: [Date] {
        let dateOfMonth = self.startOfMonth()
        let calendar = Calendar.current
        let range = calendar.range(of: .day, in: .month, for: self)!
        return range.compactMap{ calendar.date(byAdding: .day, value: $0, to: dateOfMonth)}
    }
    
    func dateInStringParam() -> String?{
        
        let formatter = DateFormatter()
        formatter.dateFormat = DATE_STRING_FULL_FORMAT
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: self)
        
    }
    
    
    
    func dateInString() -> String?{
        
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yy"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: self)
        
    }
    
    /// Format date with time: "dd/MM/yy HH:mm"
    func dateTimeInString() -> String?{
        
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yy HH:mm"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.string(from: self)
        
    }
    
    func fullDateInString() -> String?{
        
        let formatter = DateFormatter()
        formatter.dateFormat = "H:mm dd/MM/yyyy"
        formatter.locale = Locale(identifier: "vi_VN")
        return formatter.string(from: self)
        
    }
    func dateServerInString() -> String?{
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        return formatter.string(from: self)
        
    }
    
    func dateServerISOString() -> String?{
        
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(abbreviation: "UTC")
        return formatter.string(from: self)
        
    }
    
    func getMonth() -> Int{
        let calendar = Calendar.current
        let month = calendar.component(.month, from: self)
        return month
    }
    func getYear() -> Int{
        let calendar = Calendar.current
        let year = calendar.component(.year, from: self)
        return year
    }
    
    func dateByAddingDays(inDays: NSInteger)->Date{
        return Calendar.current.date(byAdding: .day, value: inDays, to: self)!
    }
    
    static func dates(from fromDate: Date, to toDate: Date) -> [Date] {
        var dates: [Date] = []
        var date = fromDate
        
        while date <= toDate {
            dates.append(date)
            guard let newDate = Calendar.current.date(byAdding: .day, value: 1, to: date) else { break }
            date = newDate
        }
        return dates
    }
    static func days(from startDate: Date,to endDate: Date) -> Int {
        return abs(Calendar.current.dateComponents([.day], from: startDate, to: endDate).day!)
    }
    
    func isBetween(_ date1: Date, and date2: Date) -> Bool {
        return (min(date1, date2) ... max(date1, date2)).contains(self)
    }
}

public extension UIDevice {
    
    static let modelName: String = {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        let identifier = machineMirror.children.reduce("") { identifier, element in
            guard let value = element.value as? Int8, value != 0 else { return identifier }
            return identifier + String(UnicodeScalar(UInt8(value)))
        }
        
        func mapToDevice(identifier: String) -> String { // swiftlint:disable:this cyclomatic_complexity
            #if os(iOS)
            switch identifier {
            case "iPod5,1":                                 return "iPod Touch 5"
            case "iPod7,1":                                 return "iPod Touch 6"
            case "iPhone3,1", "iPhone3,2", "iPhone3,3":     return "iPhone 4"
            case "iPhone4,1":                               return "iPhone 4s"
            case "iPhone5,1", "iPhone5,2":                  return "iPhone 5"
            case "iPhone5,3", "iPhone5,4":                  return "iPhone 5c"
            case "iPhone6,1", "iPhone6,2":                  return "iPhone 5s"
            case "iPhone7,2":                               return "iPhone 6"
            case "iPhone7,1":                               return "iPhone 6 Plus"
            case "iPhone8,1":                               return "iPhone 6s"
            case "iPhone8,2":                               return "iPhone 6s Plus"
            case "iPhone9,1", "iPhone9,3":                  return "iPhone 7"
            case "iPhone9,2", "iPhone9,4":                  return "iPhone 7 Plus"
            case "iPhone8,4":                               return "iPhone SE"
            case "iPhone10,1", "iPhone10,4":                return "iPhone 8"
            case "iPhone10,2", "iPhone10,5":                return "iPhone 8 Plus"
            case "iPhone10,3", "iPhone10,6":                return "iPhone X"
            case "iPhone11,2":                              return "iPhone XS"
            case "iPhone11,4", "iPhone11,6":                return "iPhone XS Max"
            case "iPhone11,8":                              return "iPhone XR"
            case "iPad2,1", "iPad2,2", "iPad2,3", "iPad2,4":return "iPad 2"
            case "iPad3,1", "iPad3,2", "iPad3,3":           return "iPad 3"
            case "iPad3,4", "iPad3,5", "iPad3,6":           return "iPad 4"
            case "iPad4,1", "iPad4,2", "iPad4,3":           return "iPad Air"
            case "iPad5,3", "iPad5,4":                      return "iPad Air 2"
            case "iPad6,11", "iPad6,12":                    return "iPad 5"
            case "iPad7,5", "iPad7,6":                      return "iPad 6"
            case "iPad2,5", "iPad2,6", "iPad2,7":           return "iPad Mini"
            case "iPad4,4", "iPad4,5", "iPad4,6":           return "iPad Mini 2"
            case "iPad4,7", "iPad4,8", "iPad4,9":           return "iPad Mini 3"
            case "iPad5,1", "iPad5,2":                      return "iPad Mini 4"
            case "iPad6,3", "iPad6,4":                      return "iPad Pro 9.7 Inch"
            case "iPad6,7", "iPad6,8":                      return "iPad Pro 12.9 Inch"
            case "iPad7,1", "iPad7,2":                      return "iPad Pro 12.9 Inch 2. Generation"
            case "iPad7,3", "iPad7,4":                      return "iPad Pro 10.5 Inch"
            case "AppleTV5,3":                              return "Apple TV"
            case "AppleTV6,2":                              return "Apple TV 4K"
            case "AudioAccessory1,1":                       return "HomePod"
            case "i386", "x86_64":                          return "Simulator \(mapToDevice(identifier: ProcessInfo().environment["SIMULATOR_MODEL_IDENTIFIER"] ?? "iOS"))"
            default:                                        return identifier
            }
            #elseif os(tvOS)
            switch identifier {
            case "AppleTV5,3": return "Apple TV 4"
            case "AppleTV6,2": return "Apple TV 4K"
            case "i386", "x86_64": return "Simulator \(mapToDevice(identifier: ProcessInfo().environment["SIMULATOR_MODEL_IDENTIFIER"] ?? "tvOS"))"
            default: return identifier
            }
            #endif
        }
        
        return mapToDevice(identifier: identifier)
    }()
    static func batteryLevel() -> String{
        UIDevice.current.isBatteryMonitoringEnabled = true
        return "\(Int(UIDevice.current.batteryLevel * 100))"
    }
    static func deviceInfo()-> String{
        return "\(UIDevice.modelName) - iOS \(UIDevice.current.systemVersion) - Battery \(UIDevice.batteryLevel())%"
    }
  
    static func vibrate() {
        AudioServicesPlaySystemSound(kSystemSoundID_Vibrate)
    }
    static func deviceVersion() -> String{
        let systemVersion = UIDevice.current.systemVersion
        return systemVersion
    }
    static func getAppInfo()->String {
        let dictionary = Bundle.main.infoDictionary!
        let version = dictionary["CFBundleShortVersionString"] as! String
        let build = dictionary["CFBundleVersion"] as! String
        return version
    }
    
}


extension UISearchBar {
    var textField: UITextField? { return value(forKey: "searchField") as? UITextField }
    var placeholderLabel: UILabel? { return textField?.value(forKey: "placeholderLabel") as? UILabel }
    var icon: UIImageView? { return textField?.leftView as? UIImageView }
    var iconColor: UIColor? {
        get {
            return icon?.tintColor
        }
        set {
            icon?.image = icon?.image?.withRenderingMode(.alwaysTemplate)
            icon?.tintColor = newValue
        }
    }
}

// MARK: - PDFDocument Extension for Image Conversion
extension PDFDocument {
    /// Convert PDF to UIImage (first page)
    /// - Parameter scale: Scale factor for the image (default: 2.0 for retina quality)
    /// - Returns: UIImage of the PDF, or nil if conversion fails
    func toImage(scale: CGFloat = 2.0) -> UIImage? {
        guard let firstPage = page(at: 0) else { return nil }
        
        let pageRect = firstPage.bounds(for: .mediaBox)
        let renderer = UIGraphicsImageRenderer(size: pageRect.size)
        
        let image = renderer.image { context in
            // Fill white background
            UIColor.white.setFill()
            context.fill(pageRect)
            
            // Draw PDF page
            context.cgContext.translateBy(x: 0, y: pageRect.size.height)
            context.cgContext.scaleBy(x: 1.0, y: -1.0)
            firstPage.draw(with: .mediaBox, to: context.cgContext)
        }
        
        return image
    }
    
    /// Convert PDF to JPG data
    /// - Parameters:
    ///   - quality: JPEG quality (0.0 to 1.0, default: 0.8)
    ///   - scale: Scale factor for the image (default: 2.0)
    ///   - cropWhiteSpace: Whether to crop white space from bottom (default: true)
    /// - Returns: JPG data, or nil if conversion fails
    func toJPGData(quality: CGFloat = 0.8, scale: CGFloat = 2.0, cropWhiteSpace: Bool = true) -> Data? {
        guard var image = toImage(scale: scale) else { return nil }
        
        // Crop white space from bottom if requested
        if cropWhiteSpace, let croppedImage = image.cropBottomWhiteSpace() {
            image = croppedImage
        }
        
        return image.jpeg(.high) ?? UIImageJPEGRepresentation(image, quality)
    }
    
    /// Save PDF as JPG file
    /// - Parameters:
    ///   - url: URL to save the JPG file
    ///   - quality: JPEG quality (0.0 to 1.0, default: 0.8)
    ///   - scale: Scale factor for the image (default: 2.0)
    ///   - cropWhiteSpace: Whether to crop white space from bottom (default: true)
    /// - Returns: URL of saved file, or nil if saving fails
    func saveAsJPG(to url: URL, quality: CGFloat = 0.8, scale: CGFloat = 2.0, cropWhiteSpace: Bool = true) -> URL? {
        guard let jpgData = toJPGData(quality: quality, scale: scale, cropWhiteSpace: cropWhiteSpace) else { return nil }
        
        do {
            try jpgData.write(to: url)
            return url
        } catch {
            print("Failed to save JPG: \(error)")
            return nil
        }
    }
}
