'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Textarea,
  Badge,
  useToast,
  ConfirmationDialog,
  Breadcrumb,
  Pagination,
} from '@rentalshop/ui';
import type { BreadcrumbItem } from '@rentalshop/ui';
import { Plus, Edit, Trash2, X, Check } from 'lucide-react';
import { planLimitAddonsApi, merchantsApi, formatInShopZone } from '@rentalshop/utils';
import type { PlanLimitAddon, PlanLimitAddonCreateInput, PlanLimitAddonUpdateInput } from '@rentalshop/types';

// dd/MM/yyyy HH:mm on the Vietnam day
const formatAddonDate = (value: string | Date) =>
  `${formatInShopZone(value, 'vi', { year: 'numeric', month: '2-digit', day: '2-digit' })} ${formatInShopZone(value, 'vi', { hour: '2-digit', minute: '2-digit', hour12: false })}`;

// Create / edit dialog: full screen below 768 px with the fixed footer, unchanged from 768 px
const PHONE_DIALOG = 'max-w-2xl max-md:h-[100dvh] max-md:max-h-[100dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:border-0 max-md:top-0 max-md:left-0 max-md:translate-x-0 max-md:translate-y-0 max-md:p-4 max-md:pb-0 max-md:gap-0 max-md:overflow-hidden max-md:flex max-md:flex-col max-md:[&>button]:right-1.5 max-md:[&>button]:top-1.5 max-md:[&>button]:p-3.5';
const PHONE_FORM = 'space-y-4 max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:space-y-0';
const PHONE_FIELDS = 'space-y-4 max-md:[&_input:not([type=checkbox])]:min-h-11 max-md:[&_textarea]:min-h-11 max-md:[&_label:has(input)]:flex max-md:[&_label:has(input)]:min-h-11 max-md:min-h-0 max-md:flex-1 max-md:overflow-y-auto max-md:pb-4';
const PHONE_FOOTER = 'flex justify-end gap-2 max-md:shrink-0 max-md:-mx-4 max-md:border-t max-md:bg-bg-card max-md:px-4 max-md:pt-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:[&_button]:min-h-11 max-md:[&>button:last-child]:flex-1';

