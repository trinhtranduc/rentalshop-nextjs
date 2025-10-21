'use client';

import { SwaggerUIComponent } from '../../../../components';
import { analyticsSwaggerConfig } from '../../../../lib/swagger/analytics';

export default function AnalyticsSwaggerPage() {
  return (
    <SwaggerUIComponent
      spec={analyticsSwaggerConfig}
      title="Rental Shop Analytics API Documentation"
      description="Interactive documentation for all analytics and reporting endpoints"
      docExpansion="list"
      tryItOutEnabled={true}
    />
  );
}
