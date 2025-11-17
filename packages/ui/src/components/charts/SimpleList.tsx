import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

interface ListItem {
  id: number;
  title: string;
  subtitle?: string;
  value?: string | number;
  status?: string;
}

interface SimpleListProps {
  title: string;
  subtitle?: string;
  data: ListItem[];
  loading?: boolean;
  maxItems?: number;
}

export const SimpleList: React.FC<SimpleListProps> = ({ 
  title, 
  subtitle, 
  data, 
  loading = false,
  maxItems = 5 
}) => {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: maxItems }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {data.slice(0, maxItems).map((item, index) => (
            <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-25 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 bg-gray-50 rounded flex items-center justify-center text-xs font-medium text-gray-400">
                  {index + 1}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-xs text-gray-400">{item.subtitle}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                {item.value && (
                  <p className="font-medium text-gray-900 text-sm">{item.value}</p>
                )}
                {item.status && (
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    item.status === 'active' ? 'bg-blue-50 text-blue-700' :
                    item.status === 'overdue' ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {item.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}; 