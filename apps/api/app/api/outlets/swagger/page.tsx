'use client';

import { SwaggerUIComponent } from '../../../../components';
import { outletSwaggerConfig } from '../../../../lib/swagger/outlets';

export default function OutletSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={outletSwaggerConfig}
      title="Rental Shop Outlets API Documentation"
      description="Interactive documentation for all outlet management endpoints"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
