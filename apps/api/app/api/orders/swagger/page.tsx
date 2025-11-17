'use client';

import { SwaggerUIComponent } from '../../../../components';
import { orderSwaggerConfig } from '../../../../lib/swagger/orders';

export default function OrderSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={orderSwaggerConfig}
      title="Rental Shop Orders API Documentation"
      description="Interactive documentation for all order-related endpoints including status management and analytics"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
