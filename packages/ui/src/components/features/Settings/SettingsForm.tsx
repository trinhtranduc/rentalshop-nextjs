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
  Switch,
  Label,
  useToast
} from '@rentalshop/ui';
import { 
  Save, 
  X, 
  Plus,
  Settings
} from 'lucide-react';

// Types
interface SettingFormData {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  description?: string;
  isActive: boolean;
}

interface SettingsFormProps {
  settingType: 'system' | 'merchant' | 'user';
  userRole: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';
  onSave: (data: SettingFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<SettingFormData>;
  className?: string;
}

// Category options based on setting type
const getCategoryOptions = (settingType: string) => {
  switch (settingType) {
    case 'system':
      return [
        { value: 'general', label: 'General' },
        { value: 'security', label: 'Security' },
        { value: 'email', label: 'Email' },
        { value: 'notifications', label: 'Notifications' },
        { value: 'system', label: 'System' }
      ];
    case 'merchant':
      return [
        { value: 'general', label: 'General' },
        { value: 'business', label: 'Business' },
        { value: 'notifications', label: 'Notifications' },
        { value: 'integrations', label: 'Integrations' }
      ];
    case 'user':
      return [
        { value: 'general', label: 'General' },
        { value: 'ui', label: 'User Interface' },
        { value: 'notifications', label: 'Notifications' },
        { value: 'privacy', label: 'Privacy' }
      ];
    default:
      return [];
  }
};

// Type options
const typeOptions = [
  { value: 'string', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean (True/False)' },
  { value: 'json', label: 'JSON' }
];

export function SettingsForm({
  settingType,
  userRole,
  onSave,
  onCancel,
  initialData,
  className = ''
}: SettingsFormProps) {
  const [formData, setFormData] = useState<SettingFormData>({
    key: '',
    value: '',
    type: 'string',
    category: 'general',
    description: '',
    isActive: true,
    ...initialData
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const categoryOptions = getCategoryOptions(settingType);

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.key.trim()) {
      newErrors.key = 'Key is required';
    } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(formData.key)) {
      newErrors.key = 'Key must start with a letter or underscore and contain only letters, numbers, and underscores';
    }

    if (!formData.value.trim()) {
      newErrors.value = 'Value is required';
    }

    // Validate JSON if type is json
    if (formData.type === 'json') {
      try {
        JSON.parse(formData.value);
      } catch {
        newErrors.value = 'Invalid JSON format';
      }
    }

    // Validate number if type is number
    if (formData.type === 'number') {
      if (isNaN(parseFloat(formData.value))) {
        newErrors.value = 'Value must be a valid number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before saving.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      toast({
        title: 'Setting saved',
        description: 'Setting has been saved successfully.',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save setting. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof SettingFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Render value input based on type
  const renderValueInput = () => {
    switch (formData.type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.value === 'true'}
              onCheckedChange={(checked) => handleInputChange('value', checked.toString())}
            />
            <Label>{formData.value === 'true' ? 'True' : 'False'}</Label>
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={formData.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            placeholder="Enter a number"
            className={errors.value ? 'border-red-500' : ''}
          />
        );

      case 'json':
        return (
          <Textarea
            value={formData.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            placeholder='{"key": "value"}'
            className={`font-mono text-sm ${errors.value ? 'border-red-500' : ''}`}
            rows={6}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={formData.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            placeholder="Enter value"
            className={errors.value ? 'border-red-500' : ''}
          />
        );
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {initialData ? 'Edit Setting' : 'Create New Setting'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Key Field */}
          <div className="space-y-2">
            <Label htmlFor="key">Key *</Label>
            <Input
              id="key"
              value={formData.key}
              onChange={(e) => handleInputChange('key', e.target.value)}
              placeholder="setting_key_name"
              className={errors.key ? 'border-red-500' : ''}
              disabled={!!initialData} // Disable editing key for existing settings
            />
            {errors.key && (
              <p className="text-sm text-red-500">{errors.key}</p>
            )}
            <p className="text-xs text-text-secondary">
              Use lowercase letters, numbers, and underscores only. Must start with a letter or underscore.
            </p>
          </div>

          {/* Type Field */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: any) => handleInputChange('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Field */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Field */}
          <div className="space-y-2">
            <Label htmlFor="value">Value *</Label>
            {renderValueInput()}
            {errors.value && (
              <p className="text-sm text-red-500">{errors.value}</p>
            )}
            {formData.type === 'json' && (
              <p className="text-xs text-text-secondary">
                Enter valid JSON format. Use double quotes for strings.
              </p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe what this setting does..."
              rows={3}
            />
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.isActive}
              onCheckedChange={(checked) => handleInputChange('isActive', checked)}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Setting'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
