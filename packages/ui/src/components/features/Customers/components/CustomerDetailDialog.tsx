'use client'

import React from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Card, CardContent } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { User, UserX, Building, Calendar, Phone, Mail, Home, FileText } from 'lucide-react';
import type { CustomerWithMerchant } from '@rentalshop/types';

interface CustomerDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerWithMerchant | null;
}

export const CustomerDetailDialog: React.FC<CustomerDetailDialogProps> = ({
  open,
  onOpenChange,
  customer
}) => {
  if (!customer) return null;

  const formatDate = (date: Date | string) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadgeStyle = (isActive: boolean) => {
    if (isActive) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800';
    } else {
      return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    }
  };

  const getStatusDisplayName = (isActive: boolean) => {
    return isActive ? 'Active' : 'Inactive';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div>
            <DialogTitle className="text-xl font-semibold">
              Customer Details
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 mt-1">
              View customer information and details
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Customer Overview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                Customer Overview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <p className="text-gray-900 text-base font-medium">{`${customer.firstName} ${customer.lastName}`}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <p className="text-gray-900 text-base">{customer.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <p className="text-gray-900 text-base">{customer.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                  <p className="text-gray-900 text-base">
                    {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : 'Not provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeStyle(customer.isActive)}`}>
                    {getStatusDisplayName(customer.isActive)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer ID</label>
                  <p className="text-gray-500 text-sm font-mono">{customer.id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Member Since</label>
                  <p className="text-gray-900 text-base">{formatDate(customer.createdAt)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Updated</label>
                  <p className="text-gray-900 text-base">{formatDate(customer.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                  <p className="text-gray-900 text-base">
                    {customer.address || 'No address provided'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <p className="text-gray-900 text-base">
                    {customer.city || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                  <p className="text-gray-900 text-base">
                    {customer.state || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                  <p className="text-gray-900 text-base">
                    {customer.zipCode || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <p className="text-gray-900 text-base">
                    {customer.country || 'Not specified'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                Additional Information
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <p className="text-gray-900 text-base">
                    {customer.notes || 'No notes available'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Merchant Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                Merchant Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Merchant Name</label>
                  <p className="text-gray-900 text-base font-medium">
                    {customer.merchant?.name || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Merchant ID</label>
                  <p className="text-gray-500 text-sm font-mono">
                    {customer.merchant?.id || 'Not specified'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Actions */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                Customer Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Account Management</h4>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled
                  >
                    <User className="mr-2 h-4 w-4" />
                    Edit Customer
                  </Button>
                  <p className="text-xs text-gray-500">
                    Modify customer information and details
                  </p>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Account Status</h4>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-orange-600 border-orange-200 hover:bg-orange-50"
                    disabled
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Deactivate Account
                  </Button>
                  <p className="text-xs text-gray-500">
                    Deactivate customer account if needed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
