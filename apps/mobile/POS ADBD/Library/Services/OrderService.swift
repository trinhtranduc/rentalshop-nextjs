import Alamofire
import FirebaseAnalytics

protocol OrderServiceProtocol {
    func loadOrders(from: Date?, productIds: [Int]?, productId: Int?, keyword: String?, page: Int?, limit: Int?, orderType: OrderType?, sortBy: String?, sortOrder: String?, status: OrderStatus?, completion: @escaping (_ response: OrdersResponse?, _ error: NSError?) -> Void)
    func forceLoadOrders(productId: Int?, keyword: String?, page: Int?, limit: Int?, completion: @escaping (_ response: OrdersResponse?, _ error: NSError?) -> Void)
    func deleteOrder(orderId: Int, completion: @escaping (_ error: NSError?) -> Void)
    func loadOverviewOrder(from: Date?, to: Date?, completion: @escaping (_ orders: [Order]?, _ error: NSError?) -> Void)
    func createOrder(withValues: [String: Any], completion: @escaping (_ order: Order?, _ error: NSError?) -> Void)
    func updateOrder(orderId: Int, request: UpdateOrderRequest, completion: @escaping (_ order: Order?, _ error: NSError?) -> Void)
    func loadOrderDetail(orderId: Int, completion: @escaping (_ order: OrderDetail?, _ error: NSError?) -> Void)
    func cancelOrder(orderId: Int, completion: @escaping (_ success: Bool, _ error: NSError?) -> Void)
    func exportOrders(period: String, format: String, startDate: Date?, endDate: Date?, status: String?, orderType: String?, dateField: String?, completion: @escaping (Data?, String?, NSError?) -> Void)
    func loadCalendarOrders(startDate: Date, endDate: Date, outletId: Int?, completion: @escaping (_ response: [String: CalendarDayData]?, _ error: NSError?) -> Void)
    func loadProductAvailability(productId: Int, date: Date, outletId: Int?, completion: @escaping (_ response: ProductAvailabilityResponse?, _ error: NSError?) -> Void)
    func loadProductAvailabilityForDateRange(productId: Int, pickupDate: Date, returnDate: Date, outletId: Int?, completion: @escaping (_ response: ProductAvailabilityResponse?, _ error: NSError?) -> Void)
    func loadBatchProductAvailability(products: [BatchProductRequest], startDate: Date, endDate: Date, outletId: Int?, excludeOrderId: Int?, completion: @escaping (_ response: BatchAvailabilityResponse?, _ error: NSError?) -> Void)
}

class OrderService: BaseService, OrderServiceProtocol {
    private func uploadOrderRequest<Request: Encodable>(
        path: String,
        request: Request,
        notesImages: [Data],
        method: HTTPMethod,
        context: String,
        completion: @escaping (Order?, NSError?) -> Void
    ) {
        let fullURL = APIEndpoint.currentBaseURL + path

        do {
            let requestData = try JSONEncoder.shared.encode(request)

            if let requestString = String(data: requestData, encoding: .utf8) {
                print("📤 \(context) Multipart JSON Body:")
                print(requestString)
            }
            print("📤 \(context) Notes Images Count: \(notesImages.count)")

            AF.upload(
                multipartFormData: { multipartFormData in
                    multipartFormData.append(requestData, withName: "data")

                    for (index, imageData) in notesImages.enumerated() {
                        multipartFormData.append(
                            imageData,
                            withName: "notesImages",
                            fileName: "notes_image_\(index).jpg",
                            mimeType: "image/jpeg"
                        )
                    }
                },
                to: fullURL,
                method: method,
                headers: BaseService.formHeader
            )
            .responseData { response in
                print("📥 \(context) Multipart Response:")
                print("   Status Code: \(response.response?.statusCode ?? -1)")

                switch response.result {
                case .success(let data):
                    do {
                        if let jsonString = String(data: data, encoding: .utf8) {
                            print("📄 Response Body:")
                            print(jsonString)
                        }

                        let apiResponse = try JSONDecoder.shared.decode(APIResponse<Order>.self, from: data)
                        if apiResponse.success, let order = apiResponse.data {
                            completion(order, nil)
                        } else {
                            let nsError = self.createErrorFromResponse(
                                success: apiResponse.success,
                                code: apiResponse.code,
                                message: apiResponse.message,
                                error: apiResponse.error,
                                httpStatusCode: response.response?.statusCode,
                                defaultMessage: "\(context) failed"
                            )
                            completion(nil, nsError)
                        }
                    } catch {
                        print("❌ \(context) JSON Decoding error: \(error)")
                        completion(nil, error as NSError)
                    }
                case .failure(let error):
                    print("❌ \(context) Network error: \(error)")
                    completion(nil, error as NSError)
                }
            }
        } catch {
            print("❌ \(context) JSON Encoding error: \(error)")
            completion(nil, error as NSError)
        }
    }

