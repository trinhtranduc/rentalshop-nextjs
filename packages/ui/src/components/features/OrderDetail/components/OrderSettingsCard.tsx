import React, { useState, useRef } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  FieldTooltip,
  useToast
} from '@rentalshop/ui';
import { Settings, Save, Edit, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useOrderTranslations } from '@rentalshop/hooks';
import { useFormatCurrency } from '@rentalshop/ui';
import { uploadImage, getAuthToken, type UploadProgress } from '@rentalshop/utils';
import type { OrderWithDetails } from '@rentalshop/types';

interface SettingsForm {
  damageFee: number;
  securityDeposit: number;
  collateralType: string;
  collateralDetails: string;
  collateralImageUrl?: string;
  notes: string;
}

interface OrderSettingsCardProps {
  order: OrderWithDetails;
  settingsForm: SettingsForm;
  tempSettings: SettingsForm;
  isEditingSettings: boolean;
  isSavingSettings: boolean;
  loading: boolean;
  isDamageFeeEnabled: () => boolean;
  isSecurityDepositEnabled: () => boolean;
  isCollateralTypeEnabled: () => boolean;
  isCollateralDetailsEnabled: () => boolean;
  onSettingsChange: (updates: Partial<SettingsForm>) => void;
  onSaveSettings: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  collateralTypes: string[];
}

