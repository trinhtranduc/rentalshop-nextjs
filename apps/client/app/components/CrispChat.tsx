'use client'

import { useEffect } from 'react'

/** Public Website ID from Crisp (client.crisp.chat). Not a secret. */
const CRISP_WEBSITE_ID = 'dcc97356-d416-4ce0-a683-f00f2ac5289e'

declare global {
  interface Window {
    $crisp?: unknown[]
    CRISP_WEBSITE_ID?: string
  }
}

/**
 * Loads the Crisp chatbox on public pages only (via PublicSiteFooter).
 * Do not mount inside the logged-in shop shell.
 */
export function CrispChat() {
  useEffect(() => {
    if (window.CRISP_WEBSITE_ID) {
      return
    }
    window.$crisp = window.$crisp || []
    window.CRISP_WEBSITE_ID = CRISP_WEBSITE_ID
    const script = document.createElement('script')
    script.src = 'https://client.crisp.chat/l.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  return null
}
