// ============================================================================
// PRODUCT MANAGEMENT TYPES
// ============================================================================

import { Product, ProductCreateInput, ProductUpdateInput } from './product';

export interface ProductManagement {
  createProduct(input: ProductCreateInput): Promise<Product>;
  updateProduct(id: number, input: ProductUpdateInput): Promise<Product>;
  deleteProduct(id: number): Promise<boolean>;
  getProductById(id: number): Promise<Product | null>;
  getProductById(id: number): Promise<Product | null>;
  getProductByBarcode(barcode: string): Promise<Product | null>;
  listProducts(filters?: any): Promise<Product[]>;
  searchProducts(query: string, filters?: any): Promise<Product[]>;
}
