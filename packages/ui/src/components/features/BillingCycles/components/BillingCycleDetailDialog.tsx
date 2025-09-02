"use client"

import React, { useState } from 'react';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Card,
  CardContent,
  Button,
  Badge,
  StatusBadge,
  Switch,
  Label
} from '@rentalshop/ui';
import { 
  Calendar,
  Percent,
  Clock,
  Edit,
  Save,
  X,
  Info,
  DollarSign,
  Trash2
} from 'lucide-react';

// Local type definitions
interface BillingCycle {
  id: number;
  name: string;
  value: string;
  months: number;
  discount: number;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface BillingCycleDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingCycle: BillingCycle | null;
  onToggleStatus?: (billingCycle: BillingCycle) => void;
  onEdit?: (billingCycle: BillingCycle) => void;
  onDelete?: (billingCycle: BillingCycle) => void;
  loading?: boolean;
}

export const BillingCycleDetailDialog: React.FC<BillingCycleDetailDialogProps> = ({
  open,
  onOpenChange,
  billingCycle,
  onToggleStatus,
  onEdit,
  onDelete,
  loading = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempStatus, setTempStatus] = useState(billingCycle?.isActive ?? false);

  // Update temp status when billing cycle changes
  React.useEffect(() => {
    setTempStatus(billingCycle?.isActive ?? false);
  }, [billingCycle]);

  const handleToggleStatus = () => {
    if (billingCycle && onToggleStatus) {
      onToggleStatus(billingCycle);
    }
  };

  const handleEdit = () => {
    if (billingCycle && onEdit) {
      onEdit(billingCycle);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (billingCycle && onDelete) {
      onDelete(billingCycle);
      onOpenChange(false);
    }
  };

  const handleSaveStatus = () => {
    setTempStatus(!tempStatus);
    handleToggleStatus();
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setTempStatus(billingCycle?.isActive ?? false);
    setIsEditing(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!billingCycle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                Billing Cycle Details
              </DialogTitle>
              <DialogDescription className="text-sm text-text-secondary mt-1">
                View and manage billing cycle information
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-text-tertiary" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Name</Label>
                  <p className="text-lg font-semibold text-text-primary mt-1">{billingCycle.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Value</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className="font-mono text-sm">
                      {billingCycle.value}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Description</Label>
                  <p className="text-text-primary mt-1">
                    {billingCycle.description || 'No description provided'}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Sort Order</Label>
                  <p className="text-text-primary mt-1">{billingCycle.sortOrder}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Details */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-text-tertiary" />
                Billing Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Billing Period</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-text-tertiary" />
                    <span className="text-lg font-semibold text-text-primary">
                      {billingCycle.months}
                    </span>
                    <span className="text-text-secondary">
                      {billingCycle.months === 1 ? 'month' : 'months'}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Discount</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Percent className="w-4 h-4 text-text-tertiary" />
                    {billingCycle.discount > 0 ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                        {billingCycle.discount}% off
                      </Badge>
                    ) : (
                      <span className="text-text-tertiary">No discount</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Management */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-text-tertiary" />
                Status Management
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-text-secondary">Current Status</Label>
                    <div className="mt-1">
                      <StatusBadge status={billingCycle.isActive ? 'active' : 'inactive'} />
                    </div>
                  </div>
                  {onToggleStatus && (
                    <div className="flex items-center gap-4">
                      {isEditing ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={tempStatus}
                              onCheckedChange={setTempStatus}
                              disabled={loading}
                            />
                            <Label className="text-sm">
                              {tempStatus ? 'Active' : 'Inactive'}
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveStatus}
                              disabled={loading}
                              className="flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={loading}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                          disabled={loading}
                        >
                          Change Status
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-medium text-text-primary mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-text-tertiary" />
                Timestamps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Created</Label>
                  <p className="text-text-primary mt-1">{formatDate(billingCycle.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-text-secondary">Last Updated</Label>
                  <p className="text-text-primary mt-1">{formatDate(billingCycle.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
