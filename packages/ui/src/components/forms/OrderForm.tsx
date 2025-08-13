import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Badge,
  formatDate,
  formatCurrency,
  SearchableSelect
} from '@rentalshop/ui';
import type { 
  OrderInput, 
  OrderItemInput, 
  OrderType, 
  CustomerSearchResult,
  ProductWithStock 
} from '@rentalshop/database';

interface OrderFormProps {
  initialData?: Partial<OrderInput>;
  customers?: CustomerSearchResult[];
  products?: ProductWithStock[];
  outlets?: Array<{ id: string; name: string }>;
  onSubmit: (data: OrderInput) => void;
  onCancel: () => void;
  loading?: boolean;
  layout?: 'stacked' | 'split';
}

interface OrderItemFormData {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  
  // Core rental fields (keeping previous calculation logic)
  rentalDays: number;       // Số ngày thuê (Rental Duration)
  startDate?: string;       // Ngày bắt đầu thuê (Start Date) - Optional
  endDate?: string;         // Ngày kết thúc thuê (End Date) - Optional
  daysRented?: number;      // Calculated days (keeping for backward compatibility)
  
  // Financial fields
  deposit: number;          // Tiền cọc (Deposit Amount) - keeping previous field
  
  // Additional info
  notes: string;            // Ghi chú cho sản phẩm này
}

export const OrderForm: React.FC<OrderFormProps> = ({
  initialData,
  customers = [],
  products = [],
  outlets = [],
  onSubmit,
  onCancel,
  loading = false,
  layout = 'stacked',
}) => {
  const [formData, setFormData] = useState<Partial<OrderInput>>({
    orderType: 'RENT',
    customerId: '',
    outletId: '',
    pickupPlanAt: undefined,
    returnPlanAt: undefined,
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    depositAmount: 0,
    notes: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    orderItems: [],
    ...initialData,
  });

  const [orderItems, setOrderItems] = useState<OrderItemFormData[]>(
    initialData?.orderItems?.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rentalDays: item.rentalDays || 0,
      startDate: item.startDate?.toISOString().split('T')[0] || '',
      endDate: item.endDate?.toISOString().split('T')[0] || '',
      daysRented: item.daysRented || 0,
      deposit: item.deposit || 0,
      notes: item.notes || '',
    })) || []
  );

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(
    customers.find(c => c.id === formData.customerId) || null
  );

  // Calculate totals when order items change
  useEffect(() => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * 0.1; // 10% tax
    const totalAmount = subtotal + taxAmount - (formData.discountAmount || 0);

    setFormData(prev => ({
      ...prev,
      subtotal,
      taxAmount,
      totalAmount,
      orderItems: orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        rentalDays: item.rentalDays,
        startDate: item.startDate ? new Date(item.startDate) : undefined,
        endDate: item.endDate ? new Date(item.endDate) : undefined,
        daysRented: item.daysRented,
        deposit: item.deposit,
        notes: item.notes,
      })),
    }));
  }, [orderItems, formData.discountAmount]);

  // Update customer info when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      setFormData(prev => ({
        ...prev,
        customerId: selectedCustomer.id,
        customerName: `${selectedCustomer.firstName} ${selectedCustomer.lastName}`,
        customerPhone: selectedCustomer.phone,
        customerEmail: selectedCustomer.email,
      }));
    }
  }, [selectedCustomer]);

  const addOrderItem = () => {
    setOrderItems(prev => [...prev, {
      productId: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      rentalDays: 0,
      startDate: '',
      endDate: '',
      daysRented: 0,
      deposit: 0,
      notes: '',
    }]);
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateOrderItem = (index: number, field: keyof OrderItemFormData, value: any) => {
    setOrderItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };

      // Auto-calculate total price
      if (field === 'quantity' || field === 'unitPrice') {
        item.totalPrice = item.quantity * item.unitPrice;
      }

      // Auto-calculate total price for rentals based on rental days
      if (formData.orderType === 'RENT' && field === 'rentalDays') {
        item.totalPrice = item.quantity * item.unitPrice * (item.rentalDays || 1);
      }

      // Auto-calculate unit price and total price based on product
      if (field === 'productId') {
        const product = products.find(p => p.id === value);
        if (product) {
          item.unitPrice = formData.orderType === 'RENT' ? product.rentPrice : (product.salePrice || 0);
          item.totalPrice = item.quantity * item.unitPrice;
        }
      }

      newItems[index] = item;
      return newItems;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.outletId) {
      alert('Vui lòng chọn cửa hàng');
      return;
    }

    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm');
      return;
    }

    if (orderItems.some(item => !item.productId)) {
      alert('Vui lòng chọn sản phẩm cho tất cả các mục');
      return;
    }

    onSubmit(formData as OrderInput);
  };

  // --- Build sections once ---
  const InfoCard = (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin đơn hàng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Loại đơn hàng</label>
            <Select
              value={formData.orderType}
              onValueChange={(value: OrderType) => setFormData(prev => ({ ...prev, orderType: value }))}
            >
              <SelectTrigger variant="filled">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RENT">Thuê</SelectItem>
                <SelectItem value="SALE">Bán</SelectItem>
                <SelectItem value="RENT_TO_OWN">Thuê để mua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cửa hàng *</label>
            <Select
              value={formData.outletId}
              onValueChange={(value: string) => setFormData(prev => ({ ...prev, outletId: value }))}
            >
              <SelectTrigger variant="filled">
                <SelectValue placeholder="Chọn cửa hàng" />
              </SelectTrigger>
              <SelectContent>
                {outlets.map(outlet => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Khách hàng</label>
          <SearchableSelect
            value={selectedCustomer?.id || ''}
            onChange={(val: string) => {
              const customer = customers.find(c => c.id === val);
              setSelectedCustomer(customer || null);
            }}
            options={customers.map((c) => ({
              value: c.id,
              label: `${c.firstName} ${c.lastName} - ${c.phone}`,
            }))}
            placeholder="Chọn khách hàng hoặc để trống cho khách vãng lai"
            searchPlaceholder="Tìm kiếm khách hàng..."
          />
        </div>

        {!selectedCustomer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tên khách hàng</label>
              <Input variant="filled" value={formData.customerName || ''} onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))} placeholder="Tên khách hàng" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
              <Input variant="filled" value={formData.customerPhone || ''} onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))} placeholder="Số điện thoại" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <Input type="email" variant="filled" value={formData.customerEmail || ''} onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))} placeholder="Email" />
            </div>
          </div>
        )}

        {formData.orderType === 'RENT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày nhận dự kiến</label>
              <Input
                type="datetime-local"
                variant="filled"
                value={formData.pickupPlanAt?.toISOString().slice(0, 16) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupPlanAt: e.target.value ? new Date(e.target.value) : undefined }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ngày trả dự kiến</label>
              <Input
                type="datetime-local"
                variant="filled"
                value={formData.returnPlanAt?.toISOString().slice(0, 16) || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, returnPlanAt: e.target.value ? new Date(e.target.value) : undefined }))}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const ProductsCard = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Sản phẩm</CardTitle>
          <Button type="button" onClick={addOrderItem} variant="outline" size="sm">Thêm sản phẩm</Button>
        </div>
      </CardHeader>
      <CardContent>
        {orderItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Chưa có sản phẩm nào. Nhấn "Thêm sản phẩm" để bắt đầu.</div>
        ) : (
          <div className="space-y-4">
            {orderItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Sản phẩm {index + 1}</h4>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeOrderItem(index)}>Xóa</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sản phẩm *</label>
                    <Select value={item.productId} onValueChange={(value: string) => updateOrderItem(index, 'productId', value)}>
                      <SelectTrigger variant="filled">
                        <SelectValue placeholder="Chọn sản phẩm" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.rentPrice)}/ngày
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng</label>
                    <Input variant="filled" type="number" min="1" value={item.quantity} onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Đơn giá</label>
                    <Input variant="filled" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateOrderItem(index, 'unitPrice', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tiền cọc</label>
                    <Input variant="filled" type="number" min="0" step="0.01" value={item.deposit} onChange={(e) => updateOrderItem(index, 'deposit', parseFloat(e.target.value) || 0)} />
                  </div>
                </div>
                {formData.orderType === 'RENT' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ngày bắt đầu thuê</label>
                      <Input variant="filled" type="date" value={item.startDate || ''} onChange={(e) => updateOrderItem(index, 'startDate', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ngày kết thúc thuê</label>
                      <Input variant="filled" type="date" value={item.endDate || ''} onChange={(e) => updateOrderItem(index, 'endDate', e.target.value)} />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                  <Textarea value={item.notes} onChange={(e) => updateOrderItem(index, 'notes', e.target.value)} placeholder="Ghi chú cho sản phẩm này" />
                </div>
                <div className="flex justify-end">
                  <Badge variant="outline">Tổng: {formatCurrency(item.totalPrice)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const FinancialCard = (
    <Card>
      <CardHeader>
        <CardTitle>Tóm tắt đơn hàng</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Giảm giá</label>
              <Input
                variant="filled"
                type="number"
                min="0"
                step="0.01"
                value={formData.discountAmount || 0}
                onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between"><span>Tạm tính:</span><span>{formatCurrency(formData.subtotal || 0)}</span></div>
            <div className="flex justify-between"><span>Thuế (10%):</span><span>{formatCurrency(formData.taxAmount || 0)}</span></div>
            <div className="flex justify-between"><span>Giảm giá:</span><span>-{formatCurrency(formData.discountAmount || 0)}</span></div>
            <div className="flex justify-between text-lg font-semibold border-t pt-2"><span>Tổng cộng:</span><span className="text-green-600">{formatCurrency(formData.totalAmount || 0)}</span></div>
            <div className="flex justify-between text-lg font-semibold"><span>Tiền cọc:</span><span className="text-blue-600">{formatCurrency(formData.depositAmount || 0)}</span></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const NotesCard = (
    <Card>
      <CardHeader>
        <CardTitle>Ghi chú</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea value={formData.notes || ''} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Ghi chú cho đơn hàng" rows={3} />
      </CardContent>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {layout === 'split' ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {ProductsCard}
              {NotesCard}
            </div>
            <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
              {InfoCard}
              {FinancialCard}
            </div>
          </div>
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Đang xử lý...' : 'Lưu đơn hàng'}</Button>
          </div>
        </>
      ) : (
        <>
          {InfoCard}
          {ProductsCard}
          {FinancialCard}
          {NotesCard}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Đang xử lý...' : 'Lưu đơn hàng'}</Button>
          </div>
        </>
      )}
    </form>
  );
}; 