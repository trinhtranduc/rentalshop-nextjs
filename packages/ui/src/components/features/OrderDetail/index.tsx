import React, { useState } from 'react';
import { TrendingUp, Package, DollarSign, User, MapPin, FileText } from 'lucide-react';
import { OrderDetailProps, SettingsForm } from './types';
import {
  OrderHeader,
  StatusBadges,
  CollapsibleSection,
  OrderOverview,
  OrderItems,
  OrderSettings,
  OrderSummary,
  OrderActions,
  NotesSection
} from './components';

export const OrderDetail: React.FC<OrderDetailProps> = ({
  order,
  onEdit,
  onCancel,
  onStatusChange,
  onPickup,
  onReturn,
  onSaveSettings,
  loading = false,
  showActions = true
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'items'])
  );
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    damageFee: order.damageFee || 0,
    bailAmount: order.bailAmount || 0,
    material: order.material || '',
    securityDeposit: order.securityDeposit || 0,
    collateralType: order.collateralType || '',
    collateralDetails: order.collateralDetails || '',
    notes: order.notes || ''
  });
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleSettingsChange = (updates: Partial<SettingsForm>) => {
    setSettingsForm(prev => ({ ...prev, ...updates }));
  };

  const handleSaveSettings = () => {
    if (onSaveSettings) {
      onSaveSettings(settingsForm);
    }
    setIsEditingSettings(false);
  };

  return (
    <div className="space-y-6">
      {/* Unified Header Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <OrderHeader
            order={order}
            showActions={showActions}
            onEdit={onEdit}
            onCancel={onCancel}
            loading={loading}
          />
          <div className="border-t border-gray-200 pt-4">
            <StatusBadges order={order} />
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column - Order Information */}
        <div className="xl:col-span-2 space-y-6">
          {/* Order Overview */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <CollapsibleSection
              title="Order Information"
              icon={TrendingUp}
              isExpanded={expandedSections.has('overview')}
              onToggle={() => toggleSection('overview')}
            >
              <div className="p-6">
                <OrderOverview order={order} />
              </div>
            </CollapsibleSection>
          </div>

          {/* Order Items */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <CollapsibleSection
              title="Products & Items"
              subtitle={`${order.orderItems.length} items`}
              icon={Package}
              isExpanded={expandedSections.has('items')}
              onToggle={() => toggleSection('items')}
            >
              <div className="p-6">
                <OrderItems order={order} />
              </div>
            </CollapsibleSection>
          </div>

          {/* Notes & Additional Info */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <CollapsibleSection
              title="Notes & Additional Information"
              icon={FileText}
              isExpanded={expandedSections.has('notes')}
              onToggle={() => toggleSection('notes')}
            >
              <div className="p-6">
                <NotesSection order={order} />
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {/* Right Column - Summary & Actions */}
        <div className="xl:col-span-1 space-y-6">
          {/* Order Summary */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <OrderSummary order={order} settingsForm={settingsForm} />
          </div>

          {/* Order Settings */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <OrderSettings
              order={order}
              settingsForm={settingsForm}
              isEditingSettings={isEditingSettings}
              loading={loading}
              onSettingsChange={handleSettingsChange}
              onSaveSettings={handleSaveSettings}
              onEditSettings={() => setIsEditingSettings(true)}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons - Bottom */}
      {showActions && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <OrderActions
            order={order}
            settingsForm={settingsForm}
            onCancel={onCancel}
            onPickup={onPickup}
            onReturn={onReturn}
          />
        </div>
      )}
    </div>
  );
};
