'use client';

import React from 'react';
import { Card, CardContent } from '../../../ui/card';

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps {
  data: any[];
  columns: Column[];
  loading?: boolean;
  onRowClick?: (row: any) => void;
  className?: string;
}

export default function DataTable({
  data,
  columns,
  loading = false,
  onRowClick,
  className = ''
}: DataTableProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-12 bg-bg-tertiary rounded mb-4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-bg-tertiary rounded mb-2"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`text-left py-3 px-4 font-medium text-text-secondary ${column.className || ''}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr
                  key={index}
                  className={`border-b border-border hover:bg-bg-secondary transition-colors ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="py-3 px-4">
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
