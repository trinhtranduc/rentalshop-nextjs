import Foundation

protocol PreviewViewModelProtocol {
    // MARK: - Basic Properties
    var title: String { get }
    var saveButtonTitle: String { get }
    var shouldShowDepositInfo: Bool { get }
    var availableActions: [PreviewAction] { get }
    
    // MARK: - Customer Info
    var customerName: String { get }
    var customerPhone: String { get }
    
    // MARK: - Outlet & Staff Info
    var outletName: String { get }
    var outletAddress: String? { get }
    var outletPhone: String? { get }
    var merchantName: String? { get }
    var staffName: String { get }
    var staffId: Int { get }
    
    // MARK: - Order Info
    var orderType: OrderType { get }
    var orderNumber: String? { get }
    var notes: String { get }
    
    // MARK: - Items
    var itemsCount: Int { get }
    func item(at index: Int) -> Any // Returns CartItem or OrderItem
    
    // MARK: - Financial Info
    var subtotal: Double { get }
    var discountAmount: Double { get }
    var discountText: String { get }
    var totalAmount: Double { get }
    var depositAmount: Double { get }
    var toCollectAmount: Double { get }
    
    // MARK: - Dates
    var createDate: Date? { get }
    var pickupDate: Date? { get }
    var returnDate: Date? { get }
    var isReadyToDeliver: Bool { get }
    
    // MARK: - Deposit Info
    var materialText: String { get }
    var bailAmount: Double { get }
    var damageFee: Double { get }
    
    // MARK: - Input Field States
    var isMaterialTextFieldEnabled: Bool { get }
    var isBailButtonEnabled: Bool { get }
    var isExtraChargeButtonEnabled: Bool { get }
    var isDepositButtonEnabled: Bool { get }
    
    // MARK: - Actions
    func updateNotes(_ notes: String)
    func updateMaterial(_ material: String)
    func updateBailAmount(_ amount: Double)
    func updateDepositAmount(_ amount: Double)
    func updateDamageFee(_ fee: Double)
    func updateReadyToDeliver(_ isReady: Bool)
    
    func saveOrder(completion: @escaping (Result<Void, Error>) -> Void)
    func cancelOrder(completion: @escaping (Result<Void, Error>) -> Void)
    func printOrder(completion: @escaping (Result<Void, Error>) -> Void)
    func updateOrder(completion: @escaping (Result<Void, Error>) -> Void)
    func deleteOrder(completion: @escaping (Result<Void, Error>) -> Void)
    
    func canSave() -> Bool
    func canCancel() -> Bool
    func canPrint() -> Bool
    func canUpdate() -> Bool
}
