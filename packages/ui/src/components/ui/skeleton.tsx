import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-200 dark:bg-gray-700",
        className
      )}
    />
  );
}

// Card skeleton
export function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6", className)}>
      <div className="space-y-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

// Table skeleton
export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  className 
}: { 
  rows?: number; 
  columns?: number; 
  className?: string;
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-md border">
        <div className="border-b bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <table className="w-full">
          <thead className="border-b bg-muted/50">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="p-4 text-left font-medium">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRowSkeleton key={rowIndex} columns={columns} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Grid skeleton
export function GridSkeleton({ 
  items = 6, 
  className 
}: { 
  items?: number; 
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

// Navigation skeleton
export function NavigationSkeleton({ className }: SkeletonProps) {
  return (
    <nav className={cn("flex items-center space-x-4", className)}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-8 w-20" />
      ))}
    </nav>
  );
}

// Stats skeleton
export function StatsSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-lg border bg-card p-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Calendar skeleton
export function CalendarSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="h-10 rounded border p-2">
            <Skeleton className="h-4 w-6" />
          </div>
        ))}
        {Array.from({ length: 35 }).map((_, index) => (
          <div key={index} className="h-20 rounded border p-2">
            <div className="space-y-1">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-2 w-6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Search skeleton
export function SearchSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

// Pagination skeleton
export function PaginationSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <Skeleton className="h-4 w-32" />
      <div className="flex gap-1">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
  );
}

// Sidebar skeleton
export function SidebarSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("w-64 space-y-4 p-4", className)}>
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

// Header skeleton
export function HeaderSkeleton({ className }: SkeletonProps) {
  return (
    <header className={cn("border-b bg-background", className)}>
      <div className="flex h-16 items-center justify-between px-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </header>
  );
}
