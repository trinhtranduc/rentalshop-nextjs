import UIKit
import Network
// import CoreBluetooth  // Bluetooth disabled

enum PrinterError: Error {
    case connectionFailed
    case writeFailed
    case invalidData
    case printerNotFound
    case disconnected
    case timeout
    
    var localizedDescription: String {
        switch self {
        case .connectionFailed:
            return "Failed to connect to printer"
        case .writeFailed:
            return "Failed to write data to printer"
        case .invalidData:
            return "Invalid data for printing"
        case .printerNotFound:
            return "Printer not found"
        case .disconnected:
            return "Printer disconnected"
        case .timeout:
            return "Printer connection timeout"
        }
    }
}

// MARK: - Paper Size Management
enum PaperSize: Int {
    case k80 = 80  // Standard 80mm paper
    case k58 = 58  // 58mm paper
    case k50 = 50  // 50mm paper
    
    var width: Int {
        return self.rawValue
    }
    
    var charactersPerLine: Int {
        switch self {
        case .k80:
            return 42  // Standard 80mm paper can fit 42 characters
        case .k58:
            return 32  // 58mm paper can fit 32 characters
        case .k50:
            return 28  // 50mm paper can fit 28 characters
        }
    }
}

class PrinterManager: NSObject {
    static let shared = PrinterManager()
    
    // Network printing properties
    private var connection: NWConnection?
    private var isNetworkConnected = false
    private var currentHost: String?
    private var currentPort: UInt16 = 9100
    private let timeout: TimeInterval = 5.0
    private let maxRetryAttempts = 2  // Số lần retry tối đa
    private var isConnecting = false  // Flag để tránh multiple simultaneous connections
    
    // Bluetooth printing properties - DISABLED
    // private var centralManager: CBCentralManager?
    // private var connectedPeripheral: CBPeripheral?
    // private var printService: CBService?
    // private var printCharacteristic: CBCharacteristic?
    // private var isBluetoothConnected = false
    
    private var currentPaperSize: PaperSize = .k80  // Default to 80mm
    
    private override init() {
        super.init()
        // centralManager = CBCentralManager(delegate: self, queue: nil)  // Bluetooth disabled
        
        // Try to restore saved Bluetooth printer connection
        // restoreBluetoothConnection()  // Bluetooth disabled
        
        // Load saved paper size
        loadSavedPaperSize()
    }
    
    // MARK: - Connection Methods
    
    func connect(ip: String, port: UInt16 = 9100, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        // Validate IP address
        guard !ip.isEmpty else {
            Swift.print("Error: Empty IP address")
            completion(.failure(.printerNotFound))
            return
        }
        
        // Check if already connected to the same IP and port
        if isNetworkConnected, let host = currentHost, host == ip, currentPort == port {
            Swift.print("Already connected to network printer at \(ip):\(port)")
            completion(.success(()))
            return
        }
        
        // If connecting to different IP or disconnected, disconnect first
        if isNetworkConnected || isConnecting {
            Swift.print("Disconnecting from previous connection to connect to \(ip):\(port)")
            disconnectNetwork()
        }
        
        // Prevent multiple simultaneous connections
        guard !isConnecting else {
            Swift.print("Connection already in progress, waiting...")
            // Wait a bit and retry
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.connect(ip: ip, port: port, completion: completion)
            }
            return
        }
        
        isConnecting = true
        
        currentHost = ip
        currentPort = port
        
        Swift.print("Attempting to connect to network printer at \(ip):\(port)")
        
        let host = NWEndpoint.Host(ip)
        let port = NWEndpoint.Port(rawValue: port)!
        
        connection = NWConnection(host: host, port: port, using: .tcp)
        
