import Foundation

// MARK: - Modern API Response (Codable)
// Updated APIResponse to match new API documentation format:
// { success: bool, code: string, message: string, data: {}, error: string? }
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: T?
    let error: String?
}

// MARK: - Pagination Model (Codable)
struct PaginationInfo: Codable {
    let page: Int?
    let limit: Int?
    let total: Int?
    let hasMore: Bool?
    let totalPages: Int?
}

// MARK: - Response Models (All Codable)

// Empty Response for operations that don't return data
struct EmptyResponse: Codable {
    // Empty response - no fields needed
}

// NOTE: Pure data models (Plan, Subscription, Merchant, Outlet, User, LoginData) 
// are now in separate files in /Model folder

// MARK: - Login Response (Codable) - API wrapper with success, code, message

struct LoginResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: LoginData?
    let error: String?
}

// MARK: - Register Response (Codable) - Different structure from Login

// Simplified subscription info for registration response
struct RegisterSubscription: Codable {
    let planName: String?
    let trialEnd: Date?
    let daysRemaining: Int?
    
    enum CodingKeys: String, CodingKey {
        case planName
        case trialEnd
        case daysRemaining
    }
}

// Register data structure (different from LoginData)
struct RegisterData: Codable {
    let user: User
    let merchant: Merchant?
    let outlet: Outlet?
    let subscription: RegisterSubscription?
    let requiresEmailVerification: Bool?
}

// Register response wrapper
struct RegisterResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: RegisterData?
    let error: String?
}

// Health Check Response - matches API documentation format (Codable)
struct HealthResponse: Codable {
    let status: String?
    let timestamp: String?
    let version: String?
}

// MARK: - Codable Product Response Models

// Products Response using Codable - matches API documentation format
struct ProductsResponse: Codable {
    let products: [Product]?
    let total: Int?
    let page: Int?
    let limit: Int?
    let hasMore: Bool?
    
    enum CodingKeys: String, CodingKey {
        case products
        case total
        case page
        case limit
        case hasMore
    }
}

// API Response wrapper for products using Codable
struct APIProductsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: ProductsResponse?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// API Response wrapper for single product using Codable (for create/update operations)
struct APIProductResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: Product?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Image Search Response Models

// Image Search Response Data - matches API documentation format
struct ImageSearchResponseData: Codable {
    let products: [Product]?
    let total: Int?
    let message: String?
    
    enum CodingKeys: String, CodingKey {
        case products
        case total
        case message
    }
}

// API Response wrapper for image search using Codable
struct APIImageSearchResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: ImageSearchResponseData?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Codable Customer Response Models

// Customers Response using Codable - matches API documentation format
struct CustomersResponse: Codable {
    let customers: [Customer]?
    let total: Int?
    let page: Int?
    let limit: Int?
    let hasMore: Bool?
    
    enum CodingKeys: String, CodingKey {
        case customers
        case total
        case page
        case limit
        case hasMore
    }
}

// API Response wrapper for customers using Codable
struct APICustomersResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: CustomersResponse?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// API Response wrapper for single customer using Codable (for create/update operations)
struct APICustomerResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: Customer?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Codable Category Response Models

// Categories Response using Codable - matches API documentation format
struct CategoriesResponseCodable: Codable {
    let categories: [Category]?
    let total: Int?
    let page: Int?
    let limit: Int?
    let hasMore: Bool?
    
    enum CodingKeys: String, CodingKey {
        case categories
        case total
        case page
        case limit
        case hasMore
    }
}

// API Response wrapper for categories using Codable
struct APICategoriesResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: CategoriesResponseCodable?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// API Response wrapper for single category using Codable (for create/update operations)
struct APICategoryResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: Category?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Codable Order Response Models

// Orders Response using Codable - matches API documentation format
struct OrdersResponseCodable: Codable {
    let orders: [Order]?
    let total: Int?
    let page: Int?
    let limit: Int?
    let hasMore: Bool?

    enum CodingKeys: String, CodingKey {
        case orders
        case total
        case page
        case limit
        case hasMore
    }
    
    init(orders: [Order]?, total: Int?, page: Int?, limit: Int?, hasMore: Bool?) {
        self.orders = orders
        self.total = total
        self.page = page
        self.limit = limit
        self.hasMore = hasMore
    }
}

// API Response wrapper for orders using Codable
struct APIOrdersResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: OrdersResponseCodable?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// API Response wrapper for single order using Codable (for create/update operations)
struct APIOrderResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: Order?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Codable Empty Response Models

