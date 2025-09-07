import React, { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  AlertCircle,
  Edit,
  Save,
  X,
  Plus
} from '../../../ui';
import type { BillingInterval, BillingConfig } from '@rentalshop/constants';

interface BillingConfigProps {
  config?: BillingConfig;
  onSave?: (config: BillingConfig) => void;
  loading?: boolean;
}

export function BillingConfigComponent({ 
  config, 
  onSave, 
  loading = false 
}: BillingConfigProps) {
  const [billingConfig, setBillingConfig] = useState<BillingConfig>(config || {
    intervals: [],
    defaultInterval: 'month',
    maxDiscountPercentage: 50,
    minDiscountPercentage: 0
  });
  
  const [editingInterval, setEditingInterval] = useState<BillingInterval | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (config) {
      setBillingConfig(config);
    }
  }, [config]);

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
      description: '',
      isActive: true
    });
    setShowEditDialog(true);
  };

  const handleSaveInterval = () => {
    if (!editingInterval) return;

    const updatedIntervals = editingInterval.id 
      ? billingConfig.intervals.map(interval => 
          interval.id === editingInterval.id ? editingInterval : interval
        )
      : [...billingConfig.intervals, { ...editingInterval, id: `interval_${Date.now()}` }];

    setBillingConfig({
      ...billingConfig,
      intervals: updatedIntervals
    });
    
    setShowEditDialog(false);
    setEditingInterval(null);
  };

  const handleDeleteInterval = (intervalId: string) => {
    setBillingConfig({
      ...billingConfig,
      intervals: billingConfig.intervals.filter(interval => interval.id !== intervalId)
    });
  };

  const handleSaveConfig = async () => {
    setIsSubmitting(true);
    try {
      await onSave?.(billingConfig);
    } catch (error) {
      console.error('Error saving billing config:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = (intervalId: string) => {
    setBillingConfig({
      ...billingConfig,
      intervals: billingConfig.intervals.map(interval =>
        interval.id === intervalId 
          ? { ...interval, isActive: !interval.isActive }
          : interval
      )
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Billing Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="maxDiscount">Max Discount %</Label>
              <Input
                id="maxDiscount"
                type="number"
                min="0"
                max="100"
                value={billingConfig.maxDiscountPercentage}
                onChange={(e) => setBillingConfig({
                  ...billingConfig,
                  maxDiscountPercentage: parseInt(e.target.value) || 0
                })}
              />
            </div>
            <div>
              <Label htmlFor="minDiscount">Min Discount %</Label>
              <Input
                id="minDiscount"
                type="number"
                min="0"
                max="100"
                value={billingConfig.minDiscountPercentage}
                onChange={(e) => setBillingConfig({
                  ...billingConfig,
                  minDiscountPercentage: parseInt(e.target.value) || 0
                })}
              />
            </div>
            <div>
              <Label htmlFor="defaultInterval">Default Interval</Label>
              <select
                id="defaultInterval"
                value={billingConfig.defaultInterval}
                onChange={(e) => setBillingConfig({
                  ...billingConfig,
                  defaultInterval: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {billingConfig.intervals.map(interval => (
                  <option key={interval.id} value={interval.id}>
                    {interval.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Billing Intervals Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Billing Intervals</h3>
              <Button onClick={handleAddInterval} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Interval
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Months</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingConfig.intervals.map((interval) => (
                  <TableRow key={interval.id}>
                    <TableCell className="font-medium">{interval.name}</TableCell>
                    <TableCell>{interval.months}</TableCell>
                    <TableCell>
                      <Badge variant={interval.discountPercentage > 0 ? 'success' : 'secondary'}>
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
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={handleSaveConfig} 
              disabled={isSubmitting || loading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Interval Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingInterval?.id ? 'Edit Billing Interval' : 'Add Billing Interval'}
            </DialogTitle>
            <DialogDescription>
              Configure the billing interval details and discount percentage.
            </DialogDescription>
          </DialogHeader>

          {editingInterval && (
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

              <div>
                <Label htmlFor="intervalDescription">Description</Label>
                <Input
                  id="intervalDescription"
                  value={editingInterval.description}
                  onChange={(e) => setEditingInterval({
                    ...editingInterval,
                    description: e.target.value
                  })}
                  placeholder="Optional description"
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
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveInterval}>
              {editingInterval?.id ? 'Update' : 'Add'} Interval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
