'use client';

import { SwaggerUIComponent } from '../../components';
import { comprehensiveSwaggerConfig } from '../../lib/swagger/comprehensive';

export default function ApiDocsPage() {
  return (
    <SwaggerUIComponent
      spec={comprehensiveSwaggerConfig}
      title="Rental Shop API Documentation"
      description="Complete API documentation organized by sections: Authentication, Products, Analytics, Mobile, and System"
    />
  );
} 