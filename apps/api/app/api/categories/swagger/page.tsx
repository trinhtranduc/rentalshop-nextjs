'use client';

import { SwaggerUIComponent } from '../../../../components';
import { categorySwaggerConfig } from '../../../../lib/swagger/categories';

export default function CategorySwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={categorySwaggerConfig}
      title="Rental Shop Categories API Documentation"
      description="Interactive documentation for all product category management endpoints"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
