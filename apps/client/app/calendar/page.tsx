'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent
} from '@rentalshop/ui';
import { Calendar } from '@rentalshop/ui';
import { User, Phone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

// Import types from the Calendar feature
import { 
  CalendarData, 
  CalendarFilters as CalendarFiltersType,
  PickupOrder 
} from '../../../../packages/ui/src/components/features/Calendar/types';

export default function CalendarPage() {
  const { user, loading: authLoading, authenticated } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [pickupOrders, setPickupOrders] = useState<PickupOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    // Don't reset selectedDate - let it persist if it's still valid
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    // Don't reset selectedDate - let it persist if it's still valid
  };

  // Handle date click
  const handleDateClick = (date: Date | null) => {
    console.log('Date clicked:', date ? date.toDateString() : 'No date selected (closing sidebar)');
    setSelectedDate(date);
  };

  // Calculate total pickups for current month
  const totalPickups = pickupOrders.filter(order => {
    const orderDate = new Date(order.pickupPlanAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  }).length;

  // Calculate total returns for the current month
  const totalReturns = pickupOrders.filter(order => {
    const returnDate = new Date(order.returnPlanAt);
    return returnDate.getMonth() === currentMonth && returnDate.getFullYear() === currentYear;
  }).length;

  // Calendar data for the Calendar component
  const calendarData: CalendarData = {
    currentMonth,
    currentYear,
    selectedDate,
    totalPickups: pickupOrders.length,
    totalReturns,
    days: []
  };

  // Calendar filters
  const [filters, setFilters] = useState<CalendarFiltersType>({
    month: currentMonth,
    year: currentYear,
    status: 'CONFIRMED,ACTIVE',
    outlet: '',
    viewMode: 'both'
  });

  // Handle filters change
  const handleFiltersChange = (newFilters: CalendarFiltersType) => {
    setFilters(newFilters);
    // If month/year changed, update current date but preserve selected date if it's in the new month
    if (newFilters.month !== currentMonth || newFilters.year !== newFilters.year) {
      setCurrentDate(new Date(newFilters.year, newFilters.month, 1));
      
      // Only reset selectedDate if the selected date is not in the new month
      if (selectedDate) {
        const selectedMonth = selectedDate.getMonth();
        const selectedYear = selectedDate.getFullYear();
        if (selectedMonth !== newFilters.month || selectedYear !== newFilters.year) {
          setSelectedDate(null);
        }
      }
    }
  };

  // Fetch pickup orders for the current month
  const fetchPickupOrders = useCallback(async () => {
    // Don't fetch if user is not authenticated
    if (!authenticated) {
      setError('Please log in to view pickup orders');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Add a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        setError('Loading timeout - please try again');
        setLoading(false);
      }, 10000); // 10 second timeout
      
      const { authenticatedFetch } = await import('@rentalshop/utils');
      
      // Calculate start and end of month
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      // Build query parameters
      const params = new URLSearchParams({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
        orderType: 'RENT',
        limit: '100' // Get up to 100 orders for the month
      });

      // Add status filter - try with individual statuses first
      params.append('status', 'CONFIRMED');
      params.append('status', 'ACTIVE');

      const response = await authenticatedFetch(`/api/orders?${params}`);

      // Clear timeout since we got a response
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          const orders = data.data?.orders || [];
          setPickupOrders(orders);
          
          if (orders.length === 0) {
            setError('No pickup orders found for this month. This could mean:\n• No orders have been created yet\n• All orders are for different months\n• The API is not returning data properly');
          }
        } else {
          setError(data.error || 'Failed to fetch orders');
        }
      } else {
        const errorText = await response.text();
        setError(`HTTP ${response.status}: ${response.statusText || errorText}`);
      }
    } catch (error) {
      setError('Failed to fetch pickup orders. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear, authenticated]);

  // Fetch orders when month changes
  useEffect(() => {
    if (authenticated) {
      fetchPickupOrders();
    }
  }, [currentMonth, currentYear, authenticated]); // Remove fetchPickupOrders from dependencies to avoid infinite loop

  // Debug: Monitor selectedDate changes
  useEffect(() => {
    console.log('selectedDate changed to:', selectedDate?.toDateString());
  }, [selectedDate]);

  // Loading state
  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Pickup Calendar</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="space-y-6">
            {/* Calendar Component - Always Visible */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Pickup Calendar</h3>
              
              <Calendar
                data={calendarData}
                filters={filters}
                pickupOrders={pickupOrders}
                onFiltersChange={handleFiltersChange}
                onDateClick={handleDateClick}
                onPreviousMonth={goToPreviousMonth}
                onNextMonth={goToNextMonth}
              />
            </div>

            {/* Loading Message */}
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading pickup orders...</p>
              </div>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Auth loading state
  if (authLoading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Pickup Calendar</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="space-y-6">
            {/* Calendar Component - Always Visible */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Pickup Calendar</h3>
              
              <Calendar
                data={calendarData}
                filters={filters}
                pickupOrders={pickupOrders}
                onFiltersChange={handleFiltersChange}
                onDateClick={handleDateClick}
                onPreviousMonth={goToPreviousMonth}
                onNextMonth={goToNextMonth}
              />
            </div>

            {/* Auth Loading Message */}
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Checking authentication...</p>
              </div>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Not authenticated state - Show calendar with demo data
  if (!authenticated) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Pickup Calendar</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="space-y-6">
            {/* Calendar Component - Always Visible with Demo Data */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-4">Pickup Calendar</h3>
              
              <Calendar
                data={calendarData}
                filters={filters}
                pickupOrders={pickupOrders}
                onFiltersChange={handleFiltersChange}
                onDateClick={handleDateClick}
                onPreviousMonth={goToPreviousMonth}
                onNextMonth={goToNextMonth}
              />
            </div>

            {/* Authentication Required Message */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-yellow-800 mb-2">Authentication Required</h3>
                <p className="text-yellow-700 mb-4">Please log in to view real pickup orders and manage the calendar.</p>
                
                {/* Development Login Section */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="text-md font-medium text-blue-800 mb-2">🔧 Development Login</h4>
                    <p className="text-blue-700 mb-3 text-sm">Use these test credentials for development:</p>
                    <div className="text-left text-sm text-blue-700 mb-3">
                      <p><strong>Email:</strong> test@example.com</p>
                      <p><strong>Password:</strong> password123</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              email: 'test@example.com',
                              password: 'password123'
                            })
                          });
                          
                          if (response.ok) {
                            const data = await response.json();
                            if (data.success && data.data?.token) {
                              // Store the token and user data
                              localStorage.setItem('authToken', data.data.token);
                              localStorage.setItem('user', JSON.stringify(data.data.user));
                              // Refresh the page to trigger authentication check
                              window.location.reload();
                            }
                          }
                        } catch (error) {
                          console.error('Development login failed:', error);
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Quick Login (Dev)
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => window.location.href = '/login'}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  // Error state
  if (error) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Pickup Calendar</PageTitle>
        </PageHeader>
        <PageContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Calendar</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={fetchPickupOrders}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Pickup Calendar</PageTitle>
      </PageHeader>
      
      <PageContent>
        <div className="space-y-8">
          {/* Calendar Component - Always Visible */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">            
            <Calendar
              data={calendarData}
              filters={filters}
              pickupOrders={pickupOrders}
              onFiltersChange={handleFiltersChange}
              onDateClick={handleDateClick}
              onPreviousMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
            />
          </div>
        </div>
      </PageContent>
    </PageWrapper>
  );
}
