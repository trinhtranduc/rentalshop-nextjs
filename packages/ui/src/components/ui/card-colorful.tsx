import React from 'react';
import { cn } from '../../lib/cn';

interface CardColorfulProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'gradient' | 'glow' | 'elevated';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CardColorful: React.FC<CardColorfulProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
}) => {
  const baseClasses = "rounded-2xl border-0 transition-all duration-300 hover:scale-105";
  
  const variantClasses = {
    default: "bg-white shadow-soft hover:shadow-medium",
    gradient: "bg-gradient-to-br from-brand-500 to-action-primary text-white shadow-glow",
    glow: "bg-white shadow-glow-blue border border-action-primary/20",
    elevated: "bg-white shadow-large hover:shadow-glow",
  };
  
  const sizeClasses = {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    xl: "p-12",
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

interface CardHeaderColorfulProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeaderColorful: React.FC<CardHeaderColorfulProps> = ({
  children,
  className,
}) => (
  <div className={cn("mb-6", className)}>
    {children}
  </div>
);

interface CardTitleColorfulProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CardTitleColorful: React.FC<CardTitleColorfulProps> = ({
  children,
  className,
  size = 'lg',
}) => {
  const sizeClasses = {
    sm: "text-lg font-semibold",
    md: "text-xl font-semibold",
    lg: "text-2xl font-bold",
    xl: "text-3xl font-bold",
  };

  return (
    <h3 className={cn(
      "font-display text-text-primary",
      sizeClasses[size],
      className
    )}>
      {children}
    </h3>
  );
};

interface CardContentColorfulProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContentColorful: React.FC<CardContentColorfulProps> = ({
  children,
  className,
}) => (
  <div className={cn("space-y-4", className)}>
    {children}
  </div>
);

interface CardDescriptionColorfulProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescriptionColorful: React.FC<CardDescriptionColorfulProps> = ({
  children,
  className,
}) => (
  <p className={cn(
    "text-text-secondary text-lg font-medium",
    className
  )}>
    {children}
  </p>
);

interface CardFooterColorfulProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooterColorful: React.FC<CardFooterColorfulProps> = ({
  children,
  className,
}) => (
  <div className={cn("mt-6 pt-6 border-t border-border-light", className)}>
    {children}
  </div>
); 