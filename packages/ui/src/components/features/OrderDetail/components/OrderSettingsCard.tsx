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
  const [dragActive, setDragActive] = useState(false);
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (!isCollateralDetailsEnabled() || uploadingImage) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
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
            </div>

            {/* Security Document Image Upload - Separate Section */}
            <div>
              <Label className="text-sm font-medium text-gray-700 flex items-center mb-2">
                <ImageIcon className="w-4 h-4 mr-2" />
                {t('amount.collateralImage') || 'Security Document Image'}
                <FieldTooltip text={t('amount.tooltips.collateralImage') || t('amount.collateralImageHint') || 'Upload an image of ID card, passport, or other security document. Supported formats: JPEG, PNG, WebP. Max size: 5MB'} />
                {!isCollateralDetailsEnabled() && (
                  <span className="text-xs text-gray-500 ml-2">(Disabled for this order type/status)</span>
                )}
              </Label>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                disabled={!isCollateralDetailsEnabled() || uploadingImage}
              />

              {/* Image Preview with Upload Zone */}
              {tempSettings.collateralImageUrl ? (
                <div className="mt-2">
                  <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50 group">
                    <div className="relative">
                      <img
                        src={tempSettings.collateralImageUrl}
                        alt="Security Document"
                        className="w-full h-auto max-h-64 object-contain bg-white"
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all"
                          disabled={uploadingImage}
                          title="Remove image"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    {/* Image info bar */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-3 py-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" />
                        Security Document
                      </span>
                      <button
                        type="button"
                        onClick={() => window.open(tempSettings.collateralImageUrl, '_blank')}
                        className="text-blue-300 hover:text-blue-200 underline"
                      >
                        View full size
                      </button>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isCollateralDetailsEnabled() || uploadingImage}
                    className="mt-2 w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Replace Image
                  </Button>
                </div>
              ) : (
                <div
                  className={`
                    mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-all
                    ${!isCollateralDetailsEnabled() || uploadingImage
                      ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                      : dragActive
                      ? 'border-blue-500 bg-blue-50 border-solid'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                    }
                  `}
                  onClick={() => !uploadingImage && isCollateralDetailsEnabled() && fileInputRef.current?.click()}
                  onDragEnter={!uploadingImage && isCollateralDetailsEnabled() ? handleDrag : undefined}
                  onDragLeave={!uploadingImage && isCollateralDetailsEnabled() ? handleDrag : undefined}
                  onDragOver={!uploadingImage && isCollateralDetailsEnabled() ? handleDrag : undefined}
                  onDrop={!uploadingImage && isCollateralDetailsEnabled() ? handleDrop : undefined}
                >
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <div className="w-full max-w-xs">
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress?.percentage || 0}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          Uploading... {uploadProgress?.percentage || 0}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            {t('amount.uploadImage') || 'Upload Security Document'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Click to browse or drag & drop
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400 mt-2">
                          <span>JPEG, PNG, WebP</span>
                          <span>•</span>
                          <span>Max 5MB</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
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
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    {t('amount.collateralImage') || 'Security Document Image'}:
                  </span>
                  <div className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={settingsForm.collateralImageUrl}
                      alt="Security Document"
                      className="w-full h-auto max-h-64 object-contain bg-white"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-3 py-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" />
                        Security Document
                      </span>
                      <a
                        href={settingsForm.collateralImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-300 hover:text-blue-200 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View full size
                      </a>
                    </div>
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

