'use client'

import React from 'react'
import { Building2 } from 'lucide-react'

interface LogoProps {
  /** Size of the logo (default: md) */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'
  /** Variant: 'default' uses icon, 'custom' expects src, 'blue' shows logo on blue background */
  variant?: 'default' | 'custom' | 'blue'
  /** Custom image source (for PNG/SVG) */
  src?: string
  /** Show text label alongside logo */
  showLabel?: boolean
  /** Text to display (default: AnyRent) */
  labelText?: string
  /** Show background for icon variant (default: true) */
  showBackground?: boolean
  /** Add blue stroke/tone to the logo */
  blueStroke?: boolean
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
  '2xl': 'w-24 h-24',
  '3xl': 'w-32 h-32'
}

const iconSizes = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
  '2xl': 'w-16 h-16',
  '3xl': 'w-20 h-20'
}

const textSizes = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'default',
  src,
  showLabel = false,
  labelText = 'AnyRent',
  showBackground = true,
  blueStroke = false
}) => {
  const isBlueVariant = variant === 'blue'
  const containerClass = showBackground || isBlueVariant
    ? `${sizeClasses[size]} bg-gradient-to-br from-blue-700 to-blue-500 rounded-xl flex items-center justify-center shadow-lg p-4`
    : `${sizeClasses[size]} flex items-center justify-center`
  
  // Blue stroke filter - creates #0052CC blue tone
  // Use hue-rotate to achieve #0052CC color (blue)
  const blueFilter = blueStroke 
    ? 'brightness(0) saturate(100%) invert(17%) sepia(90%) saturate(5500%) hue-rotate(210deg) brightness(0.8) contrast(1.2)' 
    : undefined
  
  return (
    <div className={`flex items-center ${showLabel ? 'gap-3' : ''}`}>
      <div className={containerClass}>
        {variant === 'default' ? (
          <Building2 className={`${iconSizes[size]} text-white`} strokeWidth={2.5} />
        ) : variant === 'blue' && src ? (
          <img 
            src={src} 
            alt="AnyRent Logo" 
            className="w-full h-full object-contain"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
        ) : src ? (
          <img 
            src={src} 
            alt="AnyRent Logo" 
            className={`${iconSizes[size]} object-contain`}
            style={{ 
              objectFit: 'contain',
              filter: blueFilter
            }}
          />
        ) : (
          <Building2 className={`${iconSizes[size]} text-white`} strokeWidth={2.5} />
        )}
      </div>
      {showLabel && (
        <h1 className={`font-semibold text-gray-900 ${textSizes[size]}`}>
          {labelText}
        </h1>
      )}
    </div>
  )
}

export default Logo

