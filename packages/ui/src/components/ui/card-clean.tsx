import React from 'react';
import { cn } from '../../lib/cn';

interface CardCleanProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'subtle' | 'bordered';
  size?: 'sm' | 'md' | 'lg';
}

export const CardClean: React.FC<CardCleanProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
}) => {
  const baseClasses = "rounded-lg transition-colors duration-200";
  
  const variantClasses = {
    default: "bg-white shadow-sm",
    subtle: "bg-bg-secondary",
    bordered: "bg-white border border-border",
  };
  
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div className={cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  );
};

interface CardHeaderCleanProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeaderClean: React.FC<CardHeaderCleanProps> = ({
  children,
  className,
}) => (
  <div className={cn("mb-4", className)}>
    {children}
  </div>
);

interface CardTitleCleanProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CardTitleClean: React.FC<CardTitleCleanProps> = ({
  children,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: "text-lg font-medium",
    md: "text-xl font-semibold",
    lg: "text-2xl font-bold",
  };

  return (
    <h3 className={cn(
      "text-text-primary",
      sizeClasses[size],
      className
    )}>
      {children}
    </h3>
  );
};

interface CardContentCleanProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContentClean: React.FC<CardContentCleanProps> = ({
  children,
  className,
}) => (
  <div className={cn("space-y-3", className)}>
    {children}
  </div>
);

interface CardDescriptionCleanProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescriptionClean: React.FC<CardDescriptionCleanProps> = ({
  children,
  className,
}) => (
  <p className={cn(
    "text-text-secondary text-sm",
    className
  )}>
    {children}
  </p>
);

interface CardFooterCleanProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooterClean: React.FC<CardFooterCleanProps> = ({
  children,
  className,
}) => (
  <div className={cn("mt-4 pt-4 border-t border-border-light", className)}>
    {children}
  </div>
); 