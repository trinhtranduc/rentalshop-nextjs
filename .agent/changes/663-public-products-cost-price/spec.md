# Spec — #663

1. Public products response has no `costPrice` key, and the cost value appears nowhere in it.
2. No `embeddingGeneratedAt`, `barcode`, `merchant` per product; no CUID string anywhere in a product.
3. Kept: id, name, description, images, rentPrice, salePrice, deposit, pricingType, pricingOptions
   (type, price, isDefault, unit, blockSize), categoryId, category {id, name}, stock, totalStock, available,
   renting, outletStock [{stock, available, renting, outlet {id, name, address}}], createdAt, updatedAt.

Out of scope: the shop page redesign; categories/outlets payloads of the same route.