    func createOrder(withValues: [String : Any], completion: @escaping (Order?, NSError?) -> Void) {
        // This method is for backward compatibility with legacy Order model
        // Convert the values to a Cart and use the new createOrder method
        
        guard let cart = Cart.fromLegacyOrderValues(withValues) else {
            let error = NSError.errorWithOwnMessage(message: "Invalid order values", domain: "OrderService")
            completion(nil, error)
            return
        }
        
        // Use the new Cart-based createOrder method
        createOrder(from: cart) { order, error in
            if let error = error {
                completion(nil, error)
                return
            }
            
            // Return the Order directly
            completion(order, nil)
        }
    }
    
    static let shared = OrderService()
    
    func loadOrders(from: Date? = nil, productIds: [Int]?, productId: Int? = nil, keyword: String?, page: Int? = nil, limit: Int? = nil, orderType: OrderType? = nil, sortBy: String? = nil, sortOrder: String? = nil, status: OrderStatus? = nil, completion: @escaping (OrdersResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.orders
        
        // Build query parameters according to new API documentation
        var params: [String: Any] = [:]
        
        if let keyword = keyword, !keyword.isEmpty {
            params["q"] = keyword
        }
        
        if let page = page {
            params["page"] = page
        }
        
        if let limit = limit {
            params["limit"] = limit
        }
        
        if let orderType = orderType {
            params["orderType"] = apiEnumValue(orderType)
        }
        
        if let sortBy = sortBy {
            params["sortBy"] = sortBy
        }
        
        // Add sortOrder parameter (asc or desc, default: desc)
        if let sortOrder = sortOrder {
            params["sortOrder"] = sortOrder
        }
        
        if let status = status {
            params["status"] = status.rawValue.uppercased()
        }
        
        if let productId = productId {
            params["productId"] = productId
        }
        
        performGET(
            path: path,
            parameters: params.isEmpty ? nil : params,
            responseType: OrdersResponse.self,
            context: "OrderService.loadOrders"
        ) { [weak self] ordersResponse, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let ordersResponse = ordersResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                completion(nil, error)
                return
            }
            
            if ordersResponse.success {
                // Check if data is available
                guard let ordersData = ordersResponse.data else {
                    let errorMessage = "No data received from server"
                    let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "RC")
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_orders")
                    }
                    completion(nil, error)
                    return
                }
                
                let syncDate = Calendar.current.startOfDay(for: Date())
                Utils.saveSyncTime(date: syncDate)
                
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackSyncTime(
                        userId: userId,
                        syncTime: syncDate,
                        ordersCount: ordersData.orders.count
                    )
                }
                
