import ObjectMapper

struct APIResponse<T: Mappable>: Mappable {
    var result: APIResult<T>
    
    init?(map: Map) {
        // Initialize with default values
        self.result = APIResult<T>(meta: APIMeta(status: false, message: nil, statusCode: nil), data: nil)
    }
    
    init(result: APIResult<T>) {
        self.result = result
    }
    
    mutating func mapping(map: Map) {
        result <- map["result"]
    }
}

struct APIResult<T: Mappable>: Mappable {
    var meta: APIMeta
    var data: T?
    
    init?(map: Map) {
        // Initialize with default values
        self.meta = APIMeta(status: false, message: nil, statusCode: nil)
    }
    
    init(meta: APIMeta, data: T?) {
        self.meta = meta
        self.data = data
    }
    
    mutating func mapping(map: Map) {
        meta <- map["meta"]
        data <- map["data"]
    }
}

struct APIMeta: Mappable {
    var status: Bool
    var message: String?
    var statusCode: Int?
    
    init?(map: Map) {
        // Initialize with default values
        self.status = false
        self.message = nil
        self.statusCode = nil
    }
    
    init(status: Bool, message: String?, statusCode: Int?) {
        self.status = status
        self.message = message
        self.statusCode = statusCode
    }
    
    mutating func mapping(map: Map) {
        status <- map["status"]
        message <- map["message"]
        statusCode <- map["status_code"]
    }
}

// Response Models
struct ProductsResponse: Mappable {
    var products: [Product]?
    
    init?(map: Map) {
        // Initialize with default values
        self.products = nil
    }
    
    mutating func mapping(map: Map) {
        products <- map["products"]
    }
}

struct OrdersResponse: Mappable {
    var orders: [Order]?
    
    init?(map: Map) {
        // Initialize with default values
        self.orders = nil
    }
    
    mutating func mapping(map: Map) {
        orders <- map["orders"]
    }
}

struct CustomersResponse: Mappable {
    var customers: [Customer]?
    
    init?(map: Map) {
        // Initialize with default values
        self.customers = nil
    }
    
    mutating func mapping(map: Map) {
        customers <- map["customers"]
    }
}

struct EmptyResponse: Mappable {
    init?(map: Map) {}
    
    mutating func mapping(map: Map) {}
}

struct OverviewResponse: Mappable {
    var overviews: [[String: Any]]?
    
    init?(map: Map) {}
    
    mutating func mapping(map: Map) {
        overviews <- map["overviews"]
    }
} 