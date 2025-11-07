import { 
  TableSkeleton, 
  SearchSkeleton, 
  PaginationSkeleton,
  StatsSkeleton 
} from '@rentalshop/ui/base';

export function OrdersLoading() {
  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <StatsSkeleton />
      
      {/* Search and Filters */}
      <SearchSkeleton />
      
      {/* Orders Table */}
      <TableSkeleton rows={8} columns={6} />
      
      {/* Pagination */}
      <PaginationSkeleton />
    </div>
  );
}

export function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      
      {/* Order Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Order Items */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <TableSkeleton rows={3} columns={4} />
      </div>
    </div>
  );
}
