'use client';

import React from 'react';
import { Button } from '../../../ui/button';
import { LucideIcon } from 'lucide-react';

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  className?: string;
}

export default function ActionButton({
  icon: Icon,
  label,
  onClick,
  variant = 'outline',
  size = 'sm',
  disabled = false,
  className = ''
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
