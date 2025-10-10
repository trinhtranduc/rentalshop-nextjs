import React from 'react';
import { ApiEndpointCard, ApiEndpoint } from './ApiEndpointCard';

interface ApiEndpointsGridProps {
  endpoints: ApiEndpoint[];
  onEditEndpoint?: (endpoint: ApiEndpoint) => void;
  onViewEndpointDetails?: (endpoint: ApiEndpoint) => void;
  loading?: boolean;
}

export default function ApiEndpointsGrid({ 
  endpoints, 
  onEditEndpoint, 
  onViewEndpointDetails,
  loading = false 
}: ApiEndpointsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-64 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (endpoints.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No API endpoints found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {endpoints.map((endpoint) => (
        <ApiEndpointCard
          key={endpoint.id}
          endpoint={endpoint}
          onEdit={onEditEndpoint}
          onViewDetails={onViewEndpointDetails}
        />
      ))}
    </div>
  );
}
