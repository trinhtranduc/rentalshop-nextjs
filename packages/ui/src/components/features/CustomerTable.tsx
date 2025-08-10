import React from 'react';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell
} from '../ui/table';
import { Badge, Button, cn } from '@rentalshop/ui';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  isActive: boolean;
  merchant: {
    id: string;
    companyName: string;
  };
}

interface CustomerTableProps {
  customers: Customer[];
  onEdit?: (customerId: string) => void;
  onDelete?: (customerId: string) => void;
  onView?: (customerId: string) => void;
  className?: string;
  showActions?: boolean;
}

export const CustomerTable: React.FC<CustomerTableProps> = ({
  customers,
  onEdit,
  onDelete,
  onView,
  className,
  showActions = true
}) => {
  const getLocation = (customer: Customer) => {
    const location = [customer.city, customer.state, customer.country]
      .filter(Boolean)
      .join(', ');
    return location || 'N/A';
  };

  const getFullName = (customer: Customer) => {
    return `${customer.firstName} ${customer.lastName}`;
  };

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px] font-bold text-gray-900">Name</TableHead>
            <TableHead className="w-[200px] font-bold text-gray-900">Email</TableHead>
            <TableHead className="w-[150px] font-bold text-gray-900">Phone</TableHead>
            <TableHead className="w-[200px] font-bold text-gray-900">Location</TableHead>
            <TableHead className="w-[100px] font-bold text-gray-900">Status</TableHead>
            <TableHead className="w-[120px] font-bold text-gray-900">Merchant</TableHead>
            {showActions && (
              <TableHead className="w-[120px] text-right font-bold text-gray-900">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              className="hover:bg-gray-50 transition-colors"
            >
              <TableCell className="font-medium">
                <div>
                  <div className="font-semibold text-gray-900">
                    {getFullName(customer)}
                  </div>
                  {customer.address && (
                    <div className="text-sm text-gray-500 truncate max-w-[180px]">
                      {customer.address}
                    </div>
                  )}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-gray-900">{customer.email}</div>
              </TableCell>
              
              <TableCell>
                <div className="text-gray-900 font-mono text-sm">
                  {customer.phone}
                </div>
              </TableCell>
              
              <TableCell>
                <div className="text-gray-700">
                  {getLocation(customer)}
                </div>
              </TableCell>
              
              <TableCell>
                <Badge 
                  variant={customer.isActive ? "default" : "secondary"}
                  className={cn(
                    customer.isActive 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  )}
                >
                  {customer.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              
              <TableCell>
                <div className="text-sm text-gray-700">
                  {customer.merchant.companyName}
                </div>
              </TableCell>
              
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onView && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(customer.id)}
                        className="h-8 px-3 text-xs"
                      >
                        View
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(customer.id)}
                        className="h-8 px-3 text-xs"
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(customer.id)}
                        className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 