//
//  OrderListViewModel.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-XX.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

// MARK: - Delegate Protocol
protocol OrderListViewModelDelegate: AnyObject {
    func didUpdateOrders(_ orders: [Order])
    func didUpdateLoadingState(_ isLoading: Bool)
    func didShowError(_ error: Error)
    func didUpdatePagination(hasMore: Bool, currentPage: Int)
}

// MARK: - OrderListViewModel
class OrderListViewModel {
    // MARK: - Singleton Instance
    static let shared = OrderListViewModel()
    
    // MARK: - Properties
    weak var delegate: OrderListViewModelDelegate?
    
    // Orders data
    private(set) var orders: [Order] = []
    
    // Pagination
    private var currentPage = 1
    private let pageLimit = 20
    private var hasMorePages = true
    private var isLoadingMore = false
    
    // Refresh flag for viewWillAppear
    var needsRefresh: Bool = false
    
    // Loading State
    private let loadingState = LoadingState()
    
    // MARK: - Initialization
    private init() {
        setupLoadingStateObserver()
    }
    
    // MARK: - Public Methods
    
    /// Load orders from API - Simple: just call service with parameters
    func loadOrders(
        filter: OrderType,
        sort: OrderSortType,
        sortOrder: String,
        status: OrderStatus?,
        keyword: String?,
        page: Int? = nil,
        isLoadMore: Bool = false,
        isRefreshing: Bool = false
    ) {
        // Prevent duplicate calls (except refresh)
        if !isRefreshing && loadingState.isLoading {
            return
        }
        
        // Prepare loading state
        if isLoadMore {
            guard hasMorePages else { return }
            loadingState.setLoadingMore()
            isLoadingMore = true
            currentPage += 1
        } else if isRefreshing {
            resetPagination(shouldClearOrders: true, shouldResetState: false)
            loadingState.setRefreshing()
        } else {
            // Initial load - set loading state first
            resetPagination(shouldClearOrders: true, shouldResetState: false)
            loadingState.setLoading()
        }
        
        // Build API parameters
        let pageToLoad = page ?? (isLoadMore ? currentPage : 1)
        let sortBy: String = filter == .rent
            ? (sort == .book_date ? "createdAt" : "pickupPlanAt")
            : "createdAt"
        
        // Call service
        OrderService.shared.loadOrders(
            productIds: nil,
            keyword: keyword,
            page: pageToLoad,
            limit: pageLimit,
            orderType: filter,
            sortBy: sortBy,
            sortOrder: sortOrder,
            status: status
        ) { [weak self] response, error in
            DispatchQueue.main.async {
                self?.handleOrdersResponse(response, error: error, isLoadMore: isLoadMore, isRefreshing: isRefreshing)
            }
        }
    }
    
    /// Update existing order in the list
    func updateOrder(_ order: Order) {
        if let index = orders.firstIndex(where: { $0.id == order.id }) {
            orders[index] = order
            delegate?.didUpdateOrders(orders)
            } else {
                // Order not in current list, might be new - add it
            orders.insert(order, at: 0)
            delegate?.didUpdateOrders(orders)
        }
    }
    
    /// Add new order to the list
    func addOrder(_ order: Order) {
        orders.insert(order, at: 0)
        delegate?.didUpdateOrders(orders)
    }
    
    /// Remove order from the list
    func removeOrder(id: Int) {
        if let index = orders.firstIndex(where: { $0.id == id }) {
            orders.remove(at: index)
            delegate?.didUpdateOrders(orders)
        }
    }
    
    /// Refresh orders (reset and reload) - requires parameters from delegate
    func refreshOrders(
        filter: OrderType,
        sort: OrderSortType,
        sortOrder: String,
        status: OrderStatus?,
        keyword: String?
    ) {
        needsRefresh = false
        loadOrders(
            filter: filter,
            sort: sort,
            sortOrder: sortOrder,
            status: status,
            keyword: keyword,
            isRefreshing: true
        )
    }
    
    /// Set flag that refresh is needed (for viewWillAppear)
    func setNeedsRefresh() {
        needsRefresh = true
    }
    
    /// Load more orders (pagination) - requires parameters from delegate
    func loadMoreOrders(
        filter: OrderType,
        sort: OrderSortType,
        sortOrder: String,
        status: OrderStatus?,
        keyword: String?
    ) {
        guard hasMorePages && loadingState.canLoadMore else { return }
        loadOrders(
            filter: filter,
            sort: sort,
            sortOrder: sortOrder,
            status: status,
            keyword: keyword,
            isLoadMore: true
        )
    }
    
    // MARK: - Private Methods
    
    private func setupLoadingStateObserver() {
        loadingState.onStateChanged = { [weak self] state in
            DispatchQueue.main.async {
            self?.delegate?.didUpdateLoadingState(state.isLoading)
            }
        }
    }
    
    private func resetPagination(shouldClearOrders: Bool = true, shouldResetState: Bool = true) {
        currentPage = 1
        hasMorePages = true
        isLoadingMore = false
        
        if shouldClearOrders {
            orders.removeAll()
        }
        
        if shouldResetState {
        loadingState.reset()
        }
    }
    
    private func handleOrdersResponse(_ ordersResponse: OrdersResponse?, error: Error?, isLoadMore: Bool, isRefreshing: Bool) {
        if let error = error {
            // Revert page increment if there was an error for load more
            if isLoadMore {
                currentPage = max(1, currentPage - 1)
                isLoadingMore = false
            }
            
            loadingState.setError(error)
            
            // Show error alert only for initial load, not for load more or refresh
            if !isLoadMore && !isRefreshing {
                delegate?.didShowError(error)
            }
            
            // If refreshing, ensure endRefresh is called even on error
            if isRefreshing {
                delegate?.didUpdateLoadingState(false)
            }
        } else if let ordersResponse = ordersResponse {
            guard let ordersData = ordersResponse.data else {
                loadingState.setIdle()
                if isRefreshing {
                    delegate?.didUpdateLoadingState(false)
                }
                return
            }
            
            let apiOrders = ordersData.orders
                
                if isLoadMore {
                orders.append(contentsOf: apiOrders)
                } else {
                orders = apiOrders
                }
                
                // Update pagination state
            hasMorePages = ordersData.hasMore
            isLoadingMore = false
                
                // Update current page
                if !isLoadMore {
                currentPage = 1
                }
                
                loadingState.setIdle()
                
            // Notify delegate
            delegate?.didUpdateOrders(orders)
            delegate?.didUpdatePagination(hasMore: hasMorePages, currentPage: currentPage)
        }
    }
}

// MARK: - Computed Properties for Easy Access
extension OrderListViewModel {
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
