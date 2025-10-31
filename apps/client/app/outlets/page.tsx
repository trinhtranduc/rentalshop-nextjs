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
  ConfirmationDialog,
  AddOutletDialog,
  Card,
  CardContent,
  Input,
  Label,
  Textarea,
  Button,
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
        if (value && value !== "" && value !== "all") {
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
          <Card>
            <CardContent className="p-8 text-center text-gray-600">
              <div className="mb-4">{t("messages.unauthorized")}</div>
              <div className="text-sm text-gray-500">
                {t("messages.sessionExpired")}
              </div>
            </CardContent>
          </Card>
        </PageContent>
      </PageWrapper>
    );
  }

  if (loading && !data) {
    return (
      <PageWrapper
        spacing="none"
        className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0"
      >
        <PageHeader className="flex-shrink-0">
          <PageTitle>{to("title")}</PageTitle>
          <p className="text-sm text-gray-600">
            {to("messages.loadingOutlets")}
          </p>
        </PageHeader>
        <OutletsLoading />
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

      <div className="flex-1 min-h-0 overflow-auto">
        <Outlets
          data={outletData}
          filters={filters}
          onSearchChange={handleSearchChange}
          onOutletAction={handleOutletAction}
          onPageChange={handlePageChange}
          onSort={handleSort}
        />
      </div>

      {/* View Outlet Dialog */}
      {selectedOutlet && (
        <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{to("dialogs.outletDetails")}</DialogTitle>
            </DialogHeader>
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {to("fields.name")}
                  </p>
                  <p className="mt-1 text-gray-900 font-medium">
                    {selectedOutlet.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{to("fields.phone")}</p>
                  <p className="mt-1 text-gray-900">
                    {selectedOutlet.phone || to("fields.notAvailable")}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-700">{to("fields.address")}</p>
                  <p className="mt-1 text-gray-900">
                    {selectedOutlet.address || to("fields.notAvailable")}
                  </p>
                </div>
                {selectedOutlet.description && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-700">
                      {to("fields.description")}
                    </p>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {selectedOutlet.description}
                    </p>
                  </div>
                )}
              </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Outlet Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {to("dialogs.editOutletName").replace(
                "{name}",
                selectedOutlet?.name || ""
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOutletUpdate}>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="name">{to("fields.name")} *</Label>
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
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("labels.addressInformation")}
              </h3>

              <div>
                <Label htmlFor="address">{to("fields.address")}</Label>
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
                  <Label htmlFor="city">{to("fields.city")}</Label>
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
                  <Label htmlFor="state">{to("fields.state")}</Label>
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
                  <Label htmlFor="zipCode">{to("fields.zipCode")}</Label>
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
                <Label htmlFor="country">{to("fields.country")}</Label>
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

            <div>
              <Label htmlFor="phone">{to("fields.phone")}</Label>
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
              <Label htmlFor="description">{to("fields.description")}</Label>
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

                <div className="flex items-center justify-end gap-3 border-t pt-4">
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
              </CardContent>
            </Card>
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
