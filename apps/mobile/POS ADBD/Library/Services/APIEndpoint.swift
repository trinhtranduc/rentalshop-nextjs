import SwiftyJSON

enum ValidationStringMessage: String {
    case cannotParseData = " Không thể parse dữ liệu. Kiểm tra lại"
    case noNetwork = "Lỗi không có mạng"
    case unknowError = "Opps!!! Có lỗi"
    case cannotObtainData = "Không thể lấy dữ liệu"
}

extension NSError {
    class func errorWithOwnMessage(message: String, domain: String) -> NSError {
        var dict = [String: AnyObject]()
        dict[NSLocalizedDescriptionKey] = message as AnyObject?

        return NSError(domain: domain, code: 1000, userInfo: dict)
    }
    class func errorWithOwnMessage(message: String, domain: String, code: Int) -> NSError {
        var dict = [String: AnyObject]()
        dict[NSLocalizedDescriptionKey] = message as AnyObject?

        return NSError(domain: domain, code: code, userInfo: dict)
    }
}

extension Array {
    var json: String {
        let paramsJSON = JSON(self)
        let paramsString = paramsJSON.rawString(String.Encoding.utf8, options: JSONSerialization.WritingOptions.prettyPrinted)!

        return paramsString
    }
}

enum APIEndpoint {
    // Production and Development URLs based on API documentation
    static let prodBaseURL = "https://api.anyrent.shop"
    static let devBaseURL = "https://dev-api.anyrent.shop"
    
    // Read API base URL from Info.plist based on build configuration
    // Development (Debug) uses dev-api.anyrent.shop
    // Production (Release) uses api.anyrent.shop
    // The value is set via build settings: API_BASE_URL -> INFOPLIST_KEY_API_BASE_URL -> Info.plist
    static var currentBaseURL: String {
        // Read from Info.plist (populated by build settings during compilation)
        if let apiURL = Bundle.main.infoDictionary?["API_BASE_URL"] as? String,
           !apiURL.isEmpty,
           !apiURL.hasPrefix("$(") { // Make sure it's not a placeholder
            return apiURL
        }
        
        // Fallback: Use build configuration flags
        // This ensures it works even if Info.plist value is not set correctly
        #if DEBUG
        return devBaseURL
        #else
        return prodBaseURL
        #endif
    }

    enum Path {
        // Authentication - Updated according to API documentation
        static let login = "/api/auth/login"
        static let logout = "/api/auth/logout"
        static let register = "/api/auth/register"
        static let changePassword = "/api/auth/change-password"
        static let forgotPassword = "/api/auth/forgot-password"
        static let resetPassword = "/api/auth/reset-password"
        static let resendVerification = "/api/auth/resend-verification"
        
        // Users
        static let users = "/api/users"
        static let userProfile = "/api/users/profile"
        
        // Products - Updated according to API documentation
        static let products = "/api/products"
        static let exportProducts = "/api/products/export"
        
        // Categories
        static let categories = "/api/categories"
        
        // Orders - Updated according to API documentation
        static let orders = "/api/orders"
        static let orderByNumber = "/api/orders/by-number"
        static let updateOrderStatus = "/api/orders"
        static let ordersStatistics = "/api/orders/statistics"
        static let exportOrders = "/api/orders/export"
        static let orderQRCode = "/api/orders" // Will append /{orderId}/qr-code
        
        // Customers - Updated according to API documentation
        static let customers = "/api/customers"
        static let customerOrders = "/api/customers"
        static let exportCustomers = "/api/customers/export"
        
        // Payments
        static let payments = "/api/payments"
        static let processPayment = "/api/payments/process"
        static let manualPayment = "/api/payments/manual"
        
        // Merchants
        static let merchants = "/api/merchants"
        static let registerMerchant = "/api/merchants/register"
        
        // Outlets
        static let outlets = "/api/outlets"
        
        // Bank Accounts - Path template: /api/merchants/{merchantId}/outlets/{outletId}/bank-accounts
        static func bankAccounts(merchantId: Int, outletId: Int) -> String {
            return "/api/merchants/\(merchantId)/outlets/\(outletId)/bank-accounts"
        }
        
        // Analytics
        static let dashboardAnalytics = "/api/analytics/dashboard"
        static let ordersAnalytics = "/api/analytics/orders"
        static let incomeAnalytics = "/api/analytics/income"
        static let incomeAnalyticsDaily = "/api/analytics/income/daily"
        /// GET summary: startDate, endDate (YYYY-MM-DD). No order list.
        static let incomeSummary = "/api/analytics/income/summary"
        /// GET orders: startDate, endDate, status?, plan?, limit?, offset?
        static let incomeOrders = "/api/analytics/income/orders"
        static let topCustomers = "/api/analytics/top-customers"
        static let topProducts = "/api/analytics/top-products"
        static let recentActivities = "/api/analytics/recent-activities"
        static let todayMetrics = "/api/analytics/today-metrics"
        static let growthMetrics = "/api/analytics/growth-metrics"
        static let recentOrders = "/api/analytics/recent-orders"
        /// GET aggregated yearly overview (income + growth + statistics + top products/customers)
        /// Params: startDate, endDate (YYYY-MM-DD), limit? (top lists)
        static let analyticsOverview = "/api/analytics/overview"
        
        // Calendar
        static let calendarOrders = "/api/calendar/orders"
        static let calendarOrdersCount = "/api/calendar/orders/count"
        static let calendarOrdersByDate = "/api/calendar/orders/by-date"
        
        // Mobile APIs
        static let mobileLogin = "/api/mobile/auth/login"
        static let registerDevice = "/api/mobile/notifications/register-device"
        static let syncCheck = "/api/mobile/sync/check"
        
        // System APIs
        static let healthCheck = "/api/health"
        static let databaseHealth = "/api/health/database"
        static let volumeHealth = "/api/health/volume"
        
        // File Upload
        static let uploadImage = "/api/upload/image"
        
        // Legacy endpoints for backward compatibility (to be removed later)
        static let createAccount = "/register_account"
        static let accountDeletion = "/enable_disable_account"
        static let validateAccount = "/validate_account"
    }
} 
