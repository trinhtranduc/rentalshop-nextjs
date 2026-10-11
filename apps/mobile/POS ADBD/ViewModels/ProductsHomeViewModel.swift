//
//  ProductsHomeViewModel.swift
//  POS ADBD
//
//  Product list of the redesigned Home tab (#373). Its own instance, so the old Home (MainViewModel) is untouched.
//

import Foundation

struct ProductsPage {
    let products: [Product]
    let hasMore: Bool
}

/// Loads one page of products (replaceable in tests)
protocol ProductsHomeDataSource {
    func loadProducts(query: String?, page: Int, limit: Int,
                      completion: @escaping (ProductsPage?, NSError?) -> Void)
}

struct LiveProductsHomeDataSource: ProductsHomeDataSource {
    func loadProducts(query: String?, page: Int, limit: Int,
                      completion: @escaping (ProductsPage?, NSError?) -> Void) {
        var params: [String: Any] = ["page": page, "limit": limit, "sortBy": "createdAt", "sortOrder": "desc"]
        if let query, !query.isEmpty { params["q"] = query }
        if let outletId = User.current()?.outlet?.id ?? User.current()?.outletId { params["outletId"] = outletId }
        ProductService.shared.performGET(path: APIEndpoint.Path.products, parameters: params,
                                         responseType: APIProductsResponse.self,
                                         context: "ProductsHome.loadProducts") { response, error in
            if let error {
                completion(nil, error)
            } else if let response, response.success, let data = response.data {
                completion(ProductsPage(products: data.products ?? [], hasMore: data.hasMore ?? false), nil)
            } else {
                completion(nil, ProductService.shared.createErrorFromResponse(
                    success: false, code: response?.code, message: response?.message, error: response?.error))
            }
        }
    }
}

/// What the list area shows when there are no rows (#753): the reason the list could not load comes before "no products"
enum ProductsHomeEmptyState: Equatable {
    case none
    case empty
    case searchEmpty
    /// The server's reason (an expired, cancelled, paused or past-due subscription answers 403), shown with Retry
    case failed(String)

    static func state(productCount: Int, isLoading: Bool, hasQuery: Bool, error: NSError?) -> ProductsHomeEmptyState {
        guard productCount == 0, !isLoading else { return .none }
        if let error {
            let reason = error.localizedDescription
            return .failed(reason.isEmpty ? "Something went wrong".localized() : reason)
        }
        return hasQuery ? .searchEmpty : .empty
    }
}

final class ProductsHomeViewModel {
    static let pageSize = 20

    private let dataSource: ProductsHomeDataSource
    private(set) var products: [Product] = []
    private(set) var hasMore = false
    private(set) var isLoading = false
    private(set) var query: String?
    /// The last load failed and there is nothing on screen to keep (#753); cleared by the next answer
    private(set) var loadError: NSError?
    private var page = 1
    /// Bumped on every new query; an answer for an older one is dropped
    private var generation = 0

    var onChange: (() -> Void)?
    var onError: ((NSError) -> Void)?

    init(dataSource: ProductsHomeDataSource = LiveProductsHomeDataSource()) {
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

    /// #677: after an order is created or edited, fetch the loaded rows again and update their stock in place:
    /// no spinner, same rows in the same order (the scroll stays). Rows the answer does not carry stay as they were.
    func refreshQuietly() {
        guard !isLoading, !products.isEmpty else { return }
        let token = generation
        let limit = min(max(products.count, Self.pageSize), Self.quietRefreshLimit)
        dataSource.loadProducts(query: query, page: 1, limit: limit) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation, error == nil, let incoming = result?.products else { return }
                let fresh = Dictionary(incoming.map { ($0.id ?? $0.product_id, $0) }, uniquingKeysWith: { first, _ in first })
                self.products = self.products.map { fresh[$0.id ?? $0.product_id] ?? $0 }
                self.onChange?()
            }
        }
    }

    /// Largest page the quiet refresh asks for
    static let quietRefreshLimit = 100

    /// Put a saved product back in the list without a reload
    func replace(_ product: Product) {
        let id = product.id ?? product.product_id
        if let index = products.firstIndex(where: { ($0.id ?? $0.product_id) == id }) {
            products[index] = product
        } else {
            products.insert(product, at: 0)
        }
        onChange?()
    }

    /// Drop a deleted product without a reload (#390)
    func remove(productId: Int) {
        let before = products.count
        products.removeAll { ($0.id ?? $0.product_id) == productId }
        if products.count != before { onChange?() }
    }

    private func load(page nextPage: Int) {
        if nextPage == 1 { generation += 1 }
        loadError = nil
        let token = generation
        isLoading = true
        dataSource.loadProducts(query: query, page: nextPage, limit: Self.pageSize) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                self.isLoading = false
                if let error {
                    // No rows to show: the screen explains the error itself, with Retry (an alert is for a failed next page)
                    self.loadError = error
                    self.onError?(error)
                    self.onChange?()
                    return
                }
                let incoming = result?.products ?? []
                if nextPage == 1 {
                    self.products = incoming
                } else {
                    let known = Set(self.products.map { $0.id ?? $0.product_id })
                    self.products += incoming.filter { !known.contains($0.id ?? $0.product_id) }
                }
                self.page = nextPage
                self.hasMore = result?.hasMore ?? false
                self.onChange?()
            }
        }
    }
}
