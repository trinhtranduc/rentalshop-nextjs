import React from 'react';
import { cn } from '../../lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonCleanVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-white hover:bg-brand-600",
        secondary: "bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-border",
        outline: "border border-border bg-transparent text-text-primary hover:bg-bg-secondary",
        ghost: "hover:bg-bg-secondary hover:text-text-primary",
        link: "text-brand-primary underline-offset-4 hover:underline",
        success: "bg-action-success text-white hover:bg-green-600",
        danger: "bg-action-danger text-white hover:bg-red-600",
        warning: "bg-action-warning text-white hover:bg-amber-600",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonCleanProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonCleanVariants> {
  asChild?: boolean;
  icon?: React.ReactNode;
  showIcon?: boolean;
  iconPosition?: 'left' | 'right';
}

const ButtonClean = React.forwardRef<HTMLButtonElement, ButtonCleanProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    icon, 
    showIcon = true, 
    iconPosition = 'left',
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? 'button' : "button";
    
    const renderIcon = () => {
      if (!icon || !showIcon) return null;
      return (
        <span className={cn(
          "inline-flex items-center",
          iconPosition === 'left' ? 'mr-2' : 'ml-2'
        )}>
          {icon}
        </span>
      );
    };

    return (
      <Comp
        className={cn(buttonCleanVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {iconPosition === 'left' && renderIcon()}
        {children}
        {iconPosition === 'right' && renderIcon()}
      </Comp>
    );
  }
);

ButtonClean.displayName = "ButtonClean";

export { ButtonClean, buttonCleanVariants }; 