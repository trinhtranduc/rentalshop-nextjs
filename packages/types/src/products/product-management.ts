// ============================================================================
// PRODUCT MANAGEMENT TYPES
// ============================================================================

import { Product, ProductCreateInput, ProductUpdateInput } from './product';

export interface ProductManagement {
  createProduct(input: ProductCreateInput): Promise<Product>;
  updateProduct(id: string, input: ProductUpdateInput): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;
  getProductById(id: string): Promise<Product | null>;
  getProductByPublicId(publicId: string): Promise<Product | null>;
  getProductByBarcode(barcode: string): Promise<Product | null>;
  listProducts(filters?: any): Promise<Product[]>;
  searchProducts(query: string, filters?: any): Promise<Product[]>;
}