// Empty Response using Codable for delete/update operations that don't return data
struct EmptyResponseCodable: Codable {
    // Empty response - no fields needed
}

// API Response wrapper for empty responses using Codable
struct APIEmptyResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case error
    }
}

// MARK: - Resend Verification Response Models

// Resend Verification Data - contains message from API
struct ResendVerificationData: Codable {
    let message: String?
    
    enum CodingKeys: String, CodingKey {
        case message
    }
}

// API Response wrapper for resend verification using Codable
struct APIResendVerificationResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: ResendVerificationData?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Forgot Password Response Models

// Forgot Password Data - contains message from API
struct ForgotPasswordData: Codable {
    let message: String?
    
    enum CodingKeys: String, CodingKey {
        case message
    }
}

// API Response wrapper for forgot password using Codable
struct APIForgotPasswordResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: ForgotPasswordData?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}


// MARK: - Analytics Response Models

// Dashboard Analytics Overview
struct DashboardOverview: Codable {
    let totalOrders: Int?
    let totalRevenue: Double?
    let activeOrders: Int?
    let completionRate: String? // Stored as string in API (e.g., "83.3")
    
    enum CodingKeys: String, CodingKey {
        case totalOrders
        case totalRevenue
        case activeOrders
        case completionRate
    }
}

// Dashboard Order Status Counts
struct DashboardOrderStatusCounts: Codable {
    let reserved: Int?
    let pickup: Int?
    let completed: Int?
    let cancelled: Int?
    let returned: Int?
    
    enum CodingKeys: String, CodingKey {
        case reserved
        case pickup
        case completed
        case cancelled
        case returned
    }
}

// Dashboard Today Order (simplified order for dashboard)
struct DashboardTodayOrder: Codable {
    let id: Int?
    let orderNumber: String?
    let status: String?
    let totalAmount: Double?
    let customerName: String?
    let outletName: String?
    let createdAt: String?
    let pickupPlanAt: String?
    let returnPlanAt: String?
    let productNames: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber
        case status
        case totalAmount
        case customerName
        case outletName
        case createdAt
        case pickupPlanAt
        case returnPlanAt
        case productNames
    }
}

// Dashboard Analytics Response - Updated to match API documentation
struct DashboardAnalyticsResponse: Codable {
    let overview: DashboardOverview?
    let orderStatusCounts: DashboardOrderStatusCounts?
    let todayOrders: [DashboardTodayOrder]?

    enum CodingKeys: String, CodingKey {
        case overview
        case orderStatusCounts
        case todayOrders
    }
}

// API Response wrapper for dashboard analytics
struct APIDashboardAnalyticsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: DashboardAnalyticsResponse?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// Top Customer Model - Updated to match API documentation
struct TopCustomer: Codable {
    let id: Int?
    let name: String? // Full name
    let email: String?
    let phone: String?
    let location: String? // Computed from address
    let orderCount: Int?
    let rentalCount: Int?
    let saleCount: Int?
    let totalSpent: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case email
        case phone
        case location
        case orderCount
        case rentalCount
        case saleCount
        case totalSpent
    }
}

// Top Customers Response (includes userRole)
struct TopCustomersResponse: Codable {
    let data: [TopCustomer]?
    let userRole: String?
    
    enum CodingKeys: String, CodingKey {
        case data
        case userRole
    }
}

// Top Product Model - Updated to match API documentation
struct TopProduct: Codable {
    let id: Int?
    let name: String?
    let rentPrice: Double?
    let category: String? // Category name as string
    let rentalCount: Int?
    let totalRevenue: Double?
    let image: String? // First image URL

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case rentPrice
        case category
        case rentalCount
        case totalRevenue
        case image
    }
}

// Recent Activity Model
struct RecentActivity: Codable {
    let id: Int?
    let type: String? // "order", "product", "customer", etc.
    let action: String? // "created", "updated", "deleted"
    let description: String?
    let userId: Int?
    let userName: String?
    let createdAt: String?
    let orderId: Int?
    let productId: Int?
    let customerId: Int?

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case action
        case description
        case userId
        case userName
        case createdAt
        case orderId
        case productId
        case customerId
    }
}

// Orders Analytics Response
struct OrdersAnalyticsResponse: Codable {
    let totalOrders: Int?
    let totalRevenue: Double?
    let ordersByStatus: [String: Int]?
    let ordersByType: [String: Int]? // RENT, SALE
    let averageOrderValue: Double?
    let conversionRate: Double?

