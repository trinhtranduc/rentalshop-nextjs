// ============================================================================
// PERFORMANCE MONITORING UTILITIES
// ============================================================================
// Utilities for monitoring and optimizing database query performance

export interface PerformanceMetrics {
  queryName: string;
  duration: number;
  timestamp: Date;
  slowQuery?: boolean;
  recordCount?: number;
  error?: string;
}

class PerformanceMonitor {
  private static metrics: PerformanceMetrics[] = [];
  private static slowQueryThreshold = 1000; // 1 second
  private static maxMetrics = 1000; // Keep last 1000 metrics

  /**
   * Measure query performance with automatic logging
   */
  static async measureQuery<T>(
    name: string, 
    query: () => Promise<T>,
    recordCount?: number
  ): Promise<T> {
    const start = Date.now();
    const timestamp = new Date();
    
    try {
      const result = await query();
      const duration = Date.now() - start;
      
      const metric: PerformanceMetrics = {
        queryName: name,
        duration,
        timestamp,
        slowQuery: duration > this.slowQueryThreshold,
        recordCount
      };

      this.logMetric(metric);
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      
      const metric: PerformanceMetrics = {
        queryName: name,
        duration,
        timestamp,
        slowQuery: true,
        recordCount,
        error: error instanceof Error ? error.message : String(error)
      };

      this.logMetric(metric);
      throw error;
    }
  }

  /**
   * Log performance metric
   */
  private static logMetric(metric: PerformanceMetrics) {
    // Add to metrics array
    this.metrics.push(metric);
    
    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Console logging
    const logLevel = metric.slowQuery ? 'warn' : 'log';
    const message = metric.error 
      ? `[PERF ERROR] ${metric.queryName}: ${metric.duration}ms - ${metric.error}`
      : `[PERF] ${metric.queryName}: ${metric.duration}ms${metric.recordCount ? ` (${metric.recordCount} records)` : ''}`;

    console[logLevel](message);

    // Additional warning for very slow queries
    if (metric.duration > 5000) {
      console.error(`[CRITICAL SLOW QUERY] ${metric.queryName}: ${metric.duration}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  static getStats(queryName?: string): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
    slowestQuery: PerformanceMetrics | null;
    recentSlowQueries: PerformanceMetrics[];
  } {
    const metrics = queryName 
      ? this.metrics.filter(m => m.queryName === queryName)
      : this.metrics;

    const slowQueries = metrics.filter(m => m.slowQuery);
    const averageDuration = metrics.length > 0 
      ? metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length 
      : 0;

    const slowestQuery = metrics.length > 0 
      ? metrics.reduce((prev, current) => prev.duration > current.duration ? prev : current)
      : null;

    const recentSlowQueries = slowQueries.slice(-10); // Last 10 slow queries

    return {
      totalQueries: metrics.length,
      slowQueries: slowQueries.length,
      averageDuration: Math.round(averageDuration),
      slowestQuery,
      recentSlowQueries
    };
  }

  /**
   * Get slow queries for analysis
   */
  static getSlowQueries(threshold?: number): PerformanceMetrics[] {
    const limit = threshold || this.slowQueryThreshold;
    return this.metrics.filter(m => m.duration > limit);
  }

  /**
   * Clear performance metrics
   */
  static clearMetrics() {
    this.metrics = [];
  }

  /**
   * Export metrics for analysis
   */
  static exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Set slow query threshold
   */
  static setSlowQueryThreshold(threshold: number) {
    this.slowQueryThreshold = threshold;
  }
}

/**
 * Database connection monitoring
 */
export class DatabaseMonitor {
  private static connectionCount = 0;
  private static activeQueries = 0;

  /**
   * Track database connection
   */
  static trackConnection() {
    this.connectionCount++;
    console.log(`[DB] Connection opened. Total: ${this.connectionCount}`);
  }

  /**
   * Track query start
   */
  static trackQueryStart(queryName: string) {
    this.activeQueries++;
    console.log(`[DB] Query started: ${queryName}. Active: ${this.activeQueries}`);
  }

  /**
   * Track query end
   */
  static trackQueryEnd(queryName: string) {
    this.activeQueries = Math.max(0, this.activeQueries - 1);
    console.log(`[DB] Query ended: ${queryName}. Active: ${this.activeQueries}`);
  }

  /**
   * Get database stats
   */
  static getStats() {
    return {
      connectionCount: this.connectionCount,
      activeQueries: this.activeQueries
    };
  }
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  /**
   * Get current memory usage
   */
  static getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } {
    const usage = process.memoryUsage();
    const used = usage.heapUsed;
    const total = usage.heapTotal;
    const percentage = (used / total) * 100;

    return {
      used: Math.round(used / 1024 / 1024), // MB
      total: Math.round(total / 1024 / 1024), // MB
      percentage: Math.round(percentage)
    };
  }

  /**
   * Log memory usage
   */
  static logMemoryUsage(context?: string) {
    const memory = this.getMemoryUsage();
    const contextStr = context ? `[${context}] ` : '';
    console.log(`${contextStr}Memory: ${memory.used}MB / ${memory.total}MB (${memory.percentage}%)`);
  }

  /**
   * Check if memory usage is high
   */
  static isHighMemoryUsage(threshold = 80): boolean {
    const memory = this.getMemoryUsage();
    return memory.percentage > threshold;
  }
}

/**
 * API response time monitoring
 */
export class APIMonitor {
  /**
   * Measure API endpoint performance
   */
  static async measureEndpoint<T>(
    method: string,
    path: string,
    handler: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    const timestamp = new Date();
    
    try {
      const result = await handler();
      const duration = Date.now() - start;
      
      console.log(`[API] ${method} ${path}: ${duration}ms`);
      
      // Warn for slow endpoints
      if (duration > 3000) {
        console.warn(`[SLOW API] ${method} ${path}: ${duration}ms`);
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[API ERROR] ${method} ${path}: ${duration}ms - ${error}`);
      throw error;
    }
  }
}

export { PerformanceMonitor };
export default PerformanceMonitor;
