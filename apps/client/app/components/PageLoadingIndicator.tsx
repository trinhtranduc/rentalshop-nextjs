'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'

export default function PageLoadingIndicator() {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Show loading indicator when navigation is pending
  if (!isPending) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Top loading bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
        <div className="h-full bg-white/20 animate-pulse"></div>
      </div>
      
      {/* Loading overlay for content area */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
            <span>Loading {pathname === '/' ? 'Dashboard' : pathname.slice(1).charAt(0).toUpperCase() + pathname.slice(2)}...</span>
          </div>
        </div>
      </div>
    </div>
  )
}