    enum CodingKeys: String, CodingKey {
        case totalOrders
        case totalRevenue
        case ordersByStatus
        case ordersByType
        case averageOrderValue
        case conversionRate
    }
}

// Order Statistics Status Breakdown
struct OrderStatusBreakdown: Codable {
    let RESERVED: Int?
    let PICKUPED: Int?
    let RETURNED: Int?
    let COMPLETED: Int?
    let CANCELLED: Int?
    
    enum CodingKeys: String, CodingKey {
        case RESERVED
        case PICKUPED
        case RETURNED
        case COMPLETED
        case CANCELLED
    }
}

// Order Statistics Response
struct OrderStatisticsResponse: Codable {
    let totalOrders: Int?
    let totalRevenue: Double?
    let statusBreakdown: OrderStatusBreakdown?
    
    enum CodingKeys: String, CodingKey {
        case totalOrders
        case totalRevenue
        case statusBreakdown
    }
}

// Income Analytics Item - Updated to match API documentation (array structure)
struct IncomeAnalyticsItem: Codable {
    let month: String? // Monthly: "01/24"; Daily API still puts day label here as "DD/MM/YY"
    let day: String? // Optional alternate day label
    let date: String? // Daily: "YYYY/MM/DD" from /api/analytics/income?groupBy=day
    let dayNumber: Int?
    let year: Int?
    let realIncome: Double?
    let futureIncome: Double?
    let orderCount: Int?
    // For outlet comparison (MERCHANT only)
    let outletId: Int?
    let outletName: String?
    
    enum CodingKeys: String, CodingKey {
        case month
        case day
        case date
        case dayNumber
        case year
        case realIncome
        case futureIncome
        case orderCount
        case outletId
        case outletName
    }
}

// Income Analytics Response - Returns array of items
typealias IncomeAnalyticsResponse = [IncomeAnalyticsItem]

// MARK: - Daily Income Analytics Models

// Daily Income Order (simplified order for daily income analytics; used by /income/daily and /income/orders)
struct DailyIncomeOrder: Codable {
    let id: Int?
    let orderNumber: String?
    let orderType: String?
    let status: String?
    let revenue: Double?
    let revenueType: String?
    let description: String?
    let revenueDate: Date?
    let customerId: Int?
    let customerName: String?
    let customerPhone: String?
    let outletId: Int?
    let outletName: String?
    let createdAt: Date?
    let pickupPlanAt: Date?
    let returnPlanAt: Date?
    let totalAmount: Double?
    let depositAmount: Double?
    let securityDeposit: Double?
    let damageFee: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber
        case orderType
        case status
        case revenue
        case revenueType
        case description
        case revenueDate
        case customerId
        case customerName
        case customerPhone
        case outletId
        case outletName
        case createdAt
        case pickupPlanAt
        case returnPlanAt
        case totalAmount
        case depositAmount
        case securityDeposit
        case damageFee
    }

    private static func decodeISO8601(_ string: String?) -> Date? {
        guard let s = string, !s.isEmpty else { return nil }
        let fmt = ISO8601DateFormatter()
        fmt.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fmt.date(from: s) ?? ISO8601DateFormatter().date(from: s)
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decodeIfPresent(Int.self, forKey: .id)
        orderNumber = try container.decodeIfPresent(String.self, forKey: .orderNumber)
        orderType = try container.decodeIfPresent(String.self, forKey: .orderType)
        status = try container.decodeIfPresent(String.self, forKey: .status)
        revenue = try container.decodeIfPresent(Double.self, forKey: .revenue)
        revenueType = try container.decodeIfPresent(String.self, forKey: .revenueType)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        customerId = try container.decodeIfPresent(Int.self, forKey: .customerId)
        customerName = try container.decodeIfPresent(String.self, forKey: .customerName)
        customerPhone = try container.decodeIfPresent(String.self, forKey: .customerPhone)
        outletId = try container.decodeIfPresent(Int.self, forKey: .outletId)
        outletName = try container.decodeIfPresent(String.self, forKey: .outletName)
        totalAmount = try container.decodeIfPresent(Double.self, forKey: .totalAmount)
        depositAmount = try container.decodeIfPresent(Double.self, forKey: .depositAmount)
        securityDeposit = try container.decodeIfPresent(Double.self, forKey: .securityDeposit)
        damageFee = try container.decodeIfPresent(Double.self, forKey: .damageFee)
        revenueDate = Self.decodeISO8601(try container.decodeIfPresent(String.self, forKey: .revenueDate))
        createdAt = Self.decodeISO8601(try container.decodeIfPresent(String.self, forKey: .createdAt))
        pickupPlanAt = Self.decodeISO8601(try container.decodeIfPresent(String.self, forKey: .pickupPlanAt))
        returnPlanAt = Self.decodeISO8601(try container.decodeIfPresent(String.self, forKey: .returnPlanAt))
    }
}

