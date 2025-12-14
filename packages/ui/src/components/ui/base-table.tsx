'use client';

import React, { ReactNode } from 'react';
import { Card, CardContent } from './card';
import { useTableSelection } from '@rentalshop/hooks';

export interface BaseTableColumn<T> {
  key: string;
  header: ReactNode | ((sortBy?: string, sortOrder?: 'asc' | 'desc', onSort?: (key: string) => void) => ReactNode);
  cell: (item: T, index: number) => ReactNode;
  className?: string;
  sortable?: boolean;
}

export interface BaseTableProps<T extends { id: number }> {
  items: T[];
  columns: BaseTableColumn<T>[];
  onSelectionChange?: (selectedIds: number[]) => void;
  enableSelection?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  emptyState?: ReactNode;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number, isSelected: boolean) => string);
  showCard?: boolean;
}

/**
 * BaseTable - Reusable table component with built-in checkbox selection
 * 
 * Features:
 * - Checkbox selection with select all
 * - Sortable columns
 * - Customizable styling
 * - Empty state support
 * - Row highlighting for selected items
 */
export function BaseTable<T extends { id: number }>({
  items,
  columns,
  onSelectionChange,
  enableSelection = false,
  sortBy,
  sortOrder,
  onSort,
  emptyState,
  className = '',
  headerClassName = '',
  rowClassName = '',
  showCard = true,
}: BaseTableProps<T>) {
  // Use selection hook if enabled
  const {
    selectedIdsSet,
    allSelected,
    someSelected,
    handleToggleSelect,
    handleSelectAll,
    isSelected,
  } = useTableSelection(items, enableSelection ? onSelectionChange : undefined);

  // Render header cell
  const renderHeaderCell = (column: BaseTableColumn<T>, index: number) => {
    const headerContent = typeof column.header === 'function'
      ? column.header(sortBy, sortOrder, onSort)
      : column.header;

    return (
      <th
        key={column.key}
        className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${column.className || ''} ${headerClassName}`}
      >
        {headerContent}
      </th>
    );
  };

  // Render row
  const renderRow = (item: T, index: number) => {
    const itemIsSelected = enableSelection ? isSelected(item.id) : false;
    
    const rowClass = typeof rowClassName === 'function'
      ? rowClassName(item, index, itemIsSelected)
      : rowClassName;

    const baseRowClass = `hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
      itemIsSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
    } ${rowClass}`;

    return (
      <tr key={item.id} className={baseRowClass}>
        {/* Checkbox column */}
        {enableSelection && (
          <td className="px-6 py-3 whitespace-nowrap">
            <input
              type="checkbox"
              checked={itemIsSelected}
              onChange={() => handleToggleSelect(item.id)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
              aria-label={`Select ${item.id}`}
            />
          </td>
        )}
        
        {/* Data columns */}
        {columns.map((column) => (
          <td
            key={column.key}
            className={`px-6 py-3 whitespace-nowrap ${column.className || ''}`}
          >
            {column.cell(item, index)}
          </td>
        ))}
      </tr>
    );
  };

  // Empty state
  if (items.length === 0) {
    if (emptyState) {
      return <>{emptyState}</>;
    }
    
    return (
      <Card className="shadow-sm border-gray-200 dark:border-gray-700">
        <CardContent className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">No items found</h3>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tableContent = (
    <div className="overflow-auto flex-1">
      <table className={`w-full min-w-[1000px] ${className}`}>
        {/* Table Header */}
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <tr>
            {/* Select All Checkbox */}
            {enableSelection && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                  aria-label="Select all"
                  title={allSelected ? 'Deselect all' : 'Select all'}
                />
              </th>
            )}
            {columns.map((column, index) => renderHeaderCell(column, index))}
          </tr>
        </thead>
        
        {/* Table Body */}
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((item, index) => renderRow(item, index))}
        </tbody>
      </table>
    </div>
  );

  if (showCard) {
    return (
      <Card className="shadow-sm border border-gray-200 dark:border-gray-700 h-full flex flex-col">
        {tableContent}
      </Card>
    );
  }

  return tableContent;
}

