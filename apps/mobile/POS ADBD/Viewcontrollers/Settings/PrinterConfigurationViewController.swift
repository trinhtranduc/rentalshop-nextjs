import UIKit
import CoreBluetooth
import SnapKit

class PrinterConfigurationViewController: BaseViewControler {
    // MARK: - Properties
    private var centralManager: CBCentralManager?
    private var discoveredPeripherals: [CBPeripheral] = []
    private var connectedPeripheral: CBPeripheral?
    private var printService: CBService?
    private var printCharacteristic: CBCharacteristic?
    private var savedPrinterIdentifier: String?
    
    // MARK: - UI Components
    private lazy var printerTableView: UITableView = {
        let tableView = UITableView(frame: .zero, style: .insetGrouped)
        tableView.delegate = self
        tableView.dataSource = self
        tableView.backgroundColor = .backgroundPrimary
        tableView.translatesAutoresizingMaskIntoConstraints = false
        return tableView
    }()
    
    private lazy var printMethodSegmentedControl: UISegmentedControl = {
        let items = ["Network".localized()]//, "Network".localized()]
        let segmentedControl = UISegmentedControl(items: items)
        segmentedControl.selectedSegmentIndex = 1 // Default to Network
        segmentedControl.addTarget(self, action: #selector(printMethodChanged), for: .valueChanged)
        segmentedControl.backgroundColor = .backgroundSecondary
        segmentedControl.selectedSegmentTintColor = .brandPrimary

        // Set text attributes for different states
        let fontSize: CGFloat = UIDevice.current.userInterfaceIdiom == .pad ? 16 : 14
        let selectedAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: UIColor.textInverted,
            .font: Utils.boldFont(size: fontSize)
        ]
        
        let normalAttributes: [NSAttributedString.Key: Any] = [
            .foregroundColor: APP_TEXT_COLOR,
            .font: Utils.regularFont(size: fontSize)
        ]
        
        segmentedControl.setTitleTextAttributes(selectedAttributes, for: .selected)
        segmentedControl.setTitleTextAttributes(normalAttributes, for: .normal)
        
        return segmentedControl
    }()
    
    private lazy var ipAddressField: UITextField = {
        let textField = UITextField()
        textField.placeholder = "Enter printer IP address".localized()
        textField.font = .bodyRegular(size: 16)
        textField.delegate = self
        textField.returnKeyType = .done
        return textField
    }()
    
    private lazy var noteTextView: UITextView = {
        let textView = UITextView()
        textView.font = .bodyRegular(size: 16)
        textView.textColor = .textPrimary
        textView.backgroundColor = .clear
        textView.delegate = self
        textView.translatesAutoresizingMaskIntoConstraints = false
        return textView
    }()
    
    // MARK: - Table Sections
    private enum Section: Int, CaseIterable {
//        case printMethod
        case settings
        case foundDevices
        case notes
    }
    
    private enum PrintMethodRow: Int, CaseIterable {
        case segmentedControl
    }
    
    private enum SettingsRow: Int, CaseIterable {
        case status
        case scan
        case devices
        case ipAddress
        case test
    }
    