// Daily Income Day Data
struct DailyIncomeDay: Codable {
    let date: String?
    let dateISO: String?
    let totalRevenue: Double?
    let depositRefund: Double?
    let totalCollateral: Double?
    let totalCollateralPlan: Double?
    let newOrderCount: Int?
    let pickupOrderCount: Int?
    let returnOrderCount: Int?
    let cancelledOrderCount: Int?
    let orders: [DailyIncomeOrder]?

    enum CodingKeys: String, CodingKey {
        case date
        case dateISO
        case totalRevenue
        case depositRefund
        case totalCollateral
        case totalCollateralPlan
        case newOrderCount
        case pickupOrderCount
        case returnOrderCount
        case cancelledOrderCount
        case orders
    }
}

// Order counts in daily income summary
struct DailyIncomeOrderCounts: Codable {
    let new: Int?
    let pickup: Int?
    let `return`: Int?
    let cancelled: Int?

    enum CodingKeys: String, CodingKey {
        case new
        case pickup
        case `return`
        case cancelled
    }
}

// Daily Income Summary (overview by date API response; also used by /income/summary)
struct DailyIncomeSummary: Codable {
    let totalDays: Int?
    let orderCounts: DailyIncomeOrderCounts?
    let totalRevenue: Double?
    let totalActualRevenue: Double?
    let totalCollateral: Double?
    let totalDepositRefund: Double?
    let totalCollateralPlanExpectedToRefund: Double?
    let totalCollateralPlan: Double?
    let totalRevenuePlan: Double?
    let totalNewOrders: Int?
    let totalOrders: Int?

    enum CodingKeys: String, CodingKey {
        case totalDays
        case orderCounts
        case totalRevenue
        case totalActualRevenue
        case totalCollateral
        case totalDepositRefund
        case totalCollateralPlanExpectedToRefund
        case totalCollateralPlan
        case totalRevenuePlan
        case totalNewOrders
        case totalOrders
    }
}

// MARK: - Income Summary API (/api/analytics/income/summary) — no order list

/// One period (day) in income summary response
struct IncomeSummaryPeriod: Codable {
    let date: String?
    let dateISO: String?
    let totalRevenue: Double?
    let depositRefund: Double?
    let totalCollateral: Double?
    let totalCollateralPlan: Double?
    let newOrderCount: Int?
    let pickupOrderCount: Int?
    let returnOrderCount: Int?
    let cancelledOrderCount: Int?

    enum CodingKeys: String, CodingKey {
        case date
        case dateISO
        case totalRevenue
        case depositRefund
        case totalCollateral
        case totalCollateralPlan
        case newOrderCount
        case pickupOrderCount
        case returnOrderCount
        case cancelledOrderCount
    }
}

/// Data payload for GET /api/analytics/income/summary
struct IncomeSummaryData: Codable {
    let startDate: String?
    let endDate: String?
    let summary: DailyIncomeSummary?
    let periods: [IncomeSummaryPeriod]?

    enum CodingKeys: String, CodingKey {
        case startDate
        case endDate
        case summary
        case periods
    }
}

/// Wrapper for GET /api/analytics/income/summary (code: INCOME_SUMMARY_SUCCESS)
struct APIIncomeSummaryResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: IncomeSummaryData?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Income Orders API (/api/analytics/income/orders)

/// Pagination when limit/offset are used (code: INCOME_ORDERS_SUCCESS)
struct IncomeOrdersPagination: Codable {
    let total: Int?
    let limit: Int?
    let offset: Int?
    let hasMore: Bool?

    enum CodingKeys: String, CodingKey {
        case total
        case limit
        case offset
        case hasMore
    }
}

/// Data payload for GET /api/analytics/income/orders
struct IncomeOrdersData: Codable {
    let startDate: String?
    let endDate: String?
    let days: [DailyIncomeDay]?
    let pagination: IncomeOrdersPagination?

    enum CodingKeys: String, CodingKey {
        case startDate
        case endDate
        case days
        case pagination
    }
}

