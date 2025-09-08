// ============================================================================
// RESTRICTED BUTTON COMPONENT
// ============================================================================

import React from 'react';
import { Button, ButtonProps } from '../../../ui/button';
import { useCanPerform } from '@rentalshop/hooks';
import { Lock, AlertTriangle, CreditCard, Clock } from 'lucide-react';

interface RestrictedButtonProps extends ButtonProps {
  action: 'canCreate' | 'canEdit' | 'canDelete' | 'canManageUsers' | 'canManageOutlets' | 'canManageProducts' | 'canProcessOrders';
  reason?: string;
  showTooltip?: boolean;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
}

export function RestrictedButton({
  action,
  reason,
  showTooltip = true,
  fallbackText,
  fallbackIcon,
  children,
  disabled,
  ...props
}: RestrictedButtonProps) {
  const canPerform = useCanPerform(action);
  const isDisabled = disabled || !canPerform;

  const getRestrictionIcon = () => {
    if (fallbackIcon) return fallbackIcon;
    
    // Default icons based on action type
    if (action.includes('Manage') || action.includes('Process')) {
      return <Lock className="w-4 h-4" />;
    }
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getRestrictionText = () => {
    if (fallbackText) return fallbackText;
    if (reason) return reason;
    
    // Default messages based on action type
    switch (action) {
      case 'canCreate':
        return 'Cannot create with current subscription';
      case 'canEdit':
        return 'Cannot edit with current subscription';
      case 'canDelete':
        return 'Cannot delete with current subscription';
      case 'canManageUsers':
        return 'User management not available with current subscription';
      case 'canManageOutlets':
        return 'Outlet management not available with current subscription';
      case 'canManageProducts':
        return 'Product management not available with current subscription';
      case 'canProcessOrders':
        return 'Order processing not available with current subscription';
      default:
        return 'Action not available with current subscription';
    }
  };

  return (
    <Button
      {...props}
      disabled={isDisabled}
      variant={isDisabled ? 'outline' : props.variant}
      className={`${props.className} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isDisabled && showTooltip ? getRestrictionText() : undefined}
    >
      {isDisabled && getRestrictionIcon()}
      {children}
    </Button>
  );
}

interface RestrictedActionProps {
  action: 'canCreate' | 'canEdit' | 'canDelete' | 'canManageUsers' | 'canManageOutlets' | 'canManageProducts' | 'canProcessOrders';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  reason?: string;
}

export function RestrictedAction({
  action,
  children,
  fallback,
  reason
}: RestrictedActionProps) {
  const canPerform = useCanPerform(action);

  if (!canPerform) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

interface RestrictedSectionProps {
  action: 'canCreate' | 'canEdit' | 'canDelete' | 'canManageUsers' | 'canManageOutlets' | 'canManageProducts' | 'canProcessOrders';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  reason?: string;
  className?: string;
}

export function RestrictedSection({
  action,
  children,
  fallback,
  reason,
  className = ''
}: RestrictedSectionProps) {
  const canPerform = useCanPerform(action);

  if (!canPerform) {
    return fallback ? <div className={className}>{fallback}</div> : null;
  }

  return <div className={className}>{children}</div>;
}
