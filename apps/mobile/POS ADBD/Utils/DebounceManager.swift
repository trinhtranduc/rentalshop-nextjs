//
//  DebounceManager.swift
//  POS ADBD
//
//  Created by Assistant on $(date).
//  Copyright © 2018 Trinh Tran. All rights reserved.
//

import Foundation

class DebounceManager {
    private var timer: Timer?
    private let delay: TimeInterval
    private var workItem: DispatchWorkItem?
    
    /// Initialize with delay time
    /// - Parameter delay: Time interval in seconds to debounce
    init(delay: TimeInterval) {
        self.delay = delay
    }
    
    /// Execute the given closure after the delay, cancelling any previous calls
    /// - Parameter action: The closure to execute after delay
    func debounce(_ action: @escaping () -> Void) {
        // Cancel previous timer and work item
        timer?.invalidate()
        workItem?.cancel()
        
        // Create new work item
        workItem = DispatchWorkItem(block: action)
        
        // Schedule new timer
        timer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            self?.workItem?.perform()
        }
    }
    
    /// Execute the given closure with a parameter after the delay
    /// - Parameters:
    ///   - parameter: The parameter to pass to the action closure
    ///   - action: The closure to execute after delay with the parameter
    func debounce<T>(parameter: T, action: @escaping (T) -> Void) {
        debounce { [weak self] in
            action(parameter)
        }
    }
    
    /// Cancel any pending debounced calls
    func cancel() {
        timer?.invalidate()
        workItem?.cancel()
        timer = nil
        workItem = nil
    }
    
    deinit {
        cancel()
    }
}

// MARK: - Convenience Extension for String-based Search
extension DebounceManager {
    /// Convenience method for search operations with string parameter
    /// - Parameters:
    ///   - searchText: The search text parameter
    ///   - action: The closure to execute with the search text
    func debounceSearch(_ searchText: String, action: @escaping (String) -> Void) {
        debounce(parameter: searchText, action: action)
    }
}
