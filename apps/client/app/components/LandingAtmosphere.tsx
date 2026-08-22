import React from 'react'
import { cn } from '@rentalshop/ui'

/** Soft sky atmosphere matching the AI Search section. */
export function SoftSkyStage({
  className,
  children,
  tone = 'mist',
}: {
  className?: string
  children?: React.ReactNode
  tone?: 'mist' | 'white' | 'deep'
}) {
  const bg =
    tone === 'white'
      ? 'bg-white'
      : tone === 'deep'
        ? 'bg-slate-900'
        : 'bg-[#F4F8FC]'

  return (
    <div className={cn('relative overflow-hidden', bg, className)}>
      {tone !== 'deep' && (
        <>
          <div
            className="pointer-events-none absolute -top-24 right-0 h-[420px] w-[420px] rounded-full bg-[#C9DEF5]/40 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-[-80px] h-[360px] w-[360px] rounded-full bg-[#D7E8F8]/50 blur-3xl"
            aria-hidden="true"
          />
        </>
      )}
      {tone === 'deep' && (
        <>
          <div
            className="pointer-events-none absolute -top-20 right-10 h-[380px] w-[380px] rounded-full bg-sky-500/20 blur-3xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-sky-400/10 blur-3xl"
            aria-hidden="true"
          />
        </>
      )}
      {children}
    </div>
  )
}

export function SoftSkySection({
  id,
  ariaLabel,
  tone = 'mist',
  className,
  innerClassName,
  children,
}: {
  id?: string
  ariaLabel?: string
  tone?: 'mist' | 'white' | 'deep'
  className?: string
  innerClassName?: string
  children: React.ReactNode
}) {
  return (
    <SoftSkyStage
      tone={tone}
      className={cn('py-24 md:py-28', className)}
    >
      <section id={id} aria-label={ariaLabel} className="relative">
        <div
          className={cn(
            'relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
            innerClassName
          )}
        >
          {children}
        </div>
      </section>
    </SoftSkyStage>
  )
}

export const softSkyBadgeClass =
  'mb-5 px-3 py-1 text-xs font-medium text-sky-800 border-sky-200/80 bg-white/80 backdrop-blur-sm'

export const softSkyCardClass =
  'border border-sky-100/90 bg-white/90 shadow-sm hover:border-sky-200 hover:shadow-md transition-all duration-300 rounded-2xl'

export const softSkyIconBoxClass =
  'w-11 h-11 rounded-2xl bg-white border border-sky-100 shadow-sm flex items-center justify-center'
