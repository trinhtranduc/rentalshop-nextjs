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

export const ColorfulTodaysFocus: React.FC<TodaysFocusProps> = ({ data }) => {
  const operations = [
    {
      title: 'Pickups Today',
      description: 'Items to be picked up',
      icon: '📦',
      value: data.todayPickups,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Returns Today',
      description: 'Items to be returned',
      icon: '🔄',
      value: data.todayReturns,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Overdue Items',
      description: 'Past due date',
      icon: '⚠️',
      value: data.overdueCount,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Active Rentals',
      description: 'Currently rented out',
      icon: '📊',
      value: data.activeRentals,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  const quickActions = [
    {
      title: 'Process Pickup',
      description: 'Mark items as picked up',
      icon: '📦',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Process Return',
      description: 'Mark items as returned',
      icon: '🔄',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Handle Overdue',
      description: 'Contact overdue customers',
      icon: '⚠️',
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'Send Reminders',
      description: 'Notify upcoming returns',
      icon: '📞',
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-gray-800">Today's Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {operations.map((operation, index) => (
              <div key={index} className="group relative overflow-hidden bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-100">
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${operation.color}`}></div>
                <div className="p-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${operation.color} text-white text-2xl flex items-center justify-center shadow-lg`}>
                        {operation.icon}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-lg">{operation.title}</p>
                        <p className="text-gray-600 font-medium">{operation.description}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-lg font-bold px-4 py-2 ${operation.textColor} border-2`}>
                      {operation.value}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-gray-800">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quickActions.map((action, index) => (
              <Button 
                key={index}
                className="w-full justify-start h-16 text-left group relative overflow-hidden bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg" 
                variant="outline"
              >
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${action.color}`}></div>
                <span className="mr-4 text-2xl">{action.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-900 text-lg">{action.title}</div>
                  <div className="text-gray-600 font-medium">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 