                completion(ordersResponse, nil)
            } else {
                // Use error code model for localized messages
                let nsError = self.createErrorFromResponse(
                    success: ordersResponse.success,
                    code: ordersResponse.code,
                    message: ordersResponse.message,
                    error: nil,
                    httpStatusCode: nil,
                    defaultMessage: "Failed to load orders"
                )
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: nsError, userId: userId, context: "load_orders")
                }
                completion(nil, nsError)
            }
        }
    }
    
    func forceLoadOrders(productId: Int?, keyword: String?, page: Int? = nil, limit: Int? = nil, completion: @escaping (OrdersResponse?, NSError?) -> Void) {
        let path = APIEndpoint.Path.orders
        
        // Force load from beginning of time
        var params: [String: Any] = [:]
        if let startTime = Utils.date2000()?.dateServerInString() {
            params["startDate"] = startTime
        }
        
        if let productId = productId {
            params["productId"] = productId
        }
        
        if let keyword = keyword, !keyword.isEmpty {
            params["q"] = keyword
        }
        
        if let page = page {
            params["page"] = page
        }
        
        if let limit = limit {
            params["limit"] = limit
        }
        
        performGET(
            path: path,
            parameters: params.isEmpty ? nil : params,
            responseType: OrdersResponse.self,
            context: "OrderService.forceLoadOrders"
        ) { ordersResponse, error in
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let ordersResponse = ordersResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                completion(nil, error)
                return
            }
            
            if ordersResponse.success {
                completion(ordersResponse, nil)
            } else {
                let errorMessage = ordersResponse.message
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "RC")
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "force_load_orders")
                }
                completion(nil, error)
            }
        }
    }
    
    func deleteOrder(orderId: Int, completion: @escaping (NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.orders)/\(orderId)"
        performDELETE(
            path: path,
            responseType: APIEmptyResponse.self,
            context: "OrderService.deleteOrder"
        ) { apiResponse, error in
            if let error = error {
                completion(error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received".localized(), domain: "RC")
                completion(error)
                return
            }
            
            if apiResponse.success {
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackOrderDelete(orderId: "\(orderId)", userId: userId)
                }
                completion(nil)
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Delete failed".localized()
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "RC")
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "delete_order")
                }
                completion(error)
            }
        }
    }
    
    func loadOverviewOrder(from: Date?, to: Date?, completion: @escaping ([Order]?, NSError?) -> Void) {
        let path = APIEndpoint.Path.orders
        var params: [String: Any] = [:]
        params["startDate"] = from?.dateServerInString() ?? Date().dateServerInString()
        params["endDate"] = to?.dateServerInString() ?? Date().dateServerInString()
        
        performGET(
            path: path,
            parameters: params,
            responseType: APIOrdersResponse.self,
            context: "OrderService.loadOverviewOrder"
        ) { apiResponse, error in
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                completion(nil, error)
                return
            }
            
            if apiResponse.success, let ordersResponse = apiResponse.data {
                // Return orders directly - new API Order struct doesn't need initialization
                let orders = ordersResponse.orders ?? []
                completion(orders, nil)
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Invalid response format"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "RC")
                completion(nil, error)
            }
        }
    }
    
    // MARK: - Create Order from Cart (New API)
    
    /// Create order from Cart model
    func createOrder(from cart: Cart, completion: @escaping (Order?, NSError?) -> Void) {
        let request = cart.toCreateOrderRequest()
        let validation = request.validate()
        if !validation.isValid {
            let errorMessage = validation.errors.joined(separator: "\n")
            print("❌ Create Order Validation Failed:")
            for error in validation.errors {
                print("   - \(error)")
            }
            let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "ValidationError")
            completion(nil, error)
            return
        }

        uploadOrderRequest(
            path: APIEndpoint.Path.orders,
            request: request,
            notesImages: [],
            method: .post,
            context: "OrderService.createOrder",
            completion: completion
        )
    }

    func createOrder(from cart: Cart, notesImages: [Data], completion: @escaping (Order?, NSError?) -> Void) {
        let request = cart.toCreateOrderRequest()
        let validation = request.validate()
        if !validation.isValid {
            let errorMessage = validation.errors.joined(separator: "\n")
            let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "ValidationError")
            completion(nil, error)
            return
        }

        uploadOrderRequest(
            path: APIEndpoint.Path.orders,
            request: request,
            notesImages: notesImages,
            method: .post,
            context: "OrderService.createOrderWithNotesImages",
            completion: completion
        )
    }
    
    
    /// Update order using the comprehensive API structure.
    /// Uses JSON body (application/json) so backend can apply notesImages array and other fields correctly (see API_ORDER_NOTES_IMAGES.md).
    func updateOrder(orderId: Int, request: UpdateOrderRequest, completion: @escaping (Order?, NSError?) -> Void) {
        let validation = request.validate()
        if !validation.isValid {
            let errorMessage = validation.errors.joined(separator: "\n")
            print("❌ Update Order Validation Failed:")
            for error in validation.errors {
                print("   - \(error)")
            }
            let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "ValidationError")
            completion(nil, error)
            return
        }

        let path = "\(APIEndpoint.Path.orders)/\(orderId)"
        performPUTWithEncodableBody(
            path: path,
            body: request,
            responseType: APIResponse<Order>.self,
            context: "OrderService.updateOrder"
        ) { apiResponse, error in
            if let error = error {
                completion(nil, error)
                return
            }
            if let apiResponse = apiResponse, apiResponse.success, let order = apiResponse.data {
                completion(order, nil)
            } else {
                let nsError = self.createErrorFromResponse(
                    success: apiResponse?.success ?? false,
                    code: apiResponse?.code,
                    message: apiResponse?.message,
                    error: apiResponse?.error,
                    httpStatusCode: nil,
                    defaultMessage: "OrderService.updateOrder failed"
                )
                completion(nil, nsError)
            }
        }
    }

    func updateOrder(orderId: Int, request: UpdateOrderRequest, notesImages: [Data], completion: @escaping (Order?, NSError?) -> Void) {
        let validation = request.validate()
        if !validation.isValid {
            let errorMessage = validation.errors.joined(separator: "\n")
            let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "ValidationError")
            completion(nil, error)
            return
        }

        uploadOrderRequest(
            path: "\(APIEndpoint.Path.orders)/\(orderId)",
            request: request,
            notesImages: notesImages,
            method: .put,
            context: "OrderService.updateOrderWithNotesImages",
            completion: completion
        )
    }
    
    func loadOrderDetail(orderId: Int, completion: @escaping (OrderDetail?, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.orders)/\(orderId)"
        
        performGET(
            path: path,
            responseType: OrderDetailResponse.self,
            context: "OrderService.loadOrderDetail"
        ) { orderDetailResponse, error in
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let orderDetailResponse = orderDetailResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                completion(nil, error)
                return
            }
            
            if orderDetailResponse.success {
                // Check if data is available
                guard let orderDetail = orderDetailResponse.data else {
                    let errorMessage = "No order detail data received from server"
                    let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "RC")
                    completion(nil, error)
                    return
                }
                completion(orderDetail, nil)
            } else {
                let errorMessage = orderDetailResponse.message
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "RC")
                completion(nil, error)
            }
        }
    }
    
    func cancelOrder(orderId: Int, completion: @escaping (Bool, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.orders)/\(orderId)"
        let params: [String: Any] = ["status": "CANCELLED"]
        performPUT(
            path: path,
            parameters: params,
            responseType: APIEmptyResponse.self,
            context: "OrderService.cancelOrder"
        ) { apiResponse, error in
            if let error = error {
                completion(false, error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "RC")
                completion(false, error)
                return
            }
            
            completion(apiResponse.success, nil)
        }
    }
    
    func exportOrders(
        period: String,
        format: String = "excel",
        startDate: Date? = nil,
        endDate: Date? = nil,
        status: String? = nil,
        orderType: String? = nil,
        dateField: String? = nil,
        completion: @escaping (Data?, String?, NSError?) -> Void
    ) {
        let path = APIEndpoint.Path.exportOrders
        
        // Build query parameters according to new API spec
        var queryParams: [String: Any] = [:]
        queryParams["period"] = period
        queryParams["format"] = format
        
        // Add dates if period is custom
        if period == "custom" {
            if let startDate = startDate {
                queryParams["startDate"] = startDate.dateServerISOString()
            }
            if let endDate = endDate {
                queryParams["endDate"] = endDate.dateServerISOString()
            }
        }
        
        // Add optional filters for orders
        if let status = status {
            queryParams["status"] = status
        }
        if let orderType = orderType {
            queryParams["orderType"] = orderType
        }
        if let dateField = dateField {
            queryParams["dateField"] = dateField
        }
        
        exportDataGET(path: path, parameters: queryParams, completion: completion)
    }
    
    // MARK: - Calendar Orders
    func loadCalendarOrders(startDate: Date, endDate: Date, outletId: Int? = nil, completion: @escaping (_ response: [String: CalendarDayData]?, _ error: NSError?) -> Void) {
        let path = APIEndpoint.Path.calendarOrders
        
        // Build query parameters according to API documentation
        let calendar = Calendar.current
        let month = calendar.component(.month, from: startDate)
        let year = calendar.component(.year, from: startDate)
        
        var params: [String: Any] = [
            "startDate": startDate.dateServerInString() ?? startDate.dateInStringParam() ?? "",
            "endDate": endDate.dateServerInString() ?? endDate.dateInStringParam() ?? "",
            "month": month,
            "year": year
        ]
        
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        performGET(
            path: path,
            parameters: params.isEmpty ? nil : params,
            responseType: APICalendarOrdersResponse.self,
            context: "OrderService.loadCalendarOrders"
        ) { [weak self] apiResponse, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "OrderService")
                completion(nil, error)
                return
            }
            
            if apiResponse.success {
                // Check if data is available
                guard let calendarData = apiResponse.data else {
                    let errorMessage = "No calendar data received from server"
                    let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                    if let userId = UserDefaults.standard.string(forKey: "user_id") {
                        AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_calendar_orders")
                    }
                    completion(nil, error)
                    return
                }
                
                // Convert calendar array to dictionary format
                var calendarDict: [String: CalendarDayData] = [:]
                if let calendarArray = calendarData.calendar {
                    for dayData in calendarArray {
                        if let date = dayData.date {
                            calendarDict[date] = dayData
                        }
                    }
                }
                
                // Log successful calendar data load
                print("📅 Calendar Orders loaded successfully:")
                print("   Start Date: \(startDate)")
                print("   End Date: \(endDate)")
                print("   Outlet ID: \(outletId ?? 0)")
                print("   Total Days: \(calendarDict.count)")
                
                completion(calendarDict, nil)
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Failed to load calendar orders"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                
                // Track error for analytics
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_calendar_orders")
                }
                
                completion(nil, error)
            }
        }
    }
    
    // MARK: - Product Availability
    
    /// Load product availability for a single date (legacy method, kept for backward compatibility)
    func loadProductAvailability(productId: Int, date: Date, outletId: Int?, completion: @escaping (ProductAvailabilityResponse?, NSError?) -> Void) {
        let path = "/api/products/availability"
        let dateString = date.dateServerInString() ?? ""
        
        var params: [String: Any] = [
            "productId": productId,
            "date": dateString
        ]
        
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        performGET(
            path: path,
            parameters: params,
            responseType: ProductAvailabilityResponse.self,
            context: "OrderService.loadProductAvailability"
        ) { [weak self] response, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let response = response else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "OrderService")
                completion(nil, error)
                return
            }
            
            if response.success {
                // Log successful product availability load
                print("📊 Product Availability loaded successfully:")
                print("   Product ID: \(productId)")
                print("   Date: \(dateString)")
                print("   Outlet ID: \(outletId ?? 0)")
                if let summary = response.data?.summary {
                    print("   Total Stock: \(summary.totalStock ?? 0)")
                    print("   Total Rented: \(summary.totalRented ?? 0)")
                    print("   Total Reserved: \(summary.totalReserved ?? 0)")
                    print("   Total Available: \(summary.totalAvailable ?? 0)")
                }
                
                completion(response, nil)
            } else {
                let errorMessage = response.message ?? response.error ?? "Failed to load product availability"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                
                // Track error for analytics
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_product_availability")
                }
                
                completion(nil, error)
            }
        }
    }
    
    /// Load product availability for a date range (pickupDate to returnDate)
    /// API: GET /api/products/availability?productId=123&pickupDate=2026-02-27&returnDate=2026-02-29&outletId=1
    func loadProductAvailabilityForDateRange(productId: Int, pickupDate: Date, returnDate: Date, outletId: Int?, completion: @escaping (ProductAvailabilityResponse?, NSError?) -> Void) {
        let path = "/api/products/availability"
        let pickupDateString = pickupDate.dateServerInString() ?? ""
        let returnDateString = returnDate.dateServerInString() ?? ""
        
        var params: [String: Any] = [
            "productId": productId,
            "pickupDate": pickupDateString,
            "returnDate": returnDateString
        ]
        
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        performGET(
            path: path,
            parameters: params,
            responseType: ProductAvailabilityResponse.self,
            context: "OrderService.loadProductAvailabilityForDateRange"
        ) { [weak self] response, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let response = response else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "OrderService")
                completion(nil, error)
                return
            }
            
            if response.success {
                // Log successful product availability load
                print("📊 Product Availability loaded successfully (Date Range):")
                print("   Product ID: \(productId)")
                print("   Pickup Date: \(pickupDateString)")
                print("   Return Date: \(returnDateString)")
                print("   Outlet ID: \(outletId ?? 0)")
                if let summary = response.data?.summary {
                    print("   Total Stock: \(summary.totalStock ?? 0)")
                    print("   Total Rented: \(summary.totalRented ?? 0)")
                    print("   Total Reserved: \(summary.totalReserved ?? 0)")
                    print("   Total Available: \(summary.totalAvailable ?? 0)")
                }
                
                completion(response, nil)
            } else {
                let errorMessage = response.message ?? response.error ?? "Failed to load product availability"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                
                // Track error for analytics
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_product_availability_for_date_range")
                }
                
                completion(nil, error)
            }
        }
    }
    
    /// Load product availability using the NEW API with detailed conflict analysis
    /// API: GET /api/products/{productId}/availability?startDate=...&endDate=...&outletId=...&quantity=1
    /// Returns: stock summary, conflict details, and all active orders with isConflict flag
    func loadProductAvailabilityV2(productId: Int, date: Date, outletId: Int?, completion: @escaping (NewAvailabilityResponse?, NSError?) -> Void) {
        let path = "/api/products/\(productId)/availability"
        let dateString = date.dateServerInString() ?? ""
        
        // Use single date mode: startDate = 00:00, endDate = 23:59
        var params: [String: Any] = [
            "startDate": "\(dateString)T00:00:00.000Z",
            "endDate": "\(dateString)T23:59:59.999Z",
            "quantity": 1,
            "includeTimePrecision": true,
            "includeAllOrders": true
        ]
        
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        performGET(
            path: path,
            parameters: params,
            responseType: NewAvailabilityResponse.self,
            context: "OrderService.loadProductAvailabilityV2"
        ) { [weak self] response, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let response = response else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "OrderService")
                completion(nil, error)
                return
            }
            
            if response.success {
                print("📊 Product Availability V2 loaded successfully:")
                print("   Product ID: \(productId)")
                print("   Date: \(dateString)")
                print("   Total Stock: \(response.data?.totalStock ?? 0)")
                print("   Effectively Available: \(response.data?.totalAvailableStock ?? 0)")
                print("   Total Renting: \(response.data?.totalRenting ?? 0)")
                print("   Conflicts: \(response.data?.totalConflictsFound ?? 0)")
                print("   Orders: \(response.data?.orders?.count ?? 0)")
                
                completion(response, nil)
            } else {
                let errorMessage = response.message ?? response.error ?? "Failed to load product availability"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_product_availability_v2")
                }
                
                completion(nil, error)
            }
        }
    }
    
    /// Load batch product availability for multiple products at once
    /// API: POST /api/products/batch-availability
    func loadBatchProductAvailability(products: [BatchProductRequest], startDate: Date, endDate: Date, outletId: Int?, excludeOrderId: Int? = nil, completion: @escaping (BatchAvailabilityResponse?, NSError?) -> Void) {
        let path = "/api/products/batch-availability"
        
        let startDateString = startDate.dateServerISOString() ?? ""
        let endDateString = endDate.dateServerISOString() ?? ""
        
        var requestBody: [String: Any] = [
            "products": products.map { ["productId": $0.productId, "quantity": $0.quantity] },
            "startDate": startDateString,
            "endDate": endDateString,
        ]
        
        if let outletId = outletId {
            requestBody["outletId"] = outletId
        }
        
        // When editing an existing order, exclude it from conflict check
        if let excludeOrderId = excludeOrderId {
            requestBody["excludeOrderId"] = excludeOrderId
        }
        
        performPOST(
            path: path,
            parameters: requestBody,
            responseType: BatchAvailabilityResponse.self,
            context: "OrderService.loadBatchProductAvailability"
        ) { [weak self] response, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, error)
                return
            }
            
            guard let response = response else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "OrderService")
                completion(nil, error)
                return
            }
            
            if response.success {
                print("📊 Batch Product Availability loaded successfully:")
                print("   Products: \(products.count)")
                print("   Date Range: \(startDateString) to \(endDateString)")
                if let data = response.data {
                    print("   Available: \(data.summary.availableProducts)")
                    print("   Unavailable: \(data.summary.unavailableProducts)")
                }
                completion(response, nil)
            } else {
                let errorMessage = response.message ?? response.error ?? "Failed to load batch product availability"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                completion(nil, error)
            }
        }
    }
    
    // MARK: - Calendar Orders Count
    
    /// Load calendar orders count by date for a specific month/year
    /// - Parameters:
    ///   - month: Month (1-12)
    ///   - year: Year (e.g., 2025)
    ///   - status: Optional order status filter (e.g., "RESERVED")
    ///   - outletId: Optional outlet ID filter
    ///   - completion: Completion handler with countByDate dictionary and error
    func loadCalendarOrdersCount(
        month: Int,
        year: Int,
        status: String? = nil,
        outletId: Int? = nil,
        completion: @escaping (_ countByDate: [String: Int]?, _ total: Int?, _ error: NSError?) -> Void
    ) {
        let path = APIEndpoint.Path.calendarOrdersCount
        
        // Build query parameters
        var params: [String: Any] = [
            "month": month,
            "year": year
        ]
        
        if let status = status {
            params["status"] = status
        }
        
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        performGET(
            path: path,
            parameters: params,
            responseType: APICalendarOrdersCountResponse.self,
            context: "OrderService.loadCalendarOrdersCount"
        ) { [weak self] apiResponse, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, nil, error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "OrderService")
                completion(nil, nil, error)
                return
            }
            
            if apiResponse.success {
                guard let data = apiResponse.data else {
                    let errorMessage = "No count data received from server"
                    let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                    completion(nil, nil, error)
                    return
                }
                
                // Log successful count load
                print("📊 Calendar Orders Count loaded successfully:")
                print("   Month: \(month), Year: \(year)")
                print("   Status: \(status ?? "all")")
                print("   Outlet ID: \(outletId ?? 0)")
                print("   Total: \(data.total ?? 0)")
                print("   Days with orders: \(data.countByDate?.count ?? 0)")
                
                completion(data.countByDate, data.total, nil)
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Failed to load calendar orders count"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                
                // Track error for analytics
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_calendar_orders_count")
                }
                
                completion(nil, nil, error)
            }
        }
    }
    
    // MARK: - Calendar Orders By Date
    
    /// Load orders for a specific date
    /// - Parameters:
    ///   - date: Date string in format "yyyy-MM-dd" (e.g., "2025-01-15")
    ///   - status: Optional order status filter (e.g., "RESERVED")
    ///   - outletId: Optional outlet ID filter
    ///   - page: Page number (default: 1)
    ///   - limit: Items per page (default: 20)
    ///   - completion: Completion handler with calendar orders array and error
    func loadCalendarOrdersByDate(
        date: String,
        status: String? = nil,
        outletId: Int? = nil,
        page: Int = 1,
        limit: Int = 20,
        completion: @escaping (_ orders: [CalendarOrderByDate]?, _ summary: OrdersByDateSummary?, _ pagination: OrdersByDatePagination?, _ error: NSError?) -> Void
    ) {
        let path = APIEndpoint.Path.calendarOrdersByDate
        
        // Build query parameters
        var params: [String: Any] = [
            "date": date,
            "page": page,
            "limit": limit
        ]
        
        if let status = status {
            params["status"] = status
        }
        
        if let outletId = outletId {
            params["outletId"] = outletId
        }
        
        performGET(
            path: path,
            parameters: params,
            responseType: APICalendarOrdersByDateResponse.self,
            context: "OrderService.loadCalendarOrdersByDate"
        ) { [weak self] apiResponse, error in
            guard let self = self else { return }
            
            if let error = error {
                completion(nil, nil, nil, error)
                return
            }
            
            guard let apiResponse = apiResponse else {
                let error = NSError.errorWithOwnMessage(message: "No response received", domain: "OrderService")
                completion(nil, nil, nil, error)
                return
            }
            
            if apiResponse.success {
                guard let data = apiResponse.data else {
                    let errorMessage = "No orders data received from server"
                    let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                    completion(nil, nil, nil, error)
                    return
                }
                
                // Log successful orders by date load
                print("📅 Calendar Orders By Date loaded successfully:")
                print("   Date: \(date)")
                print("   Status: \(status ?? "all")")
                print("   Outlet ID: \(outletId ?? 0)")
                print("   Orders count: \(data.orders?.count ?? 0)")
                if let summary = data.summary {
                    print("   Total Orders: \(summary.totalOrders ?? 0)")
                    print("   Total Revenue: \(summary.totalRevenue ?? 0)")
                }
                
                completion(data.orders, data.summary, data.pagination, nil)
            } else {
                let errorMessage = apiResponse.message ?? apiResponse.error ?? "Failed to load calendar orders by date"
                let error = NSError.errorWithOwnMessage(message: errorMessage, domain: "OrderService")
                
                // Track error for analytics
                if let userId = UserDefaults.standard.string(forKey: "user_id") {
                    AnalyticsService.shared.trackError(error: error, userId: userId, context: "load_calendar_orders_by_date")
                }
                
                completion(nil, nil, nil, error)
            }
        }
    }
}
