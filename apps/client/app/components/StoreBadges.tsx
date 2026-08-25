import React from 'react'

export const APP_STORE_URL = 'https://apps.apple.com/vn/app/anyrent/id6754793592'
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=anyrent.shop'

type BadgeTone = 'light' | 'dark'

type StoreBadgeProps = {
  tone?: BadgeTone
  className?: string
  fullWidth?: boolean
}

function BadgeShell({
  children,
  href,
  ariaLabel,
  tone,
  width,
  height,
  className,
  fullWidth,
  maxWidthClass,
}: {
  children: React.ReactNode
  href: string
  ariaLabel: string
  tone: BadgeTone
  width: number
  height: number
  className: string
  fullWidth: boolean
  maxWidthClass: string
}) {
  const isLight = tone === 'light'
  const fill = isLight ? '#ffffff' : '#000000'

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={`inline-flex transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gray-400 ${
        fullWidth ? 'w-full justify-center' : ''
      } ${className}`}
    >
      <svg
        role="img"
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        className={`h-11 w-auto drop-shadow-sm ${fullWidth ? maxWidthClass : ''}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={width} height={height} rx="8" fill={fill} />
        <rect
          x="0.5"
          y="0.5"
          width={width - 1}
          height={height - 1}
          rx="7.5"
          fill="none"
          stroke={isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.18)'}
        />
        {children}
      </svg>
    </a>
  )
}

/** Official-style App Store badge (Apple logo + Download on the App Store). */
export function AppStoreBadge({
  tone = 'dark',
  className = '',
  fullWidth = false,
}: StoreBadgeProps) {
  const text = tone === 'light' ? '#000000' : '#ffffff'

  return (
    <BadgeShell
      href={APP_STORE_URL}
      ariaLabel="Download on the App Store"
      tone={tone}
      width={120}
      height={40}
      className={className}
      fullWidth={fullWidth}
      maxWidthClass="max-w-[168px]"
    >
      <path
        fill={text}
        d="M24.6 12.1c1.1-1.4 1.9-3.3 1.7-5.2-1.6.1-3.6 1.1-4.8 2.5-1 1.2-1.9 3.1-1.7 4.9 1.8.1 3.6-.9 4.8-2.2zm4.1 9.7c-.1-3.1 2.5-4.6 2.6-4.7-1.4-2.1-3.7-2.4-4.5-2.4-1.9-.2-3.7 1.1-4.7 1.1s-2.5-1.1-4.1-1c-2.1.1-4.1 1.2-5.2 3.1-2.2 3.9-.6 9.6 1.6 12.7 1.1 1.6 2.4 3.3 4.1 3.2 1.6-.1 2.3-1.1 4.2-1.1 2 0 2.5 1.1 4.2 1 1.8-.1 2.9-1.5 4-3.1 1.2-1.8 1.7-3.6 1.7-3.7-.1 0-3.3-1.3-3.9-5.1z"
      />
      <text
        x="36"
        y="14"
        fill={text}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="6.5"
        fontWeight="400"
      >
        Download on the
      </text>
      <text
        x="36"
        y="27.5"
        fill={text}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="12.5"
        fontWeight="600"
      >
        App Store
      </text>
    </BadgeShell>
  )
}

/** Official-style Google Play badge. */
export function GooglePlayBadge({
  tone = 'dark',
  className = '',
  fullWidth = false,
}: StoreBadgeProps) {
  const text = tone === 'light' ? '#000000' : '#ffffff'

  return (
    <BadgeShell
      href={GOOGLE_PLAY_URL}
      ariaLabel="Get it on Google Play"
      tone={tone}
      width={135}
      height={40}
      className={className}
      fullWidth={fullWidth}
      maxWidthClass="max-w-[188px]"
    >
      {/* Play mark — blue / green / yellow / red wedges */}
      <g transform="translate(11.5, 8.5) scale(0.95)">
        <path fill="#00F076" d="M1.2.8 12.8 12 1.2 23.2V.8z" />
        <path fill="#FFD600" d="M1.2.8 12.8 12l4.5-2.6c.85-.5.85-1.3 0-1.8L1.2.8z" />
        <path fill="#FF3A44" d="M1.2 23.2 12.8 12l4.5 2.6c.85.5.85 1.3 0 1.8L1.2 23.2z" />
        <path fill="#00D2FF" d="M12.8 12 1.2.8v22.4L12.8 12z" opacity="0.35" />
        <path fill="#00D2FF" d="M17.3 9.4c.85.5.85 1.3 0 1.8L12.8 12 17.3 9.4z" />
      </g>
      <text
        x="36"
        y="14"
        fill={text}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="6.5"
        fontWeight="400"
        letterSpacing="0.5"
      >
        GET IT ON
      </text>
      <text
        x="36"
        y="27.5"
        fill={text}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        fontSize="12.5"
        fontWeight="600"
      >
        Google Play
      </text>
    </BadgeShell>
  )
}

type StoreBadgesProps = {
  tone?: BadgeTone
  className?: string
  /** Stack vertically (download card). */
  stacked?: boolean
}

/** App Store + Google Play badge pair for landing CTAs. */
export function StoreBadges({
  tone = 'dark',
  className = '',
  stacked = false,
}: StoreBadgesProps) {
  return (
    <div
      className={`${
        stacked
          ? 'flex flex-col items-center gap-3'
          : 'flex flex-col sm:flex-row items-center gap-3'
      } ${className}`}
    >
      <AppStoreBadge tone={tone} />
      <GooglePlayBadge tone={tone} />
    </div>
  )
}
