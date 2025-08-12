'use client'

import { TopNavigation } from '@rentalshop/ui'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function NavDemoPage() {
  const pathname = usePathname()
  const [notificationsCount, setNotificationsCount] = useState(3)
  const [cartItemsCount, setCartItemsCount] = useState(5)

  const handleSearch = (query: string) => {
    console.log('Search query:', query)
    alert(`Searching for: ${query}`)
  }

  const handleLogout = () => {
    console.log('Logout clicked')
    alert('Logout functionality would be implemented here')
  }

  const handleProfileClick = () => {
    console.log('Profile clicked')
    alert('Profile page would open here')
  }

  const addNotification = () => {
    setNotificationsCount(prev => prev + 1)
  }

  const addCartItem = () => {
    setCartItemsCount(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavigation
        variant="client"
        currentPage={pathname}
        notificationsCount={notificationsCount}
        cartItemsCount={cartItemsCount}
        onSearch={handleSearch}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Top Navigation Demo
          </h1>
          <p className="text-lg text-gray-600">
            This page demonstrates the modern, clean top navigation bar
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Features</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Modern, clean design
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Mobile responsive
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Integrated search bar
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Notification badges
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Cart items counter
              </li>
            </ul>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Interactive Demo</h2>
            <div className="space-y-4">
              <button
                onClick={addNotification}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Notification (+1)
              </button>
              <button
                onClick={addCartItem}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Cart Item (+1)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Navigation Items</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Dashboard</h3>
              <p className="text-sm text-gray-600">Overview & analytics</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Products</h3>
              <p className="text-sm text-gray-600">Manage inventory</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Customers</h3>
              <p className="text-sm text-gray-600">Customer database</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Orders</h3>
              <p className="text-sm text-gray-600">Rental orders</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900">Settings</h3>
              <p className="text-sm text-gray-600">App configuration</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
