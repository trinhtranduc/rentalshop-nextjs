'use client';

import { SwaggerUIComponent } from '../../../../components';
import { merchantSwaggerConfig } from '../../../../lib/swagger/merchants';

export default function MerchantSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={merchantSwaggerConfig}
      title="Rental Shop Merchants API Documentation"
      description="Interactive documentation for all merchant management and subscription endpoints"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
