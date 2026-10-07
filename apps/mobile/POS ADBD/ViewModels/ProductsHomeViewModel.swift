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

final class ProductsHomeViewModel {
    static let pageSize = 20

    private let dataSource: ProductsHomeDataSource
    private(set) var products: [Product] = []
    private(set) var hasMore = false
    private(set) var isLoading = false
    private(set) var query: String?
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
        let token = generation
        isLoading = true
        dataSource.loadProducts(query: query, page: nextPage, limit: Self.pageSize) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, token == self.generation else { return }
                self.isLoading = false
                if let error {
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
