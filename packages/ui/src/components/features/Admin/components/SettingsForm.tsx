'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Select } from '../../../ui/select';
import { Textarea } from '../../../ui/textarea';
import { Switch } from '../../../ui/switch';
import { LucideIcon } from 'lucide-react';

interface FormField {
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'switch';
  name: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
  rows?: number;
}

interface SettingsFormProps {
  title: string;
  fields: FormField[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
  className?: string;
}

export default function SettingsForm({
  title,
  fields,
  values,
  onChange,
  onSave,
  onReset,
  saving = false,
  className = ''
}: SettingsFormProps) {
  const renderField = (field: FormField) => {
    const commonProps = {
      value: values[field.name] || '',
      onChange: (e: any) => onChange(field.name, e.target.value),
      placeholder: field.placeholder,
      required: field.required,
      min: field.min,
      max: field.max
    };

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={field.rows || 3}
            onChange={(e) => onChange(field.name, e.target.value)}
          />
        );

      case 'select':
        return (
          <Select
            value={values[field.name] || ''}
            onValueChange={(value) => onChange(field.name, value)}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case 'switch':
        return (
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-text-secondary">
                {field.label}
              </label>
              {field.description && (
                <p className="text-xs text-text-tertiary">{field.description}</p>
              )}
            </div>
            <Switch
              checked={values[field.name] || false}
              onCheckedChange={(checked) => onChange(field.name, checked)}
            />
          </div>
        );

      default:
        return <Input {...commonProps} type={field.type} />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReset}>
              Reset
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {fields.map((field) => (
            <div key={field.name}>
              {field.type !== 'switch' && (
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}
              {renderField(field)}
              {field.description && field.type !== 'switch' && (
                <p className="text-xs text-text-tertiary mt-1">{field.description}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
