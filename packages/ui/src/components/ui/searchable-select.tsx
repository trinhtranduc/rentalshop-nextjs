'use client';

import * as React from 'react';
import { cn } from '../../lib/cn';
import { ChevronDown } from 'lucide-react';

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
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
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
    console.log('🔍 SearchableSelect: Filtering with query:', query, 'onSearch:', !!onSearch, 'options count:', options?.length || 0);
    
    if (onSearch) {
      // In search mode, return search results if available, otherwise show empty
      if (query.trim()) {
        console.log('🔍 SearchableSelect: Search mode - returning internalOptions:', internalOptions.length);
        return internalOptions;
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
    console.log('🔍 SearchableSelect: Filtered results:', filtered?.length || 0, 'for query:', q);
    return filtered || [];
  }, [query, internalOptions, onSearch, options]);

  const selected = internalOptions.find((o) => o.value === String(value));

  // Keep selected label in input for better UX
  const displayValue = selected?.label || query;

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
    onChange?.(parseInt(option.value));
    setOpen(false);
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
      
      {displayMode === 'input' ? (
        <>
          <input
            value={displayValue}
            onFocus={() => {
              setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onBlur={() => {
              // Only close dropdown after a longer delay
              setTimeout(() => {
                setOpen(false);
                // Don't clear query here - let it persist for search
              }, 300);
            }}
            placeholder={selected ? selected.label : placeholder}
            className={cn(
              'h-11 w-full rounded-lg border border-gray-300 bg-white pl-4 pr-12 text-sm transition-all duration-200',
              'focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:ring-offset-0',
              'hover:border-gray-400'
            )}
          />
          <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 h-6 w-px bg-gray-300" />
          <button
            type="button"
            aria-label="Toggle options"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen((o) => !o);
            }}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          
          {/* Clear button when there's a query */}
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                // Reset to original options when clearing search
                if (onSearch) {
                  setInternalOptions([]); // Clear search results
                } else {
                  setInternalOptions(options || []); // Restore original options
                }
                setOpen(false);
              }}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-150"
            >
              ✕
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-left text-sm flex items-center justify-between transition-all duration-200',
            'hover:bg-gray-50 hover:border-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:ring-offset-0'
          )}
        >
          <span className={cn(!selected && 'text-gray-400')}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-5 w-5 text-gray-500" />
        </button>
      )}

      {open && (
        <div className="absolute z-[9999] mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="max-h-64 overflow-auto py-2">
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
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-green-50 hover:text-green-700 transition-all duration-150 ease-in-out border-b border-gray-100"
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
                  </button>
                )}
                
                {/* Options with custom rendering based on type */}
                {filtered.map((opt) => {
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => {
                        handleSelect(opt);
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-50 hover:text-gray-900 transition-all duration-150 ease-in-out',
                        value === parseInt(opt.value) && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      )}
                    >
                    {/* Icon or Image based on type */}
                    {opt.type === 'product' && opt.image ? (
                      // Product with image
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
                        <div className="hidden w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>
                    ) : opt.type === 'product' ? (
                      // Product without image - use package icon
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    
                    {/* Selection indicator */}
                    {value === parseInt(opt.value) && (
                      <div className="flex-shrink-0 w-5 h-5 text-blue-600">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
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


