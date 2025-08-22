'use client'

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import type { CustomerWithMerchant } from '@rentalshop/database';
import type { Customer } from '@rentalshop/types';

// Union type to handle both local and database customer types
type CustomerData = Customer | CustomerWithMerchant;

interface CustomerInfoCardProps {
  customer?: CustomerData | null;
  onEdit?: () => void;
  onViewOrders?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
  isLoading?: boolean;
}

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({ 
  customer,
  onEdit,
  onViewOrders,
  onDelete,
  showActions = true,
  isLoading = false
}) => {
  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatAddress = () => {
    if (!customer) return 'No address provided';
    
    const parts = [
      customer.address,
      customer.city,
      customer.state,
      customer.zipCode,
      customer.country
    ].filter(Boolean);
    
    return parts.length > 0 ? parts.join(', ') : 'No address provided';
  };

  // Show loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if no customer data
  if (!customer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No customer data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Customer Information
          </CardTitle>
          
          {/* Action Buttons */}
          {showActions && (
            <div className="flex items-center space-x-2">
              {onEdit && (
                <Button
                  onClick={onEdit}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </Button>
              )}
              
              {onViewOrders && (
                <Button
                  onClick={onViewOrders}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Orders</span>
                </Button>
              )}
              
              {onDelete && (
                <Button
                  onClick={onDelete}
                  variant="destructive"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 border-b pb-2">Personal Details</h4>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  <p className="text-base text-gray-900">{customer.firstName} {customer.lastName}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-base text-gray-900">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-base text-gray-900">{customer.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Address and Account Information */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-700 border-b pb-2">Location & Account</h4>
            
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-base text-gray-900">{formatAddress()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="text-base text-gray-900">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
