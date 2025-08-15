'use client';

import { SwaggerUIComponent } from '../../components';
import { comprehensiveSwaggerConfig } from '../../lib/swagger/comprehensive';

export default function ComprehensiveDocsPage() {
  return (
    <SwaggerUIComponent
      spec={comprehensiveSwaggerConfig}
      title="Rental Shop Complete API Documentation"
      description="Comprehensive API documentation for all Rental Shop endpoints including authentication, products, customers, analytics, and more"
      docExpansion="list"
      tryItOutEnabled={true}
      showExtensions={true}
      showCommonExtensions={true}
    />
  );
} 