'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
  Input,
  SearchableSelect,
  useToast,
  Skeleton,
  Pagination
} from '@rentalshop/ui';
import { referralsApi, merchantsApi } from '@rentalshop/utils';
import type { Referral } from '@rentalshop/utils';
import { 
  Users, 
  Search,
  ExternalLink,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { formatDate } from '@rentalshop/ui';

interface ReferralsResponse {
  referrals: Referral[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Admin Referrals Page
 * Displays referral relationships for manual commission calculation
 */
export default function ReferralsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toastError, toastSuccess } = useToast();

  // URL params - single source of truth
  const merchantId = searchParams.get('merchantId') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';

  // Local state
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalWithReferrer: 0
  });

  // Update URL helper
  const updateURL = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'page') {
        const pageNum = typeof value === 'number' ? value : parseInt(String(value || '0'));
        if (pageNum > 0) {
          params.set(key, pageNum.toString());
        } else {
          params.delete(key);
        }
      } else if (value && value !== '' && value !== 'all') {
        params.set(key, value.toString());
      } else {
        params.delete(key);
      }
    });
    
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  // Fetch referrals
  const fetchReferrals = useCallback(async () => {
    try {
      setLoading(true);
      
      const filters: any = {
        page,
        limit
      };
      
      if (merchantId) {
        filters.merchantId = parseInt(merchantId);
      }

      const result = await referralsApi.getReferrals(filters);
      
      if (result.success && result.data) {
        let referralsData = result.data.referrals;
        
        // Apply search filter client-side
        if (search) {
          const searchLower = search.toLowerCase();
          referralsData = referralsData.filter((ref: Referral) => 
            ref.name.toLowerCase().includes(searchLower) ||
            ref.email.toLowerCase().includes(searchLower) ||
            ref.tenantKey?.toLowerCase().includes(searchLower) ||
            ref.referredBy?.name.toLowerCase().includes(searchLower)
          );
        }
        
        setReferrals(referralsData);
        setTotal(result.data.total);
        
        // Calculate stats
        const totalWithReferrer = referralsData.filter(r => r.referredBy !== null).length;
        setStats({
          totalReferrals: result.data.total,
          totalWithReferrer
        });
      } else {
        toastError(result.message || 'Failed to fetch referrals');
      }
    } catch (error: any) {
      console.error('Error fetching referrals:', error);
      toastError(error.message || 'Failed to fetch referrals');
    } finally {
      setLoading(false);
    }
  }, [merchantId, page, limit, search, toastError]);

  // Fetch merchants for filter dropdown
  const fetchMerchants = useCallback(async () => {
    try {
      const result = await merchantsApi.getMerchants();
      if (result.success && result.data) {
        setMerchants(result.data.merchants || []);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
  }, []);

  // Load data on mount and when filters change
  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  // Handlers
  const handleMerchantFilterChange = (value: string) => {
    const merchantIdNum = value ? parseInt(value) : undefined;
    updateURL({ merchantId: merchantIdNum ? merchantIdNum.toString() : undefined, page: 1 });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateURL({ search: e.target.value || undefined, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateURL({ page: newPage });
  };

  const handleClearFilters = () => {
    router.push(pathname, { scroll: false });
  };

  const handleViewMerchant = (merchantId: number) => {
    router.push(`/merchants/${merchantId}`);
  };

  // Merchant options for filter
  const merchantOptions = useMemo(() => {
    return merchants.map(m => ({
      value: m.id.toString(),
      label: `${m.name} (${m.tenantKey || 'N/A'})`
    }));
  }, [merchants]);

  const selectedMerchant = merchants.find(m => m.id.toString() === merchantId);

  return (
    <PageWrapper spacing="none" className="h-full flex flex-col px-4 pt-4 pb-0 min-h-0">
      <PageHeader className="flex-shrink-0 mb-4">
        <PageTitle subtitle="Track referral relationships for commission calculation">
          Referral Management
        </PageTitle>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">Merchants with referral tracking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Referrals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWithReferrer}</div>
            <p className="text-xs text-muted-foreground">Merchants with referrer assigned</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search by name, email, or referral code..."
                value={search}
                onChange={handleSearchChange}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Referrer Merchant</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'All Merchants' },
                  ...merchantOptions
                ]}
                value={merchantId || ''}
                onValueChange={handleMerchantFilterChange}
                placeholder="Filter by referrer..."
              />
            </div>

            <div className="flex items-end">
              {(merchantId || search) && (
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle>Referrals</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReferrals}
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
          ) : referrals.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No referrals found</h3>
              <p className="text-muted-foreground">
                {merchantId || search 
                  ? 'Try adjusting your filters' 
                  : 'No referral relationships have been recorded yet'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <th>Merchant</th>
                    <th>Referral Code</th>
                    <th>Referred By</th>
                    <th>Subscription</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((referral) => (
                    <tr key={referral.id}>
                      <td>
                        <div>
                          <div className="font-medium">{referral.name}</div>
                          <div className="text-sm text-muted-foreground">{referral.email}</div>
                        </div>
                      </td>
                      <td>
                        {referral.tenantKey ? (
                          <Badge variant="outline">{referral.tenantKey}</Badge>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td>
                        {referral.referredBy ? (
                          <div>
                            <div className="font-medium">{referral.referredBy.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {referral.referredBy.tenantKey && (
                                <Badge variant="secondary" className="text-xs">
                                  {referral.referredBy.tenantKey}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No referrer</span>
                        )}
                      </td>
                      <td>
                        <div>
                          <Badge variant={referral.subscriptionStatus === 'ACTIVE' ? 'default' : 'secondary'}>
                            {referral.subscriptionStatus}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {referral.subscriptionPlan}
                          </div>
                        </div>
                      </td>
                      <td>
                        {referral.createdAt ? (
                          <div className="text-sm">
                            {formatDate(referral.createdAt)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td>
                        <Badge variant={referral.isActive ? 'default' : 'secondary'}>
                          {referral.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewMerchant(referral.id)}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* Pagination */}
              {total > limit && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={page}
                    total={total}
                    limit={limit}
                    totalPages={Math.ceil(total / limit)}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

