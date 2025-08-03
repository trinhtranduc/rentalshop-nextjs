'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminHomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to client login page
    router.push('http://localhost:3000/login')
  }, [router])

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-action-primary mx-auto mb-4"></div>
        <p className="text-text-secondary">Redirecting to login...</p>
      </div>
    </div>
  )
} 