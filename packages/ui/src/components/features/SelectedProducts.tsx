"use client"

import { useState } from "react"
import { Minus, Plus, Trash2, Search, Package } from "lucide-react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Badge } from "../ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Separator } from "../ui/separator"

interface Product {
  id: string
  name: string
  color: string
  unitPrice: number
  deposit: number
  quantity: number
  category?: string
  description?: string
}

interface SelectedProductsProps {
  products: Product[]
  onProductsChange: (products: Product[]) => void
  onTotalUpdate?: (total: number) => void
  showSearch?: boolean
  showHeader?: boolean
  className?: string
}

export function SelectedProducts({
  products,
  onProductsChange,
  onTotalUpdate,
  showSearch = true,
  showHeader = true,
  className = ""
}: SelectedProductsProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const updateQuantity = (id: string, change: number) => {
    const updatedProducts = products.map((product) =>
      product.id === id ? { ...product, quantity: Math.max(1, product.quantity + change) } : product,
    )
    onProductsChange(updatedProducts)
  }

  const deleteProduct = (id: string) => {
    const updatedProducts = products.filter((product) => product.id !== id)
    onProductsChange(updatedProducts)
  }

  const updatePrice = (productId: string, field: "unitPrice" | "deposit", value: number) => {
    const updatedProducts = products.map((product) => 
      product.id === productId ? { ...product, [field]: value } : product
    )
    onProductsChange(updatedProducts)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount)
  }

  const filteredProducts = products.filter((product) => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const grandTotal = filteredProducts.reduce(
    (sum, product) => sum + product.unitPrice * product.quantity + product.deposit,
    0,
  )

  // Notify parent component when total changes
  if (onTotalUpdate) {
    onTotalUpdate(grandTotal)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {showHeader && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Selected Products ({products.length})</h2>

          {showSearch && (
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="text-sm text-blue-600 font-medium">
                  Total: {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products List - Compact Layout */}
      <div className="space-y-2">
        {filteredProducts.map((product) => {
          const total = product.unitPrice * product.quantity + product.deposit

          return (
            <div key={product.id} className="bg-bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-primary truncate">{product.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs border-secondary bg-secondary/20 text-text-primary">
                          {product.color}
                        </Badge>
                        {product.category && (
                          <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                            {product.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Controls */}
                <div className="flex items-center gap-4 ml-4">
                  {/* Unit Price */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap">Price:</span>
                    <Input
                      type="number"
                      value={product.unitPrice}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePrice(product.id, "unitPrice", Number(e.target.value) || 0)}
                      className="w-20 h-7 text-right text-sm border-primary/20 focus:border-primary"
                      variant="ghost"
                      min="0"
                    />
                  </div>

                  {/* Deposit */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap">Deposit:</span>
                    <Input
                      type="number"
                      value={product.deposit}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updatePrice(product.id, "deposit", Number(e.target.value) || 0)}
                      className="w-20 h-7 text-right text-sm border-primary/20 focus:border-primary"
                      variant="ghost"
                      min="0"
                    />
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary whitespace-nowrap">Qty:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(product.id, -1)}
                      disabled={product.quantity <= 1}
                      className="h-7 w-7 p-0 border-primary/20 hover:bg-primary/5"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium text-text-primary">{product.quantity}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateQuantity(product.id, 1)}
                      className="h-7 w-7 p-0 border-primary/20 hover:bg-primary/5"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Total */}
                  <div className="text-right min-w-[80px]">
                    <div className="text-sm font-medium text-primary">{formatCurrency(total)}</div>
                    <div className="text-xs text-text-secondary">
                      {product.quantity} × {formatCurrency(product.unitPrice)}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteProduct(product.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No products selected</p>
          <p className="text-sm">Add products from the search above</p>
        </div>
      )}
    </div>
  )
}

export default SelectedProducts
