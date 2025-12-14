'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Reusable hook for table row selection with checkbox support
 * 
 * @param items - Array of items with id property
 * @param onSelectionChange - Callback when selection changes
 * @returns Selection state and handlers
 */
export function useTableSelection<T extends { id: number }>(
  items: T[],
  onSelectionChange?: (selectedIds: number[]) => void
) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Notify parent when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(Array.from(selectedIds));
    }
  }, [selectedIds, onSelectionChange]);

  // Handle individual checkbox toggle
  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Handle select all checkbox
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(items.map(item => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [items]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;
  const selectedCount = selectedIds.size;

  return {
    selectedIds: Array.from(selectedIds),
    selectedIdsSet: selectedIds,
    allSelected,
    someSelected,
    selectedCount,
    handleToggleSelect,
    handleSelectAll,
    clearSelection,
    isSelected: (id: number) => selectedIds.has(id),
  };
}

