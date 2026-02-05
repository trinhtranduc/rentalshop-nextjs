/**
 * Cache Statistics and Monitoring
 * 
 * Track cache performance for monitoring and optimization
 */

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  averageHitTime: number;
  averageMissTime: number;
  lastReset: Date;
}

class CacheStatistics {
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    hitRate: 0,
    averageHitTime: 0,
    averageMissTime: 0,
    lastReset: new Date(),
  };

  private hitTimes: number[] = [];
  private missTimes: number[] = [];
  private maxSamples = 1000; // Keep last 1000 samples

  recordHit(duration: number): void {
    this.stats.hits++;
    this.stats.totalRequests++;
    this.hitTimes.push(duration);
    
    // Keep only last N samples
    if (this.hitTimes.length > this.maxSamples) {
      this.hitTimes.shift();
    }
    
    this.updateStats();
  }

  recordMiss(duration: number): void {
    this.stats.misses++;
    this.stats.totalRequests++;
    this.missTimes.push(duration);
    
    // Keep only last N samples
    if (this.missTimes.length > this.maxSamples) {
      this.missTimes.shift();
    }
    
    this.updateStats();
  }

  private updateStats(): void {
    // Calculate hit rate
    this.stats.hitRate = this.stats.totalRequests > 0
      ? (this.stats.hits / this.stats.totalRequests) * 100
      : 0;

    // Calculate average hit time
    if (this.hitTimes.length > 0) {
      const sum = this.hitTimes.reduce((a, b) => a + b, 0);
      this.stats.averageHitTime = sum / this.hitTimes.length;
    }

    // Calculate average miss time
    if (this.missTimes.length > 0) {
      const sum = this.missTimes.reduce((a, b) => a + b, 0);
      this.stats.averageMissTime = sum / this.missTimes.length;
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  reset(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      averageHitTime: 0,
      averageMissTime: 0,
      lastReset: new Date(),
    };
    this.hitTimes = [];
    this.missTimes = [];
  }

  getPerformanceImprovement(): {
    averageImprovement: number;
    totalTimeSaved: number;
  } {
    if (this.stats.averageMissTime === 0 || this.stats.averageHitTime === 0) {
      return {
        averageImprovement: 0,
        totalTimeSaved: 0,
      };
    }

    const averageImprovement = this.stats.averageMissTime - this.stats.averageHitTime;
    const totalTimeSaved = this.stats.hits * averageImprovement;

    return {
      averageImprovement,
      totalTimeSaved,
    };
  }
}

// Singleton instance
export const cacheStats = new CacheStatistics();

/**
 * Get cache statistics for monitoring
 */
export function getCacheStatistics() {
  const stats = cacheStats.getStats();
  const performance = cacheStats.getPerformanceImprovement();

  return {
    ...stats,
    performance,
    formatted: {
      hitRate: `${stats.hitRate.toFixed(1)}%`,
      averageHitTime: `${stats.averageHitTime.toFixed(0)}ms`,
      averageMissTime: `${stats.averageMissTime.toFixed(0)}ms`,
      averageImprovement: `${performance.averageImprovement.toFixed(0)}ms`,
      totalTimeSaved: `${(performance.totalTimeSaved / 1000).toFixed(1)}s`,
    },
  };
}

/**
 * Reset cache statistics
 */
export function resetCacheStatistics(): void {
  cacheStats.reset();
}
