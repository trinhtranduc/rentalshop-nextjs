'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ImageIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ImageLightboxProps = {
  src: string;
  alt: string;
  /** Applied to the trigger area (button or fallback box) */
  triggerClassName?: string;
  /** Applied to the thumbnail <img> */
  imgClassName?: string;
};

/**
 * Click thumbnail to open a full-screen style preview (dark overlay + large image).
 * Closes on backdrop click, Escape, or the close button.
 */
export function ImageLightbox({
  src,
  alt,
  triggerClassName,
  imgClassName,
}: ImageLightboxProps) {
  const [open, setOpen] = React.useState(false);
  const [broken, setBroken] = React.useState(false);

  if (!src?.trim()) {
    return null;
  }

  if (broken) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          triggerClassName
        )}
        aria-hidden
      >
        <ImageIcon className="h-1/3 w-1/3 max-h-10 max-w-10 opacity-50" />
      </div>
    );
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            'relative block cursor-zoom-in overflow-hidden border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            triggerClassName
          )}
          aria-label={`View larger image: ${alt}`}
        >
          <img
            src={src}
            alt={alt}
            className={cn('pointer-events-none h-full w-full select-none', imgClassName)}
            draggable={false}
            onError={() => setBroken(true)}
          />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/85 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[201] flex items-center justify-center p-4 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={() => setOpen(false)}
          onInteractOutside={() => setOpen(false)}
        >
          <div
            className="absolute inset-0 cursor-zoom-out"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <DialogPrimitive.Close
            type="button"
            className="absolute right-4 top-4 z-[203] flex h-10 w-10 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md ring-offset-background transition hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <img
            src={src}
            alt={alt}
            className="relative z-[202] max-h-[min(85vh,900px)] max-w-[min(95vw,1200px)] rounded-md object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
