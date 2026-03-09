'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  PageWrapper,
  PageHeader,
  PageTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast
} from '@rentalshop/ui';
import { Trash2, RefreshCw, RotateCcw, Users, UserCircle, ShoppingCart } from 'lucide-react';
import { authenticatedFetch, apiUrls } from '@rentalshop/utils';

type EntityType = 'User' | 'Customer' | 'Order';

interface DeletedItem {
  id: number;
  type: EntityType;
  label: string;
  deletedAt: string | null;
  [key: string]: any;
}

export default function DeletedRecordsPage() {
  const { toastSuccess, toastError } = useToast();
  const [entityType, setEntityType] = useState<EntityType>('User');
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `${apiUrls.system.deletedRecords}?entityType=${entityType}&limit=50&offset=0`;
      const res = (await authenticatedFetch(url)) as {
        success: boolean;
        data: DeletedItem[];
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
      if (res.success && res.data) {
        setItems(res.data);
        setPagination(res.pagination || { total: res.data.length, limit: 50, offset: 0, hasMore: false });
      } else {
        setItems([]);
      }
    } catch (err) {
      toastError('Error', (err as Error)?.message || 'Failed to load deleted records');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [entityType, toastError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRestore = async (item: DeletedItem) => {
    setRestoringId(item.id);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || '';
      let url = '';
      if (item.type === 'User') url = `${base}/api/users/${item.id}/restore`;
      else if (item.type === 'Customer') url = `${base}/api/customers/${item.id}/restore`;
      else if (item.type === 'Order') url = `${base}/api/orders/${item.id}/restore`;
      else return;
      const res = (await authenticatedFetch(url, { method: 'POST' })) as { success?: boolean; message?: string };
      if (res.success) {
        toastSuccess('Restored', `${item.type} "${item.label}" has been restored.`);
        load();
      } else {
        toastError('Restore failed', (res as any)?.message || 'Unknown error');
      }
    } catch (err) {
      toastError('Restore failed', (err as Error)?.message || 'Request failed');
    } finally {
      setRestoringId(null);
    }
  };

  const Icon = entityType === 'User' ? UserCircle : entityType === 'Customer' ? Users : ShoppingCart;

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle className="flex items-center gap-2">
          <Trash2 className="w-6 h-6" />
          Deleted Records
        </PageTitle>
      </PageHeader>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Soft-deleted items</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={entityType} onValueChange={(v) => setEntityType(v as EntityType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="User">Users</SelectItem>
                <SelectItem value="Customer">Customers</SelectItem>
                <SelectItem value="Order">Orders</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">No deleted {entityType.toLowerCase()}s found.</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {item.id}
                        {item.deletedAt && ` • Deleted: ${new Date(item.deletedAt).toLocaleString()}`}
                      </p>
                    </div>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(item)}
                    disabled={restoringId === item.id}
                  >
                    {restoringId === item.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Restore
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
