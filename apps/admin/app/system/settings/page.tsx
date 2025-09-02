'use client';

import React, { useState, useEffect } from 'react';
import { 
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { 
  SettingsLayout,
  SettingsForm,
  SystemStatus
} from '@rentalshop/ui';
import { 
  settingsTabs,
  generalSettingsFields,
  securitySettingsFields,
  emailSettingsFields,
  notificationSettingsFields,
  systemSettingsFields
} from '@rentalshop/ui';
import { 
  Settings, 
  Database, 
  CheckCircle,
  Mail
} from 'lucide-react';

interface SystemSettings {
  // General Settings
  siteName: string;
  siteDescription: string;
  defaultLanguage: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  
  // Security Settings
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
  requireTwoFactor: boolean;
  allowRegistration: boolean;
  
  // Email Settings
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  
  // Notification Settings
  emailNotifications: boolean;
  systemAlerts: boolean;
  maintenanceMode: boolean;
  
  // System Settings
  maxFileSize: number;
  allowedFileTypes: string[];
  backupFrequency: string;
  logRetentionDays: number;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'Rental Shop Platform',
    siteDescription: 'Multi-tenant rental shop management platform',
    defaultLanguage: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireTwoFactor: false,
    allowRegistration: true,
    smtpHost: '',
    smtpPort: 587,
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: 'noreply@rentalshop.com',
    fromName: 'Rental Shop',
    emailNotifications: true,
    systemAlerts: true,
    maintenanceMode: false,
    maxFileSize: 10,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    backupFrequency: 'daily',
    logRetentionDays: 30
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const { addToast } = useToasts();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching settings:', error);
      addToast('error', 'Error', 'Failed to fetch system settings');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast('success', 'Settings Saved', 'System settings have been updated successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      addToast('error', 'Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all settings to default values?')) {
      fetchSettings();
      addToast('info', 'Settings Reset', 'Settings have been reset to default values');
    }
  };

  const handleTestEmail = async () => {
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToast('success', 'Email Test', 'Test email sent successfully');
    } catch (error) {
      console.error('Error testing email:', error);
      addToast('error', 'Error', 'Failed to send test email');
    }
  };

  const systemStats = [
    {
      label: 'System Status',
      value: 'Healthy',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      status: 'healthy' as const
    },
    {
      label: 'Active Users',
      value: '1,234',
      icon: Settings,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      label: 'Storage Used',
      value: '2.4 GB',
      icon: Database,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      label: 'Last Backup',
      value: '2 hours ago',
      icon: Database,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const getCurrentFields = () => {
    switch (activeTab) {
      case 'general':
        return generalSettingsFields;
      case 'security':
        return securitySettingsFields;
      case 'email':
        return emailSettingsFields;
      case 'notifications':
        return notificationSettingsFields;
      case 'system':
        return systemSettingsFields;
      default:
        return generalSettingsFields;
    }
  };

  const handleFieldChange = (name: string, value: any) => {
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
        <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
        <div className="h-96 bg-bg-tertiary rounded"></div>
      </div>
    );
  }

  return (
    <SettingsLayout
      title="System Settings"
      subtitle="Configure global system settings and preferences"
      tabs={settingsTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      statusItems={systemStats}
      onSave={handleSave}
      onReset={handleReset}
      saving={saving}
    >
      <SettingsForm
        title={`${settingsTabs.find(tab => tab.id === activeTab)?.label} Settings`}
        fields={getCurrentFields()}
        values={settings}
        onChange={handleFieldChange}
        onSave={handleSave}
        onReset={handleReset}
        saving={saving}
      />
    </SettingsLayout>
  );
}
