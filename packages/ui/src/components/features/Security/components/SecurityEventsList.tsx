import React from 'react';
import { SecurityEventCard, SecurityEvent } from './SecurityEventCard';

interface SecurityEventsListProps {
  events: SecurityEvent[];
  onViewEventDetails?: (event: SecurityEvent) => void;
  onResolveEvent?: (eventId: string) => void;
  loading?: boolean;
  maxItems?: number;
  showFullDetails?: boolean;
}

export default function SecurityEventsList({ 
  events, 
  onViewEventDetails, 
  onResolveEvent,
  loading = false,
  maxItems = 20,
  showFullDetails = false
}: SecurityEventsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-40 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const displayEvents = events.slice(0, maxItems);
  const activeEvents = displayEvents.filter(event => !event.resolved);
  const resolvedEvents = displayEvents.filter(event => event.resolved);

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No security events found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Events */}
      {activeEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Active Security Events ({activeEvents.length})
          </h3>
          <div className="space-y-4">
            {activeEvents.map((event) => (
              <SecurityEventCard
                key={event.id}
                event={event}
                onViewDetails={onViewEventDetails}
                onResolve={onResolveEvent}
                showFullDetails={showFullDetails}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Events */}
      {resolvedEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Recently Resolved ({resolvedEvents.length})
          </h3>
          <div className="space-y-4">
            {resolvedEvents.map((event) => (
              <SecurityEventCard
                key={event.id}
                event={event}
                onViewDetails={onViewEventDetails}
                showFullDetails={showFullDetails}
              />
            ))}
          </div>
        </div>
      )}
      
      {events.length > maxItems && (
        <div className="text-center py-4">
          <p className="text-sm text-text-tertiary">
            Showing {maxItems} of {events.length} security events
          </p>
        </div>
      )}
    </div>
  );
}
