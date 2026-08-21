'use client'

import React from 'react'
import Image from 'next/image'
import { Badge } from '@rentalshop/ui'
import type { LucideIcon } from 'lucide-react'
import { SoftSkyStage, softSkyBadgeClass } from './LandingAtmosphere'

export type FeatureSpotlightStep = {
  icon: LucideIcon
  title: string
  desc: string
  step: string
}

type FeatureSpotlightProps = {
  id: string
  ariaLabel: string
  badgeIcon: LucideIcon
  badge: string
  title: string
  description: string
  steps: FeatureSpotlightStep[]
  /** reverse = image on left / text on right */
  reverse?: boolean
  tone?: 'mist' | 'white'
  visual: React.ReactNode
}

/** Shared soft-sky spotlight layout (same language as AI Search section). */
export function FeatureSpotlight({
  id,
  ariaLabel,
  badgeIcon: BadgeIcon,
  badge,
  title,
  description,
  steps,
  reverse = false,
  tone = 'mist',
  visual,
}: FeatureSpotlightProps) {
  return (
    <SoftSkyStage tone={tone} className="py-24 md:py-28">
      <section id={id} className="relative" aria-label={ariaLabel}>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className={reverse ? 'order-2 lg:order-2' : 'order-2 lg:order-1'}>
              <Badge variant="outline" className={softSkyBadgeClass}>
                <BadgeIcon className="w-4 h-4 mr-2 text-sky-700" />
                {badge}
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-5 tracking-tight leading-[1.12]">
                {title}
              </h2>
              <p className="text-lg text-slate-600 mb-10 max-w-xl leading-relaxed">
                {description}
              </p>

              <ol className="space-y-5">
                {steps.map(({ icon: Icon, title: stepTitle, desc, step }) => (
                  <li key={step} className="flex gap-4 group">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-white border border-sky-100 shadow-sm flex items-center justify-center group-hover:border-sky-200 transition-colors">
                        <Icon className="w-5 h-5 text-sky-700" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 text-[10px] font-semibold tracking-wide text-sky-600/80 bg-sky-50 rounded-full px-1.5 py-0.5 border border-sky-100">
                        {step}
                      </span>
                    </div>
                    <div className="pt-0.5">
                      <h4 className="font-semibold text-slate-900 mb-1">{stepTitle}</h4>
                      <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div
              className={
                reverse
                  ? 'order-1 lg:order-1 flex justify-center lg:justify-start'
                  : 'order-1 lg:order-2 flex justify-center lg:justify-end'
              }
            >
              {visual}
            </div>
          </div>
        </div>
      </section>
    </SoftSkyStage>
  )
}

export function SoftPhoneFrame({
  src,
  alt,
  className = '',
}: {
  src: string
  alt: string
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-[1.75rem] border border-white shadow-[0_28px_50px_-18px_rgba(15,55,95,0.45)] ring-1 ring-sky-100/70 bg-white ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={720}
        height={1280}
        loading="lazy"
        className="w-full h-auto object-cover"
        sizes="240px"
      />
    </div>
  )
}

export function SoftPhotoCard({
  src,
  alt,
  className = '',
  rotate = '',
  sizes = '280px',
  width = 1280,
  height = 720,
}: {
  src: string
  alt: string
  className?: string
  rotate?: string
  sizes?: string
  width?: number
  height?: number
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white shadow-xl ring-1 ring-sky-100/80 bg-white ${rotate} ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="w-full h-auto object-cover"
        sizes={sizes}
      />
    </div>
  )
}
