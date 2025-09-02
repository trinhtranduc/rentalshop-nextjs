'use client';

import React from 'react';
import { Globe, Shield, Mail, Bell, Server } from 'lucide-react';

// Settings Tab Definitions
export const settingsTabs = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'system', label: 'System', icon: Server }
];

// General Settings Fields
export const generalSettingsFields = [
  {
    type: 'text' as const,
    name: 'siteName',
    label: 'Site Name',
    placeholder: 'Enter site name',
    required: true
  },
  {
    type: 'select' as const,
    name: 'defaultLanguage',
    label: 'Default Language',
    options: [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Spanish' },
      { value: 'fr', label: 'French' },
      { value: 'de', label: 'German' }
    ]
  },
  {
    type: 'textarea' as const,
    name: 'siteDescription',
    label: 'Site Description',
    placeholder: 'Enter site description',
    rows: 3
  },
  {
    type: 'select' as const,
    name: 'timezone',
    label: 'Timezone',
    options: [
      { value: 'UTC', label: 'UTC' },
      { value: 'America/New_York', label: 'Eastern Time' },
      { value: 'America/Chicago', label: 'Central Time' },
      { value: 'America/Denver', label: 'Mountain Time' },
      { value: 'America/Los_Angeles', label: 'Pacific Time' }
    ]
  },
  {
    type: 'select' as const,
    name: 'dateFormat',
    label: 'Date Format',
    options: [
      { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
      { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
      { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
    ]
  },
  {
    type: 'select' as const,
    name: 'currency',
    label: 'Currency',
    options: [
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' },
      { value: 'CAD', label: 'CAD' }
    ]
  }
];

// Security Settings Fields
export const securitySettingsFields = [
  {
    type: 'number' as const,
    name: 'sessionTimeout',
    label: 'Session Timeout (minutes)',
    min: 5,
    max: 480,
    description: 'How long users stay logged in before being required to log in again'
  },
  {
    type: 'number' as const,
    name: 'maxLoginAttempts',
    label: 'Max Login Attempts',
    min: 3,
    max: 10,
    description: 'Number of failed login attempts before account lockout'
  },
  {
    type: 'number' as const,
    name: 'passwordMinLength',
    label: 'Password Minimum Length',
    min: 6,
    max: 20,
    description: 'Minimum number of characters required for passwords'
  },
  {
    type: 'switch' as const,
    name: 'requireTwoFactor',
    label: 'Require Two-Factor Authentication',
    description: 'Force all users to enable 2FA'
  },
  {
    type: 'switch' as const,
    name: 'allowRegistration',
    label: 'Allow User Registration',
    description: 'Allow new users to register accounts'
  }
];

// Email Settings Fields
export const emailSettingsFields = [
  {
    type: 'text' as const,
    name: 'smtpHost',
    label: 'SMTP Host',
    placeholder: 'smtp.gmail.com'
  },
  {
    type: 'number' as const,
    name: 'smtpPort',
    label: 'SMTP Port',
    placeholder: '587',
    min: 1,
    max: 65535
  },
  {
    type: 'email' as const,
    name: 'smtpUsername',
    label: 'SMTP Username',
    placeholder: 'your-email@gmail.com'
  },
  {
    type: 'password' as const,
    name: 'smtpPassword',
    label: 'SMTP Password',
    placeholder: 'Your email password'
  },
  {
    type: 'email' as const,
    name: 'fromEmail',
    label: 'From Email',
    placeholder: 'noreply@yourdomain.com'
  },
  {
    type: 'text' as const,
    name: 'fromName',
    label: 'From Name',
    placeholder: 'Your Company Name'
  }
];

// Notification Settings Fields
export const notificationSettingsFields = [
  {
    type: 'switch' as const,
    name: 'emailNotifications',
    label: 'Email Notifications',
    description: 'Send email notifications for system events'
  },
  {
    type: 'switch' as const,
    name: 'systemAlerts',
    label: 'System Alerts',
    description: 'Show system alerts in the admin dashboard'
  },
  {
    type: 'switch' as const,
    name: 'maintenanceMode',
    label: 'Maintenance Mode',
    description: 'Put the system in maintenance mode'
  }
];

// System Settings Fields
export const systemSettingsFields = [
  {
    type: 'number' as const,
    name: 'maxFileSize',
    label: 'Max File Size (MB)',
    min: 1,
    max: 100,
    description: 'Maximum file size allowed for uploads'
  },
  {
    type: 'select' as const,
    name: 'backupFrequency',
    label: 'Backup Frequency',
    options: [
      { value: 'hourly', label: 'Hourly' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ]
  },
  {
    type: 'number' as const,
    name: 'logRetentionDays',
    label: 'Log Retention (days)',
    min: 7,
    max: 365,
    description: 'How long to keep system logs'
  },
  {
    type: 'text' as const,
    name: 'allowedFileTypes',
    label: 'Allowed File Types',
    placeholder: 'jpg, jpeg, png, pdf, doc, docx',
    description: 'Comma-separated list of allowed file extensions'
  }
];
