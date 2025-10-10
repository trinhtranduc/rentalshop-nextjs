import React from 'react';
import { cn } from '../../lib/cn';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonColorfulVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-lg font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-105 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-glow hover:shadow-glow-blue",
        destructive: "bg-gradient-to-r from-action-danger to-red-600 text-white shadow-glow hover:shadow-glow",
        outline: "border-2 border-brand-500 bg-transparent text-brand-500 hover:bg-brand-500 hover:text-white",
        secondary: "bg-gradient-to-r from-action-secondary to-purple-600 text-white shadow-glow-purple hover:shadow-glow",
        ghost: "hover:bg-brand-100 hover:text-brand-700",
        link: "text-brand-500 underline-offset-4 hover:underline",
        success: "bg-gradient-to-r from-action-success to-emerald-600 text-white shadow-glow hover:shadow-glow",
        warning: "bg-gradient-to-r from-action-warning to-amber-600 text-white shadow-glow hover:shadow-glow",
        info: "bg-gradient-to-r from-action-info to-cyan-600 text-white shadow-glow hover:shadow-glow",
        warm: "bg-gradient-to-r from-gradient-warm text-white shadow-glow hover:shadow-glow",
        cool: "bg-gradient-to-r from-gradient-cool text-white shadow-glow hover:shadow-glow",
      },
      size: {
        default: "h-12 px-8 py-3 text-lg",
        sm: "h-10 px-6 py-2 text-base",
        lg: "h-14 px-10 py-4 text-xl",
        xl: "h-16 px-12 py-5 text-2xl",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonColorfulProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonColorfulVariants> {
  asChild?: boolean;
}

const ButtonColorful = React.forwardRef<HTMLButtonElement, ButtonColorfulProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? 'button' : "button";
    return (
      <Comp
        className={cn(buttonColorfulVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

ButtonColorful.displayName = "ButtonColorful";

export { ButtonColorful, buttonColorfulVariants }; 