/// Wrapper for GET /api/analytics/income/orders (code: INCOME_ORDERS_SUCCESS)
struct APIIncomeOrdersResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: IncomeOrdersData?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// Daily Income Analytics Response
struct DailyIncomeAnalyticsResponse: Codable {
    let startDate: String?
    let endDate: String?
    let days: [DailyIncomeDay]?
    let summary: DailyIncomeSummary?
    
    enum CodingKeys: String, CodingKey {
        case startDate
        case endDate
        case days
        case summary
    }
}

// API Response wrapper for daily income analytics
struct APIDailyIncomeAnalyticsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: DailyIncomeAnalyticsResponse?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// API Response wrappers for Analytics
struct APIOrdersAnalyticsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: OrdersAnalyticsResponse?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// Today Metrics Response
struct TodayMetricsResponse: Codable {
    let totalOrders: Int?
    let activeRentals: Int?
    let completedOrders: Int?
    let totalRevenue: Double?
    let overdueItems: Int?
    let totalStock: Int?
    let availableStock: Int?
    let rentingStock: Int?
    
    enum CodingKeys: String, CodingKey {
        case totalOrders
        case activeRentals
        case completedOrders
        case totalRevenue
        case overdueItems
        case totalStock
        case availableStock
        case rentingStock
    }
}

// Growth Metrics Orders/Revenue
struct GrowthMetricsValue: Codable {
    let current: Int?
    let previous: Int?
    let growth: Double? // Percentage
    
    enum CodingKeys: String, CodingKey {
        case current
        case previous
        case growth
    }
}

// Growth Metrics Revenue (uses Double for current/previous)
struct GrowthMetricsRevenue: Codable {
    let current: Double?
    let previous: Double?
    let growth: Double? // Percentage
    
    enum CodingKeys: String, CodingKey {
        case current
        case previous
        case growth
    }
}

// Growth Metrics Response
struct GrowthMetricsResponse: Codable {
    let orders: GrowthMetricsValue?
    let revenue: GrowthMetricsRevenue?
    
    enum CodingKeys: String, CodingKey {
        case orders
        case revenue
    }
}

// Recent Order Model
struct RecentOrder: Codable {
    let id: Int?
    let orderNumber: String?
    let customerName: String?
    let customerPhone: String?
    let productNames: String?
    let productImage: String?
    let totalAmount: Double?
    let status: String?
    let orderType: String?
    let createdAt: String?
    let createdBy: String?
    let pickupPlanAt: String?
    let returnPlanAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber
        case customerName
        case customerPhone
        case productNames
        case productImage
        case totalAmount
        case status
        case orderType
        case createdAt
        case createdBy
        case pickupPlanAt
        case returnPlanAt
    }
}

struct APIIncomeAnalyticsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: [IncomeAnalyticsItem]? // Updated to array
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

struct APITopCustomersResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: [TopCustomer]?
    let userRole: String? // Added userRole field
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case userRole
        case error
    }
}

struct APITopProductsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: [TopProduct]?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

struct APIRecentActivitiesResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: [RecentActivity]?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// API Response wrappers for new Analytics endpoints
struct APIOrderStatisticsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: OrderStatisticsResponse?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

struct APITodayMetricsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: TodayMetricsResponse?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

struct APIGrowthMetricsResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: GrowthMetricsResponse?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Analytics Overview (aggregated) Models

/// Aggregated payload for GET /api/analytics/overview.
/// Combines the yearly report data that was previously fetched via 5 separate endpoints.
struct AnalyticsOverviewResponse: Codable {
    let income: [IncomeAnalyticsItem]?
    let growth: GrowthMetricsResponse?
    let statistics: OrderStatisticsResponse?
    let topProducts: [TopProduct]?
    let topCustomers: [TopCustomer]?

    enum CodingKeys: String, CodingKey {
        case income
        case growth
        case statistics
        case topProducts
        case topCustomers
    }
}

struct APIAnalyticsOverviewResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: AnalyticsOverviewResponse?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

struct APIRecentOrdersResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: [RecentOrder]?
    let error: String?

    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Calendar Response Models

// Calendar Order Item - Individual order item within a pickup
struct CalendarOrderItem: Codable {
    let id: Int?
    let quantity: Int?
    let unitPrice: Double?
    let totalPrice: Double?
    let notes: String?
    let productId: Int?
    let productName: String?
    let productBarcode: String?
    let productImages: [String]?
    let productRentPrice: Double?
    let productDeposit: Double?

