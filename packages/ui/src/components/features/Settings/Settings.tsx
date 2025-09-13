'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  CreditCard, 
  Settings as SettingsIcon, 
  Building2,
  Store
} from 'lucide-react';
import { useAuth, useToastHandler } from '@rentalshop/hooks';
import { usersApi, authApi, settingsApi, subscriptionsApi } from '@rentalshop/utils';

// Import components
import { SettingsLayout } from './components/SettingsLayout';
import { ProfileSection } from './components/ProfileSection';
import { MerchantSection } from './components/MerchantSection';
import { OutletSection } from './components/OutletSection';
import { SecuritySection } from './components/SecuritySection';
import { SubscriptionSection } from './components/SubscriptionSection';
import { AccountSection } from './components/AccountSection';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { DeleteAccountDialog } from './components/DeleteAccountDialog';

// ============================================================================
// SETTINGS MENU ITEMS
// ============================================================================

const settingsMenuItems = [
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    description: 'Manage your personal information'
  },
  {
    id: 'merchant',
    label: 'Business',
    icon: Building2,
    description: 'Manage your business information',
    roles: ['MERCHANT']
  },
  {
    id: 'outlet',
    label: 'Outlet',
    icon: Store,
    description: 'Manage your outlet information',
    roles: ['OUTLET_ADMIN', 'OUTLET_STAFF']
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    description: 'Password and account security'
  },
  {
    id: 'subscription',
    label: 'Subscription',
    icon: CreditCard,
    description: 'Manage your subscription and billing'
  },
  {
    id: 'account',
    label: 'Account',
    icon: SettingsIcon,
    description: 'Account settings and preferences'
  }
];

// ============================================================================
// MAIN SETTINGS COMPONENT
// ============================================================================

