import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { TodaysFocus } from '../types';

interface DashboardFocusProps {
  focus: TodaysFocus[];
}

export function DashboardFocus({ focus }: DashboardFocusProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's Focus</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Priority tasks and key focus areas
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {focus.map((item, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex-shrink-0">
                <div className={`w-2 h-2 rounded-full ${
                  item.status === 'completed' ? 'bg-green-500' :
                  item.status === 'in-progress' ? 'bg-blue-500' : 'bg-yellow-500'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.priority}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={getStatusColor(item.status)}
                  >
                    {item.status.replace('-', ' ')}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {item.description}
                </p>
                
                {item.deadline && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Deadline: {item.deadline}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          {focus.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No focus items for today</p>
              <p className="text-sm">Great job staying on top of everything!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
