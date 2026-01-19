'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageWrapper,
  PageHeader,
  PageTitle,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  Badge,
  Button,
  useToast,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@rentalshop/ui';
import { referralsApi } from '@rentalshop/utils';
import type { AffiliateStat, ReferredMerchant } from '@rentalshop/utils';
import { 
  Users, 
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Eye,
  X
} from 'lucide-react';
import { formatDate } from '@rentalshop/ui';

interface AffiliateStatsResponse {
  stats: AffiliateStat[];
  totalReferrers: number;
  totalReferrals: number;
}

/**
 * Admin Affiliate Statistics Page
 * Displays merchants who referred others and their referral counts
 */
export default function AffiliateStatsPage() {
  const router = useRouter();
  const { toastError, toastSuccess } = useToast();

  const [stats, setStats] = useState<AffiliateStat[]>([]);
  const [totalReferrers, setTotalReferrers] = useState(0);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedReferrer, setSelectedReferrer] = useState<AffiliateStat | null>(null);
  const [referredMerchants, setReferredMerchants] = useState<ReferredMerchant[]>([]);
  const [loadingReferred, setLoadingReferred] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch affiliate stats
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const result = await referralsApi.getAffiliateStats();
      
      if (result.success && result.data) {
        setStats(result.data.stats);
        setTotalReferrers(result.data.totalReferrers);
        setTotalReferrals(result.data.totalReferrals);
      } else {
        toastError(result.message || 'Failed to fetch affiliate stats');
      }
    } catch (error: any) {
      console.error('Error fetching affiliate stats:', error);
      toastError(error.message || 'Failed to fetch affiliate stats');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  // Fetch referred merchants for a specific referrer
  const fetchReferredMerchants = useCallback(async (referrerId: number) => {
    try {
      setLoadingReferred(true);
      const result = await referralsApi.getReferredMerchants(referrerId);
      
      if (result.success && result.data) {
        setReferredMerchants(result.data.referredMerchants);
      } else {
        toastError(result.message || 'Failed to fetch referred merchants');
      }
    } catch (error: any) {
      console.error('Error fetching referred merchants:', error);
      toastError(error.message || 'Failed to fetch referred merchants');
    } finally {
      setLoadingReferred(false);
    }
  }, [toastError]);

  // Load data on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handlers
  const handleViewReferredShops = async (stat: AffiliateStat) => {
    if (!stat.referrer) return;
    
    setSelectedReferrer(stat);
    setDialogOpen(true);
    await fetchReferredMerchants(stat.referrer.id);
  };

  const handleViewMerchant = (merchantId: number) => {
    router.push(`/merchants/${merchantId}`);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedReferrer(null);
    setReferredMerchants([]);
  };

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0 mb-4">
        <PageTitle subtitle="Thống kê merchants đã giới thiệu shop và danh sách các shop được giới thiệu">
          Quản Lý Affiliate
        </PageTitle>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Số Referrers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrers}</div>
            <p className="text-xs text-muted-foreground">Merchants đã giới thiệu shop khác</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Số Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Tổng số shop được giới thiệu</p>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate Stats Table */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Thống Kê Affiliate</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có dữ liệu affiliate</h3>
              <p className="text-muted-foreground">
                Chưa có merchant nào giới thiệu shop khác
              </p>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Merchant Referrer</th>
                  <th>Referral Code</th>
                  <th>Số Shop Đã Giới Thiệu</th>
                  <th>Trạng Thái</th>
                  <th>Ngày Tạo</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((stat, index) => (
                  <tr key={stat.referrer?.id || index}>
                    <td>
                      {stat.referrer ? (
                        <div>
                          <div className="font-medium">{stat.referrer.name}</div>
                          <div className="text-sm text-muted-foreground">{stat.referrer.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unknown</span>
                      )}
                    </td>
                    <td>
                      {stat.referrer?.tenantKey ? (
                        <Badge variant="outline">{stat.referrer.tenantKey}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-lg px-3 py-1">
                          {stat.referralCount}
                        </Badge>
                        <span className="text-sm text-muted-foreground">shops</span>
                      </div>
                    </td>
                    <td>
                      {stat.referrer ? (
                        <Badge variant={stat.referrer.isActive ? 'default' : 'secondary'}>
                          {stat.referrer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td>
                      {stat.referrer?.createdAt ? (
                        <div className="text-sm">
                          {formatDate(stat.referrer.createdAt)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => stat.referrer && handleViewReferredShops(stat)}
                          disabled={!stat.referrer}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Xem Shops
                        </Button>
                        {stat.referrer && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewMerchant(stat.referrer!.id)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog to show referred shops */}
      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Danh Sách Shops Được Giới Thiệu
            </DialogTitle>
            <DialogDescription>
              {selectedReferrer?.referrer && (
                <>
                  Merchant: <strong>{selectedReferrer.referrer.name}</strong> ({selectedReferrer.referrer.tenantKey})
                  <br />
                  Tổng số: <strong>{selectedReferrer.referralCount} shops</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto mt-4">
            {loadingReferred ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : referredMerchants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Không có shop nào</h3>
                <p className="text-muted-foreground">
                  Merchant này chưa giới thiệu shop nào
                </p>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th>Shop Name</th>
                    <th>Email</th>
                    <th>Referral Code</th>
                    <th>Subscription</th>
                    <th>Ngày Đăng Ký</th>
                    <th>Trạng Thái</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referredMerchants.map((merchant) => (
                    <tr key={merchant.id}>
                      <td>
                        <div className="font-medium">{merchant.name}</div>
                      </td>
                      <td>
                        <div className="text-sm text-muted-foreground">{merchant.email}</div>
                      </td>
                      <td>
                        {merchant.tenantKey ? (
                          <Badge variant="outline">{merchant.tenantKey}</Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td>
                        <div>
                          <Badge variant={merchant.subscriptionStatus === 'ACTIVE' ? 'default' : 'secondary'}>
                            {merchant.subscriptionStatus}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {merchant.subscriptionPlan}
                          </div>
                        </div>
                      </td>
                      <td>
                        {merchant.createdAt ? (
                          <div className="text-sm">
                            {formatDate(merchant.createdAt)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td>
                        <Badge variant={merchant.isActive ? 'default' : 'secondary'}>
                          {merchant.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMerchant(merchant.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
