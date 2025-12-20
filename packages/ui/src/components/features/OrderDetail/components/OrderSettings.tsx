"use client";

import React, { useState } from 'react';
import { Button, Input, Label, Textarea } from '@rentalshop/ui';
import { Save, X, Edit } from 'lucide-react';
import { SettingsForm } from '@rentalshop/types';
import { useOrderTranslations } from '@rentalshop/hooks';

interface OrderSettingsProps {
  order: any; // OrderData type was removed from imports, so using 'any' for now
  settingsForm: SettingsForm;
  isEditingSettings: boolean;
  loading: boolean;
  onSettingsChange: (updates: Partial<SettingsForm>) => void;
  onSaveSettings: () => void;
  onEditSettings: () => void;
}

const SettingsFormFields: React.FC<{
  settingsForm: SettingsForm;
  order: any; // OrderData type was removed from imports, so using 'any' for now
  onChange: (updates: Partial<SettingsForm>) => void;
}> = ({ settingsForm, order, onChange }) => {
  const t = useOrderTranslations();
  
  return (
  <>
    <div>
      <Label htmlFor="damageFee" className="text-sm font-medium text-gray-700">
        Damage Fee
      </Label>
      <Input
        id="damageFee"
        type="number"
        value={settingsForm.damageFee}
        onChange={(e) => onChange({ damageFee: Number(e.target.value) || 0 })}
        disabled={order.status !== 'PICKUP'}
        className="mt-1"
        min="0"
        step="1000"
      />
    </div>
    
    <div>
      <Label htmlFor="bailAmount" className="text-sm font-medium text-gray-700">
        Bail Amount
      </Label>
      <Input
        id="bailAmount"
        type="number"
        value={settingsForm.bailAmount}
        onChange={(e) => onChange({ bailAmount: Number(e.target.value) || 0 })}
        disabled={order.status !== 'RESERVED'}
        className="mt-1"
        min="0"
        step="1000"
      />
    </div>
    
    <div>
      <Label htmlFor="material" className="text-sm font-medium text-gray-700">
        Material
      </Label>
      <Input
        id="material"
        type="text"
        value={settingsForm.material}
        onChange={(e) => onChange({ material: e.target.value })}
        disabled={order.status === 'RETURNED' || order.status === 'CANCELLED'}
        className="mt-1"
        placeholder="Enter material"
      />
    </div>
    
    <div>
      <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
        Order Notes
      </Label>
      <Textarea
        id="notes"
        value={settingsForm.notes}
        onChange={(e) => onChange({ notes: e.target.value })}
        disabled={order.status === 'RETURNED' || order.status === 'CANCELLED'}
        className="mt-1"
        rows={3}
        placeholder={t('messages.enterOrderNotes')}
      />
    </div>
  </>
  );
};

const SettingsDisplay: React.FC<{ settingsForm: SettingsForm }> = ({ settingsForm }) => (
  <div className="space-y-3">
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Damage Fee:</span>
      <span className="text-sm font-medium">{settingsForm.damageFee}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Bail Amount:</span>
      <span className="text-sm font-medium">{settingsForm.bailAmount}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Material:</span>
      <span className="text-sm font-medium">{settingsForm.material || 'Not specified'}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-gray-600">Notes:</span>
      <span className="text-sm font-medium">{settingsForm.notes || 'No notes'}</span>
    </div>
  </div>
);

export const OrderSettings: React.FC<OrderSettingsProps> = ({
  order,
  settingsForm,
  isEditingSettings,
  loading,
  onSettingsChange,
  onSaveSettings,
  onEditSettings
}) => {
  // Only show settings for rental orders
  if (order.orderType !== 'RENT') {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">
          <p>Settings are only available for rental orders.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Order Settings</h3>
        {!isEditingSettings && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEditSettings}
            disabled={loading}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Content */}
      {isEditingSettings ? (
        <div className="space-y-4">
          <SettingsFormFields
            settingsForm={settingsForm}
            order={order}
            onChange={onSettingsChange}
          />
          <div className="flex space-x-2 pt-2">
            <Button
              variant="default"
              size="sm"
              onClick={onSaveSettings}
              disabled={loading}
            >
              Save
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditSettings()}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <SettingsDisplay settingsForm={settingsForm} />
      )}
    </div>
  );
};
