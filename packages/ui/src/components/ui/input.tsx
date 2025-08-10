import * as React from "react"

import { cn } from "@rentalshop/ui"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'filled' | 'underline' | 'ghost';
  leadingIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>((
  { className, type, variant = 'filled', leadingIcon, ...props },
  ref
) => {
  const base =
    "flex h-10 w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const variants: Record<NonNullable<InputProps['variant']>, string> = {
    default: base,
    filled:
      "flex w-full h-11 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100",
    underline:
      "flex w-full h-11 border-0 border-b border-gray-300 rounded-none px-0 text-sm focus:border-blue-500 focus:ring-0",
    ghost:
      "flex w-full h-11 bg-transparent border-transparent px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
  };

  const input = (
    <input
      type={type}
      className={cn(variants[variant], className)}
      ref={ref}
      {...props}
    />
  );

  if (!leadingIcon) return input;

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leadingIcon}</span>
      {React.cloneElement(input as any, {
        className: cn(variants[variant], 'pl-9', className),
      })}
    </div>
  );
})
Input.displayName = "Input"

export { Input } 