'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  User, 
  CreditCard, 
  Settings as SettingsIcon, 
  Building2,
  Store,
  Languages,
  Wallet
} from 'lucide-react';
import type { CurrencyCode } from '@rentalshop/types';
import { useAuth, useSettingsTranslations } from '@rentalshop/hooks';
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
import { LanguageSection } from './components/LanguageSection';
import { BankAccountSection } from './components/BankAccountSection';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { DeleteAccountDialog } from './components/DeleteAccountDialog';

// ============================================================================
// SETTINGS MENU ITEMS
// ============================================================================

const createSettingsMenuItems = (t: any) => [
  {
    id: 'profile',
    label: t('menuItems.profile.label'),
    icon: User,
    description: t('menuItems.profile.description')
  },
  {
    id: 'merchant',
    label: t('menuItems.merchant.label'),
    icon: Building2,
    description: t('menuItems.merchant.description'),
    roles: ['MERCHANT']
  },
  {
    id: 'outlet',
    label: t('menuItems.outlet.label'),
    icon: Store,
    description: t('menuItems.outlet.description'),
    roles: ['OUTLET_ADMIN', 'OUTLET_STAFF']
  },
  {
    id: 'bank-accounts',
    label: t('menuItems.bankAccounts.label'),
    icon: Wallet,
    description: t('menuItems.bankAccounts.description'),
    roles: ['OUTLET_ADMIN'] // ✅ Only OUTLET_ADMIN can see bank accounts (staff cannot)
  },
  {
    id: 'subscription',
    label: t('menuItems.subscription.label'),
    icon: CreditCard,
    description: t('menuItems.subscription.description'),
    roles: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'] // ADMIN, MERCHANT, and OUTLET_ADMIN can access subscription
  },
  {
    id: 'language',
    label: t('menuItems.language.label'),
    icon: Languages,
    description: t('menuItems.language.description')
  },
  {
    id: 'account',
    label: t('menuItems.account.label'),
    icon: SettingsIcon,
    description: t('menuItems.account.description')
  }
];

// ============================================================================
// MAIN SETTINGS COMPONENT
// ============================================================================

export const SettingsComponent: React.FC = () => {
  const t = useSettingsTranslations();
  const { user, logout, loading, refreshUser } = useAuth();
  const { toastSuccess, toastError } = useToast();
  // ✅ Note: API errors are automatically handled by useGlobalErrorHandler in ClientLayout
  const { currency, setCurrency } = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get tab from URL or default to 'profile'
  const tabFromUrl = searchParams.get('tab') || 'profile';
  
  // Navigation state
  const [activeSection, setActiveSection] = useState(tabFromUrl);
  
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
    tenantKey: '',
  });
  
  const [outletFormData, setOutletFormData] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
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

  // Sync URL with active section
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'profile';
    if (tabFromUrl !== activeSection) {
      setActiveSection(tabFromUrl);
    }
  }, [searchParams]);

  // Function to change section and update URL
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    router.push(`/settings?tab=${section}`);
  };

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
        tenantKey: user.merchant.tenantKey || '',
      });
    }
    
    if (user?.outlet && (user?.role === 'OUTLET_ADMIN' || user?.role === 'OUTLET_STAFF')) {
      setOutletFormData({
        name: user.outlet.name || '',
        phone: user.outlet.phone || '',
        address: user.outlet.address || '',
        city: user.outlet.city || '',
        state: user.outlet.state || '',
        zipCode: user.outlet.zipCode || '',
        country: user.outlet.country || '',
        description: user.outlet.description || '',
      });
    }
  }, [user]);

  // Create and filter menu items based on user role
  const settingsMenuItems = createSettingsMenuItems(t);
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
        // Update authData in localStorage
        const storedAuth = localStorage.getItem('authData');
        if (storedAuth) {
          const authData = JSON.parse(storedAuth);
          if (authData.user) {
            // Update user personal data
            authData.user.firstName = personalFormData.firstName;
            authData.user.lastName = personalFormData.lastName;
            authData.user.phone = personalFormData.phone;
            authData.user.name = `${personalFormData.firstName} ${personalFormData.lastName}`;
            
            localStorage.setItem('authData', JSON.stringify(authData));
            console.log('✅ Updated user personal data in localStorage');
            
            // Also update user object in memory
            if (user) {
              user.firstName = personalFormData.firstName;
              user.lastName = personalFormData.lastName;
              user.phone = personalFormData.phone;
              user.name = `${personalFormData.firstName} ${personalFormData.lastName}`;
              console.log('✅ Updated user personal data in memory');
            }
          }
        }
        
        setIsEditingPersonal(false);
        toastSuccess('Success', t('messages.personalProfileUpdated'));
      } else {
        toastError('Error', response.error || t('messages.personalProfileUpdateFailed'));
      }
    } catch (error) {
      toastError('Error', t('messages.personalProfileUpdateFailed'));
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
        console.log('🔧 API success, refreshing user data...');
        
        // Refresh user data from API to get updated merchant info
        await refreshUser();
        
        setIsEditingMerchant(false);
        toastSuccess('Success', t('messages.businessInfoUpdated'));
      } else {
        console.log('❌ API failed:', response.error);
        toastError('Error', response.error || t('messages.businessInfoUpdateFailed'));
      }
    } catch (error) {
      console.error('❌ Error in handleUpdateMerchantInfo:', error);
      toastError('Error', t('messages.businessInfoUpdateFailed'));
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
        console.log('🔧 Outlet update success, refreshing user data...');
        
        // Refresh user data from API to get updated outlet info
        await refreshUser();
        
        setIsEditingOutlet(false);
        toastSuccess('Success', t('messages.outletInfoUpdated'));
      } else {
        toastError('Error', response.error || t('messages.outletInfoUpdateFailed'));
      }
    } catch (error) {
      toastError('Error', t('messages.outletInfoUpdateFailed'));
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
        toastSuccess('Account Deleted', t('messages.accountDeleted'));
        await logout();
      } else {
        toastError('Delete Failed', response.message || t('messages.accountDeleteFailed'));
      }
    } catch (error) {
      toastError('Delete Failed', t('messages.accountDeleteFailed'));
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangePassword = async () => {
    // ✅ Frontend validation only - prevent invalid submissions
    if (!passwordData.currentPassword) {
      toastError('Error', t('messages.currentPasswordRequired') || 'Current password is required');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toastError('Error', t('messages.passwordMismatch'));
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toastError('Error', t('messages.passwordTooShort'));
      return;
    }

    try {
      setIsChangingPassword(true);
      // ✅ API call - errors will be automatically handled by useGlobalErrorHandler
      const response = await authApi.changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      // ✅ Only handle success - errors are auto-handled by global error handler
      if (response.success) {
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        toastSuccess('Password Changed', t('messages.passwordChanged'));
      }
      // ❌ Removed: Manual error handling - useGlobalErrorHandler handles this automatically
    } catch (error) {
      // ❌ Removed: Manual error toast - useGlobalErrorHandler handles this automatically
      // Only catch network errors or unexpected errors
      console.error('Unexpected error:', error);
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
        
        toastSuccess('Success', t('messages.currencyUpdated'));
      } else {
        toastError('Error', response.error || t('messages.currencyUpdateFailed'));
      }
    } catch (error) {
      toastError('Error', t('messages.currencyUpdateFailed'));
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
      case 'bank-accounts':
        return (
          <BankAccountSection
            user={user}
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
      case 'language':
        return <LanguageSection />;
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
        onSectionChange={handleSectionChange}
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