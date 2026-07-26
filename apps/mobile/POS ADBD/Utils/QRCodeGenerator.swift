//
//  QRCodeGenerator.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import UIKit
import CoreImage

// MARK: - QR Code Generator
class QRCodeGenerator {
    static let shared = QRCodeGenerator()
    
    private init() {}
    
    /// Generate QR code image từ string
    /// - Parameters:
    ///   - qrString: VietQR EMV QR Code string
    ///   - size: Kích thước QR code (default: 300x300)
    ///   - color: Màu QR code (default: black)
    ///   - backgroundColor: Màu nền (default: white)
    /// - Returns: UIImage của QR code hoặc nil nếu lỗi
    func generateQRCode(
        from qrString: String,
        size: CGSize = CGSize(width: 300, height: 300),
        color: UIColor = .black,
        backgroundColor: UIColor = .white
    ) -> UIImage? {
        // Convert string to Data
        guard let data = qrString.data(using: .utf8) else {
            print("❌ Error: Cannot convert QR string to Data")
            return nil
        }
        
        // Create CIFilter for QR code generation
        guard let filter = CIFilter(name: "CIQRCodeGenerator") else {
            print("❌ Error: CIQRCodeGenerator filter not available")
            return nil
        }
        
        // Set input message
        filter.setValue(data, forKey: "inputMessage")
        
        // Set error correction level (L, M, Q, H)
        // H = High (30% error correction) - recommended for payment QR codes
        filter.setValue("H", forKey: "inputCorrectionLevel")
        
        // Get output image
        guard let ciImage = filter.outputImage else {
            print("❌ Error: Cannot generate CIImage")
            return nil
        }
        
        // Scale image to desired size
        let scaleX = size.width / ciImage.extent.width
        let scaleY = size.height / ciImage.extent.height
        let transformedImage = ciImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        // Create context for rendering
        let context = CIContext(options: nil)
        guard let cgImage = context.createCGImage(transformedImage, from: transformedImage.extent) else {
            print("❌ Error: Cannot create CGImage")
            return nil
        }
        
        // Create UIImage
        let uiImage = UIImage(cgImage: cgImage)
        
        // Apply colors if needed
        if color != .black || backgroundColor != .white {
            return applyColors(to: uiImage, color: color, backgroundColor: backgroundColor)
        }
        
        return uiImage
    }
    
    /// Apply custom colors to QR code
    private func applyColors(to image: UIImage, color: UIColor, backgroundColor: UIColor) -> UIImage? {
        guard let cgImage = image.cgImage else { return nil }
        
        let width = cgImage.width
        let height = cgImage.height
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
            space: CGColorSpaceCreateDeviceRGB(),
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
        ) else {
            return nil
        }
        
        context.draw(cgImage, in: CGRect(x: 0, y: 0, width: width, height: height))
        
        // Get color components
        var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
        var bgRed: CGFloat = 0, bgGreen: CGFloat = 0, bgBlue: CGFloat = 0, bgAlpha: CGFloat = 0
        
        color.getRed(&red, green: &green, blue: &blue, alpha: &alpha)
        backgroundColor.getRed(&bgRed, green: &bgGreen, blue: &bgBlue, alpha: &bgAlpha)
        
        // Apply colors
        for i in 0..<width * height {
            let pixelIndex = i * bytesPerPixel
            let pixelValue = pixelData[pixelIndex]
            
            if pixelValue == 0 {
                // Black pixel -> apply foreground color
                pixelData[pixelIndex] = UInt8(red * 255)
                pixelData[pixelIndex + 1] = UInt8(green * 255)
                pixelData[pixelIndex + 2] = UInt8(blue * 255)
                pixelData[pixelIndex + 3] = UInt8(alpha * 255)
            } else {
                // White pixel -> apply background color
                pixelData[pixelIndex] = UInt8(bgRed * 255)
                pixelData[pixelIndex + 1] = UInt8(bgGreen * 255)
                pixelData[pixelIndex + 2] = UInt8(bgBlue * 255)
                pixelData[pixelIndex + 3] = UInt8(bgAlpha * 255)
            }
        }
        
        guard let newCGImage = context.makeImage() else { return nil }
        return UIImage(cgImage: newCGImage)
    }
}

