import * as React from 'react';
import { cn } from '@rentalshop/ui';
import { ChevronDown } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
}

export interface SearchableSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  onSearch?: (query: string) => Promise<SearchableOption[]> | void;
  emptyText?: string;
  displayMode?: 'input' | 'button';
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
}) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [internalOptions, setInternalOptions] = React.useState<SearchableOption[]>(options);
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setInternalOptions(options);
  }, [options]);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      if (onSearch) {
        const res = await onSearch(query);
        if (active && Array.isArray(res)) setInternalOptions(res);
      }
    };
    // debounce 200ms
    const t = setTimeout(run, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, onSearch]);

  const filtered = React.useMemo(() => {
    if (onSearch) return internalOptions;
    const q = query.trim().toLowerCase();
    if (!q) return internalOptions;
    return internalOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [query, internalOptions, onSearch]);

  const selected = internalOptions.find((o) => o.value === value);

  const displayValue = query !== '' ? query : (selected?.label ?? '');

  // Close on outside click (works for both input and button modes)
  React.useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (open && !el.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div className={cn('relative', className)} ref={rootRef}>
      {displayMode === 'input' ? (
        <>
          <input
            value={displayValue}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onBlur={() => {
              setTimeout(() => {
                setOpen(false);
                setQuery('');
              }, 120);
            }}
            placeholder={selected ? selected.label : placeholder}
            className={cn(
              'h-10 w-full rounded-md border border-gray-300 bg-gray-50 pl-3 pr-10 text-sm',
              'focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100'
            )}
          />
          <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 h-5 w-px bg-gray-300" />
          <button
            type="button"
            aria-label="Toggle options"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen((o) => !o);
            }}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'h-10 w-full rounded-md border border-gray-300 bg-bg-card px-3 text-left text-sm flex items-center justify-between',
            'hover:bg-bg-secondary focus:bg-bg-card focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100'
          )}
        >
          <span className={cn(!selected && 'text-gray-400')}>{selected ? selected.label : placeholder}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </button>
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-md">
          <div className="max-h-56 overflow-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">{emptyText}</div>
            ) : (
              filtered.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    onChange?.(opt.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50',
                    value === opt.value && 'bg-blue-50 text-blue-700'
                  )}
                >
                  <span className="line-clamp-1">{opt.label}</span>
                  {value === opt.value && <span className="text-xs">✓</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Close on outside click
export default SearchableSelect;


