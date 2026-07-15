//
//  PrintCommand.swift
//  POS ADBD
//
//  Created by Trinh Tran on 22/3/25.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import UIKit

class PrinterCommand {
    // MARK: - Command Constants
    private enum Command {
        static let ESC: UInt8 = 0x1B
        static let GS: UInt8 = 0x1D
        static let LF: UInt8 = 0x0A
        static let CR: UInt8 = 0x0D
        static let HT: UInt8 = 0x09
        static let FF: UInt8 = 0x0C
    }

    // MARK: - Text Formatting
    static func initializePrinter() -> Data {
        return Data([Command.ESC, 0x40])  // ESC @
    }

    static func selectAlignment(_ alignment: Int) -> Data {
        return Data([Command.ESC, 0x61, UInt8(alignment)])  // ESC a n
    }

    static func selectOrCancleBoldModel(_ bold: Int) -> Data {
        return Data([Command.ESC, 0x45, UInt8(bold)])  // ESC E n
    }

    static func selectOrCancleUnderlineModel(_ underline: Int) -> Data {
        return Data([Command.ESC, 0x2D, UInt8(underline)])  // ESC - n
    }

    static func selectOrCancleDoubleWidthModel(_ doubleWidth: Int) -> Data {
        return Data([Command.ESC, 0x21, UInt8(doubleWidth)])  // ESC ! n
    }

    static func selectOrCancleDoubleHeightModel(_ doubleHeight: Int) -> Data {
        return Data([Command.ESC, 0x21, UInt8(doubleHeight << 4)])  // ESC ! n
    }

    // MARK: - Line Spacing
    static func setLineSpacing(_ spacing: Int) -> Data {
        return Data([Command.ESC, 0x33, UInt8(spacing)])  // ESC 3 n
    }

    static func setDefaultLineSpacing() -> Data {
        return Data([Command.ESC, 0x32])  // ESC 2
    }

    // MARK: - Paper Feed
    static func feedPaper(_ lines: Int = 1) -> Data {
        return Data([Command.ESC, 0x4A, UInt8(lines)])  // ESC J n
    }

    static func cutPaper() -> Data {
        return Data([Command.GS, 0x56, 0x41, 0x00])  // GS V A 0
    }

    // In PrinterCommand class
    static func printBarcode(_ data: String, type: BarcodeType = .code128) -> Data {
        var command = Data()

        // Set barcode height (optional, 162 dots = ~2 inches)
        command.append(Data([Command.GS, 0x68, 0xA2]))

        // Set barcode width (optional, 3 = medium width)
        command.append(Data([Command.GS, 0x77, 0x03]))

        // Select barcode type and print
        let barcodeData = data.data(using: .ascii)!
        let length = barcodeData.count

        switch type {
        case .code128:
            command.append(Data([Command.GS, 0x6B, 0x49]))  // GS k 73 for Code128
            command.append(Data([UInt8(length)]))  // Length of data
            command.append(barcodeData)

        case .code39:
            command.append(Data([Command.GS, 0x6B, 0x04]))  // GS k 4 for Code39
            command.append(barcodeData)
            command.append(Data([0x00]))  // Null terminator

        case .upcA:
            command.append(Data([Command.GS, 0x6B, 0x00]))  // GS k 0 for UPC-A
            command.append(barcodeData)
            command.append(Data([0x00]))  // Null terminator

        case .upcE:
            command.append(Data([Command.GS, 0x6B, 0x01]))  // GS k 1 for UPC-E
            command.append(barcodeData)
            command.append(Data([0x00]))  // Null terminator
        }

        // Add line feed after barcode
        command.append(Data([Command.LF]))

        return command
    }

    // MARK: - QR Code Commands
    static func printQRCode(_ data: String, size: Int = 8) -> Data {
        var command = Data()

        // Select QR code model
        command.append(Data([Command.GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, UInt8(size)]))

        // Store QR code data
        let dataLength = data.count + 3
        command.append(
            Data([
                Command.GS, 0x28, 0x6B, UInt8(dataLength & 0xFF), UInt8(dataLength >> 8), 0x31,
                0x50, 0x30,
            ]))
        command.append(data.data(using: .ascii)!)

        // Print QR code
        command.append(Data([Command.GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]))

        return command
    }

    // MARK: - Image Commands
    static func printImage(_ image: UIImage, width: Int) -> Data {
        // Convert image to bitmap data
        guard let bitmapData = UIImagePNGRepresentation(image) else { return Data() }

        var command = Data()

        // Select bit image mode
        command.append(Data([Command.ESC, 0x2A, 0x00, UInt8(width & 0xFF), UInt8(width >> 8)]))

        // Add image data
        command.append(bitmapData)

        return command
    }

    // MARK: - Character Set
    static func selectCharacterSet(_ set: Int) -> Data {
        return Data([Command.ESC, 0x52, UInt8(set)])  // ESC R n
    }

    // MARK: - Code Page
    static func selectCodePage(_ page: Int) -> Data {
        return Data([Command.ESC, 0x74, UInt8(page)])  // ESC t n
    }
}

// MARK: - Supporting Types
extension PrinterCommand {
    enum BarcodeType {
        case code128
        case code39
        case upcA
        case upcE
    }

    enum Alignment: Int {
        case left = 0
        case center = 1
        case right = 2
    }
}
