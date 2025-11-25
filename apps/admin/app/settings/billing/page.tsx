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
import { useSettingsTranslations } from '@rentalshop/hooks';
import type { BillingInterval } from '@rentalshop/utils';

// Extended billing configuration (following Stripe's modern practices)
interface ExtendedBillingInterval extends BillingInterval {
  discountPercentage: number;
}

const DEFAULT_BILLING_INTERVALS: ExtendedBillingInterval[] = [
  { id: 'month', name: 'Monthly', duration: 1, unit: 'months', discountPercentage: 0, isActive: true },
  { id: 'quarter', name: 'Quarterly', duration: 3, unit: 'months', discountPercentage: 0, isActive: true },
  { id: '6months', name: '6 Months', duration: 6, unit: 'months', discountPercentage: 5, isActive: true },
  { id: 'year', name: 'Yearly', duration: 12, unit: 'months', discountPercentage: 10, isActive: true }
];

export default function BillingSettingsPage() {
  const t = useSettingsTranslations();
  const [billingIntervals, setBillingIntervals] = useState<ExtendedBillingInterval[]>(DEFAULT_BILLING_INTERVALS);
  const [editingInterval, setEditingInterval] = useState<ExtendedBillingInterval | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEditInterval = (interval: ExtendedBillingInterval) => {
    setEditingInterval({ ...interval });
    setShowEditDialog(true);
  };

  const handleAddInterval = () => {
    setEditingInterval({
      id: '',
      name: '',
      duration: 1,
      unit: 'months',
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
      const { settingsApi } = await import('@rentalshop/utils');
      
      // Convert ExtendedBillingInterval to BillingInterval for API
      const apiIntervals = billingIntervals.map(interval => ({
        id: interval.id,
        name: interval.name,
        duration: interval.duration,
        unit: interval.unit,
        isActive: interval.isActive
      }));
      
      const result = await settingsApi.updateBillingIntervals(apiIntervals);
      
      if (result.success) {
        alert(t('billing.messages.saveSuccess'));
      } else {
        alert(`${t('billing.messages.saveFailed')}: ${result.error || t('billing.messages.saveFailed')}`);
      }
    } catch (error) {
      console.error('Error saving billing config:', error);
      alert(t('billing.messages.saveError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>{t('billing.title')}</PageTitle>
      </PageHeader>
      
      <PageContent>
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                {t('billing.modernSubscription')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                {t('billing.modernSubscriptionDesc')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">{t('billing.examples.monthly')}</h4>
                  <p className="text-blue-700">{t('billing.examples.monthlyDesc')}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">{t('billing.examples.quarterly')}</h4>
                  <p className="text-green-700">{t('billing.examples.quarterlyDesc')}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">{t('billing.examples.yearly')}</h4>
                  <p className="text-purple-700">{t('billing.examples.yearlyDesc')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Intervals Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('billing.intervals.title')}</CardTitle>
                <Button onClick={handleAddInterval} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('billing.intervals.addInterval')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('billing.intervals.name')}</TableHead>
                    <TableHead>{t('billing.intervals.months')}</TableHead>
                    <TableHead>{t('billing.intervals.discount')}</TableHead>
                    <TableHead>{t('billing.intervals.status')}</TableHead>
                    <TableHead>{t('billing.intervals.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingIntervals.map((interval) => (
                    <TableRow key={interval.id}>
                      <TableCell className="font-medium">{interval.name}</TableCell>
                      <TableCell>{interval.duration}</TableCell>
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
              className="bg-blue-700 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? t('billing.intervals.saving') : t('billing.intervals.saveConfiguration')}
            </Button>
          </div>

          {/* Edit Dialog */}
          {showEditDialog && editingInterval && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">
                  {editingInterval.id ? t('billing.intervals.editInterval') : t('billing.intervals.addNewInterval')}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="intervalName">{t('billing.intervals.name')}</Label>
                    <Input
                      id="intervalName"
                      value={editingInterval.name}
                      onChange={(e) => setEditingInterval({
                        ...editingInterval,
                        name: e.target.value
                      })}
                      placeholder={t('billing.intervals.namePlaceholder')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="intervalMonths">{t('billing.intervals.months')}</Label>
                    <Input
                      id="intervalMonths"
                      type="number"
                      min="1"
                      max="12"
                      value={editingInterval.duration}
                      onChange={(e) => setEditingInterval({
                        ...editingInterval,
                        duration: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="intervalDiscount">{t('billing.intervals.discount')}</Label>
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
                    <Label htmlFor="intervalActive">{t('billing.intervals.active')}</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                  >
                    {t('billing.intervals.cancel')}
                  </Button>
                  <Button onClick={handleSaveInterval}>
                    {editingInterval.id ? t('billing.intervals.update') : t('billing.intervals.add')} {t('billing.intervals.title')}
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