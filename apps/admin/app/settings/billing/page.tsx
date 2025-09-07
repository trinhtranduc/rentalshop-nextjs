'use client';

import React, { useState } from 'react';
import { PageWrapper, PageHeader, PageTitle, PageContent } from '@rentalshop/ui';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Button, 
  Input, 
  Label, 
  Switch,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@rentalshop/ui';
import { AlertCircle, Edit, Save, Plus, X } from 'lucide-react';

// Simple billing configuration (following Stripe's modern practices)
interface BillingInterval {
  id: string;
  name: string;
  months: number;
  discountPercentage: number;
  isActive: boolean;
}

const DEFAULT_BILLING_INTERVALS: BillingInterval[] = [
  { id: 'month', name: 'Monthly', months: 1, discountPercentage: 0, isActive: true },
  { id: 'quarter', name: 'Quarterly', months: 3, discountPercentage: 5, isActive: true },
  { id: '6months', name: '6 Months', months: 6, discountPercentage: 10, isActive: true },
  { id: 'year', name: 'Yearly', months: 12, discountPercentage: 20, isActive: true }
];

export default function BillingSettingsPage() {
  const [billingIntervals, setBillingIntervals] = useState<BillingInterval[]>(DEFAULT_BILLING_INTERVALS);
  const [editingInterval, setEditingInterval] = useState<BillingInterval | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditInterval = (interval: BillingInterval) => {
    setEditingInterval({ ...interval });
    setShowEditDialog(true);
  };

  const handleAddInterval = () => {
    setEditingInterval({
      id: '',
      name: '',
      months: 1,
      discountPercentage: 0,
      isActive: true
    });
    setShowEditDialog(true);
  };

  const handleSaveInterval = () => {
    if (!editingInterval) return;

    const updatedIntervals = editingInterval.id 
      ? billingIntervals.map(interval => 
          interval.id === editingInterval.id ? editingInterval : interval
        )
      : [...billingIntervals, { ...editingInterval, id: `interval_${Date.now()}` }];

    setBillingIntervals(updatedIntervals);
    setShowEditDialog(false);
    setEditingInterval(null);
  };

  const handleDeleteInterval = (intervalId: string) => {
    setBillingIntervals(billingIntervals.filter(interval => interval.id !== intervalId));
  };

  const handleToggleActive = (intervalId: string) => {
    setBillingIntervals(billingIntervals.map(interval =>
      interval.id === intervalId 
        ? { ...interval, isActive: !interval.isActive }
        : interval
    ));
  };

  const handleSaveConfig = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/settings/billing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intervals: billingIntervals }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Billing configuration saved successfully!');
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error saving billing config:', error);
      alert('Error saving billing configuration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Billing Configuration</PageTitle>
      </PageHeader>
      
      <PageContent>
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                Modern Subscription Billing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Configure billing intervals and discount percentages following Stripe's modern subscription practices.
                Longer commitments typically receive higher discounts to encourage customer retention.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Monthly</h4>
                  <p className="text-blue-700">0% discount - Standard pricing</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Quarterly</h4>
                  <p className="text-green-700">5% discount - Good for retention</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">Yearly</h4>
                  <p className="text-purple-700">20% discount - Best value</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Intervals Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Billing Intervals</CardTitle>
                <Button onClick={handleAddInterval} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Interval
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Months</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingIntervals.map((interval) => (
                    <TableRow key={interval.id}>
                      <TableCell className="font-medium">{interval.name}</TableCell>
                      <TableCell>{interval.months}</TableCell>
                      <TableCell>
                        <Badge variant={interval.discountPercentage > 0 ? 'default' : 'secondary'}>
                          {interval.discountPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={interval.isActive}
                          onCheckedChange={() => handleToggleActive(interval.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditInterval(interval)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInterval(interval.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveConfig} 
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>

          {/* Edit Dialog */}
          {showEditDialog && editingInterval && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">
                  {editingInterval.id ? 'Edit Billing Interval' : 'Add Billing Interval'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="intervalName">Name</Label>
                    <Input
                      id="intervalName"
                      value={editingInterval.name}
                      onChange={(e) => setEditingInterval({
                        ...editingInterval,
                        name: e.target.value
                      })}
                      placeholder="e.g., Monthly, Quarterly"
                    />
                  </div>

                  <div>
                    <Label htmlFor="intervalMonths">Months</Label>
                    <Input
                      id="intervalMonths"
                      type="number"
                      min="1"
                      max="12"
                      value={editingInterval.months}
                      onChange={(e) => setEditingInterval({
                        ...editingInterval,
                        months: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="intervalDiscount">Discount Percentage</Label>
                    <Input
                      id="intervalDiscount"
                      type="number"
                      min="0"
                      max="100"
                      value={editingInterval.discountPercentage}
                      onChange={(e) => setEditingInterval({
                        ...editingInterval,
                        discountPercentage: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="intervalActive"
                      checked={editingInterval.isActive}
                      onCheckedChange={(checked) => setEditingInterval({
                        ...editingInterval,
                        isActive: checked
                      })}
                    />
                    <Label htmlFor="intervalActive">Active</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveInterval}>
                    {editingInterval.id ? 'Update' : 'Add'} Interval
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </PageWrapper>
  );
}