/**
 * GET /api/admin/cache-stats
 * Get image search cache statistics for monitoring
 * 
 * ✅ FREE - No external service needed
 * ✅ Real-time cache performance metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { ResponseBuilder } from '@rentalshop/utils';
import { getCacheStatistics, resetCacheStatistics } from '../../../../lib/image-search-cache-stats';
import { getCacheStats } from '../../../../lib/image-search-cache';

/**
 * GET /api/admin/cache-stats
 * Get cache statistics
 */
export const GET = withPermissions(['products.view'])(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Reset statistics if requested
    if (action === 'reset') {
      resetCacheStatistics();
      return NextResponse.json(
        ResponseBuilder.success('CACHE_STATS_RESET', {
          message: 'Cache statistics reset successfully',
        })
      );
    }

    // Get cache statistics
    const stats = getCacheStatistics();
    const cacheInfo = getCacheStats();

    return NextResponse.json(
      ResponseBuilder.success('CACHE_STATS_FETCHED', {
        statistics: stats,
        cache: cacheInfo,
        summary: {
          hitRate: stats.formatted.hitRate,
          totalRequests: stats.totalRequests,
          hits: stats.hits,
          misses: stats.misses,
          averageHitTime: stats.formatted.averageHitTime,
          averageMissTime: stats.formatted.averageMissTime,
          averageImprovement: stats.formatted.averageImprovement,
          totalTimeSaved: stats.formatted.totalTimeSaved,
          cacheSize: `${cacheInfo.size}/${cacheInfo.maxSize}`,
          lastReset: stats.lastReset.toISOString(),
        },
      })
    );
  } catch (error: any) {
    console.error('Error fetching cache statistics:', error);
    return NextResponse.json(
      ResponseBuilder.error('STATS_FETCH_FAILED'),
      { status: 500 }
    );
  }
});