    enum CodingKeys: String, CodingKey {
        case id
        case quantity
        case unitPrice
        case totalPrice
        case notes
        case productId
        case productName
        case productBarcode
        case productImages
        case productRentPrice
        case productDeposit
    }
}

// Calendar Order Item for calendar view
struct CalendarOrder: Codable {
    let id: Int?
    let orderNumber: String?
    let customerName: String?
    let customerPhone: String?
    let status: String?
    let totalAmount: Double?
    let outletName: String?
    let pickupPlanAt: String?
    let returnPlanAt: String?
    let productName: String?
    let productCount: Int?
    let orderItems: [CalendarOrderItem]?
    let isReadyToDeliver: Bool?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber
        case customerName
        case customerPhone
        case status
        case totalAmount
        case outletName
        case pickupPlanAt
        case returnPlanAt
        case productName
        case productCount
        case orderItems
        case isReadyToDeliver
        case createdAt
    }
}

// Calendar Day Summary
struct CalendarDaySummary: Codable {
    let totalOrders: Int?
    let totalRevenue: Double?
    let totalPickups: Int?
    let totalReturns: Int?
    let averageOrderValue: Double?

    enum CodingKeys: String, CodingKey {
        case totalOrders
        case totalRevenue
        case totalPickups
        case totalReturns
        case averageOrderValue
    }
}

// Calendar Day Data
struct CalendarDayData: Codable {
    let date: String?
    let orders: [CalendarOrder]?
    let summary: CalendarDaySummary?

    enum CodingKeys: String, CodingKey {
        case date
        case orders
        case summary
    }
}

// Calendar Meta Information
struct CalendarMeta: Codable {
    let month: Int?
    let year: Int?
    let totalDays: Int?
    let stats: CalendarStats?
    let dateRange: CalendarDateRange?

    enum CodingKeys: String, CodingKey {
        case month
        case year
        case totalDays
        case stats
        case dateRange
    }
}

// Calendar Stats
struct CalendarStats: Codable {
    let totalPickups: Int?
    let totalOrders: Int?
    let totalRevenue: Double?
    let totalReturns: Int?
    let averageOrderValue: Double?

    enum CodingKeys: String, CodingKey {
        case totalPickups
        case totalOrders
        case totalRevenue
        case totalReturns
        case averageOrderValue
    }
}

// Calendar Date Range
struct CalendarDateRange: Codable {
    let start: String?
    let end: String?

    enum CodingKeys: String, CodingKey {
        case start
        case end
    }
}

// Calendar Data Response - The actual data structure from API
struct CalendarDataResponse: Codable {
    let calendar: [CalendarDayData]?
    let summary: CalendarDaySummary?

    enum CodingKeys: String, CodingKey {
        case calendar
        case summary
    }
}

// API Response wrapper for calendar orders
struct APICalendarOrdersResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: CalendarDataResponse?
    let meta: CalendarMeta?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case meta
        case error
    }
}

// MARK: - Calendar Orders Count API Response Models

// Orders Count Response Data
struct OrdersCountData: Codable {
    let countByDate: [String: Int]?  // Dictionary with date (yyyy-MM-dd) as key and count as value
    let total: Int?
    let filters: OrdersCountFilters?
    
    enum CodingKeys: String, CodingKey {
        case countByDate
        case total
        case filters
    }
}

// Orders Count Filters
struct OrdersCountFilters: Codable {
    let outletId: Int?
    let merchantId: Int?
    let orderType: String?
    let status: String?
    let from: String?
    let to: String?
    let month: Int?
    let year: Int?
    
    enum CodingKeys: String, CodingKey {
        case outletId
        case merchantId
        case orderType
        case status
        case from
        case to
        case month
        case year
    }
}

// API Response wrapper for calendar orders count
struct APICalendarOrdersCountResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: OrdersCountData?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Calendar Orders By Date API Response Models

// Orders By Date Summary
struct OrdersByDateSummary: Codable {
    let totalOrders: Int?
    let totalRevenue: Double?
    let averageOrderValue: Double?
    
    enum CodingKeys: String, CodingKey {
        case totalOrders
        case totalRevenue
        case averageOrderValue
    }
}

// Orders By Date Pagination
struct OrdersByDatePagination: Codable {
    let page: Int?
    let limit: Int?
    let total: Int?
    let totalPages: Int?
    let hasMore: Bool?
    
