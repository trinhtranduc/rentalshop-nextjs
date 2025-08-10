import * as React from "react"

import { cn } from "@rentalshop/ui"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'filled' | 'underline' | 'ghost';
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, variant = 'filled', ...props }, ref) => {
  const base =
    "flex min-h-[80px] w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

  const variants: Record<NonNullable<TextareaProps['variant']>, string> = {
    default: base,
    filled:
      "flex w-full min-h-[80px] rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100",
    underline:
      "flex w-full min-h-[80px] border-0 border-b border-gray-300 rounded-none px-0 text-sm focus:border-blue-500 focus:ring-0",
    ghost:
      "flex w-full min-h-[80px] bg-transparent border-transparent px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
  };

  return (
    <textarea
      className={cn(variants[variant], className)}
      ref={ref}
      {...props}
    />
  );
})
Textarea.displayName = "Textarea"

export { Textarea } 