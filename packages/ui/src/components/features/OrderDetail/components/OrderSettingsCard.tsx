import React, { useState, useRef, useEffect } from 'react';
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
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
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
  notesImages?: string[];
  pickupNotes?: string;
  pickupNotesImages?: string[];
  returnNotes?: string;
  returnNotesImages?: string[];
  damageNotes?: string;
  damageNotesImages?: string[];
}

export interface OrderNotesPendingFiles {
  notesImages?: File[];
  pickupNotesImages?: File[];
  returnNotesImages?: File[];
  damageNotesImages?: File[];
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
  onSaveSettings: (settings: SettingsForm, pendingFiles?: OrderNotesPendingFiles) => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  collateralTypes: string[];
}

const toImagesArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Shows a thumbnail for a pending File using object URL; revokes on unmount. Click to preview, X to remove. */
const PendingFilePreview: React.FC<{
  file: File;
  index: number;
  onPreview?: (url: string) => void;
  onRemove?: () => void;
}> = ({ file, index, onPreview, onRemove }) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) {
      setLoadError(true);
      return;
    }
    try {
      const url = URL.createObjectURL(file);
      setObjectUrl(url);
      setLoadError(false);
      return () => URL.revokeObjectURL(url);
    } catch {
      setLoadError(true);
    }
  }, [file]);
  if (loadError)
    return (
      <div className="relative group w-14 h-14 flex-shrink-0">
        <div className="w-14 h-14 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-500 p-1 text-center">
          {file.name}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 z-10"
            aria-label="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  if (!objectUrl) return <div className="w-14 h-14 rounded border border-dashed border-gray-300 bg-gray-50 animate-pulse flex-shrink-0" />;
  return (
    <div className="relative group w-14 h-14 flex-shrink-0">
      <button
        type="button"
        onClick={() => onPreview?.(objectUrl)}
        className="block w-14 h-14 rounded border border-dashed border-gray-300 overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary p-0"
      >
        <img src={objectUrl} alt={file.name} className="w-full h-full object-cover" onError={() => setLoadError(true)} />
      </button>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 z-10"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

const MAX_NOTES_IMAGES = 3;

const NotesImagesField: React.FC<{
  label: string;
  images: string[];
  pendingFiles?: File[];
  onRemoveUrl: (url: string) => void;
  onRemovePendingFile?: (index: number) => void;
  onAddFiles: (files: File[]) => void;
  onPreviewImage?: (url: string) => void;
  maxImages?: number;
}> = ({ label, images, pendingFiles = [], onRemoveUrl, onRemovePendingFile, onAddFiles, onPreviewImage, maxImages = MAX_NOTES_IMAGES }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const totalCount = images.length + pendingFiles.length;
  const canAddMore = totalCount < maxImages;
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (!files.length || !canAddMore) return;
    const remaining = maxImages - totalCount;
    const toAdd = files.slice(0, remaining);
    if (toAdd.length) onAddFiles(toAdd);
  };
  return (
    <div>
      <Label className="text-sm font-medium text-gray-700">{label}</Label>
      {maxImages < Infinity && (
        <span className="text-xs text-gray-500 ml-2">({totalCount}/{maxImages})</span>
      )}
      <div className="mt-1 flex flex-wrap gap-2">
        {images.map((url, i) => (
          <div key={`${url}-${i}`} className="relative group">
            <button
              type="button"
              onClick={() => onPreviewImage?.(url)}
              className="block w-14 h-14 rounded border border-gray-200 overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary p-0"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemoveUrl(url); }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 group-hover:opacity-100 z-10"
              aria-label="Remove"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {pendingFiles.map((f, i) => (
          <PendingFilePreview
            key={`pending-${i}-${f.name}-${f.size}-${f.lastModified}`}
            file={f}
            index={i}
            onPreview={onPreviewImage}
            onRemove={onRemovePendingFile ? () => onRemovePendingFile(i) : undefined}
          />
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-14 h-14 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-50"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

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
  const [pendingNewFiles, setPendingNewFiles] = useState<OrderNotesPendingFiles>({});
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewIsBlob, setPreviewIsBlob] = useState(false);

  useEffect(() => {
    if (!isEditingSettings) setPendingNewFiles({});
  }, [isEditingSettings]);

  const handlePreviewImage = (url: string) => {
    setPreviewIsBlob(url.startsWith('blob:'));
    setPreviewImageUrl(url);
  };

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

            {/* Security Document Image Upload - HIDDEN */}
            {/* <div>
              ... collateral image upload section ...
            </div> */}

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

            {/* Notes images (General) - only notesImages supported for now */}
            <NotesImagesField
              label="Notes images"
              images={toImagesArray(tempSettings.notesImages)}
              pendingFiles={pendingNewFiles.notesImages}
              onRemoveUrl={(url) =>
                onSettingsChange({
                  notesImages: toImagesArray(tempSettings.notesImages).filter((u) => u !== url)
                })
              }
              onRemovePendingFile={(index) =>
                setPendingNewFiles((prev) => ({
                  ...prev,
                  notesImages: (prev.notesImages || []).filter((_, i) => i !== index)
                }))
              }
              onAddFiles={(files) =>
                setPendingNewFiles((prev) => ({
                  ...prev,
                  notesImages: [...(prev.notesImages || []), ...files]
                }))
              }
              onPreviewImage={handlePreviewImage}
            />
            {/* TODO: re-enable when supporting pickup/return/damage note images
            <NotesImagesField
              label="Pickup notes images"
              images={toImagesArray(tempSettings.pickupNotesImages)}
              pendingFiles={pendingNewFiles.pickupNotesImages}
              onRemoveUrl={(url) =>
                onSettingsChange({
                  pickupNotesImages: toImagesArray(tempSettings.pickupNotesImages).filter((u) => u !== url)
                })
              }
              onAddFiles={(files) =>
                setPendingNewFiles((prev) => ({
                  ...prev,
                  pickupNotesImages: [...(prev.pickupNotesImages || []), ...files]
                }))
              }
            />
            <NotesImagesField
              label="Return notes images"
              images={toImagesArray(tempSettings.returnNotesImages)}
              pendingFiles={pendingNewFiles.returnNotesImages}
              onRemoveUrl={(url) =>
                onSettingsChange({
                  returnNotesImages: toImagesArray(tempSettings.returnNotesImages).filter((u) => u !== url)
                })
              }
              onAddFiles={(files) =>
                setPendingNewFiles((prev) => ({
                  ...prev,
                  returnNotesImages: [...(prev.returnNotesImages || []), ...files]
                }))
              }
            />
            <NotesImagesField
              label="Damage notes images"
              images={toImagesArray(tempSettings.damageNotesImages)}
              pendingFiles={pendingNewFiles.damageNotesImages}
              onRemoveUrl={(url) =>
                onSettingsChange({
                  damageNotesImages: toImagesArray(tempSettings.damageNotesImages).filter((u) => u !== url)
                })
              }
              onAddFiles={(files) =>
                setPendingNewFiles((prev) => ({
                  ...prev,
                  damageNotesImages: [...(prev.damageNotesImages || []), ...files]
                }))
              }
            />
            */}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onSaveSettings(tempSettings, pendingNewFiles)}
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
              {/* Security Document Image - HIDDEN */}
              {/* {settingsForm.collateralImageUrl && (
                <div className="flex flex-col gap-2">
                  ... collateral image display ...
                </div>
              )} */}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t('detail.notes')}:</span>
                <span className="text-sm font-medium">{settingsForm.notes || t('detail.noNotes')}</span>
              </div>
              {/* Notes images - show thumbnails and allow click to preview */}
              {toImagesArray(settingsForm.notesImages).length > 0 && (
                <div className="mt-3">
                  <span className="text-sm text-gray-600 block mb-2">Notes images</span>
                  <div className="flex flex-wrap gap-2">
                    {toImagesArray(settingsForm.notesImages).map((url, i) => (
                      <button
                        key={`${url}-${i}`}
                        type="button"
                        onClick={() => handlePreviewImage(url)}
                        className="w-14 h-14 rounded border border-gray-200 overflow-hidden bg-gray-100 cursor-pointer hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary p-0 flex-shrink-0"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

      {/* Big image preview modal */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] w-auto overflow-auto"
          onPointerDownOutside={() => setPreviewImageUrl(null)}
          onInteractOutside={() => setPreviewImageUrl(null)}
        >
          <DialogHeader>
            <DialogTitle className="sr-only">Preview</DialogTitle>
          </DialogHeader>
          {previewImageUrl && (
            <div className="flex flex-col items-center gap-3">
              <img
                src={previewImageUrl}
                alt="Preview"
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain"
              />
              {!previewIsBlob && (
                <a
                  href={previewImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {t('detail.openInNewTab') || 'Open in new tab'}
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

