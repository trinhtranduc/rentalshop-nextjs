'use client';

import { SwaggerUIComponent } from '../../../../components';
import { productSwaggerConfig } from '../../../../lib/swagger/products';

export default function ProductSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={productSwaggerConfig}
      title="Rental Shop Product API Documentation"
      description="Interactive documentation for all product-related endpoints"
    />
  );
} 