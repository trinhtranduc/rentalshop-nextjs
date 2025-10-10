import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  href,
  color
}) => (
  <Card className="group relative overflow-hidden bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border-0">
    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`}></div>
    <CardContent className="p-6">
      <a href={href} className="block">
        <div className="flex items-center space-x-4">
          <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${color} text-white text-3xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-gray-600 font-medium">{description}</p>
          </div>
          <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </a>
    </CardContent>
  </Card>
);

export const ColorfulQuickActions: React.FC = () => {
  const quickActions = [
    {
      title: 'New Rental',
      description: 'Create rental order',
      icon: '📦',
      href: '/orders/new',
      color: 'from-blue-500 to-blue-600'
    },
    {
      title: 'Return Item',
      description: 'Process returns',
      icon: '🔄',
      href: '/orders/returns',
      color: 'from-green-500 to-green-600'
    },
    {
      title: 'Add Product',
      description: 'Add new item',
      icon: '➕',
      href: '/products/new',
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'Customer Search',
      description: 'Find customers',
      icon: '👥',
      href: '/customers',
      color: 'from-orange-500 to-orange-600'
    }
  ];

  return (
    <div className="mb-8">
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold text-gray-800">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 