export const SettingsComponent: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const { showSuccess, showError } = useToastHandler();
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('profile');
  
  // Profile editing state
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingMerchant, setIsEditingMerchant] = useState(false);
  const [isEditingOutlet, setIsEditingOutlet] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form data states
  const [personalFormData, setPersonalFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  
  const [merchantFormData, setMerchantFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    businessType: '',
    taxId: '',
  });
  
  const [outletFormData, setOutletFormData] = useState({
    name: '',
    phone: '',
    address: '',
    description: '',
  });
  
  // Dialog states
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Subscription state
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setSubscriptionLoading(true);
        const response = await subscriptionsApi.getCurrentUserSubscriptionStatus();
        
        if (response.success) {
          setSubscriptionData(response.data);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscriptionData();
  }, []);

  // Update form data when user data is loaded
  useEffect(() => {
    if (user?.merchant && user?.role === 'MERCHANT') {
      setMerchantFormData({
        name: user.merchant.name || '',
        phone: user.merchant.phone || '',
        address: user.merchant.address || '',
        city: user.merchant.city || '',
        state: user.merchant.state || '',
        zipCode: user.merchant.zipCode || '',
        country: user.merchant.country || '',
        businessType: user.merchant.businessType || '',
        taxId: user.merchant.taxId || '',
      });
    }
    
    if (user?.outlet && (user?.role === 'OUTLET_ADMIN' || user?.role === 'OUTLET_STAFF')) {
      setOutletFormData({
        name: user.outlet.name || '',
        phone: user.outlet.phone || '',
        address: user.outlet.address || '',
        description: user.outlet.description || '',
      });
    }
  }, [user]);

  // Event handlers will be added in the next part...
  const handlePersonalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMerchantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMerchantFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOutletInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOutletFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  // Placeholder handlers - these will be implemented
  const handleEditPersonalProfile = () => setIsEditingPersonal(true);
  const handleUpdatePersonalProfile = async () => {
    try {
      setIsUpdating(true);
      const response = await settingsApi.updateUserProfile(personalFormData);
      if (response.success) {
        setIsEditingPersonal(false);
        showSuccess('Success', 'Personal profile updated successfully!');
      } else {
        showError('Error', response.error || 'Failed to update personal profile');
      }
    } catch (error) {
      showError('Error', 'Failed to update personal profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  const handleCancelPersonal = () => setIsEditingPersonal(false);

  const handleEditMerchantInfo = () => setIsEditingMerchant(true);
  const handleUpdateMerchantInfo = async () => {
    try {
      setIsUpdating(true);
      const response = await settingsApi.updateMerchantInfo(merchantFormData);
      if (response.success) {
        setIsEditingMerchant(false);
        showSuccess('Success', 'Business information updated successfully!');
      } else {
        showError('Error', response.error || 'Failed to update business information');
      }
    } catch (error) {
      showError('Error', 'Failed to update business information. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  const handleCancelMerchant = () => setIsEditingMerchant(false);

  const handleEditOutletInfo = () => setIsEditingOutlet(true);
  const handleUpdateOutletInfo = async () => {
    try {
      setIsUpdating(true);
      const response = await settingsApi.updateOutletInfo(outletFormData);
      if (response.success) {
        setIsEditingOutlet(false);
        showSuccess('Success', 'Outlet information updated successfully!');
      } else {
        showError('Error', response.error || 'Failed to update outlet information');
      }
    } catch (error) {
      showError('Error', 'Failed to update outlet information. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  const handleCancelOutlet = () => setIsEditingOutlet(false);

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      
      if (!user?.id) {
        throw new Error('User ID not found');
      }
      
      const response = await usersApi.deleteAccount(user.id);
      if (response.success) {
        showSuccess('Account Deleted', 'Your account has been deleted successfully.');
        await logout();
      } else {
        showError('Delete Failed', response.message || 'Failed to delete account');
      }
    } catch (error) {
      showError('Delete Failed', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true);
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match');
      }
      if (passwordData.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      const response = await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (response.success) {
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showSuccess('Password Changed', 'Your password has been changed successfully!');
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      showError('Password Change Failed', error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileSection
            user={user}
            isEditing={isEditingPersonal}
            isUpdating={isUpdating}
            formData={personalFormData}
            onEdit={handleEditPersonalProfile}
            onSave={handleUpdatePersonalProfile}
            onCancel={handleCancelPersonal}
            onInputChange={handlePersonalInputChange}
          />
        );
      case 'merchant':
        return (
          <MerchantSection
            user={user}
            isEditing={isEditingMerchant}
            isUpdating={isUpdating}
            formData={merchantFormData}
            onEdit={handleEditMerchantInfo}
            onSave={handleUpdateMerchantInfo}
            onCancel={handleCancelMerchant}
            onInputChange={handleMerchantInputChange}
          />
        );
      case 'outlet':
        return (
          <OutletSection
            user={user}
            isEditing={isEditingOutlet}
            isUpdating={isUpdating}
            formData={outletFormData}
            onEdit={handleEditOutletInfo}
            onSave={handleUpdateOutletInfo}
            onCancel={handleCancelOutlet}
            onInputChange={handleOutletInputChange}
          />
        );
      case 'security':
        return (
          <SecuritySection
            onChangePassword={() => setShowChangePassword(true)}
          />
        );
      case 'subscription':
        return (
          <SubscriptionSection
            subscriptionData={subscriptionData}
            subscriptionLoading={subscriptionLoading}
          />
        );
      case 'account':
        return (
          <AccountSection
            onSignOut={handleSignOut}
            onDeleteAccount={() => setShowDeleteConfirm(true)}
            isDeleting={isDeleting}
          />
        );
      default:
        return (
          <ProfileSection
            user={user}
            isEditing={isEditingPersonal}
            isUpdating={isUpdating}
            formData={personalFormData}
            onEdit={handleEditPersonalProfile}
            onSave={handleUpdatePersonalProfile}
            onCancel={handleCancelPersonal}
            onInputChange={handlePersonalInputChange}
          />
        );
    }
  };

  return (
    <>
      <SettingsLayout
        user={user}
        loading={loading}
        menuItems={settingsMenuItems}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        {renderActiveSection()}
      </SettingsLayout>

      <ChangePasswordDialog
        isOpen={showChangePassword}
        isChanging={isChangingPassword}
        passwordData={passwordData}
        onClose={() => setShowChangePassword(false)}
        onChange={handlePasswordChange}
        onSubmit={handleChangePassword}
      />

      <DeleteAccountDialog
        isOpen={showDeleteConfirm}
        isDeleting={isDeleting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
      />
      
    </>
  );
};

export default SettingsComponent;