        // Set up state update handler
        connection?.stateUpdateHandler = { [weak self] state in
            guard let self = self else { return }
            
            switch state {
            case .ready:
                self.isNetworkConnected = true
                self.isConnecting = false
                Swift.print("Successfully connected to network printer at \(ip):\(port)")
                completion(.success(()))
                
            case .failed(let error):
                self.isNetworkConnected = false
                self.isConnecting = false
                Swift.print("Network connection failed to \(ip):\(port) - \(error.localizedDescription)")
                self.disconnectNetwork()
                completion(.failure(.connectionFailed))
                
            case .cancelled:
                self.isNetworkConnected = false
                self.isConnecting = false
                Swift.print("Network connection cancelled to \(ip):\(port)")
                self.disconnectNetwork()
                completion(.failure(.disconnected))
                
            case .setup:
                Swift.print("Setting up network connection to \(ip)")
                
            case .preparing:
                Swift.print("Preparing network connection to \(ip)")
                
            case .waiting(let error):
                self.isNetworkConnected = false
                self.isConnecting = false
                Swift.print("Network connection waiting to \(ip): \(error.localizedDescription)")
                self.disconnectNetwork()
                completion(.failure(.connectionFailed))
            @unknown default:
                Swift.print("Unknown network connection state for \(ip)")
                break
            }
        }
        
        // Set up path update handler
        connection?.pathUpdateHandler = { [weak self] path in
            if path.status == .satisfied {
                Swift.print("Network path satisfied for \(ip)")
            } else if path.status == .unsatisfied {
                Swift.print("Network path unsatisfied for \(ip)")
                self?.disconnectNetwork()
                completion(.failure(.connectionFailed))
            }
        }
        
        // Start connection with timeout
        connection?.start(queue: .main)
        
