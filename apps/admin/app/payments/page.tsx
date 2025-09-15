'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  PageWrapper,
  PageHeader,
  PageTitle,
  PageContent,
  Button,
  StatusBadge,
  PaymentForm,
  PaymentDetailDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ToastContainer,
  useToasts
} from '@rentalshop/ui';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  CreditCard, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Store,
  Package,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Plus
} from 'lucide-react';
import { paymentsApi } from '@rentalshop/utils';

interface Payment {
  id: number;
  publicId: number;
  subscriptionId: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  transactionId?: string;
  invoiceNumber?: string;
  description?: string;
  failureReason?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  subscription?: {
    id: string;
    publicId: number;
    merchantId: string;
    planId: string;
    status: string;
    amount: number;
    currency: string;
    merchant?: {
      id: string;
      publicId: number;
      name: string;
      email: string;
    };
    plan?: {
      id: string;
      publicId: number;
      name: string;
      price: number;
      currency: string;
    };
    billingCycle?: {
      id: string;
      publicId: number;
      name: string;
      months: number;
      discount: number;
    };
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [planVariants, setPlanVariants] = useState<any[]>([]);
  const [billingCycles, setBillingCycles] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showPaymentDetail, setShowPaymentDetail] = useState(false);
  const { addToast } = useToasts();

  useEffect(() => {
    fetchPayments();
    fetchFormData(); // Load form data immediately
  }, []);

  const fetchFormData = async () => {
    try {
      // TODO: Replace with actual API calls
      // For now, using mock data to get the form working
      
      // Mock merchants data
      const mockMerchants = [
        { id: 1, name: "Merchant 1", email: "merchant1@example.com" },
        { id: 2, name: "Merchant 2", email: "merchant2@example.com" },
        { id: 3, name: "Merchant 3", email: "merchant3@example.com" }
      ];
      setMerchants(mockMerchants);
      
      // Mock plans data
      const mockPlans = [
        { id: 1, name: "Basic", price: 9.99, currency: "USD" },
        { id: 2, name: "Professional", price: 19.99, currency: "USD" },
        { id: 3, name: "Enterprise", price: 49.99, currency: "USD" }
      ];
      setPlans(mockPlans);
      
      // Mock plan variants data
      const mockPlanVariants = [
        // Basic plan variants
        { id: 1, planId: 1, name: "1 Month", duration: 1, price: 9.99, discount: 0, savings: 0, isActive: true },
        { id: 2, planId: 1, name: "3 Months", duration: 3, price: 27.99, discount: 10, savings: 2.01, isActive: true },
        { id: 3, planId: 1, name: "6 Months", duration: 6, price: 53.99, discount: 15, savings: 5.01, isActive: true },
        { id: 4, planId: 1, name: "12 Months", duration: 12, price: 99.99, discount: 25, savings: 19.99, isActive: true },
        
        // Professional plan variants
        { id: 5, planId: 2, name: "1 Month", duration: 1, price: 19.99, discount: 0, savings: 0, isActive: true },
        { id: 6, planId: 2, name: "3 Months", duration: 3, price: 56.99, discount: 10, savings: 3.01, isActive: true },
        { id: 7, planId: 2, name: "6 Months", duration: 6, price: 107.99, discount: 15, savings: 9.01, isActive: true },
        { id: 8, planId: 2, name: "12 Months", duration: 12, price: 199.99, discount: 25, savings: 39.99, isActive: true },
        
        // Enterprise plan variants
        { id: 9, planId: 3, name: "1 Month", duration: 1, price: 49.99, discount: 0, savings: 0, isActive: true },
        { id: 10, planId: 3, name: "3 Months", duration: 3, price: 142.99, discount: 10, savings: 7.01, isActive: true },
        { id: 11, planId: 3, name: "6 Months", duration: 6, price: 269.99, discount: 15, savings: 29.01, isActive: true },
        { id: 12, planId: 3, name: "12 Months", duration: 12, price: 499.99, discount: 25, savings: 99.99, isActive: true }
      ];
      setPlanVariants(mockPlanVariants);
      
      // Keep billing cycles for backward compatibility
      setBillingCycles([
        { id: 1, name: 'Monthly', months: 1, discount: 0 },
        { id: 2, name: 'Quarterly', months: 3, discount: 5 },
        { id: 3, name: 'Semi-Annual', months: 6, discount: 10 },
        { id: 4, name: 'Annual', months: 12, discount: 20 }
      ]);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const handleCreatePayment = async (formData: any) => {
    try {
      setFormLoading(true);
      
      const { paymentsApi } = await import('@rentalshop/utils');
      
      const result = await paymentsApi.createManualPayment(formData);
      
      if (result.success) {
        addToast('success', 'Payment Created', `Successfully created payment for ${formData.amount} ${formData.currency}`);
        setShowPaymentForm(false);
        fetchPayments(); // Refresh the payments list
      } else {
        throw new Error(result.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      addToast('error', 'Error', `Failed to create payment: ${error.message}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleViewPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setShowPaymentDetail(true);
  };

  const handleProcessPayment = async (paymentId: number) => {
    try {
      // Here you would call your API to process the payment
      console.log('Processing payment:', paymentId);
      
      addToast('success', 'Payment Processed', 'Payment has been successfully processed');
      
      setShowPaymentDetail(false);
      fetchPayments(); // Refresh the payments list
    } catch (error) {
      console.error('Error processing payment:', error);
      addToast('error', 'Error', 'Failed to process payment. Please try again.');
    }
  };

  const handleRefundPayment = async (paymentId: number) => {
    try {
      // Here you would call your API to refund the payment
      console.log('Refunding payment:', paymentId);
      
      addToast('success', 'Payment Refunded', 'Payment has been successfully refunded');
      
      setShowPaymentDetail(false);
      fetchPayments(); // Refresh the payments list
    } catch (error) {
      console.error('Error refunding payment:', error);
      addToast('error', 'Error', 'Failed to refund payment. Please try again.');
    }
  };

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      // Here you would call your API to download the receipt
      console.log('Downloading receipt for payment:', paymentId);
      
      addToast('info', 'Receipt Downloaded', 'Payment receipt has been downloaded');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      addToast('error', 'Error', 'Failed to download receipt. Please try again.');
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Use centralized payments API
      const response = await paymentsApi.getPayments();

      if (response.success && response.data) {
        // Transform the API response to match our Payment interface
        // The API returns data directly as an array, not wrapped in a 'payments' property
        const paymentsArray = Array.isArray(response.data) ? response.data : response.data.payments || [];
        const transformedPayments = paymentsArray.map((payment: any) => ({
          ...payment,
          publicId: payment.publicId || payment.id,
          // Transform the API response to match our interface
          method: payment.paymentMethod?.toUpperCase() || 'UNKNOWN',
          subscription: {
            id: `sub_${payment.id}`,
            publicId: payment.id,
            merchantId: `merchant_${payment.id}`,
            planId: `plan_${payment.id}`,
            status: 'ACTIVE',
            amount: payment.amount,
            currency: payment.currency,
            merchant: {
              id: `merchant_${payment.id}`,
              publicId: payment.id,
              name: payment.merchantName,
              email: `${payment.merchantName.toLowerCase().replace(/\s+/g, '')}@example.com`
            },
            plan: {
              id: `plan_${payment.id}`,
              publicId: payment.id,
              name: payment.planName,
              price: payment.amount,
              currency: payment.currency
            },
            billingCycle: {
              id: `bc_${payment.id}`,
              publicId: payment.id,
              name: payment.billingCycle === 'monthly' ? 'Monthly' : 'Unknown',
              months: 1,
              discount: 0
            }
          }
        }));
        setPayments(transformedPayments);
      } else {
        console.error('Failed to fetch payments:', response.message);
        // No fallback needed - just log the error
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      // No fallback needed - just log the error
    } finally {
      setLoading(false);
    }
  };


  const filteredPayments = payments.filter(payment => {
    const merchantName = payment.subscription?.merchant?.name || '';
    const invoiceNumber = payment.invoiceNumber || '';
    const transactionId = payment.transactionId || '';
    
    const matchesSearch = merchantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transactionId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status.toLowerCase() === statusFilter.toLowerCase();
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      const today = new Date().toDateString();
      matchesDate = new Date(payment.createdAt).toDateString() === today;
    } else if (dateFilter === 'this_month') {
      const now = new Date();
      const paymentDate = new Date(payment.createdAt);
      matchesDate = now.getMonth() === paymentDate.getMonth() && 
                   now.getFullYear() === paymentDate.getFullYear();
    } else if (dateFilter === 'this_year') {
      const now = new Date();
      const paymentDate = new Date(payment.createdAt);
      matchesDate = now.getFullYear() === paymentDate.getFullYear();
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'completed': { color: 'bg-action-success/10 text-action-success', icon: CheckCircle, text: 'Completed' },
      'pending': { color: 'bg-action-warning/10 text-action-warning', icon: Clock, text: 'Pending' },
      'failed': { color: 'bg-action-danger/10 text-action-danger', icon: XCircle, text: 'Failed' },
      'refunded': { color: 'bg-text-tertiary/10 text-text-tertiary', icon: AlertCircle, text: 'Refunded' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const methodConfig = {
      'credit_card': CreditCard,
      'bank_transfer': DollarSign,
      'paypal': DollarSign,
      'stripe': CreditCard
    };
    
    const Icon = methodConfig[method as keyof typeof methodConfig] || CreditCard;
    return <Icon className="w-4 h-4" />;
  };

  const getPaymentMethodText = (method: string) => {
    const methodConfig = {
      'credit_card': 'Credit Card',
      'bank_transfer': 'Bank Transfer',
      'paypal': 'PayPal',
      'stripe': 'Stripe'
    };
    
    return methodConfig[method as keyof typeof methodConfig] || method;
  };

  const getBillingCycleText = (cycle: string) => {
    const cycleConfig = {
      'monthly': 'Monthly',
      'yearly': 'Yearly',
      'one_time': 'One Time'
    };
    
    return cycleConfig[cycle as keyof typeof cycleConfig] || cycle;
  };

  const calculateStats = () => {
    const totalRevenue = payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingAmount = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const failedAmount = payments
      .filter(p => p.status === 'failed')
      .reduce((sum, p) => sum + p.amount, 0);
    
          const monthlyRevenue = payments
        .filter(p => p.status.toLowerCase() === 'completed' && p.subscription?.billingCycle?.name === 'Monthly')
        .reduce((sum, p) => sum + p.amount, 0);
    
    return { totalRevenue, pendingAmount, failedAmount, monthlyRevenue };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <PageWrapper>
        <PageContent>
          <div className="animate-pulse">
            <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-bg-tertiary rounded mb-6"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
              ))}
            </div>
          </div>
        </PageContent>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader>
        <PageTitle subtitle="Track platform revenue, payments, and financial metrics">
          Payment Management
        </PageTitle>
      </PageHeader>

      <PageContent>
        {/* Financial Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Total Revenue</p>
                  <p className="text-2xl font-bold text-action-primary mb-1">${stats.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-action-primary">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-action-success mt-2">
                <TrendingUp className="w-4 h-4" />
                +12.5% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-action-success mb-1">${stats.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-action-success">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-action-success mt-2">
                <TrendingUp className="w-4 h-4" />
                +8.2% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Pending Payments</p>
                  <p className="text-2xl font-bold text-brand-secondary mb-1">${stats.pendingAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-brand-secondary">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-sm text-text-tertiary mt-2">
                {payments.filter(p => p.status === 'pending').length} transactions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary mb-2">Failed Payments</p>
                  <p className="text-2xl font-bold text-action-danger mb-1">${stats.failedAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-full bg-action-danger">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm text-action-danger mt-2">
                <TrendingDown className="w-4 h-4" />
                {payments.filter(p => p.status === 'failed').length} failed
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by merchant, invoice, or transaction ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>

                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-action-primary focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="this_month">This Month</option>
                  <option value="this_year">This Year</option>
                </select>

                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments List */}
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card 
              key={payment.id}
              className="cursor-pointer hover:shadow-md transition-shadow duration-200"
              onClick={() => handleViewPayment(payment)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  {/* Payment Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-action-primary to-brand-primary rounded-lg flex items-center justify-center">
                        {getPaymentMethodIcon(payment.method)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-text-primary">{payment.subscription?.merchant?.name || 'Unknown Merchant'}</h3>
                          {getStatusBadge(payment.status)}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-text-secondary">
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {payment.subscription?.plan?.name || 'Unknown Plan'} Plan
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {getBillingCycleText(payment.subscription?.billingCycle?.name || 'Unknown')}
                          </span>
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4" />
                            {getPaymentMethodText(payment.method)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-text-tertiary mt-1">
                          <span>Invoice: {payment.invoiceNumber || 'N/A'}</span>
                          <span>TXN: {payment.transactionId || 'N/A'}</span>
                          <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Amount and Actions */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-text-primary">
                        ${payment.amount.toLocaleString()}
                      </div>
                      <div className="text-sm text-text-tertiary">{payment.currency}</div>
                    </div>
                    
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewPayment(payment)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Failure Reason */}
                {payment.status === 'failed' && payment.failureReason && (
                  <div className="mt-4 p-3 bg-action-danger/10 border border-action-danger/20 rounded-lg">
                    <div className="flex items-center gap-2 text-action-danger">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Payment Failed: {payment.failureReason}</span>
                    </div>
                  </div>
                )}

                {/* Pending Status */}
                {payment.status === 'pending' && (
                  <div className="mt-4 p-3 bg-action-warning/10 border border-action-warning/20 rounded-lg">
                    <div className="flex items-center gap-2 text-action-warning">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">Payment is being processed</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredPayments.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-secondary mb-2">No payments found</h3>
                <p className="text-text-tertiary mb-4">
                  {searchTerm || statusFilter !== 'all' || dateFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first payment'}
                </p>
                <Button onClick={() => setShowPaymentForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Form Dialog */}
        <Dialog open={showPaymentForm} onOpenChange={setShowPaymentForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Manual Payment</DialogTitle>
            </DialogHeader>
            <PaymentForm
              onSubmit={handleCreatePayment}
              onCancel={() => setShowPaymentForm(false)}
              loading={formLoading}
              merchants={merchants}
              plans={plans}
              planVariants={planVariants}
            />
          </DialogContent>
        </Dialog>

        {/* Payment Detail Dialog */}
        <PaymentDetailDialog
          open={showPaymentDetail}
          onOpenChange={setShowPaymentDetail}
          payment={selectedPayment}
          onProcessPayment={handleProcessPayment}
          onRefundPayment={handleRefundPayment}
          onDownloadReceipt={handleDownloadReceipt}
        />
      </PageContent>
    </PageWrapper>
  );
}
