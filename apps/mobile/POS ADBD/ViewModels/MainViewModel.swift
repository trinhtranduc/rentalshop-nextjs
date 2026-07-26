import Foundation
import UIKit

protocol MainViewModelDelegate: AnyObject {
    func didUpdateProducts(_ products: [Product])
    func didUpdateLoadingState(_ isLoading: Bool)
    func didShowError(_ error: Error)
    func didUpdatePagination(hasMore: Bool, currentPage: Int)
}

class MainViewModel {
    // MARK: - Properties
    weak var delegate: MainViewModelDelegate?
    
    // Data
    private(set) var products: [Product] = []
    private(set) var currentSearchKeyword: String?
    private(set) var searchWords: [String] = []
    
    // Pagination
    private var currentPage = 1
    private let pageLimit = 20
    private var hasMorePages = true
    
    // Loading State
    private let loadingState = LoadingState()
    
    // Search
    private lazy var searchDebouncer = DebounceManager(delay: 0.7)
    
    // MARK: - Initialization
    init() {
        setupLoadingStateObserver()
    }
    
    // MARK: - Public Methods
    func loadProducts(isLoadMore: Bool = false, isRefreshing: Bool = false) {
        // Check if already loading
        guard !loadingState.isLoading else { return }
        
        // Set appropriate loading state
        if isLoadMore {
            guard hasMorePages else { return }
            loadingState.setLoadingMore()
            currentPage += 1
        } else if isRefreshing {
            // Reset pagination before refreshing
            resetPagination(shouldCancelDebouncer: true)
            loadingState.setRefreshing()
        } else {
            loadingState.setLoading()
            resetPagination(shouldCancelDebouncer: true)
        }
        
        // Get outletId from current user
        let outletId = User.current()?.outlet?.id ?? User.current()?.outletId
        
        ProductService.shared.loadProducts(
            keyword: currentSearchKeyword,
            page: currentPage,
            limit: pageLimit,
            sortBy: "createdAt",
            sortOrder: "desc",
            outletId: outletId
        ) { [weak self] (productsResponse, error) in
            DispatchQueue.main.async {
                self?.handleProductsResponse(productsResponse, error: error, isLoadMore: isLoadMore)
            }
        }
    }
    
    func searchProducts(with text: String) {
        let searchText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        
        // If search text is 3 characters or less (or empty)
        if searchText.isEmpty || searchText.count < 2 {
            // Cancel any pending search immediately
            searchDebouncer.cancel()
            
            // Check if we had an active search BEFORE clearing
            let hadActiveSearch = currentSearchKeyword != nil
            
            // Clear search keyword immediately
            currentSearchKeyword = nil
            searchWords.removeAll()
            
            // Only reload products if we had an active search
            // Don't debounce - reload immediately when clearing search for better UX
            if hadActiveSearch {
                loadingState.setSearching()
                resetPagination(shouldCancelDebouncer: false)
                loadProducts()
            }
            return
        }
        
        // Only search if more than 3 characters - no debounce since triggered by button
        performSearch(searchText)
    }
    
    func clearSearch() {
        searchWords.removeAll()
        currentSearchKeyword = nil
        resetPagination(shouldCancelDebouncer: true) // Cancel debouncer when clearing search
        loadProducts()
    }
    
    func refreshProducts() {
        currentSearchKeyword = nil
        searchWords.removeAll()
        loadProducts(isRefreshing: true)
    }
    
    func loadMoreProducts() {
        guard hasMorePages && loadingState.canLoadMore else { return }
        loadProducts(isLoadMore: true)
    }
    
    func deleteProduct(_ product: Product, completion: @escaping (Bool, Error?) -> Void) {
        let productId = product.id ?? product.product_id
        ProductService.shared.deleteProduct(productId: productId) { [weak self] error in
            DispatchQueue.main.async {
                if let error = error {
                    completion(false, error)
                } else {
                    // Remove product from local array
                    self?.products.removeAll { 
                        ($0.id ?? $0.product_id) == (product.id ?? product.product_id) 
                    }
                    self?.delegate?.didUpdateProducts(self?.products ?? [])
                    completion(true, nil)
                }
            }
        }
    }
    
    // MARK: - Private Methods
    private func setupLoadingStateObserver() {
        loadingState.onStateChanged = { [weak self] state in
            self?.delegate?.didUpdateLoadingState(state.isLoading)
        }
    }
    
    private func resetPagination(shouldCancelDebouncer: Bool = true) {
        currentPage = 1
        hasMorePages = true
        products.removeAll()
        loadingState.reset()
        if shouldCancelDebouncer {
            searchDebouncer.cancel()
        }
    }
    
    private func performSearch(_ searchText: String) {
        currentSearchKeyword = searchText
        searchWords = searchText.components(separatedBy: " ")
        loadingState.setSearching()
        resetPagination(shouldCancelDebouncer: false) // Don't cancel debouncer during search
        loadProducts()
    }
    
    private func handleProductsResponse(_ productsResponse: ProductsResponse?, error: Error?, isLoadMore: Bool) {
        if let error = error {
            // Revert page increment if there was an error for load more
            if isLoadMore {
                currentPage -= 1
            }
            
            loadingState.setError(error)
            
            // Show error alert only for initial load, not for load more or refresh
            if !isLoadMore && !loadingState.isRefreshing {
                delegate?.didShowError(error)
            }
        } else if let productsResponse = productsResponse {
            let newProducts = productsResponse.products ?? []
            
            if isLoadMore {
                // Append new products for pagination (keep API sort order - createdAt desc)
                products.append(contentsOf: newProducts)
            } else {
                // Replace products for fresh load (keep API sort order - createdAt desc)
                products = newProducts
            }
            
            // Update pagination state
            hasMorePages = productsResponse.hasMore ?? false
            loadingState.setIdle()
            
            // Notify delegate
            delegate?.didUpdateProducts(products)
            delegate?.didUpdatePagination(hasMore: hasMorePages, currentPage: currentPage)
            
            // Log pagination info for debugging
            print("📦 Products loaded - Total: \(productsResponse.total ?? 0), Page: \(productsResponse.page ?? 0), HasMore: \(productsResponse.hasMore ?? false)")
            print("📦 Current page in ViewModel: \(currentPage)")
        }
    }
}

// MARK: - Computed Properties for Easy Access
extension MainViewModel {
    var isLoading: Bool {
        return loadingState.isLoading
    }
    
    var isRefreshing: Bool {
        return loadingState.isRefreshing
    }
    
    var isSearching: Bool {
        return loadingState.isSearching
    }
    
    var hasError: Bool {
        return loadingState.hasError
    }
    
    var shouldShowProgress: Bool {
        return loadingState.shouldShowProgress
    }
    
    var canLoadMore: Bool {
        return loadingState.canLoadMore && hasMorePages
    }
}
