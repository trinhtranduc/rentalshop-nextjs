'use client';

import React, { useState } from 'react';
import { NumericInput } from './price-input';
import { Card, CardHeader, CardTitle, CardContent } from './card';

export const NumericInputDemo: React.FC = () => {
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(0);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">NumericInput Component Demo</h1>
      <p className="text-gray-600">
        This component can be used for both price and quantity inputs with different configurations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price Input Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Price Inputs (with decimals)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumericInput
              label="Price with Currency"
              value={price}
              onChange={setPrice}
              placeholder="0.00"
              allowDecimals={true}
              maxDecimalPlaces={2}
              suffix="$"
            />
            
            <NumericInput
              label="Price with VND"
              value={price}
              onChange={setPrice}
              placeholder="0.00"
              allowDecimals={true}
              maxDecimalPlaces={0}
              suffix="₫"
            />
            
            <NumericInput
              label="Price without suffix"
              value={price}
              onChange={setPrice}
              placeholder="0.00"
              allowDecimals={true}
              maxDecimalPlaces={2}
            />
          </CardContent>
        </Card>

        {/* Quantity Input Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Quantity Inputs (no decimals)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <NumericInput
              label="Stock Quantity"
              value={quantity}
              onChange={setQuantity}
              placeholder="0"
              allowDecimals={false}
              min={0}
            />
            
            <NumericInput
              label="Weight in grams"
              value={weight}
              onChange={setWeight}
              placeholder="0"
              allowDecimals={false}
              min={0}
              suffix="g"
            />
            
            <NumericInput
              label="Percentage"
              value={percentage}
              onChange={setPercentage}
              placeholder="0"
              allowDecimals={false}
              min={0}
              max={100}
              suffix="%"
            />
          </CardContent>
        </Card>
      </div>

      {/* Current Values Display */}
      <Card>
        <CardHeader>
          <CardTitle>Current Values</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Price:</span> ${price.toFixed(2)}
            </div>
            <div>
              <span className="font-medium">Quantity:</span> {quantity}
            </div>
            <div>
              <span className="font-medium">Weight:</span> {weight}g
            </div>
            <div>
              <span className="font-medium">Percentage:</span> {percentage}%
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✅ Thousand separators (1,000 instead of 1000)</li>
            <li>✅ No leading zeros (can type 1000 directly)</li>
            <li>✅ Configurable decimal places (0-2)</li>
            <li>✅ Optional suffix (currency, units, etc.)</li>
            <li>✅ Min/max constraints</li>
            <li>✅ Error state support</li>
            <li>✅ Required field support</li>
            <li>✅ Customizable styling</li>
            <li>✅ Works for both price and quantity inputs</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default NumericInputDemo;
