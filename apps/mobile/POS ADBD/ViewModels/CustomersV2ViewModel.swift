//
//  CustomersV2ViewModel.swift
//  POS ADBD
//
//  Customer search list (picker and Settings list) and the "Khách mới" flow of the redesigned customer screens
//  (#387). Calls go through a data source so tests can answer them.
//

import Foundation

protocol CustomersV2DataSource {
    func loadCustomers(query: String?, page: Int, limit: Int, completion: @escaping (CustomersV2Page?, NSError?) -> Void)
    func createCustomer(_ params: [String: Any], completion: @escaping (Customer?, NSError?) -> Void)
    func loadOrders(customerId: Int, limit: Int, completion: @escaping (CustomerOrdersV2?, NSError?) -> Void)
    func countRenting(customerId: Int, completion: @escaping (Int?) -> Void)
}

struct LiveCustomersV2DataSource: CustomersV2DataSource {
    func loadCustomers(query: String?, page: Int, limit: Int, completion: @escaping (CustomersV2Page?, NSError?) -> Void) {
        var params: [String: Any] = ["page": page, "limit": limit]
        if let query, !query.isEmpty { params["q"] = query }
        CustomerService.shared.performGET(path: APIEndpoint.Path.customers, parameters: params,
                                          responseType: CustomersV2PageResponse.self,
                                          context: "CustomersV2.loadCustomers") { response, error in
            if let error {
                completion(nil, error)
            } else if let response, response.success, let data = response.data {
                completion(data, nil)
            } else {
                completion(nil, CustomerService.shared.createErrorFromResponse(
                    success: false, code: response?.code, message: response?.message, error: nil))
            }
        }
    }

    func createCustomer(_ params: [String: Any], completion: @escaping (Customer?, NSError?) -> Void) {
        CustomerService.shared.createCustomer(withValues: params, completion: completion)
    }

    func loadOrders(customerId: Int, limit: Int, completion: @escaping (CustomerOrdersV2?, NSError?) -> Void) {
        let path = "\(APIEndpoint.Path.customerOrders)/\(customerId)/orders"
        OrderService.shared.performGET(path: path, parameters: ["page": 1, "limit": limit],
                                       responseType: CustomerOrdersV2Response.self,
                                       context: "CustomersV2.loadOrders") { response, error in
            if let error {
                completion(nil, error)
            } else if let response, response.success, let data = response.data {
                completion(data, nil)
            } else {
                completion(nil, OrderService.shared.createErrorFromResponse(
                    success: false, code: response?.code, message: response?.message, error: nil))
            }
        }
    }

    func countRenting(customerId: Int, completion: @escaping (Int?) -> Void) {
        let params: [String: Any] = ["customerId": customerId, "status": "PICKUPED", "limit": 1, "page": 1]
        OrderService.shared.performGET(path: APIEndpoint.Path.orders, parameters: params,
                                       responseType: OrdersTotalResponse.self,
                                       context: "CustomersV2.countRenting") { response, _ in
            completion(response?.success == true ? response?.data?.total : nil)
        }
    }
}

/// Paged customer list with a search query. A new query bumps a generation token, so an older answer is dropped.
final class CustomersV2ListViewModel {
    private let dataSource: CustomersV2DataSource
    private(set) var customers: [Customer] = []
    private(set) var total = 0
    private(set) var hasMore = false
    private(set) var isLoading = false
    private(set) var query: String?
    private var page = 1
    private var generation = 0

    var onChange: (() -> Void)?
    var onError: ((NSError) -> Void)?

    init(dataSource: CustomersV2DataSource = LiveCustomersV2DataSource()) {
        self.dataSource = dataSource
    }

    func reload() {
        load(page: 1)
    }

    func setQuery(_ text: String?) {
        let trimmed = text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let next = trimmed.isEmpty ? nil : trimmed
        guard next != query else { return }
        query = next
        load(page: 1)
    }

    func loadMore() {
        guard hasMore, !isLoading else { return }
        load(page: page + 1)
    }

    private func load(page nextPage: Int) {
        if nextPage == 1 { generation += 1 }
        let token = generation
        isLoading = true
        dataSource.loadCustomers(query: query, page: nextPage, limit: CustomersV2Logic.pageSize) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                self.isLoading = false
                if let error {
                    self.onError?(error)
                    self.onChange?()
                    return
                }
                let incoming = result?.customers ?? []
                if nextPage == 1 {
                    self.customers = incoming
                } else {
                    let known = Set(self.customers.map { $0.id ?? $0.customer_id })
                    self.customers += incoming.filter { !known.contains($0.id ?? $0.customer_id) }
                }
                self.page = nextPage
                self.total = result?.total ?? self.customers.count
                self.hasMore = result?.hasMore ?? false
                self.onChange?()
            }
        }
    }
}

/// "Lưu và chọn": look the phone up first; create only when no customer has it
final class NewCustomerFlow {
    enum Outcome {
        case created(Customer)
        case existing(Customer)
        case failed(NSError)
    }

    private let dataSource: CustomersV2DataSource

    init(dataSource: CustomersV2DataSource = LiveCustomersV2DataSource()) {
        self.dataSource = dataSource
    }

    /// Call after `CustomersV2Logic.validate` passed
    func submit(name: String, phone: String, note: String?, completion: @escaping (Outcome) -> Void) {
        findExisting(phone: phone) { [dataSource] existing in
            if let existing {
                completion(.existing(existing))
                return
            }
            let params = CustomersV2Logic.createPayload(name: name, phone: phone, note: note)
            dataSource.createCustomer(params) { [weak self] customer, error in
                if let customer {
                    completion(.created(customer))
                } else if let error, error.code == 409, let self {
                    // The API found the same phone (stored with other spacing): show that customer if we can
                    self.search(phone.trimmingCharacters(in: .whitespacesAndNewlines), phone: phone) { match in
                        completion(match.map { .existing($0) } ?? .failed(error))
                    }
                } else {
                    completion(.failed(error ?? NSError.errorWithOwnMessage(message: "Operation failed".localized(), domain: "RC")))
                }
            }
        }
    }

    private func findExisting(phone: String, completion: @escaping (Customer?) -> Void) {
        search(CustomersV2Logic.phoneDigits(phone), phone: phone, completion: completion)
    }

    private func search(_ query: String, phone: String, completion: @escaping (Customer?) -> Void) {
        // The API ignores a query shorter than 2 characters
        guard query.count >= 2 else { completion(nil); return }
        dataSource.loadCustomers(query: query, page: 1, limit: CustomersV2Logic.pageSize) { page, _ in
            completion(CustomersV2Logic.duplicate(of: phone, in: page?.customers ?? []))
        }
    }
}
