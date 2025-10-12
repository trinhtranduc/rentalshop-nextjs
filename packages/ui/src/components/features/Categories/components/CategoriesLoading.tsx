import { 
  TableSkeleton, 
  SearchSkeleton, 
  PaginationSkeleton,
  StatsSkeleton 
} from '../../../ui/skeleton';

export function CategoriesLoading() {
  return (
    <div className="space-y-6">
      {/* Stats Section */}
      <StatsSkeleton />
      
      {/* Search and Filters */}
      <SearchSkeleton />
      
      {/* Categories Table */}
      <TableSkeleton rows={8} columns={4} />
      
      {/* Pagination */}
      <PaginationSkeleton />
    </div>
  );
}

export function CategoryDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}

