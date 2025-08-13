'use client';

import React from 'react';
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
  Badge
} from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';
import { useState } from 'react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // TODO: Implement profile update API call
      console.log('Saving profile:', formData);
      setIsEditing(false);
      // You can add a success message here
    } catch (error) {
      console.error('Error saving profile:', error);
      // You can add an error message here
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setIsEditing(false);
  };

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle>Settings</PageTitle>
        <p>Manage your account settings and profile information</p>
      </PageHeader>

      <PageContent>
        {/* Profile Section */}
        <PageSection title="Profile Information">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} variant="default">
                      Save Changes
                    </Button>
                    <Button onClick={handleCancel} variant="outline">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.name || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email address"
                    />
                  ) : (
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.email || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                      {user?.phone || 'Not provided'}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </Label>
                  <p className="text-gray-900 py-2 px-3 bg-gray-50 rounded-md">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Security Section */}
        <PageSection title="Security">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Password</h4>
                  <p className="text-gray-600 mb-3">Change your password to keep your account secure.</p>
                  <Button variant="outline">
                    Change Password
                  </Button>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Two-Factor Authentication</h4>
                  <p className="text-gray-600 mb-3">Add an extra layer of security to your account.</p>
                  <Button variant="outline">
                    Enable 2FA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Account Section */}
        <PageSection title="Account">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Account Status</h4>
                  <p className="text-gray-600 mb-3">Your account is currently active and in good standing.</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Session Management</h4>
                  <p className="text-gray-600 mb-3">Manage your current session and sign out when you're done.</p>
                  <form action="/api/auth/logout" method="POST" className="inline">
                    <button 
                      type="submit" 
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-md transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </form>
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-2">Danger Zone</h4>
                  <p className="text-gray-600 mb-3">Permanently delete your account and all associated data.</p>
                  <Button variant="destructive">
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* Subscription & Plan Section */}
        <PageSection title="Subscription & Plan">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-6">
                {/* Current Plan */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Current Plan</h4>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-xl font-semibold text-blue-900">Professional Plan</h5>
                        <p className="text-blue-700 text-sm">Full access to all features</p>
                      </div>
                      <Badge variant="default" className="bg-blue-600 text-white">
                        Active
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Plan Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h6 className="font-medium text-gray-900 mb-2">Plan Duration</h6>
                    <p className="text-2xl font-bold text-gray-900">12 Months</p>
                    <p className="text-sm text-gray-600">Annual subscription</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h6 className="font-medium text-gray-900 mb-2">Start Date</h6>
                    <p className="text-2xl font-bold text-gray-900">Jan 15, 2024</p>
                    <p className="text-sm text-gray-600">Subscription began</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h6 className="font-medium text-gray-900 mb-2">End Date</h6>
                    <p className="text-2xl font-bold text-gray-900">Jan 15, 2025</p>
                    <p className="text-sm text-gray-600">Next renewal</p>
                  </div>
                </div>

                {/* Plan Features */}
                <div>
                  <h6 className="font-medium text-gray-900 mb-3">Plan Features</h6>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Unlimited products and orders
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Advanced analytics dashboard
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Priority customer support
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      API access and integrations
                    </div>
                  </div>
                </div>

                {/* Plan Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button variant="outline">
                    Upgrade Plan
                  </Button>
                  <Button variant="outline">
                    View Billing History
                  </Button>
                  <Button variant="outline">
                    Cancel Subscription
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>

        {/* System Settings Section */}
        <PageSection title="System Settings">
          <Card>
            <CardContent className="p-6">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 0 11-6 0 3 0 016 0z" />
                </svg>
                <h3 className="text-lg font-medium mb-2">Advanced Settings Coming Soon</h3>
                <p>Advanced system configuration options will be available in future updates.</p>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </PageContent>
    </PageWrapper>
  );
} 