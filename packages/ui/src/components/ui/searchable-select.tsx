'use client';

import * as React from 'react';
import { cn } from '../../lib/cn';
import { ChevronDown } from 'lucide-react';
import { Button } from './button';

export interface SearchableOption {
  value: string;
  label: string;
  // Extended fields for rich product display
  image?: string;
  subtitle?: string;
  description?: string;
  details?: string[];
  type?: 'customer' | 'product' | 'default';
}

export interface SearchableSelectProps {
  value?: number;
  onChange?: (value: number) => void;
  options?: SearchableOption[]; // Make optional since it's not needed when onSearch is provided
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  onSearch?: (query: string) => Promise<SearchableOption[]> | void;
  emptyText?: string;
  displayMode?: 'input' | 'button';
  showAddNew?: boolean; // Show "Add New" option at top
  addNewText?: string; // Text for "Add New" option
  onAddNew?: () => void; // Callback when "Add New" is clicked
  disabled?: boolean; // Add disabled prop
  productRowStyle?: 'default' | 'compact' | 'minimal'; // UI style for product rows
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  className,
  onSearch,
  emptyText = 'Không có dữ liệu',
  displayMode = 'input',
  showAddNew = false,
  addNewText = 'Add New',
  onAddNew,
  disabled = false,
  productRowStyle = 'default', // Default to current rich layout
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false); // Track if user is actively editing
  const [internalOptions, setInternalOptions] = React.useState<SearchableOption[]>(options || []);
  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const onSearchRef = React.useRef(onSearch);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Update ref when onSearch changes
  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  // Initialize internal options based on mode
  React.useEffect(() => {
    if (onSearch) {
      // In search mode, start with empty options
      setInternalOptions([]);
    } else {
      // In static mode, start with original options
      setInternalOptions(options || []);
    }
  }, [onSearch, options]);

  // Search effect for dynamic search mode with debounce mechanism
  React.useEffect(() => {
    let active = true;
    const DEBOUNCE_DELAY = 300; // 300ms debounce
    
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    const runSearch = async () => {
      const currentOnSearch = onSearchRef.current;
      
      if (currentOnSearch && query.trim()) {  // Only search if query has content
        console.log('🔍 SearchableSelect: Making API call for query:', query);
        const res = await currentOnSearch(query);
        if (active && Array.isArray(res)) {
          console.log('🔍 SearchableSelect: Received results:', res.length);
          setInternalOptions(res);
        }
      } else if (currentOnSearch && !query.trim() && !value) {
        // Only clear search results when query is empty AND no value is selected
        console.log('🔍 SearchableSelect: Clearing results for empty query (no selection)');
        setInternalOptions([]);
      }
    };
    
    if (query.trim()) {
      // Debounce: wait for user to stop typing before searching
      debounceTimeoutRef.current = setTimeout(() => {
        runSearch();
      }, DEBOUNCE_DELAY);
    } else if (!query.trim() && !value) {
      // Clear results immediately for empty query
      setInternalOptions([]);
    }
    
    return () => {
      active = false;
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, value]); // Depend on both query and value

  const filtered = React.useMemo(() => {
    console.log('🔍 SearchableSelect: Filtering with query:', query, 'onSearch:', !!onSearch, 'options count:', options?.length || 0, 'options:', options?.slice(0, 3));
    
    if (onSearch) {
      // In search mode, return search results if available, otherwise show empty
      if (query.trim()) {
        console.log('🔍 SearchableSelect: Search mode - returning internalOptions:', internalOptions.length);
        // Ensure selected option is included if exists
        const result = [...internalOptions];
        if (value && options) {
          const selectedOpt = options.find((o) => o.value === String(value));
          if (selectedOpt && !result.find((o) => o.value === selectedOpt.value)) {
            result.unshift(selectedOpt); // Add selected at top
          }
        }
        return result;
      } else {
        console.log('🔍 SearchableSelect: Search mode - returning empty array');
        return [];
      }
    }
    
    // In non-search mode, filter the static options
    const q = query.trim().toLowerCase();
    if (!q) {
      console.log('🔍 SearchableSelect: No query - returning all options:', (options || []).length);
      return options || []; // Use original options, not internalOptions
    }
    
    const filtered = options?.filter((o) => o.label.toLowerCase().includes(q));
    // Ensure selected option is included even if it doesn't match query
    if (value && options) {
      const selectedOpt = options.find((o) => o.value === String(value));
      if (selectedOpt && !filtered?.find((o) => o.value === selectedOpt.value)) {
        filtered?.unshift(selectedOpt); // Add selected at top
      }
    }
    console.log('🔍 SearchableSelect: Filtered results:', filtered?.length || 0, 'for query:', q);
    return filtered || [];
  }, [query, internalOptions, onSearch, options, value]);

  // Find selected option from all options (not just internalOptions)
  const selected = options?.find((o) => o.value === String(value)) || internalOptions.find((o) => o.value === String(value));

  // Keep selected label in input for better UX
  // If user is editing or query exists, show query instead of selected label
  // This allows user to completely clear the input
  const displayValue = (isEditing || query.trim() !== '') ? query : (selected?.label || '');

  // Close on outside click (works for both input and button modes)
  React.useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (open && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const handleSelect = (option: SearchableOption) => {
    console.log('🎯 SearchableSelect: Selecting option:', option);
    const numericValue = parseInt(option.value);
    console.log('🎯 SearchableSelect: Parsed value:', numericValue);
    onChange?.(numericValue);
    setOpen(false);
    setIsEditing(false); // Reset editing state when selection is made
    // Keep the selected option in the internal options so it remains visible
    if (onSearch) {
      setInternalOptions([option]);
    }
    // Clear the query after a short delay to allow the selection to be visible
    setTimeout(() => {
      setQuery('');
    }, 100);
  };

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      {/* Always use input mode for searchability (like SearchableCountrySelect) */}
      <input
        value={displayValue}
        disabled={disabled}
        onFocus={(e) => {
          if (!disabled) {
            setOpen(true);
            setIsEditing(true); // Mark as editing when focused
            // When focusing, if there's a selected value, allow user to clear it
            // Select all text so user can easily replace it
            if (selected && !query && !isEditing) {
              setTimeout(() => {
                e.target.select();
              }, 0);
            }
          }
        }}
        onChange={(e) => {
          if (disabled) return;
          const newValue = e.target.value;
          setIsEditing(true); // User is actively editing
          setQuery(newValue);
          setOpen(true);
          // Always clear selected value when user is typing/editing
          // This allows user to completely clear the input
            onChange?.(undefined as any);
        }}
        onBlur={() => {
          // Only close dropdown after a longer delay
          setTimeout(() => {
            setOpen(false);
            // Reset editing state when blurred, but keep query if empty to allow clearing
            if (query.trim() === '') {
              setIsEditing(false);
              // Keep query as empty string so user can clear selection
            } else {
              // If query has value but no selection, keep editing state
              setIsEditing(value === undefined);
            }
          }, 300);
        }}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-sm transition-all duration-200',
          'focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:ring-offset-0',
          'hover:border-gray-400',
          disabled && 'bg-gray-100 text-gray-500 cursor-not-allowed'
        )}
      />
      <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-300" />
      <Button
        variant="ghost"
        size="icon"
        type="button"
        disabled={disabled}
        aria-label="Toggle options"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150 h-6 w-6 p-0"
        onMouseDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
      
      {/* Clear button when there's a query or selected value */}
      {(query || value !== undefined) && (
        <Button
          variant="ghost"
          size="icon"
          type="button"
          onClick={() => {
            setQuery('');
            setIsEditing(true); // Set editing state when clearing
            onChange?.(undefined as any);
            // Reset to original options when clearing search
            if (onSearch) {
              setInternalOptions([]); // Clear search results
            } else {
              setInternalOptions(options || []); // Restore original options
            }
            // Don't close dropdown when clearing, allow user to search immediately
            setOpen(true);
            // Focus input after clearing
            setTimeout(() => {
              const input = rootRef.current?.querySelector('input');
              input?.focus();
            }, 0);
          }}
          className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150 h-6 w-6 p-0"
        >
          ✕
        </Button>
      )}

      {open && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="max-h-[500px] overflow-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                <div className="w-8 h-8 mx-auto mb-2 text-gray-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div>{emptyText}</div>
              </div>
            ) : (
              <>
                {/* Add New Customer Option */}
                {showAddNew && onAddNew && (
                  <Button
                    variant="ghost"
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      onAddNew();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-green-50 hover:text-green-700 transition-all duration-150 ease-in-out border-b border-gray-100 h-auto justify-start rounded-none"
                  >
                    {/* Plus icon for add new */}
                    <div className="flex-shrink-0 w-5 h-5 text-green-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    
                    {/* Add New text */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-green-700">{addNewText}</div>
                    </div>
                  </Button>
                )}
                
                {/* Options with custom rendering based on type */}
                {filtered.map((opt) => {
                  // Render product rows differently based on productRowStyle
                  if (opt.type === 'product' && productRowStyle === 'compact') {
                    // Compact product layout - single line with essential info
                    return (
                      <Button
                        variant="ghost"
                        type="button"
                        key={opt.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(opt);
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-all duration-150 h-auto justify-start rounded-none',
                          value !== undefined && value !== null && String(value) === opt.value && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        )}
                      >
                        {/* Compact icon */}
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          {opt.image ? (
                            <img 
                              src={opt.image} 
                              alt={opt.label}
                              className="w-full h-full object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Compact content - single line */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 truncate">{opt.label}</div>
                          {opt.details && opt.details.length > 0 && (
                            <div className="text-xs text-gray-500 truncate">
                              {opt.details.slice(0, 2).join(' • ')}
                            </div>
                          )}
                        </div>
                        
                        {/* Selection indicator */}
                        {value !== undefined && value !== null && String(value) === opt.value && (
                          <div className="flex-shrink-0 w-4 h-4 text-blue-700">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </Button>
                    );
                  }
                  
                  if (opt.type === 'product' && productRowStyle === 'minimal') {
                    // Minimal product layout - just name and price
                  return (
                  <Button
                    variant="ghost"
                    type="button"
                    key={opt.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(opt);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 transition-all duration-150 h-auto rounded-none',
                          value !== undefined && value !== null && String(value) === opt.value && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        )}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {/* Minimal icon */}
                          <div className="flex-shrink-0 w-6 h-6 text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          
                          {/* Minimal content - name only */}
                          <div className="font-medium text-gray-900 truncate">{opt.label}</div>
                        </div>
                        
                        {/* Price on the right */}
                        {opt.details && opt.details.length > 0 && (
                          <div className="flex-shrink-0 text-xs text-gray-600 ml-2">
                            {opt.details[0]}
                          </div>
                        )}
                        
                        {/* Selection indicator */}
                        {value !== undefined && value !== null && String(value) === opt.value && (
                          <div className="flex-shrink-0 w-4 h-4 text-blue-700 ml-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </Button>
                    );
                  }
                  
                  // Default rich layout without border (clean design)
                  return (
                  <div
                    key={opt.value}
                    className={cn(
                      'mx-1 my-1 rounded-lg transition-all duration-200',
                      opt.type === 'product' 
                        ? 'bg-white hover:bg-blue-100 hover:shadow-md' 
                        : 'hover:bg-gray-50',
                      value !== undefined && value !== null && String(value) === opt.value && 'bg-blue-50'
                    )}
                  >
                    <Button
                      variant="ghost"
                      type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      console.log('🖱️ Selecting option:', opt.label);
                      handleSelect(opt);
                    }}
                    className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-transparent transition-all duration-150 ease-in-out h-auto justify-start rounded-lg',
                        value !== undefined && value !== null && String(value) === opt.value && 'bg-transparent text-blue-700'
                    )}
                  >
                    {/* Icon or Image based on type */}
                    {opt.type === 'product' && opt.image ? (
                        // Product with image - no border
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={opt.image} 
                          alt={opt.label}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to package icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                          <div className="hidden w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>
                    ) : opt.type === 'product' ? (
                        // Product without image - use package icon with blue gradient, no border
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg flex items-center justify-center border border-gray-200">
                          <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                    ) : (
                      // Customer or default - use user icon
                      <div className="flex-shrink-0 w-5 h-5 text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Content based on type */}
                    <div className="flex-1 min-w-0">
                      {opt.type === 'product' ? (
                        // Product layout with rich information
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 truncate">{opt.label}</div>
                          {opt.subtitle && (
                            <div className="text-sm text-gray-600 truncate">{opt.subtitle}</div>
                          )}
                          {opt.details && opt.details.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {opt.details.map((detail, index) => (
                                <span 
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {detail}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        // Customer or default layout
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 truncate">{opt.label}</div>
                          {opt.description && (
                            <div className="text-sm text-gray-600 whitespace-pre-line">{opt.description}</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Selection indicator - Show check mark when selected */}
                    {value !== undefined && value !== null && String(value) === opt.value && (
                      <div className="flex-shrink-0 w-5 h-5 text-blue-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </Button>
                  </div>
                );
              })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Close on outside click
export default SearchableSelect;


