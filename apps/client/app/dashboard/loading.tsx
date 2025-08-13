import React from 'react'
import { CardClean, CardHeaderClean, CardTitleClean, CardContentClean } from '@rentalshop/ui'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardClean key={i}>
            <CardContentClean className="p-6">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContentClean>
          </CardClean>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardClean>
          <CardHeaderClean>
            <CardTitleClean>Revenue Chart</CardTitleClean>
          </CardHeaderClean>
          <CardContentClean>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContentClean>
        </CardClean>

        <CardClean>
          <CardHeaderClean>
            <CardTitleClean>Orders Chart</CardTitleClean>
          </CardHeaderClean>
          <CardContentClean>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContentClean>
        </CardClean>
      </div>

      {/* Recent Orders */}
      <CardClean>
        <CardHeaderClean>
          <CardTitleClean>Recent Orders</CardTitleClean>
        </CardHeaderClean>
        <CardContentClean>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </CardContentClean>
      </CardClean>
    </div>
  )
}