export default function MerchantPlanLimitAddonsPage() {
  const params = useParams();
  const router = useRouter();
  const merchantId = parseInt(params.id as string);
  const { toastSuccess, toastError } = useToast();

  const [addons, setAddons] = useState<PlanLimitAddon[]>([]);
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAddon, setSelectedAddon] = useState<PlanLimitAddon | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // Form state
  const [formData, setFormData] = useState<PlanLimitAddonCreateInput>({
    merchantId,
    outlets: 0,
    users: 0,
    products: 0,
    customers: 0,
    orders: 0,
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    fetchData();
  }, [merchantId, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch merchant
      const merchantResponse = await merchantsApi.getMerchantDetail(merchantId);
      if (merchantResponse.success && merchantResponse.data) {
        setMerchant(merchantResponse.data);
      }

      // Fetch addons
      const addonsResponse = await planLimitAddonsApi.getMerchantPlanLimitAddons(merchantId, {
        page,
        limit,
        offset: (page - 1) * limit,
      });

      if (addonsResponse.success && addonsResponse.data) {
        setAddons(addonsResponse.data.addons || []);
        setTotal(addonsResponse.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toastError('Failed to fetch plan limit addons');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      merchantId,
      outlets: 0,
      users: 0,
      products: 0,
      customers: 0,
      orders: 0,
      notes: '',
      isActive: true,
    });
    setShowCreateDialog(true);
  };

  const handleEdit = (addon: PlanLimitAddon) => {
    setSelectedAddon(addon);
    setFormData({
      merchantId,
      outlets: addon.outlets,
      users: addon.users,
      products: addon.products,
      customers: addon.customers,
      orders: addon.orders,
      notes: addon.notes || '',
      isActive: addon.isActive,
    });
    setShowEditDialog(true);
  };

  const handleDelete = (addon: PlanLimitAddon) => {
    setSelectedAddon(addon);
    setShowDeleteDialog(true);
  };

  const handleSubmitCreate = async () => {
    try {
      setSubmitting(true);
      const response = await planLimitAddonsApi.createMerchantPlanLimitAddon(merchantId, formData);
      
      if (response.success) {
        toastSuccess('Plan limit addon created successfully');
        setShowCreateDialog(false);
        fetchData();
      } else {
        toastError(response.message || 'Failed to create plan limit addon');
      }
    } catch (error) {
      console.error('Error creating plan limit addon:', error);
      toastError('Failed to create plan limit addon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitEdit = async () => {
    if (!selectedAddon) return;

    try {
      setSubmitting(true);
      const updateData: PlanLimitAddonUpdateInput = {
        outlets: formData.outlets,
        users: formData.users,
        products: formData.products,
        customers: formData.customers,
        orders: formData.orders,
        notes: formData.notes,
        isActive: formData.isActive,
      };

      const response = await planLimitAddonsApi.updatePlanLimitAddon(selectedAddon.id, updateData);
      
      if (response.success) {
        toastSuccess('Plan limit addon updated successfully');
        setShowEditDialog(false);
        setSelectedAddon(null);
        fetchData();
      } else {
        toastError(response.message || 'Failed to update plan limit addon');
      }
    } catch (error) {
      console.error('Error updating plan limit addon:', error);
      toastError('Failed to update plan limit addon');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedAddon) return;

    try {
      setSubmitting(true);
      const response = await planLimitAddonsApi.deletePlanLimitAddon(selectedAddon.id);
      
      if (response.success) {
        toastSuccess('Plan limit addon deleted successfully');
        setShowDeleteDialog(false);
        setSelectedAddon(null);
        fetchData();
      } else {
        toastError(response.message || 'Failed to delete plan limit addon');
      }
    } catch (error) {
      console.error('Error deleting plan limit addon:', error);
      toastError('Failed to delete plan limit addon');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return addons
      .filter(addon => addon.isActive)
      .reduce(
        (total, addon) => ({
          outlets: total.outlets + addon.outlets,
          users: total.users + addon.users,
          products: total.products + addon.products,
          customers: total.customers + addon.customers,
          orders: total.orders + addon.orders,
        }),
        { outlets: 0, users: 0, products: 0, customers: 0, orders: 0 }
      );
  };

  const totals = calculateTotal();

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Merchants', href: '/merchants' },
    { label: merchant?.merchant?.name || merchant?.name || 'Merchant', href: `/merchants/${merchantId}` },
    { label: 'Plan Limit Addons' },
  ];

  return (
    <PageWrapper className="admin-phone">
      <Breadcrumb items={breadcrumbItems} showHome={false} homeHref="/dashboard" className="mb-4" />
      
      <PageHeader className="mb-6">
        <div className="flex items-center justify-between gap-3 max-md:flex-wrap">
          <div>
            <PageTitle subtitle={`Manage plan limit addons for ${merchant?.merchant?.name || merchant?.name || 'merchant'}`}>
              Plan Limit Addons
            </PageTitle>
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Addon
          </Button>
        </div>
      </PageHeader>

      <PageContent>
        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Total Active Addons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-gray-500">Outlets</div>
                <div className="text-2xl font-bold">{totals.outlets}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Users</div>
                <div className="text-2xl font-bold">{totals.users}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Products</div>
                <div className="text-2xl font-bold">{totals.products}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Customers</div>
                <div className="text-2xl font-bold">{totals.customers}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Orders</div>
                <div className="text-2xl font-bold">{totals.orders}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Addons Table */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Limit Addons</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : addons.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No plan limit addons found. Click "Add Addon" to create one.
              </div>
            ) : (
              <>
                <Table className="table-cards">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Limits</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Updated At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {addons.map((addon) => {
                      const limits = [];
                      if (addon.outlets > 0) limits.push(`${addon.outlets} Outlets`);
                      if (addon.users > 0) limits.push(`${addon.users} Users`);
                      if (addon.products > 0) limits.push(`${addon.products} Products`);
                      if (addon.customers > 0) limits.push(`${addon.customers} Customers`);
                      if (addon.orders > 0) limits.push(`${addon.orders} Orders`);
                      
                      return (
                        <TableRow key={addon.id}>
                          <TableCell data-primary>
                            <div className="flex flex-wrap gap-2">
                              {limits.length > 0 ? (
                                limits.map((limit, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {limit}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-gray-400 text-sm">No limits</span>
                              )}
                            </div>
                            {addon.notes && (
                              <p className="text-xs text-gray-500 mt-1">{addon.notes}</p>
                            )}
                          </TableCell>
                          <TableCell data-label="Status">
                            <Badge variant={addon.isActive ? 'default' : 'secondary'}>
                              {addon.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell data-label="Created At">
                            <span className="text-sm text-gray-600">
                              {formatAddonDate(addon.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell data-label="Updated At">
                            <span className="text-sm text-gray-600">
                              {formatAddonDate(addon.updatedAt)}
                            </span>
                          </TableCell>
                          <TableCell data-actions>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(addon)}
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(addon)}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {total > limit && (
                  <div className="mt-4">
                    <Pagination
                      currentPage={page}
                      totalPages={Math.ceil(total / limit)}
                      total={total}
                      limit={limit}
                      onPageChange={setPage}
                      itemName="addons"
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PageContent>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className={PHONE_DIALOG}>
          <DialogHeader className="max-md:pr-10 max-md:pb-3 max-md:shrink-0">
            <DialogTitle>Create Plan Limit Addon</DialogTitle>
            <DialogDescription>
              Add additional limits to this merchant's plan
            </DialogDescription>
          </DialogHeader>
          <div className={PHONE_FORM}>
            <div className={PHONE_FIELDS}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Outlets</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.outlets || 0}
                  onChange={(e) => setFormData({ ...formData, outlets: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Users</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.users || 0}
                  onChange={(e) => setFormData({ ...formData, users: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Products</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.products || 0}
                  onChange={(e) => setFormData({ ...formData, products: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Customers</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.customers || 0}
                  onChange={(e) => setFormData({ ...formData, customers: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Orders</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.orders || 0}
                  onChange={(e) => setFormData({ ...formData, orders: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this addon"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active
              </label>
            </div>
            </div>
            <div className={PHONE_FOOTER}>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitCreate} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className={PHONE_DIALOG}>
          <DialogHeader className="max-md:pr-10 max-md:pb-3 max-md:shrink-0">
            <DialogTitle>Edit Plan Limit Addon</DialogTitle>
            <DialogDescription>
              Update the limits for this addon
            </DialogDescription>
          </DialogHeader>
          <div className={PHONE_FORM}>
            <div className={PHONE_FIELDS}>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium">Outlets</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.outlets || 0}
                  onChange={(e) => setFormData({ ...formData, outlets: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Users</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.users || 0}
                  onChange={(e) => setFormData({ ...formData, users: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Products</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.products || 0}
                  onChange={(e) => setFormData({ ...formData, products: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Customers</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.customers || 0}
                  onChange={(e) => setFormData({ ...formData, customers: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Orders</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.orders || 0}
                  onChange={(e) => setFormData({ ...formData, orders: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes about this addon"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActiveEdit"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActiveEdit" className="text-sm font-medium">
                Active
              </label>
            </div>
            </div>
            <div className={PHONE_FOOTER}>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitEdit} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        type="danger"
        title="Delete Plan Limit Addon"
        description={`Are you sure you want to delete this plan limit addon? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={submitting}
      />
    </PageWrapper>
  );
}

