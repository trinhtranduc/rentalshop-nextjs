'use client';

import { SwaggerUIComponent } from '../../../../components';
import { productAvailabilitySwagger } from '../../../../lib/swagger/products';

export default function ProductSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={productAvailabilitySwagger}
      title="Rental Shop Product API Documentation"
      description="Interactive documentation for all product-related endpoints"
    />
  );
} 