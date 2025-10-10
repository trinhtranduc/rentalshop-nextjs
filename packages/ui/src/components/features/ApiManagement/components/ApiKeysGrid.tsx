import React from 'react';
import { ApiKeyCard, ApiKey } from './ApiKeyCard';

interface ApiKeysGridProps {
  apiKeys: ApiKey[];
  onCopyKey?: (key: string) => void;
  onRevokeKey?: (keyId: string) => void;
  onDeleteKey?: (keyId: string) => void;
  onViewKeyDetails?: (apiKey: ApiKey) => void;
  loading?: boolean;
}

export default function ApiKeysGrid({ 
  apiKeys, 
  onCopyKey, 
  onRevokeKey, 
  onDeleteKey, 
  onViewKeyDetails,
  loading = false 
}: ApiKeysGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-80 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No API keys found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {apiKeys.map((apiKey) => (
        <ApiKeyCard
          key={apiKey.id}
          apiKey={apiKey}
          onCopy={onCopyKey}
          onRevoke={onRevokeKey}
          onDelete={onDeleteKey}
          onViewDetails={onViewKeyDetails}
        />
      ))}
    </div>
  );
}
