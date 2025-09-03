import React, { useState } from 'react';
import { 
  SettingsManager,
  SettingsForm,
  SettingsDashboard
} from './index';

// Types
interface SettingsProps {
  userRole: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  merchantId?: string;
  outletId?: string;
  userId?: string;
  className?: string;
}

type ViewMode = 'dashboard' | 'manager' | 'form';
type SettingType = 'system' | 'merchant' | 'user';

export function Settings({ 
  userRole, 
  merchantId, 
  outletId, 
  userId, 
  className = '' 
}: SettingsProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [activeTab, setActiveTab] = useState<string>('system');
  const [formType, setFormType] = useState<SettingType>('system');
  const [editingSetting, setEditingSetting] = useState<any>(null);

  // Navigation handlers
  const handleNavigateToSettings = (tab: string) => {
    setActiveTab(tab);
    setViewMode('manager');
  };

  const handleCreateSetting = (type: SettingType) => {
    setFormType(type);
    setEditingSetting(null);
    setViewMode('form');
  };

  const handleEditSetting = (setting: any, type: SettingType) => {
    setFormType(type);
    setEditingSetting(setting);
    setViewMode('form');
  };

  const handleBackToManager = () => {
    setViewMode('manager');
    setEditingSetting(null);
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setActiveTab('system');
    setEditingSetting(null);
  };

  // Form submission handler
  const handleSaveSetting = async (data: any) => {
    // This would typically make an API call to save the setting
    console.log('Saving setting:', data);
    
    // For now, just go back to manager
    handleBackToManager();
  };

  // Render based on view mode
  const renderContent = () => {
    switch (viewMode) {
      case 'dashboard':
        return (
          <SettingsDashboard
            userRole={userRole}
            merchantId={merchantId}
            outletId={outletId}
            userId={userId}
            onNavigateToSettings={handleNavigateToSettings}
          />
        );

      case 'manager':
        return (
          <SettingsManager
            userRole={userRole}
            merchantId={merchantId}
            outletId={outletId}
            userId={userId}
            onCreateSetting={handleCreateSetting}
            onEditSetting={handleEditSetting}
            onBackToDashboard={handleBackToDashboard}
          />
        );

      case 'form':
        return (
          <SettingsForm
            settingType={formType}
            userRole={userRole}
            onSave={handleSaveSetting}
            onCancel={handleBackToManager}
            initialData={editingSetting}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={className}>
      {renderContent()}
    </div>
  );
}
