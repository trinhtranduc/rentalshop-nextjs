"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Outlets,
  OutletsLoading,
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  ConfirmationDialog,
  AddOutletDialog,
  Input,
  Label,
  Textarea,
  Button,
  LoadingIndicator,
} from "@rentalshop/ui";
import { Plus, Download } from "lucide-react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  useAuth,
  useOutletsWithFilters,
  useCanExportData,
  useCommonTranslations,
  useOutletsTranslations,
} from "@rentalshop/hooks";
import { outletsApi } from "@rentalshop/utils";
import type {
  OutletFilters,
  Outlet,
  OutletUpdateInput,
} from "@rentalshop/types";

interface OutletFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  description: string;
}

/**
 * ✅ MODERN NEXT.JS 13+ OUTLETS PAGE - URL STATE PATTERN
 */
export default function OutletsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const t = useCommonTranslations();
  const to = useOutletsTranslations();
  const canExport = useCanExportData();

  // Dialog states
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [outletToDisable, setOutletToDisable] = useState<Outlet | null>(null);
  const [formData, setFormData] = useState<OutletFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    phone: "",
    description: "",
  });

  // ============================================================================
  // URL PARAMS - Single Source of Truth
  // ============================================================================

  const search = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "25");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

  const merchantId = user?.merchant?.id || user?.merchantId;

  // ============================================================================
  // DATA FETCHING - Clean & Simple
  // ============================================================================

  // ✅ SIMPLE: Memoize filters - useDedupedApi handles deduplication
  const filters: OutletFilters = useMemo(
    () => ({
      q: search || undefined,
      merchantId: merchantId ? Number(merchantId) : undefined,
      isActive:
        status === "active" ? true : status === "inactive" ? false : undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    }),
    [search, merchantId, status, page, limit, sortBy, sortOrder]
  );

  const { data, loading, error, refetch } = useOutletsWithFilters({ filters });

  // ============================================================================
  // URL UPDATE HELPER
  // ============================================================================

  const updateURL = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        // Special handling for page: always set it, even if it's 1
        if (key === 'page') {
          const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
          if (pageNum > 0) {
            params.set(key, pageNum.toString());
          } else {
            params.delete(key);
          }
        } else if (value && value !== "" && value !== "all") {
          params.set(key, value.toString());
        } else {
          params.delete(key);
        }
      });

      const newURL = `${pathname}?${params.toString()}`;
      router.push(newURL, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSearchChange = useCallback(
    (searchValue: string) => {
      updateURL({ q: searchValue, page: 1 });
    },
    [updateURL]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateURL({ page: newPage });
    },
    [updateURL]
  );

  const handleSort = useCallback(
    (column: string) => {
      const newSortBy = column;
      const newSortOrder =
        sortBy === column && sortOrder === "asc" ? "desc" : "asc";
      updateURL({ sortBy: newSortBy, sortOrder: newSortOrder, page: 1 });
    },
    [sortBy, sortOrder, updateURL]
  );

  const handleOutletAction = useCallback(
    async (action: string, outletId: number) => {
      const outlet = data?.outlets.find((o: Outlet) => o.id === outletId);

      switch (action) {
        case "view":
          if (outlet) {
            setSelectedOutlet(outlet);
            setShowViewDialog(true);
          }
          break;

        case "edit":
          // Show edit dialog
          if (outlet) {
            setSelectedOutlet(outlet);
            setFormData({
              name: outlet.name,
              address: outlet.address || "",
              city: (outlet as any).city || "",
              state: (outlet as any).state || "",
              zipCode: (outlet as any).zipCode || "",
              country: (outlet as any).country || "",
              phone: outlet.phone || "",
              description: outlet.description || "",
            });
            setShowEditDialog(true);
          }
          break;

        case "manageBanks":
          // Navigate to bank accounts page for this outlet
          router.push(`/outlets/${outletId}/bank-accounts`);
          break;

        case "disable":
        case "enable":
          if (outlet) {
            if (outlet.isActive) {
              setOutletToDisable(outlet);
              setShowDisableConfirm(true);
            } else {
              try {
                const response = await outletsApi.updateOutlet(outletId, {
                  id: outletId,
                  isActive: true,
                });
                if (response.success) {
                  toastSuccess(
                    to("messages.enableSuccess"),
                    `${to("messages.enableSuccess")} - "${outlet.name}"`
                  );
                  refetch();
                } else {
                  toastError(
                    to("messages.enableFailed"),
                    response.error || to("messages.enableFailed")
                  );
                }
              } catch (err) {
                toastError(
                  to("messages.enableFailed"),
                  to("messages.enableFailed")
                );
              }
            }
          }
          break;

        default:
          console.log("Unknown action:", action);
      }
    },
    [data?.outlets, router, toastSuccess, toastError, refetch]
  );

  const handleConfirmDisable = useCallback(async () => {
    if (!outletToDisable) return;

    try {
      const response = await outletsApi.updateOutlet(outletToDisable.id, {
        id: outletToDisable.id,
        isActive: false,
      });
      if (response.success) {
        toastSuccess(
          to("messages.disableSuccess"),
          `${to("messages.disableSuccess")} - "${outletToDisable.name}"`
        );
        refetch();
      } else {
        toastError(
          to("messages.disableFailed"),
          response.error || to("messages.disableFailed")
        );
      }
    } catch (err) {
      toastError(to("messages.disableFailed"), to("messages.disableFailed"));
    } finally {
      setShowDisableConfirm(false);
      setOutletToDisable(null);
    }
  }, [outletToDisable, router, toastSuccess, toastError, refetch]);

  // Handle outlet update from edit dialog
  const handleOutletUpdate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedOutlet) return;

      try {
        const response = await outletsApi.updateOutlet(selectedOutlet.id, {
          id: selectedOutlet.id,
          name: formData.name,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
          phone: formData.phone,
          description: formData.description,
        });

        if (response.success) {
          toastSuccess(
            to("messages.updateSuccess"),
            `${to("messages.updateSuccess")} - "${formData.name}"`
          );
          setShowEditDialog(false);
          setSelectedOutlet(null);
          refetch();
        } else {
          toastError(
            to("messages.updateFailed"),
            response.error || to("messages.updateFailed")
          );
        }
      } catch (err) {
        toastError(to("messages.updateFailed"), to("messages.updateFailed"));
      }
    },
    [selectedOutlet, formData, router, toastSuccess, toastError, refetch]
  );

  // ============================================================================
  // TRANSFORM DATA
  // ============================================================================

  const outletData = useMemo(() => {
    if (!data) {
      return {
        outlets: [],
        total: 0,
        page: 1,
        totalPages: 1,
        limit: 25,
        hasMore: false,
      };
    }

    return {
      outlets: data.outlets,
      total: data.total,
      page: data.currentPage,
      totalPages: data.totalPages,
      limit: data.limit,
      hasMore: data.hasMore,
    };
  }, [data]);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!merchantId) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="p-8 text-center text-muted-foreground">
              <div className="mb-4">{t("messages.unauthorized")}</div>
            <div className="text-sm text-text-secondary">
                {t("messages.sessionExpired")}
              </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      spacing="none"
      className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0"
    >
      <PageHeader className="flex-shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <PageTitle>{to("title")}</PageTitle>
            <p className="text-sm text-gray-600">{to("title")}</p>
          </div>
          <div className="flex gap-3">
            {/* Export feature - temporarily hidden, will be enabled in the future */}
            {/* {canExport && (
              <Button
                onClick={() => {
                  toastSuccess('Export Feature', 'Export functionality coming soon!');
                }}
                variant="default"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                {to('actions.export')}
              </Button>
            )} */}
            <Button
              onClick={() => setShowAddDialog(true)}
              variant="default"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              {to("addOutlet")}
            </Button>
          </div>
        </div>
      </PageHeader>

      <div className="flex-1 min-h-0 overflow-auto relative">
        {/* Center Loading Indicator - Shows when waiting for API */}
        {loading && !data ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <LoadingIndicator 
              variant="circular" 
              size="lg"
              message={to('labels.loading') || 'Loading outlets...'}
            />
          </div>
        ) : (
          /* Outlets Content - Only render when data is loaded */
          <Outlets
            data={outletData}
            filters={filters}
            onSearchChange={handleSearchChange}
            onOutletAction={handleOutletAction}
            onPageChange={handlePageChange}
            onSort={handleSort}
          />
        )}
      </div>

      {/* View Outlet Dialog */}
      {selectedOutlet && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="text-lg font-semibold">
                {to("dialogs.outletDetails")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {to("dialogs.outletDetails") || "View outlet information"}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    {to("fields.name")}
                    </label>
                    <p className="text-sm font-semibold">
                    {selectedOutlet.name}
                  </p>
                </div>
                <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      {to("fields.phone")}
                    </label>
                    <p className="text-sm">
                    {selectedOutlet.phone || to("fields.notAvailable")}
                  </p>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      {to("fields.address")}
                    </label>
                    <p className="text-sm">
                    {selectedOutlet.address || to("fields.notAvailable")}
                  </p>
                </div>
                {selectedOutlet.description && (
                  <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      {to("fields.description")}
                      </label>
                      <p className="text-sm whitespace-pre-wrap">
                      {selectedOutlet.description}
                    </p>
                  </div>
                )}
              </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                >
                  {t("buttons.close")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Outlet Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-lg font-semibold">
              {to("dialogs.editOutletName").replace(
                "{name}",
                selectedOutlet?.name || ""
              )}
            </DialogTitle>
            <DialogDescription className="mt-1">
              {to("dialogs.editOutletTitle") || "Update outlet information"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOutletUpdate} className="px-6 py-4">
            <div className="space-y-4">
                <div>
                <Label htmlFor="name" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {to("fields.name")} <span className="text-red-500">*</span>
                </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={to("placeholders.enterOutletName")}
                required
              />
            </div>

            {/* Address Information */}
              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-text-primary mb-4">
                {t("labels.addressInformation")}
              </h3>

                <div className="space-y-4">
              <div>
                    <Label htmlFor="address" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {to("fields.address")}
                    </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      address: e.target.value,
                    }))
                  }
                  placeholder={to("placeholders.enterStreetAddress")}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                      <Label htmlFor="city" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        {to("fields.city")}
                      </Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    placeholder={to("placeholders.enterCity")}
                  />
                </div>

                <div>
                      <Label htmlFor="state" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        {to("fields.state")}
                      </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        state: e.target.value,
                      }))
                    }
                    placeholder={to("placeholders.enterState")}
                  />
                </div>

                <div>
                      <Label htmlFor="zipCode" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        {to("fields.zipCode")}
                      </Label>
                  <Input
                    id="zipCode"
                    value={formData.zipCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        zipCode: e.target.value,
                      }))
                    }
                    placeholder={to("placeholders.enterZipCode")}
                  />
                </div>
              </div>

              <div>
                    <Label htmlFor="country" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      {to("fields.country")}
                    </Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      country: e.target.value,
                    }))
                  }
                  placeholder={to("placeholders.enterCountry")}
                />
                  </div>
              </div>
            </div>

            <div>
                <Label htmlFor="phone" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {to("fields.phone")}
                </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder={to("placeholders.enterOutletPhone")}
              />
            </div>

            <div>
                <Label htmlFor="description" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  {to("fields.description")}
                </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={to("placeholders.enterOutletDescription")}
                rows={3}
              />
            </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false);
                      setSelectedOutlet(null);
                    }}
                  >
                    {t("buttons.cancel")}
                  </Button>
                  <Button type="submit">{to("actions.editOutlet")}</Button>
                </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Outlet Dialog */}
      <AddOutletDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        merchantId={merchantId}
        onOutletCreated={async (outletData) => {
          try {
            const response = await outletsApi.createOutlet({
              ...outletData,
              merchantId: merchantId || 0,
            });

            if (response.success) {
              toastSuccess(
                to("messages.createSuccess"),
                to("messages.createSuccess")
              );
              refetch();
            } else {
              throw new Error(response.error || to("messages.createFailed"));
            }
          } catch (error) {
            console.error("Error creating outlet:", error);
            toastError(
              t("labels.error"),
              error instanceof Error
                ? error.message
                : to("messages.createFailed")
            );
            throw error;
          }
        }}
        onError={(error) => {
          toastError(t("labels.error"), error);
        }}
      />

      {/* Disable Confirmation Dialog */}
      <ConfirmationDialog
        open={showDisableConfirm}
        onOpenChange={setShowDisableConfirm}
        type="warning"
        title={to("actions.deleteOutlet")}
        description={to("messages.confirmDelete")}
        confirmText={to("actions.deleteOutlet")}
        cancelText={t("buttons.cancel")}
        onConfirm={handleConfirmDisable}
        onCancel={() => {
          setShowDisableConfirm(false);
          setOutletToDisable(null);
        }}
      />
    </PageWrapper>
  );
}
