'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button, Sidebar } from '@rentalshop/ui'

interface LayoutProps {
  variant?: 'client' | 'admin'
  currentPage?: string
  children: React.ReactNode
}

export function Layout({ variant = 'client', currentPage, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sidebar */}
      <Sidebar
        user={null}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onLogout={() => {}}
        currentPath={currentPage || ''}
      />
      
      {/* Main content */}
      <div className="md:ml-64">
        {/* Top bar */}
        <div className="bg-bg-card shadow-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden mr-2"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="text-lg font-semibold text-text-primary">
                {variant === 'admin' ? 'Admin Panel' : 'Rental Shop'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* Add notifications, user menu, etc. here */}
            </div>
          </div>
        </div>
        
        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
} 