import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface TodaysFocusProps {
  data: {
    todayPickups: number;
    todayReturns: number;
    overdueCount: number;
    activeRentals: number;
  };
}

export const TodaysFocus: React.FC<TodaysFocusProps> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Today's Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="text-gray-400 text-sm">
                  📦
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Pickups Today</p>
                  <p className="text-xs text-gray-400">Items to be picked up</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {data.todayPickups}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="text-gray-400 text-sm">
                  🔄
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Returns Today</p>
                  <p className="text-xs text-gray-400">Items to be returned</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {data.todayReturns}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="text-gray-400 text-sm">
                  ⚠️
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Overdue Items</p>
                  <p className="text-xs text-gray-400">Past due date</p>
                </div>
              </div>
              <Badge variant="destructive" className="text-xs">
                {data.overdueCount}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className="text-gray-400 text-sm">
                  📊
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Active Rentals</p>
                  <p className="text-xs text-gray-400">Currently rented out</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {data.activeRentals}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button className="w-full justify-start h-12 text-left" variant="outline">
              <span className="mr-3">📦</span>
              <div className="flex-1 text-left">
                <div className="font-medium">Process Pickup</div>
                <div className="text-sm text-gray-500">Mark items as picked up</div>
              </div>
            </Button>
            
            <Button className="w-full justify-start h-12 text-left" variant="outline">
              <span className="mr-3">🔄</span>
              <div className="flex-1 text-left">
                <div className="font-medium">Process Return</div>
                <div className="text-sm text-gray-500">Mark items as returned</div>
              </div>
            </Button>
            
            <Button className="w-full justify-start h-12 text-left" variant="outline">
              <span className="mr-3">⚠️</span>
              <div className="flex-1 text-left">
                <div className="font-medium">Handle Overdue</div>
                <div className="text-sm text-gray-500">Contact overdue customers</div>
              </div>
            </Button>
            
            <Button className="w-full justify-start h-12 text-left" variant="outline">
              <span className="mr-3">📞</span>
              <div className="flex-1 text-left">
                <div className="font-medium">Send Reminders</div>
                <div className="text-sm text-gray-500">Notify upcoming returns</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 