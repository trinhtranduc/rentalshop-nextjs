//
//  ProductAvailabilityCache.swift
//  POS ADBD
//
//  Created by Assistant on 2025-12-06.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

/// Cache key for product availability
struct AvailabilityCacheKey: Hashable {
    let productId: Int
    let date: Date // Normalized to start of day for consistency
    
    init(productId: Int, date: Date) {
        self.productId = productId
        self.date = date.startOfDay() // Normalize to start of day
    }
}

/// Cached availability data
struct CachedAvailability {
    let summary: ProductAvailabilitySummary
    let cachedAt: Date
    
    var isExpired: Bool {
        // Cache expires after 5 minutes
        let expirationTime: TimeInterval = 5 * 60
        return Date().timeIntervalSince(cachedAt) > expirationTime
    }
}

/// Singleton cache manager for product availability
class ProductAvailabilityCache {
    static let shared = ProductAvailabilityCache()
    
    private var cache: [AvailabilityCacheKey: CachedAvailability] = [:]
    private let cacheQueue = DispatchQueue(label: "com.rentalshop.availabilityCache", attributes: .concurrent)
    
    private init() {}
    
    /// Get cached availability for product and date
    func getAvailability(productId: Int, date: Date) -> ProductAvailabilitySummary? {
        let key = AvailabilityCacheKey(productId: productId, date: date)
        
        return cacheQueue.sync {
            guard let cached = cache[key],
                  !cached.isExpired else {
                return nil
            }
            return cached.summary
        }
    }
    
    /// Store availability in cache
    func setAvailability(productId: Int, date: Date, summary: ProductAvailabilitySummary) {
        let key = AvailabilityCacheKey(productId: productId, date: date)
        let cached = CachedAvailability(summary: summary, cachedAt: Date())
        
        cacheQueue.async(flags: .barrier) {
            self.cache[key] = cached
        }
    }
    
    /// Check if product has enough availability for a date range (from cache)
    /// Returns minimum available across all dates in the range
    func checkAvailability(productId: Int, startDate: Date, endDate: Date, requestedQuantity: Int) -> (isAvailable: Bool, available: Int)? {
        // Generate all dates in the range
        let calendar = Calendar.current
        var start = startDate.startOfDay()
        let end = endDate.startOfDay()
        var minAvailable: Int? = nil
        var allAvailable = true
        
        // Check each day in the range
        while start <= end {
            guard let summary = getAvailability(productId: productId, date: start) else {
                // If any day is not in cache, return nil (need to load)
                return nil
            }
            
            let available = summary.totalAvailable ?? 0
            let isAvailable = (summary.isAvailable ?? false) && (available >= requestedQuantity)
            
            // Track minimum available across all dates
            if minAvailable == nil || available < minAvailable! {
                minAvailable = available
            }
            
            // All dates must be available
            if !isAvailable {
                allAvailable = false
            }
            
            // Move to next day
            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: start) else {
                break
            }
            start = nextDate
        }
        
        guard let minAvail = minAvailable else {
            return nil
        }
        
        return (isAvailable: allAvailable, available: minAvail)
    }
    
    /// Check if product has enough availability for a single date (from cache) - kept for backward compatibility
    func checkAvailability(productId: Int, date: Date, requestedQuantity: Int) -> (isAvailable: Bool, available: Int)? {
        guard let summary = getAvailability(productId: productId, date: date) else {
            return nil // Not in cache
        }
        
        let available = summary.totalAvailable ?? 0
        let isAvailable = (summary.isAvailable ?? false) && (available >= requestedQuantity)
        
        return (isAvailable: isAvailable, available: available)
    }
    
    /// Invalidate cache for a specific product and date
    func invalidate(productId: Int, date: Date) {
        let key = AvailabilityCacheKey(productId: productId, date: date)
        cacheQueue.async(flags: .barrier) {
            self.cache.removeValue(forKey: key)
        }
    }
    
    /// Invalidate all cache for a product (all dates)
    func invalidateProduct(productId: Int) {
        cacheQueue.async(flags: .barrier) {
            self.cache = self.cache.filter { $0.key.productId != productId }
        }
    }
    
    /// Clear all cache
    func clearAll() {
        cacheQueue.async(flags: .barrier) {
            self.cache.removeAll()
        }
    }
    
    /// Remove expired entries
    func cleanExpired() {
        cacheQueue.async(flags: .barrier) {
            self.cache = self.cache.filter { !$0.value.isExpired }
        }
    }
}

