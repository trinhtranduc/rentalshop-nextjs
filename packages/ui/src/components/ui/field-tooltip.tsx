'use client';

import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface FieldTooltipProps {
  text: string;
  className?: string;
}

/**
 * FieldTooltip Component
 * A simple hover tooltip with info icon
 * Used for displaying helpful information about form fields or statistics
 */
export const FieldTooltip: React.FC<FieldTooltipProps> = ({ text, className = '' }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative inline-flex items-center ml-1 ${className}`}>
      <button
        type="button"
        // 24×24 target (WCAG 2.5.8) with the same 16px icon; -m-1 keeps the layout unchanged
        className="-m-1 inline-flex items-center justify-center w-6 h-6 rounded-full text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        // Keyboard and touch users see the text too, not only mouse hover
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowTooltip((open) => !open);
        }}
        aria-label="Information"
      >
        <Info className="w-4 h-4" />
      </button>
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[9999] pointer-events-none whitespace-normal">
          {text}
          <div className="absolute left-2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

