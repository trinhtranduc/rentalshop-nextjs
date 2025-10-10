import { 
  GridSkeleton, 
  SearchSkeleton, 
  PaginationSkeleton,
  StatsSkeleton 
} from '../../../ui/skeleton';

export function ShopsLoading() {
  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <StatsSkeleton />
      
      {/* Search and Filters */}
      <SearchSkeleton />
      
      {/* Shops Grid */}
      <GridSkeleton items={6} />
      
      {/* Pagination */}
      <PaginationSkeleton />
    </div>
  );
}

export function ShopDetailLoading() {
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
      
      {/* Shop Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Placeholder */}
        <div className="lg:col-span-1">
          <div className="aspect-video w-full bg-gray-200 rounded-lg animate-pulse" />
        </div>
        
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Outlets */}
      <div className="space-y-4">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <GridSkeleton items={4} />
      </div>
    </div>
  );
}