    private enum NotesRow: Int, CaseIterable {
        case textView
        case k80Support
    }
    
    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupNavigationBar()
        setupUI()
        loadCurrentConfig()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Ensure navigation bar is hidden when returning to this screen
        navigationController?.setNavigationBarHidden(true, animated: false)
        
//         Refresh Bluetooth state when view appears
//        if let centralManager = centralManager {
//            centralManagerDidUpdateState(centralManager)
//        }
    }
    
    // MARK: - Setup
    override func setupUI() {
        view.backgroundColor = .backgroundPrimary
        
        // Add tap gesture to dismiss keyboard
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(dismissKeyboard))
        tapGesture.cancelsTouchesInView = false
        view.addGestureRecognizer(tapGesture)
        
        // Setup table view
        view.addSubview(printerTableView)
        
        guard let customNavBar = customNavBar else { return }
        
        let isIPad = traitCollection.horizontalSizeClass == .regular
        
        if isIPad {
            // For iPad - Fixed width centered container
            let containerView = UIView()
            containerView.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(containerView)
            containerView.addSubview(printerTableView)
            
            NSLayoutConstraint.activate([
                // Container constraints
                containerView.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
                containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
                containerView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
                containerView.widthAnchor.constraint(equalToConstant: 600),
                
                // TableView constraints within container
                printerTableView.topAnchor.constraint(equalTo: containerView.topAnchor),
                printerTableView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
                printerTableView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
                printerTableView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
            ])
        } else {
            // For iPhone - Edge to edge
            NSLayoutConstraint.activate([
                printerTableView.topAnchor.constraint(equalTo: customNavBar.bottomAnchor),
                printerTableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                printerTableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                printerTableView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
        }
        
        // Initialize Bluetooth
//         centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    // MARK: - Custom Navigation Bar Setup
    private func setupNavigationBar() {
        setupCustomNavigationBar(
            title: "Printer Configuration".localized(),
            statusBarBackgroundColor: .white,
            titleCentered: true,
            hideBackButton: false,
            backAction: .pop
        )
    }
    
    private func loadCurrentConfig() {
        ipAddressField.text = Utils.loadBillPrinter()
        noteTextView.text = Utils.loadNotePrinter()
        
        // Load saved print method
        let printMethod = Utils.loadPrintMethod()
        if printMethod == "bluetooth" {
            printMethodSegmentedControl.selectedSegmentIndex = 0
            printMethodChanged(printMethodSegmentedControl)
        } else {
            // Default to network (index 1)
            printMethodSegmentedControl.selectedSegmentIndex = 1
            printMethodChanged(printMethodSegmentedControl)
        }
        
        // Load saved Bluetooth printer info if exists
        if let savedPrinterInfo = Utils.loadBluetoothPrinter() {
            let printerName = savedPrinterInfo["name"] ?? "Unknown Printer"
            savedPrinterIdentifier = savedPrinterInfo["identifier"]
        }
    }
    
    // MARK: - Actions
    @objc private func dismissKeyboard() {
        view.endEditing(true)
    }
    
    @objc private func printMethodChanged(_ sender: UISegmentedControl) {
        if sender.selectedSegmentIndex == 0 {
            // Bluetooth
            Utils.savePrintMethod(method: "bluetooth")
        } else {
            // Network
            Utils.savePrintMethod(method: "network")
        }
        printerTableView.reloadData()
    }
    
    @objc private func scanForPrinters() {
        guard let centralManager = centralManager, centralManager.state == .poweredOn else {
            showAlert(message: "Bluetooth is not available".localized())
            return
        }
        
        discoveredPeripherals.removeAll()
        printerTableView.reloadData()
        
        // Start scanning for all devices (more likely to find printers)
        centralManager.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        
        // Stop scanning after 15 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) {
            centralManager.stopScan()
            
            if self.discoveredPeripherals.isEmpty {
                self.showAlert(message: "No Bluetooth devices found. Make sure your printer is turned on and in pairing mode.".localized(), isError: false)
            }
        }
        
        showAlert(message: "Scanning for Bluetooth devices...".localized(), isError: false)
    }
    
    @objc private func testPrinter() {
        let printMethod = Utils.loadPrintMethod()
        
        if printMethod == "bluetooth" {
            // Test Bluetooth printer
            if connectedPeripheral != nil {
                testBluetoothPrinter()
            } else {
                showAlert(message: "Please connect to a Bluetooth printer first".localized())
            }
        } else {
            // Test Network printer
            guard let ipAddress = ipAddressField.text, !ipAddress.isEmpty else {
                showAlert(message: "Please enter printer IP address".localized())
                return
            }
            
            // Validate IP address format (basic check)
            let ipRegex = "^([0-9]{1,3}\\.){3}[0-9]{1,3}$"
            let ipPredicate = NSPredicate(format: "SELF MATCHES %@", ipRegex)
            guard ipPredicate.evaluate(with: ipAddress) else {
                showAlert(message: "Invalid IP address format".localized())
                return
            }
            
            // Show loading indicator
            showAlert(message: "Connecting to printer and sending test print...".localized(), isError: false)
            
            // Use the new test print method that automatically connects and prints
            PrinterManager.shared.testPrintWithConnection(ip: ipAddress, port: 9100) { result in
                DispatchQueue.main.async {
                    switch result {
                    case .success:
                        self.showAlert(message: "Test print sent successfully! Check your printer.".localized(), isError: false)
                    case .failure(let error):
                        var errorMessage = error.localizedDescription
                        // Provide more specific error messages with localization
                        if case PrinterError.disconnected = error {
                            errorMessage = "Printer disconnected. Please check:\n1. Printer is turned on\n2. IP address is correct\n3. Printer is on the same network".localized()
                        } else if case PrinterError.connectionFailed = error {
                            let formatString = "Failed to connect to printer. Please check:\n1. IP address: %@\n2. Printer is on the same network\n3. Port 9100 is open".localized()
                            errorMessage = String(format: formatString, ipAddress)
                        } else if case PrinterError.timeout = error {
                            errorMessage = "Connection timeout. Please check:\n1. Printer is turned on\n2. Network connection is stable".localized()
                        }
                        self.showAlert(message: errorMessage)
                    }
                }
            }
        }
    }
    
    private func testBluetoothPrinter() {
        // Send a test print command
        let testData = "Test Print\n\n\n\n".data(using: .utf8) ?? Data()
        
        if let characteristic = printCharacteristic {
            connectedPeripheral?.writeValue(testData, for: characteristic, type: .withResponse)
            showAlert(message: "Test print sent to Bluetooth printer".localized(), isError: false)
        } else {
            showAlert(message: "Printer characteristic not found".localized())
        }
    }
    
    private func disconnectPrinter() {
        if let peripheral = connectedPeripheral {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
        
        connectedPeripheral = nil
        printService = nil
        printCharacteristic = nil
        savedPrinterIdentifier = nil
        
        Utils.saveBluetoothPrinter(peripheral: nil)
        
        // Refresh table view to update visual state
        printerTableView.reloadData()
    }
    
    private func isPrinterDevice(_ peripheral: CBPeripheral, name: String, advertisementData: [String: Any]) -> Bool {
        let lowercasedName = name.lowercased()
        
        // Common printer brand names and keywords
        let printerKeywords = [
            "printer", "print", "thermal", "receipt", "pos", "kiosk",
            "epson", "canon", "hp", "brother", "samsung", "lexmark", "xerox",
            "star", "citizen", "bixolon", "toshiba", "seiko", "okidata",
            "zebra", "datamax", "intermec", "honeywell", "datalogic",
            "k80", "k82", "k84", "k86", "k88", "k90", "k92", "k94", "k96", "k98",
            "t88", "t90", "t92", "t94", "t96", "t98",
            "sp", "sp-r", "sp-t", "sp-p", "sp-q", "sp-s",
            "tm", "tm-t", "tm-h", "tm-l", "tm-p", "tm-q", "tm-s",
            "ql", "ql-n", "ql-p", "ql-s", "ql-t", "ql-u",
            "pt", "pt-d", "pt-e", "pt-f", "pt-g", "pt-h", "pt-i", "pt-j", "pt-k",
            "mht", "mht-p", "mht-t", "mht-s", "mht-q", "mht-r",
            "gp", "gp-", "gp76", "gp80", "gp82", "gp84", "gp86", "gp88", "gp90",
            "bt", "bluetooth", "wireless", "portable", "xprinter"
        ]
        
        // Check if the device name contains any printer keywords
        for keyword in printerKeywords {
            if lowercasedName.contains(keyword) {
                return true
            }
        }
        
        // Check advertisement data for printer service UUIDs
        if let serviceUUIDs = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] {
            let printerServiceUUIDs = [
                "FF00", "FFE0", "FFE1", "FFE2", "FFE3", "FFE4", "FFE5",
                "FFE6", "FFE7", "FFE8", "FFE9", "FFEA", "FFEB", "FFEC",
                "FFED", "FFEE", "FFEF", "FFF0", "FFF1", "FFF2", "FFF3"
            ]
            
            for serviceUUID in serviceUUIDs {
                let uuidString = serviceUUID.uuidString.uppercased()
                for printerUUID in printerServiceUUIDs {
                    if uuidString.contains(printerUUID) {
                        return true
                    }
                }
            }
        }
        
        return false
    }
    
    private func showAlert(message: String, isError: Bool = true) {
        let alert = UIAlertController(
            title: isError ? "Error".localized() : nil,
            message: message.localized(),
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK".localized(), style: .default))
        present(alert, animated: true)
    }
}

// MARK: - UITableViewDataSource
extension PrinterConfigurationViewController: UITableViewDataSource {
    func numberOfSections(in tableView: UITableView) -> Int {
        // Hide foundDevices section when no devices are discovered or when network is selected
        let printMethod = Utils.loadPrintMethod()
        let baseSections = Section.allCases.count
        
        if printMethod == "network" || discoveredPeripherals.isEmpty {
            return baseSections - 1
        }
        return baseSections
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        let actualSection = getActualSection(for: section)
        
        switch actualSection {
//        case .printMethod:
//            return PrintMethodRow.allCases.count
        case .settings:
            let printMethod = Utils.loadPrintMethod()
            if printMethod == "bluetooth" {
                // Bluetooth: status + scan
                return 2
            } else {
                // Network: ipAddress + test
                return 2
            }
        case .foundDevices:
            return discoveredPeripherals.count
        case .notes:
            return NotesRow.allCases.count
        }
    }
    
    func tableView(_ tableView: UITableView, titleForHeaderInSection section: Int) -> String? {
        let actualSection = getActualSection(for: section)
        
        switch actualSection {
//        case .printMethod: 
//            return "Print Method".localized()
        case .settings: 
            let printMethod = Utils.loadPrintMethod()
            return printMethod == "bluetooth" ? "Bluetooth Settings".localized() : "Network Settings".localized()
        case .foundDevices: 
            return "Found Devices".localized()
        case .notes: 
            return "Printer Notes".localized()
        }
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let actualSection = getActualSection(for: indexPath.section)
        
        switch actualSection {
//        case .printMethod:
//            return createPrintMethodCell(for: indexPath)
        case .settings:
            return createSettingsCell(for: indexPath)
        case .foundDevices:
            return createFoundDeviceCell(for: indexPath)
        case .notes:
            return createNotesCell(for: indexPath)
        }
    }
    
    private func getActualSection(for section: Int) -> Section {
        let printMethod = Utils.loadPrintMethod()
        
        // When no devices are found or network is selected, skip the foundDevices section
        if discoveredPeripherals.isEmpty || printMethod == "network" {
            if section >= Section.foundDevices.rawValue {
                return Section(rawValue: section + 1) ?? .notes
            }
        }
        return Section(rawValue: section) ?? .notes
    }
    
    private func createPrintMethodCell(for indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell()
        cell.selectionStyle = .none
        
        // Make segmented control full width
        printMethodSegmentedControl.translatesAutoresizingMaskIntoConstraints = false
        cell.contentView.addSubview(printMethodSegmentedControl)
        
        NSLayoutConstraint.activate([
            printMethodSegmentedControl.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 12),
            printMethodSegmentedControl.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 16),
            printMethodSegmentedControl.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -16),
            printMethodSegmentedControl.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -12),
            printMethodSegmentedControl.heightAnchor.constraint(equalToConstant: 32)
        ])
        
        return cell
    }
    
    private func createSettingsCell(for indexPath: IndexPath) -> UITableViewCell {
        let printMethod = Utils.loadPrintMethod()
        
        if printMethod == "bluetooth" {
            return createBluetoothSettingsCell(for: indexPath)
        } else {
            return createNetworkSettingsCell(for: indexPath)
        }
    }
    
    private func createBluetoothSettingsCell(for indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: "BluetoothCell")
        
        switch indexPath.row {
        case 0: // Status
            var config = cell.defaultContentConfiguration()
            config.text = "Bluetooth Status"
            config.textProperties.font = .bodyRegular(size: 16)
            
            if let centralManager = centralManager {
                switch centralManager.state {
                case .poweredOn:
                    config.secondaryText = "Ready"
                    config.secondaryTextProperties.color = .systemGreen
                case .poweredOff:
                    config.secondaryText = "Turned Off"
                    config.secondaryTextProperties.color = .systemRed
                case .unauthorized:
                    config.secondaryText = "Unauthorized"
                    config.secondaryTextProperties.color = .systemRed
                case .unsupported:
                    config.secondaryText = "Unsupported"
                    config.secondaryTextProperties.color = .systemRed
                default:
                    config.secondaryText = "Unknown"
                    config.secondaryTextProperties.color = .systemGray
                }
            } else {
                config.secondaryText = "Initializing..."
                config.secondaryTextProperties.color = .systemGray
            }
            
            config.secondaryTextProperties.font = .captionSmall(size: 12)
            cell.contentConfiguration = config
            cell.selectionStyle = .none
            
        case 1: // Scan
            var config = cell.defaultContentConfiguration()
            config.text = "Scan for Bluetooth Printers"
            config.textProperties.font = .bodyRegular(size: 16)
            config.image = UIImage(systemName: "magnifyingglass")
            config.imageProperties.tintColor = .systemBlue
            cell.contentConfiguration = config
            cell.accessoryType = .disclosureIndicator
            
        case 2: // This case is no longer used since devices are in separate section
            break
            
        default:
            break
        }
        
        return cell
    }
    
    private func createFoundDeviceCell(for indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: .subtitle, reuseIdentifier: "FoundDeviceCell")
        let peripheral = discoveredPeripherals[indexPath.row]
        
        var config = cell.defaultContentConfiguration()
        config.text = peripheral.name ?? "Unknown Device"
        config.textProperties.font = .bodyRegular(size: 16)
        
        // Show connection status
        let isConnected = (peripheral.identifier == connectedPeripheral?.identifier)
        let isPreviouslyConnected = (peripheral.identifier.uuidString == savedPrinterIdentifier)
        
        if isConnected {
            config.secondaryText = "Connected"
            config.secondaryTextProperties.color = .systemGreen
            cell.accessoryType = .checkmark
        } else if isPreviouslyConnected {
            config.secondaryText = "Previously connected"
            config.secondaryTextProperties.color = .systemOrange
            cell.accessoryType = .none
        } else {
            config.secondaryText = "Tap to connect"
            config.secondaryTextProperties.color = .textSecondary
            cell.accessoryType = .none
        }
        
        config.secondaryTextProperties.font = .captionSmall(size: 12)
        cell.contentConfiguration = config
        
        return cell
    }
    
    private func createNetworkSettingsCell(for indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell()
        
        switch indexPath.row {
        case 0: // IP Address
            cell.textLabel?.text = "IP Address"
            cell.textLabel?.font = .bodyRegular(size: 16)
            
            ipAddressField.frame = CGRect(x: 0, y: 0, width: 200, height: 30)
            cell.accessoryView = ipAddressField
            
        case 1: // Test
            var config = cell.defaultContentConfiguration()
            config.text = "Test Printer"
            config.textProperties.font = .bodyRegular(size: 16)
            config.image = UIImage(systemName: "printer")
            config.imageProperties.tintColor = .systemBlue
            cell.contentConfiguration = config
            cell.accessoryType = .disclosureIndicator
            
        default:
            break
        }
        
        return cell
    }
    
    private func createNotesCell(for indexPath: IndexPath) -> UITableViewCell {
        switch indexPath.row {
        case NotesRow.textView.rawValue:
            let cell = UITableViewCell()
            cell.selectionStyle = .none
            
            noteTextView.frame = CGRect(x: 0, y: 0, width: cell.contentView.bounds.width - 32, height: 100)
            noteTextView.text = Utils.loadNotePrinter()
//            noteTextView.placeholder = "Enter printer notes here..."
            
            cell.contentView.addSubview(noteTextView)
            noteTextView.translatesAutoresizingMaskIntoConstraints = false
            
            NSLayoutConstraint.activate([
                noteTextView.topAnchor.constraint(equalTo: cell.contentView.topAnchor, constant: 8),
                noteTextView.leadingAnchor.constraint(equalTo: cell.contentView.leadingAnchor, constant: 16),
                noteTextView.trailingAnchor.constraint(equalTo: cell.contentView.trailingAnchor, constant: -16),
                noteTextView.bottomAnchor.constraint(equalTo: cell.contentView.bottomAnchor, constant: -8),
                noteTextView.heightAnchor.constraint(equalToConstant: 100)
            ])
            
            return cell
            
        case NotesRow.k80Support.rawValue:
            let cell = UITableViewCell()
            cell.selectionStyle = .none
            
            var config = cell.defaultContentConfiguration()
            config.text = "*** Compatible with thermal receipt printers supporting ESC/POS commands.".localized()
            config.textProperties.font = .captionSmall(size: 12)
            config.textProperties.color = .systemOrange
            config.textProperties.numberOfLines = 0
            
            cell.contentConfiguration = config
            
            return cell
            
        default:
            return UITableViewCell()
        }
    }
}