    enum CodingKeys: String, CodingKey {
        case page
        case limit
        case total
        case totalPages
        case hasMore
    }
}

// Orders By Date Filters
struct OrdersByDateFilters: Codable {
    let outletId: Int?
    let merchantId: Int?
    let orderType: String?
    let status: String?
    
    enum CodingKeys: String, CodingKey {
        case outletId
        case merchantId
        case orderType
        case status
    }
}

// MARK: - Calendar Order By Date Model (Simplified Order for Calendar API)

/// Simplified Order model for calendar orders by date API
/// This matches the simplified structure returned by /api/calendar/orders/by-date
struct CalendarOrderByDate: Codable {
    let id: Int
    let orderNumber: String
    let customerName: String?
    let customerPhone: String?
    let status: String
    let orderType: String?
    let totalAmount: Double
    let outletName: String?
    let pickupPlanAt: Date?
    let returnPlanAt: Date?
    let productName: String?
    let productCount: Int?
    let orderItems: [OrderItem]
    let isReadyToDeliver: Bool?
    let createdAt: Date?
    
    enum CodingKeys: String, CodingKey {
        case id
        case orderNumber
        case customerName
        case customerPhone
        case status
        case orderType
        case totalAmount
        case outletName
        case pickupPlanAt
        case returnPlanAt
        case productName
        case productCount
        case orderItems
        case isReadyToDeliver
        case createdAt
    }
}

// Update OrdersByDateData to use CalendarOrderByDate instead of Order
struct OrdersByDateData: Codable {
    let date: String?
    let orders: [CalendarOrderByDate]?  // Changed from [Order] to [CalendarOrderByDate]
    let summary: OrdersByDateSummary?
    let pagination: OrdersByDatePagination?
    let filters: OrdersByDateFilters?
    
    enum CodingKeys: String, CodingKey {
        case date
        case orders
        case summary
        case pagination
        case filters
    }
}

// API Response wrapper for calendar orders by date
struct APICalendarOrdersByDateResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: OrdersByDateData?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

// MARK: - Product Availability API Response Models

struct ProductAvailabilityResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: ProductAvailabilityData?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

struct ProductAvailabilityData: Codable {
    let product: ProductAvailabilityProduct?
    let date: String?
    let summary: ProductAvailabilitySummary?
    let orders: [Order]?
    let meta: ProductAvailabilityMeta?
    
    enum CodingKeys: String, CodingKey {
        case product
        case date
        case summary
        case orders
        case meta
    }
}

struct ProductAvailabilityProduct: Codable {
    let id: Int?
    let name: String?
    let barcode: String?
    let outletId: Int?
    let outletName: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case barcode
        case outletId
        case outletName
    }
}

struct ProductAvailabilitySummary: Codable {
    let totalStock: Int?
    let totalRented: Int?
    let totalReserved: Int?
    let totalAvailable: Int?
    let isAvailable: Bool?
    
    enum CodingKeys: String, CodingKey {
        case totalStock
        case totalRented
        case totalReserved
        case totalAvailable
        case isAvailable
    }
}

struct ProductAvailabilityMeta: Codable {
    let totalOrders: Int?
    let date: String?
    let checkedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case totalOrders
        case date
        case checkedAt
    }
}

// MARK: - Batch Product Availability API Models

struct BatchAvailabilityRequest: Codable {
    let products: [BatchProductRequest]
    let startDate: String
    let endDate: String
    let outletId: Int?
    let includeTimePrecision: Bool?
    let timeZone: String?
    
    enum CodingKeys: String, CodingKey {
        case products
        case startDate
        case endDate
        case outletId
        case includeTimePrecision
        case timeZone
    }
}

struct BatchProductRequest: Codable {
    let productId: Int
    let quantity: Int
}

// MARK: - New Product Availability API Response (GET /api/products/[id]/availability)
// Used by Order Check screen for detailed conflict analysis

struct NewAvailabilityResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: NewAvailabilityData?
    let error: String?
}

struct NewAvailabilityData: Codable {
    let productId: Int?
    let productName: String?
    let totalStock: Int?
    let totalAvailableStock: Int?
    let totalRenting: Int?
    let requestedQuantity: Int?
    let isAvailable: Bool?
    let stockAvailable: Bool?
    let hasNoConflicts: Bool?
    let totalConflictsFound: Int?
    let message: String?
    let rentalPeriod: NewAvailabilityRentalPeriod?
    let availabilityByOutlet: [NewAvailabilityOutlet]?
    let orders: [NewAvailabilityOrder]?
    
