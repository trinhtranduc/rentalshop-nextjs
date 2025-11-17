'use client';

import { SwaggerUIComponent } from '../../../../components';
import { planSwaggerConfig } from '../../../../lib/swagger/plans';

export default function PlanSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={planSwaggerConfig}
      title="Rental Shop Plans API Documentation"
      description="Interactive documentation for all subscription plan management endpoints"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