// MARK: - UITableViewDelegate
extension PrinterConfigurationViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        
        let actualSection = getActualSection(for: indexPath.section)
        
        switch actualSection {
        case .settings:
            handleSettingsRowSelection(at: indexPath)
        case .foundDevices:
            handleFoundDeviceSelection(at: indexPath)
        default:
            break
        }
    }
    
    private func handleSettingsRowSelection(at indexPath: IndexPath) {
        let printMethod = Utils.loadPrintMethod()
        
        if printMethod == "bluetooth" {
            handleBluetoothRowSelection(at: indexPath)
        } else {
            handleNetworkRowSelection(at: indexPath)
        }
    }
    
    private func handleBluetoothRowSelection(at indexPath: IndexPath) {
        switch indexPath.row {
        case 1: // Scan
            scanForPrinters()
        default:
            break
        }
    }
    
    private func handleFoundDeviceSelection(at indexPath: IndexPath) {
        let peripheral = discoveredPeripherals[indexPath.row]
        let isConnected = (peripheral.identifier == connectedPeripheral?.identifier)
        
        if isConnected {
            // Show disconnect option
            let alert = UIAlertController(title: peripheral.name ?? "Bluetooth Device", message: "This device is currently connected.", preferredStyle: .actionSheet)
            alert.addAction(UIAlertAction(title: "Disconnect", style: .destructive) { _ in
                self.disconnectPrinter()
            })
            alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
            
            if let popover = alert.popoverPresentationController {
                popover.sourceView = printerTableView
                popover.sourceRect = printerTableView.bounds
            }
            
            present(alert, animated: true)
        } else {
            // Connect to device
            centralManager?.connect(peripheral, options: nil)
        }
    }
    
    private func handleNetworkRowSelection(at indexPath: IndexPath) {
        switch indexPath.row {
        case 1: // Test
            testPrinter()
        default:
            break
        }
    }
    

}

