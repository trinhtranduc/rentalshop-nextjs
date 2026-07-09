import Foundation
import Alamofire

// MARK: - Analytics API Service Protocol
protocol AnalyticsAPIServiceProtocol {
    func loadDashboardAnalytics(period: String?, completion: @escaping (DashboardAnalyticsResponse?, NSError?) -> Void)
    func loadOrdersAnalytics(startDate: Date?, endDate: Date?, outletId: Int?, completion: @escaping (OrdersAnalyticsResponse?, NSError?) -> Void)
    func loadOrderStatistics(startDate: Date?, endDate: Date?, completion: @escaping (OrderStatisticsResponse?, NSError?) -> Void)
    func loadIncomeAnalytics(startDate: Date?, endDate: Date?, outletId: Int?, groupBy: String?, outletIds: [Int]?, completion: @escaping ([IncomeAnalyticsItem]?, NSError?) -> Void)
    func loadDailyIncomeAnalytics(startDate: Date?, endDate: Date?, completion: @escaping (DailyIncomeAnalyticsResponse?, NSError?) -> Void)
    /// GET /api/analytics/income/summary — tổng hợp doanh thu theo kỳ, breakdown theo ngày, không trả danh sách đơn
    func loadIncomeSummary(startDate: Date?, endDate: Date?, completion: @escaping (IncomeSummaryData?, NSError?) -> Void)
    /// GET /api/analytics/income/orders — danh sách đơn trong kỳ, lọc status/plan, phân trang tùy chọn
    func loadIncomeOrders(startDate: Date?, endDate: Date?, status: String?, plan: Bool?, limit: Int?, offset: Int?, completion: @escaping (IncomeOrdersData?, NSError?) -> Void)
    func loadTodayMetrics(completion: @escaping (TodayMetricsResponse?, NSError?) -> Void)
    func loadTopCustomers(limit: Int?, startDate: Date?, endDate: Date?, completion: @escaping ([TopCustomer]?, NSError?) -> Void)
    func loadTopProducts(limit: Int?, startDate: Date?, endDate: Date?, completion: @escaping ([TopProduct]?, NSError?) -> Void)
    func loadGrowthMetrics(startDate: Date?, endDate: Date?, completion: @escaping (GrowthMetricsResponse?, NSError?) -> Void)
    /// GET /api/analytics/overview — aggregated yearly overview in a single request
    func loadAnalyticsOverview(startDate: Date?, endDate: Date?, limit: Int?, completion: @escaping (AnalyticsOverviewResponse?, NSError?) -> Void)
    /// GET /api/analytics/period — duration report (operational, revenue, growth, series, top lists)
    func loadAnalyticsPeriod(startDate: Date?, endDate: Date?, groupBy: String?, limit: Int?, completion: @escaping (AnalyticsPeriodResponse?, NSError?) -> Void)
    func loadRecentOrders(startDate: Date?, endDate: Date?, completion: @escaping ([RecentOrder]?, NSError?) -> Void)
    func loadRecentActivities(limit: Int?, completion: @escaping ([RecentActivity]?, NSError?) -> Void)
}

// MARK: - Analytics API Service Implementation
class AnalyticsAPIService: BaseService, AnalyticsAPIServiceProtocol {
    
    // MARK: - Dashboard Analytics
    func loadDashboardAnalytics(period: String? = nil, completion: @escaping (DashboardAnalyticsResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.dashboardAnalytics
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let period = period {
            params["period"] = period
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Dashboard Analytics Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Dashboard Analytics Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        // Try to decode as direct response (no wrapper) first
                        let dashboardResponse = try JSONDecoder.shared.decode(DashboardAnalyticsResponse.self, from: data)
                        completion(dashboardResponse, nil)
                    } catch {
                        // If direct decode fails, try with wrapper
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIDashboardAnalyticsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load dashboard analytics"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "dashboard_analytics")
                        }
                        completion(nil, nsError)
                        }
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "dashboard_analytics")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Orders Analytics
    func loadOrdersAnalytics(startDate: Date? = nil, endDate: Date? = nil, outletId: Int? = nil, completion: @escaping (OrdersAnalyticsResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.ordersAnalytics
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Orders Analytics Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Orders Analytics Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIOrdersAnalyticsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load orders analytics"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "orders_analytics")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "orders_analytics")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Daily Income Analytics
    func loadDailyIncomeAnalytics(startDate: Date? = nil, endDate: Date? = nil, completion: @escaping (DailyIncomeAnalyticsResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.incomeAnalyticsDaily
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Daily Income Analytics Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Daily Income Analytics Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIDailyIncomeAnalyticsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load daily income analytics"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "daily_income_analytics")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "daily_income_analytics")
                    }
                    completion(nil, nsError)
                }
            }
    }