export const OrderSettingsCard: React.FC<OrderSettingsCardProps> = ({
  order,
  settingsForm,
  tempSettings,
  isEditingSettings,
  isSavingSettings,
  loading,
  isDamageFeeEnabled,
  isSecurityDepositEnabled,
  isCollateralTypeEnabled,
  isCollateralDetailsEnabled,
  onSettingsChange,
  onSaveSettings,
  onCancelEdit,
  onStartEdit,
  collateralTypes
}) => {
  const t = useOrderTranslations();
  const formatMoney = useFormatCurrency();
  const { toastSuccess, toastError } = useToast();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toastError('Invalid file type. Please upload an image.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toastError('Image size must be less than 5MB.');
      return;
    }

    setUploadingImage(true);
    setUploadProgress({ loaded: 0, total: file.size, percentage: 0, stage: 'uploading' });

    try {
      const token = await getAuthToken();
      if (!token) {
        toastError('Authentication required. Please log in.');
        return;
      }

      const result = await uploadImage(file, token, {
        folder: 'collateral',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        enableCompression: true,
        compressionQuality: 0.8,
        maxSizeMB: 2, // Max 2MB after compression
        onProgress: (progress: UploadProgress) => {
          setUploadProgress(progress);
        },
      });

      if (result.success && result.data?.url) {
        onSettingsChange({ collateralImageUrl: result.data.url });
        toastSuccess('Image uploaded successfully!');
      } else {
        toastError(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toastError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
      setUploadProgress(null);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleRemoveImage = () => {
    onSettingsChange({ collateralImageUrl: '' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          {t('detail.orderSettings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditingSettings ? (
          <>
            {/* Damage Fee - Conditionally enabled based on order type and status */}
            <div>
              <Label htmlFor="damageFee" className="text-sm font-medium text-gray-700 flex items-center">
                {t('amount.damageFee')}
                <FieldTooltip text={t('amount.tooltips.damageFee')} />
                {!isDamageFeeEnabled() && (
                  <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                )}
              </Label>
              <Input
                id="damageFee"
                type="number"
                min="0"
                step="0.01"
                value={tempSettings.damageFee || 0}
                onChange={(e) => onSettingsChange({ damageFee: parseFloat(e.target.value) || 0 })}
                className="mt-1"
                placeholder="0"
                disabled={!isDamageFeeEnabled()}
              />
            </div>

            {/* Security Deposit - Conditionally enabled based on order type and status */}
            <div>
              <Label htmlFor="securityDeposit" className="text-sm font-medium text-gray-700 flex items-center">
                {t('amount.securityDeposit')}
                <FieldTooltip text={t('amount.tooltips.securityDeposit')} />
                {!isSecurityDepositEnabled() && (
                  <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                )}
              </Label>
              <Input
                id="securityDeposit"
                type="number"
                min="0"
                step="0.01"
                value={tempSettings.securityDeposit || 0}
                onChange={(e) => onSettingsChange({ securityDeposit: parseFloat(e.target.value) || 0 })}
                className="mt-1"
                placeholder="0"
                disabled={!isSecurityDepositEnabled()}
              />
            </div>

            {/* Collateral Type - Conditionally enabled based on order type and status */}
            <div>
              <Label htmlFor="collateralType" className="text-sm font-medium text-gray-700 flex items-center">
                {t('amount.collateralType')}
                <FieldTooltip text={t('amount.tooltips.collateralType')} />
                {!isCollateralTypeEnabled() && (
                  <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                )}
              </Label>
              <Select 
                onValueChange={(value) => onSettingsChange({ collateralType: value })} 
                value={tempSettings.collateralType || ''} 
                onOpenChange={onStartEdit}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('messages.selectCollateralType')} />
                </SelectTrigger>
                <SelectContent>
                  {collateralTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Collateral Details - Conditionally enabled based on order type and status */}
            <div>
              <Label htmlFor="collateralDetails" className="text-sm font-medium text-gray-700 flex items-center">
                {t('amount.collateralDetails')}
                <FieldTooltip text={t('amount.tooltips.collateralDetails')} />
                {!isCollateralDetailsEnabled() && (
                  <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                )}
              </Label>
              <Input
                id="collateralDetails"
                type="text"
                value={tempSettings.collateralDetails || ''}
                onChange={(e) => onSettingsChange({ collateralDetails: e.target.value })}
                className="mt-1"
                placeholder={t('messages.enterCollateralDetails')}
                disabled={!isCollateralDetailsEnabled()}
              />
              
              {/* Image Upload Section */}
              <div className="mt-3">
                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                  {t('amount.collateralImage') || 'Collateral Image (e.g., ID Card)'}
                </Label>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={!isCollateralDetailsEnabled() || uploadingImage}
                />

                {/* Image Preview */}
                {tempSettings.collateralImageUrl && (
                  <div className="relative mb-2">
                    <div className="relative w-full max-w-xs border border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={tempSettings.collateralImageUrl}
                        alt="Collateral"
                        className="w-full h-auto max-h-48 object-contain"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        disabled={uploadingImage}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                {!tempSettings.collateralImageUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isCollateralDetailsEnabled() || uploadingImage}
                    className="w-full sm:w-auto"
                  >
                    {uploadingImage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t('amount.uploadImage') || 'Upload Image'}
                      </>
                    )}
                  </Button>
                )}

                {/* Upload Progress */}
                {uploadProgress && uploadingImage && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {uploadProgress.percentage}% uploaded
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-1">
                  {t('amount.collateralImageHint') || 'Upload an image of ID card or other collateral document. Max size: 5MB'}
                </p>
              </div>
            </div>

            {/* Order Notes */}
            <div>
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                {t('detail.notes')}
              </Label>
              <Textarea
                id="notes"
                value={tempSettings.notes || ''}
                onChange={(e) => onSettingsChange({ notes: e.target.value })}
                rows={3}
                className="mt-1"
                placeholder={t('messages.enterOrderNotes')}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={onSaveSettings}
                disabled={loading || isSavingSettings}
                className="flex-1 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSavingSettings ? t('detail.saving') : t('detail.saveChanges')}
              </Button>
              <Button
                variant="outline"
                onClick={onCancelEdit}
                className="flex-1"
              >
                {t('detail.cancel')}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Display Mode */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  {t('amount.damageFee')}:
                  <FieldTooltip text={t('amount.tooltips.damageFee')} />
                </span>
                <span className="text-sm font-medium">
                  {isDamageFeeEnabled() 
                    ? formatMoney(settingsForm.damageFee || 0)
                    : <span className="text-gray-400 italic">Disabled</span>
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  {t('amount.securityDeposit')}:
                  <FieldTooltip text={t('amount.tooltips.securityDeposit')} />
                </span>
                <span className="text-sm font-medium">
                  {isSecurityDepositEnabled() 
                    ? formatMoney(settingsForm.securityDeposit || 0)
                    : <span className="text-gray-400 italic">Disabled</span>
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  {t('amount.collateralType')}:
                  <FieldTooltip text={t('amount.tooltips.collateralType')} />
                </span>
                <span className="text-sm font-medium">
                  {isCollateralTypeEnabled() 
                    ? (settingsForm.collateralType || 'Not specified')
                    : <span className="text-gray-400 italic">Disabled</span>
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 flex items-center">
                  {t('amount.collateralDetails')}:
                  <FieldTooltip text={t('amount.tooltips.collateralDetails')} />
                </span>
                <span className="text-sm font-medium">
                  {isCollateralDetailsEnabled() 
                    ? (settingsForm.collateralDetails || t('detail.noDetails'))
                    : <span className="text-gray-400 italic">Disabled</span>
                  }
                </span>
              </div>
              {settingsForm.collateralImageUrl && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-gray-600">
                    {t('amount.collateralImage') || 'Collateral Image'}:
                  </span>
                  <div className="relative w-full max-w-xs border border-gray-300 rounded-lg overflow-hidden">
                    <img
                      src={settingsForm.collateralImageUrl}
                      alt="Collateral"
                      className="w-full h-auto max-h-48 object-contain"
                    />
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.notes')}:</span>
                <span className="text-sm font-medium">{settingsForm.notes || t('detail.noNotes')}</span>
              </div>
            </div>

            {/* Edit Button */}
            <Button
              variant="outline"
              onClick={onStartEdit}
              className="w-full flex items-center gap-2 mt-4"
            >
              <Edit className="w-4 h-4" />
              {t('detail.editSettings')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

