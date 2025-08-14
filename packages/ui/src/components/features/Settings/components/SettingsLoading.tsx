import { 
  FormSkeleton, 
  CardSkeleton,
  NavigationSkeleton 
} from '../../../ui/skeleton';

export function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
      </div>
      
      {/* Navigation Tabs */}
      <NavigationSkeleton />
      
      {/* Settings Content */}
      <div className="space-y-6">
        {/* Profile Section */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <CardSkeleton />
        </div>
        
        {/* Preferences Section */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <CardSkeleton />
        </div>
        
        {/* Security Section */}
        <div className="space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}

export function SettingsFormLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      
      {/* Form */}
      <FormSkeleton />
    </div>
  );
}

export function ProfileLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      
      {/* Profile Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Avatar */}
        <div className="lg:col-span-1">
          <div className="space-y-4">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="aspect-square w-32 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          <FormSkeleton />
        </div>
      </div>
    </div>
  );
}
