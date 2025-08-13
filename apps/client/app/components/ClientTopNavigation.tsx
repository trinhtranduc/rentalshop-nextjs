'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import ServerTopNavigation from './ServerTopNavigation'

export default function ClientTopNavigation() {
  const pathname = usePathname()

  return <ServerTopNavigation currentPage={pathname} />
}