    enum CodingKeys: String, CodingKey {
        case productId, productName, totalStock, totalAvailableStock, totalRenting
        case requestedQuantity, isAvailable, stockAvailable, hasNoConflicts
        case totalConflictsFound, message, rentalPeriod, availabilityByOutlet, orders
    }
}

struct NewAvailabilityRentalPeriod: Codable {
    let startDate: String?
    let endDate: String?
    let durationDays: Int?
    let durationHours: Double?
}

struct NewAvailabilityOutlet: Codable {
    let outletId: Int?
    let outletName: String?
    let stock: Int?
    let available: Int?
    let renting: Int?
    let conflictingQuantity: Int?
    let effectivelyAvailable: Int?
    let canFulfillRequest: Bool?
    let conflicts: [NewAvailabilityConflict]?
}

struct NewAvailabilityConflict: Codable {
    let orderNumber: String?
    let customerName: String?
    let pickupDate: String?
    let returnDate: String?
    let quantity: Int?
    let conflictType: String?
    let conflictHours: Double?
}

struct NewAvailabilityOrder: Codable {
    let id: Int?
    let orderNumber: String?
    let status: String?
    let customerName: String?
    let customerPhone: String?
    let pickupPlanAt: String?
    let returnPlanAt: String?
    let quantity: Int?
    let isConflict: Bool?
}

struct BatchAvailabilityResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: BatchAvailabilityData?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

struct BatchAvailabilityData: Codable {
    let results: [BatchProductAvailabilityResult]
    let summary: BatchAvailabilitySummary
    let rentalPeriod: RentalPeriod?
    
    enum CodingKeys: String, CodingKey {
        case results
        case summary
        case rentalPeriod
    }
}

struct BatchProductAvailabilityResult: Codable {
    let productId: Int
    let productName: String?
    let totalStock: Int?
    let totalAvailableStock: Int?
    let totalRenting: Int?
    let requestedQuantity: Int
    let rentalPeriod: RentalPeriod?
    let isAvailable: Bool
    let stockAvailable: Bool
    let hasNoConflicts: Bool
    let availabilityByOutlet: [OutletAvailability]?
    let bestOutlet: OutletInfo?
    let totalConflictsFound: Int?
    let message: String?
}

struct RentalPeriod: Codable {
    let startDate: String
    let endDate: String
    let startDateLocal: String?
    let endDateLocal: String?
    let durationMs: Int?
    let durationHours: Int?
    let durationDays: Int?
    let timeZone: String?
    let includeTimePrecision: Bool?
}

struct OutletAvailability: Codable {
    let outletId: Int
    let outletName: String?
    let stock: Int?
    let available: Int?
    let renting: Int?
    let conflictingQuantity: Int?
    let effectivelyAvailable: Int?
    let canFulfillRequest: Bool
    let conflicts: [ConflictInfo]?
}

struct ConflictInfo: Codable {
    let orderNumber: String?
    let customerName: String?
    let pickupDate: String?
    let returnDate: String?
    let pickupDateLocal: String?
    let returnDateLocal: String?
    let quantity: Int?
    let conflictDuration: Int?
    let conflictHours: Int?
    let conflictType: String?
}

struct OutletInfo: Codable {
    let outletId: Int
    let outletName: String?
    let effectivelyAvailable: Int?
}

struct BatchAvailabilitySummary: Codable {
    let totalProducts: Int
    let availableProducts: Int
    let unavailableProducts: Int
    let errorProducts: Int
}

// MARK: - Codable User Response Models

// Users Response using Codable - matches API documentation format
struct UsersResponse: Codable {
    let users: [User]?
    let total: Int?
    let page: Int?
    let limit: Int?
    let hasMore: Bool?
    
    enum CodingKeys: String, CodingKey {
        case users
        case total
        case page
        case limit
        case hasMore
    }
}

// API Response wrapper for users using Codable
// Note: API returns data as array of users directly, with pagination at root level
struct APIUsersResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: [User]?  // Array of users directly (not wrapped in UsersResponse)
    let pagination: PaginationInfo?  // Pagination info at root level
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case pagination
        case error
    }
}

// API Response wrapper for single user using Codable (for create/update operations)
struct APIUserResponse: Codable {
    let success: Bool
    let code: String?
    let message: String?
    let data: User?
    let error: String?
    
    enum CodingKeys: String, CodingKey {
        case success
        case code
        case message
        case data
        case error
    }
}