    // MARK: - Income Summary (GET /api/analytics/income/summary)
    func loadIncomeSummary(startDate: Date? = nil, endDate: Date? = nil, completion: @escaping (IncomeSummaryData?, NSError?) -> Void) {
        let path = APIEndpoint.Path.incomeSummary
        let fullURL = APIEndpoint.currentBaseURL + path
        var params: [String: Any] = [:]
        if let startDate = startDate { params["startDate"] = startDate.dateServerInString() }
        if let endDate = endDate { params["endDate"] = endDate.dateServerInString() }
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                switch response.result {
                case .success(let data):
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIIncomeSummaryResponse.self, from: data)
                        if apiResponse.success, let dataPayload = apiResponse.data {
                            completion(dataPayload, nil)
                        } else {
                            completion(nil, self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load income summary"
                            ))
                        }
                    } catch {
                        completion(nil, error as NSError)
                    }
                case .failure(let error):
                    completion(nil, error as NSError)
                }
            }
    }

    // MARK: - Income Orders (GET /api/analytics/income/orders)
    func loadIncomeOrders(startDate: Date? = nil, endDate: Date? = nil, status: String? = nil, plan: Bool? = nil, limit: Int? = nil, offset: Int? = nil, completion: @escaping (IncomeOrdersData?, NSError?) -> Void) {
        let path = APIEndpoint.Path.incomeOrders
        let fullURL = APIEndpoint.currentBaseURL + path
        var params: [String: Any] = [:]
        if let startDate = startDate { params["startDate"] = startDate.dateServerInString() }
        if let endDate = endDate { params["endDate"] = endDate.dateServerInString() }
        if let status = status, !status.isEmpty { params["status"] = status }
        if let plan = plan { params["plan"] = plan }
        if let limit = limit { params["limit"] = limit }
        if let offset = offset { params["offset"] = offset }
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                switch response.result {
                case .success(let data):
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIIncomeOrdersResponse.self, from: data)
                        if apiResponse.success, let dataPayload = apiResponse.data {
                            completion(dataPayload, nil)
                        } else {
                            completion(nil, self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load income orders"
                            ))
                        }
                    } catch {
                        completion(nil, error as NSError)
                    }
                case .failure(let error):
                    completion(nil, error as NSError)
                }
            }
    }

    // MARK: - Income Analytics
    func loadIncomeAnalytics(startDate: Date? = nil, endDate: Date? = nil, outletId: Int? = nil, groupBy: String? = nil, outletIds: [Int]? = nil, completion: @escaping ([IncomeAnalyticsItem]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.incomeAnalytics
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        if let groupBy = groupBy {
            params["groupBy"] = groupBy // "month" or "day"
        }
        if let outletIds = outletIds, !outletIds.isEmpty {
            // Convert array to comma-separated string
            params["outletIds"] = outletIds.map { String($0) }.joined(separator: ",")
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Income Analytics Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Income Analytics Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIIncomeAnalyticsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load income analytics"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "income_analytics")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "income_analytics")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Top Customers
    func loadTopCustomers(limit: Int? = nil, startDate: Date? = nil, endDate: Date? = nil, completion: @escaping ([TopCustomer]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.topCustomers
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let limit = limit {
            params["limit"] = limit
        }
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Top Customers Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Top Customers Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APITopCustomersResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            let errorMessage = apiResponse.message ?? apiResponse.error ?? "Failed to load top customers"
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: errorMessage
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "top_customers")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "top_customers")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Top Products
    func loadTopProducts(limit: Int? = nil, startDate: Date? = nil, endDate: Date? = nil, completion: @escaping ([TopProduct]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.topProducts
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let limit = limit {
            params["limit"] = limit
        }
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Top Products Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Top Products Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APITopProductsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            let errorMessage = apiResponse.message ?? apiResponse.error ?? "Failed to load top products"
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: errorMessage
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "top_products")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "top_products")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Order Statistics
    func loadOrderStatistics(startDate: Date? = nil, endDate: Date? = nil, completion: @escaping (OrderStatisticsResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.ordersStatistics
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Order Statistics Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Order Statistics Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIOrderStatisticsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load order statistics"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "order_statistics")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "order_statistics")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Today Metrics
    func loadTodayMetrics(completion: @escaping (TodayMetricsResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.todayMetrics
        let fullURL = APIEndpoint.currentBaseURL + path
        
        AF.request(fullURL, method: .get, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Today Metrics Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Today Metrics Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APITodayMetricsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load today metrics"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "today_metrics")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "today_metrics")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Growth Metrics
    func loadGrowthMetrics(startDate: Date? = nil, endDate: Date? = nil, completion: @escaping (GrowthMetricsResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.growthMetrics
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Growth Metrics Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Growth Metrics Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIGrowthMetricsResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load growth metrics"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "growth_metrics")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "growth_metrics")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Analytics Overview (aggregated)
    func loadAnalyticsOverview(startDate: Date? = nil, endDate: Date? = nil, limit: Int? = nil, completion: @escaping (AnalyticsOverviewResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.analyticsOverview
        let fullURL = APIEndpoint.currentBaseURL + path

        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        if let limit = limit {
            params["limit"] = limit
        }

        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Analytics Overview Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")

                switch response.result {
                case .success(let data):
                    // Log raw response JSON (helps catch non-JSON bodies, e.g. HTML 404/500)
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Analytics Overview Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }

                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIAnalyticsOverviewResponse.self, from: data)
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load analytics overview"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "analytics_overview")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "analytics_overview")
                    }
                    completion(nil, nsError)
                }
            }
    }

    // MARK: - Analytics Period (duration report)
    func loadAnalyticsPeriod(
        startDate: Date? = nil,
        endDate: Date? = nil,
        groupBy: String? = nil,
        limit: Int? = nil,
        completion: @escaping (AnalyticsPeriodResponse?, NSError?) -> Void
    ) {
        let path = APIEndpoint.Path.analyticsPeriod
        let fullURL = APIEndpoint.currentBaseURL + path

        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        if let groupBy = groupBy, !groupBy.isEmpty {
            params["groupBy"] = groupBy
        }
        if let limit = limit {
            params["limit"] = limit
        }

        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                switch response.result {
                case .success(let data):
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIAnalyticsPeriodResponse.self, from: data)
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load analytics period report"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        completion(nil, error as NSError)
                    }
                case .failure(let error):
                    completion(nil, error as NSError)
                }
            }
    }

    // MARK: - Recent Orders
    func loadRecentOrders(startDate: Date? = nil, endDate: Date? = nil, completion: @escaping ([RecentOrder]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.recentOrders
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let startDate = startDate {
            params["startDate"] = startDate.dateServerInString()
        }
        if let endDate = endDate {
            params["endDate"] = endDate.dateServerInString()
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Recent Orders Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Recent Orders Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIRecentOrdersResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "Failed to load recent orders"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "recent_orders")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "recent_orders")
                    }
                    completion(nil, nsError)
                }
            }
    }
    
    // MARK: - Recent Activities
    func loadRecentActivities(limit: Int? = nil, completion: @escaping ([RecentActivity]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.recentActivities
        let fullURL = APIEndpoint.currentBaseURL + path
        
        var params: [String: Any] = [:]
        if let limit = limit {
            params["limit"] = limit
        }
        
        AF.request(fullURL, method: .get, parameters: params, headers: BaseService.jsonHeader)
            .responseData { response in
                print("📡 Recent Activities Response:")
                print("   Status Code: \(response.response?.statusCode ?? 0)")
                
                switch response.result {
                case .success(let data):
                    // Log raw response JSON
                    if let jsonString = String(data: data, encoding: .utf8) {
                        print("📄 Recent Activities Raw Response Body:")
                        print(jsonString)
                        print("   " + String(repeating: "-", count: 50))
                    }
                    
                    do {
                        let apiResponse = try JSONDecoder.shared.decode(APIRecentActivitiesResponse.self, from: data)
                        
                        if apiResponse.success {
                            completion(apiResponse.data, nil)
                        } else {
                            let errorMessage = apiResponse.message ?? apiResponse.error ?? "Failed to load recent activities"
                            // Use error code model for localized messages
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: errorMessage
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        let nsError = error as NSError
                        if let userId = UserDefaults.standard.string(forKey: "user_id") {
                            AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "recent_activities")
                        }
                        completion(nil, nsError)
                    }
                case .failure(let error):
                    let nsError = error as NSError
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "recent_activities")
                    }
                    completion(nil, nsError)
                }
            }
    }
}

// MARK: - Singleton Instance
extension AnalyticsAPIService {
    static let shared = AnalyticsAPIService()
}
