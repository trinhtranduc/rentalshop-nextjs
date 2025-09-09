import React from 'react';
import { 
  User, 
  UserCheck, 
  UserX, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  FileText,
  Building2
} from 'lucide-react';
import type { Customer, CustomerFilters } from '@rentalshop/types';
import { ENTITY_STATUS, getStatusColor, getStatusLabel } from '@rentalshop/constants';

/**
 * Get customer status badge configuration and component
 * @param isActive - Customer active status
 * @returns JSX element for status badge
 */
export const getCustomerStatusBadge = (isActive: boolean) => {
  const status = isActive ? ENTITY_STATUS.ACTIVE : ENTITY_STATUS.INACTIVE;
  const colorClass = getStatusColor(status, 'entity');
  const label = getStatusLabel(status, 'entity');
  const Icon = isActive ? UserCheck : UserX;
  
  const statusConfig = {
    true: { color: colorClass, icon: UserCheck, text: label },
    false: { color: colorClass, icon: UserX, text: label }
  };
  
  const config = statusConfig[isActive.toString() as keyof typeof statusConfig];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

/**
 * Get customer location badge configuration and component
 * @param city - Customer city
 * @param state - Customer state
 * @returns JSX element for location badge
 */
export const getCustomerLocationBadge = (city?: string, state?: string) => {
  if (!city && !state) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <MapPin className="w-3 h-3 mr-1" />
        No Location
      </span>
    );
  }
  
  const location = [city, state].filter(Boolean).join(', ');
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      <MapPin className="w-3 h-3 mr-1" />
      {location}
    </span>
  );
};

/**
 * Get customer ID type badge configuration and component
 * @param idType - Customer ID type
 * @returns JSX element for ID type badge
 */
export const getCustomerIdTypeBadge = (idType?: string) => {
  if (!idType) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <FileText className="w-3 h-3 mr-1" />
        No ID
      </span>
    );
  }
  
  const idTypeConfig = {
    'passport': { color: 'bg-purple-100 text-purple-800', text: 'Passport' },
    'drivers_license': { color: 'bg-blue-100 text-blue-800', text: 'Driver License' },
    'national_id': { color: 'bg-green-100 text-green-800', text: 'National ID' },
    'other': { color: 'bg-gray-100 text-gray-800', text: 'Other' }
  };
  
  const config = idTypeConfig[idType as keyof typeof idTypeConfig] || idTypeConfig.other;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <FileText className="w-3 h-3 mr-1" />
      {config.text}
    </span>
  );
};

/**
 * Calculate customer statistics from customer array
 * @param customers - Array of customers
 * @returns Object with calculated statistics
 */
export const calculateCustomerStats = (customers: Customer[]) => {
  const customersArray = customers || [];
  const totalCustomers = customersArray.length;
  const activeCustomers = customersArray.filter(c => c.isActive).length;
  const inactiveCustomers = customersArray.filter(c => !c.isActive).length;
  const customersWithEmail = customersArray.filter(c => c.email && c.email.trim() !== '').length;
  const customersWithAddress = customersArray.filter(c => c.address && c.address.trim() !== '').length;
  
  // Group by location
  const locationStats = customersArray.reduce((acc, customer) => {
    const key = `${customer.city || 'Unknown'}, ${customer.state || 'Unknown'}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topLocation = Object.entries(locationStats).reduce((max, [location, count]) => 
    count > max.count ? { location, count } : max, 
    { location: 'None', count: 0 }
  );
  
  return { 
    totalCustomers, 
    activeCustomers, 
    inactiveCustomers, 
    customersWithEmail,
    customersWithAddress,
    topLocation: topLocation.location,
    topLocationCount: topLocation.count
  };
};

/**
 * Filter customers based on search term and filters
 * @param customers - Array of customers to filter
 * @param searchTerm - Search term for name, email, phone
 * @param filters - Customer filters object
 * @returns Filtered array of customers
 */
export const filterCustomers = (
  customers: Customer[], 
  searchTerm: string, 
  filters: CustomerFilters
): Customer[] => {
  return (customers || []).filter(customer => {
    // Safety check to ensure customer object has required properties
    if (!customer || typeof customer !== 'object') {
      return false;
    }
    
    const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.address || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCity = !filters.city || (customer.city || '').toLowerCase().includes(filters.city.toLowerCase());
    const matchesState = !filters.state || (customer.state || '').toLowerCase().includes(filters.state.toLowerCase());
    const matchesCountry = !filters.country || (customer.country || '').toLowerCase().includes(filters.country.toLowerCase());
    const matchesIdType = !filters.idType || customer.idType === filters.idType;
    const matchesActive = filters.isActive === undefined || customer.isActive === filters.isActive;
    const matchesMerchant = !filters.merchantId || customer.merchantId === filters.merchantId;
    const matchesOutlet = !filters.outletId || customer.outletId === filters.outletId;
    
    return matchesSearch && matchesCity && matchesState && matchesCountry && 
           matchesIdType && matchesActive && matchesMerchant && matchesOutlet;
  });
};

/**
 * Get customer's full name
 * @param customer - Customer object
 * @returns Full name string
 */
export const getCustomerFullName = (customer: Customer): string => {
  return `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
};

/**
 * Get customer's display address
 * @param customer - Customer object
 * @returns Formatted address string
 */
export const getCustomerAddress = (customer: Customer): string => {
  const parts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zipCode,
    customer.country
  ].filter(Boolean);
  
  return parts.join(', ') || 'No address provided';
};

/**
 * Get customer's contact info
 * @param customer - Customer object
 * @returns Object with contact information
 */
export const getCustomerContactInfo = (customer: Customer) => {
  return {
    email: customer.email || 'No email',
    phone: customer.phone || 'No phone',
    hasEmail: !!(customer.email && customer.email.trim() !== ''),
    hasPhone: !!(customer.phone && customer.phone.trim() !== ''),
    hasAddress: !!(customer.address && customer.address.trim() !== '')
  };
};

/**
 * Format customer for display in tables/cards
 * @param customer - Customer object
 * @returns Formatted customer object with display properties
 */
export const formatCustomerForDisplay = (customer: Customer) => {
  return {
    ...customer,
    fullName: getCustomerFullName(customer),
    displayAddress: getCustomerAddress(customer),
    contactInfo: getCustomerContactInfo(customer),
    statusBadge: getCustomerStatusBadge(customer.isActive),
    locationBadge: getCustomerLocationBadge(customer.city, customer.state),
    idTypeBadge: getCustomerIdTypeBadge(customer.idType)
  };
};

/**
 * Validate customer data
 * @param customer - Customer object to validate
 * @returns Object with validation results
 */
export const validateCustomer = (customer: Partial<Customer>) => {
  const errors: string[] = [];
  
  if (!customer.firstName || customer.firstName.trim() === '') {
    errors.push('First name is required');
  }
  
  if (!customer.lastName || customer.lastName.trim() === '') {
    errors.push('Last name is required');
  }
  
  if (!customer.phone || customer.phone.trim() === '') {
    errors.push('Phone number is required');
  }
  
  if (customer.email && customer.email.trim() !== '') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer.email)) {
      errors.push('Invalid email format');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get customer age from date of birth
 * @param dateOfBirth - Date of birth string or Date
 * @returns Age in years or null if invalid
 */
export const getCustomerAge = (dateOfBirth?: string | Date): number | null => {
  if (!dateOfBirth) return null;
  
  try {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age >= 0 ? age : null;
  } catch {
    return null;
  }
};
