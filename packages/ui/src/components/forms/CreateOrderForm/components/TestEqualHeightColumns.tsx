"use client";

/**
 * TestEqualHeightColumns - Simple test component to verify equal height columns
 * 
 * This is a simplified version to test:
 * - 2 columns with 2:1 ratio
 * - Equal height columns
 * - Column 2 has dynamic height
 * - Column 1 stretches to match Column 2
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@rentalshop/ui';

export const TestEqualHeightColumns: React.FC = () => {
  const [itemCount, setItemCount] = useState(3);

  return (
    <div className="w-full min-h-full bg-bg-secondary p-4">
      <div className="mb-4">
        <Button onClick={() => setItemCount(itemCount + 1)}>Add Item</Button>
        <Button onClick={() => setItemCount(Math.max(1, itemCount - 1))} className="ml-2">
          Remove Item
        </Button>
        <span className="ml-4">Items: {itemCount}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Column 1 - Products Section (2/3 = 66.67%) */}
        {/* items-stretch will make this column match Column 2's height */}
        <div className="lg:w-2/3 flex flex-col">
          <Card className="flex flex-col h-full w-full">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle>Column 1 - Products (2/3 width)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 p-6">
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="p-4 bg-blue-50 rounded flex-shrink-0">Product Search Bar</div>
                <div className="flex-1 flex flex-col min-h-0">
                  <Card className="border border-gray-200 flex flex-col h-full">
                    <CardHeader className="pb-3 flex-shrink-0">
                      <CardTitle>Selected Products</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 overflow-y-auto">
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded">
                            Product Item {i + 1}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2 - Order Information (1/3 = 33.33%) */}
        {/* This column has dynamic height based on itemCount */}
        <div className="lg:w-1/3 flex flex-col">
          <Card className="flex flex-col h-full w-full">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle>Column 2 - Order Info (1/3 width)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col overflow-visible p-6 pt-0">
              <div className="flex flex-col w-full overflow-visible">
                <div className="space-y-4 w-full">
                  {/* Dynamic content based on itemCount */}
                  {Array.from({ length: itemCount }).map((_, i) => (
                    <div key={i} className="space-y-2 w-full">
                      <label className="text-sm font-medium">Field {i + 1}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded"
                        placeholder={`Input ${i + 1}`}
                      />
                    </div>
                  ))}

                  {/* Order Summary */}
                  <div className="space-y-3 p-4 border border-gray-200 rounded-lg bg-gray-50 w-full">
                    <h4 className="text-sm font-semibold mb-3">Order Summary</h4>
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>$100.00</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span>$100.00</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 w-full">
                    <div className="flex gap-3">
                      <Button className="flex-1">Create Order</Button>
                      <Button variant="outline" className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

