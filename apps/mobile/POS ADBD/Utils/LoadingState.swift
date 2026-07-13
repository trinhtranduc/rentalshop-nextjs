import Foundation

/// A reusable loading state management class
class LoadingState {
    enum State {
        case idle
        case loading
        case loadingMore
        case refreshing
        case searching
        case error(Error)
        
        var isLoading: Bool {
            switch self {
            case .loading, .loadingMore, .refreshing, .searching:
                return true
            case .idle, .error:
                return false
            }
        }
        
        var shouldShowProgress: Bool {
            switch self {
            case .loading:
                return true
            case .loadingMore, .refreshing, .searching, .idle, .error:
                return false
            }
        }
        
        var canLoadMore: Bool {
            switch self {
            case .idle, .loadingMore:
                return true
            case .loading, .refreshing, .searching, .error:
                return false
            }
        }
        
        var isRefreshing: Bool {
            if case .refreshing = self {
                return true
            }
            return false
        }
        
        var isSearching: Bool {
            if case .searching = self {
                return true
            }
            return false
        }
        
        var isError: Bool {
            if case .error = self {
                return true
            }
            return false
        }
    }
    
    // MARK: - Properties
    private(set) var currentState: State = .idle {
        didSet {
            onStateChanged?(currentState)
        }
    }
    
    // MARK: - Callbacks
    var onStateChanged: ((State) -> Void)?
    
    // MARK: - Computed Properties
    var isLoading: Bool {
        return currentState.isLoading
    }
    
    var shouldShowProgress: Bool {
        return currentState.shouldShowProgress
    }
    
    var canLoadMore: Bool {
        return currentState.canLoadMore
    }
    
    var isRefreshing: Bool {
        return currentState.isRefreshing
    }
    
    var isSearching: Bool {
        return currentState.isSearching
    }
    
    var hasError: Bool {
        return currentState.isError
    }
    
    // MARK: - State Management
    func setState(_ newState: State) {
        currentState = newState
    }
    
    func setLoading() {
        setState(.loading)
    }
    
    func setLoadingMore() {
        setState(.loadingMore)
    }
    
    func setRefreshing() {
        setState(.refreshing)
    }
    
    func setSearching() {
        setState(.searching)
    }
    
    func setError(_ error: Error) {
        setState(.error(error))
    }
    
    func setIdle() {
        setState(.idle)
    }
    
    func reset() {
        setState(.idle)
    }
}

// MARK: - LoadingState + Equatable
extension LoadingState.State: Equatable {
    static func == (lhs: LoadingState.State, rhs: LoadingState.State) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle),
             (.loading, .loading),
             (.loadingMore, .loadingMore),
             (.refreshing, .refreshing),
             (.searching, .searching):
            return true
        case (.error(let lhsError), .error(let rhsError)):
            return lhsError.localizedDescription == rhsError.localizedDescription
        default:
            return false
        }
    }
}