        // Set up timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + timeout) { [weak self] in
            guard let self = self else { return }
            if !self.isNetworkConnected && self.isConnecting {
                Swift.print("Network connection timeout to \(ip):\(port)")
                self.isConnecting = false
                self.disconnectNetwork()
                completion(.failure(.timeout))
            }
        }
    }
    
    // func connectBluetooth(peripheral: CBPeripheral, completion: @escaping (Result<Void, PrinterError>) -> Void) {
    //     // Bluetooth disabled
    //     completion(.failure(.connectionFailed))
    // }
    
    func disconnectNetwork() {
        connection?.cancel()
        connection = nil
        isNetworkConnected = false
        isConnecting = false
        currentHost = nil
    }
    
    // func disconnectBluetooth() {
    //     // Bluetooth disabled
    // }
    
    // MARK: - Bluetooth Synchronization - DISABLED
    
    // func syncBluetoothConnection(peripheral: CBPeripheral) {
    //     // Bluetooth disabled
    // }
    
    // func syncBluetoothCharacteristics(service: CBService, characteristic: CBCharacteristic) {
    //     // Bluetooth disabled
    // }
    
    // func syncBluetoothDisconnection() {
    //     // Bluetooth disabled
    // }
    
    // private func restoreBluetoothConnection() {
    //     // Bluetooth disabled
    // }
    
    // private func attemptRestoreBluetoothConnection() {
    //     // Bluetooth disabled
    // }
    
    func disconnect() {
        disconnectNetwork()
        // disconnectBluetooth()  // Bluetooth disabled
    }
    
    // MARK: - Debug Methods
    
    func debugConnectionStatus() {
        Swift.print("=== PrinterManager Debug Status ===")
        // Swift.print("isBluetoothConnected: \(isBluetoothConnected)")  // Bluetooth disabled
        // Swift.print("connectedPeripheral: \(connectedPeripheral?.name ?? "nil")")  // Bluetooth disabled
        // Swift.print("printService: \(printService?.uuid.uuidString ?? "nil")")  // Bluetooth disabled
        // Swift.print("printCharacteristic: \(printCharacteristic?.uuid.uuidString ?? "nil")")  // Bluetooth disabled
        // Swift.print("Bluetooth state: \(centralManager?.state.rawValue ?? -1)")  // Bluetooth disabled
        // Swift.print("Bluetooth ready: \(isBluetoothReady())")  // Bluetooth disabled
        // Swift.print("Bluetooth fully ready: \(isBluetoothFullyReady())")  // Bluetooth disabled
        Swift.print("Network connected: \(isNetworkConnected)")
        Swift.print("Current host: \(currentHost ?? "nil")")
        Swift.print("================================")
    }
    
    // private func isBluetoothReady() -> Bool {
    //     // Bluetooth disabled
    //     return false
    // }
    
    // private func isBluetoothFullyReady() -> Bool {
    //     // Bluetooth disabled
    //     return false
    // }
    
    // MARK: - Paper Size Settings
    
    private func loadSavedPaperSize() {
        let savedSize = UserDefaults.standard.integer(forKey: "PrinterPaperSize")
        if let paperSize = PaperSize(rawValue: savedSize) {
            currentPaperSize = paperSize
            Swift.print("PrinterManager: Loaded saved paper size: \(paperSize.width)mm")
        } else {
            // Default to 80mm for network printers
            currentPaperSize = .k80
            Swift.print("PrinterManager: Using default paper size: \(currentPaperSize.width)mm")
        }
    }
    
    func savePaperSize(_ size: PaperSize) {
        currentPaperSize = size
        UserDefaults.standard.set(size.rawValue, forKey: "PrinterPaperSize")
        Swift.print("PrinterManager: Saved paper size: \(size.width)mm")
    }
    
    var isConnected: Bool {
        return isNetworkConnected // || isBluetoothConnected  // Bluetooth disabled
    }
    
    // MARK: - Printing Methods
    
    /// Print data using existing connection (if available)
    /// Use this when you want to keep connection open for multiple prints
    func print(data: Data, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        printNetwork(data: data, completion: completion)
    }
    
    /// Print data with automatic connection management (RECOMMENDED)
    /// This method creates a new connection, prints, and disconnects automatically
    /// Perfect for multiple devices printing to the same printer
    /// - Parameters:
    ///   - data: The print data to send
    ///   - ip: Printer IP address
    ///   - port: Printer port (default: 9100)
    ///   - completion: Completion handler with result
    func printWithConnection(data: Data, ip: String, port: UInt16 = 9100, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        // Validate IP
        guard !ip.isEmpty else {
            Swift.print("Error: Empty IP address for printWithConnection")
            completion(.failure(.printerNotFound))
            return
        }
        
        Swift.print("🖨️ Starting print job to \(ip):\(port) (connection-per-request)")
        
        // Create a new connection for this print job
        let host = NWEndpoint.Host(ip)
        let endpointPort = NWEndpoint.Port(rawValue: port)!
        let printConnection = NWConnection(host: host, port: endpointPort, using: .tcp)
        
        // Use DispatchSemaphore to prevent race conditions
        let completionLock = DispatchSemaphore(value: 1)
        var hasCompleted = false
        
        // Thread-safe completion wrapper
        let safeCompletion: (Result<Void, PrinterError>) -> Void = { result in
            completionLock.wait()
            defer { completionLock.signal() }
            
            if !hasCompleted {
                hasCompleted = true
                completion(result)
            } else {
                Swift.print("⚠️ Duplicate completion call prevented")
            }
        }
        
        var connectionEstablished = false
        
        // Set up state handler
        printConnection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                if !connectionEstablished {
                    connectionEstablished = true
                    Swift.print("✅ Connected to printer \(ip):\(port), sending data...")
                    
                    // Send print data
                    printConnection.send(content: data, completion: .contentProcessed { error in
                        if let error = error {
                            Swift.print("❌ Print send error: \(error.localizedDescription)")
                            printConnection.cancel()
                            safeCompletion(.failure(.writeFailed))
                        } else {
                            Swift.print("✅ Print data sent successfully, waiting for confirmation...")
                            // Wait a bit longer to ensure printer processes the data
                            // Most printers need 100-200ms to process ESC/POS commands
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                                printConnection.cancel()
                                safeCompletion(.success(()))
                            }
                        }
                    })
                }
                
            case .failed(let error):
                Swift.print("❌ Connection failed to \(ip):\(port) - \(error.localizedDescription)")
                printConnection.cancel()
                safeCompletion(.failure(.connectionFailed))
                
            case .cancelled:
                Swift.print("🔌 Connection cancelled to \(ip):\(port)")
                // Only log, don't call completion if already completed
                
            case .waiting(let error):
                Swift.print("⏳ Connection waiting to \(ip):\(port) - \(error.localizedDescription)")
                
            default:
                break
            }
        }
        
        // Set up timeout with proper cleanup
        let timeoutWorkItem = DispatchWorkItem {
            if !connectionEstablished && !hasCompleted {
                Swift.print("⏱️ Connection timeout to \(ip):\(port)")
                printConnection.cancel()
                safeCompletion(.failure(.timeout))
            }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + timeout, execute: timeoutWorkItem)
        
        // Start connection
        printConnection.start(queue: .main)
    }
    
    /// Print using existing connection (for backward compatibility)
    private func printNetwork(data: Data, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        // Check connection status
        guard isNetworkConnected, let connection = connection else {
            Swift.print("⚠️ Printer not connected, attempting to reconnect...")
            // Try to reconnect if we have a saved IP
            if let savedIP = currentHost {
                connect(ip: savedIP, port: currentPort) { [weak self] result in
                    switch result {
                    case .success:
                        // Retry printing after reconnection
                        self?.printNetwork(data: data, completion: completion)
                    case .failure(let error):
                        completion(.failure(error))
                    }
                }
            } else {
                completion(.failure(.disconnected))
            }
            return
        }
        
        // Send data with error handling
        connection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                Swift.print("Network send error: \(error.localizedDescription)")
                // Check if connection is still valid
                if case .ready = connection.state {
                    completion(.failure(.writeFailed))
                } else {
                    // Connection lost, mark as disconnected
                    self.isNetworkConnected = false
                    completion(.failure(.disconnected))
                }
            } else {
                Swift.print("Data sent successfully to printer")
                completion(.success(()))
            }
        })
    }
    
    // private func printBluetooth(data: Data, completion: @escaping (Result<Void, PrinterError>) -> Void) {
    //     // Bluetooth disabled
    //     completion(.failure(.disconnected))
    // }
    
    // MARK: - ESC/POS Commands
    
    func initializePrinter(completion: @escaping (Result<Void, PrinterError>) -> Void) {
        let command = Data([0x1B, 0x40]) // ESC @
        print(data: command, completion: completion)
    }
    
    func printText(_ text: String, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        guard let data = text.data(using: .ascii) else {
            completion(.failure(.invalidData))
            return
        }
        print(data: data, completion: completion)
    }
    
    func printBarcode(_ barcode: String, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        var command = Data([0x1D, 0x6B, 0x45]) // Select barcode type
        command.append(barcode.data(using: .ascii) ?? Data())
        print(data: command, completion: completion)
    }
    
    func cutPaper(completion: @escaping (Result<Void, PrinterError>) -> Void) {
        let command = Data([0x1D, 0x56, 0x00]) // GS V 0
        print(data: command, completion: completion)
    }
    
    func feedPaper(lines: UInt8 = 1, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        let command = Data([0x1B, 0x64, lines]) // ESC d n
        print(data: command, completion: completion)
    }
    
    func printImage(_ image: UIImage, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        guard let imageData = image.jpeg(.low) else {
            completion(.failure(.invalidData))
            return
        }
        
        // Add image printing commands
        var command = Data([0x1D, 0x76, 0x30, 0x00]) // Select bit image mode
        command.append(imageData)
        print(data: command, completion: completion)
    }
    
    // MARK: - Convenience Methods
    
    /// Print bill using connection-per-request pattern (RECOMMENDED for multiple devices)
    func printBill(data: NSMutableData, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        let printerIP = Utils.loadBillPrinter()
        guard !printerIP.isEmpty else {
            completion(.failure(.printerNotFound))
            return
        }
        // Use connection-per-request for better multi-device support
        printWithConnection(data: data as Data, ip: printerIP, port: 9100, completion: completion)
    }
    
    /// Print bill using persistent connection (for backward compatibility)
    func printBillWithPersistentConnection(data: NSMutableData, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        let printerIP = Utils.loadBillPrinter()
        connect(ip: printerIP) { [weak self] result in
            switch result {
            case .success:
                self?.print(data: data as Data, completion: completion)
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    func printLabel(data: NSMutableData, completion: @escaping (Result<Void, PrinterError>) -> Void) {
//        let printerIP = Utils.loadLabePrinter()
//        connect(ip: printerIP) { [weak self] result in
//            switch result {
//            case .success:
//                self?.print(data: data as Data, completion: completion)
//            case .failure(let error):
//                completion(.failure(error))
//            }
//        }
    }
    
    // MARK: - Order Printing Methods
    
    func printOrder(_ order: Order, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        // let printMethod = Utils.loadPrintMethod()  // Bluetooth disabled
        
        // if printMethod == "bluetooth" {
        //     printOrderBluetooth(order, completion: completion)
        // } else {
            printOrderNetwork(order, completion: completion)
        // }
    }
    
    private func printOrderNetwork(_ order: Order, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        // Get printer IP from settings
        let printerIP = Utils.loadBillPrinter()
        
        // Validate printer IP
        guard !printerIP.isEmpty else {
            Swift.print("Error: No printer IP configured")
            completion(.failure(.printerNotFound))
            return
        }
        
        // Get print data from order (using toPrintData() to match reference format)
        let printData = order.toPrintData()
        
        // Use connection-per-request pattern (RECOMMENDED)
        // This is the standard approach for network printing:
        // - Creates a new connection for each print job
        // - Automatically manages connection lifecycle
        // - Thread-safe with proper error handling
        // - No race conditions with state handlers
        // - Perfect for multiple devices printing to the same printer
        printWithConnection(data: printData, ip: printerIP, port: 9100, completion: completion)
    }
    
    // private func printOrderBluetooth(_ order: Order, completion: @escaping (Result<Void, PrinterError>) -> Void) {
    //     // Bluetooth disabled
    //     completion(.failure(.printerNotFound))
    // }
    
    // MARK: - Test Methods
    
    /// Gửi test print với connection tự động (RECOMMENDED)
    /// Phương thức này sẽ tự động connect đến printer, in test page, và disconnect
    /// Perfect for multiple devices testing the same printer
    func testPrintWithConnection(ip: String, port: UInt16 = 9100, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        Swift.print("🖨️ Starting test print to \(ip):\(port) (connection-per-request)")
        
        // Generate test print data
        var commands = Data()
        
        // Initialize printer (ESC @)
        commands.append(Data([0x1B, 0x40]))
        
        // Set text alignment center (ESC a 1)
        commands.append(Data([0x1B, 0x61, 0x01]))
        
        // Print test header
        commands.append("========================\n".data(using: .ascii)!)
        commands.append("    TEST PRINT PAGE\n".data(using: .ascii)!)
        commands.append("========================\n".data(using: .ascii)!)
        
        // Reset alignment (ESC a 0)
        commands.append(Data([0x1B, 0x61, 0x00]))
        
        // Print test information
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        let dateString = dateFormatter.string(from: Date())
        
        commands.append("\n".data(using: .ascii)!)
        commands.append("Date: \(dateString)\n".data(using: .ascii)!)
        commands.append("Printer IP: \(ip)\n".data(using: .ascii)!)
        commands.append("Port: \(port)\n".data(using: .ascii)!)
        commands.append("Paper Size: \(currentPaperSize.width)mm\n".data(using: .ascii)!)
        
        // Print separator
        commands.append("\n".data(using: .ascii)!)
        commands.append("------------------------\n".data(using: .ascii)!)
        commands.append("If you can read this,\n".data(using: .ascii)!)
        commands.append("your printer is working!\n".data(using: .ascii)!)
        commands.append("------------------------\n".data(using: .ascii)!)
        
        // Feed paper 3 lines
        commands.append(Data([0x1B, 0x64, 3]))
        
        // Cut paper (GS V 0)
        commands.append(Data([0x1D, 0x56, 0x00]))
        
        // Use connection-per-request pattern
        printWithConnection(data: commands, ip: ip, port: port, completion: completion)
    }
    
    /// Gửi test print (yêu cầu đã connected trước)
    func sendTestPrint(completion: @escaping (Result<Void, PrinterError>) -> Void) {
        var commands = Data()
        
        // Initialize printer (ESC @)
        commands.append(Data([0x1B, 0x40]))
        
        // Set text alignment center (ESC a 1)
        commands.append(Data([0x1B, 0x61, 0x01]))
        
        // Print test header
        commands.append("========================\n".data(using: .ascii)!)
        commands.append("    TEST PRINT PAGE\n".data(using: .ascii)!)
        commands.append("========================\n".data(using: .ascii)!)
        
        // Reset alignment (ESC a 0)
        commands.append(Data([0x1B, 0x61, 0x00]))
        
        // Print test information
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        let dateString = dateFormatter.string(from: Date())
        
        commands.append("\n".data(using: .ascii)!)
        commands.append("Date: \(dateString)\n".data(using: .ascii)!)
        commands.append("Printer IP: \(currentHost ?? "N/A")\n".data(using: .ascii)!)
        commands.append("Port: \(currentPort)\n".data(using: .ascii)!)
        commands.append("Paper Size: \(currentPaperSize.width)mm\n".data(using: .ascii)!)
        
        // Print separator
        commands.append("\n".data(using: .ascii)!)
        commands.append("------------------------\n".data(using: .ascii)!)
        commands.append("If you can read this,\n".data(using: .ascii)!)
        commands.append("your printer is working!\n".data(using: .ascii)!)
        commands.append("------------------------\n".data(using: .ascii)!)
        
        // Feed paper 3 lines
        commands.append(Data([0x1B, 0x64, 3]))
        
        // Cut paper (GS V 0)
        commands.append(Data([0x1D, 0x56, 0x00]))
        
        // Print the test page
        print(data: commands) { result in
            switch result {
            case .success:
                Swift.print("Test print sent successfully")
                completion(.success(()))
            case .failure(let error):
                Swift.print("Test print failed: \(error.localizedDescription)")
                completion(.failure(error))
            }
        }
    }
    
    // MARK: - Paper Size Methods
    
    func setPaperSize(_ size: PaperSize, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        guard isConnected else {
            completion(.failure(.disconnected))
            return
        }
        
        // Store the new paper size
        currentPaperSize = size
        
        // ESC/POS commands for paper size
        var command = Data()
        
        // Set character width (1-6)
        let charWidth = 1  // Default character width
        command.append(Data([0x1B, 0x21, UInt8(charWidth)]))
        
        // Set line spacing (0-255)
        let lineSpacing = 30  // Default line spacing
        command.append(Data([0x1B, 0x33, UInt8(lineSpacing)]))
        
        // Set print mode
        let printMode: UInt8 = 0x00  // Default print mode
        command.append(Data([0x1B, 0x21, printMode]))
        
        // Set character code table
        command.append(Data([0x1C, 0x26]))  // Select character code table
        
        print(data: command) { result in
            switch result {
            case .success:
                Swift.print("Paper size set to \(size.width)mm")
                completion(.success(()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }
    
    func getPaperSize() -> PaperSize {
        return currentPaperSize
    }
    
    // Helper method to center text based on paper size
    func centerText(_ text: String) -> String {
        let maxWidth = currentPaperSize.charactersPerLine
        let textLength = text.count
        let padding = (maxWidth - textLength) / 2
        return String(repeating: " ", count: max(0, padding)) + text
    }
    
    // Helper method to create a line separator based on paper size
    func createSeparator() -> String {
        let maxWidth = currentPaperSize.charactersPerLine
        return String(repeating: "-", count: maxWidth)
    }
    
    // MARK: - Enhanced Printing Methods
    
    func printText(_ text: String, alignment: NSTextAlignment = .left, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        var formattedText = text
        
        // Format text based on alignment
        switch alignment {
        case .center:
            formattedText = centerText(text)
        case .right:
            let maxWidth = currentPaperSize.charactersPerLine
            let textLength = text.count
            let padding = maxWidth - textLength
            formattedText = String(repeating: " ", count: max(0, padding)) + text
        default:
            break
        }
        
        // Add line break
        formattedText += "\n"
        
        guard let data = formattedText.data(using: .ascii) else {
            completion(.failure(.invalidData))
            return
        }
        
        print(data: data, completion: completion)
    }
    
    func printSeparator(completion: @escaping (Result<Void, PrinterError>) -> Void) {
        let separator = createSeparator() + "\n"
        guard let data = separator.data(using: .ascii) else {
            completion(.failure(.invalidData))
            return
        }
        print(data: data, completion: completion)
    }
    
    // MARK: - Receipt Layout Methods
    
    func printRentalReceipt(order: Order, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        var commands = Data()
        
        // Initialize printer
        commands.append(Data([0x1B, 0x40]))
        
        // Set paper size based on printer type
        setPaperSize(.k80) { [weak self] result in
            guard case .success = result, let self = self else {
                completion(.failure(.invalidData))
                return
            }
            
            // Header
            commands.append(self.centerText("RENTAL RECEIPT").data(using: .ascii)!)
            commands.append(self.centerText("Order #\(order.orderNumber)").data(using: .ascii)!)
            commands.append(self.centerText(order.createdAt.dateInString() ?? "N/A").data(using: .ascii)!)
            commands.append(Data([0x0A])) // Line feed
            
            // Customer Info
            let customerName = order.customerName.trimmingCharacters(in: .whitespaces)
            commands.append("Customer: \(customerName.isEmpty ? "N/A" : customerName)\n".data(using: .ascii)!)
            commands.append("Phone: \(order.customerPhone)\n".data(using: .ascii)!)
            commands.append(self.createSeparator().data(using: .ascii)!)
            
            // Items
            commands.append("Items:\n".data(using: .ascii)!)
            for (index, item) in order.orderItems.enumerated() {
                let name = item.productName
                let price = item.unitPrice.formatStringInCommon()
                let quantity = item.quantity
                let total = item.totalPrice.formatStringInCommon()
                
                if let notes = item.notes, !notes.isEmpty {
                    commands.append("\(index + 1). \(name) (\(notes))\n".data(using: .ascii)!)
                } else {
                    commands.append("\(index + 1). \(name)\n".data(using: .ascii)!)
                }
                commands.append("\(quantity) x \(price) = \(total)\n".data(using: .ascii)!)
            }
            commands.append(self.createSeparator().data(using: .ascii)!)
            
            // Payment Details
            let subtotal = order.orderItems.reduce(0.0) { $0 + $1.totalPrice }
            commands.append("Subtotal: \(subtotal.formatStringInCommon())\n".data(using: .ascii)!)
            
            // Discount
            if order.discountAmount > 0 {
                let discountType = order.discountType ?? "amount"
                let discountText = discountType == "amount" ?
                    "Discount: \(order.discountAmount.formatStringInCommon())" :
                    "Discount: \(order.discountValue)%"
                commands.append("\(discountText)\n".data(using: .ascii)!)
            }
            commands.append("Total: \(order.totalAmount.formatStringInCommon())\n".data(using: .ascii)!)
            
            // Deposit Info
            if order.depositAmount > 0 {
                commands.append("Deposit: \(order.depositAmount.formatStringInCommon())\n".data(using: .ascii)!)
            }
            
            // Collateral/ID document info
            if let collateralDetails = order.collateralDetails, !collateralDetails.isEmpty {
                commands.append("ID/Document: \(collateralDetails)\n".data(using: .ascii)!)
            }
            
            // Dates
            commands.append(self.createSeparator().data(using: .ascii)!)
            commands.append("Pickup: \(order.pickupDate?.dateInString() ?? "N/A")\n".data(using: .ascii)!)
            commands.append("Return: \(order.returnDate?.dateInString() ?? "N/A")\n".data(using: .ascii)!)
            
            // Footer
            commands.append(self.createSeparator().data(using: .ascii)!)
            commands.append(self.centerText("Thank you for your business!").data(using: .ascii)!)
            commands.append(Data([0x0A, 0x0A])) // Extra line feeds
            
            // Cut paper
            commands.append(Data([0x1D, 0x56, 0x00]))
            
            self.print(data: commands) { result in
                completion(result)
            }
        }
    }
    
    func printSaleReceipt(order: Order, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        var commands = Data()
        
        // Initialize printer
        commands.append(Data([0x1B, 0x40]))
        
        // Set paper size based on printer type
        setPaperSize(.k80) { [weak self] result in
            guard case .success = result, let self = self else {
                completion(.failure(.invalidData))
                return
            }
            
            // Header
            commands.append(self.centerText("SALE RECEIPT").data(using: .ascii)!)
            commands.append(self.centerText("Order #\(order.orderNumber)").data(using: .ascii)!)
            commands.append(self.centerText(order.createdAt.dateInString() ?? "N/A").data(using: .ascii)!)
            commands.append(Data([0x0A])) // Line feed
            
            // Customer Info
            let customerName = order.customerName.trimmingCharacters(in: .whitespaces)
            commands.append("Customer: \(customerName.isEmpty ? "N/A" : customerName)\n".data(using: .ascii)!)
            commands.append("Phone: \(order.customerPhone)\n".data(using: .ascii)!)
            commands.append(self.createSeparator().data(using: .ascii)!)
            
            // Items
            commands.append("Items:\n".data(using: .ascii)!)
            for (index, item) in order.orderItems.enumerated() {
                let name = item.productName
                let price = item.unitPrice.formatStringInCommon()
                let quantity = item.quantity
                let total = item.totalPrice.formatStringInCommon()
                
                if let notes = item.notes, !notes.isEmpty {
                    commands.append("\(index + 1). \(name) (\(notes))\n".data(using: .ascii)!)
                } else {
                    commands.append("\(index + 1). \(name)\n".data(using: .ascii)!)
                }
                commands.append("\(quantity) x \(price) = \(total)\n".data(using: .ascii)!)
            }
            commands.append(self.createSeparator().data(using: .ascii)!)
            
            // Payment Details
            let subtotal = order.orderItems.reduce(0.0) { $0 + $1.totalPrice }
            commands.append("Subtotal: \(subtotal.formatStringInCommon())\n".data(using: .ascii)!)
            
            // Discount
            if order.discountAmount > 0 {
                let discountType = order.discountType ?? "amount"
                let discountText = discountType == "amount" ?
                    "Discount: \(order.discountAmount.formatStringInCommon())" :
                    "Discount: \(order.discountValue)%"
                commands.append("\(discountText)\n".data(using: .ascii)!)
            }
            commands.append("Total: \(order.totalAmount.formatStringInCommon())\n".data(using: .ascii)!)
            
            // Payment Method
            if order.depositAmount > 0 {
                commands.append("Paid: \(order.depositAmount.formatStringInCommon())\n".data(using: .ascii)!)
            }
            
            // Footer
            commands.append(self.createSeparator().data(using: .ascii)!)
            commands.append(self.centerText("Thank you for your purchase!").data(using: .ascii)!)
            commands.append(Data([0x0A, 0x0A])) // Extra line feeds
            
            // Cut paper
            commands.append(Data([0x1D, 0x56, 0x00]))
            
            self.print(data: commands) { result in
                completion(result)
            }
        }
    }
    
    func printLabelReceipt(order: Order, completion: @escaping (Result<Void, PrinterError>) -> Void) {
        var commands = Data()
        
        // Initialize printer
        commands.append(Data([0x1B, 0x40]))
        
        // Set paper size for label printer
        setPaperSize(.k50) { [weak self] result in
            guard case .success = result, let self = self else {
                completion(.failure(.invalidData))
                return
            }
            
            // Order Info
            commands.append(self.centerText("Order #\(order.orderNumber)").data(using: .ascii)!)
            commands.append(self.centerText(order.createdAt.dateInString() ?? "N/A").data(using: .ascii)!)
            commands.append(Data([0x0A])) // Line feed
            
            // Customer Info
            commands.append("\(order.customerName)\n".data(using: .ascii)!)
            commands.append("\(order.customerPhone ?? "")\n".data(using: .ascii)!)
            commands.append(self.createSeparator().data(using: .ascii)!)
            
            // Items (condensed)
            for item in order.orderItems {
                let name = item.productName
                let quantity = item.quantity
                commands.append("\(quantity)x \(name)\n".data(using: .ascii)!)
            }
            
            // Dates
            commands.append(self.createSeparator().data(using: .ascii)!)
            if order.orderType == .rent {
                commands.append("Pickup: \(order.pickupDate?.dateInString() ?? "N/A")\n".data(using: .ascii)!)
                commands.append("Return: \(order.returnDate?.dateInString() ?? "N/A")\n".data(using: .ascii)!)
            }
            
            // Cut paper
            commands.append(Data([0x1D, 0x56, 0x00]))
            
            self.print(data: commands) { result in
                completion(result)
            }
        }
    }
}

// MARK: - Bluetooth Delegates - DISABLED
// extension PrinterManager: CBCentralManagerDelegate {
//     // Bluetooth disabled
// }

// extension PrinterManager: CBPeripheralDelegate {
//     // Bluetooth disabled
// } 
