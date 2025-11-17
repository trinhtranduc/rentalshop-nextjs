'use client';

import { SwaggerUIComponent } from '../../../../components';
import { subscriptionSwaggerConfig } from '../../../../lib/swagger/subscriptions';

export default function SubscriptionSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={subscriptionSwaggerConfig}
      title="Rental Shop Subscriptions API Documentation"
      description="Interactive documentation for all subscription and plan management endpoints"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