// MARK: - UITextFieldDelegate
extension PrinterConfigurationViewController: UITextFieldDelegate {
    func textFieldDidEndEditing(_ textField: UITextField) {
        if textField == ipAddressField {
            Utils.saveBillPrinter(ip: textField.text ?? "")
        }
    }
    
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        textField.resignFirstResponder()
        return true
    }
}

// MARK: - UITextViewDelegate
extension PrinterConfigurationViewController: UITextViewDelegate {
    func textViewDidEndEditing(_ textView: UITextView) {
        Utils.saveNotePrinter(note: textView.text)
    }
}

// MARK: - CBCentralManagerDelegate
extension PrinterConfigurationViewController: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        printerTableView.reloadData()
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        // Only add devices that have a name and are likely printers
        if let name = peripheral.name, !name.isEmpty {
            // Check if this peripheral is already in the discovered list
            let isDuplicate = discoveredPeripherals.contains { discoveredPeripheral in
                discoveredPeripheral.identifier == peripheral.identifier
            }
            
            if !isDuplicate {
                discoveredPeripherals.append(peripheral)
                printerTableView.reloadData()
            }
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        connectedPeripheral = peripheral
        peripheral.delegate = self
        peripheral.discoverServices(nil)
        
        Utils.saveBluetoothPrinter(peripheral: peripheral)
        savedPrinterIdentifier = peripheral.identifier.uuidString
        
        printerTableView.reloadData()
        
        showAlert(message: "Successfully connected to \(peripheral.name ?? "printer")".localized(), isError: false)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        showAlert(message: "Failed to connect to printer: \(error?.localizedDescription ?? "Unknown error")")
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        connectedPeripheral = nil
        printService = nil
        printCharacteristic = nil
        
        Utils.saveBluetoothPrinter(peripheral: nil)
        printerTableView.reloadData()
    }
}

// MARK: - CBPeripheralDelegate
extension PrinterConfigurationViewController: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard error == nil else {
            showAlert(message: "Error discovering services: \(error!.localizedDescription)")
            return
        }
        
        // Look for common printer service UUIDs
        let printerServiceUUIDs = ["FF00", "FFE0", "FFE1", "FFE2", "FFE3", "FFE4", "FFE5"]
        
        for service in peripheral.services ?? [] {
            let serviceUUID = service.uuid.uuidString.uppercased()
            if printerServiceUUIDs.contains(where: { serviceUUID.contains($0) }) {
                printService = service
                peripheral.discoverCharacteristics(nil, for: service)
                break
            }
        }
        
        // If no specific printer service found, try to use any service with write characteristics
        if printService == nil {
            for service in peripheral.services ?? [] {
                printService = service
                peripheral.discoverCharacteristics(nil, for: service)
                break
            }
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard error == nil else {
            showAlert(message: "Error discovering characteristics: \(error!.localizedDescription)")
            return
        }
        
        for characteristic in service.characteristics ?? [] {
            if characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
                printCharacteristic = characteristic
                break
            }
        }
    }
} 
