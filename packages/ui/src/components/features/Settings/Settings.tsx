'use client';

import React, { useState, useEffect } from 'react';
import { 
  User, 
  CreditCard, 
  Settings as SettingsIcon, 
  Building2,
  Store
} from 'lucide-react';
import type { CurrencyCode } from '@rentalshop/types';
import { useAuth } from '@rentalshop/hooks';
import { usersApi, authApi, settingsApi, subscriptionsApi } from '@rentalshop/utils';
import { useToast } from '@rentalshop/ui';
import { useCurrency } from '../../../contexts/CurrencyContext';

// Import components
import { SettingsLayout } from './components/SettingsLayout';
import { ProfileSection } from './components/ProfileSection';
import { MerchantSection } from './components/MerchantSection';
import { OutletSection } from './components/OutletSection';
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
    description: 'Manage your business information, pricing, and currency',
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
    id: 'subscription',
    label: 'Subscription',
    icon: CreditCard,
    description: 'Manage your subscription and billing',
    roles: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'] // ADMIN, MERCHANT, and OUTLET_ADMIN can access subscription
  },
  {
    id: 'account',
    label: 'Account',
    icon: SettingsIcon,
    description: 'Account settings, password and preferences'
  }
];

// ============================================================================
// MAIN SETTINGS COMPONENT
// ============================================================================

export const SettingsComponent: React.FC = () => {
  const { user, logout, loading } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const { currency, setCurrency } = useCurrency();
  
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
    pricingType: '',
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

  // Update personalFormData when user data loads
  useEffect(() => {
    if (user) {
      setPersonalFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscriptionData = async () => {
      try {
        setSubscriptionLoading(true);
        const response = await subscriptionsApi.getCurrentUserSubscriptionStatus();
        
        console.log('🔍 Settings - Subscription API response:', response);
        
        if (response.success && response.data) {
          // ============================================================================
          // NEW FLAT API RESPONSE MAPPING
          // ============================================================================
          // API now returns flat structure:
          // {
          //   status: "CANCELED" | "EXPIRED" | "PAST_DUE" | "PAUSED" | "TRIAL" | "ACTIVE",
          //   statusReason: "Canceled on 10/7/2025",
          //   hasAccess: false,
          //   daysRemaining: 31,
          //   planName: "Basic",
          //   currentPeriodEnd: "2025-11-07T12:17:28.045Z",  // ← Already flat!
          //   billingAmount: 75050,                          // ← Already flat!
          //   billingInterval: "quarter",                    // ← Already flat!
          //   ...all other fields are flat
          // }
          
          const data = response.data;
          
          // Map to SubscriptionSection format (keep compatibility)
          const transformedData = {
            hasSubscription: true,
            subscription: {
              // Core subscription info (already flat in response)
              id: data.subscriptionId,
              status: data.status,
              planName: data.planName,
              currentPeriodStart: data.currentPeriodStart,
              currentPeriodEnd: data.currentPeriodEnd,
              
              // Billing info (already flat)
              amount: data.billingAmount,
              currency: data.billingCurrency,
              interval: data.billingInterval,
              
              // Trial info
              trialStart: data.trialStart,
              trialEnd: data.trialEnd,
              
              // Cancellation info
              cancelAtPeriodEnd: data.cancelAtPeriodEnd,
              canceledAt: data.canceledAt,
              cancelReason: data.cancelReason,
              
              // Plan details
              plan: {
                id: data.planId,
                name: data.planName,
                description: data.planDescription,
                basePrice: data.planPrice,
                currency: data.planCurrency
              }
            },
            
            // Status flags (derived from computed status)
            status: data.status,
            statusReason: data.statusReason,
            isActive: data.status === 'ACTIVE',
            isExpired: data.status === 'EXPIRED',
            isTrial: data.status === 'TRIAL',
            isCanceled: data.status === 'CANCELED',
            hasAccess: data.hasAccess,
            isExpiringSoon: data.isExpiringSoon,
            daysRemaining: data.daysRemaining,
            
            // Merchant info
            merchant: {
              id: data.merchantId,
              name: data.merchantName,
              email: data.merchantEmail
            },
            
            // Limits & usage
            limits: data.limits,
            usage: data.usage,
            
            // Features
            features: data.features
          };
          
          console.log('✅ Settings - Mapped subscription data:', transformedData);
          setSubscriptionData(transformedData);
        } else {
          console.log('❌ Settings - No subscription data:', response);
          setSubscriptionData(null);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        setSubscriptionData(null);
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
        pricingType: user.merchant.pricingType || '',
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

  // Filter menu items based on user role
  const filteredMenuItems = settingsMenuItems.filter(item => {
    // If item has roles restriction, check if user role is allowed
    if (item.roles) {
      return item.roles.includes(user?.role || '');
    }
    // If no roles restriction, show to all
    return true;
  });

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
        toastSuccess('Success', 'Personal profile updated successfully!');
      } else {
        toastError('Error', response.error || 'Failed to update personal profile');
      }
    } catch (error) {
      toastError('Error', 'Failed to update personal profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };
  const handleCancelPersonal = () => setIsEditingPersonal(false);

  const handleEditMerchantInfo = () => setIsEditingMerchant(true);
  const handleUpdateMerchantInfo = async () => {
    try {
      console.log('🔧 handleUpdateMerchantInfo called');
      console.log('🔧 merchantFormData:', merchantFormData);
      setIsUpdating(true);
      const response = await settingsApi.updateMerchantInfo(merchantFormData);
      console.log('🔧 API response:', response);
      
      if (response.success) {
        console.log('🔧 API success, updating localStorage...');
        
        // Update authData in localStorage (NOT 'user' key - it's 'authData')
        const storedAuth = localStorage.getItem('authData');
        console.log('🔧 storedAuth before update:', storedAuth ? 'exists' : 'null');
        
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          console.log('🔧 authData.user.merchant before:', authData.user?.merchant);
          
          if (authData.user && authData.user.merchant) {
            // Only update the country field (API already updated all fields in database)
            authData.user.merchant.country = merchantFormData.country;
            console.log('🔧 Updated country in authData.user.merchant:', authData.user.merchant.country);
            
            localStorage.setItem('authData', JSON.stringify(authData));
            console.log('✅ Updated merchant country in localStorage:', authData.user.merchant.country);
            
            // IMPORTANT: Also update user object in memory so next Edit shows new country
            if (user && user.merchant) {
              user.merchant.country = merchantFormData.country;
              console.log('✅ Updated merchant country in memory:', user.merchant.country);
            }
          } else {
            console.log('❌ authData.user.merchant is null/undefined');
          }
        } else {
          console.log('❌ No authData found in localStorage');
        }
        
        setIsEditingMerchant(false);
        toastSuccess('Success', 'Business information updated successfully!');
      } else {
        console.log('❌ API failed:', response.error);
        toastError('Error', response.error || 'Failed to update business information');
      }
    } catch (error) {
      console.error('❌ Error in handleUpdateMerchantInfo:', error);
      toastError('Error', 'Failed to update business information. Please try again.');
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
        toastSuccess('Success', 'Outlet information updated successfully!');
      } else {
        toastError('Error', response.error || 'Failed to update outlet information');
      }
    } catch (error) {
      toastError('Error', 'Failed to update outlet information. Please try again.');
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
      
      const response = await usersApi.deleteUser(user.id);
      if (response.success) {
        toastSuccess('Account Deleted', 'Your account has been deleted successfully.');
        await logout();
      } else {
        toastError('Delete Failed', response.message || 'Failed to delete account');
      }
    } catch (error) {
      toastError('Delete Failed', 'Failed to delete account. Please try again.');
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
        toastSuccess('Password Changed', 'Your password has been changed successfully!');
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      toastError('Password Change Failed', error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCurrencyChange = async (newCurrency: CurrencyCode) => {
    try {
      setIsUpdating(true);
      const response = await settingsApi.updateMerchantCurrency({ currency: newCurrency });
      if (response.success) {
        // Update currency in context - CurrencyProvider will re-render all components
        setCurrency(newCurrency);
        
        // Update authData in localStorage to persist currency
        const storedAuth = localStorage.getItem('authData');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          if (authData.user && authData.user.merchant) {
            authData.user.merchant.currency = newCurrency;
            localStorage.setItem('authData', JSON.stringify(authData));
          }
        }
        
        toastSuccess('Success', 'Currency updated successfully!');
      } else {
        toastError('Error', response.error || 'Failed to update currency');
      }
    } catch (error) {
      toastError('Error', 'Failed to update currency. Please try again.');
    } finally {
      setIsUpdating(false);
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
            currentCurrency={currency}
            onEdit={handleEditMerchantInfo}
            onSave={handleUpdateMerchantInfo}
            onCancel={handleCancelMerchant}
            onInputChange={handleMerchantInputChange}
            onCurrencyChange={handleCurrencyChange}
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
      case 'subscription':
        return (
          <SubscriptionSection
            subscriptionData={subscriptionData}
            subscriptionLoading={subscriptionLoading}
            currentUserRole={user?.role}
          />
        );
      case 'account':
        return (
          <AccountSection
            onSignOut={handleSignOut}
            onDeleteAccount={() => setShowDeleteConfirm(true)}
            onChangePassword={() => setShowChangePassword(true)}
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
        menuItems={filteredMenuItems}
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