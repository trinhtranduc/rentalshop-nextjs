'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@rentalshop/ui';
import { DashboardWrapper } from '@rentalshop/ui';
import { useAuth } from '../../hooks/useAuth';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const handleSave = async () => {
    try {
      const { authenticatedFetch } = await import('@rentalshop/utils');

      const response = await authenticatedFetch('/api/users/profile', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update local storage with new user data
          localStorage.setItem('user', JSON.stringify(data.data));
          setIsEditing(false);
          alert('Cập nhật thông tin thành công!');
        }
      } else {
        alert('Có lỗi xảy ra khi cập nhật thông tin');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Có lỗi xảy ra khi cập nhật thông tin');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DashboardWrapper user={user} onLogout={logout} currentPath="/profile">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Personal Profile</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Personal Information</CardTitle>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-2xl">
                    {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {user?.name || 'User'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.name || 'Not updated'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.email || 'Not updated'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="text-gray-900">{user?.phone || 'Not updated'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <p className="text-gray-900">
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'User'}
                  </p>
                </div>
              </div>

              {/* Save Button */}
              {isEditing && (
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Change Password</h4>
                  <p className="text-sm text-gray-500">Update your account password</p>
                </div>
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Protect your account with 2FA</p>
                </div>
                <Button variant="outline" size="sm">
                  Setup
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </DashboardWrapper>
  );
} 