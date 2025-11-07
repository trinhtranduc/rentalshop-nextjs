'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@rentalshop/ui/base'
import { Sidebar } from './sidebar'

interface LayoutProps {
  variant?: 'client' | 'admin'
  currentPage?: string
  children: React.ReactNode
  user?: any
  onLogout?: () => void
  hideSidebar?: boolean
  allowCollapse?: boolean
}

export function Layout({ 
  variant = 'client', 
  currentPage, 
  children, 
  user, 
  onLogout = () => {},
  hideSidebar = false,
  allowCollapse = true
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleCollapseToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sidebar */}
      {!hideSidebar && (
        <Sidebar
          user={user}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onLogout={onLogout}
          currentPath={currentPage || ''}
          isCollapsed={sidebarCollapsed}
          onCollapseToggle={allowCollapse ? handleCollapseToggle : undefined}
        />
      )}
      
      {/* Main content */}
      <div className={`${!hideSidebar ? 'transition-all duration-300 ease-in-out' : ''}`} 
           style={{ marginLeft: hideSidebar ? '0' : sidebarCollapsed ? '4rem' : '16rem' }}>
        {/* Top bar */}
        <div className="bg-bg-card shadow-sm border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              {!hideSidebar && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden mr-2"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              )}
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