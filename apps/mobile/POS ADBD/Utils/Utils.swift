//
//  Utils.swift
//  DMS
//
//  Created by Trinh Tran on 10/20/18.
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation
import UIKit
import CoreBluetooth

extension UserDefaults {
    
    func save<T:Encodable>(customObject object: T, inKey key: String) {
        if let encoded = try? JSONEncoder.shared.encode(object) {
            self.set(encoded, forKey: key)
        }
    }
    
    func retrieve<T:Decodable>(object type:T.Type, fromKey key: String) -> T? {
        if let data = self.data(forKey: key) {
            if let object = try? JSONDecoder.shared.decode(type, from: data) {
                return object
            }else {
                print("Couldnt decode object")
                return nil
            }
        }else {
            print("Couldnt find key")
            return nil
        }
    }
    
}

class Utils: NSObject {
    
    // MARK: Screen size
    class func screenSize() -> CGSize {
        return UIScreen.main.bounds.size
    }
    class func viewFrom(nibName: String) -> UIView? {
        if let objects = Bundle.main.loadNibNamed(nibName, owner: nil, options: nil), objects.count > 0 {
            return objects[0] as? UIView
        }
        return nil
    }
    class func storyboardBoardWithName(storyboardName: String) -> UIStoryboard {
        let storyboard = UIStoryboard(name: storyboardName, bundle: Bundle.main)
        return storyboard
    }
    
    /**
     Method returns an instance of the view controller defined by the storyboard Id paramter from the storyboard defined by the storyboardName parameter
     - Parameter storyboardId: String
     - Parameter storyboardName: String
     - Returns: UIViewController?
     */
    class func viewController(storyboardId: String, storyboardName: String) -> UIViewController? {
        let storyboard = storyboardBoardWithName(storyboardName: storyboardName)
        let viewController: AnyObject = storyboard.instantiateViewController(withIdentifier: storyboardId)
        return viewController as? UIViewController
    }
    
    class func extraBoldFont(size: CGFloat) -> UIFont {
        return font(name: BOLD_FONT, size: size)
    }
    class func boldFont(size: CGFloat) -> UIFont {
        return font(name: BOLD_FONT, size: size)
    }
    class func mediumFont(size: CGFloat) -> UIFont {
        return font(name: MEDIUM_FONT, size: size)
    }
    class func lightFont(size: CGFloat) -> UIFont {
        return font(name: LIGHT_FONT, size: size)
    }
    class func regularFont(size: CGFloat) -> UIFont {
        return font(name: REGULAR_FONT, size: size)
    }
    class func font(name: String, size: CGFloat) -> UIFont {
        // Fallback to the system font instead of force-unwrapping, so a missing/mis-named
        // custom font degrades gracefully rather than crashing the app.
        return UIFont(name: name, size: size) ?? UIFont.systemFont(ofSize: size)
    }
    
    class func randomString(length: Int) -> String {
        
        let letters : NSString = "0123456789"
        let len = UInt32(letters.length)
        
        var randomString = ""
        
        for _ in 0 ..< length {
            let rand = arc4random_uniform(len)
            var nextChar = letters.character(at: Int(rand))
            randomString += NSString(characters: &nextChar, length: 1) as String
        }
        
        return randomString
    }
    //    class func orderCode() -> String{
    //        if let user = AppShare.shared.user, let shortCode = user.short_code {
    //            let result = "\(shortCode)\(randomString(length: 5))"
    //            return result
    //        }else{
    //            let dateString = Date().orderDateCode()
    //            let result = "\(randomString(length: 5))"
    //            return result
    //        }
    
    //    }
    class func numberDate(startDate: Date, endDate: Date) -> Int{
        let calendar = Calendar.current
        
        // Replace the hour (time) of both dates with 00:00
        let date1 = calendar.startOfDay(for: startDate)
        let date2 = calendar.startOfDay(for: endDate)
        
        let components = calendar.dateComponents([.day], from: date1, to: date2)
        return components.day ?? 0
    }
    class func date2000() -> Date?{
        // Get the current date
        let currentDate = Date()
        
        // Create a Calendar instance
        let calendar = Calendar.current
        
        // Subtract 2 years from the current date
        if let dateTwoYearsAgo = calendar.date(byAdding: .year, value: -3, to: currentDate) {
            return dateTwoYearsAgo
        } else {
            return nil
        }
    }
    class func saveBillPrinter(ip: String){
        UserDefaults.standard.set(ip, forKey: PrinterSetup.ipKey)
        UserDefaults.standard.set(true, forKey: PrinterSetup.chosenKey) // #1011: chosen in Máy in, even 192.168.1.199
    }
    class func loadBillPrinter() -> String{
        // #970: no fake default; "" until a printer IP is saved (the old 192.168.1.199 fallback counts as none)
        return PrinterSetup.savedIP ?? ""
    }
    
    class func saveSyncTime(date: Date?){
        UserDefaults.standard.set(date, forKey: "SyncTime")
    }
    
    class func loadSyncTime() -> Date?{
        return UserDefaults.standard.object(forKey: "SyncTime") as? Date
    }
    
    class func saveNotePrinter(note: String){
        UserDefaults.standard.set(note, forKey: "IpLabelPrinter")
    }
    class func loadNotePrinter() -> String{
        return UserDefaults.standard.string(forKey: "IpLabelPrinter") ?? "*** Vui lòng mang theo CMND/BLX khi lấy đồ"
    }
    
    // #1308: the bank QR switch and the note of a bill are the order's outlet settings (`OutletPrintSettings`), not the device's

    // MARK: - Print Method Management
    class func savePrintMethod(method: String) {
        UserDefaults.standard.set(method, forKey: "PrintMethod")
    }
    
    class func loadPrintMethod() -> String {
        return  "network" //UserDefaults.standard.string(forKey: "PrintMethod") ??
    }
    
    // MARK: - Bluetooth Printer Management
    class func saveBluetoothPrinter(peripheral: CBPeripheral?) {
        if let peripheral = peripheral {
            let printerInfo = [
                "name": peripheral.name ?? "",
                "identifier": peripheral.identifier.uuidString
            ]
            UserDefaults.standard.set(printerInfo, forKey: "BluetoothPrinter")
        } else {
            UserDefaults.standard.removeObject(forKey: "BluetoothPrinter")
        }
    }
    
    class func loadBluetoothPrinter() -> [String: String]? {
        return UserDefaults.standard.dictionary(forKey: "BluetoothPrinter") as? [String: String]
    }
    
    class func saveMerchant(merchant: Merchant){
        if let encoded = try? JSONEncoder.shared.encode(merchant) {
            let defaults = UserDefaults.standard
            defaults.set(encoded, forKey: "MERCHANT")
        }
    }
    class func loadMerchant() -> Merchant?{
        let defaults = UserDefaults.standard
        if let merchant = defaults.object(forKey: "MERCHANT") as? Data {
            if let loadedMerchant = try? JSONDecoder.shared.decode(Merchant.self, from: merchant) {
                return loadedMerchant
            }
        }
        
        return nil
    }
    
    class func saveUser(user: User){
        if let encoded = try? JSONEncoder.shared.encode(user) {
            let defaults = UserDefaults.standard
            defaults.set(encoded, forKey: "USER")
        }
    }
    class func loadUser() -> User?{
        let defaults = UserDefaults.standard
        if let user = defaults.object(forKey: "USER") as? Data {
            if let loadedUser = try? JSONDecoder.shared.decode(User.self, from: user) {
                return loadedUser
            }
        }
        return nil
    }
    
    class func removePreference(){
        let defaults = UserDefaults.standard
        defaults.removeObject(forKey: "USER")
        defaults.removeObject(forKey: "SyncTime")
    }
    
    class func getSyncTimeOrFallback() -> Date {
        return loadSyncTime() ?? date2000() ?? Date()
    }
    
    // MARK: - Last Login Email Management
    class func saveLastLoginEmail(email: String) {
        guard !email.isEmpty else { return }
        UserDefaults.standard.set(email, forKey: "LastLoginEmail")
        UserDefaults.standard.synchronize()
    }
    
    class func loadLastLoginEmail() -> String? {
        return UserDefaults.standard.string(forKey: "LastLoginEmail")
    }
    
    class func clearLastLoginEmail() {
        UserDefaults.standard.removeObject(forKey: "LastLoginEmail")
        UserDefaults.standard.synchronize()
    }
    
    // MARK: - Hide Financial Data for Staff Setting
    /// Save setting to hide financial data for outlet staff
    class func saveHideFinancialDataForStaff(_ hide: Bool) {
        UserDefaults.standard.set(hide, forKey: "HideFinancialDataForStaff")
        UserDefaults.standard.synchronize()
    }
    
    /// Load setting to hide financial data for outlet staff (default: false)
    class func shouldHideFinancialDataForStaff() -> Bool {
        return UserDefaults.standard.bool(forKey: "HideFinancialDataForStaff")
    }

    // MARK: - First-login onboarding
    private static let hasCompletedOnboardingKey = "HasCompletedOnboarding"

    class func hasCompletedOnboarding() -> Bool {
        return UserDefaults.standard.bool(forKey: hasCompletedOnboardingKey)
    }

    class func markOnboardingCompleted() {
        UserDefaults.standard.set(true, forKey: hasCompletedOnboardingKey)
        UserDefaults.standard.synchronize()
    }
}

/// #1308: the note and the bank QR switch of a bill are the order's outlet settings on the server (`Outlet.printNote`,
/// `Outlet.printBankQr`), as on the web. Only the owner edits them; paper, printer IP and Bluetooth stay
/// on the device. Android `OutletPrintSettings`.
enum OutletPrintSettings {
    /// The printed note: the outlet's, or nil when blank (no "Note" block; the old default text is gone)
    static func note(serverNote: String?) -> String? {
        guard let serverNote, !serverNote.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        return serverNote
    }

    /// Only an explicit `true` prints the QR; a payload without the field reads as off
    static func printsBankQr(_ serverValue: Bool?) -> Bool { serverValue == true }

    /// Owner decision: only the shop owner edits the note and the QR here; the outlet admin and staff read the server values (the API itself still lets an outlet admin save his outlet)
    static func canEdit(role: Role?) -> Bool { role == .merchant }

    /// The note field when Máy in opens: the server note; for someone who can edit, an empty server note and an old
    /// device note give the device note, to be saved by the owner (never sent on its own)
    static func prefillNote(serverNote: String?, legacyNote: String?, canEdit: Bool) -> String {
        if let note = note(serverNote: serverNote) { return note }
        guard canEdit, let legacy = note(serverNote: legacyNote) else { return "" }
        return legacy
    }

    /// First branch shown: the login's own, else the app's current one, else the default, else the first
    static func initialOutletId(own: Int?, current: Int?, outlets: [(id: Int, isDefault: Bool)]) -> Int? {
        if let own { return own }
        if let current, outlets.contains(where: { $0.id == current }) { return current }
        return (outlets.first { $0.isDefault } ?? outlets.first)?.id
    }

    /// The old per-device note, only when one was really saved (not the default text that used to print)
    static var legacyDeviceNote: String? { UserDefaults.standard.string(forKey: "IpLabelPrinter") }
    static func clearLegacyDeviceValues(includingNote: Bool) {
        UserDefaults.standard.removeObject(forKey: "PrintBankQr")
        if includingNote { UserDefaults.standard.removeObject(forKey: "IpLabelPrinter") }
    }

    /// An Order from the list or the cart has no outlet info: load the detail before printing
    static func needsDetail(_ order: Order) -> Bool { order.outletPrintBankQr == nil }
}
