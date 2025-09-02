import React from 'react';
import { PerformanceAlertCard, PerformanceAlert } from './PerformanceAlertCard';

interface PerformanceAlertsListProps {
  alerts: PerformanceAlert[];
  onResolveAlert?: (alertId: string) => void;
  onViewAlertDetails?: (alert: PerformanceAlert) => void;
  loading?: boolean;
  maxItems?: number;
}

export default function PerformanceAlertsList({ 
  alerts, 
  onResolveAlert, 
  onViewAlertDetails,
  loading = false,
  maxItems = 10
}: PerformanceAlertsListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-24 bg-gray-200 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const displayAlerts = alerts.slice(0, maxItems);
  const activeAlerts = displayAlerts.filter(alert => !alert.resolved);
  const resolvedAlerts = displayAlerts.filter(alert => alert.resolved);

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-tertiary">No performance alerts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Active Alerts ({activeAlerts.length})
          </h3>
          <div className="space-y-3">
            {activeAlerts.map((alert) => (
              <PerformanceAlertCard
                key={alert.id}
                alert={alert}
                onResolve={onResolveAlert}
                onViewDetails={onViewAlertDetails}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-text-primary mb-3">
            Recently Resolved ({resolvedAlerts.length})
          </h3>
          <div className="space-y-3">
            {resolvedAlerts.map((alert) => (
              <PerformanceAlertCard
                key={alert.id}
                alert={alert}
                onViewDetails={onViewAlertDetails}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
