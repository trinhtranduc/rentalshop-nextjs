import React from 'react';
import { cn } from '../../lib/cn';

export interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  container?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md', 
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full'
};

const paddingClasses = {
  none: '',
  sm: 'px-4 py-4',
  md: 'px-6 py-6', 
  lg: 'px-8 py-8',
  xl: 'px-10 py-10'
};

const spacingClasses = {
  none: '',
  sm: 'space-y-4',
  md: 'space-y-6',
  lg: 'space-y-8', 
  xl: 'space-y-10'
};

export function PageWrapper({
  children,
  className,
  container = true,
  maxWidth = '7xl',
  padding = 'sm',
  spacing = 'sm'
}: PageWrapperProps) {
  return (
    <div className={cn(
      // Base container
      container && 'mx-auto',
      // Max width
      maxWidth !== 'full' && maxWidthClasses[maxWidth],
      // Padding
      padding !== 'none' && paddingClasses[padding],
      // Spacing between children
      spacing !== 'none' && spacingClasses[spacing],
      // Custom classes
      className
    )}>
      {children}
    </div>
  );
}

// Convenience components for common layouts
export function PageHeader({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

export function PageTitle({
  children,
  className,
  subtitle
}: {
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
}) {
  return (
    <div className={cn('mb-2', className)}>
      <h1 className="text-3xl font-bold text-gray-900">
        {children}
      </h1>
      {subtitle && (
        <p className="text-gray-600 mt-1">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function PageContent({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {children}
    </div>
  );
}

export function PageSection({
  children,
  className,
  title
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      {title && (
        <h2 className="text-xl font-semibold text-gray-900">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
