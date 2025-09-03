import React, { useState, useEffect } from 'react';
import { 
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast
} from '@rentalshop/ui';
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Edit,
  Eye,
  EyeOff,
  Globe,
  Shield,
  Mail,
  Bell,
  Server,
  Building2,
  User,
  Store
} from 'lucide-react';

// Types for settings
interface Setting {
  id: number;
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  isActive: boolean;
  isReadOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SettingsManagerProps {
  userRole: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  merchantId?: string;
  outletId?: string;
  userId?: string;
  className?: string;
}

// API functions for settings
const settingsApi = {
  // System settings (Admin only)
  getSystemSettings: async (category?: string): Promise<Setting[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    
    const response = await fetch(`/api/settings/system?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch system settings');
    const data = await response.json();
    return data.data || [];
  },

  updateSystemSetting: async (id: number, updates: Partial<Setting>): Promise<Setting> => {
    const response = await fetch(`/api/settings/system/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) throw new Error('Failed to update system setting');
    const data = await response.json();
    return data.data;
  },

  createSystemSetting: async (setting: Omit<Setting, 'id' | 'createdAt' | 'updatedAt'>): Promise<Setting> => {
    const response = await fetch('/api/settings/system', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(setting)
    });
    
    if (!response.ok) throw new Error('Failed to create system setting');
    const data = await response.json();
    return data.data;
  },

  // Merchant settings
  getMerchantSettings: async (category?: string): Promise<Setting[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    
    const response = await fetch(`/api/settings/merchant?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch merchant settings');
    const data = await response.json();
    return data.data || [];
  },

  updateMerchantSetting: async (id: number, updates: Partial<Setting>): Promise<Setting> => {
    const response = await fetch(`/api/settings/merchant/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) throw new Error('Failed to update merchant setting');
    const data = await response.json();
    return data.data;
  },

  // User preferences
  getUserPreferences: async (category?: string): Promise<Setting[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    
    const response = await fetch(`/api/settings/user?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch user preferences');
    const data = await response.json();
    return data.data || [];
  },

  updateUserPreference: async (id: number, updates: Partial<Setting>): Promise<Setting> => {
    const response = await fetch(`/api/settings/user/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) throw new Error('Failed to update user preference');
    const data = await response.json();
    return data.data;
  }
};

// Setting input component
interface SettingInputProps {
  setting: Setting;
  onChange: (value: any) => void;
  disabled?: boolean;
}

