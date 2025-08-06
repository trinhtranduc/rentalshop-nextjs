import React from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  Button,
  Badge,
  formatDate,
  formatCurrency
} from '@rentalshop/ui';
import type { OrderSearchResult, OrderType, OrderStatus } from '@rentalshop/database';

interface OrderCardProps {
  order: OrderSearchResult;
  onView?: (orderId: string) => void;
  onEdit?: (orderId: string) => void;
  onPickup?: (orderId: string) => void;
  onReturn?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
}

const getStatusColor = (status: OrderStatus) => {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800';
    case 'CONFIRMED':
      return 'bg-blue-100 text-blue-800';
    case 'ACTIVE':
      return 'bg-green-100 text-green-800';
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800';
    case 'OVERDUE':
      return 'bg-orange-100 text-orange-800';
    case 'DAMAGED':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getOrderTypeLabel = (type: OrderType) => {
  switch (type) {
    case 'RENT':
      return 'Thuê';
    case 'SALE':
      return 'Bán';
    case 'RENT_TO_OWN':
      return 'Thuê để mua';
    default:
      return type;
  }
};

const getStatusLabel = (status: OrderStatus) => {
  switch (status) {
    case 'PENDING':
      return 'Chờ xác nhận';
    case 'CONFIRMED':
      return 'Đã xác nhận';
    case 'ACTIVE':
      return 'Đang thuê';
    case 'COMPLETED':
      return 'Hoàn thành';
    case 'CANCELLED':
      return 'Đã hủy';
    case 'OVERDUE':
      return 'Quá hạn';
    case 'DAMAGED':
      return 'Bị hư hỏng';
    default:
      return status;
  }
};

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onView,
  onEdit,
  onPickup,
  onReturn,
  onCancel,
}) => {
  const customerName = order.customer 
    ? `${order.customer.firstName} ${order.customer.lastName}`
    : order.customerName || 'Khách vãng lai';

  const customerPhone = order.customer?.phone || order.customerPhone || 'N/A';
  const customerEmail = order.customer?.email || order.customerEmail || 'N/A';

  const isOverdue = order.status === 'ACTIVE' && order.returnPlanAt && new Date(order.returnPlanAt) < new Date();
  const isPickupReady = order.status === 'CONFIRMED' && order.pickupPlanAt;
  const isReturnReady = order.status === 'ACTIVE' && order.returnPlanAt;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CardTitle className="text-lg font-semibold">
              {order.orderNumber}
            </CardTitle>
            <Badge className={getStatusColor(order.status)}>
              {getStatusLabel(order.status)}
            </Badge>
            <Badge variant="outline">
              {getOrderTypeLabel(order.orderType)}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              {formatDate(order.createdAt)}
            </div>
            {isOverdue && (
              <div className="text-xs text-red-600 font-medium">
                Quá hạn {Math.ceil((new Date().getTime() - new Date(order.returnPlanAt!).getTime()) / (1000 * 60 * 60 * 24))} ngày
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Customer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Thông tin khách hàng</h4>
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">Tên:</span> {customerName}</div>
              <div><span className="font-medium">SĐT:</span> {customerPhone}</div>
              <div><span className="font-medium">Email:</span> {customerEmail}</div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Thông tin cửa hàng</h4>
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">Cửa hàng:</span> {order.outlet.name}</div>
              <div><span className="font-medium">Nhân viên:</span> {order.user.name}</div>
            </div>
          </div>
        </div>

        {/* Rental Dates */}
        {order.orderType === 'RENT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Lịch thuê</h4>
              <div className="space-y-1 text-sm">
                {order.pickupPlanAt && (
                  <div>
                    <span className="font-medium">Dự kiến nhận:</span> {formatDate(order.pickupPlanAt)}
                  </div>
                )}
                {order.pickedUpAt && (
                  <div className="text-green-600">
                    <span className="font-medium">Đã nhận:</span> {formatDate(order.pickedUpAt)}
                  </div>
                )}
                {order.returnPlanAt && (
                  <div>
                    <span className="font-medium">Dự kiến trả:</span> {formatDate(order.returnPlanAt)}
                  </div>
                )}
                {order.returnedAt && (
                  <div className="text-green-600">
                    <span className="font-medium">Đã trả:</span> {formatDate(order.returnedAt)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Financial Information */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-2">Thông tin tài chính</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Tổng tiền:</span>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(order.totalAmount)}
              </div>
            </div>
            <div>
              <span className="font-medium">Tiền cọc:</span>
              <div className="text-lg font-semibold text-blue-600">
                {formatCurrency(order.depositAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {onView && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(order.id)}
            >
              Xem chi tiết
            </Button>
          )}

          {onEdit && order.status === 'PENDING' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(order.id)}
            >
              Chỉnh sửa
            </Button>
          )}

          {onPickup && isPickupReady && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onPickup(order.id)}
            >
              Xác nhận nhận hàng
            </Button>
          )}

          {onReturn && isReturnReady && (
            <Button
              variant="default"
              size="sm"
              onClick={() => onReturn(order.id)}
            >
              Xác nhận trả hàng
            </Button>
          )}

          {onCancel && ['PENDING', 'CONFIRMED'].includes(order.status) && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onCancel(order.id)}
            >
              Hủy đơn hàng
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 