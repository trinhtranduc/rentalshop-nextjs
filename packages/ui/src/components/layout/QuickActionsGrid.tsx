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
  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
    <CardContent className="p-3">
      <a href={href} className="block">
        <div className="flex items-center space-x-3">
          <div className="text-gray-500 text-base">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 text-sm">{title}</h3>
            <p className="text-xs text-gray-400">{description}</p>
          </div>
          <div className="text-gray-300">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </a>
    </CardContent>
  </Card>
);

export const QuickActionsGrid: React.FC = () => {
  const quickActions = [
    {
      title: 'New Rental',
      description: 'Create rental order',
      icon: '📦',
      href: '/orders/new',
      color: 'bg-blue-500'
    },
    {
      title: 'Return Item',
      description: 'Process returns',
      icon: '🔄',
      href: '/orders/returns',
      color: 'bg-green-500'
    },
    {
      title: 'Add Product',
      description: 'Add new item',
      icon: '➕',
      href: '/products/new',
      color: 'bg-purple-500'
    },
    {
      title: 'Customer Search',
      description: 'Find customers',
      icon: '👥',
      href: '/customers',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} {...action} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 