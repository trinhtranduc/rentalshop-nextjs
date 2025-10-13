import React from 'react';
import { cn } from '../../lib/utils';

interface LoadingIndicatorProps {
  variant?: 'bar' | 'circular' | 'dots' | 'pulse' | 'spinner';
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

/**
 * Modern Loading Indicator Component
 * 
 * Variants:
 * - bar: Progress bar style (default, modern)
 * - circular: Circular progress with blue arc (like image)
 * - dots: Bouncing dots (playful)
 * - pulse: Pulsing effect (subtle)
 * - spinner: Traditional spinner (fallback)
 */
export function LoadingIndicator({ 
  variant = 'bar', 
  size = 'md',
  message = 'Loading...',
  className 
}: LoadingIndicatorProps) {
  
  // Size classes
  const sizeClasses = {
    sm: { container: 'text-sm', bar: 'h-1', circular: 'h-6 w-6', dots: 'h-2 w-2', spinner: 'h-6 w-6' },
    md: { container: 'text-base', bar: 'h-1.5', circular: 'h-8 w-8', dots: 'h-3 w-3', spinner: 'h-8 w-8' },
    lg: { container: 'text-lg', bar: 'h-2', circular: 'h-12 w-12', dots: 'h-4 w-4', spinner: 'h-12 w-12' }
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-4', className)}>
      {/* Loading Animation */}
      {variant === 'bar' && (
        <div className="w-64 bg-gray-200 rounded-full overflow-hidden">
          <div className={cn(
            'bg-gradient-to-r from-green-500 via-green-600 to-green-500 rounded-full',
            'animate-progress',
            sizes.bar
          )}>
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
      )}

      {variant === 'circular' && (
        <div className={cn('relative', sizes.circular)}>
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            {/* Background circle */}
            <path
              className="text-gray-200"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {/* Progress arc - blue like in image */}
            <path
              className="text-blue-600 animate-circular-progress"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              strokeDasharray="100, 100"
              strokeDashoffset="25"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
        </div>
      )}

      {variant === 'dots' && (
        <div className="flex space-x-2">
          <div className={cn(sizes.dots, 'bg-green-500 rounded-full animate-bounce [animation-delay:-0.3s]')} />
          <div className={cn(sizes.dots, 'bg-green-600 rounded-full animate-bounce [animation-delay:-0.15s]')} />
          <div className={cn(sizes.dots, 'bg-green-700 rounded-full animate-bounce')} />
        </div>
      )}

      {variant === 'pulse' && (
        <div className="relative">
          <div className={cn(sizes.spinner, 'bg-green-500 rounded-full animate-ping absolute opacity-75')} />
          <div className={cn(sizes.spinner, 'bg-green-600 rounded-full relative')} />
        </div>
      )}

      {variant === 'spinner' && (
        <svg 
          className={cn('animate-spin text-green-600', sizes.spinner)} 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}

      {/* Loading Message */}
      {message && (
        <p className={cn('text-gray-600 font-medium', sizes.container)}>
          {message}
        </p>
      )}
    </div>
  );
}

/**
 * Compact inline loading indicator (for buttons, cards, etc.)
 */
export function LoadingInline({ 
  variant = 'dots',
  size = 'sm',
  className 
}: Pick<LoadingIndicatorProps, 'variant' | 'size' | 'className'>) {
  const sizeClasses = {
    sm: { dots: 'h-1.5 w-1.5', spinner: 'h-4 w-4' },
    md: { dots: 'h-2 w-2', spinner: 'h-5 w-5' },
    lg: { dots: 'h-3 w-3', spinner: 'h-6 w-6' }
  };

  const sizes = sizeClasses[size];

  if (variant === 'dots') {
    return (
      <div className={cn('flex items-center space-x-1', className)}>
        <div className={cn(sizes.dots, 'bg-current rounded-full animate-bounce [animation-delay:-0.3s]')} />
        <div className={cn(sizes.dots, 'bg-current rounded-full animate-bounce [animation-delay:-0.15s]')} />
        <div className={cn(sizes.dots, 'bg-current rounded-full animate-bounce')} />
      </div>
    );
  }

  return (
    <svg 
      className={cn('animate-spin', sizes.spinner, className)} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

