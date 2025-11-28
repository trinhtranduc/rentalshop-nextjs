'use client'

import React from 'react'

/**
 * PageLoadingIndicator - DISABLED for instant page switching
 * 
 * User requirement: When clicking left menu, page should switch immediately
 * without showing loading indicator. This component is now disabled to allow
 * instant page transitions.
 */
export default function PageLoadingIndicator() {
  // Always return null - no loading indicator shown
  // This allows pages to switch immediately when clicking menu items
  return null
}