function SettingInput({ setting, onChange, disabled }: SettingInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = setting.key.toLowerCase().includes('password') || setting.key.toLowerCase().includes('secret');

  switch (setting.type) {
    case 'boolean':
      return (
        <Switch
          checked={setting.value}
          onCheckedChange={onChange}
          disabled={disabled || setting.isReadOnly}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={setting.value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          disabled={disabled || setting.isReadOnly}
          className="w-full"
        />
      );

    case 'json':
      return (
        <Textarea
          value={typeof setting.value === 'string' ? setting.value : JSON.stringify(setting.value, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          disabled={disabled || setting.isReadOnly}
          className="w-full font-mono text-sm"
          rows={4}
        />
      );

    default:
      return (
        <div className="relative">
          <Input
            type={isPassword && !showPassword ? 'password' : 'text'}
            value={setting.value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled || setting.isReadOnly}
            className="w-full pr-10"
          />
          {isPassword && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
      );
  }
}

// Setting row component
interface SettingRowProps {
  setting: Setting;
  onUpdate: (id: number, updates: Partial<Setting>) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
  disabled?: boolean;
}

function SettingRow({ setting, onUpdate, onDelete, disabled }: SettingRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(setting.value);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (editedValue === setting.value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(setting.id, { value: editedValue });
      setIsEditing(false);
      toast({
        title: 'Setting updated',
        description: `${setting.key} has been updated successfully.`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Update failed',
        description: 'Failed to update setting. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedValue(setting.value);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    try {
      await onDelete(setting.id);
      toast({
        title: 'Setting deleted',
        description: `${setting.key} has been deleted successfully.`,
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Delete failed',
        description: 'Failed to delete setting. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-text-primary">{setting.key}</h4>
              <Badge variant={setting.isActive ? 'default' : 'secondary'}>
                {setting.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {setting.isReadOnly && (
                <Badge variant="outline">Read Only</Badge>
              )}
            </div>
            {setting.description && (
              <p className="text-sm text-text-secondary mb-2">{setting.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!setting.isReadOnly && (
              <>
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    disabled={disabled}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={disabled}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          {isEditing ? (
            <SettingInput
              setting={{ ...setting, value: editedValue }}
              onChange={setEditedValue}
              disabled={disabled}
            />
          ) : (
            <div className="p-3 bg-bg-secondary rounded-lg">
              <code className="text-sm">
                {setting.type === 'json' 
                  ? JSON.stringify(setting.value, null, 2)
                  : String(setting.value)
                }
              </code>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Main settings manager component
export function SettingsManager({ 
  userRole, 
  merchantId, 
  outletId, 
  userId, 
  className = '' 
}: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState('system');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Determine available tabs based on user role
  const availableTabs = React.useMemo(() => {
    const tabs = [];
    
    if (userRole === 'ADMIN') {
      tabs.push({ id: 'system', label: 'System', icon: Server });
    }
    
    if (['ADMIN', 'MERCHANT'].includes(userRole)) {
      tabs.push({ id: 'merchant', label: 'Merchant', icon: Building2 });
    }
    
    if (['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'].includes(userRole)) {
      tabs.push({ id: 'outlet', label: 'Outlet', icon: Store });
    }
    
    tabs.push({ id: 'user', label: 'User', icon: User });
    
    return tabs;
  }, [userRole]);

  // Load settings based on active tab
  const loadSettings = async (tab: string, category?: string) => {
    setLoading(true);
    try {
      let newSettings: Setting[] = [];
      
      switch (tab) {
        case 'system':
          if (userRole === 'ADMIN') {
            newSettings = await settingsApi.getSystemSettings(category);
          }
          break;
        case 'merchant':
          if (['ADMIN', 'MERCHANT'].includes(userRole)) {
            newSettings = await settingsApi.getMerchantSettings(category);
          }
          break;
        case 'user':
          newSettings = await settingsApi.getUserPreferences(category);
          break;
      }
      
      setSettings(newSettings);
    } catch (error) {
      toast({
        title: 'Failed to load settings',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update setting
  const updateSetting = async (id: number, updates: Partial<Setting>) => {
    setSaving(true);
    try {
      let updatedSetting: Setting;
      
      switch (activeTab) {
        case 'system':
          updatedSetting = await settingsApi.updateSystemSetting(id, updates);
          break;
        case 'merchant':
          updatedSetting = await settingsApi.updateMerchantSetting(id, updates);
          break;
        case 'user':
          updatedSetting = await settingsApi.updateUserPreference(id, updates);
          break;
        default:
          throw new Error('Invalid tab');
      }
      
      setSettings(prev => prev.map(s => s.id === id ? updatedSetting : s));
    } catch (error) {
      throw error;
    } finally {
      setSaving(false);
    }
  };

  // Load settings when tab changes
  useEffect(() => {
    if (availableTabs.length > 0) {
      loadSettings(activeTab);
    }
  }, [activeTab, userRole]);

  // Group settings by category
  const settingsByCategory = React.useMemo(() => {
    const grouped: { [key: string]: Setting[] } = {};
    settings.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    });
    return grouped;
  }, [settings]);

  if (availableTabs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <p className="text-text-secondary">No settings available for your role.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              {availableTabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {availableTabs.map(tab => (
              <TabsContent key={tab.id} value={tab.id} className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{tab.label} Settings</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSettings(tab.id)}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {loading ? (
                  <div className="text-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-text-secondary">Loading settings...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.keys(settingsByCategory).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-text-secondary">No settings found.</p>
                      </div>
                    ) : (
                      Object.entries(settingsByCategory).map(([category, categorySettings]) => (
                        <div key={category}>
                          <h4 className="text-md font-medium text-text-primary mb-3 capitalize">
                            {category} Settings
                          </h4>
                          <div className="space-y-2">
                            {categorySettings.map(setting => (
                              <SettingRow
                                key={setting.id}
                                setting={setting}
                                onUpdate={updateSetting}
                                disabled={saving}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
