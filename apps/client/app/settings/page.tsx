'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  PageSection,
  Button,
  Input,
  Label,
  Badge,
  ToastContainer,
  useToasts,
  Separator
} from '@rentalshop/ui';
import { useAuth } from '@rentalshop/hooks';
import { usersApi, authApi, settingsApi, subscriptionsApi } from '@rentalshop/utils';
import { 
  User, 
  Shield, 
  CreditCard, 
  Settings, 
  LogOut, 
  Trash2,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Building2,
  Store
} from 'lucide-react';

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
    icon: Settings,
    description: 'Account settings and preferences'
  }
];

export default function SettingsPage() {
  const { user, logout, refreshUser, loading } = useAuth();
  const { toasts, showSuccess, showError, removeToast } = useToasts();
  
  // Prevent console clearing for debugging
  if (typeof window !== 'undefined') {
    console.clear = () => {
      console.log('🚫 Console clear blocked for debugging');
    };
  }
  
  // Debug: Log user data when component loads
  console.log('SettingsPage - User data:', {
    user: user,
    role: user?.role,
    roleType: typeof user?.role,
    roleLength: user?.role?.length,
    merchantId: user?.merchantId,
    outletId: user?.outletId,
    hasMerchant: !!user?.merchant,
    hasOutlet: !!user?.outlet,
    merchantName: user?.merchant?.name,
    outletName: user?.outlet?.name
  });
  
  // Navigation state
  const [activeSection, setActiveSection] = useState('profile');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isEditingMerchant, setIsEditingMerchant] = useState(false);
  const [isEditingOutlet, setIsEditingOutlet] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Personal information form data
  const [personalFormData, setPersonalFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    // Email field is disabled - cannot be updated
    phone: user?.phone || '',
  });
  
  // Merchant information form data
  const [merchantFormData, setMerchantFormData] = useState({
    name: '',
    // Email field is disabled - cannot be updated
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    businessType: '',
    taxId: '',
  });
  
  // Outlet information form data
  const [outletFormData, setOutletFormData] = useState({
    name: '',
    phone: '',
    address: '',
    description: '',
  });
  
  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Subscription state
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  
  // Merchant/Outlet state - now using user.merchant and user.outlet directly
  const [merchantOutletLoading, setMerchantOutletLoading] = useState(false);

  // Fetch subscription data on component mount
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

  // No need to fetch merchant/outlet data separately - it's now included in user object

  // Update form data when user data is loaded
  useEffect(() => {
    console.log('🔄 User data updated:', {
      user: user,
      merchant: user?.merchant,
      outlet: user?.outlet,
      role: user?.role
    });
    
    if (user?.merchant && user?.role === 'MERCHANT') {
      console.log('📝 Setting merchant form data from user.merchant:', {
        name: user.merchant.name,
        address: user.merchant.address,
        city: user.merchant.city,
        state: user.merchant.state,
        zipCode: user.merchant.zipCode,
        country: user.merchant.country,
        businessType: user.merchant.businessType,
        taxId: user.merchant.taxId,
      });
      
      setMerchantFormData({
        name: user.merchant.name || '',
        // Email field is disabled - cannot be updated
        phone: user.merchant.phone || '',
        address: user.merchant.address || '',
        city: user.merchant.city || '',
        state: user.merchant.state || '',
        zipCode: user.merchant.zipCode || '',
        country: user.merchant.country || '',
        businessType: user.merchant.businessType || '',
        taxId: user.merchant.taxId || '',
      });
      
      console.log('✅ Merchant form data set successfully');
    } else {
      console.log('❌ Cannot set merchant form data:', {
        hasMerchant: !!user?.merchant,
        role: user?.role,
        isMerchantRole: user?.role === 'MERCHANT'
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

  const handlePersonalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPersonalFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMerchantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    console.log('📝 Merchant input changed:', { name, value });
    setMerchantFormData(prev => {
      const newData = { ...prev, [name]: value };
      console.log('📝 New merchant form data:', newData);
      return newData;
    });
  };

  const handleOutletInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOutletFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditPersonalProfile = () => {
    // Populate form data with current personal values
    setPersonalFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      // Email field is disabled - cannot be updated
      phone: user?.phone || '',
    });
    
    setIsEditingPersonal(true);
  };

  const handleEditMerchantInfo = () => {
    console.log('🔧 Edit merchant info clicked');
    console.log('👤 Current user.merchant:', user?.merchant);
    
    // Populate form data with current merchant values from user object
    if (user?.merchant) {
      const formData = {
        name: user.merchant.name || '',
        email: user.merchant.email || '',
        phone: user.merchant.phone || '',
        address: user.merchant.address || '',
        city: user.merchant.city || '',
        state: user.merchant.state || '',
        zipCode: user.merchant.zipCode || '',
        country: user.merchant.country || '',
        businessType: user.merchant.businessType || '',
        taxId: user.merchant.taxId || '',
      };
      
      console.log('📝 Setting merchant form data for editing:', formData);
      setMerchantFormData(formData);
    } else {
      console.log('❌ No merchant data found in user object');
    }
    
    setIsEditingMerchant(true);
    console.log('✅ Edit mode enabled');
  };

  const handleEditOutletInfo = () => {
    // Populate form data with current outlet values from user object
    if (user?.outlet) {
      setOutletFormData({
        name: user.outlet.name || '',
        phone: user.outlet.phone || '',
        address: user.outlet.address || '',
        description: user.outlet.description || '',
      });
    }
    
    setIsEditingOutlet(true);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePersonalProfile = async () => {
    console.log('🔍 DEBUG: handleUpdatePersonalProfile called');
    console.log('🔍 DEBUG: Current user:', user);
    console.log('🔍 DEBUG: Personal form data:', personalFormData);
    
    try {
      console.log('🔍 DEBUG: Setting isUpdating to true');
      setIsUpdating(true);
      
      if (!user?.id) {
        console.error('❌ DEBUG: User ID not found, user object:', user);
        throw new Error('User ID not found');
      }

      console.log('🔍 DEBUG: User ID found:', user.id);
      console.log('🔍 DEBUG: About to call settingsApi.updatePersonalProfile with data:', {
        firstName: personalFormData.firstName,
        lastName: personalFormData.lastName,
        // Email field is disabled - cannot be updated
        phone: personalFormData.phone
      });

      // Call the settings API for personal profile update
      console.log('🔍 DEBUG: Calling settingsApi.updatePersonalProfile...');
      const response = await settingsApi.updatePersonalProfile({
        firstName: personalFormData.firstName,
        lastName: personalFormData.lastName,
        // Email field is disabled - cannot be updated
        phone: personalFormData.phone
      });
      
      console.log('🔍 DEBUG: API response received:', response);
      console.log('🔍 DEBUG: Response success:', response.success);
      console.log('🔍 DEBUG: Response error:', response.error);
      console.log('🔍 DEBUG: Response message:', response.message);
      
      if (response.success) {
        console.log('✅ DEBUG: Personal profile updated successfully:', response.data);
        
        // Refresh user data to get the latest profile information
        await refreshUser();
        
        console.log('🔍 DEBUG: Setting isEditingPersonal to false');
        setIsEditingPersonal(false);
        console.log('🔍 DEBUG: Showing success message');
        showSuccess('Success', 'Personal profile updated successfully!');
      } else {
        console.error('❌ DEBUG: API call failed:', response.error || response.message);
        showError('Error', response.error || response.message || 'Failed to update personal profile');
      }
    } catch (error) {
      console.error('❌ DEBUG: Exception caught in handleUpdatePersonalProfile:', error);
      console.error('❌ DEBUG: Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('❌ DEBUG: Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack');
      console.error('❌ DEBUG: Full error object:', error);
      
      // Check if this is an authentication error that would trigger redirect
      if (error instanceof Error && error.message && error.message.includes('Authentication required')) {
        console.error('🚨 DEBUG: AUTHENTICATION ERROR DETECTED - This will trigger redirect to login!');
        console.error('🚨 DEBUG: Error details:', error);
      }
      
      if (error instanceof Error && error.message && error.message.includes('Unauthorized')) {
        console.error('🚨 DEBUG: UNAUTHORIZED ERROR DETECTED - This will trigger redirect to login!');
        console.error('🚨 DEBUG: Error details:', error);
      }
      
      showError('Error', 'Failed to update personal profile. Please try again.');
    } finally {
      console.log('🔍 DEBUG: Setting isUpdating to false');
      setIsUpdating(false);
    }
  };

  const handleUpdateMerchantInfo = async () => {
    try {
      setIsUpdating(true);
      
      // Prevent console clearing
      console.clear = () => {};
      
      if (!user?.merchantId) {
        throw new Error('Merchant ID not found');
      }

      console.log('🚀 Starting merchant update process...');
      console.log('👤 User data:', {
        id: user.id,
        role: user.role,
        merchantId: user.merchantId,
        isAuthenticated: !!user
      });
      console.log('📝 Updating merchant info with data:', {
        name: merchantFormData.name,
        // Email field is disabled - cannot be updated
        phone: merchantFormData.phone,
        address: merchantFormData.address,
        city: merchantFormData.city,
        state: merchantFormData.state,
        zipCode: merchantFormData.zipCode,
        country: merchantFormData.country,
        businessType: merchantFormData.businessType,
        taxId: merchantFormData.taxId,
      });

      console.log('🔄 Calling centralized API...');
      const response = await settingsApi.updateMerchantInfo({
        name: merchantFormData.name,
        // Email field is disabled - cannot be updated
        phone: merchantFormData.phone,
        address: merchantFormData.address,
        city: merchantFormData.city,
        state: merchantFormData.state,
        zipCode: merchantFormData.zipCode,
        country: merchantFormData.country,
        businessType: merchantFormData.businessType,
        taxId: merchantFormData.taxId,
      });
      
      console.log('Merchant update response:', response);
      
      if (!response.success) {
        console.error('Merchant update failed:', response);
        throw new Error(response.error || response.message || 'Failed to update merchant information');
      }
      
      console.log('Merchant updated successfully');
      console.log('📋 Updated merchant data from API:', response.data);
      
      // Refresh user data to get the latest merchant information
      await refreshUser();
      
      setIsEditingMerchant(false);
      showSuccess('Success', 'Business information updated successfully!');
      
      console.log('✅ Update completed with refresh - data should be updated');
    } catch (error) {
      console.error('❌ Error updating merchant:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      
      // Show specific error messages based on error type
      if (error instanceof Error) {
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          showError('Authentication Error', 'Your session has expired. Please log in again.');
        } else if (error.message.includes('token')) {
          showError('Authentication Error', 'Authentication token is invalid. Please log in again.');
        } else {
          showError('Update Error', `Failed to update business information: ${error.message}`);
        }
      } else {
        showError('Error', 'Failed to update business information. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateOutletInfo = async () => {
    try {
      setIsUpdating(true);
      
      if (!user?.outletId) {
        throw new Error('Outlet ID not found');
      }

      const response = await settingsApi.updateOutletInfo({
        name: outletFormData.name,
        address: outletFormData.address,
        phone: outletFormData.phone,
        description: outletFormData.description,
      });
      
      if (!response.success) {
        throw new Error(response.error || response.message || 'Failed to update outlet information');
      }
      
      console.log('Outlet updated successfully');
      
      // Refresh user data to get updated outlet info
      // await refreshUser();
      
      setIsEditingOutlet(false);
      showSuccess('Success', 'Outlet information updated successfully!');
    } catch (error) {
      console.error('Error updating outlet:', error);
      showError('Error', 'Failed to update outlet information. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelPersonal = () => {
    // Reset personal form data to current values
    setPersonalFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      // Email field is disabled - cannot be updated
      phone: user?.phone || '',
    });
    
    setIsEditingPersonal(false);
  };

  const handleCancelMerchant = () => {
    // Reset merchant form data to current values from user object
    if (user?.merchant) {
      setMerchantFormData({
        name: user.merchant.name || '',
        // Email field is disabled - cannot be updated
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
    
    setIsEditingMerchant(false);
  };

  const handleCancelOutlet = () => {
    // Reset outlet form data to current values from user object
    if (user?.outlet) {
      setOutletFormData({
        name: user.outlet.name || '',
        phone: user.outlet.phone || '',
        address: user.outlet.address || '',
        description: user.outlet.description || '',
      });
    }
    
    setIsEditingOutlet(false);
  };


  // No longer needed - merchant and outlet data comes from user object

  const handleSignOut = async () => {
    try {
      await logout();
      // The logout function should handle redirecting to login page
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

      // Call the delete account API
      const response = await usersApi.deleteAccount(user.id);
      
      if (response.success) {
        console.log('Account deleted successfully:', response.data);
        showSuccess('Account Deleted', 'Your account has been deleted successfully. You will be signed out.');
        // Sign out after successful deletion
        await logout();
      } else {
        throw new Error(response.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      showError('Delete Failed', `Failed to delete account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setIsChangingPassword(true);
      
      // Validate passwords
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      if (passwordData.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }

      // Call the change password API
      const response = await authApi.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (response.success) {
        console.log('Password changed successfully');
        setShowChangePassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showSuccess('Password Changed', 'Your password has been changed successfully!');
      } else {
        throw new Error(response.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Password Change Failed', `Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Personal Information</h2>
          <p className="text-gray-600">Manage your personal information and account details</p>
        </div>
        {!isEditingPersonal ? (
          <Button onClick={handleEditPersonalProfile}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleUpdatePersonalProfile} variant="default" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleCancelPersonal} variant="outline" disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </Label>
                {isEditingPersonal ? (
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={personalFormData.firstName}
                    onChange={handlePersonalInputChange}
                    placeholder="Enter your first name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.firstName || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </Label>
                {isEditingPersonal ? (
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={personalFormData.lastName}
                    onChange={handlePersonalInputChange}
                    placeholder="Enter your last name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.lastName || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={user?.email || ''}
                    placeholder="Email address"
                    disabled={true}
                    className="bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      Cannot be changed
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Email addresses cannot be changed for security reasons
                </p>
              </div>

              <div>
                <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </Label>
                {isEditingPersonal ? (
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={personalFormData.phone}
                    onChange={handlePersonalInputChange}
                    placeholder="Enter your phone number"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </Label>
                <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                  {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderMerchantSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Information</h2>
          <p className="text-gray-600">Manage your business details and settings</p>
        </div>
        {!isEditingMerchant ? (
          <div className="flex gap-2">
            <Button onClick={handleEditMerchantInfo}>
              Edit Business Info
            </Button>
            <Button onClick={refreshUser} variant="outline">
              🔄 Refresh Data
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleUpdateMerchantInfo} variant="default" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleCancelMerchant} variant="outline" disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {!user?.merchant ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No business information available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="merchantName" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="merchantName"
                    name="name"
                    type="text"
                    value={merchantFormData.name}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter business name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.name || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="merchantEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Email
                </Label>
                <div className="relative">
                  <Input
                    id="merchantEmail"
                    name="email"
                    type="email"
                    value={user?.merchant?.email || ''}
                    placeholder="Business email address"
                    disabled={true}
                    className="bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                      Cannot be changed
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Business email addresses cannot be changed for security reasons
                </p>
              </div>

              <div>
                <Label htmlFor="merchantPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Phone
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="merchantPhone"
                    name="phone"
                    type="tel"
                    value={merchantFormData.phone}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter business phone"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Type
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="businessType"
                    name="businessType"
                    type="text"
                    value={merchantFormData.businessType}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter business type"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.businessType || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="taxId"
                    name="taxId"
                    type="text"
                    value={merchantFormData.taxId}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter tax ID"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.merchant?.taxId || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="merchantAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Business Address
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="merchantAddress"
                    name="address"
                    type="text"
                    value={merchantFormData.address}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter business address"
                  />
                ) : (
                  <div>
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.merchant?.address || 'Not provided'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Form data: "{merchantFormData.address || 'empty'}"
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="merchantCity" className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="merchantCity"
                    name="city"
                    type="text"
                    value={merchantFormData.city}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter city"
                  />
                ) : (
                  <div>
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.merchant?.city || 'Not provided'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Form data: "{merchantFormData.city || 'empty'}"
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="merchantState" className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="merchantState"
                    name="state"
                    type="text"
                    value={merchantFormData.state}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter state"
                  />
                ) : (
                  <div>
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.merchant?.state || 'Not provided'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Form data: "{merchantFormData.state || 'empty'}"
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="merchantZipCode" className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="merchantZipCode"
                    name="zipCode"
                    type="text"
                    value={merchantFormData.zipCode}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter ZIP code"
                  />
                ) : (
                  <div>
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.merchant?.zipCode || 'Not provided'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Form data: "{merchantFormData.zipCode || 'empty'}"
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="merchantCountry" className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </Label>
                {isEditingMerchant ? (
                  <Input
                    id="merchantCountry"
                    name="country"
                    type="text"
                    value={merchantFormData.country}
                    onChange={handleMerchantInputChange}
                    placeholder="Enter country"
                  />
                ) : (
                  <div>
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.merchant?.country || 'Not provided'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Form data: "{merchantFormData.country || 'empty'}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderOutletSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Outlet Information</h2>
          <p className="text-gray-600">Manage your outlet details and settings</p>
        </div>
        {!isEditingOutlet ? (
          <Button onClick={handleEditOutletInfo}>
            Edit Outlet Info
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleUpdateOutletInfo} variant="default" disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleCancelOutlet} variant="outline" disabled={isUpdating}>
              Cancel
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-6">
          {!user?.outlet ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No outlet information available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="outletName" className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet Name
                </Label>
                {isEditingOutlet ? (
                  <Input
                    id="outletName"
                    name="name"
                    type="text"
                    value={outletFormData.name}
                    onChange={handleOutletInputChange}
                    placeholder="Enter outlet name"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.name || 'Not provided'}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="outletPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet Phone
                </Label>
                {isEditingOutlet ? (
                  <Input
                    id="outletPhone"
                    name="phone"
                    type="tel"
                    value={outletFormData.phone}
                    onChange={handleOutletInputChange}
                    placeholder="Enter outlet phone"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.phone || 'Not provided'}
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="outletAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Outlet Address
                </Label>
                {isEditingOutlet ? (
                  <Input
                    id="outletAddress"
                    name="address"
                    type="text"
                    value={outletFormData.address}
                    onChange={handleOutletInputChange}
                    placeholder="Enter outlet address"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.address || 'Not provided'}
                  </p>
                )}
              </div>

              {/* Outlet doesn't have city, state, zipCode, country fields in current structure */}

              <div className="md:col-span-2">
                <Label htmlFor="outletDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </Label>
                {isEditingOutlet ? (
                  <Input
                    id="outletDescription"
                    name="description"
                    type="text"
                    value={outletFormData.description}
                    onChange={handleOutletInputChange}
                    placeholder="Enter outlet description"
                  />
                ) : (
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.outlet?.description || 'Not provided'}
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );


  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Security</h2>
        <p className="text-gray-600">Manage your password and account security settings</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Password</h3>
                  <p className="text-sm text-gray-600">Change your password to keep your account secure</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setShowChangePassword(true)}
              >
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSubscriptionSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Subscription</h2>
        <p className="text-gray-600">Manage your subscription and billing information</p>
      </div>

      {subscriptionLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading subscription data...</span>
            </div>
          </CardContent>
        </Card>
      ) : subscriptionData?.hasSubscription ? (
        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
                    <p className="text-sm text-gray-600">{subscriptionData.subscription.plan?.name || 'Professional Plan'}</p>
                  </div>
                </div>
                <Badge 
                  variant={subscriptionData.isExpired ? 'destructive' : 'default'}
                  className={subscriptionData.isExpired ? 'bg-red-100 text-red-800' : subscriptionData.isExpiringSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
                >
                  {subscriptionData.isExpired ? 'Expired' : subscriptionData.isExpiringSoon ? 'Expiring Soon' : 'Active'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Amount</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    ${subscriptionData.subscription.amount || '0.00'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {subscriptionData.subscription.interval || 'monthly'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Next Billing</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {subscriptionData.subscription.currentPeriodEnd ? 
                      new Date(subscriptionData.subscription.currentPeriodEnd).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      }) : 'N/A'}
                  </p>
                  {subscriptionData.daysUntilExpiry && (
                    <p className="text-xs text-gray-600">
                      {subscriptionData.daysUntilExpiry} days remaining
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Status</span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 capitalize">
                    {subscriptionData.subscription.status || 'Active'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {subscriptionData.subscription.cancelAtPeriodEnd ? 'Cancels at period end' : 'Auto-renewal enabled'}
                  </p>
                </div>
              </div>

              {subscriptionData.isExpiringSoon && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-800">
                      Your subscription expires in {subscriptionData.daysUntilExpiry} days. 
                      Consider renewing to avoid service interruption.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <Button variant="outline">
                  Upgrade Plan
                </Button>
                <Button variant="outline">
                  View Billing History
                </Button>
                <Button variant="outline">
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Subscription</h3>
              <p className="text-gray-600 mb-6">You don't have an active subscription. Choose a plan to get started.</p>
              <Button>
                View Available Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAccountSection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Account</h2>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <LogOut className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Session Management</h3>
                  <p className="text-sm text-gray-600">Sign out of your current session</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Sign Out
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Trash2 className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-red-900">Delete Account</h3>
                  <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                </div>
              </div>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile':
        return renderProfileSection();
      case 'merchant':
        return renderMerchantSection();
      case 'outlet':
        return renderOutletSection();
      case 'security':
        return renderSecuritySection();
      case 'subscription':
        return renderSubscriptionSection();
      case 'account':
        return renderAccountSection();
      default:
        return renderProfileSection();
    }
  };

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Settings</PageTitle>
          <p>Manage your account settings and preferences</p>
        </PageHeader>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading settings...</p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Show error state if user is not loaded
  if (!user) {
    return (
      <PageWrapper>
        <PageHeader>
          <PageTitle>Settings</PageTitle>
          <p>Manage your account settings and preferences</p>
        </PageHeader>
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <p className="text-red-600 mb-4">You need to be logged in to access settings</p>
            <div className="space-x-4">
              <Button onClick={() => window.location.href = '/login'}>
                Go to Login
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Settings</PageTitle>
        <p>Manage your account settings and preferences</p>
      </PageHeader>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-0">
              <nav className="space-y-1">
                {/* Debug: Show all menu items temporarily */}
                <div className="p-2 bg-yellow-100 text-xs text-yellow-800 mb-2">
                  <strong>Debug:</strong> User role: "{user?.role}" | All menu items: {settingsMenuItems.map(i => i.label).join(', ')}
                </div>
                
                {settingsMenuItems
                  .filter((item) => {
                    // Filter menu items based on user role
                    if (!item.roles) return true; // Show items without role restrictions
                    
                    // Normalize role comparison (trim whitespace, handle case)
                    const userRole = (user?.role || '').trim().toUpperCase();
                    const hasRole = item.roles.some(role => role.toUpperCase() === userRole);
                    
                    console.log('Menu item filter:', {
                      item: item.label,
                      itemId: item.id,
                      roles: item.roles,
                      userRole: user?.role,
                      normalizedUserRole: userRole,
                      userRoleType: typeof user?.role,
                      hasRole: hasRole,
                      comparison: `${userRole} in [${item.roles.map(r => r.toUpperCase()).join(', ')}]`
                    });
                    return hasRole;
                  })
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-gray-500 truncate">{item.description}</p>
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    );
                  })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <PageContent>
            {renderActiveSection()}
          </PageContent>
        </div>
      </div>

      {/* Change Password Dialog */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
              <button
                onClick={() => setShowChangePassword(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <Label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter your new password"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  placeholder="Confirm your new password"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowChangePassword(false);
                  setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                }}
                disabled={isChangingPassword}
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
              >
                {isChangingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to delete your account? This action cannot be undone and will permanently remove:
              </p>
              <ul className="mt-3 text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Your profile and personal information</li>
                <li>All your orders and transaction history</li>
                <li>Your product listings and inventory</li>
                <li>Any saved preferences and settings</li>
              </ul>
              <p className="mt-3 text-sm text-gray-600">
                <strong>This action is irreversible.</strong>
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container for notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </PageWrapper>
